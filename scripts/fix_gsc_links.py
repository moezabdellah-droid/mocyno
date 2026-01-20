import os
import re

# Base mapping for target pages: physical file -> clean URL (slash-terminated)
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

def get_x_default_url(file_path):
    """Determines the x-default URL for a given file."""
    # Logic: If EN, map to FR equivalent. If FR, map to self.
    # Simplified: Find the corresponding key in mapping that matches the FR version.
    
    # Normalize path separators
    normalized_path = file_path.replace("\\", "/")
    
    # Check if it's an EN file
    if "/en/" in normalized_path:
        # Try to find FR equivalent
        fr_path = normalized_path.replace("/en/", "/")
        if fr_path in TARGET_MAPPING:
            return BASE_URL + TARGET_MAPPING[fr_path]
        
        # Special cases (about -> a-propos, etc)
        filename = os.path.basename(normalized_path)
        if filename == "about.html": return BASE_URL + "/a-propos/"
        if filename == "legal.html": return BASE_URL + "/mentions-legales/"
        if filename == "privacy.html": return BASE_URL + "/politique-confidentialite/"
        # For zones, it's usually direct replacement of /en/zones/ to /zones/
        if "zones/" in normalized_path:
             fr_zone = normalized_path.replace("/en/zones/", "/zones/")
             if fr_zone in TARGET_MAPPING:
                 return BASE_URL + TARGET_MAPPING[fr_zone]
                 
    else:
        # It's likely a FR file or root
        if normalized_path in TARGET_MAPPING:
            return BASE_URL + TARGET_MAPPING[normalized_path]
            
    return None

def update_canonicals_and_hreflangs(file_path, content, clean_url):
    """Updates canonical and hreflang tags in the content."""
    
    # Update Canonical
    # Regex for canonical: <link rel="canonical" href="...">
    canonical_pattern = r'(<link[^>]*rel=["\']canonical["\'][^>]*href=["\'])([^"\']*?)(["\'][^>]*>)'
    
    def canonical_replacement(match):
        prefix = match.group(1)
        suffix = match.group(3)
        return f'{prefix}{BASE_URL}{clean_url}{suffix}'
    
    if re.search(canonical_pattern, content):
        content = re.sub(canonical_pattern, canonical_replacement, content)
    else:
        # If no canonical exists, maybe insert it? (User said UPDATE, assuming existence, but safer not to inject blindly if absent unless strictly needed)
        pass

    # Update Hreflangs
    # Strategy: Find all hreflangs. If one matches a known target .html, replace it with clean URL.
    
    # Helper to clean a specific href inside hreflang tag
    def hreflang_href_cleaner(match):
        full_tag = match.group(0)
        # Extract href
        href_match = re.search(r'href=["\']([^"\']+)["\']', full_tag)
        if href_match:
            current_href = href_match.group(1)
            # check if this href ends with one of our keys or matches full url
            for key, clean in TARGET_MAPPING.items():
                if current_href.endswith(key):
                    # It matches a target. Replace .html with clean slash
                    # But be careful about absolute vs relative. 
                    # Assuming absolute https://mocyno.com/...
                    if current_href.startswith("http"):
                        new_href = f"{BASE_URL}{clean}"
                        return full_tag.replace(current_href, new_href)
                    elif current_href.startswith("/"):
                        new_href = clean
                        return full_tag.replace(current_href, new_href)
        return full_tag

    # Scan for link rel="alternate"
    # This is complex to do with simple regex substitution on the whole file.
    # Better to iterate line by line or find all tags.
    
    hreflang_pattern = r'<link[^>]*rel=["\']alternate["\'][^>]*hreflang=["\'][^"\']*["\'][^>]*>'
    content = re.sub(hreflang_pattern, hreflang_href_cleaner, content)
    
    # Ensure x-default exists
    # If not present, add it after the last hreflang or canonical
    if 'hreflang="x-default"' not in content:
        x_default_url = get_x_default_url(file_path)
        if x_default_url:
            x_default_tag = f'<link rel="alternate" hreflang="x-default" href="{x_default_url}" />'
            # Insert after the last <link rel="alternate" ...>
            matches = list(re.finditer(hreflang_pattern, content))
            if matches:
                last_match = matches[-1]
                end_pos = last_match.end()
                content = content[:end_pos] + "\n  " + x_default_tag + content[end_pos:]
            elif re.search(canonical_pattern, content):
                 # Fallback: after canonical
                 match = re.search(canonical_pattern, content)
                 end_pos = match.end()
                 content = content[:end_pos] + "\n  " + x_default_tag + content[end_pos:]
                 
    return content

def update_internal_links(content):
    """Updates internal links to target pages to use clean URLs."""
    
    for html_file, clean_url in TARGET_MAPPING.items():
        # Handle '/key'
        target_abs = "/" + html_file
        target_clean = clean_url
        
        # Simple replace for href="/path/to/file.html"
        # We need to be careful not to replace partial matches incorrectly if we had keys that were substrings of others (not the case here)
        
        # Regex to match href="/path/to/file.html" allowing for quote variations
        # And ensure we don't break anchors #section
        
        # Pattern: href="(/en/)?(zones/)?base.html"
        # We simply loop over our known mapping and do string replacement for the absolute path version
        
        # Replace href="/contact.html" -> href="/contact/"
        content = content.replace(f'href="{target_abs}"', f'href="{target_clean}"')
        content = content.replace(f"href='{target_abs}'", f"href='{target_clean}'")
        
        # Replace full URL https://mocyno.com/contact.html
        content = content.replace(f'href="{BASE_URL}{target_abs}"', f'href="{BASE_URL}{target_clean}"')
        
    return content

def main():
    print("Starting GSC Link Fix...")
    
    # 1. Identify Target Files (Physical) for Metadata Updates
    for path_suffix, clean_url in TARGET_MAPPING.items():
        # Construct full local path
        local_path = os.path.join(PUBLIC_DIR, path_suffix.replace("/", os.sep))
        
        if os.path.exists(local_path):
            print(f"Updating Metadata for: {local_path}")
            with open(local_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = update_canonicals_and_hreflangs(path_suffix, content, clean_url)
            
            if content != new_content:
                with open(local_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                    print("  -> Updated.")
            else:
                print("  -> No changes needed.")
        else:
            print(f"Warning: File not found {local_path}")

    # 2. Walk ALL HTML files for Internal Link Updates
    print("\nUpdating Internal Links in ALL HTML files...")
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
                    print(f"  -> Links updated in: {file_path}")

    print("\nDone.")

if __name__ == "__main__":
    main()
