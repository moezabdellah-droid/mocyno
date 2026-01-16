import os

# The clean menu HTML block for ENGLISH pages
clean_menu_html = """        <div class="services-nav">
          <a href="/en/services/" class="services-trigger">Services</a>
          <div class="services-menu">
            <ul class="services-list">
              <li><a href="/en/services/securite-cynophile.html">K9 Security</a></li>
              <li><a href="/en/services/surveillance-humaine.html">Manned Guarding</a></li>
              <li><a href="/en/services/marinas-ports/">Marinas & Ports</a></li>
              <li><a href="/en/services/construction-sites/">Construction Sites</a></li>
              <li><a href="/en/services/residential/">Residential & Villas</a></li>
              <li><a href="/en/services/hospitality/">Hospitality</a></li>
              <li><a href="/en/services/premium-events/">Event Security</a></li>
            </ul>
          </div>
        </div>"""

target_files = [
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\en\index.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\en\services\construction-sites\index.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\en\services\hospitality\index.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\en\services\index.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\en\services\luxury-boutiques\index.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\en\services\marinas-ports\index.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\en\services\premium-events\index.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\en\services\protection-luxe.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\en\services\residential\index.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\en\services\securite-cynophile.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\en\services\securite-evenementielle.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\en\services\securite-incendie-ssiap.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\en\services\surveillance-humaine.html"
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
        # Look for the simply link pattern - matches what is in public/en/index.html
        simple_link_pattern = '<a href="/en/services/">Services</a>'
        
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
