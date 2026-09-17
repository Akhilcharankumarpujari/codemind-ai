import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFlowGraph, validateFlowGenerationResult } from '../src/services/flow/flowValidator.js';

const source = `function classify(x) {
  if (x > 10) {
    return 'high';
  }
  return 'low';
}`;

function node(id, type, lineStart, label = id, lineEnd = lineStart) {
  return { id, type, label, lineStart, lineEnd };
}

function edge(id, source, target, label) {
  return { id, source, target, ...(label ? { label } : {}) };
}

test('sequential flow: start -> process -> end is valid', () => {
  const graph = {
    version: '1.0',
    language: 'JavaScript',
    nodes: [
      node('A', 'start', 1, 'Start'),
      node('B', 'process', 2, 'x = x + 1'),
      node('C', 'end', 2, 'End'),
    ],
    edges: [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')],
  };

  const result = validateFlowGraph(graph, 'let x = 1;\nx = x + 1;');
  assert.equal(result.valid, true);
  assert.equal(result.status, 'valid');
  assert.equal(result.summary.unreachableNodeCount, 0);
});

test('branching flow: decision has distinct Yes/No branches', () => {
  const graph = {
    version: '1.0',
    language: 'JavaScript',
    nodes: [
      node('A', 'start', 1, 'Start'),
      node('B', 'function', 1, 'classify()'),
      node('C', 'decision', 2, 'x > 10?'),
      node('D', 'return', 3, "return 'high'"),
      node('E', 'return', 5, "return 'low'"),
      node('F', 'end', 5, 'End'),
    ],
    edges: [
      edge('e1', 'A', 'B'),
      edge('e2', 'B', 'C'),
      edge('e3', 'C', 'D', 'Yes'),
      edge('e4', 'C', 'E', 'No'),
      edge('e5', 'D', 'F'),
      edge('e6', 'E', 'F'),
    ],
  };

  const result = validateFlowGraph(graph, source);
  assert.equal(result.valid, true);
  assert.equal(result.warnings.some(w => w.code === 'DECISION_MISSING_BRANCH'), false);
  assert.equal(result.warnings.some(w => w.code === 'DECISION_BRANCH_LABELS'), false);
});

test('loop flow: back-edge remains reachable', () => {
  const graph = {
    version: '1.0',
    language: 'Java',
    nodes: [
      node('A', 'start', 1, 'Start'),
      node('B', 'loop', 2, 'for loop'),
      node('C', 'process', 3, 'body'),
      node('D', 'end', 4, 'End'),
    ],
    edges: [
      edge('e1', 'A', 'B'),
      edge('e2', 'B', 'C', 'continue'),
      edge('e3', 'C', 'B', 'next iteration'),
      edge('e4', 'B', 'D', 'exit'),
    ],
  };

  const result = validateFlowGraph(graph, 'for (int i = 0; i < 3; i++) {\n  work();\n}');
  assert.equal(result.valid, true);
  assert.equal(result.summary.reachableNodeCount, 4);
});

test('malformed graph: missing edge target is invalid', () => {
  const graph = {
    version: '1.0',
    language: 'Python',
    nodes: [node('A', 'start', 1, 'Start'), node('B', 'end', 2, 'End')],
    edges: [edge('e1', 'A', 'MISSING')],
  };

  const result = validateFlowGraph(graph, 'print(1)');
  assert.equal(result.valid, false);
  assert.equal(result.errors.some(e => e.code === 'INVALID_EDGE_TARGET'), true);
});

test('malformed graph: duplicate node ids are rejected', () => {
  const graph = {
    nodes: [node('A', 'start', 1), node('A', 'process', 2), node('B', 'end', 2)],
    edges: [edge('e1', 'A', 'B')],
  };

  const result = validateFlowGraph(graph, 'x = 1;\nprint(x);');
  assert.equal(result.valid, false);
  assert.equal(result.errors.some(e => e.code === 'DUPLICATE_NODE_ID'), true);
});

test('malformed graph: invalid array types are surfaced instead of silently normalized', () => {
  const result = validateFlowGraph({ nodes: {}, edges: [] }, 'x = 1;');
  assert.equal(result.valid, false);
  assert.equal(result.errors.some(e => e.code === 'NODES_NOT_ARRAY'), true);
});

test('generation result: step ids must reference graph nodes', () => {
  const graph = {
    version: '1.0',
    language: 'Python',
    nodes: [node('A', 'start', 1), node('B', 'end', 2)],
    edges: [edge('e1', 'A', 'B')],
  };

  const valid = validateFlowGenerationResult({ graph, steps: ['A', 'B'] }, 'print(1)');
  assert.equal(valid.valid, true);

  const invalid = validateFlowGenerationResult({ graph, steps: ['A', 'UNKNOWN'] }, 'print(1)');
  assert.equal(invalid.valid, false);
  assert.equal(invalid.errors.some(e => e.code === 'INVALID_STEP_NODE_ID'), true);
});
