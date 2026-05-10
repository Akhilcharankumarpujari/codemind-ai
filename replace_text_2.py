import re

with open('Aicodingchatbot .HTML', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

current_text = "I'm your AI-powered DSA and Coding Interview Assistant. Ask me anything about Data Structures, Algorithms, problem solving, debugging logic, dry runs, complexity analysis, or coding interview preparation."

new_text = "I'm your AI-powered Coding Assistant. Ask me about Data Structures, Algorithms, problem solving, dry runs, and coding interview preparation."

if current_text in content:
    content = content.replace(current_text, new_text)
    with open('Aicodingchatbot .HTML', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Text successfully updated.")
else:
    print("Current text not found in HTML.")
