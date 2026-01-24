import json
import re

FILES = [
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\index.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\contact.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\a-propos.html",
    r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\services\securite-cynophile.html"
]

def validate_json_ld(file_path):
    print(f"Validating {file_path}...")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Regex to find JSON-LD blocks
        matches = re.findall(r'<script type="application/ld\+json">(.*?)</script>', content, re.DOTALL)
        
        if not matches:
            print("  ❌ No JSON-LD found.")
            return False

        all_valid = True
        for i, json_str in enumerate(matches):
            try:
                data = json.loads(json_str) 
                print(f"  ✅ Block {i+1}: Valid JSON")
                # Basic schema check
                if "@type" in data:
                     print(f"     Type: {data['@type']}")
                elif isinstance(data, list) and "@type" in data[0]:
                     print(f"     Type: {data[0]['@type']}")

            except json.JSONDecodeError as e:
                print(f"  ❌ Block {i+1}: Invalid JSON found -> {e}")
                all_valid = False
            except Exception as e:
                print(f"  ❌ Block {i+1}: Error -> {e}")
                all_valid = False
        
        return all_valid

    except Exception as e:
        print(f"File error: {e}")
        return False

def main():
    print("--- STARTING JSON-LD VALIDATION ---")
    all_passed = True
    for f in FILES:
        if not validate_json_ld(f):
            all_passed = False
    
    if all_passed:
        print("\n✨ ALL FILES VALIDATED SUCCESSFULLY.")
    else:
        print("\n⚠️ SOME FILES HAVE ERRORS.")

if __name__ == "__main__":
    main()
