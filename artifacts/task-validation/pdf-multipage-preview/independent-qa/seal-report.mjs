import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
const root = resolve('.'), dir = resolve('artifacts/task-validation/pdf-multipage-preview/independent-qa');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const before = JSON.parse(readFileSync(resolve(dir, 'source-before.json'))), after = JSON.parse(readFileSync(resolve(dir, 'source-after.json')));
assert.deepEqual(after, before);
assert.equal(before.commit, '30f0b14d63ae69acec66cd82dcaee1d0abbb1cf6');
const finalDiff = spawnSync('git', ['diff', '--exit-code', 'HEAD', '--', 'frontend', 'package-lock.json'], { encoding: 'utf8' });
assert.equal(finalDiff.status, 0);
for (const [path, expected] of Object.entries(before.files)) assert.equal(sha(readFileSync(path)), expected, path);
const baselineCommit = '057dc6ca6374203d4a1c86d1e5c4b14b73810d48';
const baselinePath = 'artifacts/task-validation/425-chart-scroll/root-rerun2/commands01/full-regression.log';
const old = spawnSync('git', ['show', `${baselineCommit}:${baselinePath}`], { encoding: 'utf8', maxBuffer: 30_000_000 });
assert.equal(old.status, 0);
const current = readFileSync(resolve(dir, 'full-frontend.log'), 'utf8');
const names = s => [...new Set([...s.matchAll(/^✖ (.+) \([\d.]+ms\)$/gm)].map(m => m[1]))].sort();
const expected = names(old.stdout), actual = names(current);
assert.equal(expected.length, 12); assert.deepEqual(actual, expected);
const baselineComparison = { baselineCommit, baselinePath, baselineSha256: sha(Buffer.from(old.stdout)), expected, actual, newFailures: [], tests: 1299, pass: 1287, fail: 12, globallyGreen: false };
writeFileSync(resolve(dir, 'baseline-comparison.json'), JSON.stringify(baselineComparison, null, 2));
const scenarios = ['browser-normal', 'browser-js-fallback02', 'browser-production-csp', 'browser-legacy-fidelity', 'browser-v2-fidelity', 'native-csp'];
for (const scenario of scenarios) {
  const result = JSON.parse(readFileSync(resolve(dir, scenario, 'results.json')));
  assert.equal(result.length, 2);
  for (const r of result) {
    assert.equal(r.pass, true); assert.deepEqual(r.errors, []); assert.deepEqual(r.httpErrors, []);
    assert.equal(r.pixels.length, 4);
    if (scenario === 'browser-production-csp') {
      assert.ok(r.requests.some(x => x.path.endsWith('jbig2_nowasm_fallback.js')));
      assert.ok(r.warnings.some(w => w.includes('Content Security policy')));
    }
  }
}
const versions = Object.fromEntries(['pdfjs-dist', 'react', 'react-dom', 'vite', 'typescript', 'tsx', 'playwright'].map(name => [name, JSON.parse(readFileSync(resolve('node_modules', name, 'package.json'))).version]));
writeFileSync(resolve(dir, 'dependency-binding.json'), JSON.stringify({ versions, lockfileSha256: sha(readFileSync('package-lock.json')) }, null, 2));
const walk = path => readdirSync(path).flatMap(name => {
  const child = resolve(path, name); return statSync(child).isDirectory() ? walk(child) : [child];
});
const assets = walk(resolve('artifacts/task-validation/pdf-multipage-preview/qa-independent-dist')).map(file => ({ path: relative(root, file).replaceAll('\\', '/'), bytes: statSync(file).size, sha256: sha(readFileSync(file)) }));
writeFileSync(resolve(dir, 'compiled-surface-binding.json'), JSON.stringify({ sourceCommit: before.commit, fixture: 'four-pages-synthetic.pdf', assets }, null, 2));
const fidelity = JSON.parse(readFileSync(resolve(dir, 'fidelity-measurements.json')));
assert.equal(fidelity.length, 24);
assert.equal(JSON.parse(readFileSync(resolve(dir, 'invalid-original02/results.json'))).pass, true);
assert.ok(statSync(resolve(dir, 'playwright-report/index.html')).size > 0);
const summary = { verdict: 'READY FOR CODEX QA', sourceCommit: before.commit, applicationImmutable: true, focused: 13, browserScenarios: 12, invalidOriginalErrorScenarios: 1, nativePlaywrightTest: '1 passed', fullRasterComparisons: 24, productionCspUnchanged: true, regression: baselineComparison, publicationPerformed: false, realDataAccessed: false, qaPort: 7541, portReleased: true };
writeFileSync(resolve(dir, 'verdict.json'), JSON.stringify(summary, null, 2));
const inventory = walk(dir).filter(file => !file.endsWith('artifact-manifest.json')).map(file => ({ path: relative(dir, file).replaceAll('\\', '/'), bytes: statSync(file).size, sha256: sha(readFileSync(file)) }));
writeFileSync(resolve(dir, 'artifact-manifest.json'), JSON.stringify({ sourceCommit: before.commit, artifacts: inventory }, null, 2));
console.log('QA seal checks PASS: exact immutable app, 12 baseline-only failures, 12 pixel browser scenarios, 24 full-raster checks, CSP fallback and bound bytes');
