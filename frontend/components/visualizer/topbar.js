class AppVisualizerTopbar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header class="topbar">
        <a href="/" class="logo-group">
          <div class="logo-mark" style="background: none; padding: 0; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;">
            <img src="/assets/images/logo.png" style="width: 100%; height: 100%; object-fit: contain; border-radius: 4px;" alt="Logo">
          </div>
          <div class="logo-text">Code<span>Mind</span></div>
        </a>
        <div class="topbar-sep"></div>
        <div class="topbar-title">Universal Visualizer <span class="badge ai">AI</span></div>
        <div class="topbar-right">
          <div class="mode-select-wrap">
            <label>Mode</label>
            <select class="mode-select mode-auto" id="modeSelect" onchange="onModeChange()">
              <option value="auto">🤖 Auto Detect</option>
              <option value="dsa">📊 DSA Visualization</option>
              <option value="general">⚙️ General Execution</option>
              <option value="debug">🐛 Debug Review</option>
              <option value="systemflow">🏗️ System Flow</option>
            </select>
          </div>
          <div id="algoWrap" style="display:flex;align-items:center;gap:5px">
            <select class="algo-select" id="algoSelect" onchange="loadAlgorithm()">
              <optgroup label="Sorting">
                <option value="bubble_sort">Bubble Sort</option>
                <option value="selection_sort">Selection Sort</option>
                <option value="insertion_sort">Insertion Sort</option>
                <option value="merge_sort">Merge Sort</option>
                <option value="quick_sort">Quick Sort</option>
              </optgroup>
              <optgroup label="Searching">
                <option value="linear_search">Linear Search</option>
                <option value="binary_search">Binary Search</option>
              </optgroup>
              <optgroup label="Data Structures">
                <option value="linked_list_traversal">Linked List Traverse</option>
                <option value="linked_list_reverse">Linked List Reverse</option>
                <option value="stack_ops">Stack Ops</option>
                <option value="queue_ops">Queue Ops</option>
              </optgroup>
              <optgroup label="Trees & Graphs">
                <option value="bst_insert">BST Insert</option>
                <option value="bfs_tree">BFS Tree</option>
                <option value="dfs_tree">DFS Tree</option>
              </optgroup>
              <optgroup label="Techniques">
                <option value="two_pointers">Two Pointers</option>
                <option value="sliding_window">Sliding Window</option>
                <option value="fibonacci_dp">Fibonacci DP</option>
              </optgroup>
            </select>
          </div>
          <select class="lang-select" id="langSelect" onchange="loadAlgorithm()">
            <option value="python">Python</option><option value="javascript">JavaScript</option>
            <option value="java">Java</option><option value="cpp">C++</option>
          </select>
          <button class="upload-code-btn" onclick="document.getElementById('fileInput').click()">📎 Upload</button>
          <input type="file" id="fileInput" accept=".py,.js,.ts,.jsx,.tsx,.java,.cpp,.c,.go,.rs,.php,.rb,.swift,.kt,.cs,.html,.css,.json,.sql,.md,.txt" onchange="handleFileUpload(event)"/>
          <a href="/" class="tb-btn">← Chat</a>
        </div>
      </header>
    `;
  }
}

customElements.define('app-visualizer-topbar', AppVisualizerTopbar);
