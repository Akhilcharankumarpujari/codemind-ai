import re, sys

with open('Aicodingchatbot .HTML', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# ── Step 1: Remove all injected hamburger buttons from HTML ──
# Remove any hamburger button from inside chat-topbar, flow-header, cx-topbar
content = re.sub(r'\s*<button class="hamburger-btn"[^>]+>☰</button>\s*', '\n      ', content)

# ── Step 2: Remove the mobile overlay div ──
content = re.sub(r'\s*<div class="mobile-overlay"[^>]+></div>\s*', '\n  ', content)

# ── Step 3: Remove the entire mobile responsiveness CSS block ──
idx_start = content.find('/* ─── MOBILE RESPONSIVENESS ─── */')
if idx_start != -1:
    # Find the end of the @media block by counting braces
    media_start = content.find('@media', idx_start)
    depth = 0
    i = media_start
    while i < len(content):
        if content[i] == '{':
            depth += 1
        elif content[i] == '}':
            depth -= 1
            if depth == 0:
                end_media = i + 1
                break
        i += 1
    old_block = content[idx_start:end_media]
    content = content.replace(old_block, '')

# ── Step 4: Remove toggleMobileSidebar JS function ──
content = re.sub(r'\s*// Mobile Sidebar Toggle\s*function toggleMobileSidebar\(\) \{[^}]+\}\s*', '\n', content)

# ── Step 5: Now inject ONE clean, correct responsive CSS block ──
clean_css = """
  /* ─── RESPONSIVE (Mobile ≤600px) ─── */
  .hamburger-btn {
    display: none;
    background: none; border: none; color: var(--text);
    font-size: 22px; cursor: pointer; padding: 0 8px 0 0; flex-shrink: 0;
    align-items: center; justify-content: center;
  }
  .mobile-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,0.55); z-index: 999;
    backdrop-filter: blur(2px);
  }
  .mobile-overlay.open { display: block; }

  @media (max-width: 600px) {
    .app { display: flex; flex-direction: column; }

    .sidebar {
      position: fixed; top: 0; left: -100%; width: 75vw; max-width: 280px;
      height: 100vh; z-index: 1000;
      transition: left 0.3s cubic-bezier(0.4,0,0.2,1);
      box-shadow: 6px 0 32px rgba(0,0,0,0.6);
    }
    .sidebar.open { left: 0; }

    .hamburger-btn { display: flex; }

    .chat-area { width: 100vw; height: 100vh; display: flex; flex-direction: column; }

    .messages { padding: 14px 12px; gap: 12px; }
    .msg { max-width: 100%; }
    .msg-bubble { font-size: 13px; padding: 10px 12px; }

    .input-container { margin: 8px; padding: 10px 12px; border-radius: 12px; }
    #chatInput, #userInput { font-size: 14px; }

    .welcome { padding: 20px 14px; }
    .welcome h2 { font-size: 18px; }
    .welcome p { font-size: 12px; max-width: 100%; }

    .suggestion-grid { grid-template-columns: 1fr; }

    .flow-area, .complexity-area { flex-direction: column; height: auto; min-height: 100vh; }
    .flow-left, .cx-left { width: 100%; border-right: none; border-bottom: 1px solid var(--border); }
    .flow-right, .cx-right { width: 100%; min-height: 350px; }

    .chat-topbar { padding: 10px 14px; }
    .topbar-pills { gap: 4px; }
    .pill { padding: 4px 8px; font-size: 10px; }
  }
"""

content = content.replace("</style>", clean_css + "\n</style>")

# ── Step 6: Add hamburger button and mobile overlay properly ──
# Add overlay right after <div class="app">
if 'id="mobileOverlay"' not in content:
    content = content.replace('<div class="app">', '<div class="app">\n  <div class="mobile-overlay" id="mobileOverlay" onclick="toggleMobileSidebar()"></div>')

# Add hamburger button to chat topbar only (cleanly)
if 'class="hamburger-btn"' not in content:
    content = content.replace(
        '<div class="chat-topbar">',
        '<div class="chat-topbar">\n      <button class="hamburger-btn" id="mobileMenuBtn" onclick="toggleMobileSidebar()" aria-label="Open menu">☰</button>'
    )

# ── Step 7: Add the JS function ──
mobile_js = """
  // ── Mobile Sidebar ──
  function toggleMobileSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
    document.getElementById('mobileOverlay').classList.toggle('open');
  }
"""

if 'toggleMobileSidebar' not in content:
    content = content.replace("</script>\n</body>", mobile_js + "\n</script>\n</body>")

with open('Aicodingchatbot .HTML', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done — clean responsive rewrite applied.")

# Quick verify
check = open('Aicodingchatbot .HTML', encoding='utf-8', errors='ignore').read()
import sys
sys.stdout.buffer.write(f"hamburger-btn occurrences in HTML: {check.count('class=\"hamburger-btn\"')}\n".encode())
sys.stdout.buffer.write(f"mobile CSS breakpoint: {'max-width: 600px' in check}\n".encode())
sys.stdout.buffer.write(f"display:none on hamburger: {'display: none' in check[check.find('hamburger-btn'):check.find('hamburger-btn')+200]}\n".encode())
