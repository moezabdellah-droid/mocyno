#!/usr/bin/env python3
"""
Phase 3 - Lot 4: EN Pages Header/Footer Harmonization
Surgical replacement of header and footer blocks to match EN baseline.
"""

from pathlib import Path
from bs4 import BeautifulSoup
import sys

# EN Baseline blocks (extracted from public/en/index.html)
EN_HEADER = '''<header class="site-header">
<div class="container nav">
<a class="logo" href="/en/">
<picture>
<source srcset="/mocyno-logo.webp" type="image/webp"/>
<img alt="Logo MO'Cyno" height="36" src="/mocyno-logo.webp" style="border-radius:8px" width="36"/>
</picture>
<span>MO'CYNO</span>
</a>
<button class="menu-toggle" onclick="document.querySelector('.nav .links').classList.toggle('open');
               document.querySelector('.nav-overlay').classList.toggle('show')">
        Menu
      </button>
<nav class="links">
<div class="services-nav">
<a class="services-trigger" href="/en/services/">Services</a>
<div class="services-menu">
<ul class="services-list">
<li><a href="/en/services/securite-cynophile/">K9 Security</a></li>
<li><a href="/en/services/surveillance-humaine/">Manned Guarding</a></li>
<li><a href="/en/services/marinas-ports/">Marinas &amp; Ports</a></li>
<li><a href="/en/services/construction-sites/">Construction Sites</a></li>
<li><a href="/en/services/residential/">Residential &amp; Villas</a></li>
<li><a href="/en/services/hospitality/">Hospitality</a></li>
<li><a href="/en/services/premium-events/">Event Security</a></li>
</ul>
</div>
</div>
<a href="/en/#expertises">Expertise</a>
<div class="zones-nav">
<a class="zones-trigger" href="/en/#zones">Areas</a>
<div class="zones-menu">
<ul class="zones-list">
<li><a href="/en/zones/saint-tropez/">Saint-Tropez</a></li>
<li><a href="/en/zones/cannes/">Cannes</a></li>
<li><a href="/en/zones/nice/">Nice</a></li>
<li><a href="/en/zones/toulon/">Toulon</a></li>
<li><a href="/en/zones/frejus/">Frejus</a></li>
<li><a href="/en/zones/sainte-maxime/">Sainte-Maxime</a></li>
</ul>
</div>
</div>
<a href="/en/#references">References</a>
<a href="/en/blog/" style="font-weight:700">Blog</a>
<a class="btn primary" href="/en/contact/">Quote &amp; Contact</a>
<a aria-label="Français" class="lang-switch" href="/fr/" hreflang="fr-FR">FR</a>
</nav>
</div>
<div class="nav-overlay" onclick="document.querySelector('.nav .links').classList.remove('open');
                this.classList.remove('show')"></div>
</header>'''

EN_FOOTER = '''<footer class="site-footer" role="contentinfo" style="background:#0f3552;color:#fff">
<div class="container footer-grid">
<div class="footer-left">
<p class="footer-meta">© 2025 MO'CYNO — SASU — SIRET 990 179 566 00015 — NAF 80.10Z</p>
<div class="footer-inline">
<span>31 Rue Chevalier Paul, 83000 Toulon, France</span><span>•</span>
<span>CNAPS licence: <a href="https://teleservices-cnaps.interieur.gouv.fr/teleservices/ihm/#/morale/search" rel="noopener noreferrer" style="color:#fff;text-decoration:underline;" target="_blank">AUT-83-2124-09-09-20250998415</a> — This licence does not confer any public authority status
            nor official endorsement. (Art. L612-14 CSI)</span>
</div>
</div>
<nav aria-label="Secondary navigation" class="footer-links" role="navigation">
<a href="/en/about/">About</a>
<a href="/en/legal/">Legal</a>
<a href="/en/privacy/">Privacy</a>
<a href="/en/cookies/">Cookies</a>
<a href="/sitemap.xml">Sitemap</a>
</nav>
</div>
</footer>'''

def replace_header_footer(file_path: Path):
    """Replace header and footer in file with EN baseline."""
    print(f"Processing: {file_path.relative_to(Path.cwd())}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Parse with BeautifulSoup
    soup = BeautifulSoup(content, 'html.parser')
    
    # Find and replace header
    old_header = soup.find('header', class_='site-header')
    if old_header:
        new_header = BeautifulSoup(EN_HEADER, 'html.parser').find('header')
        old_header.replace_with(new_header)
        print(f"  ✓ Header replaced")
    else:
        print(f"  ! Header not found")
    
    # Find and replace footer
    old_footer = soup.find('footer', class_='site-footer')
    if old_footer:
        new_footer = BeautifulSoup(EN_FOOTER, 'html.parser').find('footer')
        old_footer.replace_with(new_footer)
        print(f"  ✓ Footer replaced")
    else:
        print(f"  ! Footer not found")
    
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    
    print(f"  ✓ Saved\n")

def main():
    project_root = Path.cwd()
    en_dir = project_root / 'public' / 'en'
    
    # Collect all EN files (excluding index.html which is the baseline)
    en_files = []
    
    # Root EN pages
    root_en_pages = [
        'about.html',
        'contact.html',
        'cookies.html',
        'legal.html',
        'privacy.html',
        'merci_en.html'
    ]
    
    for page in root_en_pages:
        file_path = en_dir / page
        if file_path.exists():
            en_files.append(file_path)
    
    # EN blog
    en_blog = en_dir / 'blog' / 'index.html'
    if en_blog.exists():
        en_files.append(en_blog)
    
    # EN services (all HTML files)
    en_services_dir = en_dir / 'services'
    if en_services_dir.exists():
        for html_file in en_services_dir.rglob('*.html'):
            en_files.append(html_file)
    
    # EN zones (all HTML files)
    en_zones_dir = en_dir / 'zones'
    if en_zones_dir.exists():
        for html_file in en_zones_dir.rglob('*.html'):
            en_files.append(html_file)
    
    print("=" * 70)
    print("PHASE 3 - LOT 4: EN PAGES HARMONIZATION")
    print("=" * 70)
    print(f"Total EN files to process: {len(en_files)}")
    print()
    
    processed = 0
    
    for file_path in sorted(en_files):
        replace_header_footer(file_path)
        processed += 1
    
    print("=" * 70)
    print(f"COMPLETED: {processed} EN files processed")
    print("=" * 70)

if __name__ == '__main__':
    main()
