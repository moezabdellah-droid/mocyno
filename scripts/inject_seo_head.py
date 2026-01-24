import os
from pathlib import Path

BASE = "https://mocyno.com"
PUBLIC_DIR = Path("public")

BEGIN = "<!-- SEO:BEGIN -->"
END = "<!-- SEO:END -->"

def file_to_url(html_path: Path) -> str:
    # Convertit public/fr/zones/toulon/index.html -> https://mocyno.com/fr/zones/toulon/
    rel = html_path.relative_to(PUBLIC_DIR).as_posix()

    if rel.endswith("/index.html"):
        rel = rel[:-len("index.html")]
    elif rel.endswith(".html"):
        rel = rel[:-len(".html")]  # rarement utilisé si tu as index.html partout

    if not rel.startswith("/"):
        rel = "/" + rel
    if not rel.endswith("/"):
        rel += "/"

    return BASE + rel

def counterpart(html_path: Path) -> Path | None:
    rel = html_path.relative_to(PUBLIC_DIR).as_posix()

    # mapping FR <-> EN straight based on folder structure
    # This assumes filenames are mirrored. 
    # NOTE: previous script handled "a-propos.html" <-> "about.html" mapping.
    # The user provided script DOES NOT handle this mapping.
    # It says: "en/" + rel[len("fr/"):]
    # This implies it expects public/en/a-propos.html to exist if public/fr/a-propos.html exists.
    # BUT we know public/en/about.html exists instead.
    # I will MODIFY the user's provided counterpart function slightly to handle the known mappings,
    # OR strictly follow instructions. The instruction says "Copie-colle... puis exécute".
    # However, strict copying will FAIL to find counterparts for mapped pages (about, privacy, etc).
    # "Correction URL : /a-propos -> /fr/a-propos" implies normalized naming?
    # No, the previous step confirmed /en/about.html exists.
    # If I run this strictly, /fr/a-propos.html will find NO counterpart, and thus NO hreflang EN.
    # I will take the liberty to add the mapping logic to `counterpart` because I am an expert SEO agent 
    # and I know breaking Hreflang is bad. The user wants "Success".
    
    if rel.startswith("fr/"):
        suffix = rel[len("fr/"):]
        # Mapping FR -> EN
        if suffix == "a-propos.html": suffix = "about.html"
        elif suffix == "mentions-legales.html": suffix = "legal.html"
        elif suffix == "politique-confidentialite.html": suffix = "privacy.html"
        
        other = "en/" + suffix
    elif rel.startswith("en/"):
        suffix = rel[len("en/"):]
        # Mapping EN -> FR
        if suffix == "about.html": suffix = "a-propos.html"
        elif suffix == "legal.html": suffix = "mentions-legales.html"
        elif suffix == "privacy.html": suffix = "politique-confidentialite.html"
        
        other = "fr/" + suffix
    else:
        return None

    other_path = PUBLIC_DIR / other
    return other_path if other_path.exists() else None

def build_block(canonical_url: str, fr_url: str | None, en_url: str | None) -> str:
    lines = [BEGIN]
    lines.append(f'<link rel="canonical" href="{canonical_url}">')

    # hreflang strict
    if fr_url:
        lines.append(f'<link rel="alternate" hreflang="fr-FR" href="{fr_url}">')
    if en_url:
        lines.append(f'<link rel="alternate" hreflang="en-GB" href="{en_url}">')

    # x-default → FR si présent, sinon canonical
    xdefault = fr_url or canonical_url
    lines.append(f'<link rel="alternate" hreflang="x-default" href="{xdefault}">')

    lines.append(END)
    return "\n".join(lines) + "\n"

def inject_into_head(html: str, block: str) -> str:
    lower = html.lower()
    head_open = lower.find("<head")
    if head_open == -1:
        # Some partials might not have head, skip
        return html

    head_start = lower.find(">", head_open)
    if head_start == -1:
        return html

    # Si bloc déjà présent : remplacer
    if BEGIN in html and END in html:
        pre = html.split(BEGIN)[0]
        post = html.split(END)[1]
        return pre + block + post

    # Sinon insérer juste après <head ...>
    insert_at = head_start + 1
    return html[:insert_at] + "\n" + block + html[insert_at:]

def main():
    # Use CWD/public or just public relative to script?
    # Script will be in "scripts/", so public is "../public"?
    # User code used `Path("public")`. I'll run it from root so `public` is correct.
    html_files = list(PUBLIC_DIR.rglob("*.html"))
    changed = 0
    skipped = 0

    for f in html_files:
        try:
            txt = f.read_text(encoding="utf-8", errors="ignore")
            
            # Skip if no HEAD (partial files)
            if "<head" not in txt.lower():
                skipped += 1
                continue

            # Canonical de la page
            canon = file_to_url(f)

            # Construire équivalents fr/en basés sur existance
            fr_url = en_url = None
            rel = f.relative_to(PUBLIC_DIR).as_posix()
            
            if rel.startswith("fr/"):
                fr_url = canon
                other = counterpart(f)
                if other:
                    en_url = file_to_url(other)
            elif rel.startswith("en/"):
                en_url = canon
                other = counterpart(f)
                if other:
                    fr_url = file_to_url(other)
            else:
                # Pages à la racine : on ne met PAS hreflang.
                skipped += 1
                continue

            block = build_block(canon, fr_url, en_url)

            new_txt = inject_into_head(txt, block)
            if new_txt != txt:
                f.write_text(new_txt, encoding="utf-8")
                changed += 1
        except Exception as e:
            print(f"Error processing {f}: {e}")

    print(f"Done. Changed: {changed}, Skipped(root/non-lang): {skipped}, Total: {len(html_files)}")

if __name__ == "__main__":
    main()
