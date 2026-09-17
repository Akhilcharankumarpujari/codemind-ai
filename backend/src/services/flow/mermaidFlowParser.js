function cleanLabel(value = '') {
  return String(value)
    .replace(/^\s*[([{/]+/, '')
    .replace(/[)\]}\{/]+\s*$/, '')
    .replace(/<br\s*\/?>(\s*)/gi, ' ')
    .trim();
}

function parseNodeDefinition(definition) {
  const value = String(definition).trim();
  const match = value.match(/^(?<id>[A-Za-z][A-Za-z0-9_-]*)\s*(?<shape>\(\[|\[|\{|\[\/|\(\(|\(|\/|$)(?<label>.*)$/);
  if (!match) return null;

  const id = match.groups.id;
  const raw = match.groups.label || '';
  const label = cleanLabel(raw.replace(/\s+$/, '')) || id;

  let type = 'process';
  if (match.groups.shape === '{') type = 'decision';
  else if (match.groups.shape === '[/') type = 'input';
  else if (match.groups.shape === '([' || match.groups.shape === '((' || match.groups.shape === '(') {
    const normalized = label.toLowerCase();
    if (normalized === 'start' || normalized.startsWith('start ')) type = 'start';
    else if (normalized === 'end' || normalized.startsWith('end ')) type = 'end';
  }

  return { id, type, label };
}

function parseEdge(line) {
  const trimmed = line.trim();
  const match = trimmed.match(/^(?<left>[A-Za-z][A-Za-z0-9_-]*(?:\s*\[[^\n]+\]|\s*\{[^\n]+\}|\s*\(\[[^\n]+\]\)|\s*\([^\n]+\))?)\s*(?:--\s*(?:"(?<label>[^"]*)"|\|(?<pipeLabel>[^|]+)\|)\s*)?[-.]{1,3}>\s*(?<right>.+)$/);
  if (!match) return null;

  const right = match.groups.right.trim();
  const targetMatch = right.match(/^(?<target>[A-Za-z][A-Za-z0-9_-]*)/);
  if (!targetMatch) return null;

  const sourceDef = match.groups.left.trim();
  const sourceIdMatch = sourceDef.match(/^([A-Za-z][A-Za-z0-9_-]*)/);
  if (!sourceIdMatch) return null;

  return {
    source: sourceIdMatch[1],
    target: targetMatch.groups.target,
    label: String(match.groups.label ?? match.groups.pipeLabel ?? '').trim() || undefined,
    sourceDef,
    targetDef: right
  };
}

export function parseMermaidFlow(mermaid = '') {
  const source = String(mermaid).replace(/```mermaid|```/gi, '').trim();
  const lines = source.split(/\r?\n/);
  const nodes = new Map();
  const edges = [];

  const ensureNode = (definition) => {
    const parsed = parseNodeDefinition(definition);
    if (!parsed) return;
    if (!nodes.has(parsed.id)) nodes.set(parsed.id, parsed);
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^(graph|flowchart)\s+/i.test(trimmed) || trimmed.startsWith('%%')) continue;

    const edge = parseEdge(trimmed);
    if (edge) {
      ensureNode(edge.sourceDef);
      ensureNode(edge.targetDef);
      edges.push({
        id: `e${edges.length + 1}`,
        source: edge.source,
        target: edge.target,
        ...(edge.label ? { label: edge.label } : {})
      });
      continue;
    }

    ensureNode(trimmed);
  }

  return {
    version: '1.0',
    nodes: [...nodes.values()],
    edges,
    metadata: { derivedFrom: 'mermaid' }
  };
}
