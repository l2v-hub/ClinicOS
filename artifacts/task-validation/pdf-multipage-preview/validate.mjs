import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const dir = resolve('artifacts/task-validation/pdf-multipage-preview');
const outputDir = resolve(dir, process.env.RUN || 'commands02');
mkdirSync(outputDir, { recursive: true });
const files = ['frontend/vite.config.ts', 'frontend/config/pdfPreviewAssets.ts', 'frontend/src/lib/pdfPreviewResources.ts', 'frontend/src/lib/__tests__/pdfPreviewResources.test.ts', 'frontend/src/components/shared/PdfCanvasPreview.tsx', 'frontend/src/components/shared/import/importSourceCache.ts'];
const sha = data => createHash('sha256').update(data).digest('hex');
const source = files.map(path => ({ path, sha256: sha(readFileSync(path)) }));
const results = [];
const commands = [
  ['focused', ['--import', 'tsx', '--import', '../scripts/stub-css-loader.mjs', '--test', 'src/lib/__tests__/pdfPreviewResources.test.ts', 'src/components/shared/import/__tests__/importReview.test.ts', 'src/components/shared/import/__tests__/importSession.test.ts', 'src/components/shared/import/__tests__/importUpload.test.ts'], 'frontend'],
  ['types', ['node_modules/typescript/bin/tsc', '-b', 'frontend'], '.'],
  ['build', ['node_modules/vite/bin/vite.js', 'build', 'frontend'], '.'],
  ['full-regression', ['../scripts/run-node-tests.mjs'], 'frontend'],
];
for (const [name, args, cwd] of commands) {
  const result = spawnSync(process.execPath, args, { cwd: resolve(cwd), encoding: 'utf8', maxBuffer: 30e6,
    env: { ...process.env, TSX_TSCONFIG_PATH: resolve('frontend/tsconfig.app.json') } });
  const output = result.stdout + result.stderr;
  writeFileSync(resolve(outputDir, name + '.log'), output);
  results.push({ name, args, cwd, exit: result.status, logSha256: sha(output) });
  console.log(`${name}: exit=${result.status}`);
  if (result.status && name !== 'full-regression' && name !== 'ruflo-security') break;
}
const unchanged = source.every(row => sha(readFileSync(row.path)) === row.sha256);
const baseline = spawnSync('git', ['show', '057dc6ca6374203d4a1c86d1e5c4b14b73810d48:artifacts/task-validation/425-chart-scroll/root-rerun2/commands01/full-regression.log'], { encoding: 'utf8', maxBuffer: 30e6 });
if (baseline.status) throw new Error('Accepted baseline unavailable');
const failures = text => [...new Set([...text.matchAll(/^✖ (.*?) \([\d.]+ms\)/gm)].map(m => m[1]))].sort();
const expected = failures(baseline.stdout);
const actual = failures(readFileSync(resolve(outputDir, 'full-regression.log'), 'utf8'));
const newFailures = actual.filter(f => !expected.includes(f));
writeFileSync(resolve(outputDir, 'baseline-comparison.json'), JSON.stringify({ expected, actual, newFailures }, null, 2));
writeFileSync(resolve(outputDir, 'source-and-tests.json'), JSON.stringify({ base: '3f911cbd281d7c93c4796e97d5940258ceb331f0', source, unchanged, results, at: new Date().toISOString() }, null, 2));
if (!unchanged || newFailures.length || actual.length !== expected.length || results.some(r => r.exit && r.name !== 'full-regression')) process.exit(1);
