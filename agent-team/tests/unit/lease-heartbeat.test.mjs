import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import * as locks from '../../src/core/locks.mjs';
import { runClaudeDevelopment } from '../../src/workers/claude-development-worker.mjs';
import { createRuntime } from '../../src/runtime.mjs';
import { reconcileOnce } from '../../src/core/reconciler.mjs';
import { loadConfig } from '../../src/core/config.mjs';

// QA-263-015 / AC4: attempt 8's GitHub lease expired while the Claude process was still
// running because nothing refreshed the claim during execution, and losing the lease did not
// stop the owned process. These tests pin the repaired contract: a lease heartbeat refreshes
// the claim while the worker runs, a failed refresh aborts the owned process through its
// signal, and the issue returns to the deterministic claimable state.

test('startLeaseHeartbeat refreshes the lease on the configured interval and stop() halts it (QA-263-015)', async () => {
  assert.equal(
    typeof locks.startLeaseHeartbeat,
    'function',
    'locks must expose startLeaseHeartbeat',
  );
  let refreshes = 0;
  const heartbeat = locks.startLeaseHeartbeat({
    refresh: async () => {
      refreshes += 1;
    },
    intervalMs: 20,
  });
  await delay(110);
  heartbeat.stop();
  const seen = refreshes;
  assert.ok(seen >= 2, `the lease must be refreshed repeatedly while the worker runs, got ${seen}`);
  await delay(60);
  assert.equal(refreshes, seen, 'no refresh may fire after stop()');
  assert.equal(heartbeat.signal.aborted, false, 'a healthy heartbeat never aborts');
});

test('startLeaseHeartbeat aborts its signal when the lease refresh fails (QA-263-015)', async () => {
  const heartbeat = locks.startLeaseHeartbeat({
    refresh: async () => {
      throw new Error('comment not found');
    },
    intervalMs: 15,
  });
  try {
    for (let waited = 0; waited < 2000 && !heartbeat.signal.aborted; waited += 20) await delay(20);
    assert.equal(
      heartbeat.signal.aborted,
      true,
      'a failed refresh means the lease is lost and the signal must abort',
    );
    assert.match(
      String(heartbeat.signal.reason?.message ?? heartbeat.signal.reason),
      /lease/i,
      'the abort reason must name the lost lease',
    );
  } finally {
    heartbeat.stop();
  }
});

const workerConfig = {
  repository: 'l2v-hub/ClinicOS',
  baseBranch: 'origin/main',
  commandTimeoutMs: 1000,
  developmentTimeoutMs: 5400000,
  tools: ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash'],
  allowedTools: ['Read', 'Edit', 'Bash(git *)'],
  disallowedTools: [
    'Task',
    'Agent',
    'Bash(claude)',
    'Bash(claude *)',
    'Bash(claude.exe)',
    'Bash(claude.exe *)',
    'Bash(npx claude)',
    'Bash(npx claude *)',
    'Bash(npx @anthropic-ai/claude-code)',
    'Bash(npx @anthropic-ai/claude-code *)',
  ],
  maxOutputBytes: 10000,
  labels: { working: 'agent-working', readyForQa: 'ready-for-qa' },
};

test('the Claude worker refreshes its lease while the process runs and hands the heartbeat signal to the runner (QA-263-015)', async () => {
  let refreshes = 0;
  const calls = [];
  const handoff = {
    schema_version: 1,
    message_type: 'development_handoff',
    issue_number: 263,
    pull_request_number: 300,
    attempt: 2,
    subject_sha: 'a'.repeat(40),
    acceptance_criteria: [],
    resolved_findings: [],
    commands: [],
    artifact_refs: [],
    next_actions: ['ready-for-qa'],
  };
  const run = async (call) => {
    calls.push(call);
    await delay(120);
    return {
      ok: true,
      code: 0,
      stdout: JSON.stringify({ structured_output: handoff }),
      stderr: '',
      error: null,
    };
  };
  const git = {
    prepareIssueWorktree: async () => ({
      path: 'C:/tmp/issue-263',
      branch: 'codex/issue-263-agent-team',
      pullRequestNumber: 300,
    }),
    headSha: async () => 'a'.repeat(40),
  };
  const github = {
    addIssueComment: async () => ({ id: 1 }),
    addPullRequestComment: async () => {},
    addLabels: async () => {},
    removeLabels: async () => {},
  };
  await runClaudeDevelopment({
    issue: { number: 263, title: 'Agent Team', body: 'contract' },
    attempt: 2,
    config: workerConfig,
    github,
    git,
    run,
    schema: { type: 'object' },
    priorQaResult: null,
    lease: {
      refresh: async () => {
        refreshes += 1;
      },
      intervalMs: 20,
    },
  });
  assert.ok(
    refreshes >= 2,
    `the lease must be refreshed during Claude execution, got ${refreshes} refreshes`,
  );
  assert.ok(
    calls[0].signal instanceof AbortSignal,
    'the runner must receive the heartbeat abort signal so a lost lease can kill the owned process tree',
  );
});

// --- runtime-level: a lost lease stops the worker and restores the deterministic state ---

const repoRoot = path.resolve('.');
const baseConfig = await loadConfig({ repoRoot, env: {} });
const MARKER = '<!-- clinic-os-agent-team:v1 -->';
const S1 = '1'.repeat(40);
const S2 = '2'.repeat(40);

const identity = (attempt, kind) => ({
  schema_version: 1,
  message_id: `m-${attempt}-${kind}`,
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
  ...identity(attempt, 'handoff'),
  message_type: 'development_handoff',
  producer_role: 'claude-development',
  subject_sha: sha,
  acceptance_criteria: [],
  resolved_findings: [],
  commands: [],
  artifact_refs: [],
  next_actions: ['ready-for-qa'],
});
const qaFailedMsg = (attempt, sha) => ({
  ...identity(attempt, 'qa'),
  message_type: 'qa_result',
  producer_role: 'codex-qa',
  subject_sha: sha,
  decision: 'qa-failed',
  acceptance_criteria: [],
  findings: [
    {
      finding_id: 'QA-263-015',
      acceptance_criterion_id: 'AC4',
      severity: 'critical',
      category: 'claim-worktree-process-ownership',
      observed: 'lease expired without refresh',
      expected: 'refresh during execution',
      reproduction_command_ref: 'npm run agent-team:status',
      evidence_refs: ['locks.mjs'],
      status: 'open',
      remediation_required: true,
      fingerprint: 'e'.repeat(64),
    },
  ],
  commands: [],
  artifact_refs: [],
  next_actions: ['ready-for-dev', 'assigned-to-claude'],
});

test('a lease lost during Claude execution aborts the owned process and restores the claimable state (QA-263-015)', async () => {
  const config = { ...baseConfig, leaseRefreshMs: 25 };
  const state = {
    labels: new Set(['ready-for-dev', 'assigned-to-claude', 'qa-failed', 'feature']),
    comments: [handoffMsg(1, S1), qaFailedMsg(1, S1)].map((value, index) => ({
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
  const github = {
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
    // The claim comment can no longer be edited: the lease is lost.
    async editIssueComment() {
      throw new Error('comment not found: the claim was superseded');
    },
    async listIssueComments() {
      return state.comments;
    },
    async addPullRequestComment() {},
  };
  const run = async (call) => {
    if (call.command !== 'claude')
      throw new Error(`unexpected process invocation: ${call.command}`);
    // A cooperative fake runner: it only stops early when the heartbeat signal aborts.
    // Without the heartbeat the run "succeeds" after a delay, which must NOT happen once
    // the lease is gone — that is exactly the attempt-8 defect.
    return new Promise((resolve) => {
      const timer = setTimeout(
        () =>
          resolve({
            ok: true,
            code: 0,
            stdout: JSON.stringify({
              structured_output: { ...handoffMsg(2, S2), resolved_findings: ['QA-263-015'] },
            }),
            stderr: '',
            error: null,
          }),
        400,
      );
      call.signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          resolve({
            ok: false,
            code: null,
            stdout: '',
            stderr: '',
            error: `aborted: ${call.signal.reason?.message ?? 'lease lost'}`,
          });
        },
        { once: true },
      );
    });
  };
  const git = {
    async resolveIssueWorktree({ prior }) {
      return {
        path: prior?.worktree_path ?? 'C:/tmp/issue-263',
        branch: prior?.branch ?? 'codex/agent-team-architecture',
        pullRequestNumber: 264,
      };
    },
    async prepareIssueWorktree({ prior }) {
      return {
        path: prior?.worktree_path ?? 'C:/tmp/issue-263',
        branch: prior?.branch ?? 'codex/agent-team-architecture',
        pullRequestNumber: 264,
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
  assert.equal(
    result.development.errors.length,
    1,
    'losing the lease mid-run must surface as a worker failure',
  );
  assert.match(
    result.development.errors[0].error,
    /abort|lease/i,
    'the failure must name the lost lease/abort',
  );
  assert.equal(
    state.labels.has('ready-for-qa'),
    false,
    'a run aborted by a lost lease must never reach ready-for-qa',
  );
  assert.equal(
    state.labels.has('agent-working'),
    false,
    'the aborted run must not stay agent-working',
  );
  assert.equal(
    state.labels.has('ready-for-dev'),
    true,
    'the issue must return to the claimable development state',
  );
  assert.equal(
    state.labels.has('assigned-to-claude'),
    true,
    'the issue must keep its Claude assignment for the next attempt',
  );
});
