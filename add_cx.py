import os
import re

html_path = r"c:\Users\Manasa\OneDrive\Desktop\ai chatbot\Aicodingchatbot .HTML"

with open(html_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# CSS to inject
css_to_add = """
  /* ─── COMPLEXITY ANALYZER ─── */
  .complexity-area {
    display: flex; height: 100vh; background: var(--bg); overflow: hidden;
  }
  .cx-left {
    width: 40%; display: flex; flex-direction: column; border-right: 1px solid var(--border);
    background: var(--surface);
  }
  .cx-right {
    width: 60%; display: flex; flex-direction: column; background: var(--bg); overflow-y: auto;
  }
  .cx-topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px; border-bottom: 1px solid var(--border);
    background: var(--surface); flex-shrink: 0;
  }
  .cx-title { font-size: 15px; font-weight: 800; display: flex; align-items: center; gap: 8px; }
  .cx-title span { color: #f59e0b; }
  .cx-body { flex: 1; display: flex; flex-direction: column; padding: 20px; gap: 14px; overflow-y: auto; }
  .cx-label { font-size: 11px; font-weight: 700; color: var(--muted); letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 6px; }
  .cx-code-input {
    flex: 1; min-height: 200px; width: 100%; background: var(--code-bg);
    border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px;
    color: var(--text); font-family: var(--font-mono); font-size: 13px;
    resize: none; outline: none; line-height: 1.6; transition: border-color 0.2s;
  }
  .cx-code-input:focus { border-color: #f59e0b; }
  .cx-lang-select {
    width: 100%; background: var(--surface2); border: 1px solid var(--border);
    border-radius: 8px; padding: 10px 12px; color: var(--text);
    font-family: var(--font-ui); font-size: 13px; outline: none; cursor: pointer;
  }
  .cx-lang-select:focus { border-color: #f59e0b; }
  .cx-analyze-btn {
    width: 100%; padding: 13px; background: linear-gradient(135deg, #f59e0b, #d97706);
    border: none; border-radius: 10px; color: #000; font-family: var(--font-ui);
    font-size: 14px; font-weight: 800; cursor: pointer; transition: opacity 0.2s, transform 0.15s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .cx-analyze-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .cx-analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  
  /* ── Result Panel ── */
  .cx-result-area { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .cx-placeholder {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 100%; min-height: 300px; color: var(--muted); text-align: center; gap: 12px; padding: 40px;
  }
  .cx-placeholder-icon { font-size: 52px; }
  .cx-placeholder h3 { font-size: 16px; font-weight: 700; color: var(--text); }
  .cx-placeholder p { font-size: 13px; line-height: 1.6; font-family: var(--font-mono); }
  
  .cx-loading {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 300px; gap: 16px; color: var(--muted);
  }
  .cx-spinner {
    width: 44px; height: 44px; border: 3px solid var(--border);
    border-top-color: #f59e0b; border-radius: 50%;
    animation: cx-spin 0.8s linear infinite;
  }
  @keyframes cx-spin { to { transform: rotate(360deg); } }
  .cx-loading p { font-family: var(--font-mono); font-size: 13px; }
  
  /* ── Big O Card ── */
  .cx-bigo-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .cx-bigo-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; padding: 18px; display: flex; flex-direction: column;
    gap: 6px; position: relative; overflow: hidden; transition: transform 0.2s;
  }
  .cx-bigo-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
  .cx-bigo-card.time::before { background: linear-gradient(90deg, #f59e0b, #ef4444); }
  .cx-bigo-card.space::before { background: linear-gradient(90deg, #00e5ff, #7c3aed); }
  .cx-bigo-label { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); }
  .cx-bigo-value { font-size: 26px; font-weight: 800; font-family: var(--font-mono); letter-spacing: -0.5px; }
  .cx-bigo-card.time .cx-bigo-value { color: #f59e0b; }
  .cx-bigo-card.space .cx-bigo-value { color: #00e5ff; }
  .cx-bigo-sub { font-size: 11px; color: var(--muted); font-family: var(--font-mono); line-height: 1.4; margin-top: 4px; }
  
  /* ── Info Blocks ── */
  .cx-block { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; }
  .cx-block-title { font-size: 12px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
  .cx-block-title .cx-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .cx-block p, .cx-block li { font-size: 13px; color: var(--text); line-height: 1.7; font-family: var(--font-mono); }
  .cx-block ul { padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
  
  /* ── Comparison Row ── */
  .cx-compare-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .cx-compare-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; }
  .cx-compare-card.brute { border-top: 2px solid #ef4444; }
  .cx-compare-card.optimal { border-top: 2px solid #10b981; }
  .cx-compare-label { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
  .cx-compare-card.brute .cx-compare-label { color: #ef4444; }
  .cx-compare-card.optimal .cx-compare-label { color: #10b981; }
  .cx-compare-val { font-size: 18px; font-weight: 800; font-family: var(--font-mono); }
  .cx-compare-card.brute .cx-compare-val { color: #ef4444; }
  .cx-compare-card.optimal .cx-compare-val { color: #10b981; }
  
  /* ── Better Code Block ── */
  .cx-code-block {
    background: var(--code-bg); border: 1px solid var(--border); border-radius: 8px;
    padding: 14px 16px; margin-top: 10px; overflow-x: auto;
    font-family: var(--font-mono); font-size: 12.5px; line-height: 1.6; color: var(--text); white-space: pre;
  }
  
  .cx-error-msg {
    background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.3); border-radius: 10px;
    padding: 16px 18px; color: #f87171; font-family: var(--font-mono); font-size: 13px; line-height: 1.6;
  }
"""

content = content.replace("</style>", css_to_add + "\n</style>")

btn_to_add = """      <button class="upload-btn" onclick="toggleComplexityMode()" id="cxBtn" style="border-color:#f59e0b; color:#f59e0b; background:rgba(245,158,11,0.06); margin-top:8px">
        ⚡ Complexity Analyzer
      </button>"""

content = content.replace("📊 Flow Visualizer\n      </button>", "📊 Flow Visualizer\n      </button>\n" + btn_to_add)

cx_html_to_add = """
  <!-- COMPLEXITY ANALYZER -->
  <main class="complexity-area" id="complexityArea" style="display:none">
    <div class="cx-left">
      <div class="cx-topbar">
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
          Detects: nested loops · recursion · DP · divide &amp; conquer<br>binary search · two pointers · sliding window · graphs
        </div>
      </div>
    </div>

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
"""

content = content.replace("<!-- FLOW VISUALIZER -->", cx_html_to_add + "\n  <!-- FLOW VISUALIZER -->")

js_to_add = """
  // ── Complexity Analyzer Logic ──
  function toggleComplexityMode() {
    const cxArea = document.getElementById('complexityArea');
    const flowArea = document.getElementById('flowArea');
    const chatArea = document.getElementById('chatArea');
    
    if (cxArea.style.display === 'none') {
      cxArea.style.display = 'flex';
      flowArea.style.display = 'none';
      chatArea.style.display = 'none';
    } else {
      cxArea.style.display = 'none';
      chatArea.style.display = 'flex';
    }
  }

  // Update existing toggleFlowMode to also hide complexity mode
  const originalToggleFlowMode = window.toggleFlowMode;
  if(originalToggleFlowMode) {
     window.toggleFlowMode = function() {
        document.getElementById('complexityArea').style.display = 'none';
        originalToggleFlowMode();
     };
  } else {
     window.toggleFlowMode = function() {
        const flowArea = document.getElementById('flowArea');
        const cxArea = document.getElementById('complexityArea');
        const chatArea = document.getElementById('chatArea');
        if (flowArea.style.display === 'none') {
          flowArea.style.display = 'flex';
          cxArea.style.display = 'none';
          chatArea.style.display = 'none';
        } else {
          flowArea.style.display = 'none';
          chatArea.style.display = 'flex';
        }
     }
  }

  async function analyzeComplexity() {
    const code = document.getElementById('cxCodeInput').value.trim();
    const lang = document.getElementById('cxLang').value;
    const btn = document.getElementById('cxAnalyzeBtn');
    const results = document.getElementById('cxResults');

    if (!code || code.length < 5) {
      showNotif('⚠ Please paste valid code to analyze.');
      return;
    }

    // Set loading state
    btn.disabled = true;
    btn.innerHTML = '⏳ Analyzing...';
    results.innerHTML = `
      <div class="cx-loading">
        <div class="cx-spinner"></div>
        <p>Analyzing time and space complexity...</p>
      </div>
    `;

    try {
      const resp = await fetch(`${BACKEND_URL}/api/complexity/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: lang })
      });
      const data = await resp.json();

      if (!resp.ok || data.error || !data.success) {
        throw new Error(data.error || 'Failed to analyze code.');
      }

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
      btn.innerHTML = '⚡ Analyze Complexity';
    }
  }

  function renderComplexityResult(data) {
    const res = document.getElementById('cxResults');
    let html = `<div class="cx-result-area">`;

    // Category / Pattern tag
    if (data.algorithmPattern) {
      html += `<div style="margin-bottom:-4px"><span style="color:#00e5ff; font-family:var(--font-mono); font-size:12px; font-weight:700;">// PATTERN DETECTED: ${escHtml(data.algorithmPattern)}</span></div>`;
    }

    // Big O Cards
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

    // Comparison (Brute vs Optimal)
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

    // Optimization Suggestion
    if (data.optimizationSuggestion) {
      html += `
        <div class="cx-block">
          <div class="cx-block-title"><div class="cx-dot" style="background:#f59e0b"></div> Optimization Suggestion</div>
          <p>${escHtml(data.optimizationSuggestion)}</p>
        </div>
      `;
    }

    // Better Approach Code
    if (data.betterApproach && data.betterApproach.exists && data.betterApproach.code) {
      html += `
        <div class="cx-block">
          <div class="cx-block-title"><div class="cx-dot" style="background:#10b981"></div> Better Approach</div>
          <p>${escHtml(data.betterApproach.explanation || 'An optimal solution is provided below.')}</p>
          <div class="cx-code-block">${escHtml(data.betterApproach.code)}</div>
        </div>
      `;
    }

    // Interview Tips
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

    // Common Mistakes
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
"""

# Try to insert before </script> right before body end
content = content.replace("</script>\n</body>", js_to_add + "\n</script>\n</body>")

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Modifications to Aicodingchatbot .HTML written.")
