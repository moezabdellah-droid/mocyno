
import os

SITEMAP_PATH = os.path.join(os.getcwd(), 'public', 'sitemap.xml')

TARGETS = [
    "https://mocyno.com/en/legal/",
    "https://mocyno.com/en/privacy/"
]

def clean_sitemap():
    if not os.path.exists(SITEMAP_PATH):
        print("Sitemap not found!")
        return

    with open(SITEMAP_PATH, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    buffer = []
    inside_url = False
    skip_buffer = False

    for line in lines:
        stripped = line.strip()
        
        if stripped.startswith('<url>'):
            inside_url = True
            buffer = [line]
            skip_buffer = False
        elif stripped.startswith('</url>'):
            inside_url = False
            buffer.append(line)
            
            # Check if we should skip this block
            if not skip_buffer:
                new_lines.extend(buffer)
            else:
                print("Removed URL block.")
            
            buffer = []
        elif inside_url:
            buffer.append(line)
            # Check if this line matches target loc
            for t in TARGETS:
                if f"<loc>{t}</loc>" in stripped:
                    print(f"Found target to remove: {t}")
                    skip_buffer = True
        else:
            # Outside url block (headers, footers)
            new_lines.append(line)

    with open(SITEMAP_PATH, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
        
    print("Sitemap cleanup complete.")

if __name__ == "__main__":
    clean_sitemap()
