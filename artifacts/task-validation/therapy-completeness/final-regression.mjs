import { spawnSync, execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const output = resolve('artifacts/task-validation/therapy-completeness/reconciliation-final-regression');
mkdirSync(output, { recursive: false });
const git = args => execFileSync('git', args, { encoding: 'utf8', windowsHide: true }).trim();
const commit = git(['rev-parse', 'HEAD']);
if (git(['diff', '--name-only', 'HEAD', '--', 'frontend/src', 'backend/src'])) throw Error('Application source not frozen');
const source = git(['diff', '--name-only', '30f0b14d63ae69acec66cd82dcaee1d0abbb1cf6', 'HEAD', '--', 'frontend/src', 'backend/src']).split('\n');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const start = new Date().toISOString();
const run = spawnSync(process.execPath, ['../scripts/run-node-tests.mjs'], { cwd: 'frontend', encoding: 'utf8', windowsHide: true,
  maxBuffer: 32e6, timeout: 240000, env: { ...process.env, TSX_TSCONFIG_PATH: resolve('frontend/tsconfig.app.json') } });
const log = (run.stdout || '') + (run.stderr || '');
writeFileSync(resolve(output, 'frontend-full.log'), log);
const baseline = readFileSync('artifacts/task-validation/therapy-completeness/commands/regression-comparison.json', 'utf8');
writeFileSync(resolve(output, 'receipt.json'), JSON.stringify({ applicationCommit: commit, start, end: new Date().toISOString(),
  command: [process.execPath, '../scripts/run-node-tests.mjs'], cwd: 'frontend', exit: run.status, timedOut: run.error?.code === 'ETIMEDOUT',
  logSha256: sha256(log), source: source.map(path => ({ path, sha256: sha256(readFileSync(path)) })),
  baselineComparisonReceiptSha256: sha256(baseline), realDatabaseAccess: false }, null, 2));
console.log(JSON.stringify({ applicationCommit: commit, exit: run.status, tail: log.slice(-1800) }));
process.exitCode = run.status === 0 ? 0 : 1;
