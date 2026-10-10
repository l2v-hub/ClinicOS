import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve('.');
const out = resolve('artifacts/task-validation/pdf-multipage-preview/independent-qa');
mkdirSync(out, { recursive: true });
const git = args => {
  const r = spawnSync('git', args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stdout.trim();
};
const snapshot = () => ({ commit: git(['rev-parse', 'HEAD']), files: Object.fromEntries(git(['ls-files', 'frontend', 'package-lock.json']).split('\n').map(path => [path, createHash('sha256').update(readFileSync(path)).digest('hex')])) });
writeFileSync(resolve(out, 'source-before.json'), JSON.stringify(snapshot(), null, 2));
const results = [];
for (const [name, cwd, args, allowedFailure] of [
  ['contract', root, ['scripts/quality-gate/validate-task-contract.js', 'pdf-multipage-preview'], false],
  ['focused', resolve('frontend'), ['--import', 'tsx', '--import', new URL('../../../../scripts/stub-css-loader.mjs', import.meta.url).href, '--test', 'src/lib/__tests__/pdfPreviewResources.test.ts', 'src/components/shared/import/__tests__/importSession.test.ts', 'src/components/shared/import/__tests__/importUpload.test.ts'], false],
  ['types', resolve('frontend'), [resolve('node_modules/typescript/bin/tsc'), '--noEmit', '-p', 'tsconfig.app.json'], false],
  ['build-types', resolve('frontend'), [resolve('node_modules/typescript/bin/tsc'), '-b'], false],
  ['build-vite', resolve('frontend'), [resolve('node_modules/vite/bin/vite.js'), 'build'], false],
  ['secrets-source', root, ['scripts/security/scan-frontend-secrets.mjs', 'frontend/src', 'frontend/config', 'frontend/index.html'], false],
  ['secrets-dist', root, ['scripts/security/scan-frontend-secrets.mjs', 'frontend/dist'], false],
  ['full-frontend', resolve('frontend'), ['../scripts/run-node-tests.mjs'], true],
]) {
  const started = new Date().toISOString();
  const run = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', maxBuffer: 30_000_000, env: { ...process.env, TSX_TSCONFIG_PATH: resolve('frontend/tsconfig.app.json') } });
  writeFileSync(resolve(out, `${name}.log`), `${run.stdout || ''}${run.stderr || ''}`);
  results.push({ name, cwd, command: [process.execPath, ...args], started, exitCode: run.status, allowedFailure });
  writeFileSync(resolve(out, 'commands.json'), JSON.stringify(results, null, 2));
  console.log(name, run.status);
  if (run.status !== 0 && !allowedFailure) throw new Error(`${name} failed; retained log`);
}
writeFileSync(resolve(out, 'source-after.json'), JSON.stringify(snapshot(), null, 2));
