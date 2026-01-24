import json

with open('firebase.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

redirects = data.get('hosting', {}).get('redirects', [])
print(f"Total redirects: {len(redirects)}")

sources = {}
duplicates = []

for r in redirects:
    src = r['source']
    if src in sources:
        if sources[src] == r:
             duplicates.append(r)
        else:
             print(f"CONFLICT: {src} -> {sources[src]['destination']} VS {r['destination']}")
    else:
        sources[src] = r

print(f"Exact duplicates found: {len(duplicates)}")
# for d in duplicates:
#    print(d)
