
import os
import re

PUBLIC_DIR = os.path.join(os.getcwd(), 'public')

# Mapping for Lang Switchers (EN -> FR)
# EN Path fragment -> FR Path fragment
PATH_MAPPING = {
    '/services/construction-sites/': '/services/chantiers/',
    '/services/hospitality/': '/services/hotellerie/',
    '/services/luxury-boutiques/': '/services/luxe-boutiques/', # verify this one
    '/services/marinas-ports/': '/services/marinas-ports/', # same
    '/services/premium-events/': '/services/evenementiel-premium/',
    '/services/residential/': '/services/residentiel/',
    '/merci_en.html': '/merci.html',
    '/merci_en/': '/merci.html'
}

def fix_all_issues():
    print("Starting Batch Fixes...")
    
    # 1. Create missing English Blog Index
    # We'll copy the FR blog index as a base if it exists, or create a simple placeholder.
    fr_blog_index = os.path.join(PUBLIC_DIR, 'fr', 'blog', 'index.html')
    en_blog_dir = os.path.join(PUBLIC_DIR, 'en', 'blog')
    en_blog_index = os.path.join(en_blog_dir, 'index.html')
    
    if not os.path.exists(en_blog_dir):
        os.makedirs(en_blog_dir)
        
    if os.path.exists(fr_blog_index) and not os.path.exists(en_blog_index):
        print(f"Creating {en_blog_index} from FR base...")
        with open(fr_blog_index, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Translate key parts for EN
        content = content.replace('lang="fr"', 'lang="en"')
        content = content.replace('/fr/', '/en/') # links
        content = content.replace('Actualités Sécurité & Gardiennage', 'Security News & Updates')
        content = content.replace('Découvrez nos derniers articles', 'Discover our latest articles')
        content = content.replace('Lire la suite', 'Read more')
        content = content.replace('href="/en/blog/"', 'href="/en/blog/"') # self link
        
        # Also fix the Header/Footer links which might have been hardcoded FR in the copy
        # The verify script will catch remaining issues, but let's try to be clean.
        content = content.replace('href="/fr/services/"', 'href="/en/services/"')
        content = content.replace('href="/fr/contact/"', 'href="/en/contact/"')
        
        with open(en_blog_index, 'w', encoding='utf-8') as f:
            f.write(content)
            
    # 2. Iterate all files to fix JPG->WEBP and Lang Switchers
    for root, _, files in os.walk(PUBLIC_DIR):
        for file in files:
            if file.endswith('.html'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original_content = content
                
                # Fix Image Link
                content = content.replace('hero-mocyno.jpg', 'hero-mocyno.webp')
                
                # Fix Lang Switchers in EN files
                if '/en/' in path.replace('\\', '/'):
                    for en_key, fr_val in PATH_MAPPING.items():
                        # We look for href="/fr/services/construction-sites/" which is wrong
                        # The current file likely has: <a ... href="/fr/services/construction-sites/">FR</a>
                        # OR it might have auto-generated href="/fr/..." based on current path logic in some scripts.
                        
                        # The audit said: Broken Link: /fr/services/construction-sites/ (Target not found)
                        # So we want to replace '/fr/services/construction-sites/' with '/fr/services/chantiers/'
                        
                        # We construct the bad link (usually it's just /fr/ + the en path fragment)
                        # Actually, my previous fix_menu_links script might have generated these invalid links check?
                        # No, the broken links in audit are like: /fr/services/construction-sites/
                        
                        # So we replace the BAD string with the GOOD string
                        bad_fr_link = f"/fr{en_key}"
                        good_fr_link = f"/fr{fr_val}"
                        
                        content = content.replace(bad_fr_link, good_fr_link)
                            
                        # Also handle case where it points to itself in FR (unlikely but possible)
                
                if content != original_content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(content)
                        print(f"Fixed {file}")

    print("Batch Fixes Completed.")

if __name__ == "__main__":
    fix_all_issues()
