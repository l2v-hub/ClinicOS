import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { buildCoverage, buildSourceMap } from '../lib/coverage.mjs';
import { sha256 } from '../lib/contracts.mjs';
import { compileGraph } from '../lib/graph.mjs';
import { REQUIRED_HEADINGS } from '../lib/markdown.mjs';
import { validateStructuralArtifacts } from '../lib/validator.mjs';

function knowledgeUnit(id, sources, relations = []) {
  return {
    path: `docs/nhw/${id}.md`,
    id,
    kind: id.startsWith('api.') ? 'api-endpoint' : 'component',
    title: id,
    status: 'observed',
    summary: id,
    boundedContexts: [],
    sources,
    relations,
    tags: [],
    lastVerified: { commit: 'working-tree', inventory_hash: 'a'.repeat(64) },
    sections: Object.fromEntries(REQUIRED_HEADINGS.map((heading) => [heading, 'None observed'])),
  };
}

function inventoryRecord(path, classification, pathType = 'file') {
  return {
    path,
    pathType,
    extension: '',
    bytes: 1,
    sha256: pathType === 'file' ? 'b'.repeat(64) : null,
    classification,
    reason: 'fixture',
    gitState: 'tracked',
  };
}

test('coverage reports an uncovered route and succeeds after its endpoint unit is added', () => {
  const inventory = [
    inventoryRecord('src/routes.ts', 'semantic-source'),
    inventoryRecord('artifacts/screenshot.png', 'metadata-only'),
    inventoryRecord('node_modules/', 'generated-excluded', 'directory'),
  ];
  const discovery = [
    {
      id: 'api.fixture.patient-list',
      kind: 'api-endpoint',
      sourcePath: 'src/routes.ts',
      lineStart: 4,
      lineEnd: 8,
    },
  ];

  const uncovered = buildCoverage(inventory, discovery, []);
  assert.equal(uncovered.unresolved, 1);
  assert.equal(uncovered.metadataOnly, 1);
  assert.equal(uncovered.generatedExcluded, 1);
  assert.equal(
    uncovered.records.find((record) => record.classification === 'discovery:api-endpoint')
      ?.coverageStatus,
    'unresolved',
  );
  assert.ok(
    uncovered.records.every(
      (record) => record.path && record.classification && record.coverageStatus && record.reason,
    ),
  );

  const endpoint = knowledgeUnit('api.fixture.patient-list', [
    { path: 'src/routes.ts', line_start: 4, line_end: 8, confidence: 'observed' },
  ]);
  const covered = buildCoverage(inventory, discovery, [endpoint]);
  assert.equal(covered.unresolved, 0);
  assert.equal(covered.documented, 1);
});

test('treats a knowledge-unit Markdown path as documented by its own unit', () => {
  const endpoint = knowledgeUnit('api.fixture.patient-list', [
    { path: 'src/routes.ts', confidence: 'observed' },
  ]);
  const inventory = [
    inventoryRecord('src/routes.ts', 'semantic-source'),
    inventoryRecord(endpoint.path, 'narrative-source'),
  ];
  const covered = buildCoverage(inventory, [], [endpoint]);

  assert.equal(covered.documented, 2);
  assert.equal(covered.unresolved, 0);
});

test('compiles source evidence with stable hashes and confidence', () => {
  const unit = knowledgeUnit('api.fixture.patient-list', [
    {
      path: 'src/routes.ts',
      symbol: 'listPatients',
      line_start: 4,
      line_end: 8,
      confidence: 'observed',
    },
  ]);
  const inventory = [inventoryRecord('src/routes.ts', 'semantic-source')];
  const sourceMap = buildSourceMap(inventory, [unit]);

  assert.deepEqual(sourceMap, [
    {
      confidence: 'observed',
      fileHash: 'b'.repeat(64),
      knowledgeId: 'api.fixture.patient-list',
      lineEnd: 8,
      lineStart: 4,
      path: 'src/routes.ts',
      symbol: 'listPatients',
    },
  ]);
});

test('structural validation checks graph endpoints, source paths, and unresolved coverage', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'clinicos-nhw-validator-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'src', 'routes.ts'), 'export const route = true;\n');

  const endpoint = knowledgeUnit(
    'api.fixture.patient-list',
    [{ path: 'src/routes.ts', confidence: 'observed' }],
    [
      {
        type: 'depends-on',
        target: 'component.fixture.missing',
        evidence: ['src/routes.ts:1'],
        confidence: 'observed',
      },
    ],
  );
  const graph = compileGraph([endpoint], []);
  const coverage = {
    inventoryHash: 'a'.repeat(64),
    documented: 0,
    metadataOnly: 0,
    generatedExcluded: 0,
    unresolved: 1,
    records: [],
  };

  const failed = validateStructuralArtifacts({
    repoRoot: root,
    units: [endpoint],
    graph,
    coverage,
    redirects: {},
    allowUnresolved: false,
  });
  assert.ok(failed.errors.some((error) => error.code === 'NHW_MISSING_GRAPH_NODE'));
  assert.ok(failed.errors.some((error) => error.code === 'NHW_UNRESOLVED_COVERAGE'));

  const allowed = validateStructuralArtifacts({
    repoRoot: root,
    units: [endpoint],
    graph,
    coverage,
    redirects: { 'component.fixture.missing': 'api.fixture.patient-list' },
    allowUnresolved: true,
  });
  assert.equal(allowed.ok, true);
});

test('fail-closed validation detects uncovered semantics, stale hashes, orphans, manifest drift, and secrets', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'clinicos-nhw-fail-closed-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'src'), { recursive: true });
  const body = 'export const route = true;\n';
  writeFileSync(join(root, 'src', 'routes.ts'), body);

  const endpoint = knowledgeUnit('api.fixture.patient-list', [
    { path: 'src/routes.ts', confidence: 'observed' },
  ]);
  const inventory = [
    {
      ...inventoryRecord('src/routes.ts', 'semantic-source'),
      bytes: Buffer.byteLength(body),
      sha256: sha256(body),
      reason: 'fixture',
    },
  ];
  const result = validateStructuralArtifacts({
    repoRoot: root,
    units: [endpoint],
    graph: {
      nodes: [
        {
          id: endpoint.id,
          kind: endpoint.kind,
          path: endpoint.path,
          status: endpoint.status,
        },
        {
          id: 'component.fixture.orphan',
          kind: 'component',
          path: 'orphan.md',
          status: 'observed',
        },
      ],
      edges: [],
    },
    coverage: {
      inventoryHash: '0'.repeat(64),
      documented: 1,
      metadataOnly: 0,
      generatedExcluded: 0,
      unresolved: 0,
      records: [],
    },
    inventory,
    discoveries: [
      {
        id: 'api.fixture.missing',
        kind: 'api-endpoint',
        sourcePath: 'src/routes.ts',
      },
      {
        id: 'data.model.patient',
        kind: 'data-model',
        sourcePath: 'src/routes.ts',
      },
    ],
    sourceMap: [
      {
        knowledgeId: endpoint.id,
        path: 'src/routes.ts',
        symbol: '',
        lineStart: 1,
        lineEnd: 1,
        fileHash: 'f'.repeat(64),
        confidence: 'observed',
      },
    ],
    manifest: {
      schemaVersion: '1.0.0',
      systemId: 'system.clinicos',
      baseline: {
        branch: 'fixture',
        commit: 'fixture',
        inventoryHash: '0'.repeat(64),
      },
      units: [],
      totals: {},
    },
    generatedTexts: [
      {
        path: 'docs/nhw/leak.md',
        text: 'OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz123456',
      },
    ],
  });
  const codes = new Set(result.errors.map((error) => error.code));

  assert.ok(codes.has('NHW_UNCOVERED_ENDPOINT'));
  assert.ok(codes.has('NHW_UNCOVERED_MODEL'));
  assert.ok(codes.has('NHW_MISSING_DOMAIN_ENTITY'));
  assert.ok(codes.has('NHW_STALE_SOURCE_HASH'));
  assert.ok(codes.has('NHW_STALE_INVENTORY'));
  assert.ok(codes.has('NHW_GRAPH_ORPHAN'));
  assert.ok(codes.has('NHW_MANIFEST_UNIT_MISMATCH'));
  assert.ok(codes.has('NHW_SECRET_VALUE_DETECTED'));
});
