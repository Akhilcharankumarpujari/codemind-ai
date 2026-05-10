import sys

with open('Aicodingchatbot .HTML', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find the "Tech &" area
index = content.find('Tech &')
if index != -1:
    sys.stdout.buffer.write(content[index-300:index+500].encode('utf-8'))
