import json
import os
import re
from datetime import datetime

ROOT_DIR = r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public"
SITEMAP_FILE = os.path.join(ROOT_DIR, "sitemap.xml")

# Pages to strictly exclude
EXCLUDE_FILES = [
    "404.html", "merci.html", "google", "robots.txt", "sitemap.xml",
    "cookies.html", "mentions-legales.html", "politique-confidentialite.html",
    "consent-ga.js", "llms.txt"
]

def generate_sitemap():
    urls = []
    
    # helper to process a language dir
    def process_lang_dir(lang_code):
        lang_dir = os.path.join(ROOT_DIR, lang_code)
        if not os.path.exists(lang_dir):
            return
            
        for root, dirs, files in os.walk(lang_dir):
            for file in files:
                if not file.endswith(".html"):
                    continue
                
                if any(ex in file for ex in EXCLUDE_FILES):
                    continue
                
                # Path relative to ROOT (e.g. fr/index.html, fr/services/k9.html)
                full_path = os.path.join(root, file)
                rel_ver = os.path.relpath(full_path, ROOT_DIR).replace("\\", "/")
                
                # Clean URL
                if rel_ver.endswith("index.html"):
                    url_path = rel_ver[:-10] # remove index.html
                else:
                    url_path = rel_ver[:-5] + "/" # remove .html add slash
                
                # Construct absolute URL
                loc = f"https://mocyno.com/{url_path}"
                
                # Priority/Freq
                priority = "0.8"
                changefreq = "weekly"
                if regex_match(r'/(fr|en)/$', loc): # Homepages
                    priority = "1.0"
                    changefreq = "daily"
                elif "services" in loc:
                    priority = "0.9"
                elif "zones" in loc:
                    priority = "0.9"
                elif "blog" in loc:
                    priority = "0.7"
                
                # Lastmod
                lastmod = datetime.fromtimestamp(os.path.getmtime(full_path)).strftime('%Y-%m-%d')
                
                # Hreflang logic
                xhtml_links = []
                # If current is FR, alternate is EN
                if lang_code == "fr":
                    alt_lang = "en"
                    # logic: replace first occurrence of /fr/ with /en/
                    alt_url = loc.replace("/fr/", "/en/", 1)
                else:
                    alt_lang = "fr"
                    alt_url = loc.replace("/en/", "/fr/", 1)
                
                # Add alternates
                xhtml_links.append(f'<xhtml:link rel="alternate" hreflang="{lang_code}" href="{loc}"/>')
                xhtml_links.append(f'<xhtml:link rel="alternate" hreflang="{alt_lang}" href="{alt_url}"/>')
                # x-default -> FR
                # If we are valid page, x-default is the FR version
                fr_ver = loc if lang_code == "fr" else alt_url
                xhtml_links.append(f'<xhtml:link rel="alternate" hreflang="x-default" href="{fr_ver}"/>')
                
                urls.append({
                    "loc": loc,
                    "lastmod": lastmod,
                    "changefreq": changefreq,
                    "priority": priority,
                    "xhtml": "".join(xhtml_links)
                })

    process_lang_dir("fr")
    process_lang_dir("en")
    
    # Write Sitemap
    with open(SITEMAP_FILE, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        f.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n')
        
        for u in urls:
            f.write('  <url>\n')
            f.write(f'    <loc>{u["loc"]}</loc>\n')
            f.write(f'    {u["xhtml"]}\n')
            f.write(f'    <lastmod>{u["lastmod"]}</lastmod>\n')
            f.write(f'    <changefreq>{u["changefreq"]}</changefreq>\n')
            f.write(f'    <priority>{u["priority"]}</priority>\n')
            f.write('  </url>\n')
            
        f.write('</urlset>')
    
    print(f"Sitemap generated with {len(urls)} URLs.")

def regex_match(pattern, string):
    return re.search(pattern, string) is not None

if __name__ == "__main__":
    generate_sitemap()
