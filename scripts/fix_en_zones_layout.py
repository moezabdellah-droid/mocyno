
import os
import re

EN_ZONES_DIR = os.path.join(os.getcwd(), 'public', 'en', 'zones')

def fix_en_zones_css_conflict():
    print("Fixing CSS conflict in EN Zone pages...")
    fixed_count = 0
    
    for root, _, files in os.walk(EN_ZONES_DIR):
        for file in files:
            if file.endswith('.html'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original_content = content
                
                # 1. Replace the class in the BODY content (specifically the one inside the bg-dark section)
                # Look for <ul class="zones-list"> inside the zones section.
                # However, a global replace of <ul class="zones-list"> might affect the header if not careful,
                # although the header usually has indentation or context.
                
                # The header one looks like:
                # <div class="zones-menu">
                #   <ul class="zones-list">
                
                # The body one looks like:
                # <div class="container"> (or similar)
                #   ...
                #   <ul class="zones-list">
                
                # Safer approach:
                # Replace the CSS definition first.
                # The CSS is in a <style> block at the end.
                # .zones-list { ... } -> .zones-grid-list { ... }
                
                # But wait, if I change the CSS definition to .zones-grid-list,
                # the Header's .zones-list will revert to global styles (WHICH IS WHAT WE WANT).
                # But the Body's list will lose styles unless I update its HTML class too.
                
                # Let's target the exact CSS block string for replacement to be safe.
                # The problematic CSS block usually has grid-template-columns.
                
                # Regex for CSS:
                # .zones-list { ... grid-template-columns ... } 
                # This might be multi-line.
                
                # Let's purely replace the text:
                # ".zones-list {" -> ".zones-grid-list {"
                # BUT ONLY inside the <style> block or check if it has grid properties.
                
                # Actually, simply checking if the file contains the inline style and renaming it is safer.
                
                # Pattern 1: Update CSS definition
                # We want to change ".zones-list" to ".zones-grid-list" specifically in the footer style block.
                # We can assume the "Header" .zones-list style is NOT in this file (it's in styles.css).
                # So ANY definition of `.zones-list {` inside the HTML file is almost certainly the conflicting one.
                
                content = content.replace('.zones-list {', '.zones-grid-list {')
                content = content.replace('.zones-list li {', '.zones-grid-list li {')
                
                # Pattern 2: Update HTML usage in the Body
                # The Header usage is: <ul class="zones-list">
                # The Body usage is: <ul class="zones-list">
                # This is tricky because the string is identical.
                
                # However, the Header is always near the top. The Body usage is further down.
                # The header usage is INSIDE <div class="zones-menu">.
                # The body usage is typically NOT inside zones-menu.
                
                # Let's do a Context-Aware replacement.
                # We will search for the specific structure of the body section.
                # It contains "Intervention" or "Zones d'Intervention" or "Service Areas"
                # And is usually inside <section class="section bg-dark text-white">
                
                # Regex: <section class="section bg-dark text-white">.*?<ul class="zones-list">
                # We want to replace that specific <ul class="zones-list"> with <ul class="zones-grid-list">
                
                def replace_body_ul(match):
                    return match.group(0).replace('class="zones-list"', 'class="zones-grid-list"')
                
                # Pattern: Match from "bg-dark" start tag until "zones-list" occurs
                # This might be too greedy if not careful.
                
                # Alternative: The header text in EN is "Service Areas: Saint-Tropez Peninsula" or similar.
                # "Intervention throughout the Nice Metropolis"
                
                # Let's iterate all <ul class="zones-list"> occurrences.
                # The FIRST one is the Header (usually).
                # The SECOND one (if exists) is the Body.
                
                # Let's check `nice.html` positions.
                # Header: line 143
                # Body: line 245
                
                # Using re.sub with a counter/index check is robust.
                
                start = 0
                new_content_parts = []
                last_pos = 0
                
                matches = list(re.finditer(r'<ul class="zones-list">', content))
                
                if len(matches) >= 2:
                    # We have at least 2 occurrences.
                    # The first one is likely header. The others are likely body.
                    # Let's inspect context to be sure.
                    
                    for i, match in enumerate(matches):
                        # Append text before this match
                        new_content_parts.append(content[last_pos:match.start()])
                        
                        # Check context: Is it inside .zones-menu?
                        # Scanning backwards from match.start() a bit is crude.
                        
                        # If index > 0, it's virtually guaranteed to be the body list in these templates.
                        # The header is always the first definition.
                        
                        if i > 0:
                            # Replace
                            new_content_parts.append('<ul class="zones-grid-list">')
                        else:
                            # Keep original (Header)
                            new_content_parts.append('<ul class="zones-list">')
                            
                        last_pos = match.end()
                    
                    new_content_parts.append(content[last_pos:])
                    content = "".join(new_content_parts)
                    
                elif len(matches) == 1:
                    print(f"Warning: Only 1 zones-list found in {file}. Might be manual check needed.")
                    
                if content != original_content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    fixed_count += 1
                    print(f"Fixed {file}")
    
    print(f"Total files fixed: {fixed_count}")

if __name__ == "__main__":
    fix_en_zones_css_conflict()
