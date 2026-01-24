#!/usr/bin/env python3
"""
PHASE 3 - Correction des dimensions d'images
Ajoute width et height aux images pour prevenir CLS (Cumulative Layout Shift)
"""

import os
from bs4 import BeautifulSoup
from PIL import Image
from pathlib import Path

# Configuration
BASE_DIR = Path(__file__).parent.parent
PUBLIC_DIR = BASE_DIR / "public"

def fix_html_images(filepath):
    """Ajoute width/height aux images sans dimensions"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"[ERREUR] Lecture {filepath}: {e}")
        return False

    soup = BeautifulSoup(content, 'html.parser')
    modified = False
    
    # Trouver toutes les images
    for img in soup.find_all('img'):
        # Ignorer les images sans src
        if 'src' not in img.attrs:
            continue
        
        # Ignorer data-URI et URLs externes
        src = img['src']
        if src.startswith(('data:', 'http:', 'https:')):
            continue
        
        # Si les dimensions existent deja, on passe
        if 'width' in img.attrs and 'height' in img.attrs:
            continue

        # Construire le chemin complet vers l'image
        if src.startswith('/'):
            img_path = PUBLIC_DIR / src.lstrip('/')
        else:
            # Chemin relatif
            img_path = Path(filepath).parent / src
        
        # Normaliser le chemin
        img_path = img_path.resolve()

        # Verifier si le fichier image existe localement
        if img_path.exists() and img_path.is_file():
            try:
                with Image.open(img_path) as pil_img:
                    width, height = pil_img.size
                    img['width'] = str(width)
                    img['height'] = str(height)
                    rel_path = filepath.relative_to(PUBLIC_DIR) if filepath.is_relative_to(PUBLIC_DIR) else filepath
                    print(f"[OK] {rel_path} : {width}x{height} -> {src}")
                    modified = True
            except Exception as e:
                print(f"[WARN] Erreur lecture image {img_path}: {e}")

    if modified:
        # Reecrire le fichier
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(str(soup))
            return True
        except Exception as e:
            print(f"[ERREUR] Ecriture {filepath}: {e}")
            return False
    
    return False


def main():
    """Fonction principale"""
    print("\n[OPTIMISATION] PHASE 3 - DIMENSIONS IMAGES (CLS Prevention)")
    print("="*70)
    print("Objectif : Ajouter width/height aux images pour eviter CLS\n")
    
    html_files = list(PUBLIC_DIR.glob("**/*.html"))
    # Exclure les fichiers .bak
    html_files = [f for f in html_files if '.bak' not in str(f)]
    
    print(f"Fichiers HTML trouves : {len(html_files)}\n")
    
    modified_count = 0
    total_images = 0
    
    for html_file in html_files:
        # Compter les images traitees
        result = fix_html_images(html_file)
        if result:
            modified_count += 1
    
    print("\n" + "="*70)
    print(f"[OK] TERMINE : {modified_count} fichiers modifies")
    print("\nOptimisations apportees :")
    print("  - Dimensions explicites (width/height) ajoutees aux images")
    print("  - Prevention du CLS (Cumulative Layout Shift)")
    print("  - Amelioration du score PageSpeed")
    print("\nImpact attendu : +5-10 points PageSpeed (CLS)")
    print("="*70)


if __name__ == "__main__":
    main()
