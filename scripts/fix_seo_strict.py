import os
import re

# Base mapping: physical .html file suffix -> clean URL (slash-terminated)
# This includes subdirectories like zones/ or en/zones/
TARGET_MAPPING = {
    # FR Base
    "contact.html": "/contact/",
    "a-propos.html": "/a-propos/",
    "mentions-legales.html": "/mentions-legales/",
    "politique-confidentialite.html": "/politique-confidentialite/",
    "cookies.html": "/cookies/",
    # Zones FR
    "zones/saint-tropez.html": "/zones/saint-tropez/",
    "zones/ramatuelle.html": "/zones/ramatuelle/",
    "zones/cannes.html": "/zones/cannes/",
    "zones/nice.html": "/zones/nice/",
    "zones/toulon.html": "/zones/toulon/",
    "zones/frejus.html": "/zones/frejus/",
    "zones/sainte-maxime.html": "/zones/sainte-maxime/",
    # EN Base
    "en/contact.html": "/en/contact/",
    "en/about.html": "/en/about/",
    "en/legal.html": "/en/legal/",
    "en/privacy.html": "/en/privacy/",
    "en/cookies.html": "/en/cookies/",
    # Zones EN
    "en/zones/saint-tropez.html": "/en/zones/saint-tropez/",
    "en/zones/ramatuelle.html": "/en/zones/ramatuelle/",
    "en/zones/cannes.html": "/en/zones/cannes/",
    "en/zones/nice.html": "/en/zones/nice/",
    "en/zones/toulon.html": "/en/zones/toulon/",
    "en/zones/frejus.html": "/en/zones/frejus/",
    "en/zones/sainte-maxime.html": "/en/zones/sainte-maxime/",
}

BASE_URL = "https://mocyno.com"
PUBLIC_DIR = "public"

# Mappings between FR and EN paths for hreflang logic
FR_TO_EN = {
    "/contact/": "/en/contact/",
    "/a-propos/": "/en/about/",
    "/mentions-legales/": "/en/legal/",
    "/politique-confidentialite/": "/en/privacy/",
    "/cookies/": "/en/cookies/",
    "/zones/saint-tropez/": "/en/zones/saint-tropez/",
    "/zones/ramatuelle/": "/en/zones/ramatuelle/",
    "/zones/cannes/": "/en/zones/cannes/",
    "/zones/nice/": "/en/zones/nice/",
    "/zones/toulon/": "/en/zones/toulon/",
    "/zones/frejus/": "/en/zones/frejus/",
    "/zones/sainte-maxime/": "/en/zones/sainte-maxime/",
}

# Invert for EN to FR
EN_TO_FR = {v: k for k, v in FR_TO_EN.items()}


def get_correct_urls(clean_url):
    """
    Returns (current_url, fr_url, en_url, x_default_url) based on the clean_url.
    x-default is always FR.
    """
    if clean_url in FR_TO_EN:
        # It's a FR page
        fr_url = clean_url
        en_url = FR_TO_EN[clean_url]
        return (clean_url, fr_url, en_url, fr_url)
    elif clean_url in EN_TO_FR:
        # It's an EN page
        en_url = clean_url
        fr_url = EN_TO_FR[clean_url]
        return (clean_url, fr_url, en_url, fr_url)
    return None

def update_head_tags(content, clean_url):
    """
    Regenerates Canonical and Hreflang tags to be strictly correct.
    Also updates og:url.
    """
    urls = get_correct_urls(clean_url)
    if not urls:
        print(f"  [Warn] No mapping found for {clean_url}")
        return content

    current, fr, en, xdef = urls
    full_current = BASE_URL + current
    full_fr = BASE_URL + fr
    full_en = BASE_URL + en
    full_xdef = BASE_URL + xdef

    # 1. Update/Inject Canonical
    canonical_tag = f'<link rel="canonical" href="{full_current}">'
    if '<link rel="canonical"' in content:
        content = re.sub(r'<link rel="canonical" href="[^"]+">', canonical_tag, content)
    else:
        # Insert before </head> or end of head block
        content = content.replace('</head>', f'  {canonical_tag}\n</head>')

    # 2. Update/Inject Hreflangs
    # Strategy: Remove existing hreflangs and inject strict block
    # This prevents duplicates and ensures correctness.
    
    hreflang_block = (
        f'<link rel="alternate" hreflang="fr" href="{full_fr}" />\n'
        f'  <link rel="alternate" hreflang="en" href="{full_en}" />\n'
        f'  <link rel="alternate" hreflang="x-default" href="{full_xdef}" />'
    )

    # Remove existing alternate hreflangs
    content = re.sub(r'\s*<link rel="alternate" hreflang="[^"]+" href="[^"]+"\s*/?>', '', content)
    
    # Inject new block after canonical
    content = content.replace(canonical_tag, canonical_tag + "\n  " + hreflang_block)

    # 3. Update og:url
    # <meta property="og:url" content="...">
    og_url_tag = f'<meta property="og:url" content="{full_current}">'
    if '<meta property="og:url"' in content:
        content = re.sub(r'<meta property="og:url" content="[^"]+">', og_url_tag, content)
    
    return content

def update_json_ld(content, clean_url):
    """
    Updates the "url" field in application/ld+json blocks to use the clean URL.
    Only touches matches that look like the old .html version if strictness is needed, 
    but for target pages, 'url' should be the clean one.
    """
    # Simple regex to replace "url": "https://mocyno.com/...html" with clean version
    # matching specifically the current page to avoid changing other URLs mentioned in LD+JSON?
    # Usually the "url" property in LD+JSON refers to the entity described by the page (the page itself or business).
    
    # We'll just replace specific known patterns for this file's old URL.
    
    # Construct old full URL
    # Map clean_url back to keys?
    # Actually, we can just search for "https://mocyno.com{clean_url_no_slash}.html" or similar.
    
    # Let's iterate over our specific target mapping to be safe/global inside the file? 
    # Or just replace the current page's url.
    # The prompt says: "Only modify 'url' fields pointing to target pages."
    
    for html_suffix, clean in TARGET_MAPPING.items():
        old_full = f"{BASE_URL}/{html_suffix}"
        cleaned_no_double_slash = old_full.replace(".com//", ".com/")
        
        # also handle relative internal links if they exist in json (rare but possible) or full urls.
        # Strict replacement of specific strings.
        
        new_full = f"{BASE_URL}{clean}"
        
        # Replace "url": "OLD"
        content = content.replace(f'"url": "{cleaned_no_double_slash}"', f'"url": "{new_full}"')
        
    return content

def update_internal_links(content):
    """
    Updates hrefs to target pages.
    Preserves query strings and anchors.
    """
    for html_suffix, clean in TARGET_MAPPING.items():
        # Pattern: href="/path/to/file.html" or href="val"
        # We need to match the .html extension and replace it, but keep suffix (anchor/query)
        
        # regex: href="((?:https://mocyno.com)?/path/to/file)\.html([#?][^"]*)?"
        # We need to construct the specific path regex for this file.
        
        # Handle cases with and without leading slash in TARGET_MAPPING keys (keys definitely don't have leading slash, but URLs might)
        
        # path in href could be "/contact.html" or "https://mocyno.com/contact.html"
        
        # Escaped path for regex
        path_base = html_suffix.replace(".", r"\.") # e.g. contact\.html
        
        # Robust regex:
        # href=(["'])(?:https://mocyno\.com)?/?(PREFIX/)?contact\.html([#?][^"']*)?\1
        # It's easier to iterate string replacements for known exact strings if we don't have too many variations.
        # But anchors matter.
        
        # Let's use regex for safety on anchors.
        
        # Look for the exact html file name end, but ensuring it's one of our targets.
        # Since we loop over targets, we can target specific strings.
        
        search_key = html_suffix # e.g. "zones/saint-tropez.html"
        clean_key = clean        # e.g. "/zones/saint-tropez/"
        
        # Pattern: href=".../zones/saint-tropez.html(#foo)?"
        # We want to replace `/zones/saint-tropez.html` with `/zones/saint-tropez/`
        
        # We apply this globally.
        # Relative paths might be tricky if they are just "saint-tropez.html" from "zones/", but assuming strict absolute paths (starting with /) or full URLs based on typical project structure.
        
        # Replace absolute usage: href="/zones/saint-tropez.html"
        # And full URL: href="https://mocyno.com/zones/saint-tropez.html"
        
        # Using a compilation of all targets might be faster, but loop is fine for this size.
        
        def replace_link(match):
            # match.group(1) = quote
            # match.group(2) = optional domain prefix
            # match.group(3) = optional anchor/query
            quote = match.group(1)
            prefix = match.group(2) or "" # https://mocyno.com or ""
            suffix = match.group(3) or "" # #anchor or ""
            
            # If prefix was empty, we assume it started with / (based on regex below)
            # or we need to handle relative? 
            # Given the list, we probably can assume rooted paths /...
            
            # The regex below will match href="/contact.html" -> prefix is None?
            
            return f'href={quote}{prefix}{clean_key}{suffix}{quote}'

        # Regex explanation:
        # href=(["'])                 # Start quote
        # (https://mocyno\.com)?      # Optional domain (Group 2)
        # /?                          # Optional slash (if domain absent or present) -> Handled by logic? 
        #                             # Actually, mapping keys don't have leading slash.
        #                             # In HTML: href="/contact.html"
        # {re.escape(html_suffix)}    # The specific file
        # ([#?][^"']*)?               # Optional anchor/query (Group 3)
        # \1                          # End quote
        
        pattern = re.compile(
            rf'href=(["\'])(https://mocyno\.com)?/?{re.escape(html_suffix)}([#?][^"\']*)?\1',
            re.IGNORECASE
        )
        
        content = pattern.sub(replace_link, content)
        
    return content

def main():
    print("Starting Strict SEO Fix...")
    
    # 1. Update Target Files (Metadata + JSON-LD)
    for path_suffix, clean_url in TARGET_MAPPING.items():
        local_path = os.path.join(PUBLIC_DIR, path_suffix.replace("/", os.sep))
        
        if os.path.exists(local_path):
            print(f"Processing Target: {local_path}")
            with open(local_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # HEAD TAGS
            content = update_head_tags(content, clean_url)
            
            # JSON-LD
            content = update_json_ld(content, clean_url)
            
            with open(local_path, 'w', encoding='utf-8') as f:
                f.write(content)
        else:
            print(f"  [Skip] File not found: {local_path}")

    # 2. Update Internal Links (All Files)
    print("\nUpdating Internal Links globally...")
    for root, dirs, files in os.walk(PUBLIC_DIR):
        for file in files:
            if file.endswith(".html"):
                file_path = os.path.join(root, file)
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = update_internal_links(content)
                
                if content != new_content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"  -> Linked fixed in: {file}")

    print("\nDone.")

if __name__ == "__main__":
    main()
