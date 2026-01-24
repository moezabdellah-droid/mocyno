#!/usr/bin/env python3
"""
Phase 3 - Lot 5: Root Legal/Utility Pages Header/Footer Harmonization
Surgical replacement of header and footer blocks to match FR baseline.
"""

from pathlib import Path
from bs4 import BeautifulSoup
import sys

# FR Baseline blocks (extracted from public/fr/index.html)
FR_HEADER = '''  <header class="site-header" role="banner">
    <div class="container nav">
      <a class="logo" href="/fr/">
        <picture>
          <source srcset="/mocyno-logo.webp" type="image/webp" />
          <img alt="Logo MO'Cyno" height="36" src="/mocyno-logo.webp" style="border-radius:8px" width="36" />
        </picture>
        <span>MO'CYNO</span>
      </a>
      <button aria-label="Ouvrir ou fermer le menu" class="menu-toggle" onclick="document.querySelector('.nav .links').classList.toggle('open');
      document.querySelector('.nav-overlay').classList.toggle('show')">Menu</button>
      <nav aria-label="Navigation principale" class="links" role="navigation">
        <div class="services-nav">
          <a class="services-trigger" href="/fr/services/">Services</a>
          <div class="services-menu">
            <ul class="services-list">
              <li><a href="/fr/services/securite-cynophile/">Sécurité Cynophile</a></li>
              <li><a href="/fr/services/surveillance-humaine/">Surveillance Humaine</a></li>
              <li><a href="/fr/services/marinas-ports/">Marinas &amp; Ports</a></li>
              <li><a href="/fr/services/chantiers/">Sécurité Chantiers BTP</a></li>
              <li><a href="/fr/services/residentiel/">Résidentiel &amp; Villas</a></li>
              <li><a href="/fr/services/hotellerie/">Hôtellerie</a></li>
              <li><a href="/fr/services/evenementiel-premium/">Événementiel Premium</a></li>
            </ul>
          </div>
        </div>
        <div class="zones-nav">
          <a class="zones-trigger" href="/#zones">Zones</a>
          <div class="zones-menu">
            <ul class="zones-list">
              <li><a href="/fr/zones/saint-tropez/">Saint-Tropez</a></li>
              <li><a href="/fr/zones/cannes/">Cannes</a></li>
              <li><a href="/fr/zones/nice/">Nice</a></li>
              <li><a href="/fr/zones/toulon/">Toulon</a></li>
              <li><a href="/fr/zones/frejus/">Fréjus</a></li>
              <li><a href="/fr/zones/sainte-maxime/">Sainte-Maxime</a></li>
            </ul>
          </div>
        </div>
        <a href="/#expertises">Expertises</a>
        <a href="/#references">Références</a>
        <a href="/fr/blog/" style="font-weight:700">Blog</a>
        <a class="btn primary" href="/fr/contact/">Devis &amp; Contact</a>
        <a aria-label="English" class="lang-switch" href="/en/" hreflang="en-GB">EN</a>
      </nav>
    </div>
    <div aria-label="Fermer le menu" class="nav-overlay"
      onclick="document.querySelector('.nav .links').classList.remove('open');this.classList.remove('show')"
      tabindex="0"></div>
  </header>'''

FR_FOOTER = '''  <footer class="site-footer" role="contentinfo" style="background:#0f3552;color:#fff">
    <div class="container footer-grid">
      <div class="footer-left">
        <p class="footer-meta">© 2025 MO'CYNO — Agence de sécurité privée — SASU — SIRET 990 179 566 00015 — NAF 80.10Z
        </p>
        <div class="footer-inline">
          <span>31 Rue Chevalier Paul, 83000 Toulon, France</span><span>•</span>
          <span>Autorisation CNAPS : <a
              href="https://teleservices-cnaps.interieur.gouv.fr/teleservices/ihm/#/morale/search"
              rel="noopener noreferrer" style="color:#fff;text-decoration:underline;"
              target="_blank">AUT-83-2124-09-09-20250998415</a>
            — L'autorisation d'exercice ne confère aucune
            prérogative de puissance publique à l'entreprise ou aux personnes qui en bénéficient. (Art. L612-14
            CSI)</span>
        </div>
      </div>
      <nav aria-label="Navigation secondaire" class="footer-links" role="navigation">
        <a href="/fr/a-propos/">À propos</a>
        <a href="/fr/mentions-legales/">Mentions légales</a>
        <a href="/fr/politique-confidentialite/">Confidentialité</a>
        <a href="/fr/cookies/">Cookies</a>
        <a href="/sitemap.xml">Sitemap</a>
      </nav>
    </div>
  </footer>'''

def replace_header_footer(file_path: Path):
    """Replace header and footer in file with FR baseline."""
    print(f"Processing: {file_path.relative_to(Path.cwd())}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Parse with BeautifulSoup
    soup = BeautifulSoup(content, 'html.parser')
    
    # Find and replace header
    old_header = soup.find('header', class_='site-header')
    if old_header:
        new_header = BeautifulSoup(FR_HEADER, 'html.parser').find('header')
        old_header.replace_with(new_header)
        print(f"  ✓ Header replaced")
    else:
        print(f"  ! Header not found")
    
    # Find and replace footer
    old_footer = soup.find('footer', class_='site-footer')
    if old_footer:
        new_footer = BeautifulSoup(FR_FOOTER, 'html.parser').find('footer')
        old_footer.replace_with(new_footer)
        print(f"  ✓ Footer replaced")
    else:
        print(f"  ! Footer not found")
    
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    
    print(f"  ✓ Saved\n")

def main():
    # Target files for Lot 5 (Root Legal/Utility Pages)
    root_files = [
        'public/404.html',
        'public/index.html',
        'public/contact.html',
        'public/a-propos.html',
        'public/cookies.html',
        'public/mentions-legales.html',
        'public/politique-confidentialite.html',
        'public/merci.html'
    ]
    
    project_root = Path.cwd()
    
    print("=" * 70)
    print("PHASE 3 - LOT 5: ROOT LEGAL/UTILITY PAGES HARMONIZATION")
    print("=" * 70)
    print()
    
    processed = 0
    not_found = 0
    
    for root_file in root_files:
        file_path = project_root / root_file
        if file_path.exists():
            replace_header_footer(file_path)
            processed += 1
        else:
            print(f"! File not found: {root_file}\n")
            not_found += 1
    
    print("=" * 70)
    print(f"COMPLETED: {processed}/{len(root_files)} root files processed")
    if not_found > 0:
        print(f"WARNING: {not_found} files not found")
    print("=" * 70)

if __name__ == '__main__':
    main()
