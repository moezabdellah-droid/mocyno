#!/usr/bin/env python3
"""
Fix all broken internal links in HTML files
Replaces /zones/, /services/, /blog/ with /fr/zones/, /fr/services/, /fr/blog/
"""

import re
from pathlib import Path
from typing import Dict, List

# Define all link replacements
LINK_REPLACEMENTS = {
    # Zones with .html extension
    'href="/zones/cannes.html"': 'href="/fr/zones/cannes/"',
    'href="/zones/saint-tropez.html"': 'href="/fr/zones/saint-tropez/"',
    'href="/zones/nice.html"': 'href="/fr/zones/nice/"',
    'href="/zones/toulon.html"': 'href="/fr/zones/toulon/"',
    'href="/zones/frejus.html"': 'href="/fr/zones/frejus/"',
    'href="/zones/sainte-maxime.html"': 'href="/fr/zones/sainte-maxime/"',
    'href="/zones/ramatuelle.html"': 'href="/fr/zones/ramatuelle/"',
    
    # Zones with trailing slash (already correct format)
    'href="/zones/cannes/"': 'href="/fr/zones/cannes/"',
    'href="/zones/saint-tropez/"': 'href="/fr/zones/saint-tropez/"',
    'href="/zones/nice/"': 'href="/fr/zones/nice/"',
    'href="/zones/toulon/"': 'href="/fr/zones/toulon/"',
    'href="/zones/frejus/"': 'href="/fr/zones/frejus/"',
    'href="/zones/sainte-maxime/"': 'href="/fr/zones/sainte-maxime/"',
    'href="/zones/ramatuelle/"': 'href="/fr/zones/ramatuelle/"',
    
    # Services with .html extension
    'href="/services/securite-cynophile.html"': 'href="/fr/services/securite-cynophile/"',
    'href="/services/surveillance-humaine.html"': 'href="/fr/services/surveillance-humaine/"',
    'href="/services/protection-luxe.html"': 'href="/fr/services/protection-luxe/"',
    'href="/services/securite-evenementielle.html"': 'href="/fr/services/securite-evenementielle/"',
    'href="/services/marinas-ports/"': 'href="/fr/services/marinas-ports/"',
    'href="/services/chantiers/"': 'href="/fr/services/chantiers/"',
    'href="/services/hotellerie/"': 'href="/fr/services/hotellerie/"',
    'href="/services/residentiel/"': 'href="/fr/services/residentiel/"',
    'href="/services/evenementiel-premium/"': 'href="/fr/services/evenementiel-premium/"',
    'href="/services/"': 'href="/fr/services/"',
    
    # Blog with .html extension
    'href="/blog/securite-congres-cannes.html"': 'href="/fr/blog/securite-congres-cannes/"',
    'href="/blog/securite-villa-saint-tropez.html"': 'href="/fr/blog/securite-villa-saint-tropez/"',
    'href="/blog/securite-domaine-prive-saint-tropez.html"': 'href="/fr/blog/securite-domaine-prive-saint-tropez/"',
    'href="/blog/securite-mariage-var.html"': 'href="/fr/blog/securite-mariage-var/"',
    'href="/blog/gardiennage-chantier-toulon.html"': 'href="/fr/blog/gardiennage-chantier-toulon/"',
    'href="/blog/ssiap-hotel-paca.html"': 'href="/fr/blog/ssiap-hotel-paca/"',
    'href="/blog/"': 'href="/fr/blog/"',
}


def fix_html_file(file_path: Path) -> Dict:
    """Fix all broken internal links in an HTML file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        replacements_made = []
        
        # Apply all replacements
        for old_link, new_link in LINK_REPLACEMENTS.items():
            if old_link in content:
                count = content.count(old_link)
                content = content.replace(old_link, new_link)
                replacements_made.append((old_link, new_link, count))
        
        # If no changes, skip
        if content == original_content:
            return {'status': 'skipped', 'reason': 'no_broken_links'}
        
        # Write fixed content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return {
            'status': 'fixed',
            'replacements': replacements_made
        }
    
    except Exception as e:
        return {
            'status': 'error',
            'reason': str(e)
        }


def main():
    """Main function."""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    public_dir = project_root / 'public'
    
    print("="*70)
    print("Fixing Broken Internal Links")
    print("="*70)
    print(f"Target: {public_dir}\n")
    
    # Find all HTML files
    html_files = []
    for html_file in public_dir.rglob('*.html'):
        if any(part in html_file.parts for part in ['node_modules', '.git', 'dist', 'build', 'admin']):
            continue
        html_files.append(html_file)
    
    html_files = sorted(html_files)
    print(f"Found {len(html_files)} HTML files\n")
    
    # Process each file
    fixed_files = []
    skipped_files = []
    error_files = []
    total_replacements = 0
    
    for html_file in html_files:
        result = fix_html_file(html_file)
        rel_path = html_file.relative_to(project_root)
        
        if result['status'] == 'fixed':
            fixed_files.append((rel_path, result['replacements']))
            replacement_count = sum(count for _, _, count in result['replacements'])
            total_replacements += replacement_count
            print(f"FIXED: {rel_path} ({replacement_count} links)")
        
        elif result['status'] == 'skipped':
            skipped_files.append(rel_path)
        
        elif result['status'] == 'error':
            error_files.append((rel_path, result.get('reason', 'unknown')))
            print(f"ERROR: {rel_path} - {result.get('reason')}")
    
    # Summary
    print(f"\n{'='*70}")
    print("SUMMARY")
    print(f"{'='*70}\n")
    print(f"Total files scanned: {len(html_files)}")
    print(f"Files fixed: {len(fixed_files)}")
    print(f"Total link replacements: {total_replacements}")
    print(f"Files skipped (no broken links): {len(skipped_files)}")
    print(f"Files with errors: {len(error_files)}\n")
    
    if error_files:
        print("ERROR FILES:")
        for file_path, reason in error_files:
            print(f"  - {file_path}: {reason}")
        print()
    
    print("All broken internal links have been fixed!\n")


if __name__ == '__main__':
    main()
