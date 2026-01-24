
import os
import re

# CONFIGURATION
FR_DIR = os.path.join('public', 'fr')
EN_DIR = os.path.join('public', 'en')
DOMAIN = "https://mocyno.com"

# MAPPING FR relative path -> EN relative path
# Note: Paths are relative to public/fr/ and public/en/
# If filename is same, no need to list here unless paths differ.
MAPPING_FR_TO_EN = {
    'a-propos.html': 'about.html',
    'mentions-legales.html': 'legal.html',
    'politique-confidentialite.html': 'privacy.html',
    'contact.html': 'contact.html',
    'cookies.html': 'cookies.html',
    'index.html': 'index.html',
    'merci.html': 'merci_en.html',
    
    # Subdirectories (assuming index.html inside or direct html)
    # Services
    'services/chantiers/index.html': 'services/construction-sites/index.html',
    'services/hotellerie/index.html': 'services/hospitality/index.html',
    'services/luxe-boutiques/index.html': 'services/luxury-boutiques/index.html',
    'services/evenementiel-premium/index.html': 'services/premium-events/index.html',
    'services/residentiel/index.html': 'services/residential/index.html',
    
    # Direct HTML Services (if mismatched)
    # If they are same name, code handles it.
    
    # Zones (usually same names)
}

# REVERSE MAPPING
MAPPING_EN_TO_FR = {v: k for k, v in MAPPING_FR_TO_EN.items()}

def get_canonical_url(lang, rel_path):
    # Remove index.html
    url_path = rel_path.replace('\\', '/')
    if url_path.endswith('index.html'):
        url_path = url_path[:-10] # remove index.html
    
    # Ensure trailing slash if it's a directory structure or clean URL
    if not url_path.endswith('/') and not url_path.endswith('.html'):
        url_path += '/'
    
    # Remove .html for clean URLs
    if url_path.endswith('.html'):
        url_path = url_path[:-5] + '/'
    
    return f"{DOMAIN}/{lang}/{url_path}"

def inject_seo_tags(filepath, lang, counterpart_enabled=True):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Determine relative path from language root
        if lang == 'fr':
            rel_path = os.path.relpath(filepath, FR_DIR)
        else:
            rel_path = os.path.relpath(filepath, EN_DIR)

        # 1. Calculate Self Canonical
        canonical_url = get_canonical_url(lang, rel_path)
        
        # 2. Determine Counterpart
        counterpart_url = None
        has_counterpart = False
        
        if lang == 'fr':
            # Check if EN exists
            # Try mapping first
            en_rel = MAPPING_FR_TO_EN.get(rel_path.replace('\\', '/'))
            if not en_rel:
                # Try same path
                en_rel = rel_path
            
            en_full_path = os.path.join(EN_DIR, en_rel)
            if os.path.exists(en_full_path):
                has_counterpart = True
                counterpart_url = get_canonical_url('en', en_rel)
                fr_url_for_default = canonical_url
            
        else: # lang == 'en'
            # Check if FR exists
            fr_rel = MAPPING_EN_TO_FR.get(rel_path.replace('\\', '/'))
            if not fr_rel:
                # Try same path
                fr_rel = rel_path
                
            fr_full_path = os.path.join(FR_DIR, fr_rel)
            if os.path.exists(fr_full_path):
                has_counterpart = True
                counterpart_url = get_canonical_url('fr', fr_rel)
                fr_url_for_default = counterpart_url

        # 3. Build SEO Block
        seo_block = []
        seo_block.append('<!-- SEO:BEGIN -->')
        seo_block.append(f'<link rel="canonical" href="{canonical_url}">')
        
        if params_hreflang := True: # always check hreflang logic
            # Self hreflang
            if lang == 'fr':
                seo_block.append(f'<link rel="alternate" hreflang="fr-FR" href="{canonical_url}">')
                if has_counterpart:
                    seo_block.append(f'<link rel="alternate" hreflang="en-GB" href="{counterpart_url}">')
                    seo_block.append(f'<link rel="alternate" hreflang="x-default" href="{canonical_url}">')
            else:
                if has_counterpart:
                    seo_block.append(f'<link rel="alternate" hreflang="fr-FR" href="{counterpart_url}">')
                seo_block.append(f'<link rel="alternate" hreflang="en-GB" href="{canonical_url}">')
                if has_counterpart:
                    seo_block.append(f'<link rel="alternate" hreflang="x-default" href="{counterpart_url}">')

        seo_block.append('<!-- SEO:END -->')
        seo_block_str = '\n'.join(seo_block)

        # 4. Inject into Content
        # Regex to find existing block or head
        pattern_block = re.compile(r'<!-- SEO:BEGIN -->.*?<!-- SEO:END -->', re.DOTALL)
        
        if pattern_block.search(content):
            new_content = pattern_block.sub(seo_block_str, content)
        else:
            # Insert after <head>
            if '<head>' in content:
                new_content = content.replace('<head>', '<head>\n' + seo_block_str)
            else:
                # Fallback, unexpected
                print(f"Skipping {filepath}: No <head> tag found.")
                return

        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {filepath}")
            
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

def main():
    print("Starting Strict SEO Injection...")
    
    # Process FR
    for root, _, files in os.walk(FR_DIR):
        for file in files:
            if file.endswith('.html'):
                inject_seo_tags(os.path.join(root, file), 'fr')
                
    # Process EN
    for root, _, files in os.walk(EN_DIR):
        for file in files:
            if file.endswith('.html'):
                inject_seo_tags(os.path.join(root, file), 'en')

    print("Injection Complete.")

if __name__ == "__main__":
    main()
