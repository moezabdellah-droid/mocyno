
import urllib.request
import re

URL = "https://mocyno.com/en/zones/saint-tropez/"

try:
    print(f"Fetching {URL}...")
    req = urllib.request.Request(URL)
    # Add headers to mime a browser or avoid cache
    req.add_header('User-Agent', 'Mozilla/5.0 (compatible; SEO-Auditor/1.0)')
    req.add_header('Cache-Control', 'no-cache')
    
    with urllib.request.urlopen(req, timeout=10) as response:
        html = response.read().decode('utf-8', errors='ignore')
    
    # Count Canonical
    canonical_matches = re.findall(r'<link\s+rel=["\']canonical["\'][^>]*>', html, re.IGNORECASE)
    print(f"Canonical Count: {len(canonical_matches)}")
    for m in canonical_matches:
        print(f"  Found: {m.strip()}")

    # Count Hreflang
    hreflang_matches = re.findall(r'hreflang=["\'][^"\']+["\']', html, re.IGNORECASE)
    print(f"Hreflang Attr Count: {len(hreflang_matches)}")
    
    # Check for duplicates outside SEO block
    if "<!-- SEO:BEGIN -->" in html:
        print("SEO Block: PRESENT")
    else:
        print("SEO Block: MISSING")

except Exception as e:
    print(f"Error: {e}")
