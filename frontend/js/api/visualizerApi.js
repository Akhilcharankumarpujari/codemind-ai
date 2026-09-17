(function() {
  console.log('[VisualizerApi] script loaded and initializing...');
  const BACKEND_URL = window.location.port === '3001'
    ? ''
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.'))
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : '';

  async function request(path, body, fallbackMessage) {
    const resp = await fetch(`${BACKEND_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include'
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || fallbackMessage);
    }
    return resp.json();
  }

  window.VisualizerApi = {
    async analyzeCode(code, mode) {
      return request('/api/analyze', { code, mode: mode === 'auto' ? undefined : mode }, 'Code analysis failed');
    },
    async analyzeComplexity(code, language) {
      return request('/api/complexity/analyze', { code, language }, 'Complexity analysis failed');
    },
    async generateFlowGraph(code, isRetry, customInput) {
      return request('/api/flow/generate', { code, isRetry, customInput }, 'Failed to generate flow graph');
    },
    async validateFlowGraph(graph, sourceCode = '') {
      return request('/api/flow/validate', { graph, sourceCode }, 'Flow validation failed');
    },
    async explainFlow({ code, graph, selectedNodeId = null, executionState = null, ragContext = '', mode = 'all', model } = {}) {
      return request('/api/flow/explain', {
        code, graph, selectedNodeId, executionState, ragContext, mode, model
      }, 'Flow explanation failed');
    },
    async runDryRun(code, input) {
      return request('/api/flow/dryrun', { code, input }, 'Dry run failed');
    }
  };
})();
