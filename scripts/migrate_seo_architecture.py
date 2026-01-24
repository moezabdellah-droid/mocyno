import os
import shutil
import re

ROOT_DIR = r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public"
FR_DIR = os.path.join(ROOT_DIR, "fr")
EN_DIR = os.path.join(ROOT_DIR, "en")
MOBILE_DIR = os.path.join(ROOT_DIR, "mobile")

# Files/Dirs to move from Root to FR
DIRS_TO_MOVE = ["services", "zones", "blog"]
FILES_TO_MOVE = ["index.html", "contact.html", "a-propos.html", "mentions-legales.html", "politique-confidentialite.html", "cookies.html", "merci.html", "404.html"]

def setup_directories():
    print("--- Setting up Directories ---")
    if not os.path.exists(FR_DIR):
        os.makedirs(FR_DIR)
    
    # Copy specialized root files to FR (Overwrite existing)
    for f in FILES_TO_MOVE:
        src = os.path.join(ROOT_DIR, f)
        dst = os.path.join(FR_DIR, f)
        if os.path.exists(src):
            print(f"Copying {f} to FR...")
            shutil.copy2(src, dst)
            
    # Copy directories to FR (Merge/Overwrite)
    for d in DIRS_TO_MOVE:
        src = os.path.join(ROOT_DIR, d)
        dst = os.path.join(FR_DIR, d)
        if os.path.exists(src):
            print(f"Copying {d} to FR...")
            if os.path.exists(dst):
                shutil.rmtree(dst)
            shutil.copytree(src, dst)

    # Clean Mobile (as per instructions: remove totally)
    if os.path.exists(MOBILE_DIR):
        print("Removing /mobile/ directory...")
        shutil.rmtree(MOBILE_DIR)

def update_html_content(file_path, lang):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Determine Canonicals and URLs
    rel_path = os.path.relpath(file_path, ROOT_DIR).replace("\\", "/")
    # clean path: fr/services/k9.html -> fr/services/k9/
    clean_path = rel_path
    if clean_path.endswith("index.html"):
        clean_path = clean_path[:-10]
    elif clean_path.endswith(".html"):
        clean_path = clean_path[:-5] + "/"
    
    if not clean_path.startswith("/"):
        clean_path = "/" + clean_path

    canonical_url = f"https://mocyno.com{clean_path}"
    
    # Calculate Hreflang URLs
    # If currently in FR, EN counterpart is replacing /fr/ with /en/
    # If currently in EN, FR counterpart is replacing /en/ with /fr/
    if lang == "fr":
        fr_url = canonical_url
        en_url = canonical_url.replace("/fr/", "/en/")
    else:
        en_url = canonical_url
        fr_url = canonical_url.replace("/en/", "/fr/")

    # 1. Update Internal Links (only for FR pages to point to /fr/)
    # Regex is safer for bulk replace
    if lang == "fr":
        # Link replacements
        replacements = [
            (r'href="/services/', r'href="/fr/services/'),
            (r'href="/zones/', r'href="/fr/zones/'),
            (r'href="/blog/', r'href="/fr/blog/'),
            (r'href="/contact/"', r'href="/fr/contact/"'),
            (r'href="/a-propos/"', r'href="/fr/a-propos/"'),
            (r'href="/"', r'href="/fr/"'), # Homepage
            (r'href="/index.html"', r'href="/fr/"'),
        ]
        for old, new in replacements:
            content = content.replace(old, new)
            
    elif lang == "en":
        # English Link Replacements
        replacements = [
            (r'href="/services/', r'href="/en/services/'),
            (r'href="/zones/', r'href="/en/zones/'),
            (r'href="/blog/', r'href="/en/blog/'),
            (r'href="/contact/"', r'href="/en/contact/"'),
            (r'href="/a-propos/"', r'href="/en/about/"'), 
            (r'href="/mentions-legales/"', r'href="/en/legal/"'),
            (r'href="/politique-confidentialite/"', r'href="/en/privacy/"'),
            (r'href="/cookies/"', r'href="/en/cookies/"'),
            (r'href="/"', r'href="/en/"'),
            (r'href="/index.html"', r'href="/en/"'),
        ]
        
        for old, new in replacements:
            content = content.replace(old, new)

    # 2. Inject/Update Canonical & Hreflang
    # Remove existing canonical/hreflang to rebuild clean
    content = re.sub(r'<link rel="canonical".*?>', '', content)
    content = re.sub(r'<link rel="alternate" hreflang=".*?".*?>', '', content)
    
    # Construct new block
    seo_block = f"""
  <link rel="canonical" href="{canonical_url}">
  <link rel="alternate" hreflang="fr" href="{fr_url}">
  <link rel="alternate" hreflang="en" href="{en_url}">
  <link rel="alternate" hreflang="x-default" href="{fr_url}">"""
    
    # Insert before </head>
    if "</head>" in content:
        content = content.replace("</head>", f"{seo_block}\n</head>")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def process_files():
    print("--- Processing FR Files ---")
    for root, dirs, files in os.walk(FR_DIR):
        for file in files:
            if file.endswith(".html"):
                update_html_content(os.path.join(root, file), "fr")

    print("--- Processing EN Files ---")
    for root, dirs, files in os.walk(EN_DIR):
        for file in files:
            if file.endswith(".html"):
                update_html_content(os.path.join(root, file), "en")

if __name__ == "__main__":
    setup_directories()
    process_files()
    print("Migration Script Complete.")
