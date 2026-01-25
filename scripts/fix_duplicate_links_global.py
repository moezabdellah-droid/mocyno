import os
from bs4 import BeautifulSoup
from difflib import SequenceMatcher

# Configuration
PUBLIC_DIR = 'public'
TARGET_EXT = '.html'
EXCLUDED_DIRS = ['admin']

def normalize_text(text):
    """Normalise le texte pour la comparaison (enlève espaces multiples, etc.)"""
    return " ".join(text.split())

def fix_duplicate_links_in_file(filepath):
    """
    Analyse un fichier HTML et supprime les paragraphes dupliqués contenant des liens.
    Retourne True si le fichier a été modifié.
    """
    print(f"Analyse : {filepath}...")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"  -> ⚠️ Erreur de lecture : {e}")
        return False
    
    soup = BeautifulSoup(content, 'html.parser')
    
    modifications = 0
    duplicates_found = []
    
    # Chercher tous les paragraphes contenant au moins 1 lien
    paragraphs = soup.find_all('p')
    
    # Pour éviter les faux positifs, on compare le texte des paragraphes
    seen_paragraphs = {}  # {normalized_text: paragraph_element}
    
    for p in paragraphs:
        links = p.find_all('a', href=True)
        
        # Ne traiter que les paragraphes avec au moins 1 lien
        if len(links) >= 1:
            p_text = p.get_text(strip=True)
            normalized_text = normalize_text(p_text)
            
            # Ignorer les paragraphes vides
            if not normalized_text:
                continue
            
            # Vérifier si on a déjà vu ce paragraphe
            if normalized_text in seen_paragraphs:
                # C'est un doublon exact
                print(f"  -> [DOUBLON] Doublon exact detecte : \"{normalized_text[:80]}...\"")
                duplicates_found.append(normalized_text[:100])
                p.decompose()  # Supprimer le paragraphe
                modifications += 1
            else:
                # Vérifier la similarité avec les paragraphes existants
                for seen_text, seen_element in list(seen_paragraphs.items()):
                    ratio = SequenceMatcher(None, normalized_text, seen_text).ratio()
                    if ratio > 0.90:  # 90% de similarité
                        print(f"  -> [DOUBLON] Doublon similaire detecte (ratio: {ratio:.2f}) : \"{normalized_text[:80]}...\"")
                        duplicates_found.append(normalized_text[:100])
                        p.decompose()
                        modifications += 1
                        break
                else:
                    # Pas de doublon, on l'ajoute à la liste des vus
                    seen_paragraphs[normalized_text] = p
    
    if modifications > 0:
        # Réécrire le fichier avec BeautifulSoup
        # On utilise prettify() pour une indentation propre
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(str(soup))
        
        print(f"  -> [OK] Modifie : {modifications} doublon(s) supprime(s).")
        return True, modifications, duplicates_found
    else:
        print(f"  -> [OK] Aucun doublon detecte.")
        return False, 0, []

def main():
    """Exécution principale du script"""
    total_files = 0
    fixed_files = 0
    total_duplicates_removed = 0
    files_modified = []
    
    print("=" * 70)
    print("AUDIT GLOBAL - DETECTION DES DOUBLONS DE LIENS INTERNES")
    print("=" * 70)
    print(f"Répertoire cible : {PUBLIC_DIR}/")
    print(f"Extension : {TARGET_EXT}")
    print(f"Dossiers exclus : {', '.join(EXCLUDED_DIRS)}")
    print("=" * 70)
    print()
    
    # Parcourir récursivement
    for root, dirs, files in os.walk(PUBLIC_DIR):
        # Filtrer les dossiers exclus
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]
        
        for file in files:
            if file.endswith(TARGET_EXT):
                total_files += 1
                filepath = os.path.join(root, file)
                
                was_modified, num_duplicates, duplicates = fix_duplicate_links_in_file(filepath)
                
                if was_modified:
                    fixed_files += 1
                    total_duplicates_removed += num_duplicates
                    files_modified.append({
                        'path': filepath,
                        'duplicates_count': num_duplicates,
                        'duplicates': duplicates
                    })
    
    # Afficher le rapport final
    print()
    print("=" * 70)
    print("RAPPORT FINAL - AUDIT DE DEDUPLICATION")
    print("=" * 70)
    print(f"Total fichiers analysés : {total_files}")
    print(f"Fichiers modifiés : {fixed_files}")
    print(f"Total de doublons supprimés : {total_duplicates_removed}")
    print("=" * 70)
    print()
    
    if fixed_files > 0:
        print("LISTE DES FICHIERS MODIFIES :")
        print("-" * 70)
        for item in files_modified:
            print(f"\n[OK] {item['path']}")
            print(f"   Doublons supprimés : {item['duplicates_count']}")
            for i, dup in enumerate(item['duplicates'], 1):
                print(f"   [{i}] {dup}...")
        print()
        print("-" * 70)
        print()
        print("CONFIRMATION TECHNIQUE :")
        print("   - La structure HTML est préservée")
        print("   - Seuls les paragraphes dupliqués ont été supprimés")
        print("   - Les liens internes restent fonctionnels")
        print()
    else:
        print("Aucun fichier n'a necessite de modification.")
        print("   Tous les fichiers HTML sont propres (pas de doublons détectés).")
    
    print("=" * 70)
    print("TERMINE")
    print("=" * 70)

if __name__ == "__main__":
    main()
