#!/usr/bin/env python3
"""
SEO META Tags Validation Script
Ensures all HTML pages have exactly:
- 1 <title>
- 1 <meta name="description">
- 1 <meta property="og:description">

Exit code 0 if all pages pass, non-zero if any page fails.
"""

import sys
from pathlib import Path
from bs4 import BeautifulSoup
from typing import Dict, List, Tuple


def count_tags_in_head(html_content: str) -> Dict[str, int]:
    """
    Count critical SEO tags within <head> section.
    
    Returns:
        Dict with counts for 'title', 'meta_description', 'og_description'
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    head = soup.find('head')
    
    if not head:
        return {'title': 0, 'meta_description': 0, 'og_description': 0}
    
    # Count tags ONLY within <head>
    title_count = len(head.find_all('title'))
    meta_desc_count = len(head.find_all('meta', attrs={'name': 'description'}))
    og_desc_count = len(head.find_all('meta', attrs={'property': 'og:description'}))
    
    return {
        'title': title_count,
        'meta_description': meta_desc_count,
        'og_description': og_desc_count
    }


def validate_html_file(file_path: Path) -> Tuple[bool, Dict[str, int]]:
    """
    Validate a single HTML file for SEO compliance.
    
    Returns:
        (is_valid, tag_counts)
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        counts = count_tags_in_head(content)
        
        # Check if all counts are exactly 1
        is_valid = (
            counts['title'] == 1 and
            counts['meta_description'] == 1 and
            counts['og_description'] == 1
        )
        
        return is_valid, counts
    
    except Exception as e:
        print(f"ERROR reading {file_path}: {e}")
        return False, {'title': 0, 'meta_description': 0, 'og_description': 0}


def find_all_html_files(root_dir: Path) -> List[Path]:
    """
    Find all HTML files in public directory.
    Excludes node_modules, .git, etc.
    """
    html_files = []
    
    for html_file in root_dir.rglob('*.html'):
        # Skip excluded directories
        if any(part in html_file.parts for part in ['node_modules', '.git', 'dist', 'build']):
            continue
        html_files.append(html_file)
    
    return sorted(html_files)


def main():
    """Main validation function."""
    # Determine project root
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    public_dir = project_root / 'public'
    
    if not public_dir.exists():
        print(f"ERROR: public/ directory not found at {public_dir}")
        sys.exit(1)
    
    print("="*70)
    print("SEO META Tags Validation - SEO 2026 Compliance")
    print("="*70)
    print(f"Scanning: {public_dir}\n")
    
    # Find all HTML files
    html_files = find_all_html_files(public_dir)
    
    if not html_files:
        print("WARNING: No HTML files found")
        sys.exit(0)
    
    print(f"Found {len(html_files)} HTML files\n")
    
    # Validate each file
    failed_files = []
    passed_count = 0
    
    for html_file in html_files:
        is_valid, counts = validate_html_file(html_file)
        
        if is_valid:
            passed_count += 1
        else:
            # Store failed file info
            rel_path = html_file.relative_to(project_root)
            failed_files.append((rel_path, counts))
    
    # Print results
    print(f"\n{'='*70}")
    print("VALIDATION RESULTS")
    print(f"{'='*70}\n")
    
    if failed_files:
        print("VALIDATION FAILED")
        print(f"Non-compliant pages: {len(failed_files)}/{len(html_files)}\n")
        
        print("FAILED FILES:\n")
        
        for file_path, counts in failed_files:
            print(f"X {file_path}")
            
            # Show which tags are non-compliant
            issues = []
            if counts['title'] != 1:
                issues.append(f"  <title>: {counts['title']} (expected: 1)")
            if counts['meta_description'] != 1:
                issues.append(f"  <meta name=\"description\">: {counts['meta_description']} (expected: 1)")
            if counts['og_description'] != 1:
                issues.append(f"  <meta property=\"og:description\">: {counts['og_description']} (expected: 1)")
            
            for issue in issues:
                print(f"    {issue}")
            print()
        
        print("FIX REQUIRED:")
        print("Each page MUST have exactly:")
        print("  - 1 <title>")
        print("  - 1 <meta name=\"description\">")
        print("  - 1 <meta property=\"og:description\">")
        print("\nAll tags must be within <head> section.\n")
        
        sys.exit(1)
    
    else:
        print("ALL PAGES COMPLIANT")
        print(f"Validated: {passed_count}/{len(html_files)} pages\n")
        
        print("SEO 2026 COMPLIANCE: CONFIRMED")
        print("  - All pages have exactly 1 <title>")
        print("  - All pages have exactly 1 <meta name=\"description\">")
        print("  - All pages have exactly 1 <meta property=\"og:description\">")
        print()
        
        sys.exit(0)


if __name__ == '__main__':
    main()
