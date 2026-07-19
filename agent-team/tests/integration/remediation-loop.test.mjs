import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRuntime } from '../../src/runtime.mjs';
import { reconcileOnce } from '../../src/core/reconciler.mjs';
import { parseProtocolComment } from '../../src/core/protocol.mjs';
import { loadConfig } from '../../src/core/config.mjs';
import { buildStatusProjection } from '../../src/core/status-projection.mjs';

const repoRoot = path.resolve('.');
const config = await loadConfig({ repoRoot, env: {} });
const MARKER = '<!-- clinic-os-agent-team:v1 -->';
const S1 = '1'.repeat(40);
const S2 = '2'.repeat(40);
const claimSchema = JSON.parse(
  await readFile(path.resolve('agent-team/protocol/schemas/claim.schema.json'), 'utf8'),
);
const blockedSchema = JSON.parse(
  await readFile(path.resolve('agent-team/protocol/schemas/worker-blocked.schema.json'), 'utf8'),
);

const identity = (attempt, extra = {}) => ({
  schema_version: 1,
  message_id: `m-${attempt}-${extra.kind}`,
  correlation_id: `issue-263-attempt-${attempt}`,
  repository: 'l2v-hub/ClinicOS',
  issue_number: 263,
  pull_request_number: 264,
  attempt,
  created_at: `2026-07-12T1${attempt}:00:00Z`,
  state_before: 'x',
  state_after: 'y',
});
const handoffMsg = (attempt, sha) => ({
  ...identity(attempt, { kind: 'handoff' }),
  message_type: 'development_handoff',
  producer_role: 'claude-development',
  subject_sha: sha,
  acceptance_criteria: [],
  resolved_findings: [],
  commands: [],
  artifact_refs: [],
  next_actions: ['ready-for-qa'],
});
const qaFailedMsg = (attempt, sha, fingerprint) => ({
  ...identity(attempt, { kind: 'qa' }),
  message_type: 'qa_result',
  producer_role: 'codex-qa',
  subject_sha: sha,
  decision: 'qa-failed',
  acceptance_criteria: [],
  findings: [
    {
      finding_id: 'QA-263-001',
      acceptance_criterion_id: 'AC8',
      severity: 'critical',
      category: 'remediation-loop',
      observed: 'findings never reach Claude',
      expected: 'findings reach Claude',
      reproduction_command_ref: 'rg',
      evidence_refs: ['runtime.mjs'],
      status: 'open',
      remediation_required: true,
      fingerprint,
    },
  ],
  commands: [],
  artifact_refs: [],
  next_actions: ['ready-for-dev', 'assigned-to-claude'],
});

function githubFake(initialComments) {
  const state = {
    labels: new Set(['ready-for-dev', 'assigned-to-claude', 'qa-failed', 'feature']),
    comments: initialComments.map((value, index) => ({
      id: index + 1,
      created_at: value.created_at,
      body: `${MARKER}\n${JSON.stringify(value)}`,
    })),
    nextId: 100,
  };
  const issue = () => ({
    number: 263,
    title: 'Agent Team',
    body: 'contract',
    labels: [...state.labels].map((name) => ({ name })),
    comments: state.comments,
    url: 'https://github.com/l2v-hub/ClinicOS/issues/263',
  });
  return {
    state,
    async listIssuesByLabels(labels) {
      return labels.every((label) => state.labels.has(label)) ? [issue()] : [];
    },
    async viewIssue() {
      return issue();
    },
    async viewPullRequest(number) {
      return {
        number,
        isDraft: true,
        headRefName: 'codex/agent-team-architecture',
        headRefOid: S1,
        baseRefName: 'main',
        state: 'OPEN',
        url: 'x',
      };
    },
    async addLabels(_n, labels) {
      for (const label of labels) state.labels.add(label);
    },
    async removeLabels(_n, labels) {
      for (const label of labels) state.labels.delete(label);
    },
    async addIssueComment(_n, body) {
      const id = state.nextId++;
      state.comments.push({ id, created_at: new Date().toISOString(), body });
      return { id };
    },
    async editIssueComment(id, body) {
      const found = state.comments.find((c) => c.id === id);
      found.body = body;
      return { id };
    },
    async listIssueComments() {
      return state.comments;
    },
    async addPullRequestComment() {},
  };
}

test('qa-failed loops back to Claude on the same branch, worktree, and PR, then returns to ready-for-qa', async () => {
  const github = githubFake([handoffMsg(1, S1), qaFailedMsg(1, S1, 'a'.repeat(64))]);
  const claudeCalls = [];
  const prepareCalls = [];
  const run = async (call) => {
    if (call.command === 'claude') {
      claudeCalls.push(call);
      const handoff = { ...handoffMsg(2, S2), resolved_findings: ['QA-263-001'] };
      return {
        ok: true,
        code: 0,
        stdout: JSON.stringify({ structured_output: handoff }),
        stderr: '',
        error: null,
      };
    }
    throw new Error(`unexpected process invocation: ${call.command}`);
  };
  const git = {
    async resolveIssueWorktree({ prior }) {
      return {
        path: prior.worktree_path,
        branch: prior.branch,
        pullRequestNumber: prior.pull_request_number,
      };
    },
    async prepareIssueWorktree({ issue, prior }) {
      prepareCalls.push(prior);
      return {
        path: prior.worktree_path,
        branch: prior.branch,
        pullRequestNumber: prior.pull_request_number,
      };
    },
    async headSha() {
      return S2;
    },
  };
  const runtime = await createRuntime({
    config,
    repoRoot,
    overrides: {
      run,
      github,
      git,
      workerId: 'host:test',
      doctor: async () => ({ ok: false, developmentReady: true, qaReady: false, checks: [] }),
    },
  });
  assert.equal(runtime.github, github, 'runtime must honor injected adapters');

  const result = await reconcileOnce(runtime);
  assert.deepEqual(result.development.processed, [263]);

  assert.equal(claudeCalls.length, 1);
  assert.match(claudeCalls[0].input, /QA-263-001/);
  assert.equal(prepareCalls[0].pull_request_number, 264);
  assert.equal(prepareCalls[0].branch, 'codex/agent-team-architecture');
  assert.equal(prepareCalls[0].worktree_path, path.join(config.worktreeRoot, 'issue-263'));

  const claims = github.state.comments
    .map((c) => {
      try {
        return parseProtocolComment(c.body, claimSchema);
      } catch {
        return null;
      }
    })
    .filter((v) => v?.message_type === 'work.claim');
  assert.equal(claims.length, 1);
  assert.equal(claims[0].attempt, 2);
  assert.equal(claims[0].pull_request_number, 264);

  assert.equal(github.state.labels.has('ready-for-qa'), true);
  assert.equal(github.state.labels.has('agent-working'), false);
  assert.equal(github.state.labels.has('ready-for-dev'), false);
  assert.equal(github.state.labels.has('qa-failed'), false);
});

test('three equivalent qa-failed results block the issue with a structured reason and no Claude launch', async () => {
  const fp = 'b'.repeat(64);
  const github = githubFake([
    handoffMsg(1, S1),
    qaFailedMsg(1, S1, fp),
    qaFailedMsg(2, S1, fp),
    qaFailedMsg(3, S1, fp),
  ]);
  const run = async (call) => {
    throw new Error(`no process may run, got: ${call.command}`);
  };
  const git = {
    async prepareIssueWorktree() {
      throw new Error('worktree must not be prepared');
    },
    async headSha() {
      return S1;
    },
  };
  const runtime = await createRuntime({
    config,
    repoRoot,
    overrides: {
      run,
      github,
      git,
      workerId: 'host:test',
      doctor: async () => ({ ok: false, developmentReady: true, qaReady: false, checks: [] }),
    },
  });

  const result = await reconcileOnce(runtime);
  assert.deepEqual(result.development.processed, [263]);

  assert.equal(github.state.labels.has('blocked'), true);
  assert.equal(github.state.labels.has('ready-for-dev'), false);
  assert.equal(github.state.labels.has('assigned-to-claude'), false);

  const blockedMessages = github.state.comments
    .map((c) => {
      try {
        return parseProtocolComment(c.body, blockedSchema);
      } catch {
        return null;
      }
    })
    .filter((v) => v?.message_type === 'worker.blocked');
  assert.equal(blockedMessages.length, 1);
  assert.match(blockedMessages[0].reason, /no-progress/);
  assert.equal(blockedMessages[0].qa_history.length, 3);
});

test('a successful development handoff releases its claim after publishing and leaves ready-for-qa with no active claim', async () => {
  const github = githubFake([handoffMsg(1, S1), qaFailedMsg(1, S1, 'd'.repeat(64))]);
  const run = async (call) => {
    if (call.command === 'claude') {
      const handoff = { ...handoffMsg(2, S2), resolved_findings: ['QA-263-001'] };
      return {
        ok: true,
        code: 0,
        stdout: JSON.stringify({ structured_output: handoff }),
        stderr: '',
        error: null,
      };
    }
    throw new Error(`unexpected process invocation: ${call.command}`);
  };
  const git = {
    async resolveIssueWorktree({ prior }) {
      return {
        path: prior.worktree_path,
        branch: prior.branch,
        pullRequestNumber: prior.pull_request_number,
      };
    },
    async prepareIssueWorktree({ prior }) {
      return {
        path: prior.worktree_path,
        branch: prior.branch,
        pullRequestNumber: prior.pull_request_number,
      };
    },
    async headSha() {
      return S2;
    },
  };
  const runtime = await createRuntime({
    config,
    repoRoot,
    overrides: {
      run,
      github,
      git,
      workerId: 'host:test',
      doctor: async () => ({ ok: false, developmentReady: true, qaReady: false, checks: [] }),
    },
  });

  const result = await reconcileOnce(runtime);
  assert.deepEqual(result.development.errors, []);
  assert.deepEqual(result.development.processed, [263]);

  const protocol = github.state.comments
    .map((c) => {
      try {
        return { value: parseProtocolComment(c.body, claimSchema), id: c.id };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const claims = protocol.filter((entry) => entry.value.message_type === 'work.claim');
  const released = protocol.filter((entry) => entry.value.message_type === 'work.claim_released');
  assert.equal(claims.length, 1);
  assert.equal(
    released.length,
    1,
    'a successful development run must publish a schema-valid claim release',
  );
  assert.equal(
    released[0].value.lease_id,
    claims[0].value.lease_id,
    'the release must name the same lease as the claim',
  );
  assert.match(released[0].value.release_reason, /development-handoff-published/);

  const handoffComment = github.state.comments.find(
    (c) => c.body.includes('"development_handoff"') && c.body.includes('"attempt":2'),
  );
  assert.ok(handoffComment, 'the attempt-2 handoff comment must exist');
  assert.ok(
    handoffComment.id < released[0].id,
    'the handoff must be preserved before the claim release',
  );

  assert.equal(github.state.labels.has('ready-for-qa'), true);
  const projection = buildStatusProjection({
    local: { supervisor_running: false, heartbeat_age_ms: null, pid: null },
    items: [{ issue: await github.viewIssue(), pullRequest: await github.viewPullRequest(264) }],
    config,
  });
  assert.equal(
    projection.issues[0].active_claim,
    null,
    'ready-for-qa must have no active development claim',
  );
});

test('a failing Claude worker releases the claim with a schema-valid work.claim_released message', async () => {
  const github = githubFake([handoffMsg(1, S1), qaFailedMsg(1, S1, 'c'.repeat(64))]);
  const run = async (call) => {
    if (call.command === 'claude')
      return { ok: false, code: 1, stdout: '', stderr: 'claude exploded', error: null };
    throw new Error(`unexpected process invocation: ${call.command}`);
  };
  const git = {
    async resolveIssueWorktree({ prior }) {
      return {
        path: prior.worktree_path,
        branch: prior.branch,
        pullRequestNumber: prior.pull_request_number,
      };
    },
    async prepareIssueWorktree({ prior }) {
      return {
        path: prior.worktree_path,
        branch: prior.branch,
        pullRequestNumber: prior.pull_request_number,
      };
    },
    async headSha() {
      return S2;
    },
  };
  const runtime = await createRuntime({
    config,
    repoRoot,
    overrides: {
      run,
      github,
      git,
      workerId: 'host:test',
      doctor: async () => ({ ok: false, developmentReady: true, qaReady: false, checks: [] }),
    },
  });

  const result = await reconcileOnce(runtime);
  assert.equal(result.development.errors.length, 1);
  assert.match(result.development.errors[0].error, /claude exploded/);

  const released = github.state.comments
    .map((c) => {
      try {
        return parseProtocolComment(c.body, claimSchema);
      } catch {
        return null;
      }
    })
    .filter((v) => v?.message_type === 'work.claim_released');
  assert.equal(released.length, 1);
  assert.match(released[0].release_reason, /worker-failure/);

  // QA-263-013: after a worker failure the issue must return to the configured claimable
  // development state instead of remaining agent-working with no active claim.
  assert.equal(
    github.state.labels.has('agent-working'),
    false,
    'worker failure must not leave the issue agent-working',
  );
  assert.equal(
    github.state.labels.has('ready-for-dev'),
    true,
    'worker failure must restore ready-for-dev',
  );
  assert.equal(
    github.state.labels.has('assigned-to-claude'),
    true,
    'worker failure must restore assigned-to-claude',
  );
});
