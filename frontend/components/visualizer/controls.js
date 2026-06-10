class AppVisualizerControls extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="bottom-controls">
        <div class="ctrl-group">
          <button class="ctrl-btn" id="btnFirst" onclick="goToStep(0)" disabled title="First">⏮</button>
          <button class="ctrl-btn" id="btnPrev"  onclick="prevStep()"  disabled title="Prev">◀</button>
          <button class="ctrl-btn ctrl-play" id="btnPlay" onclick="togglePlay()" disabled title="Play">▶</button>
          <button class="ctrl-btn" id="btnNext"  onclick="nextStep()"  disabled title="Next">▶</button>
          <button class="ctrl-btn" id="btnLast"  onclick="goToStep(-1)" disabled title="Last">⏭</button>
        </div>
        <div class="ctrl-sep"></div>
        <div class="step-display">Step <span id="stepCurrent">0</span>/<span id="stepTotal">0</span></div>
        <div class="ctrl-sep"></div>
        <div class="prog-wrap">
          <div class="prog-bg"><div class="prog-fill" id="progressFill" style="width:0%"></div></div>
        </div>
        <div class="ctrl-sep"></div>
        <div class="speed-group">
          <span class="speed-label">Speed</span>
          <input type="range" class="speed-slider" id="speedSlider" min="1" max="5" value="3" oninput="updateSpeed(this.value)">
          <span class="speed-val" id="speedLabel">1x</span>
        </div>
        <div class="ctrl-sep"></div>
        <button class="reset-btn" onclick="resetAll()">↺ Reset</button>
      </footer>
    `;
  }
}

customElements.define('app-visualizer-controls', AppVisualizerControls);
