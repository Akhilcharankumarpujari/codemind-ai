with open('Aicodingchatbot .HTML', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

ANIMATION_CSS = """
  /* ═══════════════════════════════════════════════════
     PREMIUM ANIMATION LAYER — CodeMind AI
     Zero layout change. Pure motion polish.
  ════════════════════════════════════════════════════ */

  /* ── Global Transition Reset ── */
  *, *::before, *::after {
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* ── Page Load: Sidebar Fade-In ── */
  .sidebar {
    animation: sidebarReveal 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  @keyframes sidebarReveal {
    from { opacity: 0; transform: translateX(-20px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  /* ── Page Load: Main Area Slide-Up ── */
  .chat-area, .flow-area, .complexity-area {
    animation: mainReveal 0.6s 0.1s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  @keyframes mainReveal {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Page Load: Welcome section stagger ── */
  .welcome h2 {
    animation: fadeSlideUp 0.55s 0.2s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .welcome p {
    animation: fadeSlideUp 0.55s 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Sidebar Nav Items: Hover Glow + Slide ── */
  .nav-item, .history-item {
    transition: background 0.22s, color 0.22s, transform 0.22s, box-shadow 0.22s !important;
    position: relative;
    overflow: hidden;
  }
  .nav-item::before, .history-item::before {
    content: '';
    position: absolute; inset: 0; left: -100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
    transition: left 0.5s ease;
    pointer-events: none;
  }
  .nav-item:hover::before, .history-item:hover::before { left: 100%; }
  .nav-item:hover, .history-item:hover {
    transform: translateX(3px);
    box-shadow: inset 3px 0 0 var(--accent), 0 0 12px rgba(0, 229, 255, 0.06);
  }
  .nav-item.active {
    box-shadow: inset 3px 0 0 var(--accent), 0 0 16px rgba(0, 229, 255, 0.1);
  }

  /* ── Buttons: Premium Hover Lift + Glow ── */
  button, .btn, .pill, .upload-btn, .cx-analyze-btn,
  #sendBtn, #flowRunBtn, #cxAnalyzeBtn {
    transition: transform 0.2s, box-shadow 0.2s, background 0.25s, opacity 0.2s !important;
    position: relative;
    overflow: hidden;
  }
  button::after, .upload-btn::after {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(circle at center, rgba(255,255,255,0.12) 0%, transparent 70%);
    opacity: 0; transition: opacity 0.3s;
    pointer-events: none;
  }
  button:hover::after, .upload-btn:hover::after { opacity: 1; }

  button:hover:not(:disabled) { transform: translateY(-2px); }
  button:active:not(:disabled) { transform: translateY(0) scale(0.97); }

  /* Send button special glow */
  #sendBtn:hover {
    box-shadow: 0 4px 20px rgba(0, 229, 255, 0.45), 0 0 0 1px rgba(0, 229, 255, 0.3);
  }
  #sendBtn:active {
    box-shadow: 0 2px 8px rgba(0, 229, 255, 0.3);
    transform: scale(0.95);
  }

  .cx-analyze-btn:hover, #cxAnalyzeBtn:hover {
    box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4);
  }

  /* ── Input Box: Focus Glow ── */
  #chatInput, #userInput, .cx-code-input, textarea {
    transition: border-color 0.25s, box-shadow 0.25s, background 0.25s !important;
  }
  #chatInput:focus, #userInput:focus, textarea:focus {
    border-color: rgba(0, 229, 255, 0.5) !important;
    box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.08), 0 0 20px rgba(0, 229, 255, 0.06) !important;
    outline: none;
  }
  .input-container:focus-within {
    border-color: rgba(0, 229, 255, 0.3) !important;
    box-shadow: 0 0 0 2px rgba(0, 229, 255, 0.07), 0 8px 24px rgba(0,0,0,0.2) !important;
    transition: border-color 0.25s, box-shadow 0.3s;
  }

  /* ── Chat Messages: Smooth Appear ── */
  .msg {
    animation: msgAppear 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  @keyframes msgAppear {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* User message specific */
  .msg.user-msg {
    animation: msgAppearRight 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  @keyframes msgAppearRight {
    from { opacity: 0; transform: translateX(12px) translateY(6px); }
    to   { opacity: 1; transform: translateX(0) translateY(0); }
  }

  /* Code block appear */
  pre, .code-block {
    animation: codeBlockAppear 0.4s 0.1s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  @keyframes codeBlockAppear {
    from { opacity: 0; transform: scale(0.98) translateY(8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  /* ── Typing Indicator (AI loading) ── */
  .typing-indicator {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 10px 16px; background: var(--surface2);
    border-radius: 12px; border: 1px solid var(--border);
  }
  .typing-dot {
    width: 7px; height: 7px;
    background: var(--accent);
    border-radius: 50%;
    animation: typingBounce 1.2s ease-in-out infinite;
  }
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes typingBounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
    30%           { transform: translateY(-8px); opacity: 1; }
  }

  /* ── Shimmer Loading for Cards ── */
  .shimmer-loading {
    background: linear-gradient(90deg,
      var(--surface) 25%, var(--surface2) 50%, var(--surface) 75%);
    background-size: 200% 100%;
    animation: shimmerPulse 1.6s infinite;
    border-radius: 8px;
  }
  @keyframes shimmerPulse {
    from { background-position: 200% 0; }
    to   { background-position: -200% 0; }
  }

  /* ── Card Hover Elevation ── */
  .cx-card, .suggestion-card, .cx-bigo-box, .cx-compare-col {
    transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s !important;
  }
  .cx-card:hover, .suggestion-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(0, 229, 255, 0.12) !important;
    border-color: rgba(0, 229, 255, 0.2) !important;
  }

  /* ── Flow Visualizer Node Transitions ── */
  .mermaid svg .node rect, .mermaid svg .node circle,
  .mermaid svg .node ellipse, .mermaid svg .node polygon {
    transition: fill 0.35s, stroke 0.35s, filter 0.35s !important;
  }
  .mermaid svg .edgePath path {
    transition: stroke 0.35s, stroke-width 0.35s !important;
  }

  /* ── Pill / Badge Hover ── */
  .pill {
    transition: background 0.2s, border-color 0.2s, color 0.2s, transform 0.2s !important;
  }
  .pill:hover { transform: translateY(-1px); }
  .pill.active { animation: pillPulse 2.5s ease-in-out infinite; }
  @keyframes pillPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0, 229, 255, 0.25); }
    50%       { box-shadow: 0 0 0 5px rgba(0, 229, 255, 0); }
  }

  /* ── Logo Sidebar: Subtle Icon Pulse ── */
  .logo-icon img {
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.35s;
  }
  .logo-icon:hover img {
    transform: scale(1.12) rotate(-3deg);
    filter: drop-shadow(0 4px 10px rgba(0, 229, 255, 0.4));
  }

  /* ── View Transitions: Smooth Area Switch ── */
  .chat-area[style*="block"], .flow-area[style*="block"], .complexity-area[style*="block"] {
    animation: viewFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
  }
  @keyframes viewFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Scrollbar Micro-Animation ── */
  ::-webkit-scrollbar-thumb {
    transition: background 0.2s;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: var(--accent) !important;
  }

  /* ── Notification Toast ── */
  .notification {
    animation: toastSlideIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  @keyframes toastSlideIn {
    from { opacity: 0; transform: translateX(-50%) translateY(-16px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  /* ── Reduce Motion Accessibility ── */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
"""

if '/* PREMIUM ANIMATION LAYER' not in content:
    content = content.replace("</style>", ANIMATION_CSS + "\n</style>")

# Also improve the AI loading indicator to use new typing dots
ANIMATION_JS = """
  // ── Premium AI Loading Indicator ──
  function showTypingIndicator() {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'msg ai-msg';
    msgDiv.id = 'typingIndicator';
    msgDiv.innerHTML = `<div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`;
    const msgArea = document.getElementById('messages');
    if (msgArea) { msgArea.appendChild(msgDiv); msgArea.scrollTop = msgArea.scrollHeight; }
  }
  function hideTypingIndicator() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
  }
  // ── Stagger-in history items on load ──
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.history-item, .nav-item').forEach((el, i) => {
      el.style.animationDelay = (i * 0.05) + 's';
      el.style.animation = 'fadeSlideUp 0.4s both';
    });
  });
"""

if 'showTypingIndicator' not in content:
    last_script = content.rfind("</script>")
    content = content[:last_script] + ANIMATION_JS + "\n</script>" + content[last_script+9:]

# Hook typing indicator into existing sendMessage flow
# Replace the loading indicator HTML in existing AI response rendering
content = content.replace(
    "isLoading = true;",
    "isLoading = true; showTypingIndicator();"
)
content = content.replace(
    "isLoading = false;",
    "isLoading = false; hideTypingIndicator();"
)

with open('Aicodingchatbot .HTML', 'w', encoding='utf-8') as f:
    f.write(content)

print("Premium animation layer injected successfully!")
