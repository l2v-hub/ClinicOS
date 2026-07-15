import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createGitAdapter } from '../../src/adapters/git.mjs';

// QA-263-013 / AC11: recovered worktree coordinates must be validated for existence and
// expected branch/repository before any spawn. Stale coordinates are safely reused (an
// existing checkout of the same branch) or recreated — never adopted blindly, and never
// repaired with destructive git commands.

const BRANCH = 'codex/agent-team-architecture';
const ORIGIN = 'https://github.com/l2v-hub/ClinicOS.git';
const config = { repository: 'l2v-hub/ClinicOS', baseBranch: 'origin/main', worktreeRoot: 'agent-team/.worktrees', commandTimeoutMs: 1000, maxOutputBytes: 65536 };
const DESTRUCTIVE = [/^worktree remove/, /^branch -D/, /^branch -d/, /-B/, /--force/, /^reset/, /^checkout -f/, /^clean/];

const prior = (worktreePath) => ({ worktree_path: worktreePath, branch: BRANCH, pull_request_number: 264 });

function fakeRun(handlers) {
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
const assertNoDestructiveGit = (calls) => {
  for (const { args } of calls) {
    const key = args.join(' ');
    for (const pattern of DESTRUCTIVE) assert.equal(pattern.test(key), false, `destructive git invocation is forbidden during recovery: git ${key}`);
  }
};

test('a recorded worktree path that no longer exists is never blindly adopted: the existing checkout of the same branch is reused (QA-263-013)', async () => {
  const existingCheckout = await mkdtemp(path.join(tmpdir(), 'agent-team-live-worktree-'));
  const staleRecorded = path.join(tmpdir(), `agent-team-missing-${Date.now()}`, 'issue-263');
  const { run, calls } = fakeRun([
    [/^worktree list --porcelain$/, ok(worktreeList([{ dir: existingCheckout, branch: BRANCH }]))]
  ]);
  const git = createGitAdapter({ run, config });
  const coordinates = await git.prepareIssueWorktree({ issue: { number: 263, title: 'Agent Team' }, prior: prior(staleRecorded) });
  assert.equal(coordinates.path, existingCheckout, 'stale recorded coordinates must be repaired to the live checkout of the expected branch');
  assert.equal(coordinates.branch, BRANCH);
  assert.equal(coordinates.pullRequestNumber, 264);
  assertNoDestructiveGit(calls);
});

test('stale coordinates with no live checkout are recreated from the existing branch without destructive commands (QA-263-013)', async () => {
  const staleRecorded = path.join(tmpdir(), `agent-team-missing-${Date.now()}-recreate`, 'issue-263');
  const { run, calls } = fakeRun([
    [/^worktree list --porcelain$/, ok(worktreeList([]))],
    [/^worktree prune$/, ok()],
    [/^fetch origin$/, ok()],
    [/^rev-parse --verify --quiet refs\/heads\//, ok(`${'1'.repeat(40)}`)],
    [/^worktree add /, ok()]
  ]);
  const git = createGitAdapter({ run, config });
  const coordinates = await git.prepareIssueWorktree({ issue: { number: 263, title: 'Agent Team' }, prior: prior(staleRecorded) });
  assert.equal(coordinates.path, staleRecorded, 'the recreated worktree must live at the recorded coordinates');
  const keys = calls.map(({ args }) => args.join(' '));
  assert.ok(keys.some((key) => key === `worktree add ${staleRecorded} ${BRANCH}`), `the existing branch must be checked out again, got: ${keys.join(' | ')}`);
  assert.ok(keys.includes('worktree prune'), 'stale worktree registrations must be pruned before recreation');
  assertNoDestructiveGit(calls);
});

test('valid recorded coordinates (existing directory, expected branch and repository) are reused as-is', async () => {
  const existing = await mkdtemp(path.join(tmpdir(), 'agent-team-valid-worktree-'));
  const { run, calls } = fakeRun([
    // QA-263-015: validity additionally requires the directory to be a registered worktree root.
    [/^worktree list --porcelain$/, ok(worktreeList([{ dir: existing, branch: BRANCH }]))],
    [/^rev-parse --abbrev-ref HEAD$/, ({ cwd }) => { assert.equal(cwd, existing); return ok(BRANCH); }],
    [/^remote get-url origin$/, ok(ORIGIN)]
  ]);
  const git = createGitAdapter({ run, config });
  const coordinates = await git.prepareIssueWorktree({ issue: { number: 263, title: 'Agent Team' }, prior: prior(existing) });
  assert.equal(coordinates.path, existing);
  const keys = calls.map(({ args }) => args.join(' '));
  assert.equal(keys.some((key) => key.startsWith('worktree add') || key.startsWith('worktree prune')), false, 'a valid worktree must not be recreated');
});

test('an existing directory on an unexpected branch or foreign repository is not reused and nothing is destroyed', async () => {
  const wrongBranchDir = await mkdtemp(path.join(tmpdir(), 'agent-team-wrong-branch-'));
  const { run, calls } = fakeRun([
    [/^rev-parse --abbrev-ref HEAD$/, ok('some-other-branch')],
    [/^remote get-url origin$/, ok(ORIGIN)],
    [/^worktree list --porcelain$/, ok(worktreeList([{ dir: wrongBranchDir, branch: 'some-other-branch' }]))],
    [/^worktree prune$/, ok()],
    [/^fetch origin$/, ok()],
    [/^rev-parse --verify --quiet refs\/heads\//, { ok: false, code: 1, stdout: '', stderr: '', error: null }],
    [/^worktree add /, { ok: false, code: 128, stdout: '', stderr: `fatal: '${wrongBranchDir}' already exists`, error: null }]
  ]);
  const git = createGitAdapter({ run, config });
  await assert.rejects(
    () => git.prepareIssueWorktree({ issue: { number: 263, title: 'Agent Team' }, prior: prior(wrongBranchDir) }),
    /already exists|worktree/i,
    'occupied coordinates on the wrong branch must fail closed instead of being overwritten'
  );
  assertNoDestructiveGit(calls);
});

test('a worktree belonging to a foreign repository is repaired to a checkout of the expected repository', async () => {
  const foreignDir = await mkdtemp(path.join(tmpdir(), 'agent-team-foreign-repo-'));
  const rightDir = await mkdtemp(path.join(tmpdir(), 'agent-team-right-repo-'));
  const { run, calls } = fakeRun([
    [/^rev-parse --abbrev-ref HEAD$/, ok(BRANCH)],
    [/^remote get-url origin$/, ({ cwd }) => ok(cwd === foreignDir ? 'https://github.com/someone-else/other-repo.git' : ORIGIN)],
    [/^worktree list --porcelain$/, ok(worktreeList([{ dir: rightDir, branch: BRANCH }]))]
  ]);
  const git = createGitAdapter({ run, config });
  const coordinates = await git.prepareIssueWorktree({ issue: { number: 263, title: 'Agent Team' }, prior: prior(foreignDir) });
  assert.equal(coordinates.path, rightDir, 'coordinates in a foreign repository must never be adopted');
  assertNoDestructiveGit(calls);
});
