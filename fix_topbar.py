import re

with open('Aicodingchatbot .HTML', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Fix 1: Fix old topbar title branding
old_title = 'Tech &amp; Coding <span>Assistant</span>'
new_title = 'Code<span>Mind</span> AI'
content = content.replace(old_title, new_title)

# Also try HTML entity form
old_title2 = 'Tech & Coding <span>Assistant</span>'
content = content.replace(old_title2, new_title)

# Fix 2: The hamburger was inserted badly with regex, fix the chat-topbar structure
# Remove duplicate / broken hamburger injection and put it cleanly at the START of chat-topbar
# Remove any stray hamburger before the chat-title div
broken_pattern = r'<button class="hamburger-btn" onclick="toggleMobileSidebar\(\)">☰</button>\s*\n\s*(<div class="chat-title">)'
fix = r'<button class="hamburger-btn" onclick="toggleMobileSidebar()">☰</button>\n        \1'

# First, clean up all existing hamburger buttons in topbars (de-dup)
content = re.sub(r'(<div class="chat-topbar">)\s*\n\s*<button class="hamburger-btn"[^>]+>☰</button>\s*\n\s*', r'\1\n      <button class="hamburger-btn" onclick="toggleMobileSidebar()">☰</button>\n      ', content)

# Fix 3: Also fix flow area topbar if hamburger got duplicated
content = re.sub(r'(<div class="flow-header">)\s*\n?\s*<button class="hamburger-btn"[^>]+>☰</button>', r'\1\n      <button class="hamburger-btn" onclick="toggleMobileSidebar()">☰</button>', content)

with open('Aicodingchatbot .HTML', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed topbar branding and hamburger layout.")

# Verify
with open('Aicodingchatbot .HTML', 'r', encoding='utf-8', errors='ignore') as f:
    check = f.read()

print("CodeMind in title:", 'CodeMind' in check or 'Code<span>Mind</span>' in check)
print("Tech & Coding still present:", 'Tech &amp;' in check or 'Tech & Coding' in check)
