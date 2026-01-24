import os
import re
import json
from datetime import datetime
from html.parser import HTMLParser

ROOT_DIR = r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\public"
OUTPUT_FILE = r"c:\Users\abdel\Desktop\Mocyno3\mocyno2\scripts\audit_results.json"

class SEOParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = None
        self.h1 = None
        self.meta_desc = None
        self.canonical = None
        self.hreflangs = []
        self.text_content = []
        self.in_title = False
        self.in_h1 = False
        self.in_body = False
        self.in_script_style = False

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        if tag == 'title':
            self.in_title = True
        elif tag == 'h1':
            self.in_h1 = True
        elif tag == 'meta':
            if attr_dict.get('name') == 'description':
                self.meta_desc = attr_dict.get('content')
        elif tag == 'link':
            if attr_dict.get('rel') == 'canonical':
                self.canonical = attr_dict.get('href')
            elif attr_dict.get('rel') == 'alternate' and 'hreflang' in attr_dict:
                self.hreflangs.append({
                    'lang': attr_dict.get('hreflang'),
                    'href': attr_dict.get('href')
                })
        elif tag == 'body':
            self.in_body = True
        elif tag in ['script', 'style']:
            self.in_script_style = True

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        elif tag == 'h1':
            self.in_h1 = False
        elif tag == 'body':
            self.in_body = False
        elif tag in ['script', 'style']:
            self.in_script_style = False

    def handle_data(self, data):
        if self.in_title:
            self.title = data
        if self.in_h1:
            self.h1 = data
        if self.in_body and not self.in_script_style:
            self.text_content.append(data)

def count_words(text_list):
    full_text = " ".join(text_list)
    # Simple whitespace split
    words = full_text.split()
    return len(words)

def get_clean_url(rel_path):
    # Convert file path to clean URL
    url = rel_path.replace("\\", "/")
    if url.endswith("index.html"):
        url = url[:-10] # remove index.html
    elif url.endswith(".html"):
        url = url[:-5] + "/" # remove .html and add slash
    
    if not url.startswith("/"):
        url = "/" + url
        
    return f"https://mocyno.com{url}"

def audit_site():
    results = []
    
    print("Starting SEO Audit...")
    
    for root, dirs, files in os.walk(ROOT_DIR):
        for file in files:
            if not file.endswith(".html"):
                continue
                
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, ROOT_DIR)
            
            # Skip google verification files or other technical htmls
            if file.startswith("google"):
                continue

            parser = SEOParser()
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    parser.feed(content)
            except Exception as e:
                print(f"Error parsing {file}: {e}")
                continue

            word_count = count_words(parser.text_content)
            clean_url = get_clean_url(rel_path)
            last_mod = datetime.fromtimestamp(os.path.getmtime(file_path)).strftime('%Y-%m-%d')

            results.append({
                "file_path": file_path,
                "rel_path": rel_path,
                "url": clean_url,
                "title": parser.title,
                "h1": parser.h1,
                "description": parser.meta_desc,
                "canonical": parser.canonical,
                "hreflangs": parser.hreflangs,
                "word_count": word_count,
                "last_mod": last_mod
            })

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
        
    print(f"Audit complete. Results saved to {OUTPUT_FILE}")
    print(f"Scanned {len(results)} pages.")

if __name__ == "__main__":
    audit_site()
