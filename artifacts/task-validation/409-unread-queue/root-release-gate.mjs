import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = 'artifacts/task-validation/409-unread-queue';
const source = '47a4b16c111d9b9bfd0b138991958a8ca8f6c351';
const sourceHash = '3497659ff1207d2b6c2b222c2ed08a92bf63cc9341a33cf5795c06a14cf2eece';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
for (const file of read(`${root}/independent-qa/evidence-manifest.json`).files) {
  assert.equal(createHash('sha256').update(readFileSync(file.path)).digest('hex'), file.sha256, file.path);
}
for (const actor of ['independent-qa', 'root-rerun']) {
  const commands = read(`${root}/${actor}/commands/command-results.json`);
  assert.equal(commands.newFailures.length, 0);
  for (const record of commands.records) if (record.name !== 'full-regression') assert.equal(record.exit, 0, record.name);
  assert.equal(commands.records.find(r => r.name === 'focused').pass, 15);
  assert.equal(commands.records.find(r => r.name === 'full-regression').fail, 12);
  assert.equal(read(`${root}/${actor}/db/result.json`).status, 0);
  assert.equal(read(`${root}/${actor}/db/result.json`).migrations, 57);
  assert.match(readFileSync(`${root}/${actor}/db/tests.log`, 'utf8'), /ℹ pass 12/);
  const prisma = read(`${root}/${actor}/prisma/result.json`);
  assert.ok(prisma.newModelsGenerated && prisma.tempOutputOnly);
  assert.ok(prisma.records.every(r => r.exit === 0));
  const browser = read(`${root}/${actor}/browser/test-results/browser-results.json`);
  assert.equal(browser.outcomes.length, 12); assert.ok(browser.outcomes.every(r => r.status === 'PASS'));
  for (const state of browser.states) for (const key of ['clinicalWrites', 'unexpected', 'external', 'pageErrors']) assert.equal(state[key].length, 0, key);
  for (const phase of ['source-before', 'source-after']) {
    const receipt = read(`${root}/${actor}/${phase}/source-receipt.json`);
    assert.equal(receipt.applicationCommit, source); assert.equal(receipt.sourceSha256, sourceHash);
  }
}
assert.match(readFileSync(`${root}/independent-qa-report.md`, 'utf8'), /Local independent QA verdict: \*\*PASS/);
assert.equal(spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(), source);
const scopes = read(`${root}/root-rerun/source-after/source-receipt.json`).sourceScope;
assert.equal(spawnSync('git', ['diff', '--exit-code', 'HEAD', '--', ...scopes]).status, 0);
assert.equal(spawnSync('git', ['ls-files', '--others', '--exclude-standard', '--', ...scopes], { encoding: 'utf8' }).stdout.trim(), '');
const receipt = { applicationCommit: source, applicationSourceSha256: sourceHash, checkedAt: new Date().toISOString(), decision: 'AUTHORIZED SCOPED APPLICATION PROMOTION', authority: 'Direct human authorization for sequential fixes, commits, pushes, frontend/backend deployments and synthetic GitHub evidence; root integration release gate, not a QA worker or coordination ledger.', acceptance: { AC1: 'PASS exact two-source bounded queue/counts', AC2: 'PASS default/re-entry Non confermate', AC3: 'PASS separate reading/urgency facts and actions', AC4: 'PASS exact patient counts and explicit non-color states' }, independentBrowserPass: 12, rootBrowserPass: 12, realDbPassEach: 12, focusedPassEach: 15, baselineFailures: 12, newFailures: 0, existingDependencyFindings: '7 unchanged (3 critical/4 high), no clean repository security certification', productionPatientTestMutations: 0, deploymentAcceptance: 'PENDING exact-source frontend/backend readiness, additive migration evidence and read-only smoke; issue remains OPEN', excludedSource: 'Unreleased405/408 candidates, unrelated launchers, coordination metadata; primary dirty preserved' };
writeFileSync(`${root}/release-gate-receipt.json`, JSON.stringify(receipt, null, 2)); console.log(JSON.stringify(receipt));
