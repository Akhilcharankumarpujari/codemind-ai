import re

with open('Aicodingchatbot .HTML', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

emojis_to_remove = ['🐍', '☕', '⚙️', '🟨']

for emoji in emojis_to_remove:
    # Remove emoji with following space
    content = content.replace(f'{emoji} ', '')
    # Remove emoji without following space
    content = content.replace(emoji, '')

with open('Aicodingchatbot .HTML', 'w', encoding='utf-8') as f:
    f.write(content)

print("Emojis removed.")
