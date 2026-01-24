
import os
import re
import hashlib
import sys

def get_body_content(html):
    """
    Extracts the body content. 
    To be strict about 'no editorial content change', we will check the raw body text content (stripping tags) 
    before and after, to ensure that no visible text has changed.
    However, the user asked for MD5 of <body>, which usually implies the whole string.
    But since we might modify attributes inside <body> (if we modify invalid placement), 
    we should be careful. 
    The implementation plan says: "Generate MD5 hash of <body> content (excluding stripped tags)".
    Wait, "excluding stripped tags" is confusing. It usually means "strip tags, then hash text".
    Let's stick to: Stripping all HTML tags and hashing the remaining text.
    """
    # Simple regex to find body start and end
    # We will use the BODY CONTENT for the check.
    match = re.search(r'<body[^>]*>(.*?)</body>', html, re.DOTALL | re.IGNORECASE)
    if not match:
        return ""
    body_inner = match.group(1)
    
    # Strip tags to get text content for "editorial integrity" check
    text_content = re.sub(r'<[^>]+>', '', body_inner)
    # Normalize whitespace to avoid issues with formatting changes if any (though we shouldn't have any)
    text_content = re.sub(r'\s+', ' ', text_content).strip()
    return text_content.encode('utf-8')

def calculate_md5(content):
    return hashlib.md5(content).hexdigest()

def normalize_hreflang(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        original_content = f.read()

    body_md5_before = calculate_md5(get_body_content(original_content))
    
    new_content = original_content
    
    # Replacement map
    # We use regex to be precise about 'hreflang="fr"' and avoid matching 'hreflang="fresh"' etc.
    # Case insensitive for attribute name, sensitive for value? Usually lowercase.
    
    # Replace hreflang="fr" -> hreflang="fr-FR"
    new_content = re.sub(r'hreflang=["\']fr["\']', 'hreflang="fr-FR"', new_content)
    
    # Replace hreflang="en" -> hreflang="en-GB"
    new_content = re.sub(r'hreflang=["\']en["\']', 'hreflang="en-GB"', new_content)
    
    # NOTE: x-default MUST point to FR equivalent.
    # The existing code typically has: <link href=".../fr/..." hreflang="x-default" ... />
    # We don't change the href, we just verify it exists? 
    # The requirement says: "x-default -> MUST point to FR equivalent"
    # This implies we might need to check the href. 
    # But strictly, "Do NOT change existing source/destination". 
    # If the current x-default is wrong, fixing it might be a 'change'.
    # However, "Normalize... x-default: must point to the FR equivalent URL" suggests we SHOULD fix it if broken.
    # But "Do NOT change any URLs" contradicts that.
    # Given "ZERO SURPRISE", I will ASSUME the URLs are correct (Phase 2B validated links) and ONLY touch hreflang values.
    # Only hreflang="fr" and hreflang="en" are explicitly targeted for replacement.
    
    body_md5_after = calculate_md5(get_body_content(new_content))
    
    status = "UNCHANGED"
    if original_content != new_content:
        status = "MODIFIED"
        
        # Verify Body Integrity
        if body_md5_before != body_md5_after:
            print(f"CRITICAL: Body content changed for {file_path}")
            print(f"Before: {body_md5_before}")
            print(f"After:  {body_md5_after}")
            # Identify what changed?
            # Reverting because Strict Zero Surprise
            return None, body_md5_before, body_md5_after, "FAILED_BODY_MISMATCH"

    return new_content, body_md5_before, body_md5_after, status

def main():
    public_dir = os.path.join(os.getcwd(), 'public')
    report = []
    
    for root, dirs, files in os.walk(public_dir):
        for file in files:
            if file.endswith('.html'):
                file_path = os.path.join(root, file)
                try:
                    new_content, md5_before, md5_after, status = normalize_hreflang(file_path)
                    
                    rel_path = os.path.relpath(file_path, os.getcwd())
                    report.append(f"{rel_path} | {md5_before} | {md5_after} | {status}")
                    
                    if status == "MODIFIED":
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                            
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")

    # Output report
    print("\n".join(report))

if __name__ == "__main__":
    main()
