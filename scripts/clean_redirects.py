
import json
import sys
from collections import OrderedDict

def main():
    json_path = 'firebase.json'
    
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print("firebase.json not found")
        sys.exit(1)

    if 'hosting' not in data or 'redirects' not in data['hosting']:
        print("No redirects found in firebase.json")
        sys.exit(0)

    redirects = data['hosting']['redirects']
    
    # Store before state for mapping
    before_map = {r['source']: r for r in redirects}
    
    # 1. Deduplicate (Identical source, destination, and type)
    # Using a list comprehension to keep unique dicts (dicts are unhashable, so we use tuple representation)
    unique_redirects = []
    seen = set()
    for r in redirects:
        # Create a tuple of items sorted by key to ensure uniqueness check works
        r_tuple = tuple(sorted(r.items()))
        if r_tuple not in seen:
            seen.add(r_tuple)
            unique_redirects.append(r)
    
    # 2. Sort by source
    sorted_redirects = sorted(unique_redirects, key=lambda x: x['source'])
    
    # 3. Grouping (This is just internal ordering in the list, no visual grouping in JSON structure possible without comments which JSON disallows)
    # But we can sort them such that similar paths stay together.
    # The default alphanumeric sort on 'source' already does a good job of grouping:
    # /
    # /blog/...
    # /contact
    # /services/...
    # /zones/...
    # So explicit grouping logic is implicitly handled by sorting by source.
    
    data['hosting']['redirects'] = sorted_redirects
    
    # Write back
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    
    # Generate Proof Report
    print("SOURCE | DESTINATION | BEFORE | AFTER")
    for r in sorted_redirects:
        src = r['source']
        dest = r['destination']
        
        # Check if behavior changed
        before_r = before_map.get(src)
        
        # Before tuple
        before_str = f"{before_r['destination']} ({before_r['type']})" if before_r else "NONE"
        after_str = f"{dest} ({r['type']})"
        
        print(f"{src} | {dest} | {before_str} | {after_str}")
        
        if before_r and (before_r['destination'] != dest or before_r['type'] != r['type']):
            print(f"CRITICAL ERROR: Redirect logic changed for {src}!")
            sys.exit(1)

if __name__ == "__main__":
    main()
