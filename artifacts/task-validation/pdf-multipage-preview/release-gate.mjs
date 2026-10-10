import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = 'artifacts/task-validation/pdf-multipage-preview', app = '30f0b14d63ae69acec66cd82dcaee1d0abbb1cf6';
const read = path => JSON.parse(readFileSync(root + '/' + path, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), app);
assert.equal(execFileSync('git', ['diff', 'HEAD', '--name-only', '--', 'frontend', 'package-lock.json'], { encoding: 'utf8' }).trim(), '');
assert.equal(execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'frontend'], { encoding: 'utf8' }).trim(), '');
const manifestBytes = readFileSync(root + '/independent-qa/artifact-manifest.json');
assert.equal(sha(manifestBytes), 'a9c2e7ebbe6f1de363fa86e4e924f50a0b303080708960c1070ff60bb9da34fb');
const manifest = JSON.parse(manifestBytes); assert.equal(manifest.sourceCommit, app);
for (const file of manifest.artifacts) assert.equal(sha(readFileSync(root + '/independent-qa/' + file.path)), file.sha256);
assert.match(readFileSync(root + '/independent-qa/validation-report.md', 'utf8'), /Final Decision: READY FOR CODEX QA/);
assert.deepEqual(read('independent-qa/source-before.json'), read('independent-qa/source-after.json'));
const independent = read('independent-qa/verdict.json'); assert.equal(independent.sourceCommit, app); assert.equal(independent.applicationImmutable, true);
for (const folder of ['root-fidelity/browser-legacy-fidelity', 'root-fidelity/browser-v2-fidelity']) {
  const browser = read(folder + '/results.json'); assert.equal(browser.length, 2);
  for (const c of browser) { assert.equal(c.online, true); assert.equal(c.pass, true); assert.deepEqual(c.errors, []); assert.deepEqual(c.httpErrors, []); assert.deepEqual(c.state.forbidden, []); }
}
const baseline = read('exact-baseline/results.json'); assert.equal(baseline.length, 1); assert.equal(baseline[0].baseline, true); assert.equal(baseline[0].online, true); assert.ok(baseline[0].pixels.slice(1).every(p => p.dark === 0));
const commands = read('commands02/source-and-tests.json'); assert.equal(commands.unchanged, true);
for (const command of commands.results.filter(c => c.name !== 'full-regression')) assert.equal(command.exit, 0);
assert.deepEqual(read('commands02/baseline-comparison.json').newFailures, []);
assert.deepEqual(read('independent-qa/baseline-comparison.json').newFailures, []);
assert.equal(read('root-fidelity/fidelity-measurements.json').length, 24);
const receipt = { applicationCommit: app, base: '3f911cbd281d7c93c4796e97d5940258ceb331f0', decision: 'AUTHORIZED SCOPED PROMOTION', authority: 'Standing direct human commit/push/deployment/GitHub evidence authorization; independent QA, root actual-SPA/CSP replay and exact baseline reproduction', independentManifestSha256: sha(manifestBytes), immutableQaArtifacts: manifest.artifacts.length, rootBrowserResponsiveScenarios: 4, fullRasterComparisonsEach: 24, rootFocused: 18, independentFocused: 13, frontendRegression: { tests: 1299, pass: 1287, exactBaselineFailures: 12, newFailures: 0, globallyGreen: false }, scope: execFileSync('git', ['diff', '--name-only', '3f911cbd281d7c93c4796e97d5940258ceb331f0', app], { encoding: 'utf8' }).trim().split('\n'), productionPatientTestMutations: 0, automationResumed: false, pending: ['exact production deployment', 'actual deployed SPA pixels and resource bytes', 'named CI delta and pinned synthetic publication'], at: new Date().toISOString() };
writeFileSync(root + '/release-gate.json', JSON.stringify(receipt, null, 2)); console.log(JSON.stringify({ decision: receipt.decision, applicationCommit: app, qaArtifacts: manifest.artifacts.length }));
