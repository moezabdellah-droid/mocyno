
import os
import re

PUBLIC_DIR = os.path.join(os.getcwd(), 'public')

def fix_doubleslash():
    print("Fixing Double Slashes in URLs...")
    count = 0
    
    for root, _, files in os.walk(PUBLIC_DIR):
        for file in files:
            if file.endswith('.html'):
                path = os.path.join(root, file)
                
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Replace // at end of URL or before quote
                # Pattern: https://mocyno.com/fr// -> https://mocyno.com/fr/
                # Pattern: https://mocyno.com/en// -> https://mocyno.com/en/
                # We need to be careful not to break https://
                
                original_content = content
                
                # Specific critical patterns
                content = content.replace('https://mocyno.com/fr//', 'https://mocyno.com/fr/')
                content = content.replace('https://mocyno.com/en//', 'https://mocyno.com/en/')
                
                # Also check for other double slashes inside path like /services//
                # Regex for `mocyno.com/[a-z]{2}/.*?//` could be useful but simplistic replace might handle the root cause which seems to be the empty index.html string handling
                
                # General double slash fixer (excluding https://)
                # re.sub(r'(https?://[^"]*?)//+', r'\1/', content) # Too risky for now.
                
                # Let's fix specific detected issues first.
                # If generated via `get_clean_url('fr', '')` it resulted in `/fr//`
                
                if content != original_content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    count += 1
                    
    print(f"Fixed double slashes in {count} files.")

if __name__ == "__main__":
    fix_doubleslash()
