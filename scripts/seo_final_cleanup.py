
import os
import re

PUBLIC_DIR = os.path.join(os.getcwd(), 'public')

LEGAL_PAGES = [
    'mentions-legales.html',
    'politique-confidentialite.html',
    'cookies.html',
    'legal.html',
    'privacy.html',
    'cookies.html' # repeated but ok
]

def clean_and_align_seo():
    print("Starting Final SEO Cleanup & Alignment...")
    files_processed = 0
    
    for root, _, files in os.walk(PUBLIC_DIR):
        for file in files:
            if not file.endswith('.html'):
                continue
                
            path = os.path.join(root, file)
            files_processed += 1
            
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # 1. Extract SEO Block
            seo_block_match = re.search(r'(<!-- SEO:BEGIN -->.*?<!-- SEO:END -->)', content, re.DOTALL)
            seo_block = ""
            canonical_url = ""
            
            if seo_block_match:
                seo_block = seo_block_match.group(1)
                # Find canonical URL inside the block
                can_match = re.search(r'<link rel="canonical" href="([^"]+)">', seo_block)
                if can_match:
                    canonical_url = can_match.group(1)
                
                # Remove the block from content temporarily
                content = content.replace(seo_block, '')
            else:
                print(f"WARNING: No SEO Block in {file}")
                # We can't align if we don't know the canonical, skipping major alignment but can still clean duplicates if needed
                # But safer to skip to avoid damaging file
                continue

            # 2. Cleanup Duplicates OUTSIDE the block
            # Regex to remove <link rel="canonical" ...>, <link rel="alternate" hreflang... >
            
            # Remove Canonical
            content = re.sub(r'<link\s+rel=["\']canonical["\']\s+href=["\'][^"\']+["\']\s*/?>', '', content, flags=re.IGNORECASE)
            
            # Remove Hreflangs (all variations)
            content = re.sub(r'<link\s+rel=["\']alternate["\']\s+hreflang=["\'][^"\']+["\']\s+href=["\'][^"\']+["\']\s*/?>', '', content, flags=re.IGNORECASE)
            content = re.sub(r'<link\s+rel=["\']alternate["\']\s+href=["\'][^"\']+["\']\s+hreflang=["\'][^"\']+["\']\s*/?>', '', content, flags=re.IGNORECASE)
            content = re.sub(r'<link\s+rel=["\']alternate["\']\s+hreflang=["\']x-default["\']\s+href=["\'][^"\']+["\']\s*/?>', '', content, flags=re.IGNORECASE)
            
            # 3. Re-inject SEO Block
            # We put it back right after <head> or before <meta charset (if inside head)
            # Simplest: Put it after <head>
            if '<head>' in content:
                content = content.replace('<head>', f'<head>\n{seo_block}')
            else:
                # If no head tag (weird), maybe prepend? ignore for now as all have head
                pass

            # 4. Align OG:url and JSON-LD url
            if canonical_url:
                # OG:URL
                # Find existing og:url and replace content
                # <meta property="og:url" content="...">
                content = re.sub(r'(<meta property="og:url" content=")[^"]+(">)', f'\g<1>{canonical_url}\g<2>', content)
                
                # JSON-LD URL
                # Look for "url": "..." inside application/ld+json context?
                # A simple global replace of "url": "..." might be risky if there are multiple URLs (like author url)
                # But typically main LocalBusiness url is the one. 
                # Let's target "url": "https://mocyno.com..." specifically if possible to be safe, 
                # OR specifically match the one in LocalBusiness schema if we can find it.
                # Given strict constraints, let's try a safe regex that looks for "url": "http..."
                content = re.sub(r'("url":\s*")https?://[^"]+(")', f'\g<1>{canonical_url}\g<2>', content)

            # 5. Legal Pages NoIndex
            if file in LEGAL_PAGES:
                # Check if robots noindex exists
                if 'content="noindex' not in content:
                    # Replace existing robots tag if any
                    if '<meta name="robots"' in content:
                         content = re.sub(r'<meta name="robots" content="[^"]+">', '<meta name="robots" content="noindex, follow">', content)
                    else:
                        # Append to head (or rather, appending to our SEO block is cleaner? No, SEO block is for links)
                        # Append after SEO block
                        content = content.replace('<!-- SEO:END -->', '<!-- SEO:END -->\n<meta name="robots" content="noindex, follow">')

            if content != original_content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                # print(f"Cleaned & Aligned {file}")
            
    print(f"Processed {files_processed} files.")

if __name__ == "__main__":
    clean_and_align_seo()
