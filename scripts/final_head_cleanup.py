
import os
import re
from pathlib import Path

ROOT = Path(os.getcwd()) / "public"
SEO_BEGIN = "<!-- SEO:BEGIN -->"
SEO_END = "<!-- SEO:END -->"

# Regex patterns
RE_TITLE = re.compile(r'<title>(.*?)</title>', re.IGNORECASE | re.DOTALL)
RE_DESC = re.compile(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']', re.IGNORECASE)
RE_CANONICAL = re.compile(r'<link\s+rel=["\']canonical["\']\s+href=["\'](.*?)["\']', re.IGNORECASE)

# Tags to strip (we'll rebuild them)
RE_STRIP_META = re.compile(r'<meta\s+(charset|name=["\']viewport["\']|name=["\']description["\']|property=["\']og:.*?["\']|name=["\']twitter:.*?["\']).*?>', re.IGNORECASE)
# Note: twitter tags usually go with OG, let's clean them too to be safe/clean? 
# User only specified OG but said "Final Head Cleanup". I'll stick to requests + standard robust ones.

def get_page_info(content, seo_block):
    title = ""
    desc = ""
    canonical = ""
    
    # Title
    m_title = RE_TITLE.search(content)
    if m_title:
        title = m_title.group(1).strip()
        
    # Description
    m_desc = RE_DESC.search(content)
    if m_desc:
        desc = m_desc.group(1).strip()
        
    # Canonical (from protected block preferably)
    m_canon = RE_CANONICAL.search(seo_block)
    if m_canon:
        canonical = m_canon.group(1).strip()
        
    return title, desc, canonical

def clean_head(content, seo_block):
    # 1. Extract Info
    title, desc, canonical = get_page_info(content, seo_block)
    
    # 2. Strip old tags (viewport, charset, desc, og, twitter)
    # We remove them from the whole content (except inside seo_block which is protected by caller logic)
    # But wait, caller logic needs to handle protection.
    
    # Easier: Remove from `pre` and `post` parts passed by caller.
    return title, desc, canonical

def process_file(p: Path):
    try:
        html = p.read_text(encoding="utf-8", errors="ignore")
    except:
        return False

    if SEO_BEGIN not in html or SEO_END not in html:
        return False # Should have it by now

    # Split to protect SEO block
    try:
        pre, rest = html.split(SEO_BEGIN, 1)
        block, post = rest.split(SEO_END, 1)
    except:
        return False
        
    seo_block_content = SEO_BEGIN + block + SEO_END
    
    # Get Info
    title, desc, canonical = get_page_info(html, seo_block_content)
    
    # Strip tags from PRE and POST
    # We also strip <title> because we will re-insert it cleanly at the top
    pre_clean = re.sub(r'<title>.*?</title>\s*', '', pre, flags=re.IGNORECASE|re.DOTALL)
    pre_clean = RE_STRIP_META.sub('', pre_clean)
    
    post_clean = re.sub(r'<title>.*?</title>\s*', '', post, flags=re.IGNORECASE|re.DOTALL)
    post_clean = RE_STRIP_META.sub('', post_clean)
    
    # Build New Head Block
    # Standard: Charset, Viewport, Title, Desc, OG
    new_head_tags = []
    
    # We want to insert this RIGHT AFTER <head> or at top of head
    # But we stripped everything.
    # Where to insert? 
    # Logic: `pre_clean` likely contains <head>. We should append to it?
    # Or replace <head> with <head>\n... tags...
    
    head_content = []
    head_content.append(f'<meta charset="utf-8">')
    head_content.append(f'<meta name="viewport" content="width=device-width, initial-scale=1">')
    if title:
        head_content.append(f'<title>{title}</title>')
    if desc:
        head_content.append(f'<meta name="description" content="{desc}">')
    
    # OG Tags
    head_content.append(f'<meta property="og:type" content="website">')
    if title:
        head_content.append(f'<meta property="og:title" content="{title}">')
    if desc:
        head_content.append(f'<meta property="og:description" content="{desc}">')
    if canonical:
        head_content.append(f'<meta property="og:url" content="{canonical}">')
    
    # Image (Standardize)
    head_content.append(f'<meta property="og:image" content="https://mocyno.com/og-image.png">') # Default as requested or use one found? User said "ex: ... (ou votre meilleure image)"
    # Let's stick to a safe default or checking if one existed. 
    # To be safe and uniform:
    
    head_str = '\n  '.join(head_content)
    
    # FIX INTERNAL LINKS (in pre and post)
    # .html" -> /"
    # Regex: href="...html" -> href=".../"
    # Pattern: href="(/fr/.*?|/en/.*?)\.html" -> href="\1/"
    def link_repl(m):
        return f'href="{m.group(1)}/"'
        
    pre_clean = re.sub(r'href="(/fr/.*?|/en/.*?)\.html"', link_repl, pre_clean)
    post_clean = re.sub(r'href="(/fr/.*?|/en/.*?)\.html"', link_repl, post_clean)
    
    # FIX JSON-LD BREADCRUMBS
    # "item":"...html" -> "item":".../"
    pre_clean = re.sub(r'"item":"(.*?)\.html"', r'"item":"\1/"', pre_clean)
    post_clean = re.sub(r'"item":"(.*?)\.html"', r'"item":"\1/"', post_clean)
    
    # Reassemble:
    # We need to insert `head_str` at the top of <head>
    # Find <head> in pre_clean
    if '<head>' in pre_clean:
         pre_final = pre_clean.replace('<head>', f'<head>\n  {head_str}\n')
    elif '<head>' in post_clean:
        # Weird but possible if SEO block is before head? Unlikely.
         post_clean = post_clean.replace('<head>', f'<head>\n  {head_str}\n')
         pre_final = pre_clean
    else:
        # Fallback, just prepend to pre_clean?
        pre_final = head_str + '\n' + pre_clean
        
    final_html = pre_final + seo_block_content + post_clean
    
    # Extra cleanup of double lines
    final_html = re.sub(r'\n\s*\n', '\n', final_html)
    
    if final_html != html:
        p.write_text(final_html, encoding="utf-8")
        return True
    return False

def main():
    print("Starting Final Head Cleanup...")
    count = 0
    for f in ROOT.rglob("*.html"):
        if process_file(f):
            count += 1
    print(f"Processed and cleaned {count} files.")

if __name__ == "__main__":
    main()
