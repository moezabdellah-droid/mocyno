#!/usr/bin/env python3
"""
AUDIT TECHNIQUE - LIENS & REDIRECTIONS
Analyse complète du sitemap, des liens internes et des redirections Firebase
"""

import os
import re
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse
from datetime import datetime
from bs4 import BeautifulSoup
from collections import defaultdict

# Configuration
BASE_DIR = Path(__file__).parent.parent
PUBLIC_DIR = BASE_DIR / "public"
SITEMAP_PATH = PUBLIC_DIR / "sitemap.xml"
FIREBASE_JSON_PATH = BASE_DIR / "firebase.json"
BASE_URL = "https://mocyno.com"

# Compteurs et résultats
results = {
    "sitemap_errors": [],
    "sitemap_missing": [],
    "broken_links": [],
    "path_errors": [],
    "external_link_issues": [],
    "anchor_errors": [],
    "redirect_conflicts": [],
    "redirect_broken": []
}

stats = {
    "total_sitemap_urls": 0,
    "total_html_files": 0,
    "total_links_analyzed": 0
}


def url_to_file_path(url):
    """Convertit une URL en chemin de fichier"""
    parsed = urlparse(url)
    path = parsed.path.strip('/')
    
    if not path:
        return PUBLIC_DIR / "fr" / "index.html"
    
    # Ajoute index.html si c'est un répertoire
    file_path = PUBLIC_DIR / path
    if file_path.is_dir():
        return file_path / "index.html"
    
    # Si pas d'extension, c'est probablement un dossier avec index.html
    if '.' not in file_path.name:
        return file_path / "index.html"
    
    return file_path


def check_file_exists(url):
    """Vérifie si le fichier correspondant à l'URL existe"""
    file_path = url_to_file_path(url)
    return file_path.exists(), file_path


def parse_sitemap():
    """Parse le sitemap.xml et extrait toutes les URLs"""
    print("[1/3] Analyse du sitemap.xml...")
    
    tree = ET.parse(SITEMAP_PATH)
    root = tree.getroot()
    
    # Namespace pour les sitemaps
    ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    
    urls = []
    for url_elem in root.findall('sm:url', ns):
        loc = url_elem.find('sm:loc', ns)
        if loc is not None:
            urls.append(loc.text)
    
    stats["total_sitemap_urls"] = len(urls)
    print(f"   [OK] {len(urls)} URLs trouvees dans le sitemap")
    
    return urls


def audit_sitemap(sitemap_urls):
    """Vérifie que toutes les URLs du sitemap ont un fichier correspondant"""
    print("\n[PHASE 1] Validation du Sitemap...")
    
    for url in sitemap_urls:
        exists, file_path = check_file_exists(url)
        if not exists:
            results["sitemap_errors"].append({
                "url": url,
                "file_path": str(file_path.relative_to(BASE_DIR))
            })
    
    if results["sitemap_errors"]:
        print(f"   [WARN] {len(results['sitemap_errors'])} fichiers manquants")
    else:
        print("   [OK] Tous les fichiers existent")


def find_missing_pages(sitemap_urls):
    """Trouve les pages HTML qui existent mais ne sont pas dans le sitemap"""
    print("\n[PHASE 1.2] Recherche de pages manquantes dans le sitemap...")
    
    # Liste toutes les pages HTML importantes
    html_files = []
    for pattern in ["fr/**/*.html", "en/**/*.html"]:
        html_files.extend(PUBLIC_DIR.glob(pattern))
    
    # Exclut les pages légales (noindex)
    excluded_patterns = ["mentions-legales", "politique-confidentialite", "cookies", "legal", "privacy"]
    
    sitemap_paths = set()
    for url in sitemap_urls:
        _, file_path = check_file_exists(url)
        sitemap_paths.add(file_path.resolve())
    
    for html_file in html_files:
        # Skip si c'est une page légale
        if any(pattern in str(html_file) for pattern in excluded_patterns):
            continue
        
        if html_file.resolve() not in sitemap_paths:
            results["sitemap_missing"].append({
                "file": str(html_file.relative_to(PUBLIC_DIR)),
                "url": f"{BASE_URL}/{html_file.relative_to(PUBLIC_DIR).as_posix()}"
            })
    
    if results["sitemap_missing"]:
        print(f"   [WARN] {len(results['sitemap_missing'])} pages manquantes dans le sitemap")
    else:
        print("   [OK] Aucune page manquante")


def extract_main_links(html_file):
    """Extrait tous les liens <a> dans la balise <main>"""
    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')
        
        main = soup.find('main')
        if not main:
            return []
        
        links = []
        for a_tag in main.find_all('a', href=True):
            href = a_tag.get('href')
            target = a_tag.get('target')
            rel = a_tag.get('rel', [])
            
            links.append({
                "href": href,
                "target": target,
                "rel": rel,
                "text": a_tag.get_text(strip=True)[:50]
            })
        
        return links
    except Exception as e:
        print(f"   [WARN] Erreur lecture {html_file}: {e}")
        return []


def is_external_link(href):
    """Vérifie si le lien est externe"""
    return href.startswith(('http://', 'https://')) and 'mocyno.com' not in href


def check_internal_link_exists(href, source_file):
    """Vérifie si le lien interne pointe vers un fichier existant"""
    # Ignore les ancres pures
    if href.startswith('#'):
        return True
    
    # Retire l'ancre
    href_clean = href.split('#')[0]
    if not href_clean:
        return True
    
    # Construit le chemin du fichier cible
    if href_clean.startswith('/'):
        # Lien absolu
        target_path = PUBLIC_DIR / href_clean.lstrip('/')
    else:
        # Lien relatif
        target_path = source_file.parent / href_clean
    
    # Normalise le chemin
    target_path = target_path.resolve()
    
    # Si c'est un dossier, vérifie index.html
    if target_path.is_dir():
        target_path = target_path / "index.html"
    elif '.' not in target_path.name:
        target_path = target_path / "index.html"
    
    return target_path.exists()


def audit_internal_links():
    """Analyse tous les liens internes dans les fichiers HTML"""
    print("\n[PHASE 2] Audit des Liens Internes...")
    
    html_files = list(PUBLIC_DIR.glob("fr/**/*.html")) + list(PUBLIC_DIR.glob("en/**/*.html"))
    stats["total_html_files"] = len(html_files)
    
    for html_file in html_files:
        lang = "fr" if "/fr/" in str(html_file) else "en"
        links = extract_main_links(html_file)
        stats["total_links_analyzed"] += len(links)
        
        for link in links:
            href = link["href"]
            
            # Skip mailto, tel, etc.
            if href.startswith(('mailto:', 'tel:', 'whatsapp:')):
                continue
            
            # 1. Liens externes
            if is_external_link(href):
                if link["target"] == "_blank":
                    rel_list = link["rel"] if isinstance(link["rel"], list) else [link["rel"]]
                    if "noopener" not in rel_list or "noreferrer" not in rel_list:
                        results["external_link_issues"].append({
                            "file": str(html_file.relative_to(PUBLIC_DIR)),
                            "href": href,
                            "problem": "Missing rel='noopener noreferrer' on target='_blank'"
                        })
                continue
            
            # 2. Liens morts (404 potentiel)
            if not href.startswith('#'):
                if not check_internal_link_exists(href, html_file):
                    results["broken_links"].append({
                        "file": str(html_file.relative_to(PUBLIC_DIR)),
                        "href": href,
                        "text": link["text"]
                    })
            
            # 3. Erreurs de structure de chemin
            if lang == "fr":
                # Page FR qui pointe vers /en/ (sauf boutons de langue)
                if href.startswith('/en/'):
                    # Accepte uniquement href="/en/" exact (bouton langue)
                    if href != "/en/":
                        results["path_errors"].append({
                            "file": str(html_file.relative_to(PUBLIC_DIR)),
                            "href": href,
                            "problem": "Page FR linking to /en/ (not language switch)"
                        })
                
                # Page FR qui pointe vers racine au lieu de /fr/
                if href.startswith('/') and not href.startswith('/fr/') and not href.startswith('/en/'):
                    # Exceptions : sitemap.xml, robots.txt, assets
                    if not any(x in href for x in ['.xml', '.txt', '.css', '.js', '.webp', '.png', '.jpg', '#']):
                        # Vérifie si l'équivalent /fr/ existe
                        fr_href = f"/fr{href}"
                        if check_internal_link_exists(fr_href, html_file):
                            results["path_errors"].append({
                                "file": str(html_file.relative_to(PUBLIC_DIR)),
                                "href": href,
                                "suggested": fr_href,
                                "problem": "Should use /fr/ prefix"
                            })
            
            elif lang == "en":
                # Page EN qui pointe vers /fr/ (sauf boutons de langue)
                if href.startswith('/fr/'):
                    if href != "/fr/":
                        results["path_errors"].append({
                            "file": str(html_file.relative_to(PUBLIC_DIR)),
                            "href": href,
                            "problem": "Page EN linking to /fr/ (not language switch)"
                        })
    
    print(f"   [OK] {stats['total_html_files']} fichiers analyses")
    print(f"   [OK] {stats['total_links_analyzed']} liens examines")


def parse_firebase_redirects():
    """Parse les redirections de firebase.json"""
    with open(FIREBASE_JSON_PATH, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    return config.get('hosting', {}).get('redirects', [])


def audit_firebase_redirects():
    """Vérifie les conflits et redirections cassées dans firebase.json"""
    print("\n[PHASE 3] Audit des Redirections Firebase...")
    
    redirects = parse_firebase_redirects()
    print(f"   [OK] {len(redirects)} redirections trouvees")
    
    for redirect in redirects:
        source = redirect.get('source', '')
        destination = redirect.get('destination', '')
        
        # 1. Conflit : fichier existe + redirection active
        source_path = PUBLIC_DIR / source.lstrip('/')
        if source_path.exists() and source_path.is_file():
            results["redirect_conflicts"].append({
                "file": str(source_path.relative_to(BASE_DIR)),
                "source": source,
                "destination": destination,
                "problem": "File exists but redirect is also active"
            })
        
        # 2. Redirection cassée : destination n'existe pas
        dest_exists, dest_path = check_file_exists(BASE_URL + destination)
        if not dest_exists:
            results["redirect_broken"].append({
                "source": source,
                "destination": destination,
                "dest_file": str(dest_path.relative_to(BASE_DIR)),
                "problem": "Redirect points to non-existent file"
            })


def generate_report():
    """Génère le rapport d'audit final"""
    print("\n" + "="*80)
    print("RAPPORT D'AUDIT LIENS & SITEMAP")
    print(f"Date : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    # 1. SITEMAP ANALYSIS
    print("\n1. SITEMAP ANALYSIS")
    print("-" * 80)
    
    if not results["sitemap_errors"] and not results["sitemap_missing"]:
        print("Statut : [OK]")
    else:
        print("Statut : [WARN] KO")
    
    print(f"Total URLs : {stats['total_sitemap_urls']}")
    
    if results["sitemap_errors"]:
        print(f"\n[WARN] Erreurs Fatales (404) : {len(results['sitemap_errors'])}")
        for err in results["sitemap_errors"][:10]:  # Limite à 10
            print(f"   • Lien Sitemap : {err['url']}")
            print(f"     Fichier Manquant : {err['file_path']}")
    
    if results["sitemap_missing"]:
        print(f"\n[WARN] Pages Manquantes (Dans FS, pas dans Sitemap) : {len(results['sitemap_missing'])}")
        for miss in results["sitemap_missing"][:10]:
            print(f"   • Fichier : {miss['file']}")
            print(f"     Absent du Sitemap : {miss['url']}")
    
    # 2. INTERNAL LINKS AUDIT
    print("\n" + "="*80)
    print("2. INTERNAL LINKS AUDIT (Content)")
    print("-" * 80)
    print(f"Analyse portée sur : {stats['total_html_files']} fichiers")
    print(f"Total liens analysés : {stats['total_links_analyzed']}")
    
    if results["broken_links"]:
        print(f"\n[WARN] Liens Morts (Broken Links) : {len(results['broken_links'])}")
        for link in results["broken_links"][:15]:
            print(f"   • Fichier Source : {link['file']}")
            print(f"     Lien : {link['href']}")
            print(f"     Texte : {link['text']}")
            print(f"     Problème : Fichier cible introuvable")
            print()
    else:
        print("\n[OK] Aucun lien mort detecte")
    
    if results["path_errors"]:
        print(f"\n[WARN] Erreurs Structurelles (Path) : {len(results['path_errors'])}")
        for err in results["path_errors"][:15]:
            print(f"   • Fichier : {err['file']}")
            print(f"     Lien : {err['href']}")
            if 'suggested' in err:
                print(f"     Devrait être : {err['suggested']}")
            print(f"     Problème : {err['problem']}")
            print()
    else:
        print("\n[OK] Aucune erreur de path detectee")
    
    if results["external_link_issues"]:
        print(f"\n[WARN] Problemes Liens Externes : {len(results['external_link_issues'])}")
        for issue in results["external_link_issues"][:10]:
            print(f"   • Fichier : {issue['file']}")
            print(f"     Lien : {issue['href']}")
            print(f"     Problème : {issue['problem']}")
    
    # 3. FIREBASE REDIRECTS CONFLICTS
    print("\n" + "="*80)
    print("3. FIREBASE REDIRECTS CONFLICTS")
    print("-" * 80)
    
    if results["redirect_conflicts"]:
        print(f"\n[WARN] Conflits Fichiers/Redirections : {len(results['redirect_conflicts'])}")
        for conflict in results["redirect_conflicts"][:10]:
            print(f"   • Fichier existant : {conflict['file']}")
            print(f"     Redirection active : {conflict['source']} -> {conflict['destination']}")
            print(f"     Problème : {conflict['problem']}")
            print()
    else:
        print("\n[OK] Aucun conflit detecte")
    
    if results["redirect_broken"]:
        print(f"\n[WARN] Redirections Cassees : {len(results['redirect_broken'])}")
        for broken in results["redirect_broken"][:10]:
            print(f"   • Source : {broken['source']}")
            print(f"     Destination : {broken['destination']}")
            print(f"     Fichier cible : {broken['dest_file']}")
            print(f"     Problème : {broken['problem']}")
    else:
        print("\n[OK] Toutes les redirections pointent vers des fichiers existants")
    
    # RECOMMANDATION GLOBALE
    print("\n" + "="*80)
    print("RECOMMANDATION GLOBALE")
    print("="*80)
    
    total_issues = (
        len(results["sitemap_errors"]) +
        len(results["sitemap_missing"]) +
        len(results["broken_links"]) +
        len(results["path_errors"]) +
        len(results["redirect_conflicts"]) +
        len(results["redirect_broken"])
    )
    
    if total_issues == 0:
        print("\n[EXCELLENT] Aucune anomalie detectee.")
        print("Le site est en parfaite sante au niveau des liens et redirections.")
    elif total_issues < 10:
        print(f"\n[ATTENTION] {total_issues} anomalies mineures detectees.")
        print("Recommandation : Correction recommandee mais non urgente.")
    else:
        print(f"\n[CRITIQUE] {total_issues} anomalies detectees.")
        print("Recommandation : Correction urgente necessaire pour eviter les erreurs SEO.")
    
    # Score de santé
    health_score = max(0, 100 - (total_issues * 2))
    print(f"\nScore de Santé des Liens : {health_score}/100")
    print("="*80)


def main():
    """Fonction principale"""
    print("\n[AUDIT] TECHNIQUE - LIENS & REDIRECTIONS")
    print("="*80)
    
    # Phase 1 : Sitemap
    sitemap_urls = parse_sitemap()
    audit_sitemap(sitemap_urls)
    find_missing_pages(sitemap_urls)
    
    # Phase 2 : Liens internes
    audit_internal_links()
    
    # Phase 3 : Redirections Firebase
    audit_firebase_redirects()
    
    # Génère le rapport
    generate_report()
    
    print("\n[OK] Audit termine avec succes!")
    
    total_issues = (
        len(results["sitemap_errors"]) +
        len(results["sitemap_missing"]) +
        len(results["broken_links"]) +
        len(results["path_errors"]) +
        len(results["redirect_conflicts"]) +
        len(results["redirect_broken"])
    )
    
    return total_issues


if __name__ == "__main__":
    try:
        issues = main()
        exit(0 if issues == 0 else 1)
    except Exception as e:
        print(f"\n[ERREUR] {e}")
        import traceback
        traceback.print_exc()
        exit(1)
