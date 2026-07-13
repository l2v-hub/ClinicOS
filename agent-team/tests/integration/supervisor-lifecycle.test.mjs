import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildStatusProjection } from '../../src/core/status-projection.mjs';
import { recoverActiveWork } from '../../src/core/recovery.mjs';
import { run as runStop } from '../../src/commands/stop.mjs';
import { run as runStart } from '../../src/commands/start.mjs';

const MARKER = '<!-- clinic-os-agent-team:v1 -->';
const S1 = '1'.repeat(40);
const config = {
  repository: 'l2v-hub/ClinicOS', heartbeatTimeoutMs: 1000, pollIntervalMs: 100, leaseDurationMs: 300000,
  runtimeRoot: '', worktreeRoot: 'C:/repo/wt', noProgressLimit: 3,
  labels: { readyForDev: 'ready-for-dev', assignedToClaude: 'assigned-to-claude', working: 'agent-working', readyForQa: 'ready-for-qa', qaPassed: 'qa-passed', qaFailed: 'qa-failed', blocked: 'blocked' }
};

const claim = { schema_version: 1, message_type: 'work.claim', message_id: 'claim-263-2-abc', correlation_id: 'issue-263-attempt-2', producer_role: 'claude-development', repository: 'l2v-hub/ClinicOS', issue_number: 263, attempt: 2, worker_id: 'host:me', lease_id: 'lease-1', created_at: '2026-07-13T08:00:00Z', expires_at: '2026-07-13T12:00:00Z' };
const handoff = { schema_version: 1, message_type: 'development_handoff', message_id: 'dev-1', correlation_id: 'issue-263-attempt-1', producer_role: 'claude-development', repository: 'l2v-hub/ClinicOS', issue_number: 263, pull_request_number: 264, attempt: 1, created_at: '2026-07-12T14:00:00Z', subject_sha: S1, state_before: 'a', state_after: 'b', acceptance_criteria: [], resolved_findings: [], commands: [], artifact_refs: [], next_actions: ['ready-for-qa'] };
const qaResult = { ...handoff, message_id: 'qa-1', message_type: 'qa_result', producer_role: 'codex-qa', decision: 'qa-failed', findings: [], next_actions: ['ready-for-dev'] };
const comment = (id, value) => ({ id, created_at: value.created_at, body: `${MARKER}\n${JSON.stringify(value)}` });

test('status projection reads work coordinates from GitHub protocol history, not local files', () => {
  const projection = buildStatusProjection({
    local: { supervisor_running: true, heartbeat_age_ms: 200, pid: 4242 },
    items: [{
      issue: { number: 263, labels: [{ name: 'agent-working' }], comments: [comment(1, claim), comment(2, handoff), comment(3, qaResult)] },
      pullRequest: { number: 264, isDraft: true, headRefOid: S1, headRefName: 'codex/agent-team-architecture' }
    }],
    config,
    now: new Date('2026-07-13T09:00:00Z')
  });
  assert.equal(projection.supervisor.running, true);
  const issue = projection.issues[0];
  assert.equal(issue.number, 263);
  assert.deepEqual(issue.labels, ['agent-working']);
  assert.equal(issue.active_claim.lease_id, 'lease-1');
  assert.equal(issue.active_claim.worker_id, 'host:me');
  assert.equal(issue.last_handoff.attempt, 1);
  assert.equal(issue.last_handoff.subject_sha, S1);
  assert.equal(issue.last_qa.decision, 'qa-failed');
  assert.equal(issue.next_attempt, 2);
  assert.equal(issue.pull_request.number, 264);
  assert.equal(issue.pull_request.head_sha, S1);
});

test('status projection reports no active claim once a matching release exists', () => {
  // Mirrors the real QA-263-010 state: the claim comment is tolerated even when schema-invalid
  // (missing message_id), so only a lease-matched release may clear it before lease expiry.
  const { message_id, ...invalidClaim } = claim;
  const release = { ...claim, message_type: 'work.claim_released', message_id: 'claim-263-2-abc-released', released_at: '2026-07-13T08:30:00Z', release_reason: 'development-handoff-published: dev-263-2-handoff-abc' };
  const projection = buildStatusProjection({
    local: { supervisor_running: false, heartbeat_age_ms: null, pid: null },
    items: [{
      issue: { number: 263, labels: [{ name: 'ready-for-qa' }], comments: [comment(1, invalidClaim), comment(2, release)] },
      pullRequest: { number: 264, isDraft: true, headRefOid: S1, headRefName: 'codex/agent-team-architecture' }
    }],
    config,
    now: new Date('2026-07-13T09:00:00Z')
  });
  const issue = projection.issues[0];
  assert.equal(issue.active_claim, null, 'a released claim must not be projected as active before lease expiry');
  assert.equal(issue.released_claims, 1);
  assert.equal(issue.expired_claims, 0);
});

test('stop waits for the supervisor to exit before reporting stopped', async () => {
  const runtimeRoot = await mkdtemp(path.join(tmpdir(), 'agent-team-stop-'));
  let polls = 0;
  const sleeps = [];
  const result = await runStop({
    config: { ...config, runtimeRoot },
    deps: { isLive: async () => { polls += 1; return polls <= 2; }, sleep: async (ms) => { sleeps.push(ms); } }
  });
  assert.equal(result.ok, true);
  assert.equal(result.stopped, true);
  assert.equal(result.timed_out, false);
  assert.equal(polls >= 3, true);
  await access(path.join(runtimeRoot, 'stop.request'));
});

test('stop reports a timeout when the supervisor never exits', async () => {
  const runtimeRoot = await mkdtemp(path.join(tmpdir(), 'agent-team-stop-timeout-'));
  const result = await runStop({
    config: { ...config, runtimeRoot },
    deps: { isLive: async () => true, sleep: async () => {} }
  });
  assert.equal(result.ok, false);
  assert.equal(result.stopped, false);
  assert.equal(result.timed_out, true);
});

test('start acknowledges only after the detached supervisor owns the runtime', async () => {
  const runtimeRoot = await mkdtemp(path.join(tmpdir(), 'agent-team-start-'));
  let spawned = false;
  let liveChecks = 0;
  const result = await runStart({
    config: { ...config, runtimeRoot },
    repoRoot: 'C:/repo',
    mode: 'start',
    deps: {
      doctor: async () => ({ ok: true, developmentReady: true, qaReady: true, checks: [] }),
      spawnDetached: () => { spawned = true; return { pid: 4242, unref() {} }; },
      isLive: async () => { liveChecks += 1; return spawned && liveChecks > 3; },
      sleep: async () => {}
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.started, true);
  assert.equal(result.acknowledged, true);
  assert.equal(result.pid, 4242);
});

test('restart recovery refreshes my unexpired claims from GitHub state', async () => {
  const edits = [];
  const github = {
    async listIssuesByLabels(labels) { return labels.includes('agent-working') ? [{ number: 263, labels: [{ name: 'agent-working' }] }] : []; },
    async listIssueComments() { return [comment(7, claim)]; },
    async editIssueComment(id, body) { edits.push({ id, body }); return { id }; }
  };
  const recovered = await recoverActiveWork({
    github, config,
    schemas: { claim: JSON.parse(await readFile(path.resolve('agent-team/protocol/schemas/claim.schema.json'), 'utf8')) },
    workerId: 'host:me',
    now: new Date('2026-07-13T09:00:00Z')
  });
  assert.equal(recovered.recovered.length, 1);
  assert.equal(recovered.recovered[0].issue_number, 263);
  assert.equal(recovered.recovered[0].lease_id, 'lease-1');
  assert.equal(edits.length, 1);
  assert.equal(edits[0].id, 7);
  assert.match(edits[0].body, /refreshed_at/);
});
