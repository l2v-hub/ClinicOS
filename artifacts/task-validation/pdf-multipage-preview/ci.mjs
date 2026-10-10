import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { gh } from './github.mjs';
const app = '30f0b14d63ae69acec66cd82dcaee1d0abbb1cf6', base = '3f911cbd281d7c93c4796e97d5940258ceb331f0';
const snapshots = [];
for (const source of [base, app]) {
  const runs = JSON.parse(gh(['run', 'list', '--repo', 'l2v-hub/ClinicOS', '--commit', source, '--limit', '20', '--json', 'databaseId,name,status,conclusion,headSha']));
  for (const run of runs) {
    if (run.status !== 'completed') { console.log(JSON.stringify({ pending: run.databaseId, name: run.name, status: run.status })); process.exit(2); }
    const detail = JSON.parse(gh(['run', 'view', String(run.databaseId), '--repo', 'l2v-hub/ClinicOS', '--json', 'jobs']));
    const failures = run.conclusion === 'failure' ? gh(['run', 'view', String(run.databaseId), '--repo', 'l2v-hub/ClinicOS', '--log-failed']) : '';
    const names = [...new Set([...failures.matchAll(/not ok \d+ - ([^\r\n]+)/g)].map(m => m[1]))].sort();
    const steps = detail.jobs.flatMap(job => job.steps.filter(s => s.conclusion === 'failure').map(s => job.name + ': ' + s.name));
    snapshots.push({ source, ...run, failureNames: names, failedSteps: steps });
  }
}
assert.ok(snapshots.filter(s => s.source === app).length >= 2, 'Candidate CI not yet registered');
const baseline = snapshots.find(s => s.source === base && s.name === 'AI Import E2E Gate');
const candidate = snapshots.find(s => s.source === app && s.name === 'AI Import E2E Gate');
assert.ok(baseline && candidate); assert.deepEqual(candidate.failureNames, baseline.failureNames); assert.deepEqual(candidate.failedSteps, baseline.failedSteps);
assert.equal(snapshots.find(s => s.source === app && s.name === 'Frontend Secret Scan').conclusion, 'success');
const receipt = { applicationCommit: app, baselineCommit: base, snapshots, newFailureNames: [], globallyGreen: candidate.conclusion === 'success', decision: 'EXACT NAMED BASELINE DELTA VERIFIED', at: new Date().toISOString() };
writeFileSync('artifacts/task-validation/pdf-multipage-preview/ci-comparison.json', JSON.stringify(receipt, null, 2)); console.log(JSON.stringify({ newFailures: 0, globallyGreen: receipt.globallyGreen, candidate: candidate.databaseId, failures: candidate.failureNames }));
