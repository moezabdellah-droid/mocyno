#!/usr/bin/env python3
"""
Audit et correction du script GA consent
Vérifie et ajoute le script consent-ga.js manquant dans les fichiers HTML
"""

import os
import re
from pathlib import Path
from bs4 import BeautifulSoup

BASE_DIR = Path(__file__).parent.parent
PUBLIC_DIR = BASE_DIR / "public"

# Liste des fichiers à vérifier (selon la demande utilisateur)
FILES_TO_CHECK = [
    "en/merci_en.html",
    "fr/contact.html",
    "en/contact.html",
    "fr/services/securite-incendie-ssiap/index.html",
    "fr/zones/cannes.html",
    "en/zones/cannes.html",
    "fr/zones/saint-tropez.html",
    "fr/zones/toulon.html",
    "en/zones/nice.html",
    "fr/services/surveillance-humaine/index.html",
    "en/zones/saint-tropez.html",
    "fr/politique-confidentialite.html",
    "en/legal.html",
    "en/zones/toulon.html",
]

# Script à insérer
CONSENT_SCRIPT = '<script defer src="/consent-ga.js"></script>'
GA_MEASUREMENT_TAG = '<meta content="G-E5JX7DYYYN" name="ga-measurement-id"'

def check_consent_script(filepath):
    """Vérifie si le script consent-ga.js est présent"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return 'consent-ga.js' in content
    except Exception as e:
        print(f"[ERREUR] Lecture {filepath}: {e}")
        return None

def add_consent_script(filepath):
    """Ajoute le script consent-ga.js dans le head"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Vérifier d'abord si déjà présent
        if 'consent-ga.js' in content:
            return False
        
        # Chercher où insérer (après ga-measurement-id ou avant </head>)
        if GA_MEASUREMENT_TAG in content:
            # Insérer après la ligne ga-measurement-id
            pattern = r'(<meta content="G-E5JX7DYYYN" name="ga-measurement-id"[^>]*>)'
            replacement = r'\1\n  ' + CONSENT_SCRIPT
            new_content = re.sub(pattern, replacement, content)
        else:
            # Insérer avant </head>
            new_content = content.replace('</head>', f'  {CONSENT_SCRIPT}\n</head>')
        
        # Sauvegarder
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
        
        return False
    
    except Exception as e:
        print(f"[ERREUR] Modification {filepath}: {e}")
        return False

def main():
    """Fonction principale"""
    print("\n[AUDIT] GA CONSENT SCRIPT - Verification et Correction")
    print("="*70)
    
    # Ajouter tous les fichiers du dossier zones
    zones_files = []
    for zone_dir in ['fr/zones', 'en/zones']:
        zone_path = PUBLIC_DIR / zone_dir
        if zone_path.exists():
            for html_file in zone_path.glob("*.html"):
                rel_path = html_file.relative_to(PUBLIC_DIR)
                if str(rel_path) not in FILES_TO_CHECK:
                    zones_files.append(str(rel_path))
    
    all_files = FILES_TO_CHECK + zones_files
    
    print(f"\nFichiers a verifier : {len(all_files)}\n")
    
    missing_script = []
    has_script = []
    fixed_files = []
    errors = []
    
    # Phase 1 : Audit
    for rel_path in all_files:
        filepath = PUBLIC_DIR / rel_path
        
        if not filepath.exists():
            errors.append(f"{rel_path} (fichier introuvable)")
            continue
        
        has_consent = check_consent_script(filepath)
        
        if has_consent is None:
            errors.append(f"{rel_path} (erreur lecture)")
        elif has_consent:
            has_script.append(rel_path)
        else:
            missing_script.append(rel_path)
    
    # Phase 2 : Correction
    print("\n[PHASE 1] AUDIT")
    print("-"*70)
    print(f"[OK] Fichiers avec script : {len(has_script)}")
    print(f"[WARN] Fichiers SANS script : {len(missing_script)}")
    print(f"[ERR] Erreurs : {len(errors)}")
    
    if missing_script:
        print("\n[PHASE 2] CORRECTION")
        print("-"*70)
        
        for rel_path in missing_script:
            filepath = PUBLIC_DIR / rel_path
            if add_consent_script(filepath):
                fixed_files.append(rel_path)
                print(f"[FIX] {rel_path}")
            else:
                errors.append(f"{rel_path} (echec correction)")
    
    # Rapport final
    print("\n" + "="*70)
    print(f"[RAPPORT] TERMINE")
    print(f"  - Fichiers audites : {len(all_files)}")
    print(f"  - Deja conformes : {len(has_script)}")
    print(f"  - Corriges : {len(fixed_files)}")
    print(f"  - Erreurs : {len(errors)}")
    
    if errors:
        print(f"\n[ERREURS]")
        for err in errors:
            print(f"  - {err}")
    
    if fixed_files:
        print(f"\n[FICHIERS CORRIGES]")
        for f in fixed_files:
            print(f"  - {f}")
    
    print("="*70)
    
    return len(fixed_files)

if __name__ == "__main__":
    fixed_count = main()
    exit(0 if fixed_count >= 0 else 1)
