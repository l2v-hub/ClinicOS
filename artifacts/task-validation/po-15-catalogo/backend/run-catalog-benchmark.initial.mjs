import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { startPo05Postgres } from '../../../../tests/fixtures/po05-postgres.mjs';
const artifactRoot = resolve('artifacts/task-validation/po-15-catalogo/backend');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(await readFile(resolve(artifactRoot, 'source-manifest.json'), 'utf8'));
const checkSource = async () => {
  for (const row of manifest.sourcePaths) assert.equal(sha(await readFile(row.path)), row.sha256, row.path);
  const inputs = JSON.parse(await readFile(resolve(artifactRoot, 'catalog-test-source-manifest.json'), 'utf8'));
  for (const row of inputs.inputs) assert.equal(sha(await readFile(row.path)), row.sha256, row.path);
  assert.equal(inputs.treeSha256, manifest.inputTreeSha256);
};
await checkSource();
const database = await startPo05Postgres({ artifactRoot, repositoryRoot: process.cwd() });
let output = '', exitCode;
try {
  assert.equal(new URL(database.url).hostname, '127.0.0.1');
  const child = spawn(process.execPath, ['--import', 'tsx', resolve(artifactRoot, 'benchmark-catalog.ts')], {
    cwd: process.cwd(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, DATABASE_URL: database.url, NODE_ENV: 'test', AUTH_MODE: 'demo' },
  });
  child.stdout.on('data', data => { output += data; process.stdout.write(data); });
  child.stderr.on('data', data => { output += data; process.stderr.write(data); });
  exitCode = await new Promise((ok, fail) => { child.once('error', fail); child.once('exit', ok); });
} finally { await database.close(); await writeFile(resolve(artifactRoot, 'catalog-benchmark.log'), output); }
await checkSource();
await writeFile(resolve(artifactRoot, 'catalog-benchmark-run.json'), JSON.stringify({ sourceManifestSha256: sha(await readFile(resolve(artifactRoot, 'source-manifest.json'))), inputTreeSha256: manifest.inputTreeSha256, databaseClosed: true, sourceUnchanged: true, migrations: database.applied, exitCode }, null, 2) + '\n');
assert.equal(exitCode, 0);
