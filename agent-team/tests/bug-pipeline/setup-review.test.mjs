import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { runProcess } from '../../src/adapters/process-runner.mjs';
import { reviewBugSetup } from '../../../scripts/quality-gate/review-bug-setup.mjs';

const packet = 'artifacts/task-validation/codex-setup-review';
const help =
  '--print --output-format --json-schema --tools --permission-mode --restricted --setting-sources --strict-mcp-config --mcp-config';
async function fixture(
  t,
  { verdict = 'approved', permission = 'admin', conflict = false, postFailure = false } = {},
) {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'setup-review-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  git('init', '-b', 'main');
  git('config', 'user.name', 'Synthetic QA');
  git('config', 'user.email', 'qa@example.invalid');
  await mkdir(path.join(cwd, packet), { recursive: true });
  for (const file of ['task-contract.md', 'implementation-plan.md'])
    await writeFile(path.join(cwd, packet, file), 'Synthetic setup criteria\n');
  await writeFile(path.join(cwd, 'feature.ts'), 'export const value=0;\n');
  git('add', '.');
  git('commit', '-m', 'fixture');
  const base = git('rev-parse', 'HEAD');
  const env = {
    GITHUB_REPOSITORY: 'l2v-hub/ClinicOS',
    CLAUDE_REVIEW_AUTH_MODE: 'subscription',
    GITHUB_ACTOR: 'maintainer',
    GITHUB_SHA: base,
    CLINICOS_REVIEWED_SHA: base,
  };
  let remote = null,
    modelCalls = 0,
    currentHead = base,
    mutateHead = false;
  const posts = [];
  const store = {
    load: async () => structuredClone(remote),
    save: async (state) => {
      if (conflict) throw new Error('CAS conflict');
      remote = structuredClone(state);
    },
  };
  const run = async (call) => {
    if (call.command === 'gh') {
      const route = call.args[1];
      if (route.endsWith('/permission'))
        return { ok: true, stdout: JSON.stringify({ permission }) };
      if (route.endsWith('/reviews')) {
        if (postFailure) {
          postFailure = false;
          return { ok: false, stdout: '' };
        }
        posts.push(JSON.parse(call.input));
        return { ok: true, stdout: '{}' };
      }
      if (route.includes('/reviews?')) return { ok: true, stdout: JSON.stringify(posts) };
      if (route.includes('/compare/'))
        return { ok: true, stdout: JSON.stringify({ merge_base_commit: { sha: base } }) };
      if (route.endsWith('/pulls/471'))
        return {
          ok: true,
          stdout: JSON.stringify({
            state: 'open',
            head: { sha: currentHead, repo: { full_name: env.GITHUB_REPOSITORY } },
            base: { sha: base },
          }),
        };
      throw new Error('Unexpected GitHub route');
    }
    if (call.command !== 'claude') return runProcess(call);
    assert.equal(call.envMode, 'review');
    if (call.args[0] === '--help') return { ok: true, stdout: help };
    if (call.args[0] === 'auth') return { ok: true, stdout: '{"loggedIn":true}' };
    modelCalls++;
    assert.equal(
      remote.setupReview471.ledger.rounds.at(-1).verdict,
      'running',
      'remote reservation must precede inference',
    );
    assert.equal(remote.setupReview471.ledger.rounds.at(-1).subject_sha, env.GITHUB_SHA);
    if (mutateHead) currentHead = 'b'.repeat(40);
    return {
      ok: true,
      stdout: JSON.stringify({
        structured_output: {
          subject_sha: env.GITHUB_SHA,
          verdict,
          summary: 'Synthetic bounded review',
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
        },
      }),
    };
  };
  return {
    env,
    posts,
    modelCalls: () => modelCalls,
    remote: () => remote,
    stale: () => {
      currentHead = 'b'.repeat(40);
    },
    mutateDuringReview: () => {
      mutateHead = true;
    },
    interrupt: () => {
      remote = {
        schemaVersion: 1,
        repository: env.GITHUB_REPOSITORY,
        batches: [],
        setupReview471: {
          pullRequest: 471,
          packet,
          reports: {},
          ledger: {
            schema_version: 1,
            max_rounds: 4,
            rounds: [{ round: 1, subject_sha: base, verdict: 'running' }],
          },
        },
      };
    },
    async review(afterCleanup) {
      // Hosted runs start in fresh checkouts. Keep the durable remote ledger across runs.
      for (const name of [
        'claude-review-state.local',
        'claude-review-diff.local',
        ...[1, 2, 3, 4].map((n) => `claude-review-${n}.json`),
      ])
        await rm(path.join(cwd, packet, name), { force: true });
      if (afterCleanup) await afterCleanup({ cwd, directory: path.join(cwd, packet) });
      return reviewBugSetup({ cwd, env, run, store });
    },
    async change(value) {
      await writeFile(path.join(cwd, 'feature.ts'), `export const value=${value};\n`);
      git('add', 'feature.ts');
      git('commit', '-m', `correction${value}`);
      currentHead = env.GITHUB_SHA = env.CLINICOS_REVIEWED_SHA = git('rev-parse', 'HEAD');
    },
  };
}

test('setup review reserves remotely before inference and reuses only exact-SHA approval', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.review()).ok, true);
  assert.equal(f.remote().setupReview471.ledger.rounds[0].verdict, 'approved');
  assert.equal((await f.review()).reused, true);
  assert.equal(f.modelCalls(), 1);
  assert.equal(f.posts.length, 1);
  assert.equal(f.posts[0].commit_id, f.env.GITHUB_SHA);
});
test('CAS failure, non-admin actor, stale head and interrupted budget prevent inference', async (t) => {
  for (const options of [
    { conflict: true },
    { permission: 'write' },
    { stale: true },
    { interrupted: true },
  ]) {
    const f = await fixture(t, options);
    if (options.stale) f.stale();
    if (options.interrupted) f.interrupt();
    await assert.rejects(f.review());
    assert.equal(f.modelCalls(), 0);
    assert.equal(f.posts.length, 0);
  }
});
test('a head change during review preserves the spent attempt and cannot publish approval', async (t) => {
  const f = await fixture(t);
  f.mutateDuringReview();
  await assert.rejects(f.review(), /head changed/);
  assert.equal(f.modelCalls(), 1);
  assert.equal(f.remote().setupReview471.ledger.rounds.length, 1);
  assert.equal(f.posts.length, 0);
});
test('new source changes cannot exceed four total remote setup review attempts', async (t) => {
  const f = await fixture(t, { verdict: 'changes-requested' });
  for (let round = 1; round <= 4; round++) {
    if (round > 1) await f.change(round);
    assert.equal((await f.review()).round, round);
  }
  await f.change(5);
  assert.equal((await f.review()).reason, 'four-review-limit');
  assert.equal(f.modelCalls(), 4);
  assert.equal(f.remote().setupReview471.ledger.rounds.length, 4);
});

test('tampered saved approval evidence cannot trigger another review or publish approval', async (t) => {
  const f = await fixture(t);
  await f.review();
  f.remote().setupReview471.reports['claude-review-1.json'] = '{}';
  await assert.rejects(f.review(), /evidence changed/);
  assert.equal(f.modelCalls(), 1);
  assert.equal(f.posts.length, 1);
});

test('a failed review publication is recovered without another model attempt', async (t) => {
  const f = await fixture(t, { postFailure: true });
  await assert.rejects(f.review(), /preflight failed/);
  assert.equal(f.modelCalls(), 1);
  assert.equal(f.posts.length, 0);
  assert.equal((await f.review()).reused, true);
  assert.equal(f.posts.length, 1);
  assert.equal(f.modelCalls(), 1);
  await f.review();
  assert.equal(f.posts.length, 1);
});

test('restoring durable review state cannot overwrite a symlink target', async (t) => {
  const f = await fixture(t);
  await f.review();
  let target;
  await assert.rejects(
    f.review(async ({ cwd, directory }) => {
      target = path.join(cwd, 'outside-ledger-target');
      await writeFile(target, 'preserved');
      await symlink(target, path.join(directory, 'claude-review-state.local'));
    }),
    { code: 'EEXIST' },
  );
  assert.equal(await readFile(target, 'utf8'), 'preserved');
  assert.equal(f.modelCalls(), 1);
});
