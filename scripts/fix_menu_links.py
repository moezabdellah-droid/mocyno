
import os
import re

PUBLIC_DIR = os.path.join(os.getcwd(), 'public')
FR_DIR = os.path.join(PUBLIC_DIR, 'fr')
EN_DIR = os.path.join(PUBLIC_DIR, 'en')

def fix_fr_files():
    print("Fixing FR files...")
    count = 0
    for root, _, files in os.walk(FR_DIR):
        for file in files:
            if file.endswith('.html'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original_content = content
                
                # Fix Footer Links - converting root links to /fr/
                content = content.replace('href="/mentions-legales/"', 'href="/fr/mentions-legales/"')
                content = content.replace('href="/politique-confidentialite/"', 'href="/fr/politique-confidentialite/"')
                content = content.replace('href="/cookies/"', 'href="/fr/cookies/"')
                
                if content != original_content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    count += 1
    print(f"Fixed {count} FR files.")

def fix_en_files():
    print("Fixing EN files...")
    count = 0
    for root, _, files in os.walk(EN_DIR):
        for file in files:
            if file.endswith('.html'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original_content = content
                
                # 1. Fix Zones Trigger
                # Remove possible bad creates like /en/zones/
                content = content.replace('href="/en/zones/"', 'href="/en/#zones"')
                
                # 2. Fix Lang Switch
                # Find the FR hreflang link from head
                # Pattern: <link rel="alternate" hreflang="fr-FR" href="https://mocyno.com/fr/..." ...>
                # Or just extracting the href associated with hreflang="fr-FR" or "fr"
                
                fr_url_match = re.search(r'<link[^>]+hreflang="fr(?:-FR)?"[^>]+href="([^"]+)"', content)
                fr_target = "/fr/"
                
                if fr_url_match:
                    full_fr_url = fr_url_match.group(1)
                    # Convert absolute https://mocyno.com/fr/... to relative /fr/...
                    if "mocyno.com" in full_fr_url:
                        fr_target = full_fr_url.split("mocyno.com")[1]
                    else:
                         fr_target = full_fr_url # fallback if already relative (unlikely based on my knowledge)
                
                # Regex to find the lang-switch link and replace its href
                # Look for <a ... class="...lang-switch..." ... href="/en/">
                # We need to be careful to match the right tag.
                
                # Pattern logic:
                # Find <a followed by any chars until class="lang-switch" (or similar) ... href="/en/" 
                # OR href="/en/" ... class="lang-switch"
                
                # Simpler approach: Find the specific string known to be incorrect:
                # <a class="lang-switch" aria-label="Français" hreflang="fr" href="/en/">
                # Based on audit, it looks like: <a class="lang-switch" aria-label="Français" hreflang="fr" href="/en/">
                # Or <a class="lang-switch" aria-label="English" ...> -> wait, this is EN file.
                
                # Let's try replacing the specific known bad string first
                bad_switch = 'href="/en/">FR</a>'
                # But attributes might be reordered.
                
                # Robust Regex Replacement for Lang Switch
                def replace_lang_switch(match):
                    tag = match.group(0)
                    if 'href="/en/"' in tag:
                         return tag.replace('href="/en/"', f'href="{fr_target}"')
                    return tag

                # Regex to match the 'a' tag with class 'lang-switch'
                # <a [^>]*class="[^"]*lang-switch[^"]*"[^>]*>
                lang_switch_pattern = re.compile(r'<a[^>]*class="[^"]*lang-switch[^"]*"[^>]*>', re.IGNORECASE)
                content = lang_switch_pattern.sub(replace_lang_switch, content)

                if content != original_content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    count += 1
                    
    print(f"Fixed {count} EN files.")

def main():
    fix_fr_files()
    fix_en_files()

if __name__ == "__main__":
    main()
