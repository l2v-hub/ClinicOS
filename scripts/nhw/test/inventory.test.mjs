import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { generateKnowledgeBase } from '../generate.mjs';
import { buildInventory, classifyPath, inventoryHash } from '../lib/inventory.mjs';

function write(root, relativePath, content) {
  const absolutePath = join(root, ...relativePath.split('/'));
  mkdirSync(join(absolutePath, '..'), { recursive: true });
  writeFileSync(absolutePath, content);
}

function createRepository() {
  const root = mkdtempSync(join(tmpdir(), 'clinicos-nhw-inventory-'));
  execFileSync('git', ['init', '--quiet'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'nhw@example.invalid'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'NHW Test'], { cwd: root });
  execFileSync('git', ['config', 'core.autocrlf', 'false'], { cwd: root });

  write(root, '.gitignore', 'node_modules/\n*.zip\n');
  write(root, 'backend/src/app.ts', 'export const version = 1;\n');
  write(root, 'docs/architecture.md', '# Architecture\n');
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '--quiet', '-m', 'fixture'], { cwd: root });

  write(root, 'backend/src/app.ts', 'export const version = 2;\n');
  write(root, 'clinicos-ai-runtime/tests/test_new.py', 'def test_new():\n    assert True\n');
  write(root, 'artifacts/task-validation/239/evidence.png', Buffer.from([0, 1, 2, 3]));
  write(root, 'artifacts/task-validation/239/test-results/api.txt', 'status=pass\n');
  write(root, 'node_modules/pkg/index.js', 'module.exports = true;\n');
  write(root, 'archive.zip', Buffer.from([80, 75, 3, 4]));
  return root;
}

test('classifies source, generated, migration, and evidence paths', () => {
  assert.deepEqual(classifyPath('backend/src/app.ts'), {
    classification: 'semantic-source',
    reason: 'application-source',
  });
  assert.equal(classifyPath('node_modules/pkg/index.js').classification, 'generated-excluded');
  assert.equal(classifyPath('.git/objects/aa/bb').classification, 'generated-excluded');
  assert.deepEqual(classifyPath('.claude/worktrees'), {
    classification: 'generated-excluded',
    reason: 'generated-or-ephemeral-directory',
  });
  assert.deepEqual(classifyPath('agent-team/.runtime'), {
    classification: 'generated-excluded',
    reason: 'generated-or-ephemeral-directory',
  });
  assert.equal(
    classifyPath('artifacts/task-validation/239/evidence.png').classification,
    'metadata-only',
  );
  assert.equal(
    classifyPath('prisma/migrations/20260101000000_init/migration.sql').classification,
    'semantic-source',
  );
});

test('inventories the complete working tree deterministically', async (t) => {
  const root = createRepository();
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const first = await buildInventory(root);
  const second = await buildInventory(root);
  assert.deepEqual(first, second);
  assert.equal(inventoryHash(first), inventoryHash(second));
  assert.equal(
    inventoryHash(first),
    inventoryHash([...first].reverse()),
    'inventory hashes must not depend on JSONL row order',
  );
  assert.deepEqual(
    first.map((record) => record.path),
    [...first.map((record) => record.path)].sort((a, b) => a.localeCompare(b, 'en')),
  );
  assert.ok(first.every((record) => !record.path.includes('\\')));

  const modified = first.find((record) => record.path === 'backend/src/app.ts');
  assert.equal(modified.gitState, 'tracked-modified');
  assert.match(modified.sha256, /^[a-f0-9]{64}$/);

  const untracked = first.find((record) => record.path === 'clinicos-ai-runtime/tests/test_new.py');
  assert.equal(untracked.gitState, 'untracked');
  assert.equal(untracked.classification, 'test-source');

  const evidence = first.find(
    (record) => record.path === 'artifacts/task-validation/239/evidence.png',
  );
  assert.equal(evidence.classification, 'metadata-only');
  assert.equal(Object.hasOwn(evidence, 'content'), false);
  const testEvidence = first.find(
    (record) => record.path === 'artifacts/task-validation/239/test-results/api.txt',
  );
  assert.equal(testEvidence.classification, 'metadata-only');

  const nodeModules = first.find((record) => record.path === 'node_modules/');
  assert.equal(nodeModules.classification, 'generated-excluded');
  assert.equal(nodeModules.pathType, 'directory');
  assert.equal(nodeModules.sha256, null);
  assert.equal(
    first.some((record) => record.path === 'node_modules/pkg/index.js'),
    false,
  );

  const ignoredArchive = first.find((record) => record.path === 'archive.zip');
  assert.equal(ignoredArchive.gitState, 'ignored');
  assert.equal(ignoredArchive.classification, 'metadata-only');
});

test('writes inventory and exclusion catalogs through the staged generator', async (t) => {
  const root = createRepository();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const outputRoot = join(root, 'generated', 'docs', 'nhw');

  const summary = await generateKnowledgeBase({
    repoRoot: root,
    outputRoot,
    stage: 'inventory',
  });

  assert.equal(summary.stage, 'inventory');
  assert.ok(summary.inventoryPaths > 0);
  const inventory = readFileSync(join(outputRoot, 'coverage', 'inventory.jsonl'), 'utf8');
  const exclusions = JSON.parse(
    readFileSync(join(outputRoot, 'coverage', 'exclusions.json'), 'utf8'),
  );
  assert.match(inventory, /backend\/src\/app\.ts/);
  assert.ok(exclusions.records.some((record) => record.path === 'node_modules/'));
});
