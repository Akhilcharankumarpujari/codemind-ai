import re

with open('Aicodingchatbot .HTML', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Replace sidebar logo icon
content = re.sub(
    r'<div class="logo-icon">\s*⚡\s*</div>',
    '<div class="logo-icon" style="background: none; padding: 0;"><img src="/logo.png" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;" alt="Logo"></div>',
    content
)

# Replace welcome logo icon
content = re.sub(
    r'<div class="welcome-icon">\s*⚡\s*</div>',
    '<div class="welcome-icon" style="background: none; border: none; padding: 0;"><img src="/logo.png" style="width: 100%; height: 100%; object-fit: contain; border-radius: 18px;" alt="Logo"></div>',
    content
)

with open('Aicodingchatbot .HTML', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated logo in HTML.")
