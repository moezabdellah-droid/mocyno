import os
import re

FR_ZONES_DIR = r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public\fr\zones"

def enhance_zones():
    if not os.path.exists(FR_ZONES_DIR):
        print("Zones directory not found.")
        return

    print("--- Enhancing Zones ---")
    for file in os.listdir(FR_ZONES_DIR):
        if not file.endswith(".html"):
            continue

        # Extract City Name from filename (e.g. saint-tropez.html -> Saint-Tropez)
        city_slug = file.replace(".html", "")
        city_name = city_slug.replace("-", " ").title()
        
        # Special cases correction
        if "Saint" in city_name:
            city_name = city_name.replace("Saint ", "Saint-") 
        
        print(f"Updating {file} for {city_name}...")
        
        file_path = os.path.join(FR_ZONES_DIR, file)
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Update Title
        # Regex to find <title>...</title>
        new_title = f"<title>Sécurité privée {city_name} – MO’CYNO</title>"
        content = re.sub(r'<title>.*?</title>', new_title, content, flags=re.DOTALL)
        
        # Update H1
        # Regex to find <h1>...</h1>
        new_h1 = f"<h1>Sécurité privée & Gardiennage {city_name}</h1>"
        content = re.sub(r'<h1>.*?</h1>', new_h1, content, flags=re.DOTALL)
        
        # Save
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

if __name__ == "__main__":
    enhance_zones()
