document.addEventListener('DOMContentLoaded', () => {
  let currentTab = 'login';

  // ── ON LOAD SESSION CHECK ──
  window.AuthApi.getMe()
    .then(() => {
      window.location.href = '/chat';
    })
    .catch(() => {});

  // Expose switchTab globally so inline onclick handlers work
  window.switchTab = function(tab) {
    currentTab = tab;
    document.getElementById('loginTab').className = tab === 'login' ? 'tab active' : 'tab';
    document.getElementById('registerTab').className = tab === 'register' ? 'tab active' : 'tab';
    
    const slider = document.getElementById('tabSlider');
    if (slider) {
      slider.style.transform = tab === 'register' ? 'translateX(100%)' : 'translateX(0)';
    }

    document.getElementById('nameGroup').style.display = tab === 'register' ? 'flex' : 'none';
    document.getElementById('submitBtn').textContent = tab === 'login' ? 'Sign In' : 'Create Account';
    document.getElementById('passwordInput').autocomplete = tab === 'login' ? 'current-password' : 'new-password';
    
    // Clear strength on switch
    const strengthText = document.getElementById('passwordStrength');
    const strengthTextWrap = document.getElementById('passwordStrengthText');
    if (strengthText) strengthText.style.display = 'none';
    if (strengthTextWrap) strengthTextWrap.style.display = 'none';
    
    clearMessages();
  };

  function clearMessages() {
    document.getElementById('errorMsg').className = 'error-msg';
    document.getElementById('successMsg').className = 'success-msg';
  }

  function showError(msg) {
    const el = document.getElementById('errorMsg');
    el.textContent = msg; el.className = 'error-msg visible';
  }

  function showSuccess(msg) {
    const el = document.getElementById('successMsg');
    el.textContent = msg; el.className = 'success-msg visible';
  }

  // Expose handleSubmit globally for onsubmit form handler
  window.handleSubmit = async function(e) {
    e.preventDefault();
    clearMessages();

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = currentTab === 'login' ? 'Signing in...' : 'Creating account...';

    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const name = document.getElementById('nameInput').value.trim();

    try {
      let data;
      if (currentTab === 'login') {
        data = await window.AuthApi.login(email, password);
      } else {
        data = await window.AuthApi.register(email, password, name);
      }

      localStorage.setItem('cm_user', JSON.stringify(data.user));

      showSuccess(currentTab === 'login' ? 'Welcome back! Redirecting...' : 'Account created! Redirecting...');
      setTimeout(() => { window.location.href = '/chat'; }, 800);

    } catch (err) {
      showError(err.message || 'Cannot reach server. Make sure the backend is running.');
      btn.disabled = false;
      btn.textContent = currentTab === 'login' ? 'Sign In' : 'Create Account';
    }
  };

  // ── PASSWORD STRENGTH METER ──
  const pwdInput = document.getElementById('passwordInput');
  const strengthBar = document.getElementById('passwordStrengthBar');
  const strengthText = document.getElementById('passwordStrength');
  const strengthTextWrap = document.getElementById('passwordStrengthText');
  const strengthLabel = document.getElementById('strengthLabel');

  if (pwdInput) {
    pwdInput.addEventListener('input', () => {
      const val = pwdInput.value;
      if (currentTab === 'register' && val.length > 0) {
        strengthText.style.display = 'block';
        strengthTextWrap.style.display = 'block';
        
        let score = 0;
        if (val.length >= 6) score++;
        if (val.length >= 10) score++;
        if (/[A-Z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;

        let color = '#f87171';
        let width = '20%';
        let label = 'Weak';

        if (score >= 4) {
          color = '#34d399';
          width = '100%';
          label = 'Strong';
        } else if (score >= 2) {
          color = '#fbbf24';
          width = '60%';
          label = 'Medium';
        }

        if (strengthBar) {
          strengthBar.style.width = width;
          strengthBar.style.backgroundColor = color;
        }
        if (strengthLabel) {
          strengthLabel.textContent = label;
          strengthLabel.style.color = color;
        }
      } else {
        if (strengthText) strengthText.style.display = 'none';
        if (strengthTextWrap) strengthTextWrap.style.display = 'none';
      }
    });
  }
});
