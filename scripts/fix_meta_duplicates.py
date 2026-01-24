#!/usr/bin/env python3
"""
SEO META Tags Surgical Deduplication Script v2
Uses regex-based line-by-line editing to preserve exact HTML formatting.
"""

import sys
import re
from pathlib import Path
from typing import List, Tuple, Dict


def find_meta_tags_in_head(lines: List[str]) -> Dict[str, List[Tuple[int, str]]]:
    """
    Find all meta tags in head section with line numbers.
    
    Returns:
        Dict with 'meta_description', 'og_description', 'title' -> [(line_num, line_content)]
    """
    in_head = False
    results = {
        'meta_description': [],
        'og_description': [],
        'title': []
    }
    
    for i, line in enumerate(lines):
        # Track head section
        if '<head' in line.lower():
            in_head = True
        elif '</head>' in line.lower():
            in_head = False
        
        if not in_head:
            continue
        
        # Find meta description
        if re.search(r'<meta\s+name=["\']description["\']', line, re.IGNORECASE):
            results['meta_description'].append((i, line))
        
        # Find og:description
        if re.search(r'<meta\s+property=["\']og:description["\']', line, re.IGNORECASE):
            results['og_description'].append((i, line))
        
        # Find title
        if re.search(r'<title>', line, re.IGNORECASE):
            results['title'].append((i, line))
    
    return results


def extract_content_length(line: str, tag_type: str) -> int:
    """Extract content attribute length from meta tag."""
    if tag_type in ['meta_description', 'og_description']:
        match = re.search(r'content=["\']([^"\']*)["\']', line, re.IGNORECASE)
        if match:
            return len(match.group(1))
    return 0


def deduplicate_lines(lines: List[str], tag_locations: Dict[str, List[Tuple[int, str]]]) -> Tuple[List[str], Dict]:
    """
    Remove duplicate tags, keeping the longest/last occurrence.
    
    Returns:
        (modified_lines, changes_dict)
    """
    lines_to_remove = set()
    changes = {}
    
    # Process meta description
    if len(tag_locations['meta_description']) > 1:
        tags = tag_locations['meta_description']
        # Find best tag (longest content, or last if equal)
        best_idx = 0
        max_length = extract_content_length(tags[0][1], 'meta_description')
        
        for idx, (line_num, line) in enumerate(tags):
            length = extract_content_length(line, 'meta_description')
            if length > max_length or (length == max_length and idx > best_idx):
                max_length = length
                best_idx = idx
        
        # Mark others for removal
        for idx, (line_num, line) in enumerate(tags):
            if idx != best_idx:
                lines_to_remove.add(line_num)
        
        changes['meta_description'] = {
            'before': len(tags),
            'after': 1,
            'removed_lines': [line_num for idx, (line_num, _) in enumerate(tags) if idx != best_idx]
        }
    
    # Process og:description
    if len(tag_locations['og_description']) > 1:
        tags = tag_locations['og_description']
        best_idx = 0
        max_length = extract_content_length(tags[0][1], 'og_description')
        
        for idx, (line_num, line) in enumerate(tags):
            length = extract_content_length(line, 'og_description')
            if length > max_length or (length == max_length and idx > best_idx):
                max_length = length
                best_idx = idx
        
        for idx, (line_num, line) in enumerate(tags):
            if idx != best_idx:
                lines_to_remove.add(line_num)
        
        changes['og_description'] = {
            'before': len(tags),
            'after': 1,
            'removed_lines': [line_num for idx, (line_num, _) in enumerate(tags) if idx != best_idx]
        }
    
    # Process title
    if len(tag_locations['title']) > 1:
        tags = tag_locations['title']
        # Keep last title
        for idx, (line_num, line) in enumerate(tags[:-1]):
            lines_to_remove.add(line_num)
        
        changes['title'] = {
            'before': len(tags),
            'after': 1,
            'removed_lines': [line_num for line_num, _ in tags[:-1]]
        }
    
    # Create new lines list without removed lines
    new_lines = [line for i, line in enumerate(lines) if i not in lines_to_remove]
    
    return new_lines, changes


def fix_html_file_surgical(file_path: Path) -> Dict:
    """
    Surgically fix HTML file by removing duplicate meta tags.
    """
    try:
        # Read file
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Find tags
        tag_locations = find_meta_tags_in_head(lines)
        
        # Check if fixes needed
        needs_fix = (
            len(tag_locations['meta_description']) > 1 or
            len(tag_locations['og_description']) > 1 or
            len(tag_locations['title']) > 1
        )
        
        if not needs_fix:
            return {'status': 'skipped', 'reason': 'no_duplicates'}
        
        # Deduplicate
        new_lines, changes = deduplicate_lines(lines, tag_locations)
        
        if not changes:
            return {'status': 'skipped', 'reason': 'no_changes'}
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        
        return {
            'status': 'fixed',
            'changes': changes
        }
    
    except Exception as e:
        return {
            'status': 'error',
            'reason': str(e)
        }


def main():
    """Main correction function."""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    public_dir = project_root / 'public'
    
    print("="*70)
    print("SEO META Tags Surgical Deduplication v2")
    print("="*70)
    print(f"Target: {public_dir}\n")
    
    # Find all HTML files
    html_files = []
    for html_file in public_dir.rglob('*.html'):
        if any(part in html_file.parts for part in ['node_modules', '.git', 'dist', 'build']):
            continue
        html_files.append(html_file)
    
    html_files = sorted(html_files)
    print(f"Found {len(html_files)} HTML files\n")
    
    # Process each file
    fixed_files = []
    skipped_files = []
    error_files = []
    
    for html_file in html_files:
        result = fix_html_file_surgical(html_file)
        rel_path = html_file.relative_to(project_root)
        
        if result['status'] == 'fixed':
            fixed_files.append((rel_path, result['changes']))
            print(f"FIXED: {rel_path}")
            for tag, info in result['changes'].items():
                print(f"  {tag}: {info['before']} -> {info['after']} (removed lines: {info['removed_lines']})")
        
        elif result['status'] == 'skipped':
            skipped_files.append(rel_path)
        
        elif result['status'] == 'error':
            error_files.append((rel_path, result.get('reason', 'unknown')))
            print(f"ERROR: {rel_path} - {result.get('reason')}")
    
    # Summary
    print(f"\n{'='*70}")
    print("CORRECTION SUMMARY")
    print(f"{'='*70}\n")
    print(f"Total files scanned: {len(html_files)}")
    print(f"Files fixed: {len(fixed_files)}")
    print(f"Files skipped: {len(skipped_files)}")
    print(f"Files with errors: {len(error_files)}\n")
    
    if fixed_files:
        print("FIXED FILES:")
        for file_path, changes in fixed_files:
            print(f"  - {file_path}")
        print()
    
    if error_files:
        print("ERROR FILES:")
        for file_path, reason in error_files:
            print(f"  - {file_path}: {reason}")
        print()
    
    print("Surgical corrections completed.\n")
    sys.exit(0)


if __name__ == '__main__':
    main()
