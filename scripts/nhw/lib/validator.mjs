import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { STABLE_ID_PATTERN } from './contracts.mjs';
import { resolveRedirect } from './graph.mjs';
import { parseKnowledgeUnit, validateKnowledgeUnits } from './markdown.mjs';

function error(code, message, path, knowledgeId) {
  return { code, message, path, knowledgeId };
}

export function validateStructuralArtifacts(options) {
  const { repoRoot, units, graph, coverage, redirects = {}, allowUnresolved = false } = options;
  const errors = validateKnowledgeUnits(units);
  const warnings = [];
  const nodes = new Set(graph.nodes.map((node) => node.id));

  for (const node of graph.nodes) {
    if (!STABLE_ID_PATTERN.test(node.id)) {
      errors.push(error('NHW_INVALID_ID', `Invalid graph node '${node.id}'`, node.path, node.id));
    }
  }
  for (const edge of graph.edges) {
    for (const [role, endpoint] of [
      ['source', edge.from],
      ['target', edge.to],
    ]) {
      let resolved = endpoint;
      try {
        resolved = resolveRedirect(endpoint, redirects);
      } catch (redirectError) {
        errors.push(error(redirectError.code, redirectError.message, undefined, endpoint));
        continue;
      }
      if (!nodes.has(resolved)) {
        errors.push(
          error(
            'NHW_MISSING_GRAPH_NODE',
            `Graph edge ${role} '${endpoint}' has no node or redirect`,
            undefined,
            endpoint,
          ),
        );
      }
    }
  }
  for (const unit of units) {
    for (const source of unit.sources ?? []) {
      const absolute = resolve(repoRoot, ...source.path.split('/'));
      if (!existsSync(absolute)) {
        errors.push(
          error(
            'NHW_MISSING_SOURCE_PATH',
            `Source path '${source.path}' does not exist`,
            unit.path,
            unit.id,
          ),
        );
      }
    }
  }
  for (const [from, to] of Object.entries(redirects)) {
    if (!STABLE_ID_PATTERN.test(from) || !STABLE_ID_PATTERN.test(to)) {
      errors.push(error('NHW_INVALID_REDIRECT', `Invalid redirect '${from}' -> '${to}'`));
    }
    try {
      const resolved = resolveRedirect(from, redirects);
      if (!nodes.has(resolved)) {
        errors.push(
          error('NHW_MISSING_GRAPH_NODE', `Redirect '${from}' resolves to missing '${resolved}'`),
        );
      }
    } catch (redirectError) {
      errors.push(error(redirectError.code, redirectError.message));
    }
  }
  if (!allowUnresolved && coverage.unresolved > 0) {
    errors.push(
      error(
        'NHW_UNRESOLVED_COVERAGE',
        `Coverage contains ${coverage.unresolved} unresolved records`,
      ),
    );
  } else if (allowUnresolved && coverage.unresolved > 0) {
    warnings.push({
      code: 'NHW_UNRESOLVED_COVERAGE_ALLOWED',
      message: `Authoring checkpoint contains ${coverage.unresolved} unresolved records`,
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    totals: {
      units: units.length,
      graphNodes: graph.nodes.length,
      graphEdges: graph.edges.length,
      documented: coverage.documented,
      excluded: coverage.metadataOnly + coverage.generatedExcluded,
      unresolved: coverage.unresolved,
    },
  };
}

function walkMarkdown(root) {
  if (!existsSync(root)) return [];
  const paths = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolute = join(root, entry.name);
    if (entry.isDirectory()) paths.push(...walkMarkdown(absolute));
    else if (entry.isFile() && entry.name.endsWith('.md')) paths.push(absolute);
  }
  return paths.sort();
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (readError) {
    if (readError.code === 'ENOENT') return fallback;
    throw readError;
  }
}

function readJsonl(path) {
  try {
    return readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (readError) {
    if (readError.code === 'ENOENT') return [];
    throw readError;
  }
}

export async function validateKnowledgeBase(options = {}) {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  const knowledgeRoot = join(repoRoot, 'docs', 'nhw');
  const units = [];
  const parsingErrors = [];
  for (const path of walkMarkdown(knowledgeRoot).filter((candidate) =>
    /[\\/](?:0[0-9]|1[0-2])-[^\\/]+[\\/]/.test(candidate),
  )) {
    const unitPath = relative(repoRoot, path).replaceAll('\\', '/');
    try {
      units.push(parseKnowledgeUnit(unitPath, readFileSync(path, 'utf8')));
    } catch (parseError) {
      parsingErrors.push(
        error(parseError.code ?? 'NHW_INVALID_UNIT', parseError.message, unitPath),
      );
    }
  }
  const graph = {
    nodes: readJsonl(join(knowledgeRoot, 'graph', 'nodes.jsonl')),
    edges: readJsonl(join(knowledgeRoot, 'graph', 'edges.jsonl')),
  };
  const coverage = readJson(join(knowledgeRoot, 'coverage', 'ledger.json'), {
    inventoryHash: '',
    documented: 0,
    metadataOnly: 0,
    generatedExcluded: 0,
    unresolved: 1,
    records: [],
  });
  const redirectsDocument = readJson(join(knowledgeRoot, 'catalog', 'redirects.json'), {
    redirects: {},
  });
  const result = validateStructuralArtifacts({
    repoRoot,
    units,
    graph,
    coverage,
    redirects: redirectsDocument.redirects ?? redirectsDocument,
    allowUnresolved: options.allowUnresolved ?? false,
  });
  result.errors.unshift(...parsingErrors);
  result.ok = result.errors.length === 0;
  return result;
}
