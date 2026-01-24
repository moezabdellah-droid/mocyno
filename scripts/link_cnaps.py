import os

# Configuration
ROOT_DIR = r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public"
TARGET_URL = "https://teleservices-cnaps.interieur.gouv.fr/teleservices/ihm/#/morale/search"
LINK_HTML = f'<a href="{TARGET_URL}" target="_blank" rel="noopener noreferrer" style="color:#fff;text-decoration:underline;">AUT-83-2124-09-09-20250998415</a>'

# Strings to find
FR_SEARCH = "Autorisation CNAPS : AUT-83-2124-09-09-20250998415"
FR_REPLACE = f"Autorisation CNAPS : {LINK_HTML}"

EN_SEARCH = "CNAPS licence: AUT-83-2124-09-09-20250998415"
EN_REPLACE = f"CNAPS licence: {LINK_HTML}"

# Counter
updated_files = 0

def process_file(file_path):
    global updated_files
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        new_content = content
        
        # Check if already linked checks (simple check)
        if LINK_HTML in content:
            # print(f"Skipping {file_path} (already linked)")
            return

        changed = False
        if FR_SEARCH in new_content:
            new_content = new_content.replace(FR_SEARCH, FR_REPLACE)
            changed = True
        
        if EN_SEARCH in new_content:
            new_content = new_content.replace(EN_SEARCH, EN_REPLACE)
            changed = True

        if changed:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Updated: {file_path}")
            updated_files += 1
            
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

def main():
    print("Starting CNAPS link update...")
    for root, dirs, files in os.walk(ROOT_DIR):
        for file in files:
            if file.endswith(".html"):
                process_file(os.path.join(root, file))
    
    print(f"Done. Updated {updated_files} files.")

if __name__ == "__main__":
    main()
