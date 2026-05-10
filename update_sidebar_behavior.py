import re

with open('Aicodingchatbot .HTML', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

close_sidebar_js = """
    // Close sidebar on mobile if open
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobileOverlay');
    if (window.innerWidth <= 600) {
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
    }
"""

# Insert into toggleFlowMode
if "if (window.innerWidth <= 600)" not in content.split("function toggleFlowMode()")[1][:300]:
    content = content.replace("function toggleFlowMode() {", "function toggleFlowMode() {" + close_sidebar_js)

# Insert into toggleComplexityMode
if "if (window.innerWidth <= 600)" not in content.split("function toggleComplexityMode()")[1][:300]:
    content = content.replace("function toggleComplexityMode() {", "function toggleComplexityMode() {" + close_sidebar_js)

# Insert into newChat
if "if (window.innerWidth <= 600)" not in content.split("function newChat()")[1][:300]:
    content = content.replace("function newChat() {", "function newChat() {" + close_sidebar_js)

# Update roadmap modes as well, wait roadmap modal doesn't need this, it overlays the whole screen anyway, but it's good practice.

with open('Aicodingchatbot .HTML', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated JS functions to close sidebar on mobile.")
