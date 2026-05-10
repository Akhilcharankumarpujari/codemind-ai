import re

with open('Aicodingchatbot .HTML', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

old_text = "I'm your AI-powered tech assistant. Ask me anything about code, debugging, architecture, or concepts."
new_text = "I'm your AI-powered DSA Assistant. Ask me about Data Structures, Algorithms, problem solving, dry runs, and coding interview preparation."

if old_text in content:
    content = content.replace(old_text, new_text)
    with open('Aicodingchatbot .HTML', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Text replaced.")
else:
    print("Text not found exactly.")
