class AppFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <section class="footer-cta">
        <div class="cta-bar">
          <div class="cta-text">Setup So Simple, It Just Works - Let's Set Things Up!</div>
          <a href="/chat" class="cta-btn" id="ctaBtn">Get Started &rarr;</a>
        </div>
      </section>
    `;
  }
}
customElements.define('app-footer', AppFooter);
