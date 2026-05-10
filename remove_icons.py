import re

with open('Aicodingchatbot .HTML', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Remove the folder / chart icon
content = content.replace('&#128450; ', '')
content = content.replace('&#128450;', '')

# Remove the lightning bolt emoji
content = content.replace('⚡ ', '')
content = content.replace('⚡', '')

with open('Aicodingchatbot .HTML', 'w', encoding='utf-8') as f:
    f.write(content)

print("Icons removed.")
