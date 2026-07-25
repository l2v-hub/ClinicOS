import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { generateKnowledgeBase } from '../generate.mjs';
import { extractTypeScript } from '../lib/typescript-extractor.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = join(here, 'fixtures', 'typescript');
const fixturePaths = [
  'app.ts',
  'routes/patients.ts',
  'routes/patients.test.ts',
  'frontend.tsx',
  'artifacts/report.js',
];

test('reconstructs mounted Express routes and handler behavior', () => {
  const result = extractTypeScript(fixtureRoot, fixturePaths);
  const route = result.routes.find(
    (candidate) => candidate.method === 'GET' && candidate.mountedPath === '/patients/:id',
  );

  assert.ok(route);
  assert.deepEqual(route.middleware, ['requireAuth']);
  assert.deepEqual(route.responseStatuses, [200, 404]);
  assert.deepEqual(route.persistenceCalls, ['prisma.patient.findUnique']);
  assert.deepEqual(route.requestReads, ['req.params.id']);

  const secondary = result.routes.find(
    (candidate) => candidate.method === 'POST' && candidate.mountedPath === '/patients/audit',
  );
  assert.ok(secondary);
  assert.deepEqual(secondary.persistenceCalls, ['prisma.aiAuditEvent.create']);
  assert.deepEqual(secondary.responseStatuses, [201]);

  const health = result.routes.find(
    (candidate) => candidate.method === 'GET' && candidate.mountedPath === '/health',
  );
  assert.ok(health);
  assert.equal(
    result.routes.some((candidate) => candidate.routerPath === '/fake-test-endpoint'),
    false,
  );
});

test('extracts exported symbols, React components, imports, and consumers', () => {
  const result = extractTypeScript(fixtureRoot, fixturePaths);
  const kinds = new Map(result.symbols.map((symbol) => [symbol.name, symbol.kind]));

  assert.equal(kinds.get('PatientDto'), 'interface');
  assert.equal(kinds.get('PatientId'), 'type-alias');
  assert.equal(kinds.get('PatientService'), 'class');
  assert.equal(kinds.get('requireAuth'), 'function');
  assert.equal(kinds.get('PatientCard'), 'react-component');
  assert.equal(result.symbols.find((symbol) => symbol.name === 'fakeTestRouter').testSource, true);
  assert.ok(
    result.imports.some(
      (record) =>
        record.localName === 'aliasedSecondaryRouter' && record.importedName === 'secondaryRouter',
    ),
  );
  assert.ok(
    result.symbols
      .find((symbol) => symbol.name === 'PatientDto')
      .consumers.includes('frontend.tsx'),
  );
});

test('extracts frontend requests and configuration reads', () => {
  const result = extractTypeScript(fixtureRoot, fixturePaths);

  assert.equal(result.frontendRequests[0].method, 'GET');
  assert.equal(result.frontendRequests[0].pathTemplate, '/patients/${patientId}');
  assert.equal(result.frontendRequests[0].consumer, 'loadPatient');
  assert.deepEqual(result.configurationReads, ['VITE_API_URL']);
});

test('writes TypeScript discovery catalogs through the staged generator', async (t) => {
  const outputRoot = mkdtempSync(join(tmpdir(), 'clinicos-nhw-typescript-'));
  t.after(() => rmSync(outputRoot, { recursive: true, force: true }));

  const summary = await generateKnowledgeBase({
    repoRoot: fixtureRoot,
    outputRoot,
    stage: 'typescript',
  });

  assert.equal(summary.stage, 'typescript');
  assert.equal(summary.sourceFiles, 4);
  assert.equal(summary.expressRoutes, 3);
  assert.equal(summary.frontendRequests, 1);
  assert.match(
    readFileSync(join(outputRoot, 'catalog', 'express-routes.jsonl'), 'utf8'),
    /\/patients\/:id/,
  );
  assert.match(
    readFileSync(join(outputRoot, 'catalog', 'configuration-reads.jsonl'), 'utf8'),
    /VITE_API_URL/,
  );
});
