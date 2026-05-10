import re

with open('Aicodingchatbot .HTML', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Replace the text
content = content.replace('llama-3.3-70b &middot; AI', 'CodeMind AI')

with open('Aicodingchatbot .HTML', 'w', encoding='utf-8') as f:
    f.write(content)

print("Text replaced.")
