
import os
from bs4 import BeautifulSoup
from urllib.parse import urlparse, unquote

PUBLIC_DIR = os.path.join(os.getcwd(), 'public')
FR_DIR = os.path.join(PUBLIC_DIR, 'fr')
EN_DIR = os.path.join(PUBLIC_DIR, 'en')

def check_links_in_file(file_path, lang):
    with open(file_path, 'r', encoding='utf-8') as f:
        try:
            soup = BeautifulSoup(f, 'html.parser')
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
            return []

    issues = []
    
    # Check Header/Nav Links
    header = soup.find('header')
    if header:
        nav_links = header.find_all('a')
        for link in nav_links:
            href = link.get('href')
            if not href:
                continue
            
            # Skip anchor links on the same page (e.g. #contact) if start with #
            if href.startswith('#'):
                continue
            
            # Check for correct language prefix
            if href.startswith('/'):
                # Ignore mailto, tel
                if href.startswith(('mailto:', 'tel:')):
                    continue
                
                # Check if redirects are being triggered (root links)
                # Valid prefixes: /fr/, /en/, /favicon, /styles, /js, /images
                # Exceptions: lang switch button
                is_lang_switch = link.get('class') and 'lang-switch' in link.get('class')
                
                if not is_lang_switch:
                    if lang == 'fr' and not href.startswith('/fr/') and not href.startswith('/#'):
                         # Allow root anchors like /#zones if they work via redirect, but warn
                         issues.append(f"Header: FR page linking to non-FR path: {href}")
                    elif lang == 'en' and not href.startswith('/en/') and not href.startswith('/#'):
                         issues.append(f"Header: EN page linking to non-EN path: {href}")

    # Check Footer Links
    footer = soup.find('footer')
    if footer:
        footer_links = footer.find_all('a')
        for link in footer_links:
            href = link.get('href')
            if not href or href.startswith('#') or href.startswith('http'):
                continue
            
            if lang == 'fr' and not href.startswith('/fr/'):
                 issues.append(f"Footer: FR page linking to non-FR path: {href}")
            elif lang == 'en' and not href.startswith('/en/'):
                 issues.append(f"Footer: EN page linking to non-EN path: {href}")

    return issues

def scan_directory(directory, lang):
    all_issues = {}
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.html'):
                path = os.path.join(root, file)
                rel_path = os.path.relpath(path, PUBLIC_DIR)
                file_issues = check_links_in_file(path, lang)
                if file_issues:
                    all_issues[rel_path] = file_issues
    return all_issues

def main():
    print("Scanning FR pages...")
    fr_issues = scan_directory(FR_DIR, 'fr')
    
    print("Scanning EN pages...")
    en_issues = scan_directory(EN_DIR, 'en')
    
    total_files_with_issues = len(fr_issues) + len(en_issues)
    
    if total_files_with_issues == 0:
        print("No link issues found!")
    else:
        print(f"Found issues in {total_files_with_issues} files:")
        for file, issues in fr_issues.items():
            print(f"\n[FR] {file}:")
            for issue in issues:
                print(f"  - {issue}")
        
        for file, issues in en_issues.items():
            print(f"\n[EN] {file}:")
            for issue in issues:
                print(f"  - {issue}")

if __name__ == "__main__":
    main()
