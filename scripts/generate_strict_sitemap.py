
import os
import datetime

# CONFIGURATION
FR_DIR = os.path.join('public', 'fr')
EN_DIR = os.path.join('public', 'en')
DOMAIN = "https://mocyno.com"
OUTPUT_FILE = os.path.join('public', 'sitemap.xml')

# IGNORE LIST
IGNORE_PATHS = [
    'mentions-legales',
    'politique-confidentialite',
    'cookies',
    'merci',
    '404',
    'offline',
    'google', # google*.html verif files
]

def get_clean_url(lang, rel_path):
    # Normalize path separators
    path = rel_path.replace('\\', '/')
    
    # Remove index.html
    if path.endswith('index.html'):
        path = path[:-10]
    
    # Remove .html
    if path.endswith('.html'):
        path = path[:-5]
        
    # Ensure no double slashes and ending slash
    path = path.strip('/')
    
    if path:
        return f"{DOMAIN}/{lang}/{path}/"
    else:
        return f"{DOMAIN}/{lang}/"

def should_ignore(rel_path):
    path = rel_path.replace('\\', '/').lower()
    for ignore in IGNORE_PATHS:
        if ignore in path:
            return True
    return False

def generate_sitemap():
    print("Generating Strict Sitemap...")
    
    urls = []
    
    # Walk FR
    for root, _, files in os.walk(FR_DIR):
        for file in files:
            if file.endswith('.html'):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, FR_DIR)
                
                if should_ignore(rel_path):
                    continue
                
                url = get_clean_url('fr', rel_path)
                lastmod = datetime.date.today().isoformat()
                priority = "0.8"
                if rel_path == 'index.html': priority = "1.0"
                if 'services' in rel_path or 'zones' in rel_path: priority = "0.9"
                
                urls.append((url, lastmod, priority))

    # Walk EN
    for root, _, files in os.walk(EN_DIR):
        for file in files:
            if file.endswith('.html'):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, EN_DIR)
                
                if should_ignore(rel_path):
                    continue
                
                url = get_clean_url('en', rel_path)
                lastmod = datetime.date.today().isoformat()
                priority = "0.8"
                if rel_path == 'index.html': priority = "1.0"
                if 'services' in rel_path or 'zones' in rel_path: priority = "0.9"
                
                urls.append((url, lastmod, priority))

    # Write Sitemp
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        f.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        
        for url, lastmod, priority in urls:
            f.write('  <url>\n')
            f.write(f'    <loc>{url}</loc>\n')
            f.write(f'    <lastmod>{lastmod}</lastmod>\n')
            f.write(f'    <priority>{priority}</priority>\n')
            f.write('  </url>\n')
            
        f.write('</urlset>\n')
        
    print(f"Sitemap generated with {len(urls)} URLs.")

if __name__ == "__main__":
    generate_sitemap()
