import re
import os

SITEMAP_PATH = "public/sitemap.xml"

def finalize_sitemap():
    if not os.path.exists(SITEMAP_PATH):
        print(f"Error: {SITEMAP_PATH} not found.")
        return

    with open(SITEMAP_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    # Regex to find <url> blocks
    # We want to iterate over each url block, check if it has alternates, find the FR alternate, and add x-default if missing.
    
    # Pattern to match a full <url>...</url> block
    url_block_pattern = re.compile(r'(<url>.*?</url>)', re.DOTALL)
    
    new_content = ""
    last_pos = 0
    
    changed_count = 0
    
    for match in url_block_pattern.finditer(content):
        # Append text before this block
        new_content += content[last_pos:match.start()]
        
        block = match.group(1)
        
        # Check if x-default already exists
        if 'hreflang="x-default"' in block:
            new_content += block
            last_pos = match.end()
            continue
            
        # Check if we have alternates
        # We look for hreflang="fr" href="..."
        fr_match = re.search(r'<xhtml:link rel="alternate" hreflang="fr" href="([^"]+)"', block)
        
        if fr_match:
            fr_url = fr_match.group(1)
            
            # Logic: Add x-default pointing to fr_url
            # We insert it after the last xhtml:link to keep it tidy, or before </url>
            
            # Construct the line
            x_default_line = f'    <xhtml:link rel="alternate" hreflang="x-default" href="{fr_url}"/>'
            
            # Find insertion point: after the last xhtml:link
            # or if explicit requirement: "x-default = URL FR"
            
            # Verify if this is homepage or services or generic
            # User said: "Pour les 2 entrées homepage... Pour services... Pour toutes les pages..."
            # So basically universally apply "x-default = FR_URL" if alternates exist.
            
            # Insert before the last closing tag of the block usually works or after the last link
            links = list(re.finditer(r'<xhtml:link[^>]+/>', block))
            if links:
                last_link = links[-1]
                insert_pos = last_link.end()
                # Insert a newline + indent + tag
                block = block[:insert_pos] + "\n" + x_default_line + block[insert_pos:]
                changed_count += 1
            else:
                # No links found (shouldn't happen if we found fr_match), but checking just in case
                pass
                
        new_content += block
        last_pos = match.end()

    # Append remaining content (footer of file)
    new_content += content[last_pos:]
    
    with open(SITEMAP_PATH, "w", encoding="utf-8") as f:
        f.write(new_content)
        
    print(f"Updated sitemap.xml. Added x-default to {changed_count} URL entries.")

if __name__ == "__main__":
    finalize_sitemap()
