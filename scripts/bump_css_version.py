
import os
import re

PUBLIC_DIR = os.path.join(os.getcwd(), 'public')

def bump_css_version():
    print("Bumping CSS version to 2.7...")
    count = 0
    for root, _, files in os.walk(PUBLIC_DIR):
        for file in files:
            if file.endswith('.html'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Replace v=2.6 (or any v=2.x) with v=2.7
                new_content = re.sub(r'styles\.css\?v=2\.\d+', 'styles.css?v=2.7', content)
                
                # Also handle compat patch if present
                new_content = re.sub(r'styles-compat-patch\.css\?v=hero-fix-1', 'styles-compat-patch.css?v=2.7', new_content)

                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    count += 1
    
    print(f"Updated CSS version in {count} files.")

if __name__ == "__main__":
    bump_css_version()
