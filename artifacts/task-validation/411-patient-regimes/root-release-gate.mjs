import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = 'artifacts/task-validation/411-patient-regimes';
const source = '8b327ca55ab5d8d4c5e0c19afcb828c017eeb3df';
const sourceHash = 'd5c10518d55750fb19731dbfbbd03da4b52b0769f8d25b83bff07d99fe781580';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const manifest = read(`${root}/independent-qa/evidence-manifest.json`);
assert.equal(manifest.applicationCommit, source); assert.equal(manifest.sourceSha256, sourceHash);
for (const file of manifest.files) assert.equal(createHash('sha256').update(readFileSync(file.path)).digest('hex'), file.sha256, file.path);
for (const actor of ['independent-qa', 'root-rerun']) {
  const commands = read(`${root}/${actor}/commands/command-results.json`);
  assert.equal(commands.newFailures.length, 0);
  for (const r of commands.records) if (r.name !== 'full-regression') assert.equal(r.exit, 0, r.name);
  assert.equal(commands.records.find(r => r.name === 'focused').pass, 20);
  assert.equal(commands.records.find(r => r.name === 'full-regression').fail, 12);
  const browser = read(`${root}/${actor}/browser/test-results/browser-results.json`);
  assert.equal(browser.outcomes.length, 11); assert.ok(browser.outcomes.every(r => r.status === 'PASS'));
  for (const state of browser.states) for (const key of ['writes', 'unexpected', 'external', 'pageErrors']) assert.equal(state[key].length, 0, key);
  for (const phase of actor === 'independent-qa' ? ['before', 'after'] : ['source-before', 'source-after']) {
    const receipt = read(`${root}/${actor}/${phase}/source-receipt.json`);
    assert.equal(receipt.applicationCommit, source); assert.equal(receipt.sourceSha256, sourceHash);
  }
}
assert.match(readFileSync(`${root}/independent-qa-report.md`, 'utf8'), /READY FOR CODEX QA/);
assert.match(readFileSync(`${root}/independent-qa/adversarial-automatic-jsx.log`, 'utf8'), /ℹ pass 3/);
assert.match(readFileSync(`${root}/root-rerun/extra/adversarial-unit.log`, 'utf8'), /ℹ pass 3/);
assert.ok(read(`${root}/root-rerun/extra/result.json`).records.every(r => r.exit === 0));
for (const p of [`${root}/independent-qa/adversarial-browser`, `${root}/root-rerun/extra-browser`]) {
  const browser = read(`${p}/test-results/browser-results.json`);
  assert.equal(browser.outcomes.length, 2); assert.ok(browser.outcomes.every(r => r.status === 'PASS'));
  for (const state of browser.states) for (const key of ['writes', 'unexpected', 'external', 'pageErrors', 'errors', 'httpErrors']) assert.equal(state[key].length, 0, key);
}
assert.equal(spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(), source);
const scopes = read(`${root}/root-rerun/source-after/source-receipt.json`).sourceScope;
assert.equal(spawnSync('git', ['diff', '--exit-code', 'HEAD', '--', ...scopes]).status, 0);
assert.equal(spawnSync('git', ['ls-files', '--others', '--exclude-standard', '--', ...scopes], { encoding: 'utf8' }).stdout.trim(), '');
const security = read(`${root}/security-receipt.json`); assert.equal(security.touchedFindings.length, 0); assert.equal(security.unchangedDependencyFindings.length, 7);
const receipt = { applicationCommit: source, applicationSourceSha256: sourceHash, checkedAt: new Date().toISOString(), decision: 'AUTHORIZED SCOPED APPLICATION PROMOTION',
  authority: 'Direct human authorization for sequential fixes, commits, pushes, verified deployment and synthetic GitHub closure; root integration owner, not QA worker or coordination ledger.',
  acceptance: { AC1: 'PASS exact non-discharged label/predicate, contextual local counts, explicit scoped global counter', AC2: 'PASS exact readable DH/outpatient selectors', AC3: 'PASS distinct unavailable/malformed and safe loading/failure/retry/capability', AC4: 'PASS mixed states, pagination, search/entry reset, desktop/mobile/roles' },
  independentBrowserPass: 11, rootBrowserPass: 11, focusedPassEach: 20, baselineFailures: 12, newFailures: 0, productionPatientTestMutations: 0,
  deploymentAcceptance: 'PENDING verified exact-source Vercel production READY/asset200; no issue closure until verified', backendChanges: false,
  excludedSource: 'Unreleased405/408/410, unrelated launcher EOL, primary dirty source and coordination metadata preserved',
  knownLimits: '12 unchanged baseline frontend failures and7dependency findings; no hardware/AT/global security certification',
  deploymentRouting: 'User explicitly authorized deployment without repeated approvals. Actual provider Git-main deployment verified on409 supersedes stale manual-only/auth-wall skill assumptions; no duplicate CLI deployment. Final CLOSED — VERIFIED recorded only after actual deployment, never fabricated before it.' };
writeFileSync(`${root}/release-gate-receipt.json`, JSON.stringify(receipt, null, 2)); console.log(JSON.stringify(receipt));
