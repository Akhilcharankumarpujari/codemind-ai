class AppSidebar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="logo">
            <div class="logo-icon" style="background: none; padding: 0;">
              <img src="/assets/images/logo.png" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;" alt="Logo">
            </div>
            Code<span>Mind</span>
          </div>
          <button class="new-chat-btn" onclick="newChat()">
            <span>✦</span> New conversation
          </button>

          <div class="sidebar-section" style="margin-top:16px; padding:0; padding-bottom:4px;">⚡ SMART TOOLS</div>
          <button class="upload-btn" onclick="toggleFlowMode()" id="flowVisBtn" style="border-color:var(--accent2); color:var(--accent2); background:rgba(124,58,237,0.06); margin-top:6px">
            Flow Visualizer
          </button>
          <button class="upload-btn" onclick="toggleComplexityMode()" id="cxBtn" style="border-color:#f59e0b; color:#f59e0b; background:rgba(245,158,11,0.06); margin-top:6px">
            Complexity Analyzer
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
              <span id="activemodelLabel">CodeMind Ready</span>
            </div>
            <div id="userBadge" style="display:none;align-items:center;gap:8px;width:100%;padding-top:6px;border-top:1px solid var(--border)">
              <div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#000;flex-shrink:0" id="userAvatar">?</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" id="userNameLabel">Guest</div>
                <div style="font-size:10px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" id="userEmailLabel"></div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    `;
  }
}
customElements.define('app-sidebar', AppSidebar);
