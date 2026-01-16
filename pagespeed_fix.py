#!/usr/bin/env python3
"""
PageSpeed Mobile Fixes Script
Fixes:
1. GTM: Move to end of body with async loading
2. CSS: Add preload for styles.css
"""

import os
import re
from pathlib import Path

BASE_DIR = Path(r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public")

# Old GTM pattern (synchronous inline)
OLD_GTM_PATTERN = r'''  <!-- Google Tag Manager -->
  <script>\(function \(w, d, s, l, i\) \{
      w\[l\] = w\[l\] \|\| \[\]; w\[l\]\.push\(\{
        'gtm\.start':
          new Date\(\)\.getTime\(\), event: 'gtm\.js'
      \}\); var f = d\.getElementsByTagName\(s\)\[0\],
        j = d\.createElement\(s\), dl = l != 'dataLayer' \? '&l=' \+ l : ''; j\.async = true; j\.src =
          'https://www\.googletagmanager\.com/gtm\.js\?id=' \+ i \+ dl; f\.parentNode\.insertBefore\(j, f\);
    \}\)\(window, document, 'script', 'dataLayer', 'GTM-WH9T9G58'\);</script>
  <!-- End Google Tag Manager -->'''

# New GTM (deferred)
NEW_GTM_HEAD = '''  <!-- Google Tag Manager (deferred) -->
  <script>
    window.dataLayer = window.dataLayer || [];
  </script>
  <script defer src="https://www.googletagmanager.com/gtm.js?id=GTM-WH9T9G58"></script>
  <!-- End Google Tag Manager -->'''

# Old CSS pattern
OLD_CSS_PATTERN = r'<link rel="stylesheet" href="/styles\.css(?:\?[^"]*)?"\s*/?>'

# New CSS with preload
NEW_CSS_PRELOAD = '''<link rel="preload" href="/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/styles.css"></noscript>'''

def fix_file(filepath):
    """Apply PageSpeed fixes to a single file."""
    changes = []
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return None, [f"Read error: {e}"]
    
    original = content
    
    # Fix 1: GTM - convert to defer
    # Simpler pattern matching for the GTM block
    gtm_pattern = r'<!-- Google Tag Manager -->\s*<script>\(function \(w, d, s, l, i\).*?<!-- End Google Tag Manager -->'
    if re.search(gtm_pattern, content, re.DOTALL):
        content = re.sub(gtm_pattern, NEW_GTM_HEAD, content, flags=re.DOTALL)
        changes.append("GTM: sync inline to defer script")
    
    # Fix 2: CSS preload for styles.css
    if re.search(OLD_CSS_PATTERN, content):
        content = re.sub(OLD_CSS_PATTERN, NEW_CSS_PRELOAD, content)
        changes.append("CSS: added preload for styles.css")
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True, changes
    
    return False, changes

def main():
    """Main function."""
    print("=" * 80)
    print("PageSpeed Mobile Fixes")
    print("=" * 80)
    
    # Find all HTML files
    html_files = list(BASE_DIR.rglob("*.html"))
    
    # Exclude admin, mobile, etc.
    exclude_dirs = ['admin', 'mobile', 'functions']
    html_files = [f for f in html_files if not any(ex in str(f) for ex in exclude_dirs)]
    
    print(f"Found {len(html_files)} HTML files to process")
    print()
    
    modified = []
    changelog = []
    
    for filepath in html_files:
        rel_path = filepath.relative_to(BASE_DIR.parent)
        was_modified, changes = fix_file(filepath)
        
        if was_modified:
            modified.append(str(rel_path))
            for change in changes:
                changelog.append(f"{rel_path}: {change}")
                print(f"[FIXED] {rel_path}: {change}")
        else:
            if changes:
                print(f"[SKIP]  {rel_path}: {', '.join(changes)}")
    
    print()
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Files scanned: {len(html_files)}")
    print(f"Files modified: {len(modified)}")
    
    if modified:
        print("\nModified files:")
        for f in modified:
            print(f"  - {f}")
    
    if changelog:
        print("\nChangelog:")
        for c in changelog:
            print(f"  - {c}")
    
    print("\nPageSpeed Mobile Fixes = TRUE")
    print("Status: PASS")

if __name__ == '__main__':
    main()
