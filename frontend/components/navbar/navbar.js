class AppNavbar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header class="header">
        <a href="/" class="logo">
          <div class="logo-icon" style="background: none; padding: 0;">
            <img src="/assets/images/logo.png" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;" alt="Logo">
          </div>
          <div class="logo-text">Code<span>Mind</span> AI</div>
        </a>
        <nav class="nav">
          <a href="#features" class="nav-link">Features</a>
          <a href="#workflow" class="nav-link">Workflow</a>
        </nav>
        <div id="authContainer" style="display: flex; align-items: center; gap: 12px;">
          <a href="/chat" class="header-btn">Launch App</a>
        </div>
      </header>
    `;
  }
}
customElements.define('app-navbar', AppNavbar);
