import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { reconciliationOutcome } from '../../src/core/reconciler.mjs';
import { run as runOnce } from '../../src/commands/once.mjs';
import { loadConfig } from '../../src/core/config.mjs';

// QA-263-013 / AC11: agent-team:once returned ok:true and process exit 0 while
// development.errors contained the worker failure. A reconciliation pass with worker
// errors must be reported unambiguously as a failure (cli.mjs maps ok:false to exit 1).

const repoRoot = path.resolve('.');
const config = await loadConfig({ repoRoot, env: {} });
const MARKER = '<!-- clinic-os-agent-team:v1 -->';
const S1 = '1'.repeat(40);

const identity = (attempt, kind) => ({ schema_version: 1, message_id: `m-${attempt}-${kind}`, correlation_id: `issue-263-attempt-${attempt}`, repository: 'l2v-hub/ClinicOS', issue_number: 263, pull_request_number: 264, attempt, created_at: `2026-07-12T1${attempt}:00:00Z`, state_before: 'x', state_after: 'y' });
const handoffMsg = (attempt, sha) => ({ ...identity(attempt, 'handoff'), message_type: 'development_handoff', producer_role: 'claude-development', subject_sha: sha, acceptance_criteria: [], resolved_findings: [], commands: [], artifact_refs: [], next_actions: ['ready-for-qa'] });
const qaFailedMsg = (attempt, sha) => ({ ...identity(attempt, 'qa'), message_type: 'qa_result', producer_role: 'codex-qa', subject_sha: sha, decision: 'qa-failed', acceptance_criteria: [], findings: [{ finding_id: 'QA-263-013', acceptance_criterion_id: 'AC11', severity: 'high', category: 'recovery-worktree', observed: 'once hides worker failures', expected: 'once reports failure', reproduction_command_ref: 'npm run agent-team:once', evidence_refs: ['once.mjs'], status: 'open', remediation_required: true, fingerprint: 'e'.repeat(64) }], commands: [], artifact_refs: [], next_actions: ['ready-for-dev', 'assigned-to-claude'] });

function githubFake(initialComments) {
  const state = {
    labels: new Set(['ready-for-dev', 'assigned-to-claude', 'qa-failed', 'feature']),
    comments: initialComments.map((value, index) => ({ id: index + 1, created_at: value.created_at, body: `${MARKER}\n${JSON.stringify(value)}` })),
    nextId: 100
  };
  const issue = () => ({ number: 263, title: 'Agent Team', body: 'contract', labels: [...state.labels].map((name) => ({ name })), comments: state.comments, url: 'https://github.com/l2v-hub/ClinicOS/issues/263' });
  return {
    state,
    async listIssuesByLabels(labels) { return labels.every((label) => state.labels.has(label)) ? [issue()] : []; },
    async viewIssue() { return issue(); },
    async viewPullRequest(number) { return { number, isDraft: true, headRefName: 'codex/agent-team-architecture', headRefOid: S1, baseRefName: 'main', state: 'OPEN', url: 'x' }; },
    async addLabels(_n, labels) { for (const label of labels) state.labels.add(label); },
    async removeLabels(_n, labels) { for (const label of labels) state.labels.delete(label); },
    async addIssueComment(_n, body) { const id = state.nextId++; state.comments.push({ id, created_at: new Date().toISOString(), body }); return { id }; },
    async editIssueComment(id, body) { const found = state.comments.find((c) => c.id === id); found.body = body; return { id }; },
    async listIssueComments() { return state.comments; },
    async addPullRequestComment() {}
  };
}

test('reconciliationOutcome marks a pass with worker errors as failed even when doctor is ready', () => {
  const readyDoctor = { developmentReady: true, qaReady: true };
  assert.equal(reconciliationOutcome({ doctor: readyDoctor, development: { errors: [], processed: [] }, qa: { errors: [], processed: [] } }).ok, true);
  assert.equal(reconciliationOutcome({ doctor: readyDoctor, development: { errors: [{ number: 263, error: 'spawn failed' }], processed: [263] }, qa: { errors: [], processed: [] } }).ok, false, 'a development worker failure must fail the pass');
  assert.equal(reconciliationOutcome({ doctor: readyDoctor, development: { errors: [], processed: [] }, qa: { errors: [{ number: 263, error: 'qa crashed' }], processed: [263] } }).ok, false, 'a qa worker failure must fail the pass');
  assert.equal(reconciliationOutcome({ doctor: { developmentReady: false, qaReady: false }, development: { errors: [], processed: [] }, qa: { errors: [], processed: [] } }).ok, false, 'a doctor-hard-failed pass stays failed');
});

test('once returns ok:false when the development worker fails, so the CLI exits non-zero (QA-263-013)', async () => {
  const github = githubFake([handoffMsg(1, S1), qaFailedMsg(1, S1)]);
  const run = async (call) => {
    if (call.command === 'claude') return { ok: false, code: null, stdout: '', stderr: '', error: 'working directory does not exist: agent-team/.worktrees/issue-263' };
    throw new Error(`unexpected process invocation: ${call.command}`);
  };
  const git = { async prepareIssueWorktree({ prior }) { return { path: prior.worktree_path, branch: prior.branch, pullRequestNumber: prior.pull_request_number }; }, async headSha() { return S1; } };
  const result = await runOnce({
    config, repoRoot, allowCurrentSupervisor: true,
    overrides: { run, github, git, workerId: 'host:test', doctor: async () => ({ ok: true, developmentReady: true, qaReady: false, checks: [] }) }
  });
  assert.equal(result.development.errors.length, 1, 'the worker failure must surface in development.errors');
  assert.match(result.development.errors[0].error, /working directory does not exist/);
  assert.equal(result.ok, false, 'once must report the failed pass unambiguously (ok:false -> exit 1)');
});
