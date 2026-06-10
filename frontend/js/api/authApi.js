(function() {
  const BACKEND_URL = window.location.port === '3001'
    ? ''
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.'))
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : '';

  window.AuthApi = {
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
})();
