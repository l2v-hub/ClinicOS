import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startPo05Postgres } from '../../../../tests/fixtures/po05-postgres.mjs';

const root = process.cwd();
const artifactRoot = resolve(root, 'artifacts/task-validation/po-06-identita-posto-letto/backend');
const database = await startPo05Postgres({ artifactRoot, repositoryRoot: root });
const names = process.argv.slice(2);
const tests = names.length ? names : [
  'backend/src/patients/__tests__/operational-identity-db.test.ts',
  'backend/src/patients/__tests__/parameters-page-db.test.ts',
  'backend/src/patients/__tests__/alphabetical-pages-db.test.ts',
  'backend/src/routes/__tests__/consegne-bounded-auth.test.ts',
];
const output = createWriteStream(resolve(artifactRoot, 'focused-tests.log'));
const results = [];
try {
  if (new URL(database.url).hostname !== '127.0.0.1') throw new Error('Loopback required');
  for (const file of tests) {
    const child = spawn(process.execPath, ['--import', 'tsx', '--test', '--test-concurrency=1', file], {
      cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, DATABASE_URL: database.url, AUTH_MODE: 'demo', NODE_ENV: 'test' },
    });
    child.stdout.on('data', (data) => { output.write(data); process.stdout.write(data); });
    child.stderr.on('data', (data) => { output.write(data); process.stderr.write(data); });
    const code = await new Promise((ok, fail) => { child.once('error', fail); child.once('exit', ok); });
    results.push({ file, exitCode: code });
  }
  await writeFile(resolve(artifactRoot, 'focused-tests.json'), JSON.stringify({ database: 'synthetic native PostgreSQL loopback', results }, null, 2));
  process.exitCode = results.every((result) => result.exitCode === 0) ? 0 : 1;
} finally {
  await database.close();
  output.end();
}
