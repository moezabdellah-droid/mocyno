import re

# Same mapping as before
TARGET_MAPPING = {
    # FR Base - Exact matches in sitemap locs might need domain prepended
    "https://mocyno.com/contact.html": "https://mocyno.com/contact/",
    "https://mocyno.com/a-propos.html": "https://mocyno.com/a-propos/",
    "https://mocyno.com/mentions-legales.html": "https://mocyno.com/mentions-legales/",
    "https://mocyno.com/politique-confidentialite.html": "https://mocyno.com/politique-confidentialite/",
    "https://mocyno.com/cookies.html": "https://mocyno.com/cookies/",
    # Zones FR
    "https://mocyno.com/zones/saint-tropez.html": "https://mocyno.com/zones/saint-tropez/",
    "https://mocyno.com/zones/ramatuelle.html": "https://mocyno.com/zones/ramatuelle/",
    "https://mocyno.com/zones/cannes.html": "https://mocyno.com/zones/cannes/",
    "https://mocyno.com/zones/nice.html": "https://mocyno.com/zones/nice/",
    "https://mocyno.com/zones/toulon.html": "https://mocyno.com/zones/toulon/",
    "https://mocyno.com/zones/frejus.html": "https://mocyno.com/zones/frejus/",
    "https://mocyno.com/zones/sainte-maxime.html": "https://mocyno.com/zones/sainte-maxime/",
    # EN Base
    "https://mocyno.com/en/contact.html": "https://mocyno.com/en/contact/",
    "https://mocyno.com/en/about.html": "https://mocyno.com/en/about/",
    "https://mocyno.com/en/legal.html": "https://mocyno.com/en/legal/",
    "https://mocyno.com/en/privacy.html": "https://mocyno.com/en/privacy/",
    "https://mocyno.com/en/cookies.html": "https://mocyno.com/en/cookies/",
    # Zones EN
    "https://mocyno.com/en/zones/saint-tropez.html": "https://mocyno.com/en/zones/saint-tropez/",
    "https://mocyno.com/en/zones/ramatuelle.html": "https://mocyno.com/en/zones/ramatuelle/",
    "https://mocyno.com/en/zones/cannes.html": "https://mocyno.com/en/zones/cannes/",
    "https://mocyno.com/en/zones/nice.html": "https://mocyno.com/en/zones/nice/",
    "https://mocyno.com/en/zones/toulon.html": "https://mocyno.com/en/zones/toulon/",
    "https://mocyno.com/en/zones/frejus.html": "https://mocyno.com/en/zones/frejus/",
    "https://mocyno.com/en/zones/sainte-maxime.html": "https://mocyno.com/en/zones/sainte-maxime/",
}

SITEMAP_PATH = "public/sitemap.xml"

def main():
    print(f"Reading {SITEMAP_PATH}...")
    with open(SITEMAP_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # We need to replace both <loc> and href in <xhtml:link>
    # Since we have the exact Full URL string mapping, we can try simple string replacement.
    # However, to be safe and avoid partial matches (unlikely with .html extension), strict mapping is good.
    
    count = 0
    for old_url, new_url in TARGET_MAPPING.items():
        if old_url in content:
            content = content.replace(old_url, new_url)
            count += 1
            
    if content != original_content:
        with open(SITEMAP_PATH, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated sitemap.xml with {count} replacements.")
    else:
        print("No changes made to sitemap.xml.")

if __name__ == "__main__":
    main()
