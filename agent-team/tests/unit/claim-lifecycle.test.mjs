import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { acquireGitHubClaim, refreshGitHubClaim, releaseGitHubClaim, recoverActiveClaim } from '../../src/core/locks.mjs';
import { parseProtocolComment } from '../../src/core/protocol.mjs';

const claimSchema = JSON.parse(await readFile(path.resolve('agent-team/protocol/schemas/claim.schema.json'), 'utf8'));
const MARKER = '<!-- clinic-os-agent-team:v1 -->';
const config = { repository: 'l2v-hub/ClinicOS', leaseDurationMs: 300000 };

function githubFake() {
  const state = { comments: [], nextId: 100, edits: [] };
  return {
    state,
    async addIssueComment(_number, body) { const id = state.nextId++; state.comments.push({ id, created_at: new Date().toISOString(), body }); return { id }; },
    async editIssueComment(commentId, body) { state.edits.push(commentId); const found = state.comments.find((c) => c.id === commentId); found.body = body; return { id: commentId }; },
    async listIssueComments() { return state.comments; }
  };
}

test('acquireGitHubClaim publishes a schema-valid claim and ignores invalid competitors', async () => {
  const github = githubFake();
  github.state.comments.push({ id: 1, created_at: '2026-07-13T00:00:00Z', body: `${MARKER}\n{"schema_version":1,"message_type":"work.claim","attempt":2,"garbage":` });
  const result = await acquireGitHubClaim({ github, config, schema: claimSchema, issue: { number: 263 }, workerId: 'host:1', role: 'claude-development', attempt: 2, branch: 'codex/b', worktree: 'C:/w', pullRequestNumber: 264, now: new Date('2026-07-13T08:00:00Z') });
  assert.equal(result.won, true);
  const posted = github.state.comments.at(-1).body;
  const parsed = parseProtocolComment(posted, claimSchema);
  assert.equal(parsed.message_type, 'work.claim');
  assert.equal(parsed.correlation_id, 'issue-263-attempt-2');
  assert.equal(parsed.producer_role, 'claude-development');
});

test('refreshGitHubClaim edits the same comment and extends the lease', async () => {
  const github = githubFake();
  const acquired = await acquireGitHubClaim({ github, config, schema: claimSchema, issue: { number: 263 }, workerId: 'host:1', role: 'claude-development', attempt: 2, now: new Date('2026-07-13T08:00:00Z') });
  const refreshed = await refreshGitHubClaim({ github, config, schema: claimSchema, claim: acquired.claim, now: new Date('2026-07-13T08:04:00Z') });
  assert.equal(github.state.edits[0], acquired.claim.comment_id);
  assert.equal(Date.parse(refreshed.expires_at), Date.parse('2026-07-13T08:04:00Z') + config.leaseDurationMs);
  assert.equal(typeof refreshed.refreshed_at, 'string');
});

test('releaseGitHubClaim publishes a schema-valid work.claim_released message', async () => {
  const github = githubFake();
  const acquired = await acquireGitHubClaim({ github, config, schema: claimSchema, issue: { number: 263 }, workerId: 'host:1', role: 'claude-development', attempt: 2, now: new Date('2026-07-13T08:00:00Z') });
  await releaseGitHubClaim({ github, config, schema: claimSchema, claim: acquired.claim, reason: 'worker-failure', now: new Date('2026-07-13T08:05:00Z') });
  const released = parseProtocolComment(github.state.comments.at(-1).body, claimSchema);
  assert.equal(released.message_type, 'work.claim_released');
  assert.equal(released.lease_id, acquired.claim.lease_id);
  assert.equal(released.release_reason, 'worker-failure');
});

test('a released claim no longer competes in acquire arbitration', async () => {
  const github = githubFake();
  const first = await acquireGitHubClaim({ github, config, schema: claimSchema, issue: { number: 263 }, workerId: 'host:1', role: 'claude-development', attempt: 2, now: new Date('2026-07-13T08:00:00Z') });
  await releaseGitHubClaim({ github, schema: claimSchema, claim: first.claim, reason: 'development-handoff-published: dev-263-2-handoff-abc', now: new Date('2026-07-13T08:01:00Z') });
  const second = await acquireGitHubClaim({ github, config, schema: claimSchema, issue: { number: 263 }, workerId: 'host:2', role: 'claude-development', attempt: 2, now: new Date('2026-07-13T08:02:00Z') });
  assert.equal(second.won, true, 'a released but unexpired claim must not defeat the next live claim');
});

test('recoverActiveClaim ignores my claim once a matching release exists', async () => {
  const github = githubFake();
  const acquired = await acquireGitHubClaim({ github, config, schema: claimSchema, issue: { number: 263 }, workerId: 'host:1', role: 'claude-development', attempt: 2, now: new Date('2026-07-13T08:00:00Z') });
  await releaseGitHubClaim({ github, schema: claimSchema, claim: acquired.claim, reason: 'development-handoff-published: dev-263-2-handoff-abc', now: new Date('2026-07-13T08:01:00Z') });
  const active = recoverActiveClaim({ comments: github.state.comments, schema: claimSchema, issueNumber: 263, workerId: 'host:1', now: new Date('2026-07-13T08:02:00Z') });
  assert.equal(active, null, 'a released claim must never be recovered as active work');
});

test('recoverActiveClaim returns my unexpired claim and null when expired', () => {
  const mine = { schema_version: 1, message_type: 'work.claim', message_id: 'claim-263-2-abc', correlation_id: 'issue-263-attempt-2', producer_role: 'claude-development', repository: 'l2v-hub/ClinicOS', issue_number: 263, attempt: 2, worker_id: 'host:1', lease_id: 'x', created_at: '2026-07-13T08:00:00Z', expires_at: '2026-07-13T09:00:00Z' };
  const comments = [{ id: 5, created_at: '2026-07-13T08:00:00Z', body: `${MARKER}\n${JSON.stringify(mine)}` }];
  const active = recoverActiveClaim({ comments, schema: claimSchema, issueNumber: 263, workerId: 'host:1', now: new Date('2026-07-13T08:30:00Z') });
  assert.equal(active.comment_id, 5);
  assert.equal(recoverActiveClaim({ comments, schema: claimSchema, issueNumber: 263, workerId: 'host:1', now: new Date('2026-07-13T10:00:00Z') }), null);
});
