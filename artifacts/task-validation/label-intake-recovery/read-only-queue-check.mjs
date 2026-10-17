import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { createGitHub } from '../../../agent-team/src/bug-pipeline/github.mjs';
import { dashboardSnapshot } from '../../../agent-team/src/bug-pipeline/dashboard.mjs';

if (process.env.CLINICOS_READONLY_QUEUE_QA !== '1') throw new Error('Explicit read-only QA opt-in required');
const repo = 'l2v-hub/ClinicOS';
const base = 'b058ce032e5b1d73050353e849103ea438f7d613';
const original = execFileSync('git', ['show', `${base}:agent-team/src/bug-pipeline/github.mjs`], { encoding: 'utf8' });
const legacy = await import(`data:text/javascript;base64,${Buffer.from(original).toString('base64')}`);
const run = async ({ args }) => {
  assert.equal(args[0], 'api');
  assert.ok(!args.includes('-X') && !args.includes('--input'), 'read-only GitHub requests only');
  const result = spawnSync('/workspace/.tools/gh/bin/gh', args, {encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024});
  return {ok: result.status === 0, code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? ''};
};
const before = legacy.createGitHub({ repo, run });
const after = createGitHub({ repo, run });
const previous = await before.discoverQueue();
const current = await after.discoverQueue();
const snapshot = dashboardSnapshot({repo, state: {schemaVersion: 1, repository: repo, batches: []}, issues: [], queue: current});
const result = {
  base,
  observedAt: new Date().toISOString(),
  readOnly: true,
  oldQueue: previous.map(issue => issue.number).sort((a,b)=>a-b),
  fixedQueue: current.map(issue => issue.number).sort((a,b)=>a-b),
  counts: snapshot.counts,
  statuses: snapshot.rows.map(({number,status})=>({number,status})),
};
assert.ok(current.length > previous.length, 'the fixed adapter must recover authorized labels excluded by the old controller');
await writeFile(new URL('read-only-queue-result.json', import.meta.url), JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
