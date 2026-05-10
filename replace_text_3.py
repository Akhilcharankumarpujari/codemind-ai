import re

with open('Aicodingchatbot .HTML', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

content = content.replace("DSA<span>Mind</span>", "Code<span>Mind</span>")
content = content.replace("<title>DSAMind", "<title>CodeMind AI")

with open('Aicodingchatbot .HTML', 'w', encoding='utf-8') as f:
    f.write(content)

print("Changed DSAMind to CodeMind.")
