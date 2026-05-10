import re

with open('Aicodingchatbot .HTML', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# First occurrence in HTML body
grid_match1 = re.search(r'<div class="suggestion-grid">[\s\S]*?</div>\s*</div>', content)
if grid_match1:
    content = content.replace(grid_match1.group(), '')

# Second occurrence in JS string (newChat)
grid_match2 = re.search(r'<div class="suggestion-grid">[\s\S]*?</div>\s*</div>', content)
if grid_match2:
    content = content.replace(grid_match2.group(), '')

with open('Aicodingchatbot .HTML', 'w', encoding='utf-8') as f:
    f.write(content)

print("Removed suggestion grids")
