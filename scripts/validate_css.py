
import os

STYLES_PATH = os.path.join('public', 'styles.css')

def validate_css():
    if not os.path.exists(STYLES_PATH):
        print("styles.css not found!")
        return

    with open(STYLES_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    open_braces = content.count('{')
    close_braces = content.count('}')
    
    print(f"Open braces: {open_braces}")
    print(f"Close braces: {close_braces}")
    
    if open_braces != close_braces:
        print("ERROR: Brace mismatch! CSS might be broken.")
        # Find where it breaks? Hard without parser.
    else:
        print("Brace count matches. CSS syntax likely structure valid.")

if __name__ == "__main__":
    validate_css()
