import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startPo05Postgres } from '../../../../tests/fixtures/po05-postgres.mjs';
const root = process.cwd();
const artifactRoot = resolve(root, 'artifacts/task-validation/po-16-giro/backend');
const sha = value => createHash('sha256').update(value).digest('hex');
const sourceState = async () => {
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--',
    'backend/src', 'prisma', 'src', 'frontend/src', 'scripts', 'tests/fixtures', 'backend/tsconfig.json', 'backend/package.json', 'package.json',
    'package-lock.json', 'prisma.config.ts', 'tests/fixtures/po05-postgres.mjs'],
    { cwd: root, windowsHide: true, encoding: 'utf8' }).trim().split(/\r?\n/);
  const inputs = await Promise.all([...new Set(files)].sort().map(async path => ({ path, sha256: sha(await readFile(resolve(root, path))) })));
  return { treeSha256: sha(inputs.map(row => `${row.path}\0${row.sha256}\n`).join('')), inputs };
};
const before = await sourceState();
await writeFile(resolve(artifactRoot, 'cwd-test-source-manifest.json'), JSON.stringify(before) + '\n');
const database = await startPo05Postgres({ artifactRoot, repositoryRoot: root });
const selected = process.argv.slice(2);
const files = ['src/assessments/__tests__/mna-presentation-db.test.ts'];
const output = createWriteStream(resolve(artifactRoot, 'cwd-focused-tests.log'));
const results = [];
try {
  if (new URL(database.url).hostname !== '127.0.0.1') throw new Error('Loopback required');
  for (const file of files) {
    let childText = '';
    const child = spawn(process.execPath, ['--import', 'tsx', '--test', '--test-concurrency=1', file], {
      cwd: resolve(root, 'backend'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, DATABASE_URL: database.url, AUTH_MODE: 'demo', NODE_ENV: 'test', AI_VOICE_ENABLED: 'true', AI_WRITE_ACTIONS_ENABLED: 'true', GDS15_PDF_QA_DIRECTORY: resolve(artifactRoot, 'regression-output'), MNA_PDF_QA_DIRECTORY: resolve(artifactRoot, 'pdf-qa'), TINETTI_PDF_QA_DIRECTORY: resolve(artifactRoot, 'regression-output'), ASSESSMENT_PDF_QA_DIRECTORY: resolve(artifactRoot, 'regression-output'), TRANSFERS_PDF_QA_DIRECTORY: resolve(artifactRoot, 'regression-output') },
    });
    child.stdout.on('data', data => { childText += data; output.write(data); process.stdout.write(data); });
    child.stderr.on('data', data => { childText += data; output.write(data); process.stderr.write(data); });
    const exitCode = await new Promise((ok, fail) => { child.once('error', fail); child.once('exit', ok); });
    results.push({ file: `backend/${file}`, childWorkingDirectory: resolve(root, 'backend'), exitCode, tests: Number(childText.match(/ℹ tests (\d+)/)?.[1] ?? 0) });
  }
} finally { await database.close(); output.end(); }
const after = await sourceState();
if (before.treeSha256 !== after.treeSha256) throw new Error('Source state changed during tests');
await writeFile(resolve(artifactRoot, 'cwd-focused-tests.json'), JSON.stringify({
  database: 'synthetic native PostgreSQL loopback', databaseClosed: true,
  sourceTreeSha256: before.treeSha256, sourceUnchanged: true, migrations: database.applied, results,
}, null, 2));
process.exitCode = results.every(row => row.exitCode === 0 && row.tests > 0) ? 0 : 1;
