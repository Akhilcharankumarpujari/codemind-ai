// ── GLOBAL STATE & SELF-HEALING API WRAPPERS ──
(function() {
  const BACKEND_URL = window.location.port === '3001'
    ? ''
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.'))
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : '';

  window.AuthApi = window.AuthApi || {
    async getMe() {
      const resp = await fetch(`${BACKEND_URL}/api/auth/me`, { credentials: 'include' });
      if (!resp.ok) throw new Error('Not authenticated');
      return resp.json();
    },
    async login(email, password) {
      const resp = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });
      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || 'Login failed');
      }
      return resp.json();
    },
    async register(email, password, name) {
      const resp = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
        credentials: 'include'
      });
      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || 'Registration failed');
      }
      return resp.json();
    },
    async logout() {
      const resp = await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!resp.ok) throw new Error('Logout failed');
      return resp.json();
    }
  };

  window.ChatbotApi = window.ChatbotApi || {
    async listDocuments() {
      const resp = await fetch(`${BACKEND_URL}/api/documents`, { credentials: 'include' });
      if (!resp.ok) throw new Error('Failed to load documents');
      return resp.json();
    },
    async uploadFile(formData) {
      const resp = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      return resp.json();
    },
    async deleteDocument(source) {
      const resp = await fetch(`${BACKEND_URL}/api/documents/${encodeURIComponent(source)}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Delete failed');
      }
      return resp.json();
    },
    async executeCode(code, language) {
      const resp = await fetch(`${BACKEND_URL}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
        credentials: 'include'
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Execution failed');
      }
      return resp.json();
    },
    async checkHealth() {
      const resp = await fetch(`${BACKEND_URL}/health`);
      if (!resp.ok) throw new Error('Unhealthy');
      return resp.json();
    },
    async sendChatMessageStream(chatBody, onMeta, onText, onDone, onError) {
      try {
        console.log('[ChatbotApi] Sending chat stream request...', chatBody);
        const resp = await fetch(`${BACKEND_URL}/api/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chatBody),
          credentials: 'include'
        });
        console.log('[ChatbotApi] Received response headers. Status:', resp.status);
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          console.error('[ChatbotApi] Error response received:', err);
          onError(err.error || 'Error streaming response');
          return;
        }
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = '';
        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('[ChatbotApi] Reader finished reading stream.');
            break;
          }
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop();
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith('data: ')) continue;
            try {
              const evt = JSON.parse(trimmedLine.slice(6).trim());
              console.log('[ChatbotApi] SSE event received:', evt.type);
              if (evt.type === 'meta') {
                onMeta(evt);
              } else if (evt.type === 'text') {
                onText(evt.content);
              } else if (evt.type === 'done') {
                console.log('[ChatbotApi] SSE Stream completed (done event).');
                onDone();
                break outer;
              } else if (evt.type === 'error') {
                console.error('[ChatbotApi] SSE Stream error event:', evt.error);
                onError(evt.error);
                break outer;
              }
            } catch (e) {
              console.error('Error parsing SSE line:', e, 'Raw line:', line);
            }
          }
        }
      } catch (err) {
        console.error('[ChatbotApi] Network/fetch error caught:', err);
        onError(err.message || 'Cannot reach backend');
      }
    }
  };

  window.VisualizerApi = window.VisualizerApi || {
    async analyzeCode(code, mode) {
      const resp = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, mode: mode === 'auto' ? undefined : mode }),
        credentials: 'include'
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Code analysis failed');
      }
      return resp.json();
    },
    async analyzeComplexity(code, language) {
      const resp = await fetch(`${BACKEND_URL}/api/complexity/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
        credentials: 'include'
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Complexity analysis failed');
      }
      return resp.json();
    },
    async generateFlowGraph(code, isRetry, customInput) {
      const resp = await fetch(`${BACKEND_URL}/api/flow/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, isRetry, customInput }),
        credentials: 'include'
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate flow graph');
      }
      return resp.json();
    },
    async runDryRun(code, input) {
      const resp = await fetch(`${BACKEND_URL}/api/flow/dryrun`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, input }),
        credentials: 'include'
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Dry run failed');
      }
      return resp.json();
    }
  };
})();

let conversationHistory = [];
let ragEnabled = true;
let webEnabled = false;
let isTyping = false;

// ── GET LOGGED IN USER ──
function getUser() {
  try {
    return JSON.parse(localStorage.getItem('cm_user')) || null;
  } catch {
    return null;
  }
}

function getAuthHeaders() {
  return { 'Content-Type': 'application/json' };
}

async function checkSession() {
  try {
    const data = await window.AuthApi.getMe();
    localStorage.setItem('cm_user', JSON.stringify(data.user));
    initAuth();
  } catch (err) {
    console.error('[Auth] Failed to verify session:', err);
    localStorage.removeItem('cm_user');
    window.location.href = '/login';
  }
}

function initAuth() {
  const user = getUser();
  const badge = document.getElementById('userBadge');
  const loginPill = document.getElementById('loginPill');
  const logoutPill = document.getElementById('logoutPill');

  if (badge) badge.style.display = 'none';
  if (loginPill) loginPill.style.display = 'none';
  if (logoutPill) logoutPill.style.display = 'none';

  if (user) {
    if (badge) badge.style.display = 'flex';
    const avatar = document.getElementById('userAvatar');
    const nameLabel = document.getElementById('userNameLabel');
    const emailLabel = document.getElementById('userEmailLabel');
    
    if (avatar) avatar.textContent = (user.name || user.email || 'G')[0].toUpperCase();
    if (nameLabel) nameLabel.textContent = user.name || 'Guest';
    if (emailLabel) emailLabel.textContent = user.email || '';
    
    if (user.id !== 'guest') {
      if (logoutPill) logoutPill.style.display = 'inline-flex';
    } else {
      if (loginPill) loginPill.style.display = 'inline-flex';
    }
  } else {
    if (loginPill) loginPill.style.display = 'inline-flex';
  }
}

async function logout() {
  try {
    await window.AuthApi.logout();
  } catch (e) {}
  localStorage.removeItem('cm_user');
  window.location.href = '/login';
}

// ── THEME SWITCHER ──
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

// ── AGENT DELEGATION BADGES ──
function updateAgentBadge(agent) {
  const badge = document.getElementById('agentBadge');
  if (!agent || !badge) return;
  badge.textContent = `${agent.emoji} ${agent.name}`;
  badge.style.color = agent.color || 'var(--accent)';
  badge.style.display = 'inline-flex';
}

// ── ON INITIALIZE ──
window.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  checkSession();
  checkBackendHealth();
  loadDocuments();
  setupZoomPan();
  
  document.querySelectorAll('.history-item, .nav-item').forEach((el, i) => {
    el.style.animationDelay = (i * 0.05) + 's';
    el.style.animation = 'fadeSlideUp 0.4s both';
  });
});

function checkBackendHealth() {
  window.ChatbotApi.checkHealth()
    .then(() => setConnStatus(true, 'CodeMind Ready'))
    .catch(() => setConnStatus(false, 'Backend offline'));
}

function setConnStatus(ok, msg) {
  const h = document.getElementById('activemodelLabel');
  if (h) {
    h.textContent = msg;
    const dot = h.previousElementSibling;
    if (dot) {
      dot.style.background = ok ? 'var(--accent3)' : '#f87171';
      dot.style.boxShadow = ok ? '0 0 6px var(--accent3)' : '0 0 6px #f87171';
    }
  }
}

function getModel() {
  return 'llama-3.3-70b-versatile';
}

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
  if (pill) pill.className = ragEnabled ? 'pill active' : 'pill';
  updateStatusHint();
  showNotif(ragEnabled ? '🗂 RAG context enabled' : '🗂 RAG context disabled');
}

function updateStatusHint() {
  const h = document.getElementById('statusHint');
  if (!h) return;
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

// ── CONVERSATION MANAGEMENT ──
function newChat() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('mobileOverlay');
  if (window.innerWidth <= 600) {
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }

  conversationHistory = [];
  const msgs = document.getElementById('messages');
  msgs.innerHTML = `<div class="welcome" id="welcome">
    <div class="hero-logo-wrapper">
      <div class="welcome-icon">
        <img src="/assets/images/logo.png" alt="CodeMind AI Logo">
      </div>
    </div>
    <h2>Hello, <span>Coder</span>.</h2>
    <p>I'm your AI-powered Coding Assistant. Ask me about Data Structures, Algorithms, problem solving, dry runs, and coding preparation.</p>
  </div>`;
  
  const list = document.getElementById('historyList');
  if (list) {
    const items = list.querySelectorAll('.history-item');
    items.forEach(i => i.classList.remove('active'));
    const item = document.createElement('div');
    item.className = 'history-item active';
    item.innerHTML = '<span class="dot"></span>New conversation';
    list.insertBefore(item, list.firstChild);
  }
}

function sendSuggestion(el) {
  const strong = el.querySelector('strong');
  const text = strong ? strong.textContent + ': ' + el.textContent.replace(strong.textContent, '').trim() : el.textContent.trim();
  const input = document.getElementById('userInput');
  if (input) {
    input.value = text;
    sendMessage();
  }
}

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
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function copyCode(btn) {
  const code = btn.closest('.code-block-wrap').querySelector('code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<span style="color:var(--accent3);">✓ Copied</span>';
    btn.style.boxShadow = '0 0 10px rgba(16,185,129,0.2)';
    setTimeout(() => {
      btn.innerHTML = originalHtml;
      btn.style.boxShadow = 'none';
    }, 1500);
  });
}

// ── SANDBOX EXECUTION ──
async function runCode(btn, lang) {
  const wrap = btn.closest('.code-block-wrap');
  const code = wrap.querySelector('code').textContent;
  const old = wrap.querySelector('.code-output');
  if (old) old.remove();

  const out = document.createElement('div');
  out.className = 'code-output running';
  out.innerHTML = '<span class="output-label">Running...</span>';
  wrap.appendChild(out);
  btn.disabled = true;
  btn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite;">⚙</span> Running';
  
  try {
    const data = await window.ChatbotApi.executeCode(code, lang);
    if (data.success) {
      out.className = 'code-output success';
      out.innerHTML = `<span class="output-label">\u2713 Output</span><pre class="output-content">${escHtml(data.output || '')}</pre>`;
    } else {
      out.className = 'code-output error';
      out.innerHTML = `<span class="output-label">\u2717 Error</span><pre class="output-content">${escHtml(data.error || data.output || 'Unknown error occurred.')}</pre>`;
    }
  } catch (err) {
    out.className = 'code-output error';
    out.innerHTML = `<span class="output-label">\u2717 Error</span><pre class="output-content">${escHtml(err.message)}</pre>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '\u25b6 Run';
  }
}

// ── SYSTEM PROMPTS ──
const RAG_DOCS = {
  js: `JavaScript Context: Use const/let not var. Prefer async/await over callbacks. Use optional chaining (?.) and nullish coalescing (??). Array methods: map, filter, reduce are preferred over loops.`,
  python: `Python Context: Follow PEP 8. Use type hints. Prefer list comprehensions. Use dataclasses or pydantic for data models. Virtual environments are essential.`,
  design: `System Design Context: Break large systems into microservices. Use event queues (Kafka/RabbitMQ) for async. CQRS separates read/write models. Design for failure with circuit breakers.`,
  security: `Security Context: Never store plain-text passwords (use bcrypt). Sanitize all inputs. Use parameterized queries to prevent SQL injection. JWT tokens should be short-lived.`
};

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

// ── SEND MESSAGES WITH STREAMING ──
async function sendMessage() {
  if (isTyping) return;
  const input = document.getElementById('userInput');
  const text = input.value.trim();
  if (!text && !attachedFile) return;

  let finalMessage = text;
  const tags = [];
  if (ragEnabled) tags.push({ cls: 'tag-rag', text: '\ud83d\uddc2 RAG' });

  if (attachedFile) {
    tags.push({ cls: 'tag-rag', text: '\ud83d\udcce ' + attachedFile.file.name });
    if (attachedFile.text) {
      const ext = attachedFile.file.name.split('.').pop().toLowerCase();
      const langMap = { py:'python', js:'javascript', ts:'typescript', java:'java', cpp:'cpp', c:'c', md:'markdown', txt:'text' };
      const lang = langMap[ext] || ext;
      finalMessage = (text ? text + '\n\n' : '')
        + '\ud83d\udcce **File: `' + attachedFile.file.name + '`**\n\nPlease analyze the following ' + lang + ' code/content:\n\n'
        + '```' + lang + '\n' + attachedFile.text.slice(0, 8000) + '\n```';
    } else {
      finalMessage = (text ? text + '\n\n' : '') + '\ud83d\udcce File attached: `' + attachedFile.file.name + '` (' + (attachedFile.file.size/1024).toFixed(1) + ' KB). Please help analyze or review it.';
    }
    
    const ragExts = new Set(['pdf','txt','md']);
    const fext = attachedFile.file.name.split('.').pop().toLowerCase();
    if (ragExts.has(fext)) {
      const fd = new FormData();
      fd.append('file', attachedFile.file);
      window.ChatbotApi.uploadFile(fd)
        .then((d) => {
          showNotif('\u2705 "' + d.source + '" indexed into RAG!');
          loadDocuments();
        })
        .catch(() => {});
    }
    removeAttachedFile();
  }

  input.value = ''; input.style.height = 'auto';
  document.getElementById('sendBtn').disabled = true;
  isTyping = true;

  const histItems = document.getElementById('historyList').querySelectorAll('.history-item');
  const previewText = text || finalMessage;
  if (histItems[0]) histItems[0].innerHTML = '<span class="dot"></span>' + previewText.slice(0, 28) + (previewText.length > 28 ? '\u2026' : '');

  appendMsg('user', finalMessage);
  conversationHistory.push({ role: 'user', content: finalMessage });

  const msgs = document.getElementById('messages');
  const aiDiv = document.createElement('div');
  aiDiv.className = 'msg ai';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const tagsHtml = tags.map(t => `<span class="msg-tag ${t.cls}">${t.text}</span>`).join('');
  const bubbleId = 'bubble-' + Date.now();
  
  aiDiv.innerHTML = `<div class="msg-avatar">⚡</div>
    <div class="msg-body">
      <div class="msg-meta">CodeMind <span style="opacity:.4">·</span> ${time} ${tagsHtml}</div>
      <div class="msg-bubble" id="${bubbleId}">
        <div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>
      </div>
    </div>`;
  msgs.appendChild(aiDiv);
  msgs.scrollTop = msgs.scrollHeight;
  
  const bubble = document.getElementById(bubbleId);
  let fullContent = '';

  const bodyPayload = {
    userMessage: finalMessage,
    history: conversationHistory.slice(0, -1),
    model: getModel(),
    systemPrompt: buildSystemPrompt(),
    temperature: 0.3,
    maxTokens: 1024,
    ragEnabled,
  };

  await window.ChatbotApi.sendChatMessageStream(
    bodyPayload,
    (evt) => {
      // onMeta
      if (evt.agent) updateAgentBadge(evt.agent);
    },
    (textChunk) => {
      // onText
      fullContent += textChunk;
      bubble.innerHTML = formatContent(fullContent) + '<span class="stream-cursor"></span>';
      msgs.scrollTop = msgs.scrollHeight;
    },
    () => {
      // onDone
      bubble.innerHTML = formatContent(fullContent);
      conversationHistory.push({ role: 'assistant', content: fullContent });
      isTyping = false;
      document.getElementById('sendBtn').disabled = false;
      document.getElementById('userInput').focus();
    },
    (errText) => {
      // onError
      bubble.innerHTML = formatContent(`⚠ **Error:** ${errText}`);
      isTyping = false;
      document.getElementById('sendBtn').disabled = false;
      document.getElementById('userInput').focus();
    }
  );
}

// ── ROADMAPS ──
function toggleRoadmapMode() {
  const rm = document.getElementById('roadmapModal');
  if (rm) rm.classList.toggle('hidden');
}

function askRoadmap(topic) {
  toggleRoadmapMode();
  const input = document.getElementById('userInput');
  if (input) {
    input.value = `Explain the concept of "${topic}" with practical DSA examples.`;
    sendMessage();
  }
}

// ── RAG DOCUMENTS LISTING & INGESTION ──
async function loadDocuments() {
  try {
    const data = await window.ChatbotApi.listDocuments();
    renderDocList(data.documents || []);
  } catch {}
}

function renderDocList(docs) {
  const list = document.getElementById('docList');
  const count = document.getElementById('docCount');
  if (!list) return;

  if (!docs.length) {
    list.innerHTML = '<div class="no-docs-hint" id="noDocsHint">No documents uploaded yet</div>';
    if (count) count.textContent = '';
    return;
  }
  if (count) count.textContent = `(${docs.length})`;
  list.innerHTML = docs.map(d => `
    <div class="doc-item" title="${d.source}">
      <span>${d.source.endsWith('.pdf') ? '📄' : '📝'}</span>
      <span class="doc-item-name">${d.source}</span>
      <span class="doc-item-chunks">${d.chunks}c</span>
      <button class="doc-del-btn" onclick="deleteDoc('${d.source.replace(/'/g, "\\'")}')" title="Remove from RAG">✕</button>
    </div>
  `).join('');
}

async function deleteDoc(source) {
  if (!confirm(`Remove "${source}" from the knowledge base?`)) return;
  try {
    await window.ChatbotApi.deleteDocument(source);
    showNotif(`🗑 "${source}" removed.`);
    await loadDocuments();
  } catch (err) {
    showNotif(`⚠ ${err.message}`);
  }
}

function openUploadModal() {
  const modal = document.getElementById('uploadOverlay');
  if (modal) modal.classList.remove('hidden');
  resetDropZone();
}

function closeUploadModal() {
  const modal = document.getElementById('uploadOverlay');
  if (modal) modal.classList.add('hidden');
  const fileIn = document.getElementById('fileInput');
  if (fileIn) fileIn.value = '';
  resetDropZone();
}

function handleOverlayClick(e) {
  if (e.target.id === 'uploadOverlay') closeUploadModal();
}

function resetDropZone() {
  const icon = document.getElementById('dropIcon');
  const lbl = document.getElementById('dropLabel');
  const prog = document.getElementById('uploadProgress');
  const fill = document.getElementById('progressFill');
  const zone = document.getElementById('dropZone');
  if (icon) icon.textContent = '📄';
  if (lbl) lbl.textContent = 'Drag & drop your file here';
  if (prog) prog.style.display = 'none';
  if (fill) {
    fill.style.width = '0%';
    fill.style.background = 'linear-gradient(90deg, var(--accent), var(--accent2))';
  }
  if (zone) zone.classList.remove('drag-over');
}

function handleDragOver(e) {
  e.preventDefault();
  const zone = document.getElementById('dropZone');
  if (zone) zone.classList.add('drag-over');
}

function handleDragLeave() {
  const zone = document.getElementById('dropZone');
  if (zone) zone.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  const zone = document.getElementById('dropZone');
  if (zone) zone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleUpload(file);
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) handleUpload(file);
}

async function handleUpload(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const allowed = ['pdf','txt','md','py','js','ts','java','cpp','c','docx'];
  if (!allowed.includes(ext)) {
    showNotif('⚠ File type not supported. Use: ' + allowed.join(', '));
    return;
  }
  
  const prog = document.getElementById('uploadProgress');
  const fill = document.getElementById('progressFill');
  const label = document.getElementById('progressLabel');
  const dropLabel = document.getElementById('dropLabel');
  const dropIcon = document.getElementById('dropIcon');

  if (dropIcon) dropIcon.textContent = '⏳';
  if (dropLabel) dropLabel.textContent = `Uploading ${file.name}…`;
  if (prog) prog.style.display = 'block';
  if (fill) fill.style.width = '30%';
  if (label) label.textContent = 'Sending to RAG service…';

  const formData = new FormData();
  formData.append('file', file);

  try {
    if (fill) fill.style.width = '60%';
    const data = await window.ChatbotApi.uploadFile(formData);
    if (fill) fill.style.width = '100%';
    if (dropIcon) dropIcon.textContent = '✅';
    if (dropLabel) dropLabel.textContent = `"${data.source}" indexed — ${data.indexed_chunks} chunks`;
    if (label) label.textContent = `Total in store: ${data.total_chunks} chunks`;
    showNotif(`✅ "${data.source}" uploaded & indexed!`);
    await loadDocuments();
    setTimeout(closeUploadModal, 2000);
  } catch (err) {
    if (dropIcon) dropIcon.textContent = '❌';
    if (dropLabel) dropLabel.textContent = `Error: ${err.message}`;
    if (fill) {
      fill.style.width = '100%';
      fill.style.background = '#f87171';
    }
    if (label) label.textContent = 'Upload failed. Check that the RAG service is running.';
  }
}

// ── FLOW VISUALIZER PANELS ──
let flowSteps = [];
let currentStepIndex = 0;
let animationInterval = null;
let isPlaying = false;
let lastValidMermaid = null;
let lastValidSteps = null;

function toggleFlowMode() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('mobileOverlay');
  if (window.innerWidth <= 600) {
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }

  const chatArea = document.getElementById('chatArea');
  const flowArea = document.getElementById('flowArea');
  const cxArea = document.getElementById('complexityArea');

  // close complexity if open
  if (cxArea) cxArea.style.display = 'none';

  if (flowArea.style.display === 'none') {
    chatArea.style.display = 'none';
    flowArea.style.display = 'flex';
  } else {
    chatArea.style.display = 'flex';
    flowArea.style.display = 'none';
  }
}

function cleanMermaid(code) {
  return code
    .replace(/```mermaid/gi, "")
    .replace(/```/g, "")
    .replace(/`/g, "")
    .replace(/\r/g, "")
    .replace(/graph TD\s*/i, "graph TD\n")
    .trim();
}

function isValidMermaid(code) {
  return code.startsWith("graph TD") && code.includes("-->");
}

async function generateFlow(isRetry = false) {
  if (!window.VisualizerApi) {
    showNotif('⚠ Visualizer API not loaded. Please perform a hard refresh (Ctrl+F5) to clear browser cache.');
    throw new Error('Visualizer API is not loaded. Please perform a hard refresh (Ctrl+F5) to clear browser cache.');
  }
  const code = document.getElementById('flowCodeInput').value.trim();
  const flowCustomInputEl = document.getElementById('flowCustomInput');
  const customInput = flowCustomInputEl ? flowCustomInputEl.value.trim() : '';
  if (!code) { showNotif('⚠ Please enter some code first.'); return; }
  
  const btn = document.getElementById('generateFlowBtn');
  btn.disabled = true;
  btn.textContent = isRetry ? 'Retrying...' : 'Generating...';
  
  try {
    const data = await window.VisualizerApi.generateFlowGraph(code, isRetry, customInput);
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

let currentZoom = 1.0;

function zoomIn() {
  currentZoom = Math.min(3.0, currentZoom + 0.15);
  applyZoom();
}

function zoomOut() {
  currentZoom = Math.max(0.3, currentZoom - 0.15);
  applyZoom();
}

function resetZoom() {
  currentZoom = 1.0;
  applyZoom();
}

function applyZoom() {
  const container = document.getElementById('mermaidContainer');
  const svg = container.querySelector('svg');
  const label = document.getElementById('zoomPercent');
  if (label) {
    label.textContent = `${Math.round(currentZoom * 100)}%`;
  }
  if (svg) {
    if (!svg.dataset.baseWidth) {
      svg.dataset.baseWidth = svg.style.maxWidth || svg.getAttribute('width') || '100%';
    }
    svg.style.maxWidth = 'none';
    svg.style.width = `calc(${svg.dataset.baseWidth} * ${currentZoom})`;
    svg.style.transition = 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
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
    
    document.getElementById('zoomControls').style.display = 'flex';
    resetZoom();
    
    document.getElementById('playBtn').disabled = false;
    document.getElementById('nextBtn').disabled = false;
    document.getElementById('resetBtn').disabled = false;
    updateControlsUI();
    
    if (!isFallback) {
      lastValidMermaid = mermaidCode;
      lastValidSteps = steps;
    }
  } catch (err) {
    document.getElementById('zoomControls').style.display = 'none';
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
    document.getElementById('zoomControls').style.display = 'none';
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
    <div style="font-size:12px; color:var(--text); margin-bottom:15px;">The generated flowchart was invalid.</div>
    <button class="flow-btn" onclick="this.parentElement.remove(); generateFlow(true)" style="padding:8px 16px; font-size:12px; width:auto;">Retry Generating Flow</button>
    <button class="pill" onclick="this.parentElement.remove()" style="margin-left:8px;">Dismiss</button>
  `;
  container.style.position = 'relative';
  container.appendChild(overlay);
}

function updateControlsUI() {
  const playBtn = document.getElementById('playBtn');
  if (playBtn) playBtn.innerHTML = isPlaying ? '⏸ Pause' : '▶ Play';
  const counter = document.getElementById('stepCounter');
  if (counter) counter.textContent = `Step: ${Math.max(0, currentStepIndex + 1)} / ${flowSteps.length}`;
}

function highlightNode(nodeId) {
  document.querySelectorAll('.active-node').forEach(el => el.classList.remove('active-node'));
  
  if (nodeId) {
    const nodes = document.querySelectorAll('.node');
    let found = false;
    nodes.forEach(n => {
      if (n.id.includes(`-${nodeId}-`) || n.id.endsWith(`-${nodeId}`) || n.id === nodeId) {
        n.classList.add('active-node');
        found = true;
        n.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    });
    
    if (!found) {
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
  const step = flowSteps[currentStepIndex];
  const nodeId = (step && typeof step === 'object') ? step.nodeId : step;
  highlightNode(nodeId);
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
  if (container) container.scrollTo(0,0);
}

function handleSpeedChange() {
  if (isPlaying) {
    pauseAnimation();
    togglePlay();
  }
}

// ── DRY RUN SIMULATOR ──
let drSteps = [];
let drCurrentStep = -1;
let drIsPlaying = false;
let drInterval = null;
let drPrevVars = {};

function switchFlowTab(tab) {
  const isFlow = tab === 'flow';
  document.getElementById('tabFlowBtn').classList.toggle('active', isFlow);
  document.getElementById('tabDryRunBtn').classList.toggle('active', !isFlow);
  document.getElementById('flowInputPanel').style.display   = isFlow ? 'flex' : 'none';
  document.getElementById('dryRunInputPanel').style.display = isFlow ? 'none' : 'flex';
  document.getElementById('flowGraphRight').style.display   = isFlow ? 'flex' : 'none';
  document.getElementById('dryRunRight').style.display      = isFlow ? 'none' : 'flex';
  if (!isFlow) {
    handleDrCodeChange();
  }
}

function detectNeedsInput(code) {
  const inputPatterns = [
    /\binput\s*\(/, /\bsys\.stdin\b/, /\braw_input\s*\(/, /\bScanner\s*\(/, /\bSystem\.in\b/, /\bBufferedReader\b/,
    /\bcin\s*>>/, /\bscanf\s*\(/, /\bgets\s*\(/, /\bfgets\s*\(/, /\breadline\s*\(/, /\bprompt\s*\(/,
    /\bprocess\.stdin\b/, /\breadLine\s*\(/
  ];
  if (inputPatterns.some(p => p.test(code))) return true;

  const fnDefs = [];
  const pyRegex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*([^)]+)\s*\)/g;
  let match;
  while ((match = pyRegex.exec(code)) !== null) {
    const funcName = match[1];
    const params = match[2].trim();
    if (funcName === 'main') continue;
    if (params && params !== 'self') fnDefs.push(funcName);
  }

  const standardRegex = /\b(?:function|int|double|float|char|void|String|auto|bool|long|let|const|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*([^)]+)\s*\)/g;
  while ((match = standardRegex.exec(code)) !== null) {
    const funcName = match[1];
    const params = match[2].trim();
    if (['if', 'for', 'while', 'switch', 'catch', 'main'].includes(funcName)) continue;
    if (params) fnDefs.push(funcName);
  }

  const arrowRegex = /(?:const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*\(\s*([^)]+)\s*\)\s*=>/g;
  while ((match = arrowRegex.exec(code)) !== null) {
    const funcName = match[1];
    const params = match[2].trim();
    if (params) fnDefs.push(funcName);
  }

  if (fnDefs.length === 0) return false;

  for (const fn of fnDefs) {
    const refRegex = new RegExp('\\b' + fn + '\\b', 'g');
    const matches = code.match(refRegex);
    const count = matches ? matches.length : 0;
    if (count <= 1) return true;
  }
  return false;
}

function handleDrCodeChange() {
  const code = document.getElementById('drCodeInput').value;
  const wrapper = document.getElementById('drInputWrapper');
  if (!wrapper) return;
  const needsInput = detectNeedsInput(code);
  wrapper.style.display = needsInput ? 'block' : 'none';
  if (!needsInput) {
    document.getElementById('drSampleInput').value = '';
  }
}

async function runDryRun() {
  if (!window.VisualizerApi) {
    showNotif('⚠ Visualizer API not loaded. Please perform a hard refresh (Ctrl+F5) to clear browser cache.');
    return;
  }
  const code  = document.getElementById('drCodeInput').value.trim();
  const needsInput = detectNeedsInput(code);
  const input = document.getElementById('drSampleInput').value.trim();
  if (!code)  { showNotif('⚠ Please paste your code first.'); return; }
  if (needsInput && !input) { showNotif('⚠ Please enter a sample input.'); return; }

  const btn = document.getElementById('drRunBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Running...';

  document.getElementById('drPlaceholder').style.display = 'flex';
  document.getElementById('drPlaceholder').innerHTML = `<div class="dr-placeholder-icon" style="animation:spin 1s linear infinite">⚙️</div><h3>Tracing execution…</h3><p>The AI is simulating your code ${needsInput ? 'with the given input' : 'using internal values'}.</p>`;
  document.getElementById('drVarsPanel').style.display   = 'none';
  document.getElementById('drTraceWrap').style.display   = 'none';
  document.getElementById('drControls').style.display    = 'none';
  document.getElementById('drSummaryBar').style.display  = 'none';
  drSteps = []; drCurrentStep = -1; drPrevVars = {};

  try {
    const data = await window.VisualizerApi.runDryRun(code, input);
    if (!data.steps || !data.steps.length) throw new Error('No steps returned from AI');

    drSteps = data.steps;
    drCurrentStep = -1;
    drPrevVars = {};

    document.getElementById('drInputBadge').textContent  = `Input: ${data.input || input || 'None required'}`;
    document.getElementById('drOutputBadge').textContent = `Output: ${data.output || '—'}`;
    document.getElementById('drSummaryText').textContent = data.summary || '';
    document.getElementById('drSummaryBar').style.display = 'flex';

    buildTraceTable(drSteps);

    document.getElementById('drPlaceholder').style.display = 'none';
    document.getElementById('drVarsPanel').style.display   = 'block';
    document.getElementById('drTraceWrap').style.display   = 'block';
    document.getElementById('drControls').style.display    = 'flex';

    drUpdateStepLabel();
    showNotif('✅ Dry run ready! Hit Play or Next to trace.');
  } catch(err) {
    document.getElementById('drPlaceholder').innerHTML = `<div class="dr-placeholder-icon">❌</div><h3>Trace Failed</h3><p>${escHtml(err.message)}</p>`;
    showNotif(`⚠ ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '▶ Run';
  }
}

function buildTraceTable(steps) {
  const tbody = document.getElementById('drTraceBody');
  if (!tbody) return;
  tbody.innerHTML = steps.map((s, i) => {
    const hlClass = s.highlight ? `highlight-${s.highlight}` : '';
    const varsHtml = Object.entries(s.variables || {}).map(([k,v]) =>
      `<span class="dr-var-chip"><span>${escHtml(k)}</span>=<strong>${escHtml(String(v))}</strong></span>`
    ).join('');
    return `
      <div class="dr-trace-row ${hlClass}" id="dr-row-${i}" data-step="${i}">
        <div class="dr-step-num">${s.step || i+1}</div>
        <div class="dr-line-code">${escHtml(s.line || '')}</div>
        <div class="dr-action-text">${escHtml(s.action || '')}</div>
        <div class="dr-vars-cell">${varsHtml}</div>
      </div>`;
  }).join('');
}

function drGoToStep(idx) {
  if (idx < -1 || idx >= drSteps.length) return;

  document.querySelectorAll('.dr-trace-row.active-row').forEach(r => r.classList.remove('active-row'));
  drCurrentStep = idx;

  for (let i = 0; i <= idx; i++) {
    const row = document.getElementById(`dr-row-${i}`);
    if (row) row.classList.add('visible');
  }

  if (idx >= 0) {
    const activeRow = document.getElementById(`dr-row-${idx}`);
    if (activeRow) {
      activeRow.classList.add('active-row');
      activeRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    const vars = drSteps[idx].variables || {};
    drUpdateLiveVars(vars);
  }

  drUpdateStepLabel();
  document.getElementById('drPrevBtn').disabled = drCurrentStep <= 0;
  document.getElementById('drNextBtn').disabled = drCurrentStep >= drSteps.length - 1;
}

function drUpdateLiveVars(vars) {
  const grid = document.getElementById('drVarsGrid');
  if (!grid) return;
  grid.innerHTML = Object.entries(vars).map(([k,v]) => {
    const changed = drPrevVars[k] !== undefined && drPrevVars[k] !== String(v);
    return `<div class="dr-live-var${changed ? ' changed' : ''}">
      <span class="dr-live-var-name">${escHtml(k)}</span>
      <span class="dr-live-var-val">${escHtml(String(v))}</span>
    </div>`;
  }).join('');
  drPrevVars = Object.fromEntries(Object.entries(vars).map(([k,v]) => [k, String(v)]));
}

function drNextStep() {
  if (drCurrentStep >= drSteps.length - 1) { drPausePlay(); return; }
  drGoToStep(drCurrentStep + 1);
}

function drPrevStep() {
  if (drCurrentStep <= 0) return;
  drPrevVars = {};
  document.querySelectorAll('.dr-trace-row').forEach(r => r.classList.remove('visible','active-row'));
  drCurrentStep = -1;
  for (let i = 0; i < drCurrentStep + 1; i++) drGoToStep(i);
  drGoToStep(Math.max(0, drCurrentStep - 1));
}

function drResetSteps() {
  drPausePlay();
  drCurrentStep = -1;
  drPrevVars = {};
  document.querySelectorAll('.dr-trace-row').forEach(r => r.classList.remove('visible','active-row'));
  const grid = document.getElementById('drVarsGrid');
  if (grid) grid.innerHTML = '';
  drUpdateStepLabel();
  document.getElementById('drPrevBtn').disabled = true;
  document.getElementById('drNextBtn').disabled = false;
}

function drTogglePlay() {
  if (drIsPlaying) { drPausePlay(); return; }
  if (drCurrentStep >= drSteps.length - 1) drResetSteps();
  drIsPlaying = true;
  document.getElementById('drPlayBtn').innerHTML = '⏸ Pause';
  drNextStep();
  const speed = parseInt(document.getElementById('drSpeedSelect').value, 10);
  drInterval = setInterval(() => {
    if (drCurrentStep >= drSteps.length - 1) { drPausePlay(); return; }
    drNextStep();
  }, speed);
}

function drPausePlay() {
  drIsPlaying = false;
  clearInterval(drInterval);
  const playBtn = document.getElementById('drPlayBtn');
  if (playBtn) playBtn.innerHTML = '▶ Play';
}

function drUpdateStepLabel() {
  const el = document.getElementById('drStepLabel');
  if (el) el.textContent = `Step ${Math.max(0, drCurrentStep + 1)} / ${drSteps.length}`;
}

// ── COMPLEXITY ANALYZER PANELS ──
function toggleComplexityMode() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('mobileOverlay');
  if (window.innerWidth <= 600) {
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }

  const cxArea = document.getElementById('complexityArea');
  const flowArea = document.getElementById('flowArea');
  const chatArea = document.getElementById('chatArea');
  
  if (flowArea) flowArea.style.display = 'none';

  if (cxArea.style.display === 'none') {
    cxArea.style.display = 'flex';
    chatArea.style.display = 'none';
  } else {
    cxArea.style.display = 'none';
    chatArea.style.display = 'flex';
  }
}

// overwrite window toggle flow mode slightly if it exists to clean up
const originalToggleFlowMode = window.toggleFlowMode;
if(originalToggleFlowMode) {
   window.toggleFlowMode = function() {
      const cx = document.getElementById('complexityArea');
      if (cx) cx.style.display = 'none';
      originalToggleFlowMode();
   };
}

async function analyzeComplexity() {
  if (!window.VisualizerApi) {
    showNotif('⚠ Visualizer API not loaded. Please perform a hard refresh (Ctrl+F5) to clear browser cache.');
    throw new Error('Visualizer API is not loaded. Please perform a hard refresh (Ctrl+F5) to clear browser cache.');
  }
  const code = document.getElementById('cxCodeInput').value.trim();
  const lang = document.getElementById('cxLang').value;
  const btn = document.getElementById('cxAnalyzeBtn');
  const results = document.getElementById('cxResults');

  if (!code || code.length < 5) {
    showNotif('⚠ Please paste valid code to analyze.');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '⏳ Analyzing...';
  results.innerHTML = `
    <div class="cx-loading">
      <div class="cx-spinner"></div>
      <p>Analyzing time and space complexity...</p>
    </div>
  `;

  try {
    const data = await window.VisualizerApi.analyzeCode(code, lang);
    if (!data.success) throw new Error(data.error || 'Failed to analyze code.');
    renderComplexityResult(data.analysis);
  } catch (err) {
    results.innerHTML = `
      <div class="cx-result-area">
        <div class="cx-error-msg">
          <strong>Analysis Failed</strong><br><br>${escHtml(err.message)}
        </div>
      </div>
    `;
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Analyze Complexity';
  }
}

function renderComplexityResult(data) {
  const res = document.getElementById('cxResults');
  let html = `<div class="cx-result-area">`;

  if (data.algorithmPattern) {
    html += `<div style="margin-bottom:-4px"><span style="color:#00e5ff; font-family:var(--font-mono); font-size:12px; font-weight:700;">// PATTERN DETECTED: ${escHtml(data.algorithmPattern)}</span></div>`;
  }

  html += `
    <div class="cx-bigo-row">
      <div class="cx-bigo-card time">
        <div class="cx-bigo-label">Time Complexity</div>
        <div class="cx-bigo-value">${escHtml(data.timeComplexity || 'O(N)')}</div>
        <div class="cx-bigo-sub">${escHtml(data.timeReason || '')}</div>
      </div>
      <div class="cx-bigo-card space">
        <div class="cx-bigo-label">Space Complexity</div>
        <div class="cx-bigo-value">${escHtml(data.spaceComplexity || 'O(1)')}</div>
        <div class="cx-bigo-sub">${escHtml(data.spaceReason || '')}</div>
      </div>
    </div>
  `;

  if (data.bruteForceComplexity && data.optimalComplexity) {
    html += `
      <div class="cx-compare-row">
        <div class="cx-compare-card brute">
          <div class="cx-compare-label">Brute Force</div>
          <div class="cx-compare-val">${escHtml(data.bruteForceComplexity)}</div>
        </div>
        <div class="cx-compare-card optimal">
          <div class="cx-compare-label">Optimal</div>
          <div class="cx-compare-val">${escHtml(data.optimalComplexity)}</div>
        </div>
      </div>
    `;
  }

  if (data.optimizationSuggestion) {
    html += `
      <div class="cx-block">
        <div class="cx-block-title"><div class="cx-dot" style="background:#f59e0b"></div> Optimization Suggestion</div>
        <p>${escHtml(data.optimizationSuggestion)}</p>
      </div>
    `;
  }

  if (data.betterApproach && data.betterApproach.exists && data.betterApproach.code) {
    html += `
      <div class="cx-block">
        <div class="cx-block-title"><div class="cx-dot" style="background:#10b981"></div> Better Approach</div>
        <p>${escHtml(data.betterApproach.explanation || 'An optimal solution is provided below.')}</p>
        <div class="cx-code-block">${escHtml(data.betterApproach.code)}</div>
      </div>
    `;
  }

  if (data.interviewTips && data.interviewTips.length > 0) {
    html += `
      <div class="cx-block">
        <div class="cx-block-title"><div class="cx-dot" style="background:#7c3aed"></div> Interview Tips</div>
        <ul>
          ${data.interviewTips.map(t => `<li>${escHtml(t)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  if (data.commonMistakes && data.commonMistakes.length > 0) {
    html += `
      <div class="cx-block">
        <div class="cx-block-title"><div class="cx-dot" style="background:#ef4444"></div> Common Mistakes</div>
        <ul>
          ${data.commonMistakes.map(m => `<li>${escHtml(m)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  html += `</div>`;
  res.innerHTML = html;
}

// ── FLOATING POPUPS & MENUS ──
let attachedFile = null;
let _popupOpen = false;

function toggleUploadPopup(e) {
  e.stopPropagation();
  const popup = document.getElementById('uploadPopup');
  const btn   = document.getElementById('inputPlusBtn');
  _popupOpen = !_popupOpen;
  btn.classList.toggle('active', _popupOpen);

  if (_popupOpen) {
    popup.classList.remove('hidden');
    const rect = btn.getBoundingClientRect();
    popup.style.left = rect.left + 'px';
    popup.style.top  = (rect.top - popup.offsetHeight - 10) + 'px';
    
    requestAnimationFrame(function() {
      const h = popup.offsetHeight;
      popup.style.top = (rect.top - h - 10) + 'px';
    });
  } else {
    popup.classList.add('hidden');
  }
}

document.addEventListener('click', (e) => {
  if (!_popupOpen) return;
  const wrap = document.getElementById('uploadPopup');
  const btn  = document.getElementById('inputPlusBtn');
  if (wrap && !wrap.contains(e.target) && e.target !== btn) {
    wrap.classList.add('hidden');
    btn.classList.remove('active');
    _popupOpen = false;
  }
});

function triggerFilePick(accept) {
  const inp = document.getElementById('inputFileHidden');
  inp.accept = accept || '.py,.java,.cpp,.c,.js,.ts,.pdf,.txt,.md,.docx';
  inp.value = '';
  inp.click();
  
  document.getElementById('uploadPopup').classList.add('hidden');
  document.getElementById('inputPlusBtn').classList.remove('active');
  _popupOpen = false;
}

function handleInputFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  const MAX = 2 * 1024 * 1024;
  const ext  = file.name.split('.').pop().toLowerCase();
  const textExts = new Set(['py','js','ts','java','cpp','c','txt','md']);

  attachedFile = { file, text: null };
  renderFileChip(file);

  if (textExts.has(ext) && file.size <= MAX) {
    const reader = new FileReader();
    reader.onload = (ev) => { attachedFile.text = ev.target.result; };
    reader.readAsText(file);
  }
}

function renderFileChip(file) {
  const bar  = document.getElementById('filePreviewBar');
  const icon = getFileIcon(file.name);
  const kb   = (file.size / 1024).toFixed(1);
  bar.innerHTML = `
    <div class="file-chip" id="attachedChip">
      <span class="file-chip-icon">${icon}</span>
      <span class="file-chip-name">${escHtml(file.name)}</span>
      <span class="file-chip-size">${kb} KB</span>
      <button class="file-chip-remove" onclick="removeAttachedFile()" title="Remove">✕</button>
    </div>`;
  bar.style.display = 'flex';
}

function removeAttachedFile() {
  attachedFile = null;
  const bar = document.getElementById('filePreviewBar');
  bar.innerHTML = '';
  bar.style.display = 'none';
  document.getElementById('inputFileHidden').value = '';
}

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  const map = { pdf:'📄', py:'🐍', js:'🟨', ts:'🔷', java:'☕', cpp:'⚙', c:'⚙', txt:'📝', md:'📝', docx:'📋' };
  return map[ext] || '📁';
}

function toggleMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('mobileOverlay');
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open');
}

// ── MERMAID ZOOM PANNING ──
function setupZoomPan() {
  const container = document.getElementById('mermaidContainer');
  let isDragging = false;
  let startX = 0, startY = 0;
  let scrollLeft = 0, scrollTop = 0;

  if (!container) return;

  container.addEventListener('mousedown', (e) => {
    const svg = container.querySelector('svg');
    if (!svg) return;
    isDragging = true;
    startX = e.pageX - container.offsetLeft;
    startY = e.pageY - container.offsetTop;
    scrollLeft = container.scrollLeft;
    scrollTop = container.scrollTop;
    container.style.cursor = 'grabbing';
  });

  container.addEventListener('mouseleave', () => {
    isDragging = false;
    container.style.cursor = 'grab';
  });

  container.addEventListener('mouseup', () => {
    isDragging = false;
    container.style.cursor = 'grab';
  });

  container.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const y = e.pageY - container.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    container.scrollLeft = scrollLeft - walkX;
    container.scrollTop = scrollTop - walkY;
  });
}

// Expose functions called by HTML buttons
window.newChat = newChat;
window.toggleFlowMode = toggleFlowMode;
window.toggleComplexityMode = toggleComplexityMode;
window.toggleRag = toggleRag;
window.toggleTheme = toggleTheme;
window.logout = logout;
window.sendMessage = sendMessage;
window.handleKey = handleKey;
window.autoResize = autoResize;
window.toggleUploadPopup = toggleUploadPopup;
window.triggerFilePick = triggerFilePick;
window.handleInputFileSelect = handleInputFileSelect;
window.removeAttachedFile = removeAttachedFile;
window.openUploadModal = openUploadModal;
window.closeUploadModal = closeUploadModal;
window.handleOverlayClick = handleOverlayClick;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.handleDrop = handleDrop;
window.handleFileSelect = handleFileSelect;
window.deleteDoc = deleteDoc;
window.toggleRoadmapMode = toggleRoadmapMode;
window.askRoadmap = askRoadmap;
window.switchFlowTab = switchFlowTab;
window.generateFlow = generateFlow;
window.runDryRun = runDryRun;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.resetZoom = resetZoom;
window.togglePlay = togglePlay;
window.nextStep = nextStep;
window.resetAnimation = resetAnimation;
window.handleSpeedChange = handleSpeedChange;
window.drTogglePlay = drTogglePlay;
window.drPrevStep = drPrevStep;
window.drNextStep = drNextStep;
window.drResetSteps = drResetSteps;
window.analyzeComplexity = analyzeComplexity;
window.runCode = runCode;
window.copyCode = copyCode;
window.sendSuggestion = sendSuggestion;
window.toggleMobileSidebar = toggleMobileSidebar;
window.handleDrCodeChange = handleDrCodeChange;
