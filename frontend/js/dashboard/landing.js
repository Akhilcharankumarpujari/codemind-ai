document.addEventListener('DOMContentLoaded', () => {
  // ── MOCKUP ANIMATION ──
  const nodes = [document.getElementById('node1'), document.getElementById('node2'), document.getElementById('node3')];
  const arrows = [document.getElementById('arrow1'), document.getElementById('arrow2')];
  const aiMsg = document.getElementById('mockAiMsg');
  const userMsg = document.getElementById('mockUserMsg');
  const inputText = document.getElementById('mockInputText');

  function animateMockup() {
    if (!nodes[0] || !arrows[0] || !aiMsg) return;

    // Reset state
    nodes.forEach(n => { if (n) n.classList.remove('active'); });
    arrows.forEach(a => { if (a) a.classList.remove('active'); });
    aiMsg.style.opacity = '0';
    if (userMsg) userMsg.textContent = 'Dry run binary search on x = 7';
    if (inputText) inputText.textContent = 'Analyzing binary search...';
    
    setTimeout(() => {
      if (inputText) inputText.textContent = 'AI is executing the dry run...';
      aiMsg.style.opacity = '1';
      aiMsg.style.transition = 'opacity 0.5s';
      
      // Step 1
      setTimeout(() => {
        if (nodes[0]) nodes[0].classList.add('active');
        if (arrows[0]) arrows[0].classList.add('active');
        
        // Step 2
        setTimeout(() => {
          if (nodes[1]) nodes[1].classList.add('active');
          if (arrows[1]) arrows[1].classList.add('active');
          
          // Step 3
          setTimeout(() => {
            if (nodes[2]) nodes[2].classList.add('active');
            if (inputText) inputText.textContent = 'Execution complete!';
          }, 800);
        }, 800);
      }, 600);
    }, 1500);
  }

  // Loop the mockup animation every 6 seconds if elements are on page
  if (nodes[0]) {
    animateMockup();
    setInterval(animateMockup, 6000);
  }

  // ── SESSION CHECKING ──
  async function checkSession() {
    const authContainer = document.getElementById('authContainer');
    const heroBtn = document.getElementById('heroBtn');
    const ctaBtn = document.getElementById('ctaBtn');

    try {
      const data = await window.AuthApi.getMe();
      const user = data.user;
      
      if (authContainer) {
        authContainer.innerHTML = `
          <span style="font-size: 13px; color: var(--text-muted); font-family: var(--font-mono); margin-right: 8px;">Logged in as <strong>${escapeHtml(user.name)}</strong></span>
          <a href="/chat" class="header-btn">Launch App</a>
          <button id="signOutBtn" class="header-btn" style="border-color: rgba(248,113,113,0.3); color: #f87171; cursor: pointer; background: transparent; font-family: var(--font-ui); font-size: 12.5px; font-weight: 600; padding: 9px 18px; border-radius: 8px;">Sign Out</button>
        `;

        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
          signOutBtn.addEventListener('click', logout);
        }
      }

      if (heroBtn) heroBtn.href = '/chat';
      if (ctaBtn) ctaBtn.href = '/chat';
    } catch (err) {
      renderLoggedOutState();
    }
  }

  function renderLoggedOutState() {
    const authContainer = document.getElementById('authContainer');
    const heroBtn = document.getElementById('heroBtn');
    const ctaBtn = document.getElementById('ctaBtn');

    if (authContainer) {
      authContainer.innerHTML = `
        <a href="/login" class="header-btn" style="border-color: var(--accent); color: var(--accent);">Sign In</a>
        <a href="/chat" class="header-btn">Launch App</a>
      `;
    }

    if (heroBtn) heroBtn.href = '/login';
    if (ctaBtn) ctaBtn.href = '/login';
  }

  async function logout() {
    try {
      await window.AuthApi.logout();
    } catch (e) {}
    localStorage.removeItem('cm_user');
    window.location.reload();
  }

  function escapeHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  checkSession();
});
