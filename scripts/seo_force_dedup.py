
import os
import re
import random

PUBLIC_DIR = os.path.join(os.getcwd(), 'public')

def force_dedup():
    print("Starting Surgical Deduplication...")
    files_processed = 0
    files_modified = 0
    
    # 1. SCAN ALL HTML FILES
    for root, _, files in os.walk(PUBLIC_DIR):
        for file in files:
            if not file.endswith('.html'):
                continue
                
            path = os.path.join(root, file)
            files_processed += 1
            
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # 2. EXTRACT AND PROTECT SEO BLOCK
            # Look for strict block
            block_match = re.search(r'(<!-- SEO:BEGIN -->.*?<!-- SEO:END -->)', content, re.DOTALL)
            
            preserved_block = ""
            if block_match:
                preserved_block = block_match.group(1)
                # Replace with placeholder
                content = content.replace(preserved_block, '___SEO_BLOCK_PLACEHOLDER___')
            else:
                # If no SEO block found, skipping deduplication to be safe (or we could strip all, but prompt says "conserver le bloc unique")
                # Assuming all files should have it by now.
                # print(f"Skipping {file}: No SEO block.")
                continue
            
            # 3. STRIP DUPLICATES from remaining content
            # Remove <link rel="canonical" ... >
            content = re.sub(r'<link\s+rel=["\']canonical["\'].*?>', '', content, flags=re.IGNORECASE)
            
            # Remove <link rel="alternate" hreflang ... > (matches any order of attributes)
            # Strategy: find <link ... > then check if it has rel="alternate" AND hreflang=
            
            def repl(m):
                tag = m.group(0)
                if 'rel="alternate"' in tag or "rel='alternate'" in tag:
                    if 'hreflang=' in tag:
                        return ''
                return tag

            content = re.sub(r'<link[^>]+>', repl, content, flags=re.IGNORECASE)
            
            # 4. RESTORE SEO BLOCK
            content = content.replace('___SEO_BLOCK_PLACEHOLDER___', preserved_block)
            
            # Clean up empty lines left by deletions (optional, cosmetic)
            content = re.sub(r'\n\s*\n', '\n', content)

            if content != original_content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                files_modified += 1
                # print(f"Fixed {file}")
    
    print(f"Scanned {files_processed} files. Modified {files_modified} files.")
    
    # 5. RANDOM CHECK
    print("\n--- RANDOM CHECK (10 Files) ---")
    all_html_files = []
    for root, _, files in os.walk(PUBLIC_DIR):
        for file in files:
            if file.endswith('.html'):
                all_html_files.append(os.path.join(root, file))
    
    sample = random.sample(all_html_files, min(10, len(all_html_files)))
    
    for p in sample:
        with open(p, 'r', encoding='utf-8') as f:
            c = f.read()
        
        canon_count = c.count('rel="canonical"')
        hreflang_count = c.count('hreflang=')
        
        # We expect exactly 1 canonical (inside block)
        # Hreflangs: 3 or 4 depending on page (fr/en/x-default)
        # But crucially, they should all be close together.
        
        # Let's count occurences of the TAG start
        # Actually simple string count is good proxy for now.
        
        print(f"File: {os.path.basename(p)}")
        print(f"  Canonical tags count: {canon_count}")
        # print(f"  Hreflang attrs count: {hreflang_count}")
        
        if canon_count > 1:
            print("  FAIL: Duplicate Canonical!")
        else:
            print("  PASS: Canonical unique.")

if __name__ == "__main__":
    force_dedup()
