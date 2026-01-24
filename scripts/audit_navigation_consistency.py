#!/usr/bin/env python3
"""
PRE-PHASE 3 CONSISTENCY AUDIT
Read-only audit of header/footer/menu consistency across all pages.
Baselines: public/fr/index.html (FR) and public/en/index.html (EN)
"""

import os
import sys
from pathlib import Path
from bs4 import BeautifulSoup
import hashlib
import json
from typing import Dict, List, Tuple, Optional

class NavigationAuditor:
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.public_dir = project_root / 'public'
        self.baselines = {
            'fr': None,
            'en': None
        }
        self.divergences = []
        self.stats = {
            'total_pages': 0,
            'fr_pages': 0,
            'en_pages': 0,
            'compliant': 0,
            'divergent': 0
        }
    
    def normalize_text(self, text: str) -> str:
        """Normalize text for comparison (strip whitespace)."""
        if not text:
            return ""
        return ' '.join(text.split())
    
    def extract_header_data(self, soup: BeautifulSoup) -> Dict:
        """Extract header structure for comparison."""
        header = soup.find('header', class_='site-header')
        if not header:
            return {'error': 'No header found'}
        
        data = {
            'logo_href': '',
            'nav_items': [],
            'services_submenu': [],
            'zones_submenu': [],
            'lang_switch': '',
            'cta_button': ''
        }
        
        # Logo link
        logo = header.find('a', class_='logo')
        if logo:
            data['logo_href'] = logo.get('href', '')
        
        # Main nav
        nav = header.find('nav', class_='links')
        if nav:
            # Get all direct nav links (excluding submenu items)
            for link in nav.find_all('a', recursive=False):
                href = link.get('href', '')
                text = self.normalize_text(link.get_text())
                classes = ' '.join(link.get('class', []))
                data['nav_items'].append({
                    'text': text,
                    'href': href,
                    'classes': classes
                })
            
            # Services submenu
            services_menu = nav.find('div', class_='services-menu')
            if services_menu:
                services_list = services_menu.find('ul', class_='services-list')
                if services_list:
                    for li in services_list.find_all('li'):
                        link = li.find('a')
                        if link:
                            data['services_submenu'].append({
                                'text': self.normalize_text(link.get_text()),
                                'href': link.get('href', '')
                            })
            
            # Zones submenu
            zones_menu = nav.find('div', class_='zones-menu')
            if zones_menu:
                zones_list = zones_menu.find('ul', class_='zones-list')
                if zones_list:
                    for li in zones_list.find_all('li'):
                        link = li.find('a')
                        if link:
                            data['zones_submenu'].append({
                                'text': self.normalize_text(link.get_text()),
                                'href': link.get('href', '')
                            })
            
            # Lang switch
            lang_link = nav.find('a', class_='lang-switch')
            if lang_link:
                data['lang_switch'] = {
                    'text': self.normalize_text(lang_link.get_text()),
                    'href': lang_link.get('href', ''),
                    'hreflang': lang_link.get('hreflang', '')
                }
            
            # CTA button
            cta = nav.find('a', class_='btn')
            if cta:
                data['cta_button'] = {
                    'text': self.normalize_text(cta.get_text()),
                    'href': cta.get('href', '')
                }
        
        return data
    
    def extract_footer_data(self, soup: BeautifulSoup) -> Dict:
        """Extract footer structure for comparison."""
        footer = soup.find('footer', class_='site-footer')
        if not footer:
            return {'error': 'No footer found'}
        
        data = {
            'footer_links': [],
            'has_cnaps': False,
            'cnaps_text': ''
        }
        
        # Footer nav links
        footer_nav = footer.find('nav', class_='footer-links')
        if footer_nav:
            for link in footer_nav.find_all('a'):
                data['footer_links'].append({
                    'text': self.normalize_text(link.get_text()),
                    'href': link.get('href', '')
                })
        
        # CNAPS check
        footer_text = footer.get_text()
        if 'CNAPS' in footer_text or 'AUT-83' in footer_text:
            data['has_cnaps'] = True
        
        return data
    
    def load_baselines(self):
        """Load and parse baseline files."""
        fr_baseline = self.public_dir / 'fr' / 'index.html'
        en_baseline = self.public_dir / 'en' / 'index.html'
        
        if not fr_baseline.exists():
            print(f"ERROR: FR baseline not found: {fr_baseline}")
            sys.exit(1)
        
        if not en_baseline.exists():
            print(f"ERROR: EN baseline not found: {en_baseline}")
            sys.exit(1)
        
        # Parse FR
        with open(fr_baseline, 'r', encoding='utf-8') as f:
            fr_soup = BeautifulSoup(f.read(), 'html.parser')
            self.baselines['fr'] = {
                'header': self.extract_header_data(fr_soup),
                'footer': self.extract_footer_data(fr_soup)
            }
        
        # Parse EN
        with open(en_baseline, 'r', encoding='utf-8') as f:
            en_soup = BeautifulSoup(f.read(), 'html.parser')
            self.baselines['en'] = {
                'header': self.extract_header_data(en_soup),
                'footer': self.extract_footer_data(en_soup)
            }
        
        print("OK - Baselines loaded successfully\n")
    
    def detect_language(self, file_path: Path, soup: BeautifulSoup) -> str:
        """Detect page language from path or html lang attribute."""
        # Check path
        parts = file_path.parts
        if 'fr' in parts:
            return 'fr'
        if 'en' in parts:
            return 'en'
        
        # Check html lang
        html_tag = soup.find('html')
        if html_tag:
            lang = html_tag.get('lang', '')
            if lang.startswith('fr'):
                return 'fr'
            if lang.startswith('en'):
                return 'en'
        
        # Default to FR (root pages)
        return 'fr'
    
    def compare_structures(self, baseline: Dict, actual: Dict, component: str) -> List[str]:
        """Compare two structures and return differences."""
        diffs = []
        
        if baseline == actual:
            return diffs
        
        # Deep comparison
        for key in baseline.keys():
            if key not in actual:
                diffs.append(f"Missing key: {key}")
                continue
            
            if isinstance(baseline[key], list):
                if len(baseline[key]) != len(actual[key]):
                    diffs.append(f"{key}: count mismatch ({len(baseline[key])} vs {len(actual[key])})")
                else:
                    for i, (b_item, a_item) in enumerate(zip(baseline[key], actual[key])):
                        if b_item != a_item:
                            diffs.append(f"{key}[{i}]: {b_item} != {a_item}")
            elif baseline[key] != actual[key]:
                diffs.append(f"{key}: '{baseline[key]}' != '{actual[key]}'")
        
        return diffs
    
    def audit_file(self, file_path: Path):
        """Audit a single HTML file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                soup = BeautifulSoup(f.read(), 'html.parser')
            
            # Detect language
            lang = self.detect_language(file_path, soup)
            baseline = self.baselines[lang]
            
            if lang == 'fr':
                self.stats['fr_pages'] += 1
            else:
                self.stats['en_pages'] += 1
            
            # Extract current structure
            current_header = self.extract_header_data(soup)
            current_footer = self.extract_footer_data(soup)
            
            # Compare header
            header_diffs = self.compare_structures(baseline['header'], current_header, 'HEADER')
            
            # Compare footer
            footer_diffs = self.compare_structures(baseline['footer'], current_footer, 'FOOTER')
            
            # Record divergences
            if header_diffs or footer_diffs:
                self.stats['divergent'] += 1
                rel_path = file_path.relative_to(self.project_root)
                
                divergence = {
                    'file': str(rel_path),
                    'language': lang.upper(),
                    'header_diffs': header_diffs,
                    'footer_diffs': footer_diffs
                }
                self.divergences.append(divergence)
            else:
                self.stats['compliant'] += 1
        
        except Exception as e:
            print(f"ERROR auditing {file_path}: {e}")
    
    def run_audit(self):
        """Run the complete audit."""
        print("="*70)
        print("PRE-PHASE 3 CONSISTENCY AUDIT")
        print("="*70)
        print()
        
        # Load baselines
        self.load_baselines()
        
        # Find all HTML files
        html_files = []
        for html_file in self.public_dir.rglob('*.html'):
            # Exclude admin
            if 'admin' in html_file.parts:
                continue
            # Exclude backup files
            if html_file.suffix == '.bak' or '.bak' in html_file.suffixes:
                continue
            html_files.append(html_file)
        
        print(f"Found {len(html_files)} HTML files to audit\n")
        self.stats['total_pages'] = len(html_files)
        
        # Audit each file
        for html_file in sorted(html_files):
            self.audit_file(html_file)
        
        # Generate report
        self.generate_report()
    
    def generate_report(self):
        """Generate the final audit report."""
        print("\n" + "="*70)
        print("AUDIT REPORT")
        print("="*70)
        print()
        
        print(f"Total pages scanned: {self.stats['total_pages']}")
        print(f"  FR pages: {self.stats['fr_pages']}")
        print(f"  EN pages: {self.stats['en_pages']}")
        print()
        print(f"Fully compliant: {self.stats['compliant']}")
        print(f"With divergence: {self.stats['divergent']}")
        print()
        
        if self.divergences:
            print("="*70)
            print("DIVERGENCES DETECTED")
            print("="*70)
            print()
            
            for div in self.divergences:
                print(f"File: {div['file']}")
                print(f"Language: {div['language']}")
                
                if div['header_diffs']:
                    print("  HEADER:")
                    for diff in div['header_diffs']:
                        print(f"    - {diff}")
                
                if div['footer_diffs']:
                    print("  FOOTER:")
                    for diff in div['footer_diffs']:
                        print(f"    - {diff}")
                
                print()
            
            print("="*70)
            print("VERDICT: WARNING - DIVERGENCES FOUND - FIX REQUIRED BEFORE PHASE 3")
            print("="*70)
            sys.exit(1)
        else:
            print("="*70)
            print("VERDICT: OK - FULLY HARMONIZED - READY FOR PHASE 3")
            print("="*70)
            sys.exit(0)

def main():
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    auditor = NavigationAuditor(project_root)
    auditor.run_audit()

if __name__ == '__main__':
    main()
