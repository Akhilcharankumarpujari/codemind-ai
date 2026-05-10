import sys

with open('Aicodingchatbot .HTML', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Check the chat-topbar in HTML
idx = content.find('class="chat-topbar"')
sys.stdout.buffer.write(content[idx:idx+600].encode('utf-8'))
