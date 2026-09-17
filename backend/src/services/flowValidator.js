// CodeMind AI flow validation engine.
// Validates Mermaid structure and cross-checks common source-code constructs.

function clean(value = '') {
  return String(value).replace(/<br\s*\/?>/gi, ' ').replace(/\\"/g, '"').replace(/\s+/g, ' ').trim();
}

function parseNodes(mermaid) {
  const nodes = new Map();
  const lines = String(mermaid || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^graph\s+/i.test(line) || /^%%/.test(line) || /^(subgraph|end|classDef|class|style|linkStyle)\b/i.test(line)) continue;
    const re = /(?:^|-->|---|==>|-\.->|\s)([A-Za-z][A-Za-z0-9_-]*)\s*(\{?|\[|\(\[|\/\[)/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      const id = m[1];
      const after = line.slice(m.index + m[0].length - 1);
      let type = 'process';
      if (after.startsWith('{')) type = 'decision';
      else if (/^\/\[/.test(after)) type = 'io';
      else if (/^\(\[/.test(after)) type = 'terminal';
      const labelMatch = after.match(/^\{\s*([^}]*)\}|^\[\s*([^\]]*)\]|^\(\[\s*([^\]]*)\]\)/);
      const label = clean(labelMatch?.[1] ?? labelMatch?.[2] ?? labelMatch?.[3] ?? id);
      const existing = nodes.get(id);
      if (existing) {
        existing.definitions += 1;
        if (existing.type !== type || existing.label !== label) existing.conflicts.push({ type, label });
      } else {
        nodes.set(id, { id, type, label, definitions: 1, conflicts: [] });
      }
    }
  }
  return { lines, nodes };
}

function parseEdges(mermaid) {
  const edges = [];
  const lines = String(mermaid || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const edgeRe = /([A-Za-z][A-Za-z0-9_-]*)\s*(?:--\s*"([^"]*)"\s*-->|-->|-\.->|==>)\s*([A-Za-z][A-Za-z0-9_-]*)/g;
  for (const line of lines) {
    let m;
    while ((m = edgeRe.exec(line)) !== null) {
      edges.push({ id: `edge_${edges.length + 1}`, source: m[1], label: clean(m[2] || ''), target: m[3] });
    }
  }
  return edges;
}

function reachable(startId, edges) {
  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source).push(e.target);
  }
  const seen = new Set();
  const queue = startId ? [startId] : [];
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    (adj.get(id) || []).forEach(next => { if (!seen.has(next)) queue.push(next); });
  }
  return seen;
}

function cycleExists(nodes, edges) {
  const adj = new Map();
  edges.forEach(e => { if (!adj.has(e.source)) adj.set(e.source, []); adj.get(e.source).push(e.target); });
  const visiting = new Set();
  const visited = new Set();
  const dfs = id => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const next of adj.get(id) || []) if (dfs(next)) return true;
    visiting.delete(id); visited.add(id); return false;
  };
  for (const n of nodes) if (dfs(n.id)) return true;
  return false;
}

export function parseFlowGraph(mermaid = '') {
  const { lines, nodes } = parseNodes(mermaid);
  const edges = parseEdges(mermaid);
  for (const e of edges) {
    for (const id of [e.source, e.target]) {
      if (!nodes.has(id)) nodes.set(id, { id, type: 'implicit', label: id, definitions: 0, conflicts: [] });
    }
  }
  const directionLine = lines.find(l => /^graph\s+/i.test(l));
  return { direction: directionLine ? directionLine.replace(/^graph\s+/i, '').trim() : 'UNKNOWN', nodes: [...nodes.values()], edges };
}

export function validateFlow({ code = '', mermaid = '', steps = [] } = {}) {
  const errors = [];
  const warnings = [];
  const graph = parseFlowGraph(mermaid);
  const explicit = graph.nodes.filter(n => n.definitions > 0);
  const ids = new Set(explicit.map(n => n.id));
  const outgoing = new Map();

  if (!/^TD$/i.test(graph.direction)) warnings.push({ code: 'NON_TOP_DOWN_GRAPH', message: `Graph direction is ${graph.direction}; top-down rendering is recommended.` });
  if (!mermaid.trim()) errors.push({ code: 'EMPTY_FLOW', message: 'No Mermaid flow was generated.' });
  if (!/^graph\s+/i.test(mermaid.trim())) errors.push({ code: 'INVALID_GRAPH_HEADER', message: 'Flow must start with a Mermaid graph declaration.' });

  for (const e of graph.edges) {
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    outgoing.get(e.source).push(e);
    if (!ids.has(e.source)) warnings.push({ code: 'IMPLICIT_SOURCE_NODE', message: `Edge ${e.id} references an undeclared source node ${e.source}.`, nodeId: e.source });
    if (!ids.has(e.target)) warnings.push({ code: 'IMPLICIT_TARGET_NODE', message: `Edge ${e.id} references an undeclared target node ${e.target}.`, nodeId: e.target });
  }

  explicit.filter(n => n.conflicts.length).forEach(n => errors.push({ code: 'CONFLICTING_NODE_DEFINITION', message: `Node ${n.id} has conflicting definitions.`, nodeId: n.id }));

  const starts = explicit.filter(n => /^start$/i.test(n.label));
  const ends = explicit.filter(n => /^end$/i.test(n.label));
  if (!starts.length) errors.push({ code: 'MISSING_START', message: 'The flow has no explicit Start node.' });
  if (!ends.length) warnings.push({ code: 'MISSING_END', message: 'No explicit End node was found.' });
  if (starts.length > 1) warnings.push({ code: 'MULTIPLE_START', message: 'Multiple Start nodes were found.' });
  if (ends.length > 1) warnings.push({ code: 'MULTIPLE_END', message: 'Multiple End nodes were found.' });

  for (const n of explicit.filter(n => n.type === 'decision')) {
    const outs = outgoing.get(n.id) || [];
    if (outs.length < 2) warnings.push({ code: 'INCOMPLETE_DECISION', message: `Decision ${n.id} has ${outs.length} outgoing path(s).`, nodeId: n.id });
    if (outs.length >= 2 && outs.filter(e => e.label).length < 2) warnings.push({ code: 'UNLABELED_BRANCHES', message: `Decision ${n.id} has multiple paths without explicit labels.`, nodeId: n.id });
  }

  const reach = reachable(starts[0]?.id, graph.edges);
  explicit.filter(n => starts[0] && !reach.has(n.id) && !/^start$/i.test(n.label)).forEach(n => warnings.push({ code: 'UNREACHABLE_NODE', message: `Node ${n.id} (${n.label}) is unreachable from Start.`, nodeId: n.id }));

  const hasDecision = /\b(if|else\s+if|switch|case)\b|\?.*:/m.test(code);
  const hasLoop = /\b(for|while|do)\b|\.forEach\s*\(/m.test(code);
  const hasReturn = /\breturn\b/.test(code);
  if (hasDecision && !explicit.some(n => n.type === 'decision')) warnings.push({ code: 'SOURCE_DECISION_NOT_REPRESENTED', message: 'Source code contains branching, but no decision node was detected.' });
  if (hasLoop && !explicit.some(n => n.type === 'decision' || /\bloop\b/i.test(n.label))) warnings.push({ code: 'SOURCE_LOOP_NOT_REPRESENTED', message: 'Source code contains a loop, but no loop/decision structure was detected.' });
  if (hasLoop && !cycleExists(graph.nodes, graph.edges)) warnings.push({ code: 'LOOP_CYCLE_NOT_FOUND', message: 'Source code contains a loop, but the generated flow has no cycle.' });
  if (hasReturn && !ends.length && !explicit.some(n => n.type === 'terminal')) warnings.push({ code: 'RETURN_NOT_TERMINATED', message: 'Source code contains return, but the flow has no explicit terminal node.' });

  const allIds = new Set(graph.nodes.map(n => n.id));
  steps.forEach((step, index) => {
    const id = typeof step === 'string' ? step : step?.id;
    if (id && !allIds.has(id)) errors.push({ code: 'STEP_NODE_MISSING', message: `Step ${index + 1} references unknown node ${id}.`, nodeId: id });
  });

  const status = errors.length ? 'invalid' : warnings.length ? 'warning' : 'valid';
  return {
    valid: errors.length === 0,
    status,
    errors,
    warnings,
    graph,
    summary: { nodeCount: graph.nodes.length, edgeCount: graph.edges.length, reachableNodeCount: reach.size, hasCycle: cycleExists(graph.nodes, graph.edges) },
  };
}
