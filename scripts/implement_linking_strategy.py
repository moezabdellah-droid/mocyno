
import os
import re

PUBLIC_DIR = os.path.join(os.getcwd(), 'public', 'fr')

# CONFIG - BLOCKS TO INSERT
# Zones 1: Hubs Geographiques (Bottom of page - complementary zones)

BLOCK_ZONES_BOTTOM = {
    'zones/saint-tropez.html': """
        <section class="section bg-light">
            <div class="container">
                <h2>Interventions MO'CYNO sur la Côte d’Azur</h2>
                <ul class="zones-grid-list">
                    <li>
                        <a href="/fr/zones/nice/">Sécurité privée et cynophile à Nice</a>
                        – chantiers, entreprises et sites urbains sensibles.
                    </li>
                    <li>
                        <a href="/fr/zones/toulon/">Agence de sécurité à Toulon</a>
                        – surveillance industrielle, portuaire et BTP.
                    </li>
                </ul>
            </div>
        </section>
""",
    'zones/nice.html': """
        <section class="section bg-light">
            <div class="container">
                <h2>Zones d’intervention complémentaires</h2>
                <ul class="zones-grid-list">
                    <li>
                        <a href="/fr/zones/saint-tropez/">Sécurité luxe et villas à Saint-Tropez</a>
                        – événements privés et propriétés haut de gamme.
                    </li>
                    <li>
                        <a href="/fr/zones/toulon/">Sécurité industrielle à Toulon</a>
                        – chantiers, ports et zones d’activités.
                    </li>
                </ul>
            </div>
        </section>
""",
    'zones/toulon.html': """
        <section class="section bg-light">
            <div class="container">
                <h2>Couverture régionale PACA</h2>
                <ul class="zones-grid-list">
                    <li>
                        <a href="/fr/zones/nice/">Sécurité chantiers et entreprises à Nice</a>
                    </li>
                    <li>
                        <a href="/fr/zones/saint-tropez/">Protection de villas à Saint-Tropez</a>
                    </li>
                </ul>
            </div>
        </section>
"""
}

# Zones 2: Maillage Zone -> Service (Injection inside content)
# We will append this to the "intro-block" or similar if possible, or replace a placeholder if we had one.
# Since we don't have placeholders, we'll append to the first substantial paragraph or specific section.
# User example: "Sur chaque page zone, ajouter 2 à 3 liens services MAX".
# Strategy: Find the "intro-block" div and append a paragraph inside it.

LINKS_ZONE_TO_SERVICE = {
    'zones/saint-tropez.html': """
                <p style="margin-top: 1.5rem;">
                  Pour les propriétés de prestige, MO'CYNO déploie des dispositifs de
                  <a href="/fr/services/securite-cynophile/">sécurité cynophile (maître-chien)</a>
                  et de
                  <a href="/fr/services/protection-luxe/">protection de villas haut de gamme</a>.
                </p>""",
    'zones/nice.html': """
                <p style="margin-top: 1.5rem;">
                  Nos équipes assurent la
                  <a href="/fr/services/surveillance-humaine/">surveillance humaine</a>
                  et la sécurisation de
                  <a href="/fr/services/chantiers/">chantiers BTP</a>
                  dans toute la métropole niçoise.
                </p>""",
    'zones/toulon.html': """
                <p style="margin-top: 1.5rem;">
                  MO'CYNO intervient pour la
                  <a href="/fr/services/securite-cynophile/">sécurité cynophile</a>
                  et la surveillance de
                  <a href="/fr/services/chantiers/">sites industriels et portuaires</a>
                  dans le Var.
                </p>"""
}

# Services -> Zones (Retour autorite)
# Add mini-block "Zones couvertes par nos équipes..."
# Target: /services/securite-cynophile.html
# We will add this before the FAQ or near the bottom features.

BLOCK_SERVICE_ZONES = {
    'services/securite-cynophile.html': """
        <section class="section container">
            <h2>Zones couvertes par nos équipes cynophiles</h2>
            <ul class="zones-grid-list">
                <li><a href="/fr/zones/saint-tropez/">Saint-Tropez & Golfe</a></li>
                <li><a href="/fr/zones/nice/">Nice & Alpes-Maritimes</a></li>
                <li><a href="/fr/zones/toulon/">Toulon & Var</a></li>
            </ul>
        </section>
"""
}

def implement_strategy():
    print("Implementing SEO Internal Linking Strategy...")
    
    # 1. ZONES PAGES
    for rel_path, block_bottom in BLOCK_ZONES_BOTTOM.items():
        path = os.path.join(PUBLIC_DIR, rel_path.replace('/', os.sep))
        if not os.path.exists(path):
            print(f"File not found: {path}")
            continue
            
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Insert Bottom Block: Before <section class="section container text-center"> (CTA) usually, or before footer.
        # Looking at toulon.html content previously viewed:
        # <!-- CTA SECTION -->
        # <section class="section container text-center">
        # Let's insert BEFORE that CTA section.
        
        if '<!-- CTA SECTION -->' in content:
            content = content.replace('<!-- CTA SECTION -->', block_bottom + '\n        <!-- CTA SECTION -->')
            print(f"Inserted bottom block in {rel_path}")
        else:
            print(f"Could not find CTA section in {rel_path}, skipping bottom block.")

        # Insert Service Links: Inside <div class="intro-block"> ... last <p> ... </p> -> append
        link_html = LINKS_ZONE_TO_SERVICE.get(rel_path)
        if link_html and '<div class="intro-block">' in content:
            # Find the closing div of intro-block
            # Regex to find the div content is risky if nested.
            # But usually it ends with </div> on a new line or similar.
            # Let's simple append to the last paragraph closing tag insdie intro block?
            # Or just replace </div> with link_html + </div>, assuming first </div> after intro-block start is the end.
            
            # Find start
            start = content.find('<div class="intro-block">')
            # Find end of div (naive)
            # Better: Insert after the specific text we know exists? 
            # Toulon: "Notre proximité est votre garantie de réactivité.</p>"
            # Let's try to match the last </p> inside intro block.
            
            # To be safe, let's use a unique string from file content if known, or just insert after a known paragraph?
            # actually better: replace `</div>` relative to `intro-block` is safer if html is well indented.
            
            # A safer approach for this specific static site:
            # Check for `</div>` after `intro-block`.
            # We don't have a parser, so let's try to find the location.
            
            substr = content[start:]
            end_div = substr.find('</div>')
            if end_div != -1:
                # Insert before this </div>
                insertion_point = start + end_div
                new_content = content[:insertion_point] + link_html + content[insertion_point:]
                content = new_content
                print(f"Inserted service links in {rel_path}")
                
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)

    # 2. SERVICE PAGES
    for rel_path, block_zones in BLOCK_SERVICE_ZONES.items():
        path = os.path.join(PUBLIC_DIR, rel_path.replace('/', os.sep))
        if not os.path.exists(path):
             # Try /index.html if dir
             path_idx = os.path.join(PUBLIC_DIR, rel_path.replace('.html', ''), 'index.html')
             if os.path.exists(path_idx):
                 path = path_idx
             else:
                 print(f"File not found: {path}")
                 continue

        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Insert Block: Before CTA or FAQ?
        # User said: "Sur les pages services clés, ajouter un mini-bloc"
        # Let's insert before FAQ if exists, else before CTA.
        
        if '<!-- FAQ SECTION -->' in content:
            content = content.replace('<!-- FAQ SECTION -->', block_zones + '\n        <!-- FAQ SECTION -->')
            print(f"Inserted zone block in {rel_path}")
        elif '<!-- CTA SECTION -->' in content:
            content = content.replace('<!-- CTA SECTION -->', block_zones + '\n        <!-- CTA SECTION -->')
            print(f"Inserted zone block in {rel_path}")
            
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)

    print("Linking Strategy Implemented.")

if __name__ == "__main__":
    implement_strategy()
