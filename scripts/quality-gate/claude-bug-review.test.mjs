import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { runProcess } from '../../agent-team/src/adapters/process-runner.mjs';
import { runBugReview, validateReview, MAX_REVIEW_ROUNDS } from './claude-bug-review.mjs';

const help =
  '--print --output-format --json-schema --tools --permission-mode --restricted --setting-sources --strict-mcp-config --mcp-config --max-turns';
async function fixture(t, { verdict = 'changes-requested', authenticated = true, onReview } = {}) {
  const cwd = await mkdtemp(path.join(tmpdir(), 'clinicos-claude-review-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  git('init', '-b', 'main');
  git('config', 'user.name', 'Synthetic QA');
  git('config', 'user.email', 'qa@example.invalid');
  const packet = 'artifacts/task-validation/bug-batch-1';
  await mkdir(path.join(cwd, packet), { recursive: true });
  await writeFile(path.join(cwd, '.gitignore'), '*.local\n');
  await writeFile(path.join(cwd, 'feature.ts'), 'export const value = 0;\n');
  for (const name of ['task-contract.md', 'implementation-plan.md'])
    await writeFile(path.join(cwd, packet, name), 'Synthetic test contract\n');
  git('add', '.');
  git('commit', '-m', 'fixture');
  const calls = [];
  const run = async (call) => {
    if (call.command !== 'claude') return runProcess(call);
    calls.push(call);
    if (call.args[0] === '--help') return { ok: true, stdout: help };
    if (call.args[0] === 'auth')
      return { ok: true, stdout: JSON.stringify({ loggedIn: authenticated }) };
    const sha = git('rev-parse', 'HEAD');
    const review = {
      subject_sha: sha,
      verdict,
      summary: 'Synthetic review',
      findings:
        verdict === 'changes-requested'
          ? [
              {
                severity: 'high',
                file: 'feature.ts',
                line: 1,
                problem: 'Synthetic defect',
                requested_change: 'Correct value',
                test_expectation: 'Verify corrected value',
              },
            ]
          : [],
    };
    if (onReview) return onReview({ call, review, cwd, git });
    return { ok: true, stdout: JSON.stringify({ structured_output: review }) };
  };
  return {
    cwd,
    packet,
    git,
    calls,
    run,
    review: () => runBugReview({ cwd, packet, run }),
    async change(value) {
      await writeFile(path.join(cwd, 'feature.ts'), `export const value = ${value};\n`);
      git('add', 'feature.ts');
      git('commit', '-m', `Codex correction ${value}`);
    },
    state: async () =>
      JSON.parse(await readFile(path.join(cwd, packet, 'claude-review-state.local'), 'utf8')),
  };
}

test('four rejected rounds remain blocked and a fifth model call is impossible', async (t) => {
  const f = await fixture(t);
  for (let round = 1; round <= 4; round++) {
    if (round > 1) await f.change(round);
    const result = await f.review();
    assert.equal(result.round, round);
    assert.equal(result.verdict, round === 4 ? 'blocked' : 'changes-requested');
  }
  await f.change(5);
  const fifth = await f.review();
  assert.deepEqual(
    { ok: fifth.ok, reason: fifth.reason },
    { ok: false, reason: 'four-review-limit' },
  );
  assert.equal(f.calls.filter((call) => call.args[0] === '--print').length, MAX_REVIEW_ROUNDS);
  assert.equal((await f.state()).rounds.length, 4);
});
test('the same rejected commit cannot spend a second round', async (t) => {
  const f = await fixture(t);
  await f.review();
  await assert.rejects(f.review(), /apply and commit Codex corrections/);
  assert.equal((await f.state()).rounds.length, 1);
});
test('approval is reusable only at the same SHA and code changes require another review', async (t) => {
  const f = await fixture(t, { verdict: 'approved' });
  assert.equal((await f.review()).ok, true);
  assert.equal((await f.review()).reused, true);
  await f.change(2);
  assert.equal((await f.review()).round, 2);
  assert.equal(f.calls.filter((call) => call.args[0] === '--print').length, 2);
});
test('missing authentication consumes no review round', async (t) => {
  const f = await fixture(t, { authenticated: false });
  await assert.rejects(f.review(), /authentication is required/);
  await assert.rejects(f.state(), { code: 'ENOENT' });
  assert.equal(f.calls.filter((call) => call.args[0] === '--print').length, 0);
});
test('reviewer has only read tools and no project settings, MCP or bypass', async (t) => {
  const f = await fixture(t, { verdict: 'approved' });
  await f.review();
  const call = f.calls.find((call) => call.args[0] === '--print');
  assert.equal(call.args[call.args.indexOf('--tools') + 1], 'Read,Glob,Grep');
  assert.equal(call.args[call.args.indexOf('--permission-mode') + 1], 'plan');
  assert.equal(call.args[call.args.indexOf('--setting-sources') + 1], '');
  assert.equal(call.args[call.args.indexOf('--mcp-config') + 1], '{"mcpServers":{}}');
  assert.ok(call.args.includes('--strict-mcp-config'));
  assert.ok(call.args.includes('--restricted'));
  assert.ok(call.args.every((arg) => !arg.includes('dangerously') && !arg.includes('bypass')));
  assert.match(call.input, /Never run commands, write files/);
});
test('dirty implementation and packets outside the worktree are rejected before model invocation', async (t) => {
  const f = await fixture(t);
  await writeFile(path.join(f.cwd, 'feature.ts'), 'uncommitted');
  await assert.rejects(f.review(), /commit implementation/);
  const outside = await mkdtemp(path.join(tmpdir(), 'outside-review-'));
  t.after(() => rm(outside, { recursive: true, force: true }));
  const link = path.join(f.cwd, 'artifacts/task-validation/escape');
  await symlink(outside, link, 'dir');
  await assert.rejects(runBugReview({ cwd: f.cwd, packet: link, run: f.run }), /inside artifacts/);
  assert.equal(f.calls.length, 0);
});
test('corrupted approved evidence is rejected', async (t) => {
  const f = await fixture(t, { verdict: 'approved' });
  await f.review();
  await writeFile(path.join(f.cwd, f.packet, 'claude-review-1.json'), '{}');
  await assert.rejects(f.review(), /approved review evidence changed/);
});
test('a malformed provider response is a failed attempt rather than approval', async (t) => {
  const f = await fixture(t, {
    onReview: async () => ({ ok: true, stdout: '{"structured_output":{}}' }),
  });
  await assert.rejects(f.review(), /invalid or stale|missing subject_sha/);
  assert.equal((await f.state()).rounds[0].verdict, 'failed');
});
test('files changed during review invalidate the result', async (t) => {
  const f = await fixture(t, {
    verdict: 'approved',
    onReview: async ({ review, cwd }) => {
      await writeFile(path.join(cwd, 'feature.ts'), 'changed during review');
      return { ok: true, stdout: JSON.stringify({ structured_output: review }) };
    },
  });
  await assert.rejects(f.review(), /files changed during review/);
  assert.equal((await f.state()).rounds[0].verdict, 'failed');
});
test('concurrent callers cannot invoke two reviewers for the same packet', async (t) => {
  let started, release;
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const f = await fixture(t, {
    verdict: 'approved',
    onReview: async ({ review }) => {
      started();
      await gate;
      return { ok: true, stdout: JSON.stringify({ structured_output: review }) };
    },
  });
  const first = f.review();
  await ready;
  await assert.rejects(f.review(), /another Claude review owns/);
  release();
  assert.equal((await first).ok, true);
});
test('review validation rejects stale SHA, invented paths and contradictory approval', () => {
  const sha = 'a'.repeat(40);
  const finding = {
    severity: 'high',
    file: 'feature.ts',
    line: 1,
    problem: 'Bug',
    requested_change: 'Fix',
    test_expectation: 'Regression test',
  };
  const base = {
    subject_sha: sha,
    verdict: 'changes-requested',
    summary: 'Review',
    findings: [finding],
  };
  assert.throws(
    () => validateReview({ ...base, subject_sha: 'b'.repeat(40) }, sha, new Set(['feature.ts'])),
    /stale/,
  );
  assert.throws(
    () =>
      validateReview(
        { ...base, findings: [{ ...finding, file: '../secret' }] },
        sha,
        new Set(['feature.ts']),
      ),
    /location/,
  );
  assert.throws(
    () => validateReview({ ...base, verdict: 'approved' }, sha, new Set(['feature.ts'])),
    /contradicts/,
  );
});
test('a tracked prerequisite symlink cannot read an external implementation plan', async (t) => {
  const f = await fixture(t, { verdict: 'approved' });
  const outside = path.join(await mkdtemp(path.join(tmpdir(), 'external-plan-')), 'plan.md');
  t.after(() => rm(path.dirname(outside), { recursive: true, force: true }));
  await writeFile(outside, 'External context must not be reviewed');
  const plan = path.join(f.cwd, f.packet, 'implementation-plan.md');
  await rm(plan);
  await symlink(outside, plan);
  f.git('add', path.join(f.packet, 'implementation-plan.md'));
  f.git('commit', '-m', 'Synthetic symlink fixture');
  await assert.rejects(f.review(), /prerequisites must be regular files/);
  assert.equal(f.calls.length, 0);
});
