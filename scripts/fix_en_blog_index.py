
import os

EN_BLOG_INDEX = os.path.join(os.getcwd(), 'public', 'en', 'blog', 'index.html')

# MAPPINGS
# Bad EN Link -> Good Target (EN or FR)
REPLACEMENTS = {
    # Services Mappings (EN names)
    '/en/services/chantiers/': '/en/services/construction-sites/',
    '/en/services/hotellerie/': '/en/services/hospitality/',
    '/en/services/evenementiel-premium/': '/en/services/premium-events/',
    '/en/services/residentiel/': '/en/services/residential/',
    '/en/services/luxe-boutiques/': '/en/services/luxury-boutiques/', # assuming exists
    '/en/services/marinas-ports/': '/en/services/marinas-ports/', # matches

    # Footer Mappings
    '/en/a-propos/': '/en/about/',
    '/en/mentions-legales/': '/en/legal/',
    '/en/politique-confidentialite/': '/en/privacy/',
    '/en/cookies/': '/en/cookies/', # ok
    
    # Blog Posts -> Point to FR versions since EN don't exist
    '/en/blog/securite-domaine-prive-saint-tropez.html': '/fr/blog/securite-domaine-prive-saint-tropez.html',
    '/en/blog/securite-congres-cannes.html': '/fr/blog/securite-congres-cannes.html',
    '/en/blog/securite-villa-saint-tropez.html': '/fr/blog/securite-villa-saint-tropez.html',
    '/en/blog/securite-mariage-var.html': '/fr/blog/securite-mariage-var.html',
    '/en/blog/gardiennage-chantier-toulon.html': '/fr/blog/gardiennage-chantier-toulon.html',
    '/en/blog/ssiap-hotel-paca.html': '/fr/blog/ssiap-hotel-paca.html',
    
    # Static texts cleanup (optional but good)
    'lang="fr"': 'lang="en"',
    'Bienvenue sur le blog': 'Welcome to the blog',
    'Actualités Sécurité': 'Security News',
}

def fix_en_blog_index():
    if not os.path.exists(EN_BLOG_INDEX):
        print("EN Blog Index not found.")
        return

    with open(EN_BLOG_INDEX, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for bad, good in REPLACEMENTS.items():
        content = content.replace(bad, good)
        
    with open(EN_BLOG_INDEX, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Fixed EN Blog Index.")

if __name__ == "__main__":
    fix_en_blog_index()
