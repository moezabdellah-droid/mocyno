"""Validate sitemap pages, canonical targets, internal links/anchors and language pairs.

Read-only: run this after content generation and before deploying Hosting.
"""
from pathlib import Path
from urllib.parse import urlparse, urljoin
import xml.etree.ElementTree as ET
import json
import sys
from bs4 import BeautifulSoup

PUBLIC = Path(__file__).resolve().parents[1] / 'public'
ORIGIN = 'https://mocyno.com'
errors = []
cache = {}

def resolve(url):
    path = urlparse(url).path
    if path == '/':
        path = '/fr/'
    if path == '/sitemap.xml':
        path = '/sitemap-index.xml'
    for candidate in (path.rstrip('/') + '/index.html', path.rstrip('/') + '.html', path):
        file = PUBLIC / candidate.lstrip('/')
        if file.is_file():
            return file
    return None

def soup(file):
    if file not in cache:
        cache[file] = BeautifulSoup(file.read_bytes(), 'html.parser')
    return cache[file]

def main():
    urls = []
    for name in ('sitemap-fr.xml', 'sitemap-en.xml'):
        urls.extend(node.text for node in ET.fromstring((PUBLIC / name).read_bytes()).iter()
                    if node.tag.endswith('}loc'))
    pages = {}
    links = 0
    for url in urls:
        file = resolve(url)
        if not file:
            errors.append(('missing sitemap page', url))
            continue
        page = pages[url] = soup(file)
        canonical = page.select('link[rel=canonical]')
        if [tag.get('href') for tag in canonical] != [url]:
            errors.append(('canonical differs from sitemap URL', url))
        for script in page.select('script[type="application/ld+json"]'):
            try:
                json.loads(script.get_text())
            except ValueError:
                errors.append(('invalid structured JSON', url))
        for tag in page.select('a[href]'):
            target = urljoin(url, tag['href'])
            parsed = urlparse(target)
            if parsed.netloc != 'mocyno.com':
                continue
            links += 1
            destination = resolve(target)
            if not destination:
                errors.append(('missing internal destination', url, target))
            elif parsed.fragment:
                page_target = soup(destination)
                if not page_target.find(id=parsed.fragment) and not page_target.find('a', attrs={'name': parsed.fragment}):
                    errors.append(('missing internal anchor', url, target))
    for url, page in pages.items():
        for alternate in page.select('link[hreflang]'):
            target = alternate.get('href')
            if alternate.get('hreflang') in ('fr', 'en') and target in pages:
                if url not in [tag.get('href') for tag in pages[target].select('link[hreflang]')]:
                    errors.append(('non-reciprocal language pair', url, target))
    print(json.dumps({'pages': len(pages), 'internal_links': links, 'errors': errors}, ensure_ascii=False, indent=2))
    return 1 if errors else 0

if __name__ == '__main__':
    sys.exit(main())
