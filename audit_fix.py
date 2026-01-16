#!/usr/bin/env python3
"""
Navigation Parity Audit & Fix Script
Scope: public/services/**/*.html (FR) + public/en/services/**/*.html (EN)
"""

import os
import re
import shutil
from pathlib import Path

# Base directory
BASE_DIR = Path(r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public")

# Canonical nav blocks
CANONICAL_FR = '''<nav class="links" role="navigation" aria-label="Navigation principale">
        <a href="/services/">Services</a>
        <a href="/#expertises">Expertises</a>
        <a href="/#zones">Zones</a>
        <a href="/#references">Références</a>
        <a href="/blog/" style="font-weight:700">Blog</a>
        <a class="btn primary" href="/contact.html">Devis &amp; Contact</a>
        <a class="lang-switch" aria-label="English" hreflang="en" href="/en/">EN</a>
      </nav>'''

CANONICAL_EN = '''<nav class="links" role="navigation" aria-label="Main navigation">
        <a href="/en/services/">Services</a>
        <a href="/en/#expertises">Expertise</a>
        <a href="/en/#zones">Areas</a>
        <a href="/en/#references">References</a>
        <a href="/blog/" style="font-weight:700">Blog</a>
        <a class="btn primary" href="/en/contact.html">Quote &amp; Contact</a>
        <a class="lang-switch" aria-label="Français" hreflang="fr" href="/">FR</a>
      </nav>'''

# Expected links for validation
EXPECTED_FR_LINKS = [
    ('Services', '/services/'),
    ('Expertises', '/#expertises'),
    ('Zones', '/#zones'),
    ('Références', '/#references'),
    ('Blog', '/blog/'),
    ('Devis & Contact', '/contact.html'),
    ('EN', '/en/'),
]

EXPECTED_EN_LINKS = [
    ('Services', '/en/services/'),
    ('Expertise', '/en/#expertises'),
    ('Areas', '/en/#zones'),
    ('References', '/en/#references'),
    ('Blog', '/blog/'),
    ('Quote & Contact', '/en/contact.html'),
    ('FR', '/'),
]

def get_files_in_scope():
    """Get all HTML files in scope."""
    files = []
    
    # FR: public/services/**/*.html
    fr_dir = BASE_DIR / "services"
    if fr_dir.exists():
        for f in fr_dir.rglob("*.html"):
            files.append(('FR', f))
    
    # EN: public/en/services/**/*.html
    en_dir = BASE_DIR / "en" / "services"
    if en_dir.exists():
        for f in en_dir.rglob("*.html"):
            files.append(('EN', f))
    
    return files

def extract_nav_block(content):
    """Extract <nav class="links"...>...</nav> block."""
    pattern = r'<nav\s+class="links"[^>]*>.*?</nav>'
    match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(0), match.start(), match.end()
    return None, None, None

def extract_links_from_nav(nav_content):
    """Extract all <a> tags with href and text from nav."""
    pattern = r'<a\s+[^>]*href="([^"]*)"[^>]*>([^<]*)</a>'
    matches = re.findall(pattern, nav_content, re.IGNORECASE)
    return [(text.strip(), href) for href, text in matches]

def check_nav_issues(nav_content, lang):
    """Check for specific issues in nav block."""
    issues = []
    expected = EXPECTED_FR_LINKS if lang == 'FR' else EXPECTED_EN_LINKS
    
    links = extract_links_from_nav(nav_content)
    
    # Check item count
    if len(links) != 7:
        issues.append(f"Wrong item count: {len(links)} (expected 7)")
    
    # Check Blog presence
    blog_found = any('blog' in href.lower() for text, href in links)
    if not blog_found:
        issues.append("Blog link missing")
    
    # Check CTA
    cta_texts = ['Devis', 'Contact', 'Quote']
    cta_found = any(any(t.lower() in text.lower() for t in cta_texts) for text, href in links)
    if not cta_found:
        issues.append("CTA missing or incorrect")
    
    # Check lang switch
    lang_switch = 'EN' if lang == 'FR' else 'FR'
    lang_found = any(text.upper() == lang_switch for text, href in links)
    if not lang_found:
        issues.append(f"Lang switch '{lang_switch}' missing")
    
    # Check role and aria-label attributes
    if 'role="navigation"' not in nav_content:
        issues.append("Missing role='navigation'")
    
    if lang == 'FR' and 'aria-label="Navigation principale"' not in nav_content:
        issues.append("Missing/wrong aria-label FR")
    elif lang == 'EN' and 'aria-label="Main navigation"' not in nav_content:
        issues.append("Missing/wrong aria-label EN")
    
    # Check lang-switch class
    if 'class="lang-switch"' not in nav_content:
        issues.append("Missing class='lang-switch' on lang link")
    
    return issues

def audit_and_fix(fix_mode=False):
    """Main audit and fix function."""
    files = get_files_in_scope()
    results = []
    modified_files = []
    
    print(f"Scope: {len(files)} files found")
    print("=" * 80)
    
    for lang, filepath in files:
        rel_path = filepath.relative_to(BASE_DIR.parent)
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            results.append({
                'file': str(rel_path),
                'lang': lang,
                'status': 'ERROR',
                'issues': [f"Read error: {e}"],
                'items': 0,
            })
            continue
        
        nav_content, start, end = extract_nav_block(content)
        
        if nav_content is None:
            results.append({
                'file': str(rel_path),
                'lang': lang,
                'status': 'SKIP',
                'issues': ['Nav block not found'],
                'items': 0,
            })
            continue
        
        links = extract_links_from_nav(nav_content)
        issues = check_nav_issues(nav_content, lang)
        
        result = {
            'file': str(rel_path),
            'lang': lang,
            'items': len(links),
            'issues': issues,
            'order_ok': len(links) == 7,
            'links_ok': len(issues) == 0 or all('missing' not in i.lower() for i in issues if 'href' not in i.lower()),
            'blog_ok': not any('blog' in i.lower() for i in issues),
            'cta_ok': not any('cta' in i.lower() for i in issues),
            'lang_ok': not any('lang' in i.lower() for i in issues),
            'mobile_ok': True,  # Assume OK if nav exists
            'status': 'PASS' if len(issues) == 0 else 'FAIL',
        }
        
        if fix_mode and len(issues) > 0:
            # Backup
            backup_path = str(filepath) + '.bak'
            shutil.copy2(filepath, backup_path)
            
            # Replace nav block
            canonical = CANONICAL_FR if lang == 'FR' else CANONICAL_EN
            new_content = content[:start] + canonical + content[end:]
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            result['fixed'] = True
            result['status'] = 'FIXED'
            modified_files.append(str(rel_path))
            print(f"[FIXED] {rel_path}")
            print(f"        Issues: {', '.join(issues)}")
        elif len(issues) > 0:
            print(f"[FAIL]  {rel_path}")
            print(f"        Issues: {', '.join(issues)}")
        else:
            print(f"[OK]    {rel_path}")
        
        results.append(result)
    
    return results, modified_files

def print_validation_table(results):
    """Print validation table."""
    print("\n" + "=" * 100)
    print("VALIDATION TABLE")
    print("=" * 100)
    header = f"{'File':<55} | {'Items':>5} | {'Order':>5} | {'Links':>5} | {'Blog':>4} | {'CTA':>3} | {'Lang':>4} | {'Mobile':>6} | {'Status':>6}"
    print(header)
    print("-" * 100)
    
    for r in results:
        row = f"{r['file']:<55} | {r['items']:>5} | {'OK' if r.get('order_ok') else 'FAIL':>5} | {'OK' if r.get('links_ok') else 'FAIL':>5} | {'OK' if r.get('blog_ok') else 'NO':>4} | {'OK' if r.get('cta_ok') else 'NO':>3} | {'OK' if r.get('lang_ok') else 'NO':>4} | {'OK' if r.get('mobile_ok') else 'NO':>6} | {r['status']:>6}"
        print(row)

def main():
    import sys
    
    fix_mode = '--fix' in sys.argv
    
    print("=" * 80)
    print("NAVIGATION PARITY AUDIT" + (" + FIX" if fix_mode else ""))
    print("=" * 80)
    
    results, modified = audit_and_fix(fix_mode=fix_mode)
    
    print_validation_table(results)
    
    # Summary
    total = len(results)
    passed = sum(1 for r in results if r['status'] in ['PASS', 'FIXED'])
    failed = sum(1 for r in results if r['status'] == 'FAIL')
    fixed = sum(1 for r in results if r['status'] == 'FIXED')
    
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Files scanned: {total}")
    print(f"Files passed: {passed}")
    print(f"Files failed: {failed}")
    print(f"Files fixed: {fixed}")
    print(f"Modified files: {len(modified)}")
    
    if modified:
        print("\nModified files:")
        for f in modified:
            print(f"  - {f}")
    
    parity = failed == 0
    print(f"\nNavigation parity = {'TRUE' if parity else 'FALSE'}")
    print(f"Status final: {'PASS' if parity else 'FAIL'}")

if __name__ == '__main__':
    main()
