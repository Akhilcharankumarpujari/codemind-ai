
    document.addEventListener('DOMContentLoaded', () => {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        fontFamily: 'JetBrains Mono, monospace'
      });
    });
  </script>
</head>

<body>
  <div class="mobile-overlay" id="mobileOverlay" onclick="toggleSidebar()"></div>
  <div class="app">

    <!-- LEFT SIDEBAR -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <div class="logo-icon">⚡</div>
          Code<span>Mind</span>
        </div>
        <button class="new-chat-btn" onclick="newChat()">
          <span>✦</span> New conversation
        </button>
        <button class="upload-btn" onclick="toggleFlowMode()" id="flowVisBtn"
          style="border-color:var(--accent2); color:var(--accent2); background:rgba(124,58,237,0.06); margin-top:8px">
          📊 Flow Visualizer
        </button>
        <button class="upload-btn" onclick="toggleComplexityMode()" id="cxBtn"
          style="border-color:#f59e0b; color:#f59e0b; background:rgba(245,158,11,0.06); margin-top:8px">
          ⚡ Complexity Analyzer
        </button>
      </div>
      <div class="sidebar-section">History</div>
      <div class="history-list" id="historyList">
        <div class="history-item active"><span class="dot"></span>New conversation</div>
      </div>

      <div class="sidebar-footer">
        <div class="model-badge" style="flex-direction:column;gap:6px;align-items:flex-start">
          <div style="display:flex;align-items:center;gap:8px;width:100%">
            <span class="status-dot"></span>
            <span id="activemodelLabel">llama-3.3-70b &middot; AI</span>
          </div>
          <div id="userBadge"
            style="display:none;align-items:center;gap:8px;width:100%;padding-top:6px;border-top:1px solid var(--border)">
            <div
              style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#000;flex-shrink:0"
              id="userAvatar">?</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                id="userNameLabel">Guest</div>
              <div style="font-size:10px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                id="userEmailLabel"></div>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- MAIN CHAT -->
    <main class="chat-area" id="chatArea">
      <div class="chat-topbar">
        <button class="mobile-menu-btn" onclick="toggleSidebar()">☰</button>
        <div class="chat-title">Tech &amp; Coding <span>Assistant</span></div>
        <div class="topbar-pills">
          <span class="agent-badge" id="agentBadge" style="display:none"></span>
          <button class="pill active" id="ragPill" onclick="toggleRag()">&#128450; RAG</button>
          <button class="pill" id="themePill" onclick="toggleTheme()" title="Toggle dark/light mode">&#9790;</button>
          <button class="pill" id="loginPill" onclick="window.location.href='/login'" style="display:none">Sign
            In</button>
          <button class="pill" id="logoutPill" onclick="logout()" style="display:none" title="Sign out">&#x2715; Sign
            out</button>
        </div>
      </div>

      <div class="messages" id="messages">
        <div class="welcome" id="welcome">
          <div class="welcome-icon">⚡</div>
          <h2>Hello, <span>Coder</span>.</h2>
          <p>I'm your AI-powered tech assistant. Ask me anything about code, debugging, architecture, or concepts.</p>

        </div>
      </div>

      <div class="input-area">
        <div class="input-wrap">
          <div class="input-row">
            <textarea id="userInput" rows="1" placeholder="Ask about code, debugging, algorithms, tools…"
              onkeydown="handleKey(event)" oninput="autoResize(this)"></textarea>
            <button class="send-btn" id="sendBtn" onclick="sendMessage()">➤</button>
          </div>
          <div class="input-hints">
            <span class="hint"><kbd>Enter</kbd> send</span>
            <span class="hint"><kbd>Shift+Enter</kbd> new line</span>
            <span class="hint">·</span>
            <span class="hint" id="statusHint" style="color:var(--accent3)">● RAG Active</span>
          </div>
        </div>
      </div>
    </main>

    <!-- COMPLEXITY ANALYZER -->
    <main class="complexity-area" id="complexityArea" style="display:none">
      <!-- Left: Input Panel -->
      <div class="cx-left">
        <div class="cx-topbar">
          <button class="mobile-menu-btn" onclick="toggleSidebar()">☰</button>
          <div class="cx-title">⚡ Complexity <span>Analyzer</span></div>
          <span style="font-size:11px;color:var(--muted);font-family:var(--font-mono)">DSA Mentor Mode</span>
        </div>
        <div class="cx-body">
          <div>
            <div class="cx-label">Select Language</div>
            <select class="cx-lang-select" id="cxLang">
              <option value="python">🐍 Python</option>
              <option value="javascript">🟨 JavaScript</option>
              <option value="java">☕ Java</option>
              <option value="c++">⚙ C++</option>
            </select>
          </div>
          <div style="flex:1;display:flex;flex-direction:column">
            <div class="cx-label">Paste Your Code</div>
            <textarea class="cx-code-input" id="cxCodeInput" placeholder="# Paste your code here...
# Example:
def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(i+1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []"></textarea>
          </div>
          <button class="cx-analyze-btn" id="cxAnalyzeBtn" onclick="analyzeComplexity()">
            ⚡ Analyze Complexity
          </button>
          <div style="font-size:11px;color:var(--muted);font-family:var(--font-mono);text-align:center;line-height:1.6">
            Detects: nested loops · recursion · DP · divide &amp; conquer<br>binary search · two pointers · sliding
            window · graphs
          </div>
        </div>
      </div>

      <!-- Right: Results Panel -->
      <div class="cx-right">
        <div class="cx-topbar" style="border-left:none">
          <div class="cx-title" style="color:var(--text)">Analysis <span>Results</span></div>
          <button class="pill" onclick="toggleComplexityMode()">✕ Close</button>
        </div>
        <div id="cxResults">
          <div class="cx-placeholder">
            <div class="cx-placeholder-icon">🔍</div>
            <h3>No Code Analyzed Yet</h3>
            <p>Paste your code on the left, select your language,<br>then click <strong>Analyze Complexity</strong>.</p>
          </div>
        </div>
      </div>
    </main>

    <!-- FLOW VISUALIZER -->
    <main class="flow-area" id="flowArea" style="display:none">
      <div class="flow-left">
        <div class="flow-header">
          <button class="mobile-menu-btn" onclick="toggleSidebar()">☰</button>
          <span>⚡</span> Flow Visualizer
        </div>
        <div style="font-size:12px; color:var(--muted); margin-bottom:12px">Paste your code below to generate an
          animated execution flowchart.</div>
        <textarea class="flow-code-input" id="flowCodeInput" placeholder="function example() {
  let x = 10;
  if (x > 5) {
    return true;
  }
  return false;
}"></textarea>
        <button class="flow-btn" id="generateFlowBtn" onclick="generateFlow()">Generate Flow</button>
      </div>
      <div class="flow-right">
        <div class="chat-topbar" style="border-bottom: 1px solid var(--border); background: var(--surface);">
          <div class="chat-title">Execution <span>Graph</span></div>
          <button class="pill" onclick="toggleFlowMode()">✕ Close</button>
        </div>
        <div class="mermaid-container" id="mermaidContainer">
          <div style="color:var(--muted); font-size:13px; text-align:center;">
            <div style="font-size:24px; margin-bottom:10px">📊</div>
            Graph will appear here
          </div>
        </div>
        <div class="flow-controls">
          <div class="controls-group">
            <button class="control-btn play-btn" id="playBtn" onclick="togglePlay()" disabled>▶ Play</button>
            <button class="control-btn" id="nextBtn" onclick="nextStep()" disabled>⏭ Next</button>
            <button class="control-btn" id="resetBtn" onclick="resetAnimation()" disabled>🔄 Reset</button>
          </div>
          <div class="controls-group">
            <span class="step-counter" id="stepCounter">Step: 0 / 0</span>
            <select class="speed-select" id="speedSelect" onchange="handleSpeedChange()">
              <option value="1500">Slow</option>
              <option value="800" selected>Normal</option>
              <option value="400">Fast</option>
            </select>
          </div>
        </div>
      </div>
    </main>

  </div>



  <script>
    // ── State ──
    let conversationHistory = [];
    let ragEnabled = true;
    let webEnabled = false;
    let isTyping = false;
    let isSidebarOpen = false;

    function toggleSidebar() {
      isSidebarOpen = !isSidebarOpen;
      const sidebar = document.querySelector('.sidebar');
      const overlay = document.getElementById('mobileOverlay');
      if (isSidebarOpen) {
        sidebar.classList.add('open');
        overlay.classList.add('open');
      } else {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
      }
    }

    // Backend base URL
    const BACKEND_URL = 'http://localhost:3001';

    // ── Auth helpers ─────────────────────────────────────────────────────────────
    function getToken() { return localStorage.getItem('cm_token'); }
    function getUser() { try { return JSON.parse(localStorage.getItem('cm_user')) || null; } catch { return null; } }
    function getAuthHeaders() {
      const t = getToken();
      return t ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` }
        : { 'Content-Type': 'application/json' };
    }

    function initAuth() {
      const user = getUser();
      const badge = document.getElementById('userBadge');
      const loginPill = document.getElementById('loginPill');
      const logoutPill = document.getElementById('logoutPill');

      if (user) {
        badge.style.display = 'flex';
        document.getElementById('userAvatar').textContent = (user.name || user.email || 'G')[0].toUpperCase();
        document.getElementById('userNameLabel').textContent = user.name || 'Guest';
        document.getElementById('userEmailLabel').textContent = user.email || '';
        if (user.id !== 'guest') { logoutPill.style.display = 'inline-flex'; }
        else { loginPill.style.display = 'inline-flex'; }
      } else {
        loginPill.style.display = 'inline-flex';
      }
    }

    function logout() {
      localStorage.removeItem('cm_token');
      localStorage.removeItem('cm_user');
      window.location.href = '/login';
    }

    // ── Theme toggle ─────────────────────────────────────────────────────────────
    function applyTheme() {
      const theme = localStorage.getItem('cm_theme') || 'dark';
      document.body.classList.toggle('light-mode', theme === 'light');
      const btn = document.getElementById('themePill');
      if (btn) btn.textContent = theme === 'light' ? '☀' : '☾';
    }

    function toggleTheme() {
      const current = localStorage.getItem('cm_theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('cm_theme', next);
      applyTheme();
    }

    // ── Agent badge ──────────────────────────────────────────────────────────────
    function updateAgentBadge(agent) {
      const badge = document.getElementById('agentBadge');
      if (!agent || !badge) return;
      badge.textContent = `${agent.emoji} ${agent.name}`;
      badge.style.color = agent.color || 'var(--accent)';
      badge.style.display = 'inline-flex';
    }

    // Load docs on page load
    window.addEventListener('DOMContentLoaded', () => {
      applyTheme();
      initAuth();
      checkBackendHealth();
      loadDocuments();
    });

    // ── Upload Modal ──────────────────────────────────────────────────────────
    function openUploadModal() {
      document.getElementById('uploadOverlay').classList.remove('hidden');
      resetDropZone();
    }
    function closeUploadModal() {
      document.getElementById('uploadOverlay').classList.add('hidden');
      document.getElementById('fileInput').value = '';
      resetDropZone();
    }
    function handleOverlayClick(e) {
      if (e.target.id === 'uploadOverlay') closeUploadModal();
    }
    function resetDropZone() {
      document.getElementById('dropIcon').textContent = '📄';
      document.getElementById('dropLabel').textContent = 'Drag & drop your file here';
      document.getElementById('uploadProgress').style.display = 'none';
      document.getElementById('progressFill').style.width = '0%';
      document.getElementById('dropZone').classList.remove('drag-over');
    }
    function handleDragOver(e) {
      e.preventDefault();
      document.getElementById('dropZone').classList.add('drag-over');
    }
    function handleDragLeave() {
      document.getElementById('dropZone').classList.remove('drag-over');
    }
    function handleDrop(e) {
      e.preventDefault();
      document.getElementById('dropZone').classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    }
    function handleFileSelect(e) {
      const file = e.target.files[0];
      if (file) uploadFile(file);
    }

    async function uploadFile(file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['pdf', 'txt'].includes(ext)) {
        showNotif('⚠ Only PDF and TXT files are supported.');
        return;
      }
      // Show progress
      const prog = document.getElementById('uploadProgress');
      const fill = document.getElementById('progressFill');
      const label = document.getElementById('progressLabel');
      const dropLabel = document.getElementById('dropLabel');
      const dropIcon = document.getElementById('dropIcon');

      dropIcon.textContent = '⏳';
      dropLabel.textContent = `Uploading ${file.name}…`;
      prog.style.display = 'block';
      fill.style.width = '30%';
      label.textContent = 'Sending to RAG service…';

      const formData = new FormData();
      formData.append('file', file);

      try {
        fill.style.width = '60%';
        const resp = await fetch(`${BACKEND_URL}/api/upload`, {
          method: 'POST',
          body: formData
        });
        fill.style.width = '90%';

        const data = await resp.json();
        if (!resp.ok || data.error) {
          throw new Error(data.error || 'Upload failed');
        }

        fill.style.width = '100%';
        dropIcon.textContent = '✅';
        dropLabel.textContent = `"${data.source}" indexed — ${data.indexed_chunks} chunks`;
        label.textContent = `Total in store: ${data.total_chunks} chunks`;
        showNotif(`✅ "${data.source}" uploaded & indexed!`);
        await loadDocuments();
        setTimeout(closeUploadModal, 2000);

      } catch (err) {
        dropIcon.textContent = '❌';
        dropLabel.textContent = `Error: ${err.message}`;
        fill.style.width = '100%';
        fill.style.background = '#f87171';
        label.textContent = 'Upload failed. Check that the RAG service is running.';
      }
    }

    // ── Document List ─────────────────────────────────────────────────────────
    async function loadDocuments() {
      try {
        const resp = await fetch(`${BACKEND_URL}/api/documents`);
        if (!resp.ok) return;
        const data = await resp.json();
        renderDocList(data.documents || []);
      } catch { /* RAG service offline — silent */ }
    }

    function renderDocList(docs) {
      const list = document.getElementById('docList');
      const count = document.getElementById('docCount');
      if (!docs.length) {
        list.innerHTML = '<div class="no-docs-hint" id="noDocsHint">No documents uploaded yet</div>';
        count.textContent = '';
        return;
      }
      count.textContent = `(${docs.length})`;
      const icons = { pdf: '📄', txt: '📝' };
      list.innerHTML = docs.map(d => `
      <div class="doc-item" title="${d.source}">
        <span>${d.source.endsWith('.pdf') ? '📄' : '📝'}</span>
        <span class="doc-item-name">${d.source}</span>
        <span class="doc-item-chunks">${d.chunks}c</span>
        <button class="doc-del-btn" onclick="deleteDoc('${d.source.replace(/'/g, "\\'")}')"
          title="Remove from RAG">✕</button>
      </div>
    `).join('');
    }

    async function deleteDoc(source) {
      if (!confirm(`Remove "${source}" from the knowledge base?`)) return;
      try {
        const resp = await fetch(`${BACKEND_URL}/api/documents/${encodeURIComponent(source)}`, {
          method: 'DELETE'
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Delete failed');
        showNotif(`🗑 "${source}" removed.`);
        await loadDocuments();
      } catch (err) {
        showNotif(`⚠ ${err.message}`);
      }
    }

    const RAG_DOCS = {
      js: `JavaScript Context: Use const/let not var. Prefer async/await over callbacks. Use optional chaining (?.) and nullish coalescing (??). Array methods: map, filter, reduce are preferred over loops.`,
      python: `Python Context: Follow PEP 8. Use type hints. Prefer list comprehensions. Use dataclasses or pydantic for data models. Virtual environments are essential.`,
      design: `System Design Context: Break large systems into microservices. Use event queues (Kafka/RabbitMQ) for async. CQRS separates read/write models. Design for failure with circuit breakers.`,
      security: `Security Context: Never store plain-text passwords (use bcrypt). Sanitize all inputs. Use parameterized queries to prevent SQL injection. JWT tokens should be short-lived.`
    };
    const searchHistoryList = [];

    // Check backend connectivity on load
    window.addEventListener('DOMContentLoaded', () => {
      checkBackendHealth();
    });

    // Check backend connectivity on load — only once (DOMContentLoaded is also registered above)
    function checkBackendHealth() {
      fetch(`${BACKEND_URL}/health`)
        .then(r => r.ok ? setConnStatus(true, '\u2713 Backend connected') : setConnStatus(false, '\u2717 Backend unreachable'))
        .catch(() => setConnStatus(false, '\u2717 Start the backend server (npm run dev)'));
    }

    function getModel() {
      return 'llama-3.3-70b-versatile';
    }

    // ── UI Helpers ──

    function showNotif(msg) {
      const n = document.createElement('div');
      n.className = 'notification'; n.textContent = msg;
      document.body.appendChild(n);
      setTimeout(() => n.remove(), 2500);
    }

    function autoResize(el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }

    function handleKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    }

    function toggleRag() {
      ragEnabled = !ragEnabled;
      const pill = document.getElementById('ragPill');
      pill.className = ragEnabled ? 'pill active' : 'pill';
      updateStatusHint();
      showNotif(ragEnabled ? '🗂 RAG context enabled' : '🗂 RAG context disabled');
    }

    function updateStatusHint() {
      const h = document.getElementById('statusHint');
      const parts = [];
      if (ragEnabled) parts.push('RAG Active');
      h.textContent = parts.length ? '● ' + parts.join(' · ') : '○ Basic mode';
      h.style.color = parts.length ? 'var(--accent3)' : 'var(--muted)';
    }

    function toggleDoc(card) {
      card.classList.toggle('active');
      const tag = card.querySelector('.doc-tag');
      if (card.classList.contains('active')) tag.textContent = 'Injected';
      else tag.textContent = 'Off';
    }

    function newChat() {
      if (window.innerWidth <= 768 && isSidebarOpen) toggleSidebar();
      conversationHistory = [];
      const msgs = document.getElementById('messages');
      msgs.innerHTML = `<div class="welcome" id="welcome">
      <div class="welcome-icon">⚡</div>
      <h2>Hello, <span>Coder</span>.</h2>
      <p>I'm your AI-powered tech assistant. Ask me anything about code, debugging, architecture, or concepts.</p>
    </div>`;
      const list = document.getElementById('historyList');
      const items = list.querySelectorAll('.history-item');
      items.forEach(i => i.classList.remove('active'));
      const item = document.createElement('div');
      item.className = 'history-item active';
      item.innerHTML = '<span class="dot"></span>New conversation';
      list.insertBefore(item, list.firstChild);
    }

    function sendSuggestion(el) {
      const text = el.querySelector('strong').textContent + ': ' + el.textContent.replace(el.querySelector('strong').textContent, '').trim();
      document.getElementById('userInput').value = text;
      sendMessage();
    }

    // ── Core Chat ──
    function appendMsg(role, content, tags = []) {
      const welcome = document.getElementById('welcome');
      if (welcome) welcome.remove();
      const msgs = document.getElementById('messages');

      const div = document.createElement('div');
      div.className = `msg ${role}`;

      const avatar = role === 'ai' ? '⚡' : '👤';
      const name = role === 'ai' ? 'CodeMind' : 'You';
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let tagsHtml = tags.map(t =>
        `<span class="msg-tag ${t.cls}">${t.text}</span>`
      ).join('');

      div.innerHTML = `
      <div class="msg-avatar">${avatar}</div>
      <div class="msg-body">
        <div class="msg-meta">${name} <span style="opacity:.4">·</span> ${time} ${tagsHtml}</div>
        <div class="msg-bubble" id="bubble-${Date.now()}">${formatContent(content)}</div>
      </div>`;
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
      return div;
    }

    function formatContent(text) {
      const codeBlocks = [];
      text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        const l = lang || 'code';
        const runnable = ['python', 'py', 'javascript', 'js'].includes(l.toLowerCase());
        const normLang = (l === 'py' || l === 'python') ? 'python' : 'javascript';
        const runBtn = runnable
          ? `<button class="run-btn" onclick="runCode(this,'${normLang}')">&#9654; Run</button>`
          : '';
        const blockHTML = `<div class="code-block-wrap">
        <div class="code-header"><span>${l}</span><div style="display:flex;gap:8px;align-items:center">${runBtn}<button class="copy-btn" onclick="copyCode(this)">&#10088; Copy</button></div></div>
        <pre><code>${escHtml(code.trim())}</code></pre>
      </div>`;
        codeBlocks.push(blockHTML);
        return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
      });

      text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
      text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      text = text.replace(/\n/g, '<br>');

      text = text.replace(/__CODE_BLOCK_(\d+)__/g, (_, i) => codeBlocks[parseInt(i)]);
      return text;
    }

    function escHtml(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function copyCode(btn) {
      const code = btn.closest('.code-block-wrap').querySelector('code').textContent;
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = '\u2713 Copied'; setTimeout(() => btn.textContent = '\u2388 Copy', 1500);
      });
    }

    async function runCode(btn, lang) {
      const wrap = btn.closest('.code-block-wrap');
      const code = wrap.querySelector('code').textContent;
      const language = (lang === 'py' || lang === 'python') ? 'python' : 'javascript';
      const old = wrap.querySelector('.code-output');
      if (old) old.remove();
      const out = document.createElement('div');
      out.className = 'code-output running';
      out.innerHTML = '<span class="output-label">Running...</span>';
      wrap.appendChild(out);
      btn.disabled = true; btn.textContent = '...';
      try {
        const resp = await fetch(`${BACKEND_URL}/api/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, language })
        });
        const data = await resp.json();

        if (data.success) {
          out.className = 'code-output success';
          out.innerHTML = `<span class="output-label">\u2713 Output</span><pre class="output-content">${escHtml(data.output || '')}</pre>`;
        } else {
          out.className = 'code-output error';
          const errorText = data.error || data.output || 'Unknown error occurred.';
          out.innerHTML = `<span class="output-label">\u2717 Error</span><pre class="output-content">${escHtml(errorText)}</pre>`;
        }
      } catch (err) {
        out.className = 'code-output error';
        out.innerHTML = '<span class="output-label">\u2717 Error</span><pre class="output-content">Could not reach backend server.</pre>';
      }
      btn.disabled = false; btn.textContent = '\u25b6 Run';
    }

    // ── Build System Prompt with RAG ──
    function buildSystemPrompt() {
      let sys = `You are CodeMind, an elite AI coding assistant. You specialize in helping developers debug, architect, and write high-quality code.

When answering:
- Provide working, production-ready code examples
- Explain concepts clearly with technical depth
- Use markdown code blocks with language tags
- Suggest best practices and potential pitfalls
- Be concise but thorough`;

      if (ragEnabled) {
        const activeDocs = document.querySelectorAll('.doc-card.active');
        const docNames = [...activeDocs].map(d => d.querySelector('.doc-name').textContent);
        let ragContext = '\n\n--- RETRIEVED CONTEXT (RAG) ---\n';
        if (docNames.includes('JavaScript Reference')) ragContext += RAG_DOCS.js + '\n';
        if (docNames.includes('Python Best Practices')) ragContext += RAG_DOCS.python + '\n';
        if (docNames.includes('System Design Patterns')) ragContext += RAG_DOCS.design + '\n';
        if (docNames.includes('Security Checklist')) ragContext += RAG_DOCS.security + '\n';
        ragContext += '--- END CONTEXT ---';
        sys += ragContext;
      }
      return sys;
    }

    // ── Core Chat – SSE Streaming ──
    async function sendMessage() {
      if (isTyping) return;
      const input = document.getElementById('userInput');
      const text = input.value.trim();
      if (!text) return;

      input.value = ''; input.style.height = 'auto';
      document.getElementById('sendBtn').disabled = true;
      isTyping = true;

      const histItems = document.getElementById('historyList').querySelectorAll('.history-item');
      if (histItems[0]) histItems[0].innerHTML = `<span class="dot"></span>${text.slice(0, 28)}${text.length > 28 ? '\u2026' : ''}`;

      const tags = [];
      if (ragEnabled) tags.push({ cls: 'tag-rag', text: '\ud83d\uddc2 RAG' });

      appendMsg('user', text);
      conversationHistory.push({ role: 'user', content: text });
      searchHistoryList.unshift(text.slice(0, 40));

      const welcome = document.getElementById('welcome');
      if (welcome) welcome.remove();
      const msgs = document.getElementById('messages');
      const aiDiv = document.createElement('div');
      aiDiv.className = 'msg ai';
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const tagsHtml = tags.map(t => `<span class="msg-tag ${t.cls}">${t.text}</span>`).join('');
      const bubbleId = 'bubble-' + Date.now();
      aiDiv.innerHTML = `
      <div class="msg-avatar">\u26a1</div>
      <div class="msg-body">
        <div class="msg-meta">CodeMind <span style="opacity:.4">\u00b7</span> ${time} ${tagsHtml}</div>
        <div class="msg-bubble" id="${bubbleId}"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>
      </div>`;
      msgs.appendChild(aiDiv);
      msgs.scrollTop = msgs.scrollHeight;
      const bubble = document.getElementById(bubbleId);

      try {
        const resp = await fetch(`${BACKEND_URL}/api/chat/stream`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            userMessage: text,
            history: conversationHistory.slice(0, -1),
            model: getModel(),
            systemPrompt: buildSystemPrompt(),
            temperature: 0.3,
            maxTokens: 1024,
            ragEnabled,
          })
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          bubble.innerHTML = formatContent(`⚠ **Error:** ${err.error || 'Backend error'}`);
        } else {
          const reader = resp.body.getReader();
          const decoder = new TextDecoder();
          let sseBuffer = '';
          let fullContent = '';
          bubble.innerHTML = '<span class="stream-cursor"></span>';

          outer: while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split('\n');
            sseBuffer = lines.pop();
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              try {
                const evt = JSON.parse(line.slice(6));
                if (evt.type === 'meta') {
                  // Update agent badge from server-side routing decision
                  if (evt.agent) updateAgentBadge(evt.agent);
                } else if (evt.type === 'text') {
                  fullContent += evt.content;
                  bubble.innerHTML = formatContent(fullContent) + '<span class="stream-cursor"></span>';
                  msgs.scrollTop = msgs.scrollHeight;
                } else if (evt.type === 'done') {
                  bubble.innerHTML = formatContent(fullContent);
                  conversationHistory.push({ role: 'assistant', content: fullContent });
                  break outer;
                } else if (evt.type === 'error') {
                  bubble.innerHTML = formatContent(`⚠ ${evt.error}`);
                  break outer;
                }
              } catch { /* malformed SSE line, skip */ }
            }
          }
        }

      } catch (err) {
        bubble.innerHTML = formatContent('⚠ **Cannot reach backend.**\n\nMake sure the Express server is running:\n```bash\ncd backend && npm start\n```');
      }

      isTyping = false;
      document.getElementById('sendBtn').disabled = false;
      document.getElementById('userInput').focus();
    }



    // ── Flow Visualizer Logic ──
    let flowSteps = [];
    let currentStepIndex = 0;
    let animationInterval = null;
    let isPlaying = false;
    let lastValidMermaid = null;
    let lastValidSteps = null;

    function toggleFlowMode() {
      if (window.innerWidth <= 768 && isSidebarOpen) toggleSidebar();
      const chatArea = document.getElementById('chatArea');
      const flowArea = document.getElementById('flowArea');
      const cxArea = document.getElementById('complexityArea');

      const flowVisible = flowArea.style.display !== 'none';

      // Hide everything first
      chatArea.style.display = 'none';
      flowArea.style.display = 'none';
      cxArea.style.display = 'none';

      if (flowVisible) {
        // Was open → close it, return to chat
        chatArea.style.display = 'flex';
      } else {
        // Was closed → open it
        flowArea.style.display = 'flex';
      }
    }

    function cleanMermaid(code) {
      return code
        .replace(/```mermaid/gi, "")
        .replace(/`/g, "")
        .replace(/\r/g, "")
        .replace(/graph TD\s*/i, "graph TD\n")
        .replace(/[^a-zA-Z0-9\[\]{}\->|\s\n]/g, "")
        .trim();
    }

    function isValidMermaid(code) {
      return code.startsWith("graph TD") && code.includes("-->");
    }

    async function generateFlow(isRetry = false) {
      const code = document.getElementById('flowCodeInput').value.trim();
      if (!code) { showNotif('⚠ Please enter some code first.'); return; }

      const btn = document.getElementById('generateFlowBtn');
      btn.disabled = true;
      btn.textContent = isRetry ? 'Retrying...' : 'Generating...';

      try {
        const resp = await fetch(`${BACKEND_URL}/api/flow/generate`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ code, isRetry })
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to generate flow');
        }

        const data = await resp.json();
        if (!data.mermaid || !data.steps) throw new Error('Invalid response format from AI');

        const cleanedMermaid = cleanMermaid(data.mermaid);
        if (!isValidMermaid(cleanedMermaid)) {
          if (!isRetry) {
            console.warn('Invalid mermaid syntax detected. Auto-retrying...');
            return generateFlow(true);
          }
          throw new Error('Validation failed after retry.');
        }

        await renderFlow(cleanedMermaid, data.steps);
        showNotif('✅ Flowchart generated successfully!');
      } catch (err) {
        showNotif(`⚠ Error: ${err.message}`);
        if (!lastValidMermaid) {
          renderFallback();
        } else {
          showErrorOverlay();
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Generate Flow';
      }
    }

    async function renderFlow(mermaidCode, steps, isFallback = false) {
      flowSteps = steps;
      currentStepIndex = -1;
      pauseAnimation();

      const container = document.getElementById('mermaidContainer');
      const previousHTML = container.innerHTML;

      const graphId = 'flowGraph_' + Date.now();
      container.innerHTML = `<div class="mermaid" id="${graphId}">${mermaidCode}</div>`;

      try {
        await mermaid.run({
          querySelector: '.mermaid'
        });

        document.getElementById('playBtn').disabled = false;
        document.getElementById('nextBtn').disabled = false;
        document.getElementById('resetBtn').disabled = false;
        updateControlsUI();

        if (!isFallback) {
          lastValidMermaid = mermaidCode;
          lastValidSteps = steps;
        }
      } catch (err) {
        if (lastValidMermaid) {
          container.innerHTML = previousHTML;
          flowSteps = lastValidSteps;
          showErrorOverlay();
        } else {
          renderFallback();
        }
      }
    }

    function renderFallback() {
      const fallbackMermaid = `graph TD\nA[Start] --> B[Processing]\nB --> C[End]`;
      const fallbackSteps = ['A', 'B', 'C'];
      renderFlow(fallbackMermaid, fallbackSteps, true).then(() => {
        showErrorOverlay();
      });
    }

    function showErrorOverlay() {
      const container = document.getElementById('mermaidContainer');
      const existing = container.querySelector('.error-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.className = 'error-overlay';
      overlay.style.cssText = "position:absolute; top:20px; left:50%; transform:translateX(-50%); background:var(--surface2); border:1px solid #f87171; padding:15px 20px; text-align:center; border-radius:10px; z-index:10; box-shadow:0 10px 25px rgba(0,0,0,0.5);";
      overlay.innerHTML = `
      <div style="font-size:20px; margin-bottom:5px; color:#f87171">⚠ AI Syntax Error</div>
      <div style="font-size:12px; color:var(--text); margin-bottom:15px;">The generated flow was invalid.</div>
      <button class="flow-btn" onclick="this.parentElement.remove(); generateFlow(true)" style="padding:8px 16px; font-size:12px; width:auto;">Retry Generating Flow</button>
      <button class="pill" onclick="this.parentElement.remove()" style="margin-left:8px;">Dismiss</button>
    `;
      container.style.position = 'relative';
      container.appendChild(overlay);
    }

    function updateControlsUI() {
      const playBtn = document.getElementById('playBtn');
      playBtn.innerHTML = isPlaying ? '⏸ Pause' : '▶ Play';
      document.getElementById('stepCounter').textContent = `Step: ${Math.max(0, currentStepIndex + 1)} / ${flowSteps.length}`;
    }

    function highlightNode(nodeId) {
      document.querySelectorAll('.active-node').forEach(el => el.classList.remove('active-node'));

      if (nodeId) {
        // Mermaid IDs usually start with 'flowchart-' and end with '-' + node_id
        // We will look for groups that contain the nodeId in their id attribute
        const nodes = document.querySelectorAll('.node');
        let found = false;
        nodes.forEach(n => {
          // e.g. flowchart-A-41 -> n.id includes '-A-' or ends with '-A'
          if (n.id.includes(`-${nodeId}-`) || n.id.endsWith(`-${nodeId}`) || n.id === nodeId) {
            n.classList.add('active-node');
            found = true;
            n.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          }
        });

        if (!found) {
          // Fallback generic search
          const fallbackNode = document.querySelector(`[id*="${nodeId}"]`);
          if (fallbackNode) {
            fallbackNode.classList.add('active-node');
            fallbackNode.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          }
        }
      }
    }

    function nextStep() {
      if (currentStepIndex >= flowSteps.length - 1) {
        pauseAnimation();
        return;
      }
      currentStepIndex++;
      highlightNode(flowSteps[currentStepIndex]);
      updateControlsUI();
    }

    function togglePlay() {
      if (isPlaying) {
        pauseAnimation();
      } else {
        if (currentStepIndex >= flowSteps.length - 1) {
          resetAnimation();
        }
        isPlaying = true;
        updateControlsUI();
        const speed = parseInt(document.getElementById('speedSelect').value, 10);
        nextStep();
        animationInterval = setInterval(nextStep, speed);
      }
    }

    function pauseAnimation() {
      isPlaying = false;
      clearInterval(animationInterval);
      updateControlsUI();
    }

    function resetAnimation() {
      pauseAnimation();
      currentStepIndex = -1;
      highlightNode(null);
      updateControlsUI();
      const container = document.getElementById('mermaidContainer');
      container.scrollTo(0, 0);
    }

    function handleSpeedChange() {
      if (isPlaying) {
        pauseAnimation();
        togglePlay();
      }
    }

    // ── Complexity Analyzer ────────────────────────────────────────────────────

    function toggleComplexityMode() {
      if (window.innerWidth <= 768 && isSidebarOpen) toggleSidebar();
      const chatArea = document.getElementById('chatArea');
      const flowArea = document.getElementById('flowArea');
      const cxArea = document.getElementById('complexityArea');

      if (cxArea.style.display === 'none') {
        // Show complexity, hide others
        chatArea.style.display = 'none';
        flowArea.style.display = 'none';
        cxArea.style.display = 'flex';
      } else {
        chatArea.style.display = 'flex';
        cxArea.style.display = 'none';
      }
    }

    async function analyzeComplexity() {
      const code = document.getElementById('cxCodeInput').value.trim();
      const lang = document.getElementById('cxLang').value;
      const btn = document.getElementById('cxAnalyzeBtn');
      const results = document.getElementById('cxResults');

      if (!code) {
        showNotif('⚠ Please paste some code to analyze.');
        return;
      }

      // Show loading state
      btn.disabled = true;
      btn.textContent = '⏳ Analyzing...';
      results.innerHTML = `
        <div class="cx-loading">
          <div class="cx-spinner"></div>
          <p>🤖 AI is analyzing your code as a FAANG interviewer would...</p>
        </div>`;

      try {
        const resp = await fetch(`${BACKEND_URL}/api/complexity/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, language: lang })
        });

        const data = await resp.json();

        if (!resp.ok || !data.success) {
          throw new Error(data.error || 'Analysis failed. Please try again.');
        }

        renderComplexityResult(data.analysis, lang);
        showNotif('✅ Complexity analysis complete!');

      } catch (err) {
        results.innerHTML = `
          <div class="cx-result-area">
            <div class="cx-error-msg">
              ⚠ <strong>Analysis Failed</strong><br><br>
              ${escHtml(err.message || 'Unable to analyze complexity. Please check your code syntax.')}
              <br><br>
              <span style="opacity:0.7">Make sure the backend server is running and your code is valid.</span>
            </div>
          </div>`;
      } finally {
        btn.disabled = false;
        btn.innerHTML = '⚡ Analyze Complexity';
      }
    }

    function renderComplexityResult(a, lang) {
      const results = document.getElementById('cxResults');

      // Better approach code block (if available)
      const betterCodeBlock = (a.betterApproach && a.betterApproach.exists && a.betterApproach.code)
        ? `<div class="cx-block" style="border-color:rgba(16,185,129,0.25)">
            <div class="cx-block-title" style="color:#10b981">
              <span class="cx-dot" style="background:#10b981"></span>
              Optimized Approach
            </div>
            <p style="margin-bottom:10px">${escHtml(a.betterApproach.explanation || '')}</p>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:10px;color:var(--muted);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px">${(a.betterApproach.language || lang).toUpperCase()}</span>
              <button class="copy-btn" onclick="cxCopyCode(this)" style="font-size:11px">⎘ Copy</button>
            </div>
            <pre class="cx-code-block">${escHtml(a.betterApproach.code)}</pre>
           </div>`
        : (a.isAlreadyOptimal
          ? `<div class="cx-optimal-badge" style="margin:0">✅ This code is already optimal! No better approach needed.</div>`
          : '');

      // Interview tips
      const tips = Array.isArray(a.interviewTips) && a.interviewTips.length
        ? `<div class="cx-block" style="border-color:rgba(0,229,255,0.2)">
            <div class="cx-block-title" style="color:#00e5ff">
              <span class="cx-dot" style="background:#00e5ff"></span>
              🎯 Interview Tips
            </div>
            <ul>${a.interviewTips.map(t => `<li>${escHtml(t)}</li>`).join('')}</ul>
           </div>`
        : '';

      // Common mistakes
      const mistakes = Array.isArray(a.commonMistakes) && a.commonMistakes.length
        ? `<div class="cx-block" style="border-color:rgba(248,113,113,0.2)">
            <div class="cx-block-title" style="color:#f87171">
              <span class="cx-dot" style="background:#f87171"></span>
              ⚠ Common Mistakes
            </div>
            <ul>${a.commonMistakes.map(m => `<li>${escHtml(m)}</li>`).join('')}</ul>
           </div>`
        : '';

      results.innerHTML = `
        <div class="cx-result-area">

          <!-- Header tags -->
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            ${a.dsaCategory ? `<span class="cx-tag blue">${escHtml(a.dsaCategory)}</span>` : ''}
            ${a.algorithmPattern ? `<span class="cx-tag">${escHtml(a.algorithmPattern)}</span>` : ''}
            ${a.isAlreadyOptimal ? `<span class="cx-tag green">✓ Already Optimal</span>` : ''}
          </div>

          <!-- Big O Cards -->
          <div class="cx-bigo-row">
            <div class="cx-bigo-card time">
              <div class="cx-bigo-label">⏱ Time Complexity</div>
              <div class="cx-bigo-value">${escHtml(a.timeComplexity || '—')}</div>
              <div class="cx-bigo-sub">Big O Notation</div>
            </div>
            <div class="cx-bigo-card space">
              <div class="cx-bigo-label">💾 Space Complexity</div>
              <div class="cx-bigo-value">${escHtml(a.spaceComplexity || '—')}</div>
              <div class="cx-bigo-sub">Auxiliary Space</div>
            </div>
          </div>

          <!-- Brute vs Optimal comparison -->
          ${(a.bruteForceComplexity || a.optimalComplexity) ? `
          <div>
            <div class="cx-label" style="margin-bottom:10px">📊 Complexity Comparison</div>
            <div class="cx-compare-row">
              <div class="cx-compare-card brute">
                <div class="cx-compare-label">🐌 Brute Force</div>
                <div class="cx-compare-val">${escHtml(a.bruteForceComplexity || a.timeComplexity || '—')}</div>
                <div style="font-size:11px;color:var(--muted);margin-top:4px;font-family:var(--font-mono)">Time</div>
              </div>
              <div class="cx-compare-card optimal">
                <div class="cx-compare-label">🚀 Optimal</div>
                <div class="cx-compare-val">${escHtml(a.optimalComplexity || a.timeComplexity || '—')}</div>
                <div style="font-size:11px;color:var(--muted);margin-top:4px;font-family:var(--font-mono)">Time</div>
              </div>
            </div>
          </div>` : ''}

          <!-- Why these complexities -->
          <div class="cx-block">
            <div class="cx-block-title" style="color:#f59e0b">
              <span class="cx-dot" style="background:#f59e0b"></span>
              Why This Time Complexity?
            </div>
            <p>${escHtml(a.timeReason || 'No explanation available.')}</p>
          </div>

          <div class="cx-block">
            <div class="cx-block-title" style="color:#00e5ff">
              <span class="cx-dot" style="background:#00e5ff"></span>
              Why This Space Complexity?
            </div>
            <p>${escHtml(a.spaceReason || 'No explanation available.')}</p>
          </div>

          <!-- Optimization Suggestion -->
          ${a.optimizationSuggestion ? `
          <div class="cx-block" style="border-color:rgba(245,158,11,0.25)">
            <div class="cx-block-title" style="color:#f59e0b">
              <span class="cx-dot" style="background:#f59e0b"></span>
              💡 Optimization Suggestion
            </div>
            <p>${escHtml(a.optimizationSuggestion)}</p>
          </div>` : ''}

          <!-- Better Approach Code -->
          ${betterCodeBlock}

          <!-- Interview Tips -->
          ${tips}

          <!-- Common Mistakes -->
          ${mistakes}

        </div>`;
    }

    function cxCopyCode(btn) {
      const code = btn.closest('.cx-block').querySelector('.cx-code-block').textContent;
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = '✓ Copied';
        setTimeout(() => btn.textContent = '⎘ Copy', 1500);
      });
    }

  