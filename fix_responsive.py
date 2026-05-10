import re

with open('Aicodingchatbot .HTML', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Step 1: Fix the desktop .app to explicitly fill width
old_app = '.app { display: grid; grid-template-columns: 260px 1fr; height: 100vh; }'
new_app = '.app { display: grid; grid-template-columns: 260px 1fr; height: 100vh; width: 100%; }'
content = content.replace(old_app, new_app)

# Step 2: Remove the old injected mobile CSS block entirely and replace with a corrected version
old_mobile_css_pattern = r'/\* ─── MOBILE RESPONSIVENESS ─── \*/.*?@media \(max-width: 768px\) \{.*?\}\s*\n'
# Use DOTALL
match = re.search(r'/\* ─── MOBILE RESPONSIVENESS ─── \*/', content)
end_match = None
if match:
    # Find the closing brace of the @media block
    start_pos = content.find('@media (max-width: 768px)', match.start())
    # Count braces to find the matching closing brace
    depth = 0
    i = start_pos
    in_media = False
    while i < len(content):
        if content[i] == '{':
            depth += 1
            in_media = True
        elif content[i] == '}':
            depth -= 1
            if in_media and depth == 0:
                end_media = i + 1
                break
        i += 1
    # Remove from the comment start to the end of the media block
    old_block = content[match.start():end_media]
    
    new_mobile_css = """/* ─── MOBILE RESPONSIVENESS ─── */
  .hamburger-btn {
    display: none; background: none; border: none; color: var(--text);
    font-size: 22px; cursor: pointer; padding: 0 8px 0 0; flex-shrink: 0;
  }

  @media (max-width: 600px) {
    html, body { overflow: hidden; }

    /* Stack sidebar and main area vertically */
    .app { display: flex; flex-direction: column; width: 100%; }

    /* Sidebar: off-canvas drawer */
    .sidebar {
      position: fixed; top: 0; left: -280px; width: 75vw; max-width: 280px;
      height: 100vh; z-index: 1000;
      transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 6px 0 32px rgba(0,0,0,0.6);
    }
    .sidebar.open { left: 0; }

    /* Backdrop when sidebar open */
    .mobile-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 999; backdrop-filter: blur(2px); }
    .mobile-overlay.open { display: block; }

    /* Show hamburger in all topbars */
    .hamburger-btn { display: flex; align-items: center; }

    /* Main chat takes full screen */
    .chat-area { width: 100vw; height: 100vh; display: flex; flex-direction: column; }
    .messages { padding: 16px 12px; gap: 14px; }
    .msg { max-width: 100%; }
    .msg-bubble { font-size: 13px; padding: 10px 12px; }

    /* Input bar */
    .input-container { margin: 8px; padding: 10px 12px; border-radius: 12px; }
    #chatInput, #userInput { font-size: 14px; min-height: 40px; max-height: 90px; }

    /* Welcome screen */
    .welcome { padding: 20px 16px; }
    .welcome h2 { font-size: 19px; }
    .welcome p { font-size: 12px; max-width: 100%; }

    /* Suggestion cards single column */
    .suggestion-grid { grid-template-columns: 1fr; width: 100%; }

    /* Flow Visualizer: stack vertically */
    .flow-area { flex-direction: column; height: auto; min-height: 100vh; }
    .flow-left { width: 100%; border-right: none; border-bottom: 1px solid var(--border); height: auto; min-height: 300px; }
    .flow-right { width: 100%; height: auto; min-height: 350px; }

    /* Complexity Analyzer: stack vertically */
    .complexity-area { flex-direction: column; height: auto; min-height: 100vh; }
    .cx-left { width: 100%; border-right: none; border-bottom: 1px solid var(--border); height: auto; }
    .cx-right { width: 100%; height: auto; min-height: 350px; overflow-y: auto; }

    /* Topbar spacing */
    .chat-topbar { padding: 10px 14px; gap: 8px; }
    .topbar-pills { gap: 4px; }
    .pill { padding: 4px 8px; font-size: 10px; }
    .chat-title { font-size: 13px; }
  }"""
    
    content = content.replace(old_block, new_mobile_css)

with open('Aicodingchatbot .HTML', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done! Rewrote mobile CSS with 600px breakpoint and explicit desktop fixes.")
