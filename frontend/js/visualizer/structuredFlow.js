(function () {
  'use strict';

  const app = {
    graph: null,
    validation: null,
    code: '',
    selectedNodeId: null,
    activeNodeId: null,
    trace: [],
    traceIndex: -1,
    playing: false,
    timer: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    width: 1200,
    height: 760,
    positions: new Map(),
    active: false,
    installed: false,
  };

  const TYPE_STYLE = {
    start: { fill: 'rgba(16,185,129,.16)', stroke: '#10b981', icon: '▶' },
    end: { fill: 'rgba(239,68,68,.14)', stroke: '#ef4444', icon: '■' },
    process: { fill: 'rgba(0,229,255,.10)', stroke: '#00e5ff', icon: '▣' },
    decision: { fill: 'rgba(245,158,11,.12)', stroke: '#f59e0b', icon: '?' },
    loop: { fill: 'rgba(249,115,22,.12)', stroke: '#f97316', icon: '↻' },
    function: { fill: 'rgba(124,58,237,.13)', stroke: '#8b5cf6', icon: 'ƒ' },
    return: { fill: 'rgba(16,185,129,.13)', stroke: '#22c55e', icon: '↩' },
    input: { fill: 'rgba(59,130,246,.12)', stroke: '#60a5fa', icon: '↓' },
    output: { fill: 'rgba(34,197,94,.12)', stroke: '#4ade80', icon: '↑' },
    import: { fill: 'rgba(168,85,247,.10)', stroke: '#a78bfa', icon: '↳' },
    class: { fill: 'rgba(20,184,166,.10)', stroke: '#2dd4bf', icon: 'C' },
    component: { fill: 'rgba(97,218,251,.10)', stroke: '#61dafb', icon: '⚛' },
    state: { fill: 'rgba(234,179,8,.10)', stroke: '#facc15', icon: 'S' },
    route: { fill: 'rgba(244,63,94,.10)', stroke: '#fb7185', icon: '⇄' },
    query: { fill: 'rgba(245,158,11,.10)', stroke: '#fbbf24', icon: 'DB' },
    default: { fill: 'rgba(51,65,85,.40)', stroke: '#64748b', icon: '•' },
  };

  function $(id) { return document.getElementById(id); }

  function el(tag, attrs, text) {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
    if (text != null) n.textContent = text;
    return n;
  }

  function svgEl(tag, attrs, text) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
    if (text != null) n.textContent = text;
    return n;
  }

  function injectStyles() {
    if ($('structured-flow-styles')) return;
    const style = document.createElement('style');
    style.id = 'structured-flow-styles';
    style.textContent = `
      #structuredFlowOverlay{position:absolute;inset:0;z-index:20;background:rgba(7,10,18,.97);display:none;overflow:hidden}
      #structuredFlowOverlay.active{display:block}
      .sf-toolbar{position:absolute;top:12px;left:12px;right:12px;z-index:3;display:flex;align-items:center;gap:7px;padding:8px 10px;border:1px solid #20283a;border-radius:10px;background:rgba(11,15,25,.92);backdrop-filter:blur(10px);box-shadow:0 10px 30px rgba(0,0,0,.25)}
      .sf-toolbar .sf-title{margin-right:auto;font:700 11px Inter,sans-serif;color:#cbd5e1;letter-spacing:.6px;text-transform:uppercase}
      .sf-toolbar button{border:1px solid #293449;background:#111827;color:#94a3b8;border-radius:7px;padding:6px 9px;font:700 10px Inter,sans-serif;cursor:pointer}
      .sf-toolbar button:hover{border-color:#00e5ff;color:#e2e8f0}
      .sf-toolbar button.sf-primary{border-color:#00e5ff;color:#00e5ff;background:rgba(0,229,255,.07)}
      .sf-status{font:700 9px JetBrains Mono,monospace;padding:5px 7px;border-radius:6px;white-space:nowrap}
      .sf-status.valid{color:#34d399;background:rgba(16,185,129,.10);border:1px solid rgba(16,185,129,.28)}
      .sf-status.warning{color:#fbbf24;background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.28)}
      .sf-status.invalid{color:#fb7185;background:rgba(239,68,68,.10);border:1px solid rgba(239,68,68,.28)}
      #structuredFlowSvg{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab}
      #structuredFlowSvg.panning{cursor:grabbing}
      .sf-node{cursor:pointer}
      .sf-node .sf-body{transition:opacity .15s}
      .sf-node.dim .sf-body{opacity:.28}
      .sf-node.selected .sf-body{filter:drop-shadow(0 0 12px rgba(0,229,255,.36))}
      .sf-node.trace .sf-body{filter:drop-shadow(0 0 11px rgba(16,185,129,.38))}
      .sf-node.trace .sf-trace-dot{opacity:1}
      .sf-edge{fill:none;stroke:#334155;stroke-width:2;opacity:.8;transition:opacity .15s,stroke .15s,stroke-width .15s}
      .sf-edge.dim{opacity:.20}
      .sf-edge.active{stroke:#00e5ff;stroke-width:3;opacity:1}
      .sf-edge.trace{stroke:#10b981;stroke-width:3;opacity:1;stroke-dasharray:7 5}
      .sf-edge-label{font:700 10px Inter,sans-serif;fill:#94a3b8}
      .sf-node-label{font:700 11px JetBrains Mono,monospace;fill:#e2e8f0}
      .sf-node-type{font:700 8px Inter,sans-serif;fill:#64748b;letter-spacing:.7px;text-transform:uppercase}
      .sf-node-line{font:500 8px JetBrains Mono,monospace;fill:#475569}
      .sf-trace-dot{opacity:0;fill:#10b981;stroke:#d1fae5;stroke-width:1.5}
      .sf-empty{font:600 13px Inter,sans-serif;fill:#64748b}
      .sf-hint{position:absolute;left:14px;bottom:12px;z-index:2;padding:6px 8px;border:1px solid #20283a;border-radius:7px;background:rgba(11,15,25,.88);font:600 9px Inter,sans-serif;color:#64748b}
      .sf-inspector{position:absolute;right:12px;bottom:12px;z-index:4;width:min(330px,calc(100% - 24px));max-height:42%;overflow:auto;padding:10px 11px;border:1px solid #20283a;border-radius:10px;background:rgba(11,15,25,.94);box-shadow:0 12px 34px rgba(0,0,0,.30);display:none}
      .sf-inspector.active{display:block}
      .sf-inspector-title{font:800 10px Inter,sans-serif;color:#00e5ff;text-transform:uppercase;letter-spacing:.7px;margin-bottom:6px}
      .sf-inspector-main{font:800 12px JetBrains Mono,monospace;color:#f8fafc}
      .sf-inspector-sub{font:500 9px Inter,sans-serif;color:#64748b;margin-top:3px}
      .sf-inspector p{font:500 10px/1.5 Inter,sans-serif;color:#cbd5e1;margin:8px 0 0}
      .sf-inspector .sf-details{margin:7px 0 0;padding-left:15px;color:#94a3b8;font:500 9px/1.5 Inter,sans-serif}
    `;
    document.head.appendChild(style);
  }

  function getOrCreateOverlay() {
    const canvas = $('vizCanvas');
    if (!canvas) return null;
    let overlay = $('structuredFlowOverlay');
    if (overlay) return overlay;

    overlay = el('div', { id: 'structuredFlowOverlay' });
    overlay.innerHTML = `
      <div class="sf-toolbar">
        <span class="sf-title">Structured Execution Graph</span>
        <span class="sf-status warning" id="sfValidation">WAITING</span>
        <button id="sfZoomOut" title="Zoom out">−</button>
        <button id="sfZoomIn" title="Zoom in">+</button>
        <button id="sfFit" title="Reset zoom and pan">Fit</button>
        <button id="sfTrace" title="Run dry-run trace">Dry Run</button>
        <button id="sfExplain" class="sf-primary" title="Explain selected node">Explain</button>
        <button id="sfClose" title="Close structured flow">Close</button>
      </div>
      <svg id="structuredFlowSvg" aria-label="Interactive structured flow graph"></svg>
      <div class="sf-hint">Click a node to inspect · Mouse wheel to zoom · Drag to pan</div>
      <div class="sf-inspector" id="sfInspector"></div>
    `;
    canvas.appendChild(overlay);

    $('sfZoomOut').addEventListener('click', () => setZoom(app.zoom - 0.15));
    $('sfZoomIn').addEventListener('click', () => setZoom(app.zoom + 0.15));
    $('sfFit').addEventListener('click', fitView);
    $('sfTrace').addEventListener('click', runDryRunTrace);
    $('sfExplain').addEventListener('click', explainSelectedNode);
    $('sfClose').addEventListener('click', () => setActive(false));

    const svg = $('structuredFlowSvg');
    svg.addEventListener('wheel', onWheel, { passive: false });
    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerUp);
    svg.addEventListener('pointercancel', onPointerUp);
    svg.addEventListener('pointerleave', onPointerUp);
    window.addEventListener('resize', () => { if (app.active && app.graph) renderGraph(); });

    return overlay;
  }

  let pointer = null;

  function onPointerDown(event) {
    if (event.target.closest && event.target.closest('.sf-node')) return;
    pointer = { x: event.clientX, y: event.clientY, panX: app.panX, panY: app.panY };
    $('structuredFlowSvg').classList.add('panning');
  }

  function onPointerMove(event) {
    if (!pointer) return;
    app.panX = pointer.panX + (event.clientX - pointer.x) / Math.max(.5, app.zoom);
    app.panY = pointer.panY + (event.clientY - pointer.y) / Math.max(.5, app.zoom);
    applyViewport();
  }

  function onPointerUp() {
    pointer = null;
    $('structuredFlowSvg')?.classList.remove('panning');
  }

  function onWheel(event) {
    event.preventDefault();
    const next = app.zoom + (event.deltaY < 0 ? .10 : -.10);
    setZoom(next);
  }

  function setZoom(value) {
    app.zoom = Math.max(.55, Math.min(2.5, value));
    applyViewport();
  }

  function applyViewport() {
    const root = $('sfGraphRoot');
    if (root) root.setAttribute('transform', `translate(${app.panX} ${app.panY}) scale(${app.zoom})`);
  }

  function fitView() {
    app.zoom = 1;
    app.panX = 0;
    app.panY = 0;
    applyViewport();
  }

  function normalizeGraph(graph) {
    if (!graph || typeof graph !== 'object') return null;
    return {
      version: graph.version || '1.0',
      language: graph.language || 'unknown',
      nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
      edges: Array.isArray(graph.edges) ? graph.edges : [],
    };
  }

  function layoutGraph(graph) {
    const nodes = graph.nodes;
    const edges = graph.edges;
    const byId = new Map(nodes.map(n => [n.id, n]));
    const outgoing = new Map();
    const incomingCount = new Map(nodes.map(n => [n.id, 0]));
    nodes.forEach(n => outgoing.set(n.id, []));

    edges.forEach(e => {
      if (!byId.has(e.source) || !byId.has(e.target)) return;
      outgoing.get(e.source).push(e.target);
      incomingCount.set(e.target, (incomingCount.get(e.target) || 0) + 1);
    });

    const root = nodes.find(n => n.type === 'start')?.id || nodes.find(n => (incomingCount.get(n.id) || 0) === 0)?.id || nodes[0]?.id;
    const rank = new Map();
    const queue = root ? [root] : [];
    if (root) rank.set(root, 0);

    while (queue.length) {
      const id = queue.shift();
      const nextRank = (rank.get(id) || 0) + 1;
      for (const target of outgoing.get(id) || []) {
        if (!rank.has(target)) {
          rank.set(target, nextRank);
          queue.push(target);
        }
      }
    }

    const maxRank = Math.max(0, ...Array.from(rank.values()));
    nodes.forEach(node => {
      if (!rank.has(node.id)) rank.set(node.id, maxRank + 1);
    });

    const layers = new Map();
    nodes.forEach(node => {
      const r = rank.get(node.id) || 0;
      const arr = layers.get(r) || [];
      arr.push(node);
      layers.set(r, arr);
    });

    const maxCols = Math.max(1, ...Array.from(layers.values()).map(a => a.length));
    const layerGapY = 145;
    const nodeGapX = 230;
    const width = Math.max(1100, 180 + maxCols * nodeGapX);
    const height = Math.max(680, 100 + (maxRank + 1) * layerGapY);

    const positions = new Map();
    for (const [r, layerNodes] of layers.entries()) {
      layerNodes.sort((a, b) => (a.lineStart || 0) - (b.lineStart || 0));
      const total = (layerNodes.length - 1) * nodeGapX;
      const startX = width / 2 - total / 2;
      layerNodes.forEach((node, i) => positions.set(node.id, { x: startX + i * nodeGapX, y: 75 + r * layerGapY, w: node.type === 'decision' ? 100 : 190, h: 66, rank: r }));
    }

    return { positions, width, height, byId };
  }

  function makeEdgePath(source, target, positions) {
    const s = positions.get(source);
    const t = positions.get(target);
    if (!s || !t) return null;

    if (t.rank > s.rank) {
      const y1 = s.y + s.h / 2;
      const y2 = t.y - t.h / 2;
      const midY = (y1 + y2) / 2;
      return `M ${s.x} ${y1} C ${s.x} ${midY}, ${t.x} ${midY}, ${t.x} ${y2}`;
    }

    const side = s.x <= t.x ? 1 : -1;
    const x = side > 0 ? Math.max(s.x, t.x) + 100 : Math.min(s.x, t.x) - 100;
    return `M ${s.x} ${s.y + s.h / 2} C ${x} ${s.y + 95}, ${x} ${t.y - 95}, ${t.x} ${t.y - t.h / 2}`;
  }

  function isConnected(nodeId) {
    if (!app.selectedNodeId) return false;
    if (nodeId === app.selectedNodeId) return true;
    return app.graph.edges.some(e => (e.source === app.selectedNodeId && e.target === nodeId) || (e.target === app.selectedNodeId && e.source === nodeId));
  }

  function traceNodeIds() {
    return new Set(app.trace.map(s => s.nodeId).filter(Boolean));
  }

  function renderGraph() {
    const svg = $('structuredFlowSvg');
    if (!svg || !app.graph) return;
    const layout = layoutGraph(app.graph);
    app.positions = layout.positions;
    app.width = layout.width;
    app.height = layout.height;
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);

    const defs = svgEl('defs');
    const marker = svgEl('marker', { id: 'sfArrow', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' });
    marker.appendChild(svgEl('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#475569' }));
    const activeMarker = svgEl('marker', { id: 'sfArrowActive', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' });
    activeMarker.appendChild(svgEl('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#00e5ff' }));
    defs.appendChild(marker);
    defs.appendChild(activeMarker);
    svg.appendChild(defs);

    const root = svgEl('g', { id: 'sfGraphRoot' });
    svg.appendChild(root);

    const traceIds = traceNodeIds();
    const selected = app.selectedNodeId;

    app.graph.edges.forEach(edge => {
      const path = makeEdgePath(edge.source, edge.target, app.positions);
      if (!path) return;
      const connected = selected && (edge.source === selected || edge.target === selected);
      const trace = traceIds.has(edge.source) && traceIds.has(edge.target);
      const p = svgEl('path', {
        d: path,
        class: `sf-edge${selected && !connected ? ' dim' : ''}${connected ? ' active' : ''}${trace ? ' trace' : ''}`,
        'marker-end': connected ? 'url(#sfArrowActive)' : 'url(#sfArrow)',
        'data-edge-id': edge.id || '',
      });
      root.appendChild(p);

      if (edge.label) {
        const s = app.positions.get(edge.source);
        const t = app.positions.get(edge.target);
        if (s && t) {
          const x = (s.x + t.x) / 2;
          const y = (s.y + t.y) / 2 - 7;
          const text = svgEl('text', { x, y, 'text-anchor': 'middle', class: 'sf-edge-label' }, String(edge.label));
          root.appendChild(text);
        }
      }
    });

    app.graph.nodes.forEach(node => {
      const p = app.positions.get(node.id);
      if (!p) return;
      const style = TYPE_STYLE[node.type] || TYPE_STYLE.default;
      const group = svgEl('g', {
        class: `sf-node${selected && !isConnected(node.id) ? ' dim' : ''}${selected === node.id ? ' selected' : ''}${traceIds.has(node.id) ? ' trace' : ''}`,
        'data-node-id': node.id,
        tabindex: '0'
      });
      group.addEventListener('click', event => {
        event.stopPropagation();
        selectNode(node.id, true);
      });
      group.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectNode(node.id, true);
        }
      });

      let body;
      if (node.type === 'decision') {
        body = svgEl('polygon', {
          points: `${p.x},${p.y-p.h/2} ${p.x+p.w/2},${p.y} ${p.x},${p.y+p.h/2} ${p.x-p.w/2},${p.y}`,
          fill: style.fill, stroke: style.stroke, 'stroke-width': selected === node.id ? 2.5 : 1.5, class: 'sf-body'
        });
      } else if (node.type === 'start' || node.type === 'end') {
        body = svgEl('rect', {
          x: p.x-p.w/2, y: p.y-p.h/2, width: p.w, height: p.h, rx: 28,
          fill: style.fill, stroke: style.stroke, 'stroke-width': selected === node.id ? 2.5 : 1.5, class: 'sf-body'
        });
      } else {
        body = svgEl('rect', {
          x: p.x-p.w/2, y: p.y-p.h/2, width: p.w, height: p.h, rx: 10,
          fill: style.fill, stroke: style.stroke, 'stroke-width': selected === node.id ? 2.5 : 1.5, class: 'sf-body'
        });
      }
      group.appendChild(body);

      if (traceIds.has(node.id)) {
        group.appendChild(svgEl('circle', { cx: p.x+p.w/2-8, cy: p.y-p.h/2+8, r: 5, class: 'sf-trace-dot' }));
      }

      group.appendChild(svgEl('text', { x: p.x-p.w/2+12, y: p.y-14, class: 'sf-node-type' }, `${style.icon} ${node.type || 'node'}`));
      const label = String(node.label || node.id).slice(0, 34);
      group.appendChild(svgEl('text', { x: p.x-p.w/2+12, y: p.y+4, class: 'sf-node-label' }, label));
      const lineLabel = node.lineStart ? `L${node.lineStart}${node.lineEnd && node.lineEnd !== node.lineStart ? `–${node.lineEnd}` : ''}` : 'source unmapped';
      group.appendChild(svgEl('text', { x: p.x-p.w/2+12, y: p.y+22, class: 'sf-node-line' }, `${node.id} · ${lineLabel}`));
      root.appendChild(group);
    });

    const title = svgEl('text', { x: 25, y: 30, class: 'sf-node-type' }, `${app.graph.language} · ${app.graph.nodes.length} nodes · ${app.graph.edges.length} edges`);
    root.appendChild(title);
    applyViewport();
  }

  function updateValidationBadge() {
    const badge = $('sfValidation');
    if (!badge) return;
    const status = app.validation?.status || 'warning';
    badge.className = `sf-status ${status === 'valid' ? 'valid' : status === 'invalid' ? 'invalid' : 'warning'}`;
    const errors = app.validation?.errors?.length || 0;
    const warnings = app.validation?.warnings?.length || 0;
    badge.textContent = status.toUpperCase() + (errors || warnings ? ` · ${errors}E ${warnings}W` : '');
  }

  function renderInspector(node, explanation) {
    const panel = $('sfInspector');
    if (!panel || !node) return;
    panel.classList.add('active');
    panel.innerHTML = '';
    panel.appendChild(el('div', { class: 'sf-inspector-title' }, 'Selected Flow Node'));
    panel.appendChild(el('div', { class: 'sf-inspector-main' }, node.label || node.id));
    panel.appendChild(el('div', { class: 'sf-inspector-sub' }, `${node.type || 'node'} · ${node.id} · ${node.lineStart ? `lines ${node.lineStart}–${node.lineEnd || node.lineStart}` : 'source unmapped'}`));
    if (explanation) {
      panel.appendChild(el('p', {}, explanation.summary || explanation.title || 'Static explanation generated from the validated flow graph.'));
      if (Array.isArray(explanation.details) && explanation.details.length) {
        const ul = el('ul', { class: 'sf-details' });
        explanation.details.slice(0, 5).forEach(detail => ul.appendChild(el('li', {}, String(detail))));
        panel.appendChild(ul);
      }
    }
  }

  function selectNode(nodeId, explain) {
    app.selectedNodeId = nodeId;
    const node = app.graph?.nodes?.find(n => n.id === nodeId);
    renderGraph();
    renderInspector(node);
    if (explain) explainSelectedNode();
  }

  async function explainSelectedNode() {
    if (!app.graph || !app.selectedNodeId) {
      showToast('Select a flow node first.');
      return;
    }
    const aiPanel = $('aiPanel');
    const node = app.graph.nodes.find(n => n.id === app.selectedNodeId);
    if (!node) return;

    $('sfExplain').disabled = true;
    $('sfExplain').textContent = 'Thinking…';
    try {
      const result = await window.VisualizerApi.explainFlow({
        code: app.code,
        graph: app.graph,
        selectedNodeId: app.selectedNodeId,
        executionState: app.trace[app.traceIndex] || null,
        ragContext: '',
        mode: 'node'
      });
      const explanation = result?.explanation || {};
      renderInspector(node, explanation);
      if (aiPanel) {
        aiPanel.innerHTML = '';
        const wrap = el('div', { class: 'ai-explain' });
        wrap.appendChild(el('span', { class: 'step-label' }, `${explanation.title || node.label} — `));
        wrap.appendChild(document.createTextNode(explanation.summary || 'Static explanation generated from the validated flow graph.'));
        if (Array.isArray(explanation.details) && explanation.details.length) {
          wrap.appendChild(document.createElement('br'));
          wrap.appendChild(document.createTextNode(explanation.details.slice(0, 3).join(' · ')));
        }
        if (Array.isArray(explanation.limitations) && explanation.limitations.length) {
          wrap.appendChild(document.createElement('br'));
          const limit = el('span', { style: 'color:var(--text3)' }, `Limits: ${explanation.limitations[0]}`);
          wrap.appendChild(limit);
        }
        aiPanel.appendChild(wrap);
      }
    } catch (error) {
      showToast(error.message || 'Flow explanation failed', 'error');
    } finally {
      $('sfExplain').disabled = false;
      $('sfExplain').textContent = 'Explain';
    }
  }

  function mapTraceToNode(step) {
    if (!app.graph) return null;
    const line = Number(step?.line ?? step?.lineNumber ?? step?.sourceLine ?? 0);
    if (Number.isInteger(line) && line > 0) {
      const candidates = app.graph.nodes.filter(n => Number(n.lineStart || n.line || 0) <= line && Number(n.lineEnd || n.lineStart || n.line || 0) >= line);
      if (candidates.length) return candidates[candidates.length - 1].id;
      const nearest = app.graph.nodes
        .filter(n => Number(n.lineStart || n.line || 0) > 0)
        .sort((a, b) => Math.abs(Number(a.lineStart) - line) - Math.abs(Number(b.lineStart) - line))[0];
      if (nearest) return nearest.id;
    }
    return app.graph.nodes[Math.min(app.traceIndex, app.graph.nodes.length - 1)]?.id || null;
  }

  async function runDryRunTrace() {
    if (!app.code || !window.VisualizerApi) return;
    stopTrace();
    $('sfTrace').disabled = true;
    $('sfTrace').textContent = 'Running…';
    try {
      const input = $('testInput')?.value || '';
      const result = await window.VisualizerApi.runDryRun(app.code, input);
      const rawSteps = Array.isArray(result?.steps) ? result.steps : [];
      app.trace = rawSteps.map((step, i) => ({ ...step, nodeId: mapTraceToNode(step), traceIndex: i }));
      app.traceIndex = -1;
      if (!app.trace.length) {
        showToast('Dry run returned no execution steps.', 'error');
        return;
      }
      app.playing = true;
      advanceTrace();
    } catch (error) {
      showToast(error.message || 'Dry run failed', 'error');
    } finally {
      $('sfTrace').disabled = false;
      $('sfTrace').textContent = 'Dry Run';
    }
  }

  function advanceTrace() {
    if (!app.playing) return;
    app.traceIndex += 1;
    if (app.traceIndex >= app.trace.length) {
      app.playing = false;
      app.activeNodeId = app.trace[app.trace.length - 1]?.nodeId || null;
      renderGraph();
      return;
    }
    const step = app.trace[app.traceIndex];
    app.activeNodeId = step.nodeId || null;
    if (step.nodeId) {
      app.selectedNodeId = step.nodeId;
      renderInspector(app.graph.nodes.find(n => n.id === step.nodeId));
    }
    renderGraph();
    app.timer = setTimeout(advanceTrace, 650);
  }

  function stopTrace() {
    app.playing = false;
    clearTimeout(app.timer);
    app.timer = null;
  }

  function showToast(message, type) {
    if (typeof window.showToast === 'function') window.showToast(message, type || '');
    else console.log(`[StructuredFlow] ${message}`);
  }

  function setActive(active) {
    const overlay = getOrCreateOverlay();
    if (!overlay) return;
    app.active = active;
    overlay.classList.toggle('active', active);
    overlay.style.pointerEvents = active ? 'auto' : 'none';
    if (active && app.graph) {
      renderGraph();
      fitView();
    }
    if (!active) stopTrace();
  }

  function captureGenerateResponse(result, code) {
    app.code = code || '';
    app.graph = normalizeGraph(result?.graph);
    app.validation = result?.validation || null;
    app.selectedNodeId = null;
    app.activeNodeId = null;
    app.trace = [];
    app.traceIndex = -1;

    if (!app.graph || !app.graph.nodes.length) return;
    getOrCreateOverlay();
    updateValidationBadge();
    renderGraph();
    setActive(true);
    showToast(`🧩 Structured Flow ready — ${app.graph.nodes.length} nodes · ${app.graph.edges.length} edges`);
  }

  function install() {
    if (app.installed || !window.VisualizerApi?.generateFlowGraph) return;
    app.installed = true;
    injectStyles();
    getOrCreateOverlay();

    const originalGenerate = window.VisualizerApi.generateFlowGraph;
    window.VisualizerApi.generateFlowGraph = async function (code, isRetry, customInput) {
      const result = await originalGenerate.call(this, code, isRetry, customInput);
      try { captureGenerateResponse(result, code); } catch (error) { console.error('[StructuredFlow] capture failed', error); }
      return result;
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
