import { STABLE_ID_PATTERN } from './contracts.mjs';

function edgeKey(edge) {
  return `${edge.from}\u0000${edge.type}\u0000${edge.to}\u0000${edge.evidence.join('\u0001')}`;
}

export function compileGraph(units, discoveries) {
  const nodes = new Map();
  for (const discovery of discoveries) {
    if (!STABLE_ID_PATTERN.test(discovery.id ?? '')) continue;
    nodes.set(discovery.id, {
      id: discovery.id,
      kind: discovery.kind ?? 'discovery',
      path: discovery.sourcePath ?? discovery.path ?? 'unknown',
      status: discovery.status ?? 'observed',
    });
  }
  for (const unit of units) {
    nodes.set(unit.id, {
      id: unit.id,
      kind: unit.kind,
      path: unit.path,
      status: unit.status,
    });
  }

  const edges = new Map();
  for (const unit of units) {
    for (const relation of unit.relations ?? []) {
      const edge = {
        from: unit.id,
        type: relation.type,
        to: relation.target,
        evidence:
          relation.evidence?.length > 0
            ? [...relation.evidence]
            : unit.sources.map((source) => source.path),
        confidence: relation.confidence ?? (unit.status === 'inferred' ? 'inferred' : 'observed'),
      };
      edges.set(edgeKey(edge), edge);
    }
  }
  for (const discovery of discoveries) {
    for (const relation of discovery.relations ?? []) {
      const edge = {
        from: discovery.id,
        type: relation.type,
        to: relation.target,
        evidence: relation.evidence ?? [discovery.sourcePath],
        confidence: relation.confidence ?? 'observed',
      };
      edges.set(edgeKey(edge), edge);
    }
  }

  return {
    nodes: [...nodes.values()].sort((left, right) => left.id.localeCompare(right.id, 'en')),
    edges: [...edges.values()].sort((left, right) =>
      edgeKey(left).localeCompare(edgeKey(right), 'en'),
    ),
  };
}

function canonicalCycle(path) {
  const ring = path.slice(0, -1);
  const variants = ring.map((_, index) => [...ring.slice(index), ...ring.slice(0, index)]);
  variants.sort((left, right) => left.join('\u0000').localeCompare(right.join('\u0000'), 'en'));
  return [...variants[0], variants[0][0]];
}

export function detectCycles(graph) {
  const adjacency = new Map(graph.nodes.map((node) => [node.id, []]));
  for (const edge of graph.edges) {
    if (adjacency.has(edge.from) && adjacency.has(edge.to)) {
      adjacency.get(edge.from).push(edge.to);
    }
  }
  for (const targets of adjacency.values()) targets.sort();

  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  const cycles = new Map();
  function visit(node) {
    visiting.add(node);
    stack.push(node);
    for (const target of adjacency.get(node) ?? []) {
      if (visiting.has(target)) {
        const start = stack.indexOf(target);
        const path = canonicalCycle([...stack.slice(start), target]);
        cycles.set(path.join('\u0000'), {
          path,
          classification: 'architectural-cycle',
        });
      } else if (!visited.has(target)) {
        visit(target);
      }
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }
  for (const node of [...adjacency.keys()].sort()) {
    if (!visited.has(node)) visit(node);
  }
  return [...cycles.values()].sort((left, right) =>
    left.path.join('.').localeCompare(right.path.join('.'), 'en'),
  );
}

export function findOrphans(graph) {
  const connected = new Set();
  for (const edge of graph.edges) {
    connected.add(edge.from);
    connected.add(edge.to);
  }
  return graph.nodes
    .map((node) => node.id)
    .filter((id) => !connected.has(id))
    .sort();
}

export function resolveRedirect(identifier, redirects) {
  const visited = new Set();
  let current = identifier;
  while (Object.hasOwn(redirects, current)) {
    if (visited.has(current)) {
      const error = new Error(`Redirect cycle contains '${current}'`);
      error.code = 'NHW_REDIRECT_CYCLE';
      throw error;
    }
    visited.add(current);
    current = redirects[current];
  }
  return current;
}
