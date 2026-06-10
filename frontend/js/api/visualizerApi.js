(function() {
  console.log('[VisualizerApi] script loaded and initializing...');
  const BACKEND_URL = window.location.port === '3001'
    ? ''
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.'))
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : '';

  window.VisualizerApi = {
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
