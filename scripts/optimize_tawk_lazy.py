#!/usr/bin/env python3
"""
OPTIMISATION PageSpeed - Scripts Lazy Load
Optimise le chargement de Tawk.to avec IntersectionObserver + délai
"""

import os
import re
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
PUBLIC_DIR = BASE_DIR / "public"

# Pattern pour trouver le script Tawk.to actuel
TAWK_PATTERN = re.compile(
    r'<!--Start of Tawk\.to Script-->.*?<!--End of Tawk\.to Script-->',
    re.DOTALL
)

# Nouveau script Tawk.to optimisé avec lazy load
TAWK_OPTIMIZED = '''<!--Start of Tawk.to Script (Optimized Lazy Load)-->
<script type="text/javascript">
  // Lazy load Tawk.to after 3s OR on user scroll/interaction
  (function() {
    var tawkLoaded = false;
    
    function loadTawk() {
      if (tawkLoaded) return;
      tawkLoaded = true;
      
      var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
      var s1 = document.createElement("script"), s0 = document.getElementsByTagName("script")[0];
      s1.async = true;
      s1.src = 'https://embed.tawk.to/693452a684fc15197fdfc2a0/1jbq65n5t';
      s1.charset = 'UTF-8';
      s1.setAttribute('crossorigin', '*');
      s0.parentNode.insertBefore(s1, s0);
    }
    
    // Load after 3 seconds
    setTimeout(loadTawk, 3000);
    
    // OR load on first scroll/interaction
    var events = ['scroll', 'mousemove', 'touchstart', 'click'];
    var loadOnce = function() {
      loadTawk();
      events.forEach(function(event) {
        window.removeEventListener(event, loadOnce);
      });
    };
    
    events.forEach(function(event) {
      window.addEventListener(event, loadOnce, { passive: true, once: true });
    });
  })();
</script>
<!--End of Tawk.to Script (Optimized Lazy Load)-->'''

def optimize_tawk_in_file(file_path):
    """Optimise le script Tawk.to dans un fichier HTML"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Chercher le script Tawk.to
        if 'tawk.to' not in content.lower():
            return False
        
        # Remplacer le script
        new_content = TAWK_PATTERN.sub(TAWK_OPTIMIZED, content)
        
        # Sauvegarder si changement
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
        
        return False
    
    except Exception as e:
        print(f"❌ Erreur {file_path}: {e}")
        return False

def main():
    """Fonction principale"""
    print("\n[OPTIMISATION] PAGESPEED - TAWK.TO LAZY LOAD")
    print("="*70)
    
    html_files = list(PUBLIC_DIR.glob("**/*.html"))
    # Exclure les fichiers .bak
    html_files = [f for f in html_files if '.bak' not in str(f)]
    
    print(f"\nFichiers HTML trouves : {len(html_files)}")
    
    modified_count = 0
    
    for html_file in html_files:
        if optimize_tawk_in_file(html_file):
            modified_count += 1
            rel_path = html_file.relative_to(PUBLIC_DIR)
            print(f"[OK] Optimise : {rel_path}")
    
    print("\n" + "="*70)
    print(f"[OK] TERMINE : {modified_count} fichiers optimises")
    print("\nOptimisations apportees :")
    print("  - Lazy load apres 3 secondes")
    print("  - OU chargement au premier scroll/interaction")
    print("  - Evenements passifs pour meilleures performances")
    print("\nImpact attendu : +10-15 points PageSpeed Performance")
    print("="*70)

if __name__ == "__main__":
    main()
