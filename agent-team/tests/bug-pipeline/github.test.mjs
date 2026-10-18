import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGitHub,
  MAX_DURABLE_STATE_BYTES,
  RESULT_RESERVATION_BYTES,
  pendingResultBytes,
  controllerFailureCode,
} from '../../src/bug-pipeline/github.mjs';
import { createHash } from 'node:crypto';

test('issue lifecycle uses additive managed labels and closes resolved issues as completed, with retry after a failed close', async () => {
  const calls = [];
  let failClose = true;
  const gh = createGitHub({
    repo: 'l2v-hub/ClinicOS',
    cwd: '/tmp',
    run: async ({ args, input }) => {
      calls.push({ args, body: input ? JSON.parse(input) : null });
      if (args.includes('PATCH') && failClose) {
        failClose = false;
        return response({}, { ok: false, code: 1, stderr: 'HTTP 503' });
      }
      return response({});
    },
  });
  await gh.setIssueStatus(17, 'In progress');
  assert.equal(
    calls.some((call) => call.args.includes('PATCH')),
    false,
  );
  await assert.rejects(gh.setIssueStatus(17, 'Risolto'), /503/);
  await gh.setIssueStatus(17, 'Risolto');
  const patches = calls.filter((call) => call.args.includes('PATCH'));
  assert.equal(patches.length, 2);
  assert.deepEqual(patches[1].body, { state: 'closed', state_reason: 'completed' });
  assert.ok(
    calls
      .filter((call) => call.args.includes('DELETE'))
      .every((call) => /\/labels\/(In%20progress|Risolto|Bloccato)$/.test(call.args[1])),
  );
  const count = calls.length;
  await gh.setIssueStatus(17, 'Risolto');
  assert.equal(calls.length, count);
  await assert.rejects(gh.setIssueStatus(17, 'approved'), /Invalid/);
});

test('dashboard state reads never initialize a branch, and source permission errors are not treated as an empty queue', async () => {
  const calls = [];
  let forbidden = false;
  const gh = createGitHub({
    repo: 'l2v-hub/ClinicOS',
    cwd: '/tmp',
    run: async ({ args }) => {
      calls.push(args);
      return response({}, { ok: false, code: 1, stderr: forbidden ? 'HTTP 403' : 'HTTP 404' });
    },
  });
  assert.equal(await gh.readDashboardState(), null);
  assert.ok(calls.every((args) => !args.includes('-X')));
  forbidden = true;
  await assert.rejects(gh.readDashboardState(), /Cannot read/);
});

function response(value, { ok = true, code = 0, stderr = '' } = {}) {
  return { ok, code, stdout: JSON.stringify(value), stderr };
}

function apiPath(args) {
  return args.find((arg, index) => index > 0 && !arg.startsWith('-'));
}

test('a maintainer labeling with the same User identity as the controller PAT is authorized', async () => {
  const calls = [];
  const gh = createGitHub({
    cwd: '/tmp',
    repo: 'l2v-hub/ClinicOS',
    run: async ({ args }) => {
      calls.push(args);
      const route = apiPath(args);
      if (route === 'user') return response({ login: 'alice', type: 'User' });
      if (route.includes('/issues?'))
        return response([[{ number: 17, labels: [{ name: 'codex-run' }] }]]);
      if (route.includes('/events?'))
        return response([
          [
            {
              event: 'labeled',
              label: { name: 'codex-run' },
              actor: { login: 'alice', type: 'User' },
              created_at: '2026-10-17T06:00:00Z',
            },
          ],
        ]);
      if (route.endsWith('/collaborators/alice/permission'))
        return response({ permission: 'admin' });
      throw new Error(`Unexpected route ${route}`);
    },
  });
  assert.deepEqual(
    (await gh.discoverQueue()).map((i) => i.number),
    [17],
  );
  assert.ok(
    calls.every((args) => !args.includes('-X')),
    'dashboard discovery is read-only',
  );
  assert.ok(
    calls.every((args) => !apiPath(args).includes('/comments')),
    'a human label needs no slash-command workaround',
  );
});

test('scheduled normalization recovers codex-run without bug only after authorization and never mutates dashboard reads', async () => {
  const writes = [];
  const gh = createGitHub({
    cwd: '/tmp',
    repo: 'l2v-hub/ClinicOS',
    run: async ({ args, input }) => {
      const route = apiPath(args);
      if (args.includes('POST')) {
        writes.push({ route, body: JSON.parse(input) });
        return response({});
      }
      if (route.includes('/issues?'))
        return response([
          [
            { number: 17, labels: [{ name: 'codex-run' }] },
            { number: 18, labels: [{ name: 'codex-run' }] },
            { number: 19, labels: [{ name: 'codex-run' }], pull_request: {} },
            { number: 20, labels: [{ name: 'codex-run' }, { name: 'ready-for-qa' }] },
          ],
        ]);
      if (route.includes('/events?'))
        return response([
          [
            {
              event: 'labeled',
              label: { name: 'codex-run' },
              actor: {
                login: route.includes('/17/') || route.includes('/20/') ? 'alice' : 'bob',
                type: 'User',
              },
              created_at: '2026-10-17T06:00:00Z',
            },
          ],
        ]);
      if (route.includes('/collaborators/'))
        return response({ permission: route.includes('/alice/') ? 'write' : 'triage' });
      if (route.includes('/labels/')) return response({});
      throw new Error(`Unexpected route ${route}`);
    },
  });
  assert.deepEqual(
    (await gh.discoverQueue()).map((i) => i.number),
    [17, 20],
  );
  assert.equal(writes.length, 0);
  await gh.discoverQueue({ normalize: true });
  assert.deepEqual(writes, [
    {
      route: 'repos/l2v-hub/ClinicOS/issues/17/labels',
      body: { labels: ['bug', 'codex-triage', 'codex-run'] },
    },
  ]);
});

test('bot and missing actor types cannot self-authorize even if permission lookup would grant admin', async () => {
  for (const type of ['Bot', undefined]) {
    const gh = createGitHub({
      cwd: '/tmp',
      repo: 'l2v-hub/ClinicOS',
      run: async ({ args }) => {
        const route = apiPath(args);
        if (route.includes('/issues?'))
          return response([[{ number: 17, labels: [{ name: 'codex-run' }] }]]);
        if (route.includes('/events?'))
          return response([
            [
              {
                event: 'labeled',
                label: { name: 'codex-run' },
                actor: { login: 'service-account', type },
                created_at: '2026-10-17T06:00:00Z',
              },
            ],
          ]);
        if (route.includes('/comments?')) return response([[]]);
        throw new Error(`Unexpected authorization or mutation ${route}`);
      },
    });
    assert.deepEqual(await gh.discoverQueue({ normalize: true }), []);
  }
});

test('bot label fallback rejects non-human command metadata and old human commands', async () => {
  for (const command of [
    { type: 'Bot', createdAt: '2026-10-17T05:59:00Z' },
    { type: undefined, createdAt: '2026-10-17T05:59:00Z' },
    { type: 'User', createdAt: '2026-10-17T03:00:00Z' },
  ]) {
    const gh = createGitHub({
      cwd: '/tmp',
      repo: 'l2v-hub/ClinicOS',
      run: async ({ args }) => {
        const route = apiPath(args);
        if (route.includes('/issues?'))
          return response([[{ number: 17, labels: [{ name: 'codex-run' }] }]]);
        if (route.includes('/events?'))
          return response([
            [
              {
                event: 'labeled',
                label: { name: 'codex-run' },
                actor: { login: 'github-actions[bot]', type: 'Bot' },
                created_at: '2026-10-17T06:00:00Z',
              },
            ],
          ]);
        if (route.includes('/comments?'))
          return response([
            [
              {
                body: '/codex fix',
                user: { login: 'alice', type: command.type },
                created_at: command.createdAt,
              },
            ],
          ]);
        throw new Error(`Unexpected authorization or mutation ${route}`);
      },
    });
    assert.deepEqual(await gh.discoverQueue({ normalize: true }), []);
  }
});

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
    if (path === 'repos/l2v-hub/ClinicOS/issues?state=open&labels=codex-run&per_page=100')
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
            actor: { login: 'alice', type: 'User' },
            created_at: '2026-10-16T09:00:00Z',
          },
          {
            event: 'labeled',
            label: { name: 'codex-run' },
            actor: { login: 'alice', type: 'User' },
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
            actor: { login: 'github-actions[bot]', type: 'Bot' },
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
            actor: { login: 'github-actions[bot]', type: 'Bot' },
            created_at: '2026-10-16T10:00:00Z',
          },
        ],
      ]);
    if (path.endsWith('/issues/13/comments?per_page=100'))
      return response([
        [
          {
            body: '/codex fix',
            user: { login: 'alice', type: 'User' },
            created_at: '2026-10-16T09:59:00Z',
          },
        ],
      ]);
    if (path.endsWith('/issues/14/events?per_page=100'))
      return response([
        [
          {
            event: 'labeled',
            label: { name: 'codex-run' },
            actor: { login: 'untrusted-bot[bot]', type: 'Bot' },
            created_at: '2026-10-16T10:00:00Z',
          },
        ],
      ]);
    if (path.endsWith('/issues/14/comments?per_page=100')) return response([[]]);
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

test('a commented review cannot clear an earlier request for changes; explicit approval can', async () => {
  for (const decision of ['COMMENTED', 'PENDING', 'APPROVED']) {
    const run = async ({ args }) => {
      const endpoint = apiPath(args);
      if (args.includes('graphql'))
        return response({
          data: {
            repository: {
              pullRequest: { reviewThreads: { pageInfo: { hasNextPage: false }, nodes: [] } },
            },
          },
        });
      if (endpoint === 'user') return response({ login: 'pipeline-bot' });
      if (endpoint.endsWith('/pulls/42'))
        return response({
          state: 'open',
          head: {
            sha: 'c'.repeat(40),
            ref: 'codex/batch-17',
            repo: { full_name: 'l2v-hub/ClinicOS' },
          },
          base: { ref: 'main' },
        });
      if (endpoint.includes('/reviews?'))
        return response([
          [
            {
              id: 1,
              state: 'CHANGES_REQUESTED',
              submitted_at: '2026-10-16T10:00:00Z',
              user: { login: 'reviewer' },
              body: 'Fix the regression',
            },
            {
              id: 2,
              state: decision,
              submitted_at: '2026-10-16T11:00:00Z',
              user: { login: 'reviewer' },
              body: 'Follow-up',
            },
          ],
        ]);
      if (endpoint.includes('/comments?')) return response([[]]);
      throw new Error('unexpected endpoint');
    };
    const result = await createGitHub({
      cwd: '/tmp',
      repo: 'l2v-hub/ClinicOS',
      run,
    }).reviewFeedback(42);
    assert.equal(result.changesRequested, decision !== 'APPROVED');
  }
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

function guardedLifecycle({
  labelExists = true,
  creationConflict = false,
  after,
  failClose = false,
} = {}) {
  const calls = [];
  let held = false,
    triggered = false,
    inspections = 0,
    guardCalls = 0;
  const gh = createGitHub({
    repo: 'l2v-hub/ClinicOS',
    cwd: '/tmp',
    run: async ({ args, input }) => {
      const route = args[1],
        method = args.includes('-X') ? args[args.indexOf('-X') + 1] : 'GET';
      const step =
        method === 'GET' && route.endsWith('/labels/Risolto')
          ? ++inspections === 1
            ? 'label-inspection'
            : 'label-retry'
          : method === 'POST' && route.endsWith('/issues/17/labels')
            ? 'issue-label-post'
            : method === 'POST' && route.endsWith('/labels')
              ? 'label-creation'
              : method === 'DELETE' && route.endsWith('/In%20progress')
                ? 'delete-progress'
                : method === 'DELETE'
                  ? 'delete-blocked'
                  : method === 'PATCH'
                    ? 'close'
                    : 'comment';
      calls.push({ step, method, route, held, body: input ? JSON.parse(input) : null });
      await Promise.resolve();
      if (after === step && !triggered) {
        held = true;
        triggered = true;
      }
      if (step === 'label-inspection' && !labelExists)
        return response({}, { ok: false, code: 1, stderr: 'HTTP 404' });
      if (step === 'label-creation' && creationConflict)
        return response({}, { ok: false, code: 1, stderr: 'HTTP 422' });
      if (step === 'close' && failClose)
        return response({}, { ok: false, code: 1, stderr: 'HTTP 503' });
      return response({});
    },
  });
  const guard = async () => {
    guardCalls++;
    assert.equal(held, false, 'fresh durable hold');
  };
  return {
    gh,
    calls,
    guard,
    setHeld: (value) => {
      held = value;
    },
    guardCalls: () => guardCalls,
  };
}

test('real status adapter rechecks the optional guard after every preceding awaited API boundary', async (t) => {
  for (const options of [
    { after: 'label-inspection' },
    { after: 'label-inspection', labelExists: false },
    { after: 'label-creation', labelExists: false },
    { after: 'label-retry', labelExists: false, creationConflict: true },
    { after: 'issue-label-post' },
    { after: 'delete-progress' },
    { after: 'delete-blocked' },
  ])
    await t.test(JSON.stringify(options), async () => {
      const f = guardedLifecycle(options);
      await assert.rejects(
        f.gh.setIssueStatus(17, 'Risolto', { guard: f.guard }),
        /fresh durable hold/,
      );
      assert.equal(
        f.calls.some((call) => call.method !== 'GET' && call.held),
        false,
        'No mutation may start with an active hold',
      );
      assert.equal(
        f.calls.some((call) => call.step === 'close'),
        false,
      );
      f.setHeld(false);
      await f.gh.setIssueStatus(17, 'Risolto', { guard: f.guard });
      assert.equal(
        f.calls.filter((call) => call.step === 'close').length,
        1,
        'A prevented operation must not poison the status cache',
      );
    });
});

test('cached lifecycle status still checks a fresh guard and preserves unguarded callers', async () => {
  const f = guardedLifecycle();
  await f.gh.setIssueStatus(17, 'Risolto');
  const before = f.calls.length;
  f.setHeld(true);
  await assert.rejects(
    f.gh.setIssueStatus(17, 'Risolto', { guard: f.guard }),
    /fresh durable hold/,
  );
  assert.equal(f.calls.length, before);
  f.setHeld(false);
  await f.gh.setIssueStatus(17, 'Risolto', { guard: f.guard });
  await f.gh.setIssueStatus(17, 'Risolto');
  assert.equal(f.calls.length, before);
  assert.equal(f.guardCalls(), 2);
});

test('actual comment request accepts the optional fresh guard, rejects errors/false/invalid guards, and keeps default callers', async () => {
  const f = guardedLifecycle();
  f.setHeld(true);
  await assert.rejects(
    f.gh.commentIssue(17, 'Verified deployment facts', { guard: f.guard }),
    /fresh durable hold/,
  );
  await assert.rejects(
    f.gh.commentIssue(17, 'Verified deployment facts', { guard: async () => false }),
    /rejected/,
  );
  await assert.rejects(
    f.gh.setIssueStatus(17, 'Risolto', { guard: 'invalid' }),
    /must be a function/,
  );
  await assert.rejects(
    f.gh.commentIssue(17, 'Verified deployment facts', {
      guard: async () => {
        throw Error('State read HTTP403');
      },
    }),
    /HTTP403/,
  );
  assert.equal(f.calls.length, 0);
  await f.gh.commentIssue(17, 'Existing non-release protocol');
  assert.equal(f.calls.length, 1);
});

test('a hold arriving after an already-sent close cannot undo that request, but blocks later cached calls', async () => {
  const f = guardedLifecycle({ after: 'close' });
  await f.gh.setIssueStatus(17, 'Risolto', { guard: f.guard });
  assert.equal(f.calls.find((call) => call.step === 'close').held, false);
  const before = f.calls.length;
  await assert.rejects(
    f.gh.setIssueStatus(17, 'Risolto', { guard: f.guard }),
    /fresh durable hold/,
  );
  assert.equal(
    f.calls.length,
    before,
    'No later mutation may begin after the in-flight request completes with a hold',
  );
});

test('a partial guarded lifecycle update invalidates an older cached status before reconciliation', async (t) => {
  for (const failure of ['hold', 'close503'])
    await t.test(failure, async () => {
      const calls = [];
      let resolving = false,
        held = false;
      const gh = createGitHub({
        repo: 'l2v-hub/ClinicOS',
        cwd: '/tmp',
        run: async ({ args, input }) => {
          const body = input ? JSON.parse(input) : null;
          calls.push({ args, body });
          if (
            resolving &&
            failure === 'hold' &&
            args.includes('POST') &&
            body?.labels?.includes('Risolto')
          )
            held = true;
          if (resolving && failure === 'close503' && args.includes('PATCH'))
            return response({}, { ok: false, code: 1, stderr: 'HTTP 503' });
          return response({});
        },
      });
      await gh.setIssueStatus(17, 'In progress');
      resolving = true;
      await assert.rejects(
        gh.setIssueStatus(17, 'Risolto', {
          guard: async () => {
            if (held) throw Error('Durable hold');
          },
        }),
      );
      resolving = false;
      held = false;
      await gh.setIssueStatus(17, 'In progress');
      assert.equal(
        calls.filter((call) => call.body?.labels?.includes('In progress')).length,
        2,
        'Partially changed remote labels must not retain a stale In progress cache hit',
      );
    });
});

test('actual ready and merge transports reject a fresh guard before emitting commands', async () => {
  for (const action of ['draftReady', 'mergePullRequest'])
    for (const verdict of [false, 'throw']) {
      const requests = [];
      const gh = createGitHub({
        cwd: '/tmp',
        repo: 'l2v-hub/ClinicOS',
        run: async ({ args }) => {
          requests.push(args);
          return response({});
        },
      });
      const guard = async () => {
        await Promise.resolve();
        if (verdict === 'throw') throw Error('Changed release subject');
        return false;
      };
      await assert.rejects(
        action === 'draftReady'
          ? gh.draftReady(9, { guard })
          : gh.mergePullRequest(9, 'a'.repeat(40), { guard }),
      );
      assert.deepEqual(requests, []);
    }
});

test('guard rereads cannot promote an old snapshot to a newer Contents CAS revision', async (t) => {
  for (const boundary of ['branch-await', 'guard-await'])
    for (const field of ['other batch', 'manualBatches', 'root field'])
      await t.test(`${boundary}: ${field}`, async () => {
        const original = {
          batches: [
            { id: 'target', phase: 'ready' },
            { id: 'other', progress: 1 },
          ],
          manualBatches: [{ progress: 1 }],
          operatorNote: 'original',
        };
        let remote = structuredClone(original),
          version = 'a'.repeat(40),
          changed = false,
          saving = false;
        const writes = [];
        const change = () => {
          if (changed) return;
          changed = true;
          if (field === 'other batch') remote.batches[1].progress = 2;
          else if (field === 'manualBatches') remote.manualBatches[0].progress = 2;
          else remote.operatorNote = 'New operator instruction';
          version = 'b'.repeat(40);
        };
        const gh = createGitHub({
          cwd: '/tmp',
          repo: 'l2v-hub/ClinicOS',
          run: async ({ args, input }) => {
            const route = apiPath(args);
            if (route.includes('/git/ref/heads/codex/bug-control')) {
              if (saving && boundary === 'branch-await') change();
              return response({ object: { sha: 'c'.repeat(40) } });
            }
            if (args.includes('PUT')) {
              const body = JSON.parse(input);
              writes.push(body);
              if (body.sha !== version)
                return response({}, { ok: false, code: 1, stderr: 'HTTP 409 conflict' });
              remote = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
              return response({ content: { sha: 'd'.repeat(40) } });
            }
            if (route.includes('/.codex-bug-state.json'))
              return response({
                type: 'file',
                sha: version,
                content: Buffer.from(JSON.stringify(remote)).toString('base64'),
              });
            throw Error(`Unexpected transport ${route}`);
          },
        });
        const store = gh.createStateStore();
        const old = await store.load();
        old.batches[0].phase = 'deployed';
        saving = true;
        const guard = async () => {
          if (boundary === 'guard-await') change();
          const latest = await store.load();
          assert.deepEqual(
            latest.batches[0],
            original.batches[0],
            'Target is unchanged while another owner updates state',
          );
        };
        await assert.rejects(store.save(old, { guard }), /compare-and-swap/);
        assert.equal(changed, true);
        assert.equal(writes.length, 1);
        assert.equal(
          writes[0].sha,
          'a'.repeat(40),
          'Do not adopt the guard read revision for the old body',
        );
        assert.equal(remote.batches[0].phase, 'ready');
        if (field === 'other batch') assert.equal(remote.batches[1].progress, 2);
        else if (field === 'manualBatches') assert.equal(remote.manualBatches[0].progress, 2);
        else assert.equal(remote.operatorNote, 'New operator instruction');
      });
});

test('actual durable PUT waits for a final release guard after branch inspection', async () => {
  const writes = [];
  let held = false,
    saving = false;
  const gh = createGitHub({
    cwd: '/tmp',
    repo: 'l2v-hub/ClinicOS',
    run: async ({ args }) => {
      if (args[1].includes('/git/ref/heads/')) {
        if (saving) held = true;
        return response({});
      }
      if (args.includes('PUT')) {
        writes.push(args);
        return response({ content: { sha: 'b'.repeat(40) } });
      }
      return response({
        type: 'file',
        sha: 'a'.repeat(40),
        content: Buffer.from('{}').toString('base64'),
      });
    },
  });
  const store = gh.createStateStore();
  await store.load();
  saving = true;
  await assert.rejects(
    store.save(
      { changed: true },
      {
        guard: async () => {
          if (held) throw Error('Fresh hold');
        },
      },
    ),
    /Fresh hold/,
  );
  assert.deepEqual(writes, []);
});

test('failed guarded CAS cannot retry an old state body against the revision read by its guard', async () => {
  const writes = [];
  let remote = { target: 'ready', unrelated: 'original' },
    version = 'a'.repeat(40);
  const gh = createGitHub({
    cwd: '/tmp',
    repo: 'l2v-hub/ClinicOS',
    run: async ({ args, input }) => {
      if (args[1].includes('/git/ref/heads/')) return response({});
      if (args.includes('PUT')) {
        const body = JSON.parse(input);
        writes.push(body);
        if (body.sha !== version) return response({}, { ok: false, code: 1, stderr: 'HTTP 409' });
        remote = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
        return response({ content: { sha: 'c'.repeat(40) } });
      }
      return response({
        type: 'file',
        sha: version,
        content: Buffer.from(JSON.stringify(remote)).toString('base64'),
      });
    },
  });
  const store = gh.createStateStore(),
    old = await store.load();
  old.target = 'deployed';
  const guard = async () => {
    remote.unrelated = 'Concurrent update';
    version = 'b'.repeat(40);
    await store.load();
  };
  await assert.rejects(store.save(old, { guard }), /compare-and-swap/);
  await assert.rejects(store.save(old), /compare-and-swap/);
  assert.deepEqual(
    writes.map((body) => body.sha),
    ['a'.repeat(40), 'a'.repeat(40)],
  );
  assert.deepEqual(remote, { target: 'ready', unrelated: 'Concurrent update' });
});

test('optional release guards reject explicitly invalid values at all actual transports', async () => {
  for (const guard of [null, false, 'not a function']) {
    const writes = [];
    const gh = createGitHub({
      cwd: '/tmp',
      repo: 'l2v-hub/ClinicOS',
      run: async ({ args }) => {
        if (args[0] === 'pr' || args.includes('PUT')) writes.push(args);
        if (args[1].includes('/git/ref/heads/')) return response({});
        return response({
          type: 'file',
          sha: 'a'.repeat(40),
          content: Buffer.from('{}').toString('base64'),
        });
      },
    });
    const store = gh.createStateStore();
    await store.load();
    await assert.rejects(gh.draftReady(9, { guard }), /guard must be a function/);
    await assert.rejects(
      gh.mergePullRequest(9, 'a'.repeat(40), { guard }),
      /guard must be a function/,
    );
    await assert.rejects(store.save({}, { guard }), /guard must be a function/);
    assert.deepEqual(writes, []);
  }
});

test('durable save serializes its body before any branch await can mutate the supplied object', async () => {
  let submitted, written;
  const gh = createGitHub({
    cwd: '/tmp',
    repo: 'l2v-hub/ClinicOS',
    run: async ({ args, input }) => {
      if (args[1].includes('/git/ref/heads/')) {
        if (submitted) submitted.target = 'Unverified alias mutation';
        return response({});
      }
      if (args.includes('PUT')) {
        written = JSON.parse(input);
        return response({ content: { sha: 'b'.repeat(40) } });
      }
      return response({
        type: 'file',
        sha: 'a'.repeat(40),
        content: Buffer.from('{}').toString('base64'),
      });
    },
  });
  const store = gh.createStateStore();
  await store.load();
  submitted = { target: 'Verified transition' };
  await store.save(submitted, { guard: async () => true });
  assert.equal(
    submitted.target,
    'Unverified alias mutation',
    'The test actually mutated the submitted reference',
  );
  assert.deepEqual(JSON.parse(Buffer.from(written.content, 'base64').toString('utf8')), {
    target: 'Verified transition',
  });
});

function stateBlobFixture(state = { payload: '文'.repeat(375000) }) {
  let raw, oid;
  const f = { calls: [], writes: [], failCAS: false };
  f.setRaw = (bytes) => {
    raw = Buffer.from(bytes);
    oid = createHash('sha1').update(`blob ${raw.length}\0`).update(raw).digest('hex');
    f.metadata = { type: 'file', size: raw.length, sha: oid, encoding: 'none', content: '' };
    f.blob = {
      sha: oid,
      size: raw.length,
      encoding: 'base64',
      content:
        raw
          .toString('base64')
          .match(/.{1,60}/g)
          ?.join('\n') ?? '',
    };
  };
  f.setRaw(Buffer.from(JSON.stringify(state, null, 2) + '\n'));
  f.run = async (call) => {
    f.calls.push(call);
    const endpoint = call.args[1];
    if (endpoint.includes('/git/ref/heads/')) return response({ object: { sha: 'a'.repeat(40) } });
    if (call.args.includes('PUT')) {
      const body = JSON.parse(call.input);
      f.writes.push(body);
      if (f.failCAS || body.sha !== oid)
        return response({}, { ok: false, code: 1, stderr: 'HTTP 409 conflict' });
      f.setRaw(Buffer.from(body.content, 'base64'));
      return response({ content: { sha: oid } });
    }
    if (endpoint.includes('/contents/.codex-bug-state.json')) return response(f.metadata);
    if (endpoint.includes('/git/blobs/')) {
      assert.ok(endpoint.endsWith('/' + f.metadata.sha));
      assert.equal(call.maxOutputBytes, 16 * 1024 * 1024);
      return response(f.blob);
    }
    assert.fail('Unexpected state endpoint ' + endpoint);
  };
  f.store = createGitHub({ cwd: '/tmp', repo: 'l2v-hub/ClinicOS', run: f.run }).createStateStore();
  return f;
}

test('large durable state loads from authenticated blob SHA and preserves Contents identity for CAS', async () => {
  const state = {
    schemaVersion: 1,
    repository: 'l2v-hub/ClinicOS',
    batches: [],
    payload: '文'.repeat(375000),
  };
  const f = stateBlobFixture(state);
  assert.ok(f.metadata.size > 1024 * 1024);
  const oldSHA = f.metadata.sha;
  assert.deepEqual(await f.store.load(), state);
  assert.equal(f.calls.filter((c) => c.args[1].includes('/git/blobs/')).length, 1);
  await f.store.save({ ...state, reconciled: true });
  assert.equal(f.writes[0].sha, oldSHA);
  assert.notEqual(f.metadata.sha, oldSHA);
  assert.equal((await f.store.load()).reconciled, true);
});

test('read-only dashboard uses the same large-state blob decoder without branch initialization or writes', async () => {
  const state = { payload: '文'.repeat(375000) };
  const f = stateBlobFixture(state);
  const github = createGitHub({ cwd: '/tmp', repo: 'l2v-hub/ClinicOS', run: f.run });
  assert.deepEqual(await github.readDashboardState(), state);
  assert.ok(
    f.calls.every((call) => !call.args[1].includes('/git/ref/') && !call.args.includes('-X')),
  );
});

test('durable state rejects invalid blob metadata, bytes and digest before authorizing any save', async () => {
  const cases = [
    (f) => (f.metadata.type = 'symlink'),
    (f) => (f.metadata.target = 'elsewhere'),
    (f) => (f.metadata.submodule_git_url = 'https://example.invalid/repo'),
    (f) => (f.metadata.sha = 'invalid-sha'),
    (f) => (f.metadata.size = MAX_DURABLE_STATE_BYTES + 1),
    (f) => (f.metadata.size = 1.5),
    (f) => delete f.metadata.size,
    (f) => (f.metadata.content = 'unexpected-inline-body'),
    (f) => (f.metadata.encoding = 'utf8'),
    (f) => (f.blob.sha = 'f'.repeat(40)),
    (f) => f.blob.size++,
    (f) => (f.blob.encoding = 'none'),
    (f) => (f.blob.content += '@'),
    (f) => {
      f.blob.content = Buffer.from('x'.repeat(f.metadata.size)).toString('base64');
    },
    (f) => {
      f.blob.size = f.metadata.size;
      f.blob.content = Buffer.from('{}').toString('base64');
    },
    (f) => f.setRaw(Buffer.from([123, 34, 120, 34, 58, 34, 255, 34, 125])),
    (f) => f.setRaw(Buffer.from('not valid JSON')),
  ];
  for (const change of cases) {
    const f = stateBlobFixture({ payload: 'synthetic' });
    change(f);
    await assert.rejects(f.store.load());
    await assert.rejects(f.store.save({ shouldNotSave: true }), /load durable state/);
    assert.equal(f.writes.length, 0);
  }
});

test('explicit inline state metadata validates canonical base64, supplied size and UTF8 without requiring blob I/O', async () => {
  const state = { counter: 1 };
  const f = stateBlobFixture(state);
  f.metadata.encoding = 'base64';
  f.metadata.content = f.blob.content;
  assert.deepEqual(await f.store.load(), state);
  assert.equal(
    f.calls.some((c) => c.args[1].includes('/git/blobs/')),
    false,
  );
  for (const change of [
    (f) => f.metadata.size++,
    (f) => (f.metadata.content += '@'),
    (f) => (f.metadata.encoding = 'unexpected'),
  ]) {
    const invalid = stateBlobFixture(state);
    invalid.metadata.encoding = 'base64';
    invalid.metadata.content = invalid.blob.content;
    change(invalid);
    await assert.rejects(invalid.store.load());
  }
});

test('state save rejects >8MiB before any mutation/guard and exact8MiB remains reloadable', async () => {
  const f = stateBlobFixture({});
  await f.store.load();
  const priorCalls = f.calls.length;
  let guards = 0;
  await assert.rejects(
    f.store.save(
      { payload: 'x'.repeat(MAX_DURABLE_STATE_BYTES) },
      {
        guard: async () => {
          guards++;
        },
      },
    ),
    /8 MiB save bound/,
  );
  assert.equal(guards, 0);
  assert.equal(f.writes.length, 0);
  assert.equal(f.calls.length, priorCalls);
  const overhead = Buffer.byteLength(JSON.stringify({ payload: '' }, null, 2) + '\n');
  const exact = { payload: 'x'.repeat(MAX_DURABLE_STATE_BYTES - overhead) };
  await f.store.save(exact);
  assert.equal(f.metadata.size, MAX_DURABLE_STATE_BYTES);
  assert.equal(
    Buffer.byteLength(JSON.stringify(await f.store.load(), null, 2) + '\n'),
    MAX_DURABLE_STATE_BYTES,
  );
});

test('blob-loaded state CAS failure retains the original metadata SHA and never retries without it', async () => {
  const f = stateBlobFixture();
  await f.store.load();
  const expected = f.metadata.sha;
  f.failCAS = true;
  await assert.rejects(f.store.save({ attempt: 1 }), /compare-and-swap/);
  await assert.rejects(f.store.save({ attempt: 2 }), /compare-and-swap/);
  assert.deepEqual(
    f.writes.map((body) => body.sha),
    [expected, expected],
  );
});

const entityState = () => ({
  schemaVersion: 1,
  repository: 'l2v-hub/ClinicOS',
  batches: [
    { id: 'batch-a', implementation: [{ round: 1, status: 'running' }] },
    { id: 'batch-b', implementation: [] },
  ],
  manualBatches: [{ id: 'manual-a', status: 'planned' }],
  standaloneReviews: [{ id: 'standalone-a', reviews: [] }],
});
const entityValidator = (state) => {
  assert.equal(state.repository, 'l2v-hub/ClinicOS');
  for (const key of ['batches', 'manualBatches', 'standaloneReviews']) {
    assert.ok(Array.isArray(state[key]));
    assert.equal(new Set(state[key].map((item) => item.id)).size, state[key].length);
  }
  assert.notEqual(
    state.invalidOwnership,
    true,
    'Full merged ownership validator rejects illegal combinations',
  );
};

test('explicit disjoint rebase saves a NEW validated body and preserves nested caller object/array references', async () => {
  const f = stateBlobFixture(entityState()),
    other = createGitHub({ cwd: '/tmp', repo: 'l2v-hub/ClinicOS', run: f.run }).createStateStore();
  const ours = await f.store.load(),
    theirs = await other.load();
  const arrays = [ours.batches, ours.manualBatches, ours.standaloneReviews],
    batch = ours.batches[0],
    attempts = batch.implementation,
    attempt = attempts[0],
    manual = ours.manualBatches[0];
  attempt.status = 'passed';
  theirs.batches[1].remote = 'retained';
  theirs.manualBatches[0].status = 'complete';
  theirs.standaloneReviews.push({ id: 'standalone-b', reviews: [] });
  theirs.updatedAt = 'remote';
  await other.save(theirs);
  const remoteSHA = f.metadata.sha;
  let guards = 0,
    validations = 0;
  await f.store.save(ours, {
    rebaseIndependentSubjects: (state) => {
      validations++;
      entityValidator(state);
    },
    guard: async () => {
      guards++;
      assert.equal(attempt.status, 'passed');
    },
  });
  assert.equal(guards, 2);
  assert.equal(validations, 2);
  assert.equal(f.writes.at(-1).sha, remoteSHA);
  const old = JSON.parse(Buffer.from(f.writes.at(-2).content, 'base64')),
    fresh = JSON.parse(Buffer.from(f.writes.at(-1).content, 'base64'));
  assert.equal(old.batches[1].remote, undefined);
  assert.equal(fresh.batches[1].remote, 'retained');
  assert.equal(fresh.batches[0].implementation[0].status, 'passed');
  assert.equal(fresh.standaloneReviews.length, 2);
  assert.equal(ours.batches, arrays[0]);
  assert.equal(ours.manualBatches, arrays[1]);
  assert.equal(ours.standaloneReviews, arrays[2]);
  assert.equal(ours.batches[0], batch);
  assert.equal(batch.implementation, attempts);
  assert.equal(attempts[0], attempt);
  assert.equal(ours.manualBatches[0], manual);
  assert.equal(manual.status, 'complete');
  attempt.afterRebase = 'original reference still live';
  await f.store.save(ours);
  assert.equal(
    (await f.store.load()).batches[0].implementation[0].afterRebase,
    'original reference still live',
  );
});

test('strict default still rejects disjoint409 and opt-in rejects same entity, conflicting root fields and invalid merged state', async () => {
  for (const kind of ['strict', 'same-entity', 'root-field', 'invalid-merge', 'duplicate-id']) {
    const f = stateBlobFixture(entityState()),
      other = createGitHub({
        cwd: '/tmp',
        repo: 'l2v-hub/ClinicOS',
        run: f.run,
      }).createStateStore();
    const a = await f.store.load(),
      b = await other.load();
    a.batches[0].local = true;
    if (kind === 'same-entity') b.batches[0].remote = true;
    else if (kind === 'root-field') {
      a.shared = { local: true };
      b.shared = { remote: true };
    } else if (kind === 'invalid-merge') b.invalidOwnership = true;
    else if (kind === 'duplicate-id') b.manualBatches.push({ ...b.manualBatches[0] });
    else b.batches[1].remote = true;
    await other.save(b);
    let guards = 0;
    const options = {
      guard: async () => {
        guards++;
      },
      ...(kind === 'strict' ? {} : { rebaseIndependentSubjects: entityValidator }),
    };
    await assert.rejects(f.store.save(a, options));
    assert.equal(guards, 1);
    assert.equal(f.writes.length, 2, 'No second PUT after unsafe conflict/validation');
    assert.equal(
      JSON.parse(Buffer.from(f.blob.content.replace(/\n/g, ''), 'base64')).batches[0].local,
      undefined,
    );
  }
});

test('rebase reruns authorization guard and refuses nonce/subject changes instead of replaying stale authority', async () => {
  const f = stateBlobFixture(entityState()),
    other = createGitHub({ cwd: '/tmp', repo: 'l2v-hub/ClinicOS', run: f.run }).createStateStore();
  const a = await f.store.load(),
    b = await other.load();
  a.batches[0].local = true;
  b.batches[1].remote = true;
  await other.save(b);
  let guardCalls = 0;
  await assert.rejects(
    f.store.save(a, {
      rebaseIndependentSubjects: entityValidator,
      guard: async () => {
        if (++guardCalls === 2) throw new Error('Synthetic authorization revoked');
      },
    }),
    /revoked/,
  );
  assert.equal(guardCalls, 2);
  assert.equal(f.writes.length, 2, 'Retry guard prevents second PUT');
  const g = stateBlobFixture(entityState()),
    peer = createGitHub({ cwd: '/tmp', repo: 'l2v-hub/ClinicOS', run: g.run }).createStateStore();
  const x = await g.store.load(),
    y = await peer.load();
  x.standaloneReviews[0].claimId = 'old-claim';
  y.standaloneReviews[0].claimId = 'new-claim';
  await peer.save(y);
  await assert.rejects(
    g.store.save(x, { rebaseIndependentSubjects: entityValidator }),
    (error) => error.code === 'state-rebase-conflict',
  );
});

test('rebase uses fresh serialized snapshots even when guards reload a third disjoint state, with bounded retries', async () => {
  const f = stateBlobFixture(entityState()),
    other = createGitHub({ cwd: '/tmp', repo: 'l2v-hub/ClinicOS', run: f.run }).createStateStore();
  const a = await f.store.load(),
    b = await other.load();
  a.batches[0].local = true;
  b.batches[1].remote = 1;
  await other.save(b);
  let guards = 0;
  await f.store.save(a, {
    rebaseIndependentSubjects: entityValidator,
    guard: async () => {
      if (++guards === 2) {
        const third = createGitHub({
          cwd: '/tmp',
          repo: 'l2v-hub/ClinicOS',
          run: f.run,
        }).createStateStore();
        const latest = await third.load();
        latest.manualBatches[0].remote = 2;
        await third.save(latest);
        await f.store.load();
      }
    },
  });
  assert.equal(guards, 3);
  const final = await f.store.load();
  assert.equal(final.batches[0].local, true);
  assert.equal(final.batches[1].remote, 1);
  assert.equal(final.manualBatches[0].remote, 2);
  const g = stateBlobFixture(entityState());
  const value = await g.store.load();
  value.batches[0].local = true;
  g.failCAS = true;
  await assert.rejects(
    g.store.save(value, { rebaseIndependentSubjects: entityValidator }),
    (error) => error.code === 'state-cas-conflict',
  );
  assert.equal(g.writes.length, 4);
});

test('capacity counts simultaneous running reviews and Codex QA across every entity collection before any PUT or guard', async () => {
  const state = {
    batches: [{ id: 'a', reviews: [{ status: 'running' }], externalReview: { status: 'running' } }],
    manualBatches: [{ id: 'b', reviews: [{ status: 'running' }] }],
    standaloneReviews: [{ id: 'c', reviews: [], codexFinalReview: { status: 'running' } }],
  };
  assert.equal(
    pendingResultBytes(state.batches[0]),
    RESULT_RESERVATION_BYTES,
    'Do not double count one external reservation',
  );
  const overhead = Buffer.byteLength(JSON.stringify({ ...state, payload: '' }, null, 2) + '\n');
  state.payload = 'x'.repeat(
    MAX_DURABLE_STATE_BYTES - overhead - 3 * RESULT_RESERVATION_BYTES - 512,
  );
  const f = stateBlobFixture({});
  await f.store.load();
  await f.store.save(state);
  const writes = f.writes.length,
    calls = f.calls.length;
  let guards = 0;
  state.standaloneReviews.push({ id: 'd', reviews: [{ status: 'running' }] });
  await assert.rejects(
    f.store.save(state, {
      guard: async () => {
        guards++;
      },
    }),
    (error) => error.code === 'state-capacity-exhausted',
  );
  assert.equal(f.writes.length, writes);
  assert.equal(f.calls.length, calls);
  assert.equal(guards, 0);
  state.standaloneReviews.pop();
  state.batches[0].reviews[0].status = 'approved';
  state.batches[0].externalReview.status = 'finished';
  state.batches[0].reviewReports = {
    'claude-review-1.json': JSON.stringify({
      subject_sha: 'a'.repeat(40),
      verdict: 'approved',
      summary: '漢'.repeat(50000),
      findings: [],
    }),
  };
  await f.store.save(state);
});

test('diagnostics expose only owned bounded codes and preserve known cause chains', () => {
  const privateError = new Error('Synthetic private stderr must not be exposed');
  privateError.code = 'arbitrary-untrusted-code';
  assert.equal(controllerFailureCode(privateError), 'controller-execution-failed');
  const cause = Object.assign(new Error('Private underlying text'), {
    code: 'state-capacity-exhausted',
  });
  assert.equal(controllerFailureCode(new Error('wrapper', { cause })), 'state-capacity-exhausted');
});

test('F5 state writes distinguish confirmed409, definite502 and uncertain timeout without blind retry', async () => {
  for (const [result, expected] of [
    [{ ok: false, code: 1, stderr: 'HTTP 409 conflict', stdout: '{}' }, 'state-cas-conflict'],
    [{ ok: false, code: 1, stderr: 'HTTP 502', stdout: '{}' }, 'state-write-failed'],
    [{ ok: false, error: 'timeout', stderr: '', stdout: '' }, 'state-write-uncertain'],
  ]) {
    let puts = 0;
    const gh = createGitHub({
      repo: 'l2v-hub/ClinicOS',
      cwd: '/tmp',
      run: async ({ args }) => {
        if (args.includes('PUT')) {
          puts++;
          return result;
        }
        if (args[1].includes('/contents/'))
          return response({}, { ok: false, code: 1, stderr: 'HTTP 404' });
        return response({ object: { sha: 'a'.repeat(40) } });
      },
    });
    const store = gh.createStateStore();
    await store.load();
    await assert.rejects(
      store.save({ schemaVersion: 1, repository: 'l2v-hub/ClinicOS', batches: [] }),
      (error) => controllerFailureCode(error) === expected,
    );
    assert.equal(puts, 1);
  }
});

test('F1/F3 native human approval requires current head, nonauthor User and enforced stale-dismissal protection', async () => {
  const head = 'a'.repeat(40);
  let review = {
    state: 'APPROVED',
    commit_id: head,
    submitted_at: '2026-10-18T01:00:00Z',
    user: { login: 'human', type: 'User' },
  };
  let protectedMain = true;
  const gh = createGitHub({
    repo: 'l2v-hub/ClinicOS',
    cwd: '/tmp',
    run: async ({ args }) => {
      const route = args[1];
      if (route.endsWith('/pulls/81'))
        return response({ state: 'open', head: { sha: head }, user: { login: 'author' } });
      if (route.includes('/reviews?')) return response([[review]]);
      if (route.endsWith('/protection'))
        return protectedMain
          ? response({
              enforce_admins: { enabled: true },
              required_pull_request_reviews: {
                required_approving_review_count: 1,
                dismiss_stale_reviews: true,
              },
            })
          : response({}, { ok: false, code: 1, stderr: 'HTTP 404' });
      if (route.includes('/permission')) return response({ permission: 'write' });
      if (route.endsWith('/rules/branches/main'))
        return response([{ type: 'required_status_checks' }]);
      assert.fail(route);
    },
  });
  assert.equal((await gh.nativeReviewAuthorization(81, head)).humanApproved, true);
  assert.equal(
    (await gh.nativeReviewAuthorization(81, head, { excludedLogins: ['human'] })).humanApproved,
    false,
  );
  for (const mutation of [
    { user: { login: 'author', type: 'User' } },
    { user: { login: 'automation', type: 'Bot' } },
    { commit_id: 'b'.repeat(40) },
    { state: 'DISMISSED' },
  ]) {
    const original = review;
    review = { ...review, ...mutation };
    assert.equal((await gh.nativeReviewAuthorization(81, head)).humanApproved, false);
    review = original;
  }
  protectedMain = false;
  assert.equal((await gh.nativeReviewAuthorization(81, head)).humanApproved, false);
  await assert.rejects(gh.nativeReviewAuthorization(81, 'b'.repeat(40)), /subject changed/);
});

test('GitHub failure semantics distinguish positive status evidence, default POST and merge uncertainty without raw diagnostics', async () => {
  const { githubOperationError, githubApiOperation } = await import('../../src/bug-pipeline/github.mjs');
  assert.equal(githubApiOperation({ body: { body: 'notice' } }), 'mutation');
  assert.equal(githubApiOperation({}), 'read');
  assert.equal(githubApiOperation({ method: 'GET', body: {} }), 'read');
  for (const status of [401, 403, 404, 422]) {
    const error = githubOperationError({ stderr: `gh: denied (HTTP ${status})` });
    assert.equal(error.code, 'github-read-rejected');
    assert.equal(error.httpStatus, status);
  }
  for (const status of [408, 429, 500, 503])
    assert.equal(githubOperationError({ stderr: `gh: rejected (HTTP ${status})` }).code, 'github-read-transient');
  assert.equal(githubOperationError({ stderr: 'gh: API rate limit exceeded (HTTP 403)' }).code,
    'github-read-transient');
  assert.equal(githubOperationError({ error: 'timeout' }).code, 'github-read-transient');
  const unknown = githubOperationError({ stderr: 'synthetic patient 503 bearer PRIVATE_TOKEN ' + 'x'.repeat(100000) });
  assert.equal(unknown.httpStatus, null);
  assert.equal(unknown.code, 'github-read-failed');
  assert.ok(JSON.stringify(unknown).length < 300);
  assert.doesNotMatch(JSON.stringify(unknown), /PRIVATE_TOKEN|patient/);
  for (const [response, expected] of [
    [{ stderr: 'gh: protected (HTTP 405)' }, 'github-write-rejected'],
    [{ error: 'timeout' }, 'github-write-uncertain'],
    [{ stderr: 'gh: upstream (HTTP 503)' }, 'github-write-uncertain'],
  ]) {
    const calls = [];
    const github = createGitHub({ repo: 'l2v-hub/ClinicOS', cwd: '/synthetic',
      run: async (call) => { calls.push(call); return { ok: false, ...response }; } });
    await assert.rejects(github.mergePullRequest(81, 'a'.repeat(40)), { code: expected });
    assert.equal(calls.length, 1, 'No blind second merge attempt');
    assert.equal(calls[0].timeoutMs, 30000);
    await assert.rejects(github.commentPR(81, 'Synthetic notice'), { code: expected });
    assert.ok(calls.at(-1).input, 'Comment request carries a mutation body');
  }
});
