import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { STABLE_ID_PATTERN } from './contracts.mjs';
import { detectCycles, findOrphans, resolveRedirect } from './graph.mjs';
import { buildInventory, inventoryHash } from './inventory.mjs';
import { buildDiscoveryRecords, loadKnowledgeCatalogs } from './knowledge-pipeline.mjs';
import { parseKnowledgeUnit, validateKnowledgeUnits } from './markdown.mjs';

function error(code, message, path, knowledgeId) {
  return { code, message, path, knowledgeId };
}

const DISCOVERY_ERROR_CODES = {
  'api-endpoint': 'NHW_UNCOVERED_ENDPOINT',
  'configuration-key': 'NHW_UNCOVERED_CONFIGURATION',
  'data-model': 'NHW_UNCOVERED_MODEL',
  'database-migration': 'NHW_UNCOVERED_MIGRATION',
  project: 'NHW_UNCOVERED_PROJECT',
};

function discoveryErrorCode(kind) {
  if (DISCOVERY_ERROR_CODES[kind]) return DISCOVERY_ERROR_CODES[kind];
  if (kind.endsWith('-test')) return 'NHW_UNCOVERED_TEST';
  if (
    kind.startsWith('typescript-') ||
    kind.startsWith('python-') ||
    kind === 'frontend-api-consumer'
  ) {
    return 'NHW_UNCOVERED_PUBLIC_COMPONENT';
  }
  return 'NHW_UNCOVERED_DISCOVERY';
}

function secretLikeValue(text) {
  const tokenPatterns = [
    /\bsk-[A-Za-z0-9_-]{20,}\b/,
    /\bghp_[A-Za-z0-9]{20,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
    /\bAIza[A-Za-z0-9_-]{20,}\b/,
    /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  ];
  if (tokenPatterns.some((pattern) => pattern.test(text))) return true;
  return /(?:API_KEY|TOKEN|CLIENT_SECRET|PASSWORD)\s*[:=]\s*["']?(?!\$\{|<|redacted|configured|true|false|null|none)(?:sk-|ghp_|AIza|[A-Za-z0-9+/=_-]{24,})/i.test(
    text,
  );
}

function validateMachineShapes({ graph, coverage, sourceMap = [], manifest }) {
  const errors = [];
  const statuses = new Set(['observed', 'inferred', 'declared', 'drifted', 'deprecated']);
  const confidences = new Set(['observed', 'inferred', 'declared']);
  const coverageStatuses = new Set([
    'documented',
    'metadata-only',
    'generated-excluded',
    'unresolved',
  ]);
  for (const node of graph.nodes) {
    if (
      !STABLE_ID_PATTERN.test(node.id ?? '') ||
      typeof node.kind !== 'string' ||
      typeof node.path !== 'string' ||
      !statuses.has(node.status)
    ) {
      errors.push(error('NHW_SCHEMA_INVALID', `Invalid graph node '${node.id ?? '(missing id)'}'`));
    }
  }
  for (const edge of graph.edges) {
    if (
      !STABLE_ID_PATTERN.test(edge.from ?? '') ||
      !STABLE_ID_PATTERN.test(edge.to ?? '') ||
      typeof edge.type !== 'string' ||
      !Array.isArray(edge.evidence) ||
      edge.evidence.length === 0 ||
      !confidences.has(edge.confidence)
    ) {
      errors.push(
        error(
          'NHW_SCHEMA_INVALID',
          `Invalid graph edge '${edge.from ?? '?'}' -> '${edge.to ?? '?'}'`,
        ),
      );
    }
  }
  for (const evidence of sourceMap) {
    if (
      !STABLE_ID_PATTERN.test(evidence.knowledgeId ?? '') ||
      typeof evidence.path !== 'string' ||
      !Number.isInteger(evidence.lineStart) ||
      !Number.isInteger(evidence.lineEnd) ||
      !/^[a-f0-9]{64}$/.test(evidence.fileHash ?? '') ||
      !confidences.has(evidence.confidence)
    ) {
      errors.push(
        error(
          'NHW_SCHEMA_INVALID',
          `Invalid source-map record for '${evidence.knowledgeId ?? '(missing id)'}'`,
          evidence.path,
          evidence.knowledgeId,
        ),
      );
    }
  }
  if (!/^[a-f0-9]{64}$/.test(coverage.inventoryHash ?? '') || !Array.isArray(coverage.records)) {
    errors.push(error('NHW_SCHEMA_INVALID', 'Invalid coverage ledger envelope'));
  } else {
    for (const record of coverage.records) {
      if (
        typeof record.path !== 'string' ||
        typeof record.classification !== 'string' ||
        typeof record.reason !== 'string' ||
        !coverageStatuses.has(record.coverageStatus)
      ) {
        errors.push(
          error('NHW_SCHEMA_INVALID', `Invalid coverage record '${record.path ?? '(missing)'}'`),
        );
      }
    }
  }
  if (
    manifest &&
    (manifest.schemaVersion !== '1.0.0' ||
      !STABLE_ID_PATTERN.test(manifest.systemId ?? '') ||
      !Array.isArray(manifest.units) ||
      typeof manifest.baseline !== 'object')
  ) {
    errors.push(error('NHW_SCHEMA_INVALID', 'Invalid knowledge manifest envelope'));
  }
  return errors;
}

function deduplicateErrors(errors) {
  return [
    ...new Map(
      errors.map((item) => [
        `${item.code}\u0000${item.path ?? ''}\u0000${item.knowledgeId ?? ''}\u0000${item.message}`,
        item,
      ]),
    ).values(),
  ];
}

export function validateStructuralArtifacts(options) {
  const {
    repoRoot,
    units,
    graph,
    coverage,
    redirects = {},
    allowUnresolved = false,
    inventory,
    discoveries = [],
    sourceMap = [],
    manifest,
    generatedTexts = [],
  } = options;
  const errors = [
    ...validateKnowledgeUnits(units),
    ...validateMachineShapes({ graph, coverage, sourceMap, manifest }),
  ];
  const warnings = [];
  const nodes = new Set(graph.nodes.map((node) => node.id));
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));

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
  for (const orphan of findOrphans(graph)) {
    errors.push(
      error(
        'NHW_GRAPH_ORPHAN',
        `Graph node '${orphan}' has no incoming or outgoing edge`,
        undefined,
        orphan,
      ),
    );
  }
  for (const discovery of discoveries) {
    if (!unitsById.has(discovery.id)) {
      errors.push(
        error(
          discoveryErrorCode(discovery.kind),
          `Discovery '${discovery.id}' has no canonical knowledge unit`,
          discovery.sourcePath,
          discovery.id,
        ),
      );
    }
    if (discovery.kind === 'data-model') {
      const entityId = `entity.${discovery.id.replace(/^data\.model\./, '')}`;
      if (!unitsById.has(entityId)) {
        errors.push(
          error(
            'NHW_MISSING_DOMAIN_ENTITY',
            `Prisma model '${discovery.id}' has no domain entity '${entityId}'`,
            discovery.sourcePath,
            discovery.id,
          ),
        );
      }
    }
  }
  if (inventory) {
    const computedHash = inventoryHash(inventory);
    if (coverage.inventoryHash !== computedHash) {
      errors.push(
        error(
          'NHW_STALE_INVENTORY',
          `Coverage inventory hash '${coverage.inventoryHash}' does not match '${computedHash}'`,
        ),
      );
    }
    const inventoryByPath = new Map(inventory.map((record) => [record.path, record]));
    const evidenceKeys = new Set();
    for (const evidence of sourceMap) {
      evidenceKeys.add(`${evidence.knowledgeId}\u0000${evidence.path}`);
      const inventoryRecord = inventoryByPath.get(evidence.path);
      if (!inventoryRecord || inventoryRecord.sha256 !== evidence.fileHash) {
        errors.push(
          error(
            'NHW_STALE_SOURCE_HASH',
            `Source hash for '${evidence.path}' is stale or absent from inventory`,
            evidence.path,
            evidence.knowledgeId,
          ),
        );
      }
      if (!unitsById.has(evidence.knowledgeId)) {
        errors.push(
          error(
            'NHW_SOURCE_MAP_UNKNOWN_UNIT',
            `Source-map record references unknown unit '${evidence.knowledgeId}'`,
            evidence.path,
            evidence.knowledgeId,
          ),
        );
      }
    }
    for (const unit of units) {
      for (const source of unit.sources ?? []) {
        if (!evidenceKeys.has(`${unit.id}\u0000${source.path}`)) {
          errors.push(
            error(
              'NHW_MISSING_SOURCE_EVIDENCE',
              `Unit '${unit.id}' lacks source-map evidence for '${source.path}'`,
              unit.path,
              unit.id,
            ),
          );
        }
      }
    }
  }
  if (manifest) {
    const manifestIds = new Set(manifest.units.map((unit) => unit.id));
    const unitIds = new Set(units.map((unit) => unit.id));
    const missingFromManifest = [...unitIds].filter((id) => !manifestIds.has(id));
    const missingUnit = [...manifestIds].filter((id) => !unitIds.has(id));
    if (
      missingFromManifest.length > 0 ||
      missingUnit.length > 0 ||
      manifest.baseline?.inventoryHash !== coverage.inventoryHash
    ) {
      errors.push(
        error(
          'NHW_MANIFEST_UNIT_MISMATCH',
          `Manifest mismatch: ${missingFromManifest.length} unindexed units, ${missingUnit.length} missing units, baseline hash match=${manifest.baseline?.inventoryHash === coverage.inventoryHash}`,
        ),
      );
    }
  }
  for (const generated of generatedTexts) {
    if (secretLikeValue(generated.text)) {
      errors.push(
        error(
          'NHW_SECRET_VALUE_DETECTED',
          `Secret-like value detected in generated artifact '${generated.path}'`,
          generated.path,
        ),
      );
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

  const cycles = detectCycles(graph);
  const uniqueErrors = deduplicateErrors(errors);
  return {
    ok: uniqueErrors.length === 0,
    errors: uniqueErrors,
    warnings,
    totals: {
      units: units.length,
      graphNodes: graph.nodes.length,
      graphEdges: graph.edges.length,
      cycles: cycles.length,
      orphans: findOrphans(graph).length,
      publicComponents: units.filter(
        (unit) =>
          unit.kind.startsWith('typescript-') ||
          unit.kind.startsWith('python-') ||
          unit.kind === 'frontend-api-consumer',
      ).length,
      expressEndpoints: units.filter(
        (unit) => unit.kind === 'api-endpoint' && unit.path.includes('/express/'),
      ).length,
      fastapiEndpoints: units.filter(
        (unit) => unit.kind === 'api-endpoint' && unit.path.includes('/fastapi/'),
      ).length,
      domainEntities: units.filter((unit) => unit.kind === 'domain-entity').length,
      prismaModels: units.filter((unit) => unit.kind === 'data-model').length,
      migrations: units.filter((unit) => unit.kind === 'database-migration').length,
      configurationKeys: units.filter((unit) => unit.kind === 'configuration-key').length,
      flows: units.filter((unit) => unit.kind === 'runtime-flow').length,
      tests: units.filter((unit) => unit.kind.endsWith('-test')).length,
      findings: units.filter(
        (unit) => unit.kind === 'architectural-finding' || unit.kind === 'extension-point',
      ).length,
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

function walkGeneratedTexts(root) {
  if (!existsSync(root)) return [];
  const records = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolute = join(root, entry.name);
    if (entry.isDirectory()) records.push(...walkGeneratedTexts(absolute));
    else if (
      entry.isFile() &&
      (entry.name.endsWith('.md') || entry.name.endsWith('.json') || entry.name.endsWith('.jsonl'))
    ) {
      records.push({ path: absolute, text: readFileSync(absolute, 'utf8') });
    }
  }
  return records;
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
  const manifest = readJson(join(knowledgeRoot, 'catalog', 'manifest.json'), null);
  const sourceMap = readJsonl(join(knowledgeRoot, 'evidence', 'source-map.jsonl'));
  const storedInventory = readJsonl(join(knowledgeRoot, 'coverage', 'inventory.jsonl'));
  const catalogs = loadKnowledgeCatalogs(knowledgeRoot);
  const discoveries = buildDiscoveryRecords(catalogs).map((record) => {
    if (record.sourcePath !== 'docs/nhw/catalog/configuration-reads.jsonl') return record;
    const unit = units.find((candidate) => candidate.id === record.id);
    return unit?.sources?.[0] ? { ...record, sourcePath: unit.sources[0].path } : record;
  });
  const result = validateStructuralArtifacts({
    repoRoot,
    units,
    graph,
    coverage,
    inventory: storedInventory,
    discoveries,
    sourceMap,
    manifest,
    generatedTexts: walkGeneratedTexts(knowledgeRoot).map((record) => ({
      path: relative(repoRoot, record.path).replaceAll('\\', '/'),
      text: record.text,
    })),
    redirects: redirectsDocument.redirects ?? redirectsDocument,
    allowUnresolved: options.allowUnresolved ?? false,
  });

  const liveInventory = await buildInventory(repoRoot, {
    excludedDirectories: [
      'docs/nhw/catalog',
      'docs/nhw/coverage',
      'docs/nhw/evidence',
      'docs/nhw/graph',
      'docs/nhw/reports',
    ],
  });
  if (inventoryHash(liveInventory) !== inventoryHash(storedInventory)) {
    result.errors.push(
      error(
        'NHW_STALE_INVENTORY',
        'Stored inventory does not match the current working tree',
        'docs/nhw/coverage/inventory.jsonl',
      ),
    );
  }
  const sourceInventory = storedInventory.filter(
    (record) => record.path !== 'docs/nhw' && !record.path.startsWith('docs/nhw/'),
  );
  const sourceHash = inventoryHash(sourceInventory);
  for (const unit of units) {
    if (unit.lastVerified?.inventory_hash !== sourceHash) {
      result.errors.push(
        error(
          'NHW_STALE_UNIT',
          `Unit '${unit.id}' was verified against '${unit.lastVerified?.inventory_hash}', expected '${sourceHash}'`,
          unit.path,
          unit.id,
        ),
      );
    }
  }
  result.errors.unshift(...parsingErrors);
  result.errors = deduplicateErrors(result.errors);
  result.ok = result.errors.length === 0;
  return result;
}
