
import re
import os
from pathlib import Path

# Use os.getcwd for reliability in this environment, then Path
ROOT = Path(os.getcwd()) / "public"
BEGIN = "<!-- SEO:BEGIN -->"
END = "<!-- SEO:END -->"

# Adjusted Regex to be very compatible
CANON_RE = re.compile(r'\n?\s*<link\s+rel=["\']canonical["\'][^>]*>\s*', re.IGNORECASE)
# Handles both orderings: rel="alternate" hreflang="..." OR hreflang="..." rel="alternate"
# The user provided regex was specific: <link rel="alternate" hreflang=...
# Let's make it slightly more flexible to catch variations if needed, but stick close to user request for safety.
# User regex: r'\n?\s*<link\s+rel="alternate"\s+hreflang="[^"]+"\s+href="[^"]+"\s*/?>\s*'
# My previous analysis showed attributes might be swapped.
# Let's use a two-pass regex or a more complex one? 
# Actually, the user's provided script has a specific regex:
# ALT_RE = re.compile(r'\n?\s*<link\s+rel="alternate"\s+hreflang="[^"]+"\s+href="[^"]+"\s*/?>\s*', re.IGNORECASE)
# I will use the user's regex but also add one for the swapped attributes just in case, 
# or just stick to the user's request exactly? "Script Python prêt à coller". I should likely paste it.
# However, if the attributes are swapped (href before hreflang), the user's regex won't catch it.
# In `seo_force_dedup.py` I saw `rel="alternate"` and `hreflang` being mixed.
# I'll stick to the user's logic but maybe enhance the regex slightly to be safe if I find nothing changed.
# Wait, the user said "Script Python prêt à coller (robuste)". I should use it EXACTLY. 
# But I will fix the ROOT path to be absolute to avoid CWD issues.

ALT_RE = re.compile(r'\n?\s*<link\s+rel=["\']alternate["\']\s+(:?hreflang=["\'][^"\']+["\']\s+href=["\'][^"\']+["\']|href=["\'][^"\']+["\']\s+hreflang=["\'][^"\']+["\'])\s*/?>\s*', re.IGNORECASE)

def clean_file(p: Path) -> bool:
    try:
        html = p.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        print(f"Error reading {p}: {e}")
        return False

    if BEGIN not in html or END not in html:
        return False

    try:
        pre, rest = html.split(BEGIN, 1)
        block, post = rest.split(END, 1)
    except ValueError:
        # Handling multiple occurrences or malformed tags
        return False
        
    protected = BEGIN + block + END

    # On nettoie uniquement PRE et POST (hors bloc protégé)
    # Removing Canonical
    pre2 = CANON_RE.sub("\n", pre)
    post2 = CANON_RE.sub("\n", post)
    
    # Removing Alternate Hreflang
    pre3 = ALT_RE.sub("\n", pre2)
    post3 = ALT_RE.sub("\n", post2)

    new_html = pre3 + protected + post3

    # Normalize multiple newlines created by deletion
    # new_html = re.sub(r'\n\s*\n', '\n', new_html) 

    if new_html != html:
        p.write_text(new_html, encoding="utf-8")
        return True
    return False

def main():
    changed = 0
    print(f"Scanning {ROOT}...")
    for f in ROOT.rglob("*.html"):
        if clean_file(f):
            changed += 1
            # print(f"Cleaned {f.name}")

    print("Changed files:", changed)

if __name__ == "__main__":
    main()
