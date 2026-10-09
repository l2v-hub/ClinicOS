import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
const root = resolve('artifacts/task-validation/411-patient-regimes/independent-qa');
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const before = read(`${root}/before/source-receipt.json`), after = read(`${root}/after/source-receipt.json`);
assert.equal(before.applicationCommit, '8b327ca55ab5d8d4c5e0c19afcb828c017eeb3df');
assert.equal(before.sourceSha256, 'd5c10518d55750fb19731dbfbbd03da4b52b0769f8d25b83bff07d99fe781580');
assert.deepEqual(before, after);
const commands = read(`${root}/commands/command-results.json`);
assert.deepEqual(commands.newFailures, []);
assert.deepEqual(commands.records.find(r => r.name === 'full-regression').failures, commands.baselineFailures);
assert.equal(commands.records.find(r => r.name === 'full-regression').fail, 12);
assert.ok(commands.records.filter(r => r.name !== 'full-regression').every(r => r.exit === 0));
const scan = read('.claude/security-scans/scan-all-deep.json');
const baseScan = read('C:/w-409/.claude/security-scans/scan-all-deep.json');
const findings = s => s.issues ?? s.vulnerabilities ?? s.findings;
const reviewed = read('artifacts/task-validation/411-patient-regimes/security-receipt.json');
const touched = findings(scan).filter(f => reviewed.changedProductionPaths.includes(f.location.replaceAll('\\', '/').split(':')[0]));
assert.deepEqual(touched, []);
assert.deepEqual(findings(scan).filter(f => f.type === 'Dependency CVE'), findings(baseScan).filter(f => f.type === 'Dependency CVE'));
assert.equal(findings(scan).length, 481);
const browserResults = ['browser', 'adversarial-browser'].map(name => ({name, ...read(`${root}/${name}/test-results/browser-results.json`)}));
for (const result of browserResults) {
  assert.ok(result.outcomes.every(o => o.status === 'PASS'));
  for (const state of result.states) {
    for (const key of ['writes', 'unexpected', 'external', 'pageErrors']) assert.deepEqual(state[key], []);
    const isFailureContext = state.httpErrors.length > 0;
    if (isFailureContext) assert.equal(result.name, 'browser');
    assert.ok(state.httpErrors.every(e => e.path === '/patients/clinical-summary' && e.status === 503));
    assert.ok(state.errors.every(e => /Failed to load resource.*503/.test(e)));
  }
}
writeFileSync(`${root}/independent-checks.json`, JSON.stringify({sourceBeforeAfterEqual:true, originalAcceptanceCriteria:4,
  focusedTests:20, adversarialTests:3, suppliedBrowserGroups:11, independentlyAuthoredBrowserGroups:2,
  fullRegression:{tests:1195,pass:1183,knownBaselineFailures:12,newFailures:0},
  security:{findings:481,unchangedDependencyFindings:7,touchedFindings:0,noCleanCertification:true},
  runtime7474Stopped:true, initialProbeRefinements:['QA-only SSR needed application automatic JSX configuration','Unknown outside exact known DH intersection does not invalidate its verified zero; initial incorrect QA assertion corrected']}, null, 2));
const walk = dir => readdirSync(dir, {withFileTypes:true}).flatMap(entry => entry.isDirectory() ? walk(resolve(dir, entry.name)) : [resolve(dir, entry.name)]);
const paths = walk(root).filter(p => !p.endsWith('/evidence-manifest.json') && !p.endsWith('\\evidence-manifest.json'));
paths.push(resolve('artifacts/task-validation/411-patient-regimes/independent-qa-report.md'));
const files = paths.sort().map(p => ({path:relative(resolve('.'),p).replaceAll('\\','/'),sha256:createHash('sha256').update(readFileSync(p)).digest('hex')}));
const manifest = {applicationCommit:before.applicationCommit, sourceSha256:before.sourceSha256, files};
writeFileSync(`${root}/evidence-manifest.json`, JSON.stringify(manifest,null,2));
console.log(JSON.stringify({fileCount:files.length, applicationCommit:manifest.applicationCommit, sourceSha256:manifest.sourceSha256}));
