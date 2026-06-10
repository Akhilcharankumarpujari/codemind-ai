class AppHero extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <section class="hero">
        <div class="hero-badge">
          <div class="hero-badge-dot"></div>
          Simplify your code workflow
        </div>
        <h1 class="hero-title">Smarter Models<br>Faster Visuals<br><span>Bigger Wins</span></h1>
        <p class="hero-subtitle">
          The premium AI-powered DSA mentor that dry-runs your code, visualizes flowcharts dynamically, and explains execution step-by-step.
        </p>
        <a href="/chat" class="hero-btn" id="heroBtn">Get Started &rarr;</a>
      </section>
    `;
  }
}
customElements.define('app-hero', AppHero);
