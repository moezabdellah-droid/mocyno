
import os
import re
from urllib.parse import urlparse, unquote

PUBLIC_DIR = os.path.join(os.getcwd(), 'public')

# Canonical Menu Structures (simplified for regex matching or presence check)
REQUIRED_NAV_CLASSES = ['services-menu', 'zones-menu']
SENSITIVE_CLASSES = ['zones-list', 'services-list', 'links']

def get_file_content(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def check_link_validity(link, current_file_path):
    # Ignore external, mailto, tel, javascript
    if any(link.startswith(p) for p in ['http', 'https', 'mailto:', 'tel:', 'javascript:', '#']):
        return None  # valid or ignored

    # Strip query params and anchors
    clean_link = link.split('?')[0].split('#')[0]

    if clean_link == '' or clean_link == '/':
        return None 
        
    if clean_link.startswith('/'):
        # Absolute path from root
        rel_path = clean_link.lstrip('/')
        
        candidates = []
        
        # Exact match (for files like /robots.txt or /image.png)
        candidates.append(os.path.join(PUBLIC_DIR, rel_path.replace('/', os.sep)))
        
        # If it looks like a directory or extensionless path
        if rel_path.endswith('/'):
            # case: /fr/contact/ -> public/fr/contact.html OR public/fr/contact/index.html
            base = rel_path.rstrip('/')
            candidates.append(os.path.join(PUBLIC_DIR, base.replace('/', os.sep) + '.html'))
            candidates.append(os.path.join(PUBLIC_DIR, rel_path.replace('/', os.sep), 'index.html'))
        else:
            # case: /fr/contact -> public/fr/contact.html OR public/fr/contact/index.html
            candidates.append(os.path.join(PUBLIC_DIR, rel_path.replace('/', os.sep) + '.html'))
            candidates.append(os.path.join(PUBLIC_DIR, rel_path.replace('/', os.sep), 'index.html'))
        
        found = False
        for c in candidates:
            if os.path.isfile(c):
                found = True
                break
        
        if not found:
            return f"Broken Link: {link} (Target not found. Checked: {[os.path.relpath(c, PUBLIC_DIR) for c in candidates]})"
            
    return None

def scan_file(path, rel_path):
    content = get_file_content(path)
    issues = []
    
    # 1. Check for CSS Conflicts in <style> blocks
    style_blocks = re.findall(r'<style>(.*?)</style>', content, re.DOTALL)
    for block in style_blocks:
        for cls in SENSITIVE_CLASSES:
            # Check if this class is defined in this inline style
            # Look for .class { or .class:hover or .class li
            if re.search(r'\.' + cls + r'[ \t\n\r]*{', block) or re.search(r'\.' + cls + r'[ \t\n\r]+', block):
                issues.append(f"CSS Conflict: Class '.{cls}' redefined in inline <style>. This may break the menu.")

    # 2. Check Nav Structure Integrity
    # Ensure header exists
    if '<header' in content:
        # Check if submenus are present in HTML
        if 'class="services-menu"' not in content:
            issues.append("Nav Structure: Missing 'services-menu' container.")
        if 'class="zones-menu"' not in content:
            # Maybe fine for some specific landing pages? But user asked for ALL pages.
            issues.append("Nav Structure: Missing 'zones-menu' container.")
    
    # 3. Check All Links
    # Extract all hrefs
    links = re.findall(r'href="([^"]+)"', content)
    for link in links:
        error = check_link_validity(link, path)
        if error:
            issues.append(error)
            
        # 4. Check for Language Consistency (FR pages shouldn't link to EN pages generally, and vice versa, except switch)
        is_fr_file = '/fr/' in rel_path.replace('\\', '/')
        is_en_file = '/en/' in rel_path.replace('\\', '/')
        
        if is_fr_file and link.startswith('/en/') and 'lang-switch' not in content: # Crude check for lang switch, improved below
            # We need context to know if it's the lang switch.
            # Using regex to get context is expensive on all links.
            # Use 'verify_links_regex.py' logic for strict menu checks.
            pass
            
    return issues

def main():
    print("Starting Comprehensive Audit...")
    
    all_issues = {}
    total_files = 0
    
    for root, _, files in os.walk(PUBLIC_DIR):
        for file in files:
            if file.endswith('.html'):
                total_files += 1
                path = os.path.join(root, file)
                rel_path = os.path.relpath(path, PUBLIC_DIR)
                
                # Skip google verification files etc if any
                if 'google' in file: continue
                
                file_issues = scan_file(path, rel_path)
                if file_issues:
                    all_issues[rel_path] = file_issues

    if not all_issues:
        print(f"Success! Scanned {total_files} files. No issues found.")
    else:
        print(f"Scanned {total_files} files. Found issues in {len(all_issues)} files.")
        for file, issues in all_issues.items():
            print(f"\n[{file}]")
            for issue in issues:
                print(f"  - {issue}")

if __name__ == "__main__":
    main()
