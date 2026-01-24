
import os
import re

PUBLIC_DIR = os.path.join(os.getcwd(), 'public')
FR_DIR = os.path.join(PUBLIC_DIR, 'fr')
EN_DIR = os.path.join(PUBLIC_DIR, 'en')

OUTPUT_FILE = 'verification_report.txt'

def get_file_content(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def check_file(path, lang):
    content = get_file_content(path)
    issues = []
    
    # Extract header content
    header_match = re.search(r'<header.*?>(.*?)</header>', content, re.DOTALL)
    if header_match:
        header_content = header_match.group(1)
        
        # Check Lang Switch
        lang_switch = re.search(r'<a[^>]*class="[^"]*lang-switch[^"]*"[^>]*href="([^"]+)"', header_content)
        if lang_switch:
            href = lang_switch.group(1)
            if lang == 'fr' and not href.startswith('/en/'):
                issues.append(f"[Header] FR Lang Switch bad link: {href}")
            elif lang == 'en':
                # EN page should link to FR
                if not href.startswith('/fr/'):
                    issues.append(f"[Header] EN Lang Switch bad link: {href}")
        else:
            issues.append("[Header] Missing language switch")

        # Check Zones Trigger
        zones_trigger = re.search(r'<a[^>]*class="[^"]*zones-trigger[^"]*"[^>]*href="([^"]+)"', header_content)
        if zones_trigger:
            z_href = zones_trigger.group(1)
            if lang == 'en' and z_href == '/en/zones/':
                 issues.append(f"[Header] EN Zones Trigger points to non-existent index: {z_href}")
            elif lang == 'en' and z_href == '/#zones':
                 issues.append(f"[Header] EN Zones Trigger points to FR anchor: {z_href}")

    # Check Footer Links
    footer_match = re.search(r'<footer.*?>(.*?)</footer>', content, re.DOTALL)
    if footer_match:
        footer_content = footer_match.group(1)
        links = re.findall(r'<a[^>]+href="([^"]+)"', footer_content)
        for href in links:
            if href.startswith('http') or href.startswith('#') or href.startswith('mailto:') or href.startswith('tel:'):
                continue
            if lang == 'fr' and not href.startswith('/fr/') and not href == '/sitemap.xml':
                issues.append(f"[Footer] FR link to non-FR path: {href}")
            if lang == 'en' and not href.startswith('/en/') and not href == '/sitemap.xml':
                issues.append(f"[Footer] EN link to non-EN path: {href}")

    return issues

def main():
    files_checked = 0
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f_out:
        f_out.write("Linking Verification Report\n===========================\n\n")
        
        for root, _, files in os.walk(FR_DIR):
            for file in files:
                if file.endswith('.html'):
                    path = os.path.join(root, file)
                    rel_path = os.path.relpath(path, PUBLIC_DIR)
                    issues = check_file(path, 'fr')
                    if issues:
                        f_out.write(f"\n{rel_path}:\n")
                        for issue in issues:
                            f_out.write(f"  - {issue}\n")
                    files_checked += 1

        for root, _, files in os.walk(EN_DIR):
            for file in files:
                if file.endswith('.html'):
                    path = os.path.join(root, file)
                    rel_path = os.path.relpath(path, PUBLIC_DIR)
                    issues = check_file(path, 'en')
                    if issues:
                        f_out.write(f"\n{rel_path}:\n")
                        for issue in issues:
                            f_out.write(f"  - {issue}\n")
                    files_checked += 1
        
        f_out.write(f"\nChecked {files_checked} files.\n")
    print(f"Report generated: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
