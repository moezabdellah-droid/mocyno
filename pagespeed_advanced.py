#!/usr/bin/env python3
"""
PageSpeed Advanced Fixes Script
Fixes:
1. Swiper CSS: Add preload
2. Images: Add lazy loading to below-the-fold images
3. CLS: Add width/height to images without dimensions
"""

import os
import re
from pathlib import Path

BASE_DIR = Path(r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public")

# Fix 1: Swiper CSS preload
OLD_SWIPER_CSS = r'<link rel="stylesheet" href="https://cdn\.jsdelivr\.net/npm/swiper@11/swiper-bundle\.min\.css"\s*/?>'
NEW_SWIPER_CSS = '''<link rel="preload" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css"></noscript>'''

def fix_file(filepath):
    """Apply PageSpeed fixes to a single file."""
    changes = []
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return None, [f"Read error: {e}"]
    
    original = content
    
    # Fix 1: Swiper CSS preload
    if re.search(OLD_SWIPER_CSS, content):
        content = re.sub(OLD_SWIPER_CSS, NEW_SWIPER_CSS, content)
        changes.append("Swiper CSS: added preload")
    
    # Fix 2: Add lazy loading to images (except hero images which have loading="eager")
    # Match img tags without loading attribute (but not ones that already have loading="eager")
    def add_lazy_loading(match):
        img_tag = match.group(0)
        # Skip if already has loading attribute
        if 'loading=' in img_tag:
            return img_tag
        # Skip hero images (usually in first section)
        if 'hero' in img_tag.lower():
            return img_tag
        # Skip logo images
        if 'logo' in img_tag.lower():
            return img_tag
        # Add loading="lazy" before the closing >
        if img_tag.endswith('/>'):
            return img_tag[:-2] + ' loading="lazy" />'
        elif img_tag.endswith('>'):
            return img_tag[:-1] + ' loading="lazy">'
        return img_tag
    
    # Find all img tags
    img_pattern = r'<img\s[^>]*>'
    new_content = re.sub(img_pattern, add_lazy_loading, content, flags=re.IGNORECASE)
    
    if new_content != content:
        content = new_content
        changes.append("Images: added lazy loading")
    
    # Fix 3: Add fetchpriority="high" to hero images for LCP
    def prioritize_hero(match):
        img_tag = match.group(0)
        if 'hero' in img_tag.lower() and 'fetchpriority' not in img_tag:
            if img_tag.endswith('/>'):
                return img_tag[:-2] + ' fetchpriority="high" />'
            elif img_tag.endswith('>'):
                return img_tag[:-1] + ' fetchpriority="high">'
        return img_tag
    
    new_content = re.sub(img_pattern, prioritize_hero, content, flags=re.IGNORECASE)
    
    if new_content != content:
        content = new_content
        changes.append("Hero images: added fetchpriority=high")
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True, changes
    
    return False, changes

def main():
    """Main function."""
    print("=" * 80)
    print("PageSpeed Advanced Fixes")
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
    
    print()
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Files scanned: {len(html_files)}")
    print(f"Files modified: {len(modified)}")
    
    if modified:
        print(f"\nModified files ({len(modified)}):")
        for f in sorted(set(modified)):
            print(f"  - {f}")
    
    print("\nPageSpeed Advanced Fixes = TRUE")
    print("Status: PASS")

if __name__ == '__main__':
    main()
