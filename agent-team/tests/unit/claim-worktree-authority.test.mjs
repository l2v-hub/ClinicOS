import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createGitAdapter } from '../../src/adapters/git.mjs';
import { createRuntime } from '../../src/runtime.mjs';
import { reconcileOnce } from '../../src/core/reconciler.mjs';
import { parseProtocolComment } from '../../src/core/protocol.mjs';
import { loadConfig } from '../../src/core/config.mjs';
import { readFile } from 'node:fs/promises';

// QA-263-015 / AC4: attempt 8's claim named `agent-team/.worktrees/issue-263` — a path nested
// inside the root worktree and never registered with `git worktree list` — while Claude actually
// mutated the root worktree. Git commands executed from any subdirectory resolve upward to the
// containing worktree, so the existence + branch + origin validation (QA-263-013) passed for a
// directory that is not an authoritative checkout. These tests pin the repaired contract: only a
// registered worktree root is claimable, resolution before the claim is read-only, and the
// published claim names the exact directory the Claude process runs in.

const BRANCH = 'codex/agent-team-architecture';
const ORIGIN = 'https://github.com/l2v-hub/ClinicOS.git';
const adapterConfig = { repository: 'l2v-hub/ClinicOS', baseBranch: 'origin/main', worktreeRoot: 'agent-team/.worktrees', commandTimeoutMs: 1000, maxOutputBytes: 65536 };
const MUTATING = [/^fetch /, /^worktree add/, /^worktree prune/, /^worktree remove/, /^branch /, /^reset/, /^checkout/, /^clean/];

function fakeGitRun(handlers) {
  const calls = [];
  const run = async ({ command, args, cwd }) => {
    assert.equal(command, 'git', 'the git adapter may only invoke git');
    calls.push({ args, cwd });
    const key = args.join(' ');
    for (const [pattern, responder] of handlers) {
      if (pattern.test(key)) return typeof responder === 'function' ? responder({ args, cwd }) : responder;
    }
    return { ok: false, code: 1, stdout: '', stderr: `unhandled git invocation: ${key}`, error: null };
  };
  return { run, calls };
}

const ok = (stdout = '') => ({ ok: true, code: 0, stdout, stderr: '', error: null });
const worktreeList = (entries) => entries.map(({ dir, branch }) => `worktree ${dir}\nHEAD ${'0'.repeat(40)}\nbranch refs/heads/${branch}\n`).join('\n');

test('a nested subdirectory of a registered worktree is never adopted as claim coordinates (QA-263-015)', async () => {
  // The nested directory exists and every git command run from it resolves upward, so the
  // pre-QA-263-015 validation (exists + branch + origin) wrongly accepted it.
  const registeredRoot = await mkdtemp(path.join(tmpdir(), 'agent-team-registered-root-'));
  const nested = path.join(registeredRoot, 'agent-team', '.worktrees', 'issue-263');
  await mkdir(nested, { recursive: true });
  const { run } = fakeGitRun([
    [/^rev-parse --abbrev-ref HEAD$/, ok(BRANCH)],
    [/^remote get-url origin$/, ok(ORIGIN)],
    [/^worktree list --porcelain$/, ok(worktreeList([{ dir: registeredRoot, branch: BRANCH }]))]
  ]);
  const git = createGitAdapter({ run, config: adapterConfig });
  const coordinates = await git.prepareIssueWorktree({ issue: { number: 263, title: 'Agent Team' }, prior: { worktree_path: nested, branch: BRANCH, pull_request_number: 264 } });
  assert.equal(coordinates.path, registeredRoot, 'an unregistered nested path must be repaired to the registered worktree root of the same branch');
});

test('resolveIssueWorktree resolves the authoritative registered checkout without any mutating git command (QA-263-015)', async () => {
  const registeredRoot = await mkdtemp(path.join(tmpdir(), 'agent-team-resolve-root-'));
  const staleRecorded = path.join(tmpdir(), `agent-team-resolve-missing-${Date.now()}`, 'issue-263');
  const { run, calls } = fakeGitRun([
    [/^worktree list --porcelain$/, ok(worktreeList([{ dir: registeredRoot, branch: BRANCH }]))]
  ]);
  const git = createGitAdapter({ run, config: adapterConfig });
  assert.equal(typeof git.resolveIssueWorktree, 'function', 'the git adapter must expose a read-only resolveIssueWorktree');
  const resolved = await git.resolveIssueWorktree({ issue: { number: 263, title: 'Agent Team' }, prior: { worktree_path: staleRecorded, branch: BRANCH, pull_request_number: 264 } });
  assert.equal(resolved.path, registeredRoot, 'resolution must land on the registered checkout of the branch');
  assert.equal(resolved.branch, BRANCH);
  for (const { args } of calls) {
    const key = args.join(' ');
    for (const pattern of MUTATING) assert.equal(pattern.test(key), false, `claim resolution must be read-only, got: git ${key}`);
  }
});

// --- runtime-level: the claim and the Claude process must share the same authoritative cwd ---

const repoRoot = path.resolve('.');
const runtimeConfig = await loadConfig({ repoRoot, env: {} });
const MARKER = '<!-- clinic-os-agent-team:v1 -->';
const S1 = '1'.repeat(40);
const S2 = '2'.repeat(40);
const claimSchema = JSON.parse(await readFile(path.resolve('agent-team/protocol/schemas/claim.schema.json'), 'utf8'));

const identity = (attempt, kind) => ({ schema_version: 1, message_id: `m-${attempt}-${kind}`, correlation_id: `issue-263-attempt-${attempt}`, repository: 'l2v-hub/ClinicOS', issue_number: 263, pull_request_number: 264, attempt, created_at: `2026-07-12T1${attempt}:00:00Z`, state_before: 'x', state_after: 'y' });
const handoffMsg = (attempt, sha) => ({ ...identity(attempt, 'handoff'), message_type: 'development_handoff', producer_role: 'claude-development', subject_sha: sha, acceptance_criteria: [], resolved_findings: [], commands: [], artifact_refs: [], next_actions: ['ready-for-qa'] });
const qaFailedMsg = (attempt, sha) => ({ ...identity(attempt, 'qa'), message_type: 'qa_result', producer_role: 'codex-qa', subject_sha: sha, decision: 'qa-failed', acceptance_criteria: [], findings: [{ finding_id: 'QA-263-015', acceptance_criterion_id: 'AC4', severity: 'critical', category: 'claim-worktree-process-ownership', observed: 'claim named a non-authoritative nested path', expected: 'claim cwd equals a registered worktree', reproduction_command_ref: 'git worktree list --porcelain', evidence_refs: ['runtime.mjs'], status: 'open', remediation_required: true, fingerprint: 'f'.repeat(64) }], commands: [], artifact_refs: [], next_actions: ['ready-for-dev', 'assigned-to-claude'] });

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
    async viewPullRequest(number) { return { number, isDraft: true, headRefName: BRANCH, headRefOid: S1, baseRefName: 'main', state: 'OPEN', url: 'x' }; },
    async addLabels(_n, labels) { for (const label of labels) state.labels.add(label); },
    async removeLabels(_n, labels) { for (const label of labels) state.labels.delete(label); },
    async addIssueComment(_n, body) { const id = state.nextId++; state.comments.push({ id, created_at: new Date().toISOString(), body }); return { id }; },
    async editIssueComment(id, body) { const found = state.comments.find((c) => c.id === id); found.body = body; return { id }; },
    async listIssueComments() { return state.comments; },
    async addPullRequestComment() {}
  };
}

test('the published claim names the exact authoritative worktree the Claude process runs in (QA-263-015)', async () => {
  // The prior handoff recorded the fabricated nested default; the authoritative registered
  // checkout of the branch lives elsewhere. The claim must name the authoritative path.
  const authoritative = path.join(tmpdir(), 'agent-team-authority', 'clinicos-issue-263');
  const github = githubFake([handoffMsg(1, S1), qaFailedMsg(1, S1)]);
  const claudeCalls = [];
  const run = async (call) => {
    if (call.command === 'claude') {
      claudeCalls.push(call);
      const handoff = { ...handoffMsg(2, S2), resolved_findings: ['QA-263-015'] };
      return { ok: true, code: 0, stdout: JSON.stringify({ structured_output: handoff }), stderr: '', error: null };
    }
    throw new Error(`unexpected process invocation: ${call.command}`);
  };
  const git = {
    async resolveIssueWorktree() { return { path: authoritative, branch: BRANCH, pullRequestNumber: 264 }; },
    async prepareIssueWorktree() { return { path: authoritative, branch: BRANCH, pullRequestNumber: 264 }; },
    async headSha() { return S2; }
  };
  const runtime = await createRuntime({ config: runtimeConfig, repoRoot, overrides: { run, github, git, workerId: 'host:test', doctor: async () => ({ ok: false, developmentReady: true, qaReady: false, checks: [] }) } });

  const result = await reconcileOnce(runtime);
  assert.deepEqual(result.development.errors, []);

  const claims = github.state.comments.map((c) => { try { return parseProtocolComment(c.body, claimSchema); } catch { return null; } }).filter((v) => v?.message_type === 'work.claim');
  assert.equal(claims.length, 1);
  assert.equal(claims[0].worktree, authoritative, 'the claim must name the authoritative registered worktree, not the recorded nested default');
  assert.equal(claudeCalls.length, 1);
  assert.equal(claudeCalls[0].cwd, authoritative, 'the Claude process must run in the claimed worktree');
  assert.equal(claims[0].worktree, claudeCalls[0].cwd, 'claim coordinates and process cwd must be identical');
});

test('a prepared worktree that differs from the claimed coordinates fails closed and restores the claimable state (QA-263-015)', async () => {
  const claimed = path.join(tmpdir(), 'agent-team-authority', 'clinicos-issue-263');
  const elsewhere = path.join(tmpdir(), 'agent-team-authority', 'unexpected-issue-263');
  const github = githubFake([handoffMsg(1, S1), qaFailedMsg(1, S1)]);
  const run = async (call) => { throw new Error(`no process may run when coordinates diverge, got: ${call.command}`); };
  const git = {
    async resolveIssueWorktree() { return { path: claimed, branch: BRANCH, pullRequestNumber: 264 }; },
    async prepareIssueWorktree() { return { path: elsewhere, branch: BRANCH, pullRequestNumber: 264 }; },
    async headSha() { return S2; }
  };
  const runtime = await createRuntime({ config: runtimeConfig, repoRoot, overrides: { run, github, git, workerId: 'host:test', doctor: async () => ({ ok: false, developmentReady: true, qaReady: false, checks: [] }) } });

  const result = await reconcileOnce(runtime);
  assert.equal(result.development.errors.length, 1, 'diverging coordinates must surface as a worker failure');
  assert.match(result.development.errors[0].error, /worktree|coordinates/i);

  const released = github.state.comments.map((c) => { try { return parseProtocolComment(c.body, claimSchema); } catch { return null; } }).filter((v) => v?.message_type === 'work.claim_released');
  assert.equal(released.length, 1, 'the divergence must release the claim');
  assert.equal(github.state.labels.has('agent-working'), false);
  assert.equal(github.state.labels.has('ready-for-dev'), true);
  assert.equal(github.state.labels.has('assigned-to-claude'), true);
});
