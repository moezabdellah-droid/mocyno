
import requests
import re

URL = "https://mocyno.com/en/zones/saint-tropez/"

try:
    print(f"Fetching {URL}...")
    # Add random query param to bypass cache if needed, or cache-control header
    headers = {
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
    }
    r = requests.get(URL, headers=headers, timeout=10)
    r.raise_for_status()
    html = r.text
    
    # Count Canonical
    # grep -o '<link rel="canonical"[^>]*>' | wc -l
    canonical_matches = re.findall(r'<link\s+rel="canonical"[^>]*>', html, re.IGNORECASE)
    print(f"Canonical Count: {len(canonical_matches)}")
    for m in canonical_matches:
        print(f"  Found: {m}")

    # Count Hreflang
    # grep -o 'hreflang=' | wc -l
    hreflang_matches = re.findall(r'hreflang=', html, re.IGNORECASE)
    print(f"Hreflang Attr Count: {len(hreflang_matches)}")
    
    # Check for duplicates outside SEO block (manual check simulation)
    if "<!-- SEO:BEGIN -->" in html:
        print("SEO Block: PRESENT")
    else:
        print("SEO Block: MISSING")

except Exception as e:
    print(f"Error: {e}")
