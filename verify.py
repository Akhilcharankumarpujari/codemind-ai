import re

with open('Aicodingchatbot .HTML', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Check if the actual function definition exists
has_fn = bool(re.search(r'function toggleMobileSidebar\s*\(', content))
print(f"Function definition exists: {has_fn}")

# Count how many times the word appears
count = content.count('toggleMobileSidebar')
print(f"Total occurrences: {count}")
