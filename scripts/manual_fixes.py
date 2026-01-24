#!/usr/bin/env python3
"""
Manual fix for remaining 6 non-compliant files
"""

import re
from pathlib import Path

# Define files to fix with their specific issues
fixes = {
    'public/fr/services/securite-evenementielle.html': {
        'remove_line': 35,
        'pattern': r'<meta content="Dispositifs.*?" property="og:description"/>',
        'type': 'og:description'
    },
    'public/admin/index.html': {
        'add_meta_description': '<meta name="description" content="Administration MO\'CYNO - Espace privé">',
        'add_og_description': '<meta property="og:description" content="Administration MO\'CYNO - Espace privé">',
        'type': 'missing'
    },
    'public/blog/gardiennage-chantier-toulon.html': {
        'add_og_description': '<meta property="og:description" content="Gardiennage de chantier à Toulon - Protection BTP">',
        'type': 'missing'
    },
    'public/blog/securite-mariage-var.html': {
        'add_og_description': '<meta property="og:description" content="Sécurité mariage Var - Protection événementielle">',
        'type': 'missing'
    },
    'public/blog/ssiap-hotel-paca.html': {
        'add_og_description': '<meta property="og:description" content="SSIAP hôtel PACA - Sécurité incendie">',
        'type': 'missing'
    },
    'public/contact.html': {
        'add_og_description': '<meta property="og:description" content="Contactez MO\'CYNO - Devis sécurité gratuit">',
        'type': 'missing'
    },
    'public/merci.html': {
        'add_og_description': '<meta property="og:description" content="Merci - Votre message a été envoyé">',
        'type': 'missing'
    }
}

project_root = Path(__file__).parent.parent

for file_path_str, fix_info in fixes.items():
    file_path = project_root / file_path_str
    
    if not file_path.exists():
        print(f"SKIP: {file_path_str} (not found)")
        continue
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    if fix_info['type'] == 'og:description':
        # Remove duplicate og:description at specific line
        if fix_info['remove_line'] < len(lines):
            removed_line = lines[fix_info['remove_line'] - 1]
            if 'og:description' in removed_line:
                del lines[fix_info['remove_line'] - 1]
                print(f"FIXED: {file_path_str} (removed duplicate og:description)")
            else:
                print(f"SKIP: {file_path_str} (line {fix_info['remove_line']} doesn't match)")
        else:
            print(f"SKIP: {file_path_str} (line {fix_info['remove_line']} out of range)")
    
    elif fix_info['type'] == 'missing':
        # Add missing tags in head section
        head_end_idx = None
        for i, line in enumerate(lines):
            if '</head>' in line.lower():
                head_end_idx = i
                break
        
        if head_end_idx:
            # Insert before </head>
            if 'add_meta_description' in fix_info:
                lines.insert(head_end_idx, f"  {fix_info['add_meta_description']}\n")
                head_end_idx += 1
            if 'add_og_description' in fix_info:
                lines.insert(head_end_idx, f"  {fix_info['add_og_description']}\n")
            print(f"FIXED: {file_path_str} (added missing tags)")
        else:
            print(f"SKIP: {file_path_str} (no </head> found)")
    
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)

print("\nAll manual fixes completed!")
