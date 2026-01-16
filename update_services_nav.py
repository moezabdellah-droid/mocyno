import os

# The clean menu HTML block
clean_menu_html = """        <div class="services-nav">
          <a href="/services/" class="services-trigger">Services</a>
          <div class="services-menu">
            <ul class="services-list">
              <li><a href="/services/securite-cynophile.html">Sécurité Cynophile</a></li>
              <li><a href="/services/surveillance-humaine.html">Surveillance Humaine</a></li>
              <li><a href="/services/marinas-ports/">Marinas & Ports</a></li>
              <li><a href="/services/chantiers/">Sécurité Chantiers BTP</a></li>
              <li><a href="/services/residentiel/">Résidentiel & Villas</a></li>
              <li><a href="/services/hotellerie/">Hôtellerie</a></li>
              <li><a href="/services/evenementiel-premium/">Événementiel Premium</a></li>
            </ul>
          </div>
        </div>"""

target_files = [
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\services\chantiers\index.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\services\evenementiel-premium\index.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\services\hotellerie\index.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\services\index.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\services\luxe-boutiques\index.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\services\marinas-ports\index.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\services\protection-luxe.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\services\residentiel\index.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\services\securite-cynophile.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\services\securite-evenementielle.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\services\securite-incendie-ssiap.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\services\surveillance-humaine.html"
]

for file_path in target_files:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        modified = False

        # 1. Update CSS Link with Cache Buster
        if 'href="/styles.css"' in content and 'href="/styles.css?v=2.0"' not in content:
            content = content.replace('href="/styles.css"', 'href="/styles.css?v=2.0"')
            modified = True
            print(f"Updated CSS link in {os.path.basename(file_path)}")

        # 2. Update Navigation Menu
        # Look for the simple link pattern
        simple_link_pattern = '<a href="/services/">Services</a>'
        
        # Check if we already have the new menu (simple check for class presence)
        if 'class="services-nav"' not in content:
             if simple_link_pattern in content:
                 content = content.replace(simple_link_pattern, clean_menu_html)
                 modified = True
                 print(f"Updated Nav Menu in {os.path.basename(file_path)}")
             else:
                 print(f"Warning: Could not find simple 'Services' link in {os.path.basename(file_path)}")
        else:
             print(f"Nav Menu already updated in {os.path.basename(file_path)}")

        if modified:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)

    except Exception as e:
        print(f"Error processing {file_path}: {e}")
