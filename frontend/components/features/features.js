class AppFeatures extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <section class="preview-section" id="features">
        <div class="preview-card">
          <div class="mock-header">
            <div class="mock-dots">
              <div class="mock-dot" style="background:#ef4444"></div>
              <div class="mock-dot" style="background:#f59e0b"></div>
              <div class="mock-dot" style="background:#10b981"></div>
            </div>
            <div class="mock-address-bar">codemind-ai.com/visualizer</div>
            <div style="width:40px"></div>
          </div>
          <div class="mock-body">
            <!-- Sidebar -->
            <div class="mock-sidebar">
              <div class="mock-nav-item active">💬 AI Mentor</div>
              <div class="mock-nav-item">📈 Complexity</div>
              <div class="mock-nav-item">🛠️ Dry Run</div>
            </div>
            
            <!-- Chat Area -->
            <div class="mock-chat">
              <div class="mock-chat-scroll">
                <div class="mock-bubble user" id="mockUserMsg">Dry run binary search on x = 7</div>
                <div class="mock-bubble ai" id="mockAiMsg" style="opacity: 0">
                  <strong>CodeMind AI:</strong> Here is the step-by-step trace of your search algorithm.
                </div>
              </div>
              <div class="mock-input-wrap">
                <div class="mock-input-text" id="mockInputText">Analyzing binary search code...</div>
                <div style="font-size:12px">⚡</div>
              </div>
            </div>
            
            <!-- Visualizer -->
            <div class="mock-visualizer">
              <div class="mock-viz-title">Flow Diagram</div>
              <div class="mock-viz-graph">
                <div class="mock-node" id="node1">Start</div>
                <div class="mock-arrow" id="arrow1"></div>
                <div class="mock-node" id="node2">mid = (L + R) / 2</div>
                <div class="mock-arrow" id="arrow2"></div>
                <div class="mock-node" id="node3">Return mid</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }
}
customElements.define('app-features', AppFeatures);
