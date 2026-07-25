import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { generateKnowledgeBase } from '../generate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, 'fixtures', 'python');
const extractor = join(here, '..', 'lib', 'python-extractor.py');

function runExtractor(t) {
  const scratch = mkdtempSync(join(tmpdir(), 'clinicos-nhw-python-'));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));
  const pathsFile = join(scratch, 'paths.json');
  writeFileSync(pathsFile, `${JSON.stringify(['app.py', 'tests/test_app.py'])}\n`, 'utf8');
  const result = spawnSync(
    'python',
    [extractor, '--repo-root', repoRoot, '--paths-file', pathsFile],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('extracts FastAPI routes, models, headers, failures, and background tasks', (t) => {
  const result = runExtractor(t);
  const route = result.routes.find(
    (candidate) => candidate.method === 'POST' && candidate.path === '/jobs/{job_id}/run',
  );

  assert.ok(route);
  assert.equal(route.statusCode, 202);
  assert.deepEqual(route.requestModels, ['CreateRequest']);
  assert.deepEqual(route.headerParams, ['authorization']);
  assert.deepEqual(route.errorStatuses, [401]);
  assert.deepEqual(route.backgroundTasks, ['asyncio.create_task']);
  assert.deepEqual(route.pathParams, ['job_id']);
});

test('extracts lifecycle hooks, environment reads, public symbols, and providers', (t) => {
  const result = runExtractor(t);

  assert.deepEqual(
    result.configurationReads.map((record) => record.name),
    ['SERVICE_TOKEN'],
  );
  assert.equal(result.lifecycleHooks.length, 1);
  assert.equal(result.lifecycleHooks[0].event, 'startup');
  assert.ok(
    result.symbols.some(
      (symbol) => symbol.name === 'CreateRequest' && symbol.kind === 'pydantic-model',
    ),
  );
  assert.ok(result.providerClasses.some((provider) => provider.name === 'MockProvider'));
});

test('writes Python and FastAPI catalogs through the staged generator', async (t) => {
  const outputRoot = mkdtempSync(join(tmpdir(), 'clinicos-nhw-python-output-'));
  t.after(() => rmSync(outputRoot, { recursive: true, force: true }));

  const summary = await generateKnowledgeBase({
    repoRoot,
    outputRoot,
    stage: 'python',
  });

  assert.equal(summary.stage, 'python');
  assert.equal(summary.sourceFiles, 2);
  assert.equal(summary.fastapiRoutes, 2);
  assert.match(
    readFileSync(join(outputRoot, 'catalog', 'fastapi-routes.jsonl'), 'utf8'),
    /jobs\/\{job_id\}\/run/,
  );
  assert.match(
    readFileSync(join(outputRoot, 'catalog', 'configuration-reads.jsonl'), 'utf8'),
    /SERVICE_TOKEN/,
  );
});
