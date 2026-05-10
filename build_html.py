import os
import re

css = """
    :root {
      /* Premium SaaS Dark Palette */
      --bg: #0D1117;
      --surface: #161B22;
      --surface-hover: #21262d;
      --border: #30363D;
      
      --accent: #2ea043;
      --accent-hover: #2c974b;
      --accent2: #58a6ff;
      --accent3: #8957e5;
      
      --text: #c9d1d9;
      --heading: #f0f6fc;
      --muted: #8b949e;
      
      --user-bubble: #1f242c;
      --ai-bubble: transparent;
      --code-bg: #0d1117;
      
      --radius: 8px;
      --font-mono: 'JetBrains Mono', monospace;
      --font-ui: 'Inter', sans-serif;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      height: 100%;
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-ui);
      overflow: hidden;
      font-size: 14px;
    }

    /* ─── LAYOUT ─── */
    .app {
      display: flex;
      height: 100vh;
      width: 100vw;
    }

    /* ─── SLIM SIDEBAR ─── */
    .sidebar {
      width: 64px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 0;
      z-index: 50;
      transition: width 0.2s ease;
    }

    .sidebar-logo {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: linear-gradient(180deg, #3fb950, #2ea043);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 18px;
      margin-bottom: 24px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(46, 160, 67, 0.3);
    }

    .nav-items {
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
      width: 100%;
      align-items: center;
    }

    .nav-btn {
      position: relative;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: var(--muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      transition: all 0.2s;
    }

    .nav-btn:hover {
      color: var(--heading);
      background: var(--surface-hover);
    }

    .nav-btn.active {
      color: var(--accent2);
      background: rgba(88, 166, 255, 0.1);
    }

    .nav-btn.active::before {
      content: '';
      position: absolute;
      left: -12px;
      top: 50%;
      transform: translateY(-50%);
      height: 20px;
      width: 3px;
      background: var(--accent2);
      border-radius: 0 4px 4px 0;
    }

    .nav-tooltip {
      position: absolute;
      left: 56px;
      background: var(--surface-hover);
      color: var(--heading);
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transform: translateX(-10px);
      transition: all 0.2s;
      border: 1px solid var(--border);
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      z-index: 100;
    }

    .nav-btn:hover .nav-tooltip {
      opacity: 1;
      transform: translateX(0);
    }

    .sidebar-footer {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent2), var(--accent3));
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
    }

    /* ─── MAIN CONTENT AREA ─── */
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: var(--bg);
      position: relative;
      overflow: hidden;
    }

    /* Views */
    .view-container {
      display: none;
      height: 100%;
      width: 100%;
      flex-direction: column;
      animation: fadeIn 0.2s ease;
    }

    .view-container.active {
      display: flex;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* ─── TOPBAR ─── */
    .topbar {
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      border-bottom: 1px solid var(--border);
      background: rgba(22, 27, 34, 0.8);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 10;
    }

    .breadcrumb {
      font-weight: 600;
      color: var(--heading);
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .breadcrumb-icon {
      color: var(--muted);
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .pill {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .pill:hover {
      color: var(--heading);
      border-color: var(--muted);
    }

    .pill.active {
      background: rgba(46, 160, 67, 0.1);
      border-color: rgba(46, 160, 67, 0.4);
      color: var(--accent);
    }

    /* ─── DSA DASHBOARD ─── */
    .dashboard-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 32px;
    }

    .dash-grid {
      max-width: 1000px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 24px;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
    }

    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--heading);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stat-rings {
      display: flex;
      align-items: center;
      gap: 24px;
    }

    .ring-container {
      position: relative;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: conic-gradient(
        var(--accent) 0deg 180deg,
        var(--warn, #d29922) 180deg 270deg,
        var(--error, #f85149) 270deg 310deg,
        var(--surface-hover) 310deg 360deg
      );
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ring-inner {
      width: 100px;
      height: 100px;
      background: var(--surface);
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .ring-val { font-size: 24px; font-weight: 800; color: var(--heading); }
    .ring-lbl { font-size: 11px; color: var(--muted); }

    .stat-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
    }

    .stat-label { color: var(--muted); display: flex; align-items: center; gap: 6px; }
    .stat-label.easy::before { content:''; width:8px; height:8px; border-radius:50%; background:var(--accent); }
    .stat-label.med::before { content:''; width:8px; height:8px; border-radius:50%; background:#d29922; }
    .stat-label.hard::before { content:''; width:8px; height:8px; border-radius:50%; background:#f85149; }
    
    .stat-num { font-weight: 600; color: var(--heading); font-family: var(--font-mono); }

    .heatmap-placeholder {
      display: grid;
      grid-template-columns: repeat(20, 1fr);
      gap: 4px;
      margin-top: 16px;
    }

    .heatmap-cell {
      aspect-ratio: 1;
      border-radius: 2px;
      background: var(--surface-hover);
    }

    .heatmap-cell.l1 { background: rgba(46, 160, 67, 0.4); }
    .heatmap-cell.l2 { background: rgba(46, 160, 67, 0.6); }
    .heatmap-cell.l3 { background: rgba(46, 160, 67, 0.8); }
    .heatmap-cell.l4 { background: var(--accent); }

    .roadmap-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .rm-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
    }

    .rm-icon {
      width: 32px; height: 32px; border-radius: 6px;
      background: var(--surface-hover);
      display: flex; align-items: center; justify-content: center;
    }
    .rm-info { flex: 1; }
    .rm-title { font-size: 13px; font-weight: 600; color: var(--heading); margin-bottom: 2px; }
    .rm-prog { font-size: 11px; color: var(--muted); }
    .rm-action { color: var(--accent2); font-size: 12px; font-weight: 600; cursor: pointer; }

    /* ─── CHAT UI ─── */
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .msg {
      display: flex;
      gap: 16px;
      max-width: 800px;
      margin: 0 auto;
      width: 100%;
      animation: fadeUp 0.3s ease;
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .msg-avatar {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }

    .msg.ai .msg-avatar {
      background: var(--accent2);
      color: #fff;
    }

    .msg.user .msg-avatar {
      background: var(--surface-hover);
      color: var(--muted);
      border: 1px solid var(--border);
    }

    .msg-content {
      flex: 1;
      min-width: 0;
    }

    .msg-author {
      font-size: 13px;
      font-weight: 600;
      color: var(--heading);
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .msg-time {
      font-size: 11px;
      color: var(--muted);
      font-weight: 400;
    }

    .msg-bubble {
      font-size: 14px;
      line-height: 1.6;
      color: var(--text);
    }

    .msg.user .msg-bubble {
      background: var(--user-bubble);
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid var(--border);
      display: inline-block;
    }

    .msg-bubble pre {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      margin: 12px 0;
      overflow-x: auto;
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 1.5;
    }

    .msg-bubble code:not(pre code) {
      background: rgba(110, 118, 129, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 13px;
      color: var(--text);
    }

    .code-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-bottom: none;
      border-radius: 8px 8px 0 0;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--muted);
    }

    .code-block-wrap pre {
      margin-top: 0;
      border-top-left-radius: 0;
      border-top-right-radius: 0;
    }

    .copy-btn, .run-btn {
      background: transparent;
      border: none;
      color: var(--muted);
      cursor: pointer;
      font-family: var(--font-ui);
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .copy-btn:hover { color: var(--heading); }
    .run-btn { color: var(--accent); }
    .run-btn:hover { color: var(--accent-hover); }

    /* Input Area */
    .input-area {
      padding: 0 24px 24px;
      max-width: 850px;
      margin: 0 auto;
      width: 100%;
    }

    .input-wrap {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      transition: border-color 0.2s;
    }

    .input-wrap:focus-within {
      border-color: var(--muted);
    }

    #userInput {
      width: 100%;
      background: transparent;
      border: none;
      padding: 16px;
      color: var(--text);
      font-family: var(--font-ui);
      font-size: 14px;
      resize: none;
      outline: none;
      max-height: 200px;
    }

    #userInput::placeholder { color: var(--muted); }

    .input-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px 12px;
    }

    .input-hints {
      font-size: 12px;
      color: var(--muted);
    }

    .send-btn {
      background: var(--accent);
      color: #fff;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s;
    }
    .send-btn:hover { background: var(--accent-hover); }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Welcome state */
    .welcome-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
    }

    .welcome-icon {
      font-size: 48px;
      margin-bottom: 24px;
    }

    .welcome-title {
      font-size: 24px;
      font-weight: 600;
      color: var(--heading);
      margin-bottom: 8px;
    }

    .welcome-sub {
      color: var(--muted);
      margin-bottom: 32px;
    }

    .suggestion-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      max-width: 600px;
    }

    .suggestion-card {
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 16px;
      border-radius: 12px;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s;
    }

    .suggestion-card:hover {
      background: var(--surface-hover);
      border-color: var(--muted);
    }

    .suggestion-card strong {
      display: block;
      color: var(--heading);
      font-size: 13px;
      margin-bottom: 4px;
    }

    .suggestion-card p {
      color: var(--muted);
      font-size: 12px;
    }

    /* ─── SPLIT PANES (IDE Style) ─── */
    .split-view {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--border);
      min-width: 0;
    }

    .pane:last-child {
      border-right: none;
    }

    .pane-header {
      padding: 12px 16px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      font-size: 12px;
      font-weight: 600;
      color: var(--heading);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .pane-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: var(--bg);
    }

    /* Editor / Input */
    .editor-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 0;
    }

    .code-textarea {
      flex: 1;
      width: 100%;
      background: var(--bg);
      border: none;
      color: var(--text);
      font-family: var(--font-mono);
      font-size: 14px;
      padding: 16px;
      resize: none;
      outline: none;
      line-height: 1.5;
    }

    .action-btn {
      width: calc(100% - 32px);
      margin: 16px;
      padding: 10px;
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }

    .action-btn:hover { background: var(--accent-hover); }
    .action-btn:disabled { opacity: 0.5; }

    /* Results */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--muted);
      text-align: center;
      gap: 16px;
    }
    .empty-icon { font-size: 40px; opacity: 0.5; }

    .cx-result-area {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Bento Cards */
    .bento-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .bento-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
    }

    .bento-lbl { font-size: 12px; color: var(--muted); font-weight: 600; text-transform: uppercase; margin-bottom: 8px;}
    .bento-val { font-size: 24px; font-weight: 700; color: var(--accent2); font-family: var(--font-mono); }
    .bento-val.space { color: var(--accent3); }

    .cx-block {
      background: var(--surface);
      border: 1px solid var(--border);
      border-left: 3px solid var(--accent2);
      border-radius: 8px;
      padding: 16px;
    }
    .cx-block.warn { border-left-color: #d29922; }
    .cx-block.success { border-left-color: var(--accent); }
    .cx-block.error { border-left-color: #f85149; }

    .cx-block h4 { font-size: 13px; color: var(--heading); margin-bottom: 8px; display:flex; align-items:center; gap:8px;}
    .cx-block p { font-size: 13px; color: var(--text); line-height: 1.5;}
    .cx-block ul { margin-left: 20px; font-size: 13px; line-height: 1.5; color: var(--text); }

    /* Code Output */
    .code-output {
      border-radius: 0 0 8px 8px;
      border-top: 1px solid var(--border);
      padding: 16px;
      font-family: var(--font-mono);
      font-size: 13px;
      background: var(--surface);
    }
    .code-output.success { color: var(--accent); }
    .code-output.error { color: #f85149; }

    /* Flow Visualizer Canvas */
    .mermaid-canvas {
      flex: 1;
      background-image: 
        radial-gradient(var(--border) 1px, transparent 1px);
      background-size: 20px 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
      border-bottom: 1px solid var(--border);
    }

    .flow-controls-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--surface);
    }

    .ctrl-group { display: flex; gap: 8px; align-items: center; }
    .ctrl-btn {
      background: transparent; border: 1px solid var(--border);
      color: var(--text); padding: 6px 12px; border-radius: 6px;
      cursor: pointer; font-size: 12px; font-weight: 500;
    }
    .ctrl-btn:hover { background: var(--surface-hover); }
    .ctrl-btn.play { background: rgba(46,160,67,0.1); color: var(--accent); border-color: rgba(46,160,67,0.4);}

    /* ─── MOBILE RESPONSIVENESS ─── */
    .mobile-menu-btn { display: none; }
    .mobile-overlay { display: none; }

    @media (max-width: 768px) {
      .sidebar {
        position: fixed;
        left: -64px;
        height: 100%;
      }
      .sidebar.open { left: 0; box-shadow: 4px 0 24px rgba(0,0,0,0.5); }
      .mobile-menu-btn {
        display: block; background: none; border: none; color: var(--heading);
        font-size: 24px; cursor: pointer; margin-right: 12px;
      }
      .mobile-overlay.open {
        display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 40;
      }
      .split-view { flex-direction: column; overflow-y: auto; }
      .pane { border-right: none; border-bottom: 1px solid var(--border); min-height: 50vh; }
      .dash-grid { grid-template-columns: 1fr; }
      .suggestion-grid { grid-template-columns: 1fr; }
    }
"""

html_top = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DSAMind — Coding Platform</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
"""

html_mid = """
  </style>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      mermaid.initialize({ startOnLoad: false, theme: 'dark', fontFamily: 'JetBrains Mono' });
    });
  </script>
</head>
<body>
  <div class="mobile-overlay" id="mobileOverlay" onclick="toggleSidebar()"></div>
  <div class="app">
    
    <!-- SLIM SIDEBAR -->
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo" onclick="switchView('dashboard')">▲</div>
      
      <div class="nav-items">
        <button class="nav-btn active" id="nav-dashboard" onclick="switchView('dashboard')">
          🏠<span class="nav-tooltip">Dashboard</span>
        </button>
        <button class="nav-btn" id="nav-chat" onclick="switchView('chat')">
          💬<span class="nav-tooltip">AI Assistant</span>
        </button>
        <button class="nav-btn" id="nav-complexity" onclick="switchView('complexity')">
          ⚡<span class="nav-tooltip">Complexity</span>
        </button>
        <button class="nav-btn" id="nav-flow" onclick="switchView('flow')">
          📊<span class="nav-tooltip">Visualizer</span>
        </button>
      </div>

      <div class="sidebar-footer">
        <div class="user-avatar" id="userAvatar" onclick="logout()" title="Logout">G</div>
      </div>
    </aside>

    <div class="main-content">
      
      <!-- TOPBAR -->
      <header class="topbar">
        <div class="breadcrumb">
          <button class="mobile-menu-btn" onclick="toggleSidebar()">☰</button>
          <span class="breadcrumb-icon">/</span> <span id="viewTitle">Dashboard</span>
        </div>
        <div class="topbar-actions">
          <button class="pill" id="ragPill" onclick="toggleRag()">RAG Active</button>
        </div>
      </header>

      <!-- 1. DASHBOARD VIEW -->
      <div class="view-container active" id="view-dashboard">
        <div class="dashboard-scroll">
          <div class="dash-grid">
            
            <div style="display:flex; flex-direction:column; gap:24px;">
              <div class="card">
                <div class="card-title">📚 Progress Overview</div>
                <div class="stat-rings">
                  <div class="ring-container">
                    <div class="ring-inner">
                      <div class="ring-val">142</div>
                      <div class="ring-lbl">Solved</div>
                    </div>
                  </div>
                  <div class="stat-details">
                    <div class="stat-row"><span class="stat-label easy">Easy</span> <span class="stat-num">84</span></div>
                    <div class="stat-row"><span class="stat-label med">Medium</span> <span class="stat-num">45</span></div>
                    <div class="stat-row"><span class="stat-label hard">Hard</span> <span class="stat-num">13</span></div>
                  </div>
                </div>
                <div style="margin-top:24px;">
                  <div style="font-size:12px; color:var(--muted); margin-bottom:8px;">Activity</div>
                  <div class="heatmap-placeholder">
                    <!-- Render mock heatmap cells -->
                    <script>
                      for(let i=0; i<100; i++) {
                        let cl = Math.random() > 0.7 ? 'l' + Math.ceil(Math.random()*4) : '';
                        document.write(`<div class="heatmap-cell ${cl}"></div>`);
                      }
                    </script>
                  </div>
                </div>
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:24px;">
              <div class="card">
                <div class="card-title">🗺 Study Roadmap</div>
                <div class="roadmap-list">
                  <div class="rm-item">
                    <div class="rm-icon">🌲</div>
                    <div class="rm-info">
                      <div class="rm-title">Binary Trees</div>
                      <div class="rm-prog">12 / 15 solved</div>
                    </div>
                    <div class="rm-action">Continue</div>
                  </div>
                  <div class="rm-item">
                    <div class="rm-icon">🔄</div>
                    <div class="rm-info">
                      <div class="rm-title">Dynamic Programming</div>
                      <div class="rm-prog">4 / 20 solved</div>
                    </div>
                    <div class="rm-action">Start</div>
                  </div>
                  <div class="rm-item" style="opacity:0.5;">
                    <div class="rm-icon">🕸</div>
                    <div class="rm-info">
                      <div class="rm-title">Graphs</div>
                      <div class="rm-prog">Locked</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- 2. CHAT VIEW -->
      <div class="view-container" id="view-chat">
        <div class="messages" id="messages">
          <div class="welcome-container" id="welcome">
            <div class="welcome-icon">⚡</div>
            <div class="welcome-title">How can I help you code?</div>
            <div class="welcome-sub">Ask anything about algorithms, debugging, or system design.</div>
            <div class="suggestion-grid">
              <div class="suggestion-card" onclick="sendSuggestion('Explain Dijkstra\\'s shortest path algorithm')">
                <strong>Explain Dijkstra's</strong>
                <p>How does it work with negative weights?</p>
              </div>
              <div class="suggestion-card" onclick="sendSuggestion('Review my brute force solution and help me optimize it')">
                <strong>Review my code</strong>
                <p>Help me optimize my brute force solution.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="input-area">
          <div class="input-wrap">
            <textarea id="userInput" rows="1" placeholder="Message DSAMind..." onkeydown="handleKey(event)" oninput="autoResize(this)"></textarea>
            <div class="input-actions">
              <div class="input-hints">Shift + Enter for new line</div>
              <button class="send-btn" id="sendBtn" onclick="sendMessage()">↑</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. COMPLEXITY ANALYZER VIEW -->
      <div class="view-container" id="view-complexity">
        <div class="split-view">
          <div class="pane">
            <div class="pane-header">
              <span>Code Editor</span>
              <select id="cxLang" style="background:var(--surface); border:1px solid var(--border); color:var(--text); border-radius:4px; padding:2px 4px;">
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="c++">C++</option>
              </select>
            </div>
            <div class="editor-container">
              <textarea class="code-textarea" id="cxCodeInput" placeholder="def two_sum(nums, target):
    pass"></textarea>
              <button class="action-btn" id="cxAnalyzeBtn" onclick="analyzeComplexity()">Analyze Complexity</button>
            </div>
          </div>
          <div class="pane">
            <div class="pane-header">Analysis Results</div>
            <div class="pane-body" id="cxResults">
              <div class="empty-state">
                <div class="empty-icon">⚡</div>
                <div>Run analysis to see Time & Space complexity</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. FLOW VISUALIZER VIEW -->
      <div class="view-container" id="view-flow">
        <div class="split-view">
          <div class="pane">
            <div class="pane-header">Code Editor</div>
            <div class="editor-container">
              <textarea class="code-textarea" id="flowCodeInput" placeholder="function search() {}"></textarea>
              <button class="action-btn" id="generateFlowBtn" onclick="generateFlow()">Generate Flowchart</button>
            </div>
          </div>
          <div class="pane" style="display:flex; flex-direction:column; flex:1;">
            <div class="pane-header">Execution Flow</div>
            <div class="mermaid-canvas" id="mermaidContainer" style="flex:1;">
              <div class="empty-state">
                <div class="empty-icon">📊</div>
                <div>Graph will appear here</div>
              </div>
            </div>
            <div class="flow-controls-bar">
              <div class="ctrl-group">
                <button class="ctrl-btn play" id="playBtn" onclick="togglePlay()" disabled>▶ Play</button>
                <button class="ctrl-btn" id="nextBtn" onclick="nextStep()" disabled>Next</button>
                <button class="ctrl-btn" id="resetBtn" onclick="resetAnimation()" disabled>Reset</button>
              </div>
              <div class="ctrl-group">
                <span id="stepCounter" style="font-size:12px; color:var(--muted); font-family:var(--font-mono)">Step: 0/0</span>
                <select id="speedSelect" onchange="handleSpeedChange()" style="background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:4px;">
                  <option value="1500">Slow</option>
                  <option value="800" selected>Normal</option>
                  <option value="400">Fast</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>

  <script>
    // Navigation logic for new layout
    let isSidebarOpen = false;

    function toggleSidebar() {
      isSidebarOpen = !isSidebarOpen;
      const sb = document.getElementById('sidebar');
      const overlay = document.getElementById('mobileOverlay');
      if(isSidebarOpen) {
        sb.classList.add('open'); overlay.classList.add('open');
      } else {
        sb.classList.remove('open'); overlay.classList.remove('open');
      }
    }

    function switchView(viewId) {
      document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      
      document.getElementById('view-' + viewId).classList.add('active');
      document.getElementById('nav-' + viewId).classList.add('active');
      
      const titles = {
        'dashboard': 'Dashboard',
        'chat': 'AI Assistant',
        'complexity': 'Complexity Analyzer',
        'flow': 'Flow Visualizer'
      };
      document.getElementById('viewTitle').textContent = titles[viewId];
      
      if(window.innerWidth <= 768 && isSidebarOpen) toggleSidebar();
    }
  </script>
"""

with open('js_temp.js', 'r', encoding='utf-8') as f:
    original_js = f.read()

# We need to adapt the original JS slightly to the new DOM structure where needed.
# Since we removed "historyList", we patch it so newChat doesn't crash.
# And we patch the complexity analyzer rendering to match the new Bento cards.
# Wait, replacing the JS completely is risky, let's just use regex to overwrite renderComplexityResult inside JS.

patch_js_top = """
// Polyfill for missing DOM elements from old UI so JS doesn't throw
const dummy = document.createElement('div');
document.getElementById = (function(orig) {
  return function(id) {
    const el = orig.call(document, id);
    if (!el && id === 'historyList') return dummy;
    if (!el && id === 'themePill') return dummy;
    if (!el && id === 'loginPill') return dummy;
    if (!el && id === 'logoutPill') return dummy;
    if (!el && id === 'userBadge') return dummy;
    if (!el && id === 'userNameLabel') return dummy;
    if (!el && id === 'userEmailLabel') return dummy;
    return el;
  }
})(document.getElementById);

function sendSuggestion(txt) {
  document.getElementById('userInput').value = txt;
  sendMessage();
}
"""

# Replace the renderComplexityResult function in original_js to use the new bento UI.
new_render_cx = """
    function renderComplexityResult(data) {
      const results = document.getElementById('cxResults');
      
      if (data.error) {
        results.innerHTML = `
          <div class="cx-block error">
            <h4>⚠ Analysis Failed</h4>
            <p>${data.error}</p>
          </div>
        `;
        return;
      }

      const { time_complexity, space_complexity, optimal, breakdown, alternatives } = data;

      let html = `<div class="cx-result-area">`;
      
      // Bento Top row
      html += `
        <div class="bento-row">
          <div class="bento-card">
            <div class="bento-lbl">Time Complexity</div>
            <div class="bento-val">${time_complexity}</div>
          </div>
          <div class="bento-card">
            <div class="bento-lbl">Space Complexity</div>
            <div class="bento-val space">${space_complexity}</div>
          </div>
        </div>
      `;

      // Status
      if (optimal) {
        html += `
          <div class="cx-block success">
            <h4>✓ Optimal Solution</h4>
            <p>This implementation is highly efficient for the given language bounds.</p>
          </div>
        `;
      } else {
        html += `
          <div class="cx-block warn">
            <h4>⚠ Suboptimal Solution Detected</h4>
            <p>There are more efficient ways to solve this problem.</p>
          </div>
        `;
      }

      // Breakdown
      if (breakdown && breakdown.length > 0) {
        html += `
          <div class="cx-block">
            <h4>🔍 Analysis Breakdown</h4>
            <ul>
              ${breakdown.map(b => `<li>${b}</li>`).join('')}
            </ul>
          </div>
        `;
      }

      // Alternatives
      if (alternatives && alternatives.length > 0) {
        html += `<div style="font-weight:600; color:var(--heading); font-size:13px; margin-top:8px;">Suggested Alternatives</div>`;
        alternatives.forEach(alt => {
          html += `
            <div class="cx-block">
              <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <h4 style="margin:0">${alt.approach}</h4>
                <div style="font-family:var(--font-mono); font-size:12px; color:var(--muted)">T: ${alt.time} | S: ${alt.space}</div>
              </div>
              <p>${alt.description}</p>
            </div>
          `;
        });
      }

      html += `</div>`;
      results.innerHTML = html;
    }
"""

# Replace in string
original_js = re.sub(r'function renderComplexityResult\(data\) \{.*?\n    \}', new_render_cx, original_js, flags=re.DOTALL)

with open('Aicodingchatbot .HTML', 'w', encoding='utf-8') as f:
    f.write(html_top + css + html_mid + patch_js_top + original_js + "</body></html>")
