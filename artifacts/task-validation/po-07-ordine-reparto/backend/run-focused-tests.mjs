import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startPo05Postgres } from '../../../../tests/fixtures/po05-postgres.mjs';
const root = process.cwd();
const artifactRoot = resolve(root, 'artifacts/task-validation/po-07-ordine-reparto/backend');
const database = await startPo05Postgres({ artifactRoot, repositoryRoot: root });
const selected = process.argv.slice(2);
const files = selected.length ? selected : [
  'backend/src/roster/__tests__/cursor.test.ts',
  'backend/src/roster/__tests__/preferences-db.test.ts',
  'backend/src/roster/__tests__/roster-pagination-db.test.ts',
];
const output = createWriteStream(resolve(artifactRoot, 'focused-tests.log'));
const results = [];
try {
  if (new URL(database.url).hostname !== '127.0.0.1') throw new Error('Loopback required');
  for (const file of files) {
    const child = spawn(process.execPath, ['--import', 'tsx', '--test', '--test-concurrency=1', file], {
      cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, DATABASE_URL: database.url, AUTH_MODE: 'demo', NODE_ENV: 'test' },
    });
    child.stdout.on('data', data => { output.write(data); process.stdout.write(data); });
    child.stderr.on('data', data => { output.write(data); process.stderr.write(data); });
    results.push({ file, exitCode: await new Promise((ok, fail) => { child.once('error', fail); child.once('exit', ok); }) });
  }
  await writeFile(resolve(artifactRoot, 'focused-tests.json'), JSON.stringify({ database: 'synthetic native PostgreSQL loopback', results }, null, 2));
  process.exitCode = results.every(row => row.exitCode === 0) ? 0 : 1;
} finally { await database.close(); output.end(); }
