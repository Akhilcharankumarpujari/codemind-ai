import { randomUUID } from 'crypto';

const SUPPORTED_NODE_TYPES = new Set([
  'start', 'end', 'process', 'decision', 'loop', 'function', 'return', 'input', 'output',
  'import', 'class', 'component', 'state', 'route', 'query'
]);

function issue(severity, code, message, details = {}) {
  return { id: randomUUID(), severity, code, message, ...details };
}

function normalizeGraph(graph) {
  if (!graph || typeof graph !== 'object') {
    return { version: '1.0', nodes: [], edges: [] };
  }

  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];

  return {
    version: graph.version || '1.0',
    language: graph.language || null,
    nodes,
    edges,
    metadata: graph.metadata || {}
  };
}

function normalizeLineRange(node) {
  const start = Number(node.lineStart ?? node.line ?? 0);
  const end = Number(node.lineEnd ?? node.line ?? start);
  return { start, end };
}

export function validateFlowGraph(graph, sourceCode = '') {
  const normalized = normalizeGraph(graph);
  const errors = [];
  const warnings = [];
  const nodeById = new Map();

  if (!Array.isArray(normalized.nodes)) {
    errors.push(issue('error', 'NODES_NOT_ARRAY', 'nodes must be an array.'));
  }
  if (!Array.isArray(normalized.edges)) {
    errors.push(issue('error', 'EDGES_NOT_ARRAY', 'edges must be an array.'));
  }

  for (const node of normalized.nodes) {
    if (!node || typeof node !== 'object') {
      errors.push(issue('error', 'INVALID_NODE', 'Each node must be an object.'));
      continue;
    }

    if (!node.id || typeof node.id !== 'string') {
      errors.push(issue('error', 'MISSING_NODE_ID', 'Every node must have a string id.'));
      continue;
    }

    if (nodeById.has(node.id)) {
      errors.push(issue('error', 'DUPLICATE_NODE_ID', `Duplicate node id "${node.id}".`, { nodeId: node.id }));
      continue;
    }
    nodeById.set(node.id, node);

    if (!node.type || !SUPPORTED_NODE_TYPES.has(node.type)) {
      warnings.push(issue('warning', 'UNSUPPORTED_NODE_TYPE', `Node "${node.id}" uses unsupported type "${node.type || 'unknown'}".`, { nodeId: node.id }));
    }

    const { start, end } = normalizeLineRange(node);
    if (sourceCode && (!Number.isInteger(start) || start < 1 || end < start)) {
      warnings.push(issue('warning', 'INVALID_SOURCE_RANGE', `Node "${node.id}" has an invalid source line range.`, { nodeId: node.id }));
    }
  }

  const edgeIds = new Set();
  const outgoing = new Map();
  const incoming = new Map();

  for (const edge of normalized.edges) {
    if (!edge || typeof edge !== 'object') {
      errors.push(issue('error', 'INVALID_EDGE', 'Each edge must be an object.'));
      continue;
    }

    if (edge.id) {
      if (edgeIds.has(edge.id)) {
        errors.push(issue('error', 'DUPLICATE_EDGE_ID', `Duplicate edge id "${edge.id}".`, { edgeId: edge.id }));
      }
      edgeIds.add(edge.id);
    }

    if (!edge.source || !nodeById.has(edge.source)) {
      errors.push(issue('error', 'INVALID_EDGE_SOURCE', `Edge references missing source node "${edge.source}".`, { edgeId: edge.id }));
    }
    if (!edge.target || !nodeById.has(edge.target)) {
      errors.push(issue('error', 'INVALID_EDGE_TARGET', `Edge references missing target node "${edge.target}".`, { edgeId: edge.id }));
    }

    if (nodeById.has(edge.source)) {
      const list = outgoing.get(edge.source) || [];
      list.push(edge);
      outgoing.set(edge.source, list);
    }
    if (nodeById.has(edge.target)) {
      const list = incoming.get(edge.target) || [];
      list.push(edge);
      incoming.set(edge.target, list);
    }
  }

  const starts = normalized.nodes.filter(n => n?.type === 'start');
  const ends = normalized.nodes.filter(n => n?.type === 'end');

  if (!normalized.nodes.length) {
    errors.push(issue('error', 'EMPTY_GRAPH', 'The flow graph contains no nodes.'));
  }
  if (normalized.nodes.length && starts.length === 0) {
    warnings.push(issue('warning', 'NO_START_NODE', 'No explicit start node was found.'));
  }
  if (normalized.nodes.length && ends.length === 0) {
    warnings.push(issue('warning', 'NO_END_NODE', 'No explicit end node was found.'));
  }

  for (const node of normalized.nodes) {
    const out = outgoing.get(node.id) || [];
    if (node.type === 'decision' && out.length < 2) {
      warnings.push(issue('warning', 'DECISION_MISSING_BRANCH', `Decision node "${node.id}" has fewer than two outgoing branches.`, { nodeId: node.id }));
    }
    if (node.type === 'decision' && out.length >= 2) {
      const labels = out.map(e => String(e.label || '').trim().toLowerCase()).filter(Boolean);
      if (labels.length < 2 || new Set(labels).size < 2) {
        warnings.push(issue('warning', 'DECISION_BRANCH_LABELS', `Decision node "${node.id}" should use distinct branch labels such as Yes/No.`, { nodeId: node.id }));
      }
    }

    const lineRange = normalizeLineRange(node);
    if (sourceCode && lineRange.start > sourceCode.split('\n').length) {
      warnings.push(issue('warning', 'LINE_OUT_OF_RANGE', `Node "${node.id}" points beyond the end of the source code.`, { nodeId: node.id }));
    }
  }

  // Reachability from the first explicit start node (or first node when no start exists).
  const root = starts[0]?.id || normalized.nodes[0]?.id;
  const reachable = new Set();
  if (root) {
    const queue = [root];
    while (queue.length) {
      const id = queue.shift();
      if (reachable.has(id)) continue;
      reachable.add(id);
      for (const edge of outgoing.get(id) || []) {
        if (nodeById.has(edge.target) && !reachable.has(edge.target)) queue.push(edge.target);
      }
    }
  }

  for (const node of normalized.nodes) {
    if (node.id !== root && !reachable.has(node.id)) {
      warnings.push(issue('warning', 'UNREACHABLE_NODE', `Node "${node.id}" is unreachable from the flow entry point.`, { nodeId: node.id }));
    }
  }

  return {
    valid: errors.length === 0,
    status: errors.length ? 'invalid' : warnings.length ? 'warning' : 'valid',
    errors,
    warnings,
    summary: {
      nodeCount: normalized.nodes.length,
      edgeCount: normalized.edges.length,
      reachableNodeCount: reachable.size,
      unreachableNodeCount: normalized.nodes.filter(n => !reachable.has(n.id)).length
    }
  };
}

export function validateFlowGenerationResult(result, sourceCode = '') {
  const validation = validateFlowGraph(result?.graph, sourceCode);

  // Mermaid-only generations do not contain a structured graph. Keep them usable,
  // but explicitly report that structural validation could not be performed.
  if (!result?.graph) {
    validation.status = validation.errors.length ? 'invalid' : 'warning';
    validation.warnings.push(issue(
      'warning',
      'STRUCTURED_GRAPH_MISSING',
      'The generated flow does not include a structured node/edge graph, so semantic graph validation is limited.'
    ));
  }

  return validation;
}
