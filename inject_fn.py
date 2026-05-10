import re

with open('Aicodingchatbot .HTML', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

mobile_fn = """
  // ── Mobile Sidebar Toggle ──
  function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobileOverlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open');
  }
"""

# Find the last </script> before </body> and inject there
last_script_end = content.rfind("</script>")
if last_script_end != -1:
    content = content[:last_script_end] + mobile_fn + "\n</script>" + content[last_script_end+9:]

with open('Aicodingchatbot .HTML', 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
check = open('Aicodingchatbot .HTML', encoding='utf-8', errors='ignore').read()
import re
has_fn = bool(re.search(r'function toggleMobileSidebar\s*\(', check))
print(f"Function now defined: {has_fn}")
