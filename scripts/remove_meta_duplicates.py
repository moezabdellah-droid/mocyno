import re
from pathlib import Path

# Pages to correct (from audit report)
pages_to_fix = [
    # EN Services (12)
    "public/en/services/construction-sites/index.html",
    "public/en/services/hospitality/index.html",
    "public/en/services/index.html",
    "public/en/services/luxury-boutiques/index.html",
    "public/en/services/marinas-ports/index.html",
    "public/en/services/premium-events/index.html",
    "public/en/services/protection-luxe.html",
    "public/en/services/residential/index.html",
    "public/en/services/securite-cynophile.html",
    "public/en/services/securite-evenementielle.html",
    "public/en/services/securite-incendie-ssiap.html",
    "public/en/services/surveillance-humaine.html",
    # FR Zones (4)
    "public/fr/zones/frejus.html",
    "public/fr/zones/ramatuelle.html",
    "public/fr/zones/sainte-maxime.html",
    "public/fr/zones/toulon.html",
    # EN Zones (7)
    "public/en/zones/cannes.html",
    "public/en/zones/frejus.html",
    "public/en/zones/nice.html",
    "public/en/zones/ramatuelle.html",
    "public/en/zones/saint-tropez.html",
    "public/en/zones/sainte-maxime.html",
    "public/en/zones/toulon.html",
]

corrected = []
errors = []

for page_path in pages_to_fix:
    file_path = Path(page_path)
    
    if not file_path.exists():
        errors.append(f"NOT FOUND: {page_path}")
        continue
    
    content = file_path.read_text(encoding='utf-8')
    lines = content.split('\n')
    
    # Find all meta description occurrences
    meta_desc_lines = []
    for i, line in enumerate(lines):
        if '<meta name="description"' in line:
            meta_desc_lines.append(i)
    
    if len(meta_desc_lines) < 2:
        errors.append(f"SKIP (no duplicate): {page_path}")
        continue
    
    # Remove second occurrence (keep first)
    # Find the complete tag (may span multiple lines)
    second_start = meta_desc_lines[1]
    second_end = second_start
    
    # Find end of tag
    for i in range(second_start, min(second_start + 5, len(lines))):
        if '>' in lines[i]:
            second_end = i
            break
    
    # Remove lines
    del lines[second_start:second_end+1]
    
    # Write back
    file_path.write_text('\n'.join(lines), encoding='utf-8')
    corrected.append(page_path)

print(f"CORRECTED: {len(corrected)} pages")
print(f"ERRORS: {len(errors)} pages")

if corrected:
    print("\nCORRECTED PAGES:")
    for p in corrected:
        print(f"  - {p}")

if errors:
    print("\nERRORS:")
    for e in errors:
        print(f"  - {e}")
