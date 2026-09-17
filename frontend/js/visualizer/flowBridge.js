(function () {
  'use strict';

  function showError(message) {
    console.warn('[FlowBridge]', message);
    if (typeof window.showToast === 'function') {
      try { window.showToast(message, 'warn'); } catch (_) {}
    }
  }

  async function loadStructuredFlow() {
    const codeEl = document.getElementById('codeEditor');
    if (!codeEl || !window.VisualizerApi?.generateFlowGraph) return null;

    const code = String(codeEl.value || '').trim();
    if (code.length < 3) return null;

    const inputEl = document.getElementById('testInput');
    const customInput = String(inputEl?.value || '').trim();

    try {
      // structuredFlow.js wraps this API method and renders the response.
      return await window.VisualizerApi.generateFlowGraph(code, false, customInput);
    } catch (error) {
      showError(`Structured flow unavailable: ${error.message || 'generation failed'}`);
      return null;
    }
  }

  function install() {
    if (window.__codeMindFlowBridgeInstalled) return;
    if (typeof window.runAnalysis !== 'function') return;
    if (!window.VisualizerApi?.generateFlowGraph) return;

    window.__codeMindFlowBridgeInstalled = true;
    const originalRunAnalysis = window.runAnalysis;

    window.runAnalysis = async function (...args) {
      const result = await originalRunAnalysis.apply(this, args);

      // Keep the existing analyzer/legacy visualizations intact, then load the
      // structured graph into the new interactive flow overlay.
      await loadStructuredFlow();
      return result;
    };

    console.log('[FlowBridge] Analyze → structured flow integration enabled');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
