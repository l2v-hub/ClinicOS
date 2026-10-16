import test from 'node:test';
import assert from 'node:assert/strict';
import { createGitHub } from '../../src/bug-pipeline/github.mjs';

function response(value, { ok = true, code = 0, stderr = '' } = {}) {
  return { ok, code, stdout: JSON.stringify(value), stderr };
}

function apiPath(args) {
  return args.find((arg, index) => index > 0 && !arg.startsWith('-'));
}

test('authorized accepts only write-capable collaborators', async () => {
  const run = async ({ args }) => {
    const path = apiPath(args);
    if (path.endsWith('/alice/permission')) return response({ permission: 'write' });
    if (path.endsWith('/bob/permission')) return response({ permission: 'triage' });
    return response({}, { ok: false, code: 1, stderr: 'HTTP 404' });
  };
  const gh = createGitHub({ cwd: '/tmp', repo: 'l2v-hub/ClinicOS', run });
  assert.equal(await gh.authorized('alice'), true);
  assert.equal(await gh.authorized('bob'), false);
  assert.equal(await gh.authorized('bad login'), false);
});

test('intake requires exact command and authorized actor before adding all queue labels', async () => {
  const calls = [];
  const run = async ({ args, input }) => {
    calls.push({ args, input });
    const path = apiPath(args);
    if (path.endsWith('/collaborators/alice/permission'))
      return response({ permission: 'maintain' });
    if (
      path.endsWith('/labels/bug') ||
      path.endsWith('/labels/codex-triage') ||
      path.endsWith('/labels/codex-run')
    ) {
      return response({}, { ok: false, code: 1, stderr: 'HTTP 404' });
    }
    return response({});
  };
  const gh = createGitHub({ cwd: '/tmp', repo: 'l2v-hub/ClinicOS', run });
  assert.deepEqual(
    await gh.intake({
      action: 'created',
      sender: { login: 'alice' },
      issue: { number: 17 },
      comment: { body: '  /codex fix\n', user: { login: 'alice' } },
    }),
    [17],
  );
  const apply = calls.find(
    (call) => call.args[0] === 'api' && call.args[1] === 'repos/l2v-hub/ClinicOS/issues/17/labels',
  );
  assert.deepEqual(JSON.parse(apply.input), { labels: ['bug', 'codex-triage', 'codex-run'] });
  assert.equal(
    calls.some((call) => call.args.includes('shell')),
    false,
  );
});

test('intake refuses unauthorized actors, near-match commands, and pull requests', async () => {
  const calls = [];
  const run = async (call) => {
    calls.push(call);
    return response({ permission: 'read' });
  };
  const gh = createGitHub({ cwd: '/tmp', repo: 'l2v-hub/ClinicOS', run });
  assert.deepEqual(
    await gh.intake({
      action: 'created',
      sender: { login: 'alice' },
      issue: { number: 1 },
      comment: { body: '/codex fix it' },
    }),
    [],
  );
  assert.deepEqual(
    await gh.intake({
      action: 'created',
      sender: { login: 'alice' },
      issue: { number: 1 },
      comment: { body: '/codex fix', user: { login: 'bob' } },
    }),
    [],
  );
  assert.deepEqual(
    await gh.intake({
      action: 'created',
      sender: { login: 'alice' },
      issue: { number: 1, pull_request: {} },
      comment: { body: '/codex fix', user: { login: 'alice' } },
    }),
    [],
  );
  assert.equal(calls.length, 0);
});

test('scheduled queue accepts only an authorized explicit codex-run event and skips blocked issues', async () => {
  const run = async ({ args }) => {
    const path = apiPath(args);
    if (path === 'repos/l2v-hub/ClinicOS/issues?state=open&labels=bug,codex-run&per_page=100')
      return response([
        [
          { number: 10, labels: [{ name: 'bug' }, { name: 'codex-run' }] },
          { number: 11, labels: [{ name: 'bug' }, { name: 'codex-run' }] },
          {
            number: 12,
            labels: [{ name: 'bug' }, { name: 'codex-run' }, { name: 'codex-in-flight' }],
          },
          { number: 13, labels: [{ name: 'bug' }, { name: 'codex-run' }] },
          { number: 14, labels: [{ name: 'bug' }, { name: 'codex-run' }] },
        ],
      ]);
    if (path === 'user') return response({}, { ok: false, code: 1, stderr: 'HTTP 403' });
    if (path.endsWith('/issues/10/events?per_page=100'))
      return response([
        [
          {
            event: 'labeled',
            label: { name: 'codex-triage' },
            actor: { login: 'alice' },
            created_at: '2026-10-16T09:00:00Z',
          },
          {
            event: 'labeled',
            label: { name: 'codex-run' },
            actor: { login: 'alice' },
            created_at: '2026-10-16T10:00:00Z',
          },
        ],
      ]);
    if (path.endsWith('/issues/11/events?per_page=100'))
      return response([
        [
          {
            event: 'labeled',
            label: { name: 'codex-run' },
            actor: { login: 'github-actions[bot]' },
            created_at: '2026-10-16T10:00:00Z',
          },
        ],
      ]);
    if (path.endsWith('/issues/11/comments?per_page=100')) return response([[]]);
    if (path.endsWith('/issues/13/events?per_page=100'))
      return response([
        [
          {
            event: 'labeled',
            label: { name: 'codex-run' },
            actor: { login: 'github-actions[bot]' },
            created_at: '2026-10-16T10:00:00Z',
          },
        ],
      ]);
    if (path.endsWith('/issues/13/comments?per_page=100'))
      return response([
        [{ body: '/codex fix', user: { login: 'alice' }, created_at: '2026-10-16T09:59:00Z' }],
      ]);
    if (path.endsWith('/issues/14/events?per_page=100'))
      return response([
        [
          {
            event: 'labeled',
            label: { name: 'codex-run' },
            actor: { login: 'untrusted-bot[bot]' },
            created_at: '2026-10-16T10:00:00Z',
          },
        ],
      ]);
    if (path.endsWith('/collaborators/alice/permission')) return response({ permission: 'write' });
    if (path.endsWith('/collaborators/github-actions/permission'))
      return response({}, { ok: false, code: 1, stderr: 'HTTP 404' });
    throw new Error(`unexpected ${args.join(' ')}`);
  };
  const gh = createGitHub({ cwd: '/tmp', repo: 'l2v-hub/ClinicOS', run });
  assert.deepEqual(
    (await gh.discoverQueue()).map((issue) => issue.number),
    [10, 13],
  );
});

test('durable state initializes only its branch from main and uses returned Contents SHA', async () => {
  const calls = [];
  const run = async ({ args, input }) => {
    calls.push({ args, input });
    const path = apiPath(args);
    if (path.includes('/git/ref/heads/codex/bug-control'))
      return response({}, { ok: false, code: 1, stderr: 'HTTP 404' });
    if (path.endsWith('/git/ref/heads/main')) return response({ object: { sha: 'a'.repeat(40) } });
    if (path.endsWith('/git/refs')) return response({ ref: 'refs/heads/codex/bug-control' });
    if (path.includes('/.codex-bug-state.json')) {
      if (args.includes('PUT')) return response({ content: { sha: 'b'.repeat(40) } });
      return response({}, { ok: false, code: 1, stderr: 'HTTP 404' });
    }
    if (path.startsWith('repos/l2v-hub/ClinicOS/contents/'))
      return response({}, { ok: false, code: 1, stderr: 'HTTP 404' });
    throw new Error(`unexpected ${args.join(' ')}`);
  };
  const store = createGitHub({ cwd: '/tmp', repo: 'l2v-hub/ClinicOS', run }).createStateStore();
  assert.equal(await store.load(), null);
  await store.save({ attempts: { batch: 1 } });
  const branchCreate = calls.find(
    (call) => apiPath(call.args) === 'repos/l2v-hub/ClinicOS/git/refs',
  );
  assert.deepEqual(JSON.parse(branchCreate.input), {
    ref: 'refs/heads/codex/bug-control',
    sha: 'a'.repeat(40),
  });
  const write = calls.find((call) => call.args.includes('-X') && call.args.includes('PUT'));
  assert.equal(JSON.parse(write.input).branch, 'codex/bug-control');
  assert.equal(JSON.parse(write.input).sha, undefined);
});

test('failed state CAS keeps the remembered SHA and never retries without it', async () => {
  const writes = [];
  const run = async ({ args, input }) => {
    const path = apiPath(args);
    if (path.includes('/git/ref/heads/codex/bug-control'))
      return response({ object: { sha: 'a'.repeat(40) } });
    if (args.includes('PUT')) {
      writes.push(JSON.parse(input));
      return response({}, { ok: false, code: 1, stderr: 'HTTP 409 conflict' });
    }
    if (path.startsWith('repos/l2v-hub/ClinicOS/contents/')) {
      return response({
        type: 'file',
        sha: 'f'.repeat(40),
        content: Buffer.from('{"count":1}').toString('base64'),
      });
    }
    throw new Error(`unexpected ${args.join(' ')}`);
  };
  const store = createGitHub({ cwd: '/tmp', repo: 'l2v-hub/ClinicOS', run }).createStateStore();
  assert.deepEqual(await store.load(), { count: 1 });
  await assert.rejects(store.save({ count: 2 }), /compare-and-swap/);
  await assert.rejects(store.save({ count: 3 }), /compare-and-swap/);
  assert.equal(writes.length, 2);
  assert.deepEqual(
    writes.map((write) => write.sha),
    ['f'.repeat(40), 'f'.repeat(40)],
  );
});

test('review feedback binds to PR head, tracks current reviews, unresolved threads and human comments', async () => {
  const run = async ({ args }) => {
    const path = apiPath(args);
    if (args[0] === 'api' && args.includes('graphql')) {
      return response({
        data: {
          repository: {
            pullRequest: {
              reviewThreads: {
                pageInfo: { hasNextPage: false },
                nodes: [{ isResolved: false }],
              },
            },
          },
        },
      });
    }
    if (path === 'user') return response({ login: 'pipeline-bot' });
    if (path.endsWith('/pulls/42'))
      return response({
        number: 42,
        html_url: 'https://github.com/l2v-hub/ClinicOS/pull/42',
        state: 'open',
        head: {
          sha: 'c'.repeat(40),
          ref: 'codex/batch-17',
          repo: { full_name: 'l2v-hub/ClinicOS', fork: false },
        },
        base: { ref: 'main' },
      });
    if (path.endsWith('/reviews?per_page=100'))
      return response([
        [
          {
            id: 1,
            state: 'CHANGES_REQUESTED',
            submitted_at: '2026-10-16T10:00:00Z',
            user: { login: 'reviewer' },
            body: 'old',
          },
          {
            id: 2,
            state: 'APPROVED',
            submitted_at: '2026-10-16T11:00:00Z',
            user: { login: 'reviewer' },
            body: 'looks good',
          },
        ],
      ]);
    if (path.endsWith('/comments?per_page=100') && path.includes('/pulls/42/'))
      return response([
        [
          {
            id: 20,
            body: 'real review comment',
            user: { login: 'reviewer' },
            path: 'src/a.mjs',
            line: 9,
          },
        ],
      ]);
    if (path.endsWith('/issues/42/comments?per_page=100'))
      return response([
        [
          {
            id: 21,
            body: '<!-- codex-bug-pipeline:status -->\nstatus',
            user: { login: 'pipeline-bot' },
          },
          { id: 22, body: 'human request', user: { login: 'reviewer' } },
          {
            id: 23,
            body: '<!-- codex-bug-pipeline:spoof -->\nkeep this',
            user: { login: 'reviewer' },
          },
        ],
      ]);
    throw new Error(`unexpected ${args.join(' ')}`);
  };
  const result = await createGitHub({ cwd: '/tmp', repo: 'l2v-hub/ClinicOS', run }).reviewFeedback(
    42,
  );
  assert.equal(result.head, 'c'.repeat(40));
  assert.equal(result.headIsFork, false);
  assert.equal(result.unresolved, true);
  assert.equal(result.changesRequested, false);
  assert.deepEqual(
    result.comments.map((comment) => comment.body),
    [
      'old',
      'looks good',
      'real review comment',
      'human request',
      '<!-- codex-bug-pipeline:spoof -->\nkeep this',
    ],
  );
});

test('review feedback fails closed when more than 100 review threads are returned', async () => {
  const run = async ({ args }) => {
    const path = apiPath(args);
    if (args[0] === 'api' && args.includes('graphql')) {
      return response({
        data: {
          repository: {
            pullRequest: {
              reviewThreads: {
                pageInfo: { hasNextPage: true },
                nodes: [{ isResolved: true }],
              },
            },
          },
        },
      });
    }
    if (path === 'user') return response({}, { ok: false, code: 1, stderr: 'HTTP 403' });
    if (path.endsWith('/pulls/42'))
      return response({
        state: 'open',
        head: {
          sha: 'c'.repeat(40),
          ref: 'codex/batch-17',
          repo: { full_name: 'l2v-hub/ClinicOS' },
        },
        base: { ref: 'main' },
      });
    if (path.includes('/reviews?') || path.includes('/comments?')) return response([[]]);
    throw new Error(`unexpected ${args.join(' ')}`);
  };
  const result = await createGitHub({ cwd: '/tmp', repo: 'l2v-hub/ClinicOS', run }).reviewFeedback(
    42,
  );
  assert.equal(result.unresolved, true);
});

test('review feedback identifies a merged PR from the real REST state and merge flag', async () => {
  const run = async ({ args }) => {
    const path = apiPath(args);
    if (args[0] === 'api' && args.includes('graphql'))
      return response({
        data: {
          repository: {
            pullRequest: {
              reviewThreads: {
                pageInfo: { hasNextPage: false },
                nodes: [],
              },
            },
          },
        },
      });
    if (path === 'user') return response({}, { ok: false, code: 1, stderr: 'HTTP 403' });
    if (path.endsWith('/pulls/42'))
      return response({
        state: 'closed',
        merged: true,
        merge_commit_sha: 'd'.repeat(40),
        head: {
          sha: 'c'.repeat(40),
          ref: 'codex/batch-17',
          repo: { full_name: 'l2v-hub/ClinicOS' },
        },
        base: { ref: 'main' },
      });
    if (path.includes('/reviews?') || path.includes('/comments?')) return response([[]]);
    throw new Error(`unexpected ${args.join(' ')}`);
  };
  const result = await createGitHub({ cwd: '/tmp', repo: 'l2v-hub/ClinicOS', run }).reviewFeedback(
    42,
  );
  assert.equal(result.state, 'MERGED');
  assert.equal(result.mergeCommitSha, 'd'.repeat(40));
});

test('required checks fail closed when absent and pass only when all reported checks succeed', async () => {
  let checks = [];
  const run = async () => response(checks);
  const gh = createGitHub({ cwd: '/tmp', repo: 'l2v-hub/ClinicOS', run });
  assert.equal((await gh.requiredChecks(42)).ok, false);
  checks = [{ name: 'build', state: 'SUCCESS', bucket: 'pass' }];
  assert.equal((await gh.requiredChecks(42)).ok, true);
  checks = [{ name: 'build', state: 'PENDING', bucket: 'pending' }];
  assert.equal((await gh.requiredChecks(42)).ok, false);
  checks = [{ name: 'build', state: 'FAILURE', bucket: 'pass' }];
  assert.equal((await gh.requiredChecks(42)).ok, false);
  checks = [{ name: 'build', state: '', bucket: 'pass' }];
  assert.equal((await gh.requiredChecks(42)).ok, true);
});
