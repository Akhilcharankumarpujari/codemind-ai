class AppTopbar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="chat-topbar">
        <button class="hamburger-btn" id="mobileMenuBtn" onclick="toggleMobileSidebar()" aria-label="Open menu">☰</button>
        <div class="chat-title">DSA Practice <span>Dashboard</span></div>
        <div class="topbar-pills">
          <span class="agent-badge" id="agentBadge" style="display:none"></span>
          <button class="pill active" id="ragPill" onclick="toggleRag()">Smart Search</button>
          <button class="pill" id="themePill" onclick="toggleTheme()" title="Toggle dark/light mode">&#9790;</button>
          <button class="pill" id="loginPill" onclick="window.location.href='/login'" style="display:none">Sign In</button>
          <button class="pill" id="logoutPill" onclick="logout()" style="display:none" title="Sign out">&#x2715; Sign out</button>
        </div>
      </div>
    `;
  }
}
customElements.define('app-topbar', AppTopbar);
