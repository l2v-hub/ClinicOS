import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_TARGET,
  DEMO_SOURCE_POLICIES,
  verifyDemoPreflight,
} from '../../src/bug-pipeline/demo-deployment.mjs';
import { createGitHub } from '../../src/bug-pipeline/github.mjs';
import {
  releaseBatch,
  selectAutoReleaseBatch,
  publicationComplete,
  recordDeployment,
  ReleaseGateError,
  publishDeploymentCompletion,
  recoverExactRelease,
} from '../../src/bug-pipeline/release.mjs';
import { feedbackFingerprint, sha256 } from '../../src/bug-pipeline/contracts.mjs';

const sha = 'a'.repeat(40);
const mergeSha = 'b'.repeat(40);
const screenshotPath = 'artifacts/task-validation/bug-batch-5/evidence/issue-5.png';
const tracePath = 'artifacts/task-validation/bug-batch-5/evidence/issue-5.zip';
const screenshot = { path: screenshotPath, sha256: '1'.repeat(64), bytes: 16 };
const trace = { path: tracePath, sha256: '2'.repeat(64), bytes: 17 };
const recorded = [{ issue: 5, files: { screenshot, trace } }];
const report = JSON.stringify({
  subject_sha: sha,
  verdict: 'approved',
  summary: 'The implementation meets the accepted plan.',
  findings: [],
});

function fixture(scope = ['frontend/src/Patient.jsx']) {
  const feedback = {
    number: 9,
    url: 'https://github.com/l2v-hub/ClinicOS/pull/9',
    state: 'OPEN',
    head: sha,
    headRef: 'codex/bug-batch-5',
    headRepo: 'l2v-hub/ClinicOS',
    headIsFork: false,
    baseRef: 'main',
    isDraft: false,
    mergeCommitSha: null,
    comments: [],
    unresolved: false,
    changesRequested: false,
  };
  const batch = {
    id: 'bug-batch-5',
    branch: 'codex/bug-batch-5',
    issues: [5],
    plan: {
      title: 'Fix patient list display',
      feature: 'Patient list',
      rationale: 'The list hides rows.',
      execution: {
        difficulty: 'low',
        mode: 'delegate',
        reason: 'Bounded, independently testable change.',
      },
      analysis: 'Patient rows should be visible.',
      issues: [5],
      scope,
      acceptance: [{ issue: 5, criteria: ['Rows render'] }],
      tasks: [
        {
          title: 'Render rows',
          files: [scope[0]],
          steps: ['Update component'],
        },
      ],
      verification: [
        { command: 'npm', args: ['--prefix', 'frontend', 'run', 'build'] },
        { command: 'node', args: ['--test', 'patient.test.mjs'] },
      ],
      evidence: [{ issue: 5, screenshot: screenshotPath, trace: tracePath, video: '' }],
    },
    phase: 'ready',
    implementation: [{ round: 1, status: 'passed' }],
    reviews: [{ round: 1, status: 'approved', subjectSha: sha }],
    sha,
    approvedSha: sha,
    pr: { number: 9, url: feedback.url },
    evidence: recorded,
    reviewReports: { 'claude-review-1.json': report },
    reviewLedger: {
      rounds: [
        {
          round: 1,
          subject_sha: sha,
          verdict: 'approved',
          review_sha256: sha256(report),
        },
      ],
    },
    feedbackFingerprint: feedbackFingerprint(feedback),
  };
  const state = {
    schemaVersion: 1,
    repository: 'l2v-hub/ClinicOS',
    batches: [batch],
  };
  let saved = state;
  const calls = [];
  const github = {
    async setIssueStatus(number, status) {
      calls.push(['status', number, status]);
    },
    async viewIssue(number) {
      return { number, state: 'open', comments: [] };
    },
    async reviewFeedback() {
      return structuredClone(feedback);
    },
    async requiredChecks() {
      return { ok: true, details: ['build: SUCCESS'] };
    },
    async readFileAtRevision(file) {
      calls.push(['read', file]);
      if (file.endsWith('evidence-manifest.json')) return { content: JSON.stringify(recorded) };
      if (file === screenshotPath) return screenshot;
      if (file === tracePath) return trace;
      throw new Error(`Unexpected evidence path ${file}`);
    },
    async draftReady() {
      calls.push(['ready']);
    },
    async mergePullRequest(number, subject) {
      calls.push(['merge', number, subject]);
      return { mergeSha, reviewedSha: subject };
    },
    async commentIssue(number, body) {
      calls.push(['comment', number, body]);
    },
  };
  const store = {
    async load() {
      return structuredClone(saved);
    },
    async save(value) {
      calls.push(['save']);
      saved = structuredClone(value);
    },
  };
  return {
    batch,
    feedback,
    state,
    github,
    store,
    calls,
    getSaved: () => saved,
  };
}

const configured = { botToken: true, vercel: true, railway: true };

test('release dry-run verifies persisted proof and never merges', async () => {
  const f = fixture();
  const result = await releaseBatch({
    repo: f.state.repository,
    github: f.github,
    store: f.store,
    batchId: f.batch.id,
    reviewedSha: sha,
    configured,
  });
  assert.equal(result.status, 'ready-to-release');
  assert.equal(
    f.calls.some(([call]) => call === 'merge'),
    false,
  );
});

test('release execution rechecks then merges only the approved exact SHA', async () => {
  const f = fixture();
  const result = await releaseBatch({
    repo: f.state.repository,
    github: f.github,
    store: f.store,
    batchId: f.batch.id,
    reviewedSha: sha,
    configured,
    execute: true,
  });
  assert.equal(result.status, 'merged');
  assert.deepEqual(
    f.calls.filter(([call]) => call === 'merge'),
    [['merge', 9, sha]],
  );
  assert.equal(f.getSaved().batches[0].release.mergeSha, mergeSha);
});

test('release blocks stale SHA, missing review proof, and absent required deployment credentials', async (t) => {
  for (const [label, mutate, env] of [
    [
      'stale SHA',
      (f) => {
        f.batch.approvedSha = 'c'.repeat(40);
      },
      configured,
    ],
    [
      'review report digest',
      (f) => {
        f.batch.reviewReports['claude-review-1.json'] = '{}';
      },
      configured,
    ],
    ['missing Vercel config', () => {}, { ...configured, vercel: false }],
    [
      'missing Railway config for runtime',
      (f) => {
        f.batch.plan.scope = ['clinicos-ai-runtime/main.py'];
        f.batch.plan.tasks[0].files = ['clinicos-ai-runtime/main.py'];
      },
      { ...configured, railway: false },
    ],
    [
      'pending checks',
      (f) => {
        f.github.requiredChecks = async () => ({
          ok: false,
          details: ['build: pending'],
        });
      },
      configured,
    ],
    [
      'fork PR',
      (f) => {
        f.github.reviewFeedback = async () => ({
          ...f.feedback,
          headIsFork: true,
        });
      },
      configured,
    ],
  ]) {
    await t.test(label, async () => {
      const f = fixture();
      mutate(f);
      await assert.rejects(
        () =>
          releaseBatch({
            repo: f.state.repository,
            github: f.github,
            store: f.store,
            batchId: f.batch.id,
            reviewedSha: sha,
            configured: env,
          }),
        ReleaseGateError,
      );
      assert.equal(
        f.calls.some(([call]) => call === 'merge'),
        false,
      );
    });
  }
});

test('release blocks changed evidence digest before mutation', async () => {
  const f = fixture();
  f.github.readFileAtRevision = async (file) =>
    file.endsWith('evidence-manifest.json')
      ? { content: JSON.stringify(recorded) }
      : { sha256: 'f'.repeat(64), bytes: file === screenshotPath ? 16 : 17 };
  await assert.rejects(
    () =>
      releaseBatch({
        repo: f.state.repository,
        github: f.github,
        store: f.store,
        batchId: f.batch.id,
        reviewedSha: sha,
        configured,
      }),
    /digest mismatch/,
  );
  assert.equal(
    f.calls.some(([call]) => call === 'merge'),
    false,
  );
});

test('verified deployment records true links then marks the issue resolved', async () => {
  const f = fixture();
  f.batch.release = {
    status: 'merged',
    reviewedSha: sha,
    mergeSha,
    prNumber: 9,
    deployments: { frontend: true, backend: false },
  };
  f.store.load = async () => structuredClone(f.state);
  f.store.save = async (value) => {
    f.state.batches[0] = structuredClone(value.batches[0]);
  };
  const result = await recordDeployment({
    repo: f.state.repository,
    github: f.github,
    store: f.store,
    batchId: f.batch.id,
    mergeSha,
    vercelUrl: 'https://clinicos-eosin.vercel.app',
  });
  assert.equal(result.status, 'deployed');
  const comment = f.calls.find(([call]) => call === 'comment');
  assert.match(comment[2], /clinicos-eosin\.vercel\.app/);
  assert.match(comment[2], /Rilascio verificato/);
  assert.doesNotMatch(comment[2], /issue chiusa|already closed/i);
  assert.deepEqual(f.calls.filter(([type]) => type === 'status').at(-1), ['status', 5, 'Risolto']);
});

test('completion comment failure never closes an issue and terminal publication retries without model work', async () => {
  const f = fixture();
  f.batch.release = {
    status: 'deployed',
    reviewedSha: sha,
    mergeSha,
    deployment: {
      status: 'deployed',
      reviewedSha: sha,
      mergeSha,
      vercelUrl: 'https://clinicos-eosin.vercel.app',
    },
  };
  const post = f.github.commentIssue;
  f.github.commentIssue = async () => {
    throw new Error('POST unavailable');
  };
  await assert.rejects(
    publishDeploymentCompletion({ batch: f.batch, github: f.github }),
    /POST unavailable/,
  );
  assert.equal(
    f.calls.some(([call]) => call === 'status'),
    false,
  );
  f.github.commentIssue = post;
  await publishDeploymentCompletion({ batch: f.batch, github: f.github });
  assert.equal(f.calls.at(-1)[0], 'status');
  delete f.batch.release.deployment.vercelUrl;
  const before = f.calls.length;
  await assert.rejects(
    publishDeploymentCompletion({ batch: f.batch, github: f.github }),
    /confirmed deployment links/,
  );
  assert.equal(f.calls.length, before);
});

const railwayUrl = 'https://github.com/l2v-hub/ClinicOS/actions/runs/123';
function backendFixture() {
  const f = fixture(['backend/src/routes/patients.ts']);
  f.production = {
    sha: mergeSha,
    runUrl: 'https://github.com/l2v-hub/ClinicOS/actions/runs/321',
    proofSha256: '9'.repeat(64),
  };
  f.github.verifyProductionBackend = async ({ deploymentSha }) => ({
    ...f.production,
    sha: deploymentSha,
  });
  const proof = {
    receipt: { mergeSha },
    reviewedSha: sha,
    runUrl: railwayUrl,
    artifactDigest: `sha256:${'7'.repeat(64)}`,
    receiptSha256: '8'.repeat(64),
  };
  f.github.verifyDemoPreflight = async () => {
    f.calls.push(['demo-preflight']);
    return {};
  };
  f.github.verifyDemoRelease = async () => {
    f.calls.push(['demo-live']);
    return proof;
  };
  return { ...f, proof };
}

test('backend merge requires actual trusted demo preflight, not production credential presence', async () => {
  const f = backendFixture();
  f.github.verifyDemoPreflight = async () => {
    throw new Error('No trusted current-main preflight');
  };
  await assert.rejects(
    releaseBatch({
      repo: f.state.repository,
      github: f.github,
      store: f.store,
      batchId: f.batch.id,
      reviewedSha: sha,
      configured,
      execute: true,
    }),
    /preflight/,
  );
  assert.equal(
    f.calls.some(([call]) => call === 'merge'),
    false,
  );
});

test('production-only successful URL cannot record deployment or close backend issues', async () => {
  const f = backendFixture();
  f.batch.release = { status: 'merged', mergeSha, reviewedSha: sha };
  f.github.verifyDemoRelease = async () => {
    throw new Error('No live exact-SHA demo proof');
  };
  await assert.rejects(
    recordDeployment({
      repo: f.state.repository,
      github: f.github,
      store: f.store,
      batchId: f.batch.id,
      mergeSha,
      railwayRunUrl: railwayUrl,
    }),
    /demo proof/,
  );
  assert.equal(
    f.calls.some(([call]) => call === 'status'),
    false,
  );
  assert.equal(f.getSaved().batches[0].release.status, 'merged');
});

test('verified demo receipt is durable and rechecked before backend issue closure', async () => {
  const f = backendFixture();
  f.batch.release = { status: 'merged', mergeSha, reviewedSha: sha };
  const result = await recordDeployment({
    repo: f.state.repository,
    github: f.github,
    store: f.store,
    batchId: f.batch.id,
    mergeSha,
    railwayRunUrl: railwayUrl,
  });
  assert.equal(result.status, 'deployed');
  assert.deepEqual(f.getSaved().batches[0].release.deployment.demo, f.proof);
  assert.equal(f.calls.filter(([call]) => call === 'demo-live').length, 2);
  assert.deepEqual(
    f.calls.filter(([call]) => call === 'status'),
    [['status', 5, 'Risolto']],
  );
});

test('legacy backend deployment without demo proof cannot publish completion', async () => {
  const f = backendFixture();
  f.batch.release = {
    status: 'deployed',
    mergeSha,
    reviewedSha: sha,
    deployment: {
      status: 'deployed',
      mergeSha,
      reviewedSha: sha,
      railwayRunUrl: railwayUrl,
    },
  };
  await assert.rejects(
    publishDeploymentCompletion({ batch: f.batch, github: f.github }),
    /demo deployment receipt/,
  );
  assert.equal(
    f.calls.some(([call]) => call === 'status'),
    false,
  );
});

test('durable release hold blocks automatic choice, direct merge and recording', async () => {
  const f = backendFixture();
  f.batch.releaseHold = {
    reason: 'Verify mandatory demo target before release',
  };
  assert.equal(selectAutoReleaseBatch(f.state), null);
  await assert.rejects(
    releaseBatch({
      repo: f.state.repository,
      github: f.github,
      store: f.store,
      batchId: f.batch.id,
      reviewedSha: sha,
      configured,
      execute: true,
    }),
    /releaseHold/,
  );
  f.batch.release = { status: 'merged', mergeSha, reviewedSha: sha };
  await assert.rejects(
    recordDeployment({
      repo: f.state.repository,
      github: f.github,
      store: f.store,
      batchId: f.batch.id,
      mergeSha,
      railwayRunUrl: railwayUrl,
    }),
    /releaseHold/,
  );
  assert.equal(
    f.calls.some(([call]) => call === 'merge' || call === 'status'),
    false,
  );
});

test('hold applied during remote premerge preflight blocks final merge without resetting ledgers', async () => {
  const f = backendFixture();
  let count = 0;
  f.github.verifyDemoPreflight = async () => {
    if (++count === 2) f.batch.releaseHold = 'Await actual deployment approval';
  };
  await assert.rejects(
    releaseBatch({
      repo: f.state.repository,
      github: f.github,
      store: f.store,
      batchId: f.batch.id,
      reviewedSha: sha,
      configured,
      execute: true,
    }),
    /releaseHold/,
  );
  assert.equal(
    f.calls.some(([call]) => call === 'merge'),
    false,
  );
  assert.equal(f.batch.reviews.length, 1);
  assert.equal(f.batch.implementation.length, 1);
});

test('hold applied during live proof verification blocks deployment record and closure', async () => {
  const f = backendFixture();
  f.batch.release = { status: 'merged', mergeSha, reviewedSha: sha };
  f.github.verifyDemoRelease = async () => {
    f.batch.releaseHold = true;
    return f.proof;
  };
  await assert.rejects(
    recordDeployment({
      repo: f.state.repository,
      github: f.github,
      store: f.store,
      batchId: f.batch.id,
      mergeSha,
      railwayRunUrl: railwayUrl,
    }),
    /releaseHold/,
  );
  assert.equal(
    f.calls.some(([call]) => call === 'status'),
    false,
  );
});

test('hold added while posting completion comment prevents the final issue closure', async () => {
  const f = backendFixture();
  f.batch.release = { status: 'merged', mergeSha, reviewedSha: sha };
  f.github.commentIssue = async () => {
    const current = f.getSaved();
    current.batches[0].releaseHold = true;
  };
  await assert.rejects(
    recordDeployment({
      repo: f.state.repository,
      github: f.github,
      store: f.store,
      batchId: f.batch.id,
      mergeSha,
      railwayRunUrl: railwayUrl,
    }),
    /releaseHold/,
  );
  assert.equal(
    f.calls.some(([call]) => call === 'status'),
    false,
  );
});

// Real GitHub adapter; only the HTTP command transport is synthetic. These tests exercise
// the same view/read, comment, label/retry and close boundaries used by live publication.
function realPublicationFixture({
  after,
  change = () => {},
  close503 = false,
  failGuardRead = false,
} = {}) {
  const f = fixture();
  f.batch.release = {
    status: 'deployed',
    reviewedSha: sha,
    mergeSha,
    deployment: {
      status: 'deployed',
      reviewedSha: sha,
      mergeSha,
      vercelUrl: 'https://clinicos-eosin.vercel.app',
    },
  };
  const requests = [],
    comments = [],
    labels = new Set(['bug', 'customer-label', 'In progress']);
  let issueState = 'open',
    changed = false,
    closeFailures = close503 ? 1 : 0,
    unavailable = false;
  const load = f.store.load;
  f.store.load = async () => {
    if (unavailable) throw Error('Durable state read HTTP403');
    return load();
  };
  const real = createGitHub({
    repo: f.state.repository,
    cwd: '/tmp',
    run: async ({ args, input }) => {
      const route = args[1],
        method = args.includes('-X') ? args[args.indexOf('-X') + 1] : 'GET';
      const body = input ? JSON.parse(input) : null;
      const step =
        method === 'GET' && route.endsWith('/issues/5')
          ? 'issue-read'
          : route.includes('/issues/5/labels?')
            ? 'issue-labels-read'
            : route.includes('/issues/5/comments?')
              ? 'issue-comments-read'
              : method === 'POST' && route.endsWith('/comments')
                ? 'completion-comment'
                : method === 'GET' && route.endsWith('/labels/Risolto')
                  ? 'status-label-inspection'
                  : method === 'POST' && route.endsWith('/issues/5/labels')
                    ? 'status-label-post'
                    : method === 'DELETE' && route.endsWith('/In%20progress')
                      ? 'delete-progress'
                      : method === 'DELETE'
                        ? 'delete-blocked'
                        : method === 'PATCH'
                          ? 'close'
                          : 'unexpected';
      requests.push({
        step,
        method,
        route,
        body,
        held: !!f.getSaved().batches[0]?.releaseHold,
      });
      let result = { ok: true, code: 0, stdout: '{}', stderr: '' };
      if (step === 'issue-read') result.stdout = JSON.stringify({ number: 5, state: issueState });
      else if (step === 'issue-labels-read')
        result.stdout = JSON.stringify([[...labels].map((name) => ({ name }))]);
      else if (step === 'issue-comments-read') result.stdout = JSON.stringify([comments]);
      else if (step === 'completion-comment') {
        comments.push({ body: body.body });
        result.stdout = JSON.stringify(comments.at(-1));
      } else if (step === 'status-label-post') body.labels.forEach((name) => labels.add(name));
      else if (step.startsWith('delete-'))
        labels.delete(decodeURIComponent(route.split('/').at(-1)));
      else if (step === 'close') {
        if (closeFailures-- > 0) result = { ok: false, code: 1, stdout: '{}', stderr: 'HTTP 503' };
        else issueState = 'closed';
      } else if (step === 'unexpected')
        throw Error(`Unexpected synthetic request: ${method} ${route}`);
      await Promise.resolve();
      if (after === step && !changed) {
        changed = true;
        change(f.getSaved().batches[0]);
        if (failGuardRead) unavailable = true;
      }
      return result;
    },
  });
  Object.assign(f.github, {
    viewIssue: real.viewIssue,
    commentIssue: real.commentIssue,
    setIssueStatus: real.setIssueStatus,
  });
  return {
    ...f,
    requests,
    comments,
    labels,
    issueState: () => issueState,
    publish: async () =>
      publishDeploymentCompletion({
        batch: (await f.store.load()).batches[0],
        github: f.github,
        store: f.store,
        repo: f.state.repository,
      }),
  };
}

test('actual publication adapter blocks changed durable authorization after every avoidable awaited request', async (t) => {
  const changes = [
    [
      'hold',
      (b) => {
        b.releaseHold = 'Operator paused issue completion';
      },
    ],
    [
      'merge revision',
      (b) => {
        b.release.mergeSha = 'c'.repeat(40);
      },
    ],
    [
      'reviewed revision',
      (b) => {
        b.release.reviewedSha = 'c'.repeat(40);
      },
    ],
    [
      'approval revision',
      (b) => {
        b.approvedSha = 'c'.repeat(40);
      },
    ],
  ];
  for (const after of [
    'issue-read',
    'issue-labels-read',
    'issue-comments-read',
    'completion-comment',
    'status-label-inspection',
    'status-label-post',
    'delete-progress',
    'delete-blocked',
  ])
    for (const [name, change] of changes)
      await t.test(`${after}: ${name}`, async () => {
        const f = realPublicationFixture({ after, change });
        await assert.rejects(f.publish(), /releaseHold|identity changed/);
        assert.equal(
          f.requests.some((r) => r.step === 'close'),
          false,
        );
        assert.equal(
          f.requests.some((r) => r.method !== 'GET' && r.held),
          false,
        );
        if (['issue-read', 'issue-labels-read', 'issue-comments-read'].includes(after))
          assert.equal(f.comments.length, 0);
      });
});

test('final actual close boundary binds current deployment, PR identity, source revision and review ledger', async (t) => {
  for (const [name, change] of [
    [
      'deployment merge SHA',
      (b) => {
        b.release.deployment.mergeSha = 'c'.repeat(40);
      },
    ],
    [
      'deployment reviewed SHA',
      (b) => {
        b.release.deployment.reviewedSha = 'c'.repeat(40);
      },
    ],
    [
      'deployment status',
      (b) => {
        b.release.deployment.status = 'pending';
      },
    ],
    [
      'release status',
      (b) => {
        b.release.status = 'merged';
      },
    ],
    [
      'PR identity',
      (b) => {
        b.pr.number++;
      },
    ],
    [
      'PR URL',
      (b) => {
        b.pr.url = 'https://github.com/l2v-hub/ClinicOS/pull/10';
      },
    ],
    [
      'source revision',
      (b) => {
        b.sha = 'c'.repeat(40);
      },
    ],
    [
      'phase',
      (b) => {
        b.phase = 'blocked';
      },
    ],
    [
      'implementation status',
      (b) => {
        b.implementation[0].status = 'failed';
      },
    ],
    [
      'review status',
      (b) => {
        b.reviews[0].status = 'changes-requested';
      },
    ],
    [
      'report digest',
      (b) => {
        b.reviewReports['claude-review-1.json'] = '{}';
      },
    ],
  ])
    await t.test(name, async () => {
      const f = realPublicationFixture({ after: 'delete-blocked', change });
      await assert.rejects(f.publish());
      assert.equal(
        f.requests.some((r) => r.step === 'close'),
        false,
      );
    });
});

test('state-read failure after actual adapter awaits prevents all later mutations', async () => {
  const f = realPublicationFixture({
    after: 'delete-progress',
    failGuardRead: true,
  });
  await assert.rejects(f.publish(), /HTTP403/);
  assert.equal(
    f.requests.some((r) => r.step === 'delete-blocked' || r.step === 'close'),
    false,
  );
});

test('failed actual close leaves only truthful deployment facts; retry reuses the marker and preserves unrelated labels', async () => {
  const f = realPublicationFixture({ close503: true });
  await assert.rejects(f.publish(), /503/);
  assert.equal(f.issueState(), 'open');
  assert.equal(f.comments.length, 1);
  assert.match(f.comments[0].body, /Rilascio verificato/);
  assert.doesNotMatch(f.comments[0].body, /issue chiusa|already closed|\*\*Risolto\*\*/i);
  await f.publish();
  assert.equal(f.issueState(), 'closed');
  assert.equal(f.comments.length, 1);
  assert.equal(f.requests.filter((r) => r.step === 'close').length, 2);
  assert.ok(f.labels.has('bug') && f.labels.has('customer-label') && f.labels.has('Risolto'));
  const before = f.requests.filter((r) => r.method !== 'GET').length;
  await f.publish();
  assert.equal(
    f.requests.filter((r) => r.method !== 'GET').length,
    before,
    'Cached successful closure and marker require no duplicate mutation',
  );
  assert.equal(f.batch.reviews.length, 1);
  assert.equal(f.batch.implementation.length, 1);
});

test('publication recovery selects only pending matching releases and rejects changed published identity', async () => {
  const f = fixture();
  f.batch.release = { status: 'merged', mergeSha, reviewedSha: sha };
  await recordDeployment({
    repo: f.state.repository,
    github: f.github,
    store: f.store,
    batchId: f.batch.id,
    mergeSha,
    vercelUrl: 'https://clinicos-eosin.vercel.app',
  });
  const saved = f.getSaved();
  assert.equal(publicationComplete(saved.batches[0]), true);
  assert.equal(selectAutoReleaseBatch(saved), null);
  saved.batches[0].release.publication.reviewedSha = 'c'.repeat(40);
  assert.equal(publicationComplete(saved.batches[0]), false);
  assert.equal(selectAutoReleaseBatch(saved).id, f.batch.id);
});

test('already deployed recovery retains full exact review/evidence checks and never merges again', async () => {
  const f = fixture();
  f.batch.release = {
    status: 'deployed',
    mergeSha,
    reviewedSha: sha,
    deployment: {
      status: 'deployed',
      mergeSha,
      reviewedSha: sha,
      vercelUrl: 'https://clinicos-eosin.vercel.app',
    },
  };
  f.feedback.state = 'MERGED';
  f.feedback.mergeCommitSha = mergeSha;
  f.github.viewIssue = async (number) => ({
    number,
    state: 'closed',
    comments: [],
  });
  const result = await releaseBatch({
    repo: f.state.repository,
    github: f.github,
    store: f.store,
    batchId: f.batch.id,
    reviewedSha: sha,
    execute: true,
  });
  assert.equal(result.status, 'deployed');
  assert.deepEqual(result.deployments, {
    frontend: false,
    backend: false,
    runtime: false,
  });
  assert.equal(
    f.calls.some(([type]) => type === 'merge' || type === 'status'),
    false,
  );
  delete f.batch.reviewLedger;
  await assert.rejects(
    releaseBatch({
      repo: f.state.repository,
      github: f.github,
      store: f.store,
      batchId: f.batch.id,
      reviewedSha: sha,
      execute: true,
    }),
    /review ledger/,
  );
});

test('published completion is durable only after all real closures and a successful state compare-and-swap', async () => {
  const f = realPublicationFixture();
  const save = f.store.save;
  f.store.save = async () => {
    throw Error('Publication compare-and-swap conflict');
  };
  await assert.rejects(f.publish(), /compare-and-swap/);
  assert.equal(f.issueState(), 'closed');
  assert.equal(f.comments.length, 1);
  assert.equal(publicationComplete(f.getSaved().batches[0]), false);
  assert.equal(selectAutoReleaseBatch(f.getSaved()).id, f.batch.id);
  f.store.save = save;
  await f.publish();
  assert.equal(publicationComplete(f.getSaved().batches[0]), true);
  assert.equal(selectAutoReleaseBatch(f.getSaved()), null);
  assert.equal(f.comments.length, 1);
  const changed = structuredClone(f.getSaved().batches[0]);
  changed.release.deployment.mergeSha = 'c'.repeat(40);
  assert.equal(
    publicationComplete(changed),
    false,
    'Published identity cannot conceal changed deployment facts',
  );
  changed.release.deployment.mergeSha = mergeSha;
  changed.release.status = 'merged';
  assert.equal(
    publicationComplete(changed),
    false,
    'Nonterminal release cannot masquerade as published deployment',
  );
});

const subjectChanges = [
  [
    'PR',
    (b) => {
      b.pr = { number: 10, url: b.pr.url.replace('/9', '/10') };
    },
  ],
  [
    'source membership',
    (b) => {
      b.issues.push(6);
      b.plan.issues.push(6);
      b.plan.acceptance.push({
        issue: 6,
        criteria: ['Unverified additional issue'],
      });
      b.plan.evidence.push({
        issue: 6,
        screenshot: screenshotPath.replace('5.png', '6.png'),
        trace: tracePath.replace('5.zip', '6.zip'),
        video: '',
      });
    },
  ],
  [
    'scope',
    (b) => {
      b.plan.scope.push('backend/src/unreviewed.ts');
    },
  ],
  [
    'acceptance',
    (b) => {
      b.plan.acceptance[0].criteria.push('Unreviewed requirement');
    },
  ],
  [
    'grouping',
    (b) => {
      b.grouping = {
        fileMap: [{ issue: 5, files: [...b.plan.scope] }],
        separationReason: 'New grouping decision',
      };
    },
  ],
  [
    'evidence',
    (b) => {
      b.evidence = structuredClone(b.evidence);
      b.evidence[0].files.screenshot.sha256 = '9'.repeat(64);
    },
  ],
  [
    'approved report',
    (b) => {
      const changed = JSON.stringify({
        subject_sha: sha,
        verdict: 'approved',
        summary: 'A different approval report',
        findings: [],
      });
      b.reviewReports['claude-review-1.json'] = changed;
      b.reviewLedger.rounds[0].review_sha256 = sha256(changed);
    },
  ],
  [
    'implementation ledger',
    (b) => {
      b.implementation[0].details = 'Changed validation facts';
    },
  ],
  [
    'release facts',
    (b) => {
      b.release = { ...b.release, prNumber: 10 };
    },
  ],
  [
    'hold',
    (b) => {
      b.releaseHold = 'Pause during remote verification';
    },
  ],
];

// Real mutation adapters over an in-memory GitHub transport: external reads may
// race, but the actual ready/merge/comment/PATCH target is observable here.
function releaseBoundaryFixture(window, change) {
  const f = backendFixture();
  const requests = [];
  let changed = false;
  const inject = (at) => {
    if (!changed && at === window) {
      changed = true;
      change(f.getSaved().batches[0]);
    }
  };
  const real = createGitHub({
    repo: f.state.repository,
    cwd: '/tmp',
    run: async ({ args, input }) => {
      const method = args.includes('-X') ? args[args.indexOf('-X') + 1] : 'GET';
      requests.push({ args, method, body: input ? JSON.parse(input) : null });
      if (args[0] === 'pr' && args[1] === 'ready') {
        f.feedback.isDraft = false;
        inject('ready-response');
      }
      if (args[0] === 'pr' && args[1] === 'merge') inject('merge-response');
      if (args[0] === 'api' && /\/pulls\/9$/.test(args[1]))
        return {
          ok: true,
          code: 0,
          stdout: JSON.stringify({
            state: 'closed',
            merged: true,
            merge_commit_sha: mergeSha,
            html_url: f.feedback.url,
          }),
          stderr: '',
        };
      return { ok: true, code: 0, stdout: '{}', stderr: '' };
    },
  });
  Object.assign(f.github, {
    draftReady: real.draftReady,
    mergePullRequest: real.mergePullRequest,
    commentIssue: real.commentIssue,
    setIssueStatus: real.setIssueStatus,
  });
  let evidenceReads = 0,
    feedbackReads = 0,
    checkReads = 0,
    preflights = 0;
  const read = f.github.readFileAtRevision;
  f.github.readFileAtRevision = async (...args) => {
    const result = await read(...args);
    if (++evidenceReads === 1) inject('evidence');
    return result;
  };
  f.github.viewIssue = async (number) => {
    inject('source-issue');
    return { number, state: 'open', comments: [] };
  };
  f.github.reviewFeedback = async () => {
    const value = structuredClone(f.feedback);
    inject(`feedback-${++feedbackReads}`);
    return value;
  };
  f.github.requiredChecks = async () => {
    inject(`checks-${++checkReads}`);
    return { ok: true, details: ['required: SUCCESS'] };
  };
  f.github.verifyDemoPreflight = async () => {
    inject(`preflight-${++preflights}`);
    return {};
  };
  f.github.verifyDemoRelease = async () => {
    inject('live-proof');
    return structuredClone(f.proof);
  };
  return { ...f, requests, changed: () => changed };
}

test('full verified subject remains frozen at actual merge, record and recovery boundaries', async (t) => {
  const windows = [
    'evidence',
    'source-issue',
    'feedback-1',
    'checks-1',
    'preflight-1',
    'ready-response',
    'feedback-2',
    'checks-2',
    'preflight-2',
    'merge-response',
    'record-proof',
    'merged-recovery',
    'deployed-recovery',
    'publication-proof',
  ];
  for (const window of windows)
    for (const [name, change] of subjectChanges)
      await t.test(`${window}: ${name}`, async () => {
        const target = ['record-proof', 'publication-proof'].includes(window)
          ? 'live-proof'
          : ['merged-recovery', 'deployed-recovery'].includes(window)
            ? 'checks-1'
            : window;
        const f = releaseBoundaryFixture(target, change);
        const input = {
          repo: f.state.repository,
          github: f.github,
          store: f.store,
          batchId: f.batch.id,
        };
        if (window === 'ready-response') f.feedback.isDraft = true;
        if (window === 'merged-recovery' || window === 'deployed-recovery') {
          f.feedback.state = 'MERGED';
          f.feedback.mergeCommitSha = mergeSha;
        }
        if (['record-proof', 'deployed-recovery', 'publication-proof'].includes(window))
          f.batch.release = {
            status: 'merged',
            reviewedSha: sha,
            mergeSha,
            prNumber: 9,
          };
        if (['deployed-recovery', 'publication-proof'].includes(window)) {
          f.batch.release.status = 'deployed';
          f.batch.release.deployment = {
            status: 'deployed',
            reviewedSha: sha,
            mergeSha,
            railwayRunUrl: railwayUrl,
            demo: structuredClone(f.proof),
            production: structuredClone(f.production),
            productionRailwayRunUrl: f.production.runUrl,
          };
        }
        const action =
          window === 'record-proof'
            ? () =>
                recordDeployment({
                  ...input,
                  mergeSha,
                  railwayRunUrl: railwayUrl,
                })
            : window === 'publication-proof'
              ? () => publishDeploymentCompletion({ ...input, batch: f.batch })
              : () =>
                  releaseBatch({
                    ...input,
                    reviewedSha: sha,
                    execute: true,
                    configured,
                  });
        await assert.rejects(action(), /identity changed|releaseHold/);
        assert.equal(f.changed(), true, 'Exercise the intended asynchronous race');
        const merges = f.requests.filter(({ args }) => args[0] === 'pr' && args[1] === 'merge');
        assert.equal(merges.length, window === 'merge-response' ? 1 : 0);
        if (merges.length)
          assert.equal(
            merges[0].args[2],
            '9',
            'An already sent merge still targets the verified PR',
          );
        assert.equal(
          f.requests.some(({ method }) => ['PATCH', 'POST', 'DELETE', 'PUT'].includes(method)),
          false,
        );
        assert.equal(
          f.calls.some(([kind]) => kind === 'save'),
          false,
        );
        assert.equal(f.getSaved().batches[0].implementation.length, 1);
        assert.equal(f.getSaved().batches[0].reviews.length, 1);
      });
});

test('full plan, grouping, evidence and report remain frozen at every actual issue mutation', async (t) => {
  for (const after of [
    'issue-read',
    'status-label-inspection',
    'status-label-post',
    'delete-progress',
    'delete-blocked',
  ])
    for (const [name, change] of subjectChanges.filter(([name]) => name !== 'source membership'))
      await t.test(`${after}: ${name}`, async () => {
        const f = realPublicationFixture({ after, change });
        await assert.rejects(f.publish(), /identity changed|releaseHold/);
        assert.equal(
          f.requests.some((r) => r.step === 'close'),
          false,
        );
        assert.equal(publicationComplete(f.getSaved().batches[0]), false);
      });
});

test('draft conversion and merged recovery preserve the unchanged verified PR and cohort', async () => {
  for (const mode of ['draft', 'merged']) {
    const f = releaseBoundaryFixture('none', () => {});
    if (mode === 'draft') f.feedback.isDraft = true;
    else {
      f.feedback.state = 'MERGED';
      f.feedback.mergeCommitSha = mergeSha;
    }
    const result = await releaseBatch({
      repo: f.state.repository,
      github: f.github,
      store: f.store,
      batchId: f.batch.id,
      reviewedSha: sha,
      execute: true,
      configured,
    });
    assert.equal(result.status, 'merged');
    assert.equal(f.getSaved().batches[0].release.prNumber, 9);
    assert.deepEqual(f.getSaved().batches[0].issues, [5]);
    assert.equal(
      f.requests.filter(({ args }) => args[0] === 'pr' && args[1] === 'merge').length,
      mode === 'draft' ? 1 : 0,
    );
  }
});

test('read-only preflight cannot return a replaced verified subject as ready', async (t) => {
  for (const [name, change] of subjectChanges)
    await t.test(name, async () => {
      const f = releaseBoundaryFixture('preflight-1', change);
      await assert.rejects(
        releaseBatch({
          repo: f.state.repository,
          github: f.github,
          store: f.store,
          batchId: f.batch.id,
          reviewedSha: sha,
          configured,
        }),
        /identity changed|releaseHold/,
      );
      assert.equal(f.changed(), true);
      assert.equal(f.requests.length, 0);
      assert.equal(
        f.calls.some(([kind]) => kind === 'save'),
        false,
      );
    });
});

test('persisted transition identity is captured before save awaits, including protected retry', async (t) => {
  for (const mode of ['merge', 'merged-recovery', 'record', 'publication'])
    for (const [name, change] of subjectChanges)
      await t.test(`${mode}: ${name}`, async () => {
        const f = releaseBoundaryFixture('none', () => {});
        if (mode === 'merged-recovery') {
          f.feedback.state = 'MERGED';
          f.feedback.mergeCommitSha = mergeSha;
        }
        if (mode === 'record' || mode === 'publication')
          f.batch.release = {
            status: 'merged',
            mergeSha,
            reviewedSha: sha,
            prNumber: 9,
          };
        if (mode === 'publication') {
          f.batch.release.status = 'deployed';
          f.batch.release.deployment = {
            status: 'deployed',
            mergeSha,
            reviewedSha: sha,
            railwayRunUrl: railwayUrl,
            demo: structuredClone(f.proof),
            production: structuredClone(f.production),
            productionRailwayRunUrl: f.production.runUrl,
          };
        }
        const save = f.store.save;
        let saves = 0;
        f.store.save = async (value, options) => {
          await save(value, options);
          saves++;
          change(f.getSaved().batches[0]);
          // Mutating the submitted object as well must not redefine expected proof.
          change(value.batches[0]);
        };
        const input = {
          repo: f.state.repository,
          github: f.github,
          store: f.store,
          batchId: f.batch.id,
        };
        const action =
          mode === 'record'
            ? () =>
                recordDeployment({
                  ...input,
                  mergeSha,
                  railwayRunUrl: railwayUrl,
                })
            : mode === 'publication'
              ? () => publishDeploymentCompletion({ ...input, batch: f.batch })
              : () =>
                  releaseBatch({
                    ...input,
                    reviewedSha: sha,
                    execute: true,
                    configured,
                  });
        await assert.rejects(action(), /identity changed|releaseHold/);
        assert.equal(saves, 1);
        if (mode === 'record')
          assert.equal(
            f.requests.some(({ method }) => method === 'PATCH'),
            false,
          );
        assert.equal(f.getSaved().batches[0].implementation.length, 1);
        assert.equal(f.getSaved().batches[0].reviews.length, 1);
      });
});

test('an exact-only preflight cannot authorize the default backend release merge gate', async () => {
  const f = backendFixture();
  const routes = [];
  const exactRun = {
    id: 777,
    run_attempt: 1,
    status: 'completed',
    conclusion: 'success',
    head_branch: 'main',
    head_sha: sha,
    repository: { full_name: f.state.repository },
    head_repository: { full_name: f.state.repository },
    path: '.github/workflows/deploy-demo-exact-commit.yml',
    event: 'workflow_dispatch',
  };
  const exactProof = {
    receipt: {
      schemaVersion: 1,
      kind: 'clinicos-demo-preflight',
      sourcePolicy: DEMO_SOURCE_POLICIES.exact,
      repository: f.state.repository,
      sourceRef: 'refs/heads/main',
      mergeSha: sha,
      reviewedSha: sha,
      runId: 777,
      runAttempt: 1,
      target: { ...DEMO_TARGET },
      verifiedAt: new Date().toISOString(),
    },
  };
  const reader = {
    getJson: async (route) => {
      routes.push(route);
      if (route === 'commits/main') return { sha };
      if (route.includes('/deploy-backend.yml/')) return { workflow_runs: [] };
      if (route.includes('/deploy-demo-exact-commit.yml/')) return { workflow_runs: [exactRun] };
      throw new Error('Unexpected fixture route');
    },
    artifact: async () => exactProof,
  };
  assert.equal(
    (
      await verifyDemoPreflight({
        reader,
        sourcePolicy: DEMO_SOURCE_POLICIES.exact,
      })
    ).receipt.sourcePolicy,
    DEMO_SOURCE_POLICIES.exact,
  );
  routes.length = 0;
  f.github.verifyDemoPreflight = () => verifyDemoPreflight({ reader });
  await assert.rejects(
    releaseBatch({
      repo: f.state.repository,
      github: f.github,
      store: f.store,
      batchId: f.batch.id,
      reviewedSha: sha,
      configured,
      execute: true,
    }),
    /preflight/,
  );
  assert.equal(
    f.calls.some(([call]) => call === 'merge'),
    false,
  );
  assert.ok(routes.some((route) => route.includes('/deploy-backend.yml/')));
  assert.equal(
    routes.some((route) => route.includes('deploy-demo-exact-commit')),
    false,
  );
});

async function addContinuations(f, statuses) {
  const { historyDigest, implementationAttempts } =
    await import('../../src/bug-pipeline/attempt-budget.mjs');
  f.batch.implementation = [1, 2, 3, 4].map((round) => ({
    round,
    status: 'failed',
  }));
  f.state.operatorTakeover = {
    nonce: 'legacy-takeover',
    continuePastFourPreserveHistory: true,
    subjects: [{ collection: 'batches', id: f.batch.id, pr: 9 }],
  };
  f.batch.operatorContinuations = [];
  for (const [index, status] of statuses.entries()) {
    const round = 5 + index;
    if (index) {
      f.batch.budgetExtensions ??= [];
      f.batch.budgetExtensions.push({
        entityId: f.batch.id,
        pr: 9,
        kind: 'implementation',
        previousLimit: round - 1,
        limit: round,
        actor: 'operator',
        at: '2026-10-18T00:00:00Z',
        reason: 'Preserved legacy allowance',
        authorizationRef: 'legacy-source',
        nonce: `extension-${round}`,
        historyLength: round - 1,
        historyDigest: historyDigest(implementationAttempts(f.batch)),
      });
    }
    f.batch.operatorContinuations.push({
      round,
      status,
      kind: index ? 'audited-budget-continuation' : 'explicit-operator-compatibility-continuation',
      ...(index ? { budgetExtensionNonce: `extension-${round}` } : {}),
      owner: 'operator',
      nonce: `round-${round}`,
      startedAt: '2026-10-18T00:00:00Z',
      reason: 'Preserve all consumed attempts',
      authorizationRef: 'legacy-takeover',
      contractSha256: 'c'.repeat(64),
      preservedEntityDigest: 'd'.repeat(64),
      preservedLegacyImplementationDigest: historyDigest(f.batch.implementation),
      preservedLegacyReviewsDigest: historyDigest(f.batch.reviews),
    });
  }
  if (f.batch.budgetExtensions)
    f.batch.budgetAuthorizationCutover = {
      schemaVersion: 1,
      legacyCount: f.batch.budgetExtensions.length,
      legacyDigest: historyDigest(f.batch.budgetExtensions),
      actor: 'trusted-state-owner',
      at: '2026-10-18T00:00:00Z',
      authorizationRef: 'test:legacy-cutover',
    };
}

test('actual release reserves and merges a passed continuation after four failed legacy attempts', async () => {
  const f = fixture();
  await addContinuations(f, ['failed', 'passed']);
  const before = structuredClone(f.batch.implementation);
  const result = await releaseBatch({
    repo: f.state.repository,
    github: f.github,
    store: f.store,
    batchId: f.batch.id,
    reviewedSha: sha,
    configured,
    execute: true,
  });
  assert.equal(result.status, 'merged');
  assert.equal(f.calls.filter(([kind]) => kind === 'merge').length, 1);
  assert.deepEqual(f.getSaved().batches[0].implementation, before);
  assert.equal(f.getSaved().batches[0].operatorContinuations.length, 2);
});

test('failed or active latest continuation blocks actual release even after a passed continuation', async () => {
  for (const status of ['failed', 'running', 'implemented-awaiting-independent-qa']) {
    const f = fixture();
    await addContinuations(f, ['passed', status]);
    await assert.rejects(
      releaseBatch({
        repo: f.state.repository,
        github: f.github,
        store: f.store,
        batchId: f.batch.id,
        reviewedSha: sha,
        configured,
        execute: true,
      }),
      /latest implementation/,
    );
    assert.equal(f.calls.filter(([kind]) => kind === 'merge').length, 0);
  }
});

function exactBackendFixture() {
  const f = backendFixture();
  let main = 'c'.repeat(40),
    next = 900;
  const runs = [];
  f.github.currentReleaseMain = async () => main;
  const reader = {
    async getJson(route) {
      if (route === 'commits/main') return { sha: main };
      if (route.startsWith('actions/runs/'))
        return structuredClone(runs.find((r) => r.id === Number(route.split('/').at(-1))));
      const requested = new URLSearchParams(route.split('?')[1]).get('head_sha');
      const selected = runs.filter((r) => r.head_sha === requested);
      return {
        total_count: selected.length,
        workflow_runs: structuredClone(selected),
      };
    },
    async artifact(run, kind) {
      return {
        artifactDigest: `sha256:${'7'.repeat(64)}`,
        receiptSha256: '8'.repeat(64),
        receipt: {
          schemaVersion: 1,
          kind,
          sourcePolicy: DEMO_SOURCE_POLICIES.exact,
          repository: f.state.repository,
          sourceRef: 'refs/heads/main',
          mergeSha: run.head_sha,
          reviewedSha: run.head_sha,
          runId: run.id,
          runAttempt: 1,
          target: { ...DEMO_TARGET },
          verifiedAt: new Date().toISOString(),
          deployment: {
            id: '12345678-1234-4123-8123-123456789abc',
            status: 'SUCCESS',
            commitHash: run.head_sha,
          },
          ready: {
            status: 'ready',
            tier: 'demo',
            deploymentId: '12345678-1234-4123-8123-123456789abc',
          },
        },
      };
    },
  };
  const oldMerge = f.github.mergePullRequest;
  f.github.mergePullRequest = async (number, subject, { guard }) => {
    await guard();
    assert.equal(f.getSaved().batches[0].exactDemoDispatches.preflight.phase, 'succeeded');
    assert.equal(runs.filter((r) => r.display_title.includes(' deploy ')).length, 0);
    const result = await oldMerge(number, subject);
    main = mergeSha;
    f.feedback.state = 'MERGED';
    f.feedback.mergeCommitSha = mergeSha;
    return result;
  };
  return {
    ...f,
    reader,
    runs,
    setMain(value) {
      main = value;
    },
    post: async (body) => {
      const { operation, reviewed_sha: head, dispatch_id: id } = body.inputs;
      assert.equal(body.ref, 'main');
      assert.equal(head, main);
      const durable = f.getSaved().batches[0];
      assert.equal(durable.exactDemoDispatches[operation].phase, 'intent');
      if (operation === 'deploy') assert.equal(durable.release.status, 'merged');
      f.calls.push(['dispatch', operation, head]);
      runs.push({
        id: ++next,
        run_attempt: 1,
        status: 'completed',
        conclusion: 'success',
        head_branch: 'main',
        head_sha: head,
        repository: { full_name: f.state.repository },
        head_repository: { full_name: f.state.repository },
        event: 'workflow_dispatch',
        path: '.github/workflows/deploy-demo-exact-commit.yml',
        display_title: `demo-exact ${operation} ${head} ${id}`,
      });
    },
  };
}

async function wireExact(f) {
  const { createExactDemoDispatcher } =
    await import('../../src/bug-pipeline/exact-demo-dispatch.mjs');
  const dispatcher = createExactDemoDispatcher({
    reader: f.reader,
    postDispatch: f.post,
  });
  f.github.ensureExactDemoRun = (input) => dispatcher.ensure(input);
}
const exactInput = (f) => ({
  repo: f.state.repository,
  github: f.github,
  store: f.store,
  batchId: f.batch.id,
  reviewedSha: sha,
  configured,
  execute: true,
  sourcePolicy: DEMO_SOURCE_POLICIES.exact,
});

test('explicit exact release persists current-main read-only preflight before merge and exact merged-SHA deployment after it', async () => {
  const f = exactBackendFixture();
  await wireExact(f);
  const result = await releaseBatch(exactInput(f));
  assert.equal(result.status, 'merged');
  assert.equal(result.railwayRunUrl, 'https://github.com/l2v-hub/ClinicOS/actions/runs/902');
  assert.deepEqual(
    f.calls.filter(([call]) => call === 'dispatch').map((c) => c.slice(1)),
    [
      ['preflight', 'c'.repeat(40)],
      ['deploy', mergeSha],
    ],
  );
  assert.equal(f.getSaved().batches[0].release.sourcePolicy, DEMO_SOURCE_POLICIES.exact);
  assert.equal(f.getSaved().batches[0].exactDemoDispatches.deploy.phase, 'succeeded');
  const repeated = await releaseBatch(exactInput(f));
  assert.equal(repeated.alreadyMerged, true);
  assert.equal(f.calls.filter(([call]) => call === 'dispatch').length, 2);
  assert.equal(f.calls.filter(([call]) => call === 'merge').length, 1);
});

test('invalid source policy is rejected before loading state, mutation or callback for every release boundary', async () => {
  const { main, releaseSourcePolicy } = await import('../../src/bug-pipeline/release.mjs');
  assert.equal(releaseSourcePolicy(), DEMO_SOURCE_POLICIES.trigger);
  for (const policy of ['', null, 'exact', 'native-exact-commit-v2']) {
    const f = backendFixture();
    let loaded = false;
    f.store.load = async () => {
      loaded = true;
      throw Error('must not load');
    };
    await assert.rejects(
      releaseBatch({ ...exactInput(f), sourcePolicy: policy }),
      /unknown demo source policy/,
    );
    await assert.rejects(recordDeployment({ sourcePolicy: policy }), /unknown demo source policy/);
    await assert.rejects(
      publishDeploymentCompletion({ sourcePolicy: policy }),
      /unknown demo source policy/,
    );
    await assert.rejects(
      main({ env: { BUG_PIPELINE_DEMO_SOURCE_POLICY: policy } }),
      /unknown demo source policy/,
    );
    assert.equal(loaded, false);
    assert.equal(f.calls.length, 0);
  }
});

test('exact main dispatch requires trusted protected workflow and explicit scoped Actions binding', async () => {
  const { main } = await import('../../src/bug-pipeline/release.mjs');
  const env = {
    BUG_PIPELINE_DEMO_SOURCE_POLICY: DEMO_SOURCE_POLICIES.exact,
    BUG_PIPELINE_ACTIONS_TOKEN: 'fake-token',
    GITHUB_REPOSITORY: 'l2v-hub/ClinicOS',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_WORKFLOW_REF: 'l2v-hub/ClinicOS/.github/workflows/codex-bug-release.yml@refs/heads/main',
  };
  for (const [key, value] of [
    ['GITHUB_REF', 'refs/pull/9/merge'],
    ['GITHUB_REPOSITORY', 'other/repo'],
    ['GITHUB_WORKFLOW_REF', 'other.yml@refs/heads/main'],
    ['GITHUB_EVENT_NAME', 'pull_request'],
    ['BUG_PIPELINE_ACTIONS_TOKEN', ''],
  ]) {
    await assert.rejects(
      main({ env: { ...env, [key]: value } }),
      /fixed protected main|scoped Actions/,
    );
  }
});

test('exact release dry run cannot dispatch and missing exact proof never falls back to legacy', async () => {
  const f = exactBackendFixture();
  await wireExact(f);
  await assert.rejects(releaseBatch({ ...exactInput(f), execute: false }), /execution flag/);
  assert.equal(
    f.calls.some(([call]) => ['dispatch', 'merge'].includes(call)),
    false,
  );
  delete f.github.ensureExactDemoRun;
  await assert.rejects(releaseBatch(exactInput(f)), /adapter unavailable/);
  assert.equal(
    f.calls.some(([call]) => call === 'demo-preflight'),
    false,
  );
});

test('main movement after protected merge retains merged progress and never dispatches wrong-SHA deployment', async () => {
  const f = exactBackendFixture();
  await wireExact(f);
  const merge = f.github.mergePullRequest;
  f.github.mergePullRequest = async (...args) => {
    const result = await merge(...args);
    f.setMain('d'.repeat(40));
    return result;
  };
  await assert.rejects(releaseBatch(exactInput(f)), /main changed/);
  assert.equal(f.getSaved().batches[0].release.status, 'merged');
  assert.equal(f.getSaved().batches[0].exactDemoDispatches.preflight.phase, 'succeeded');
  assert.equal(f.calls.filter(([call]) => call === 'dispatch').length, 1);
  await assert.rejects(releaseBatch(exactInput(f)), /releaseHold/);
  assert.equal(f.calls.filter(([call]) => call === 'merge').length, 1);
});

test('exact record and pending completion recheck pass the selected policy and bind durable dispatch', async () => {
  const f = exactBackendFixture();
  await wireExact(f);
  const result = await releaseBatch(exactInput(f));
  const policies = [];
  const proof = {
    ...f.proof,
    runUrl: result.railwayRunUrl,
    receipt: { ...f.proof.receipt, sourcePolicy: DEMO_SOURCE_POLICIES.exact },
  };
  f.github.verifyDemoRelease = async (input) => {
    policies.push(input.sourcePolicy);
    assert.equal(input.runUrl, result.railwayRunUrl);
    return proof;
  };
  await assert.rejects(
    recordDeployment({
      repo: f.state.repository,
      github: f.github,
      store: f.store,
      batchId: f.batch.id,
      mergeSha,
      railwayRunUrl: result.railwayRunUrl,
    }),
    /source policy mismatch/,
  );
  await assert.rejects(
    recordDeployment({ ...exactInput(f), mergeSha, railwayRunUrl: railwayUrl }),
    /durable successful dispatch/,
  );
  await recordDeployment({
    ...exactInput(f),
    mergeSha,
    railwayRunUrl: result.railwayRunUrl,
  });
  assert.deepEqual(policies, [DEMO_SOURCE_POLICIES.exact, DEMO_SOURCE_POLICIES.exact]);
  assert.equal(publicationComplete(f.getSaved().batches[0]), true);
});

test('release evidence metadata accepts exactly 32MiB, rejects over-limit and preserves size/hash checks', async () => {
  const { MAX_EVIDENCE_BYTES } = await import('../../src/bug-pipeline/evidence-limits.mjs');
  for (const scenario of ['limit', 'over-limit', 'size-mismatch', 'hash-mismatch']) {
    const f = fixture();
    const entry = f.batch.evidence[0].files.trace;
    const saved = { ...entry };
    try {
      entry.bytes = MAX_EVIDENCE_BYTES + (scenario === 'over-limit' ? 1 : 0);
      const original = f.github.readFileAtRevision;
      f.github.readFileAtRevision = async (file) => {
        const result = await original(file);
        if (file !== tracePath) return result;
        return {
          ...result,
          ...(scenario === 'size-mismatch' ? { bytes: result.bytes - 1 } : {}),
          ...(scenario === 'hash-mismatch' ? { sha256: '0'.repeat(64) } : {}),
        };
      };
      const input = {
        repo: f.state.repository,
        github: f.github,
        store: f.store,
        batchId: f.batch.id,
        reviewedSha: sha,
        configured,
      };
      if (scenario === 'limit')
        assert.equal((await releaseBatch(input)).status, 'ready-to-release');
      else await assert.rejects(releaseBatch(input), /invalid trace evidence|digest mismatch/);
      assert.equal(
        f.calls.some(([call]) => call === 'merge'),
        false,
      );
    } finally {
      Object.assign(entry, saved);
    }
  }
});

test('protected main orchestration keeps fixed exact policy, scoped Actions permission, distinct queues and dedicated demo environment', async () => {
  const { readFile } = await import('node:fs/promises');
  const control = await readFile(
    new URL('../../../.github/workflows/codex-bug-release.yml', import.meta.url),
    'utf8',
  );
  const exact = await readFile(
    new URL('../../../.github/workflows/deploy-demo-exact-commit.yml', import.meta.url),
    'utf8',
  );
  assert.equal(
    (control.match(/BUG_PIPELINE_DEMO_SOURCE_POLICY: native-exact-commit-v1/g) || []).length,
    2,
  );
  assert.match(control, /jobs:\n  release:[\s\S]*?permissions:[\s\S]*?actions: write/);
  assert.match(control, /BUG_PIPELINE_ACTIONS_TOKEN: \$\{\{ github.token \}\}/);
  assert.doesNotMatch(control, /workflow deploy-backend.yml|RAILWAY_DEMO_CONFIGURED/);
  assert.match(control, /group: codex-bug-pipeline-/);
  assert.doesNotMatch(control, /group: railway-demo/);
  assert.match(exact, /group: railway-demo/);
  assert.match(
    exact,
    /run-name: demo-exact \$\{\{ inputs.operation \}\} \$\{\{ inputs.reviewed_sha \}\} \$\{\{ inputs.dispatch_id \}\}/,
  );
  assert.match(exact, /environment: 'glistening-friendship \/ demo'/);
  assert.match(exact, /RAILWAY_TOKEN: \$\{\{ secrets.RAILWAY_DEMO_TOKEN \}\}/);
  assert.match(exact, /assert.equal\(process.env.CLINICOS_REVIEWED_SHA, process.env.GITHUB_SHA\)/);
  assert.match(exact, /assert.match\(process.env.CLINICOS_DISPATCH_ID/);
});

test('CLI exact live verifier rechecks protected main before and after proof while legacy default stays available', async () => {
  const { verifyReleaseDemo } = await import('../../src/bug-pipeline/release.mjs');
  for (const move of ['before', 'during', 'never']) {
    let head = move === 'before' ? 'c'.repeat(40) : mergeSha,
      verifications = 0,
      reads = 0;
    const reader = {
      async getJson(route) {
        if (route === 'actions/runs/55') return { id: 55, run_attempt: 1 };
        assert.equal(route, 'commits/main');
        reads++;
        return { sha: head };
      },
    };
    const input = {
      sourcePolicy: DEMO_SOURCE_POLICIES.exact,
      reader,
      mergeSha,
      runUrl: 'https://github.com/l2v-hub/ClinicOS/actions/runs/55',
      verify: async (args) => {
        verifications++;
        assert.equal(args.sourcePolicy, DEMO_SOURCE_POLICIES.exact);
        if (move === 'during') head = 'd'.repeat(40);
        return { proof: true };
      },
    };
    if (move === 'never') assert.deepEqual(await verifyReleaseDemo(input), { proof: true });
    else await assert.rejects(verifyReleaseDemo(input), /current main changed/);
    assert.equal(verifications, move === 'before' ? 0 : 1);
    assert.equal(reads, move === 'before' ? 1 : 2);
  }
  const legacy = await verifyReleaseDemo({
    reader: {
      getJson() {
        throw Error('legacy does not require exact main');
      },
    },
    verify: async (input) => ({ policy: input.sourcePolicy }),
  });
  assert.equal(legacy.policy, DEMO_SOURCE_POLICIES.trigger);
});

test('CLI exact completion rejects a rerun before or during live proof verification', async () => {
  const { verifyReleaseDemo } = await import('../../src/bug-pipeline/release.mjs');
  for (const change of ['before', 'during']) {
    let attempt = change === 'before' ? 2 : 1,
      verified = 0;
    const reader = {
      async getJson(route) {
        return route === 'commits/main' ? { sha: mergeSha } : { id: 55, run_attempt: attempt };
      },
    };
    await assert.rejects(
      verifyReleaseDemo({
        sourcePolicy: DEMO_SOURCE_POLICIES.exact,
        reader,
        mergeSha,
        runUrl: 'https://github.com/l2v-hub/ClinicOS/actions/runs/55',
        verify: async () => {
          verified++;
          attempt = 2;
          return { proof: true };
        },
      }),
      /run attempt changed/,
    );
    assert.equal(verified, change === 'before' ? 0 : 1);
  }
});

const recoveryContext = {
  repository: 'l2v-hub/ClinicOS',
  eventName: 'workflow_dispatch',
  ref: 'refs/heads/main',
  workflowRef: 'l2v-hub/ClinicOS/.github/workflows/codex-bug-release.yml@refs/heads/main',
  actor: 'l2v-hub',
  triggeringActor: 'l2v-hub',
  sha: 'd'.repeat(40),
  workflowSha: 'd'.repeat(40),
};
async function wireRecovery(f) {
  const { verifyReleaseAncestry } = await import('../../src/bug-pipeline/exact-demo-recovery.mjs');
  const { verifyRetiredExactDispatches } =
    await import('../../src/bug-pipeline/exact-demo-dispatch.mjs');
  const read = f.reader.getJson;
  f.reader.getJson = async (route) =>
    route.startsWith('compare/')
      ? {
          base_commit: { sha: mergeSha },
          merge_base_commit: { sha: mergeSha },
          status: 'ahead',
          ahead_by: 1,
          behind_by: 0,
          commits: [{ sha: 'd'.repeat(40) }],
        }
      : read(route);
  f.github.authorizeReleaseRecovery = async () => 'l2v-hub';
  f.github.verifyReleaseAncestry = (input) => verifyReleaseAncestry({ ...input, reader: f.reader });
  f.github.verifyExactRecoveryRuns = (input) =>
    verifyRetiredExactDispatches({ ...input, reader: f.reader });
  const { verifyProductionBackend } = await import('../../src/bug-pipeline/demo-deployment.mjs');
  f.github.verifyProductionBackend = async (input) => {
    const target = await f.github.currentReleaseMain();
    const run = {
      id: 321,
      run_attempt: 1,
      head_sha: target,
      head_branch: 'main',
      repository: { full_name: 'l2v-hub/ClinicOS' },
      head_repository: { full_name: 'l2v-hub/ClinicOS' },
      path: '.github/workflows/deploy-backend.yml',
      event: 'push',
      status: 'completed',
      conclusion: 'success',
    };
    const job = {
      id: 421,
      run_id: 321,
      run_attempt: 1,
      head_sha: target,
      name: 'deploy',
      status: 'completed',
      conclusion: 'success',
      steps: [
        {
          name: 'Deploy to Railway',
          status: 'completed',
          conclusion: 'success',
        },
      ],
    };
    const reader = {
      getJson: async (route) =>
        route.includes('/jobs?')
          ? { total_count: 1, jobs: [job] }
          : route === 'actions/runs/321'
            ? run
            : { total_count: 1, workflow_runs: [run] },
    };
    return verifyProductionBackend({ ...input, reader });
  };
}
const recoveryInput = (f) => ({
  ...exactInput(f),
  blockId: f.getSaved().batches[0].releaseBlock.id,
  context: recoveryContext,
});

test('four actual release failures durably block PR/issues; plain retries never POST; explicit recovery archives and permits one fresh intent per operation', async (t) => {
  for (const scenario of [
    'premerge main movement',
    'expired preflight',
    'failed deploy',
    'main movement before record',
  ])
    await t.test(scenario, async () => {
      const f = exactBackendFixture();
      await wireExact(f);
      await wireRecovery(f);
      if (scenario === 'main movement before record')
        f.batch.plan.scope.push('frontend/src/Patient.tsx');
      const originalHistories = JSON.stringify({
        implementation: f.batch.implementation,
        reviews: f.batch.reviews,
        ledger: f.batch.reviewLedger,
        reports: f.batch.reviewReports,
      });
      let undo = () => {};
      if (scenario === 'premerge main movement') {
        const check = f.github.requiredChecks;
        let reads = 0;
        f.github.requiredChecks = async () => {
          const result = await check();
          if (++reads === 2) f.setMain('d'.repeat(40));
          return result;
        };
        undo = () => {
          f.github.requiredChecks = check;
        };
      } else if (scenario === 'expired preflight') {
        const artifact = f.reader.artifact;
        f.reader.artifact = async (...args) => {
          const proof = await artifact(...args);
          proof.receipt.verifiedAt = '2020-01-01T00:00:00Z';
          return proof;
        };
        undo = () => {
          f.reader.artifact = artifact;
        };
      } else if (scenario === 'failed deploy') {
        const post = f.post;
        f.post = async (body) => {
          await post(body);
          if (body.inputs.operation === 'deploy') f.runs.at(-1).conclusion = 'failure';
        };
        await wireExact(f);
        undo = () => {
          f.post = post;
        };
      }
      if (scenario === 'main movement before record') {
        const result = await releaseBatch(exactInput(f));
        f.setMain('d'.repeat(40));
        await assert.rejects(
          recordDeployment({
            ...exactInput(f),
            mergeSha,
            railwayRunUrl: result.railwayRunUrl,
            vercelUrl: 'https://old-target.vercel.app',
          }),
        );
      } else await assert.rejects(releaseBatch(exactInput(f)));
      undo();
      await wireExact(f);
      const blocked = structuredClone(f.getSaved().batches[0]);
      assert.ok(blocked.releaseBlock);
      assert.equal(blocked.releaseHold, 'exact-release-block');
      const posts = f.calls.filter((c) => c[0] === 'dispatch').length;
      assert.equal(selectAutoReleaseBatch(f.getSaved()), null);
      await assert.rejects(releaseBatch(exactInput(f)), /releaseHold/);
      assert.equal(f.calls.filter((c) => c[0] === 'dispatch').length, posts);
      assert.ok(
        f.calls.some(
          (c) => c[0] === 'comment' && c[1] === 9 && c[2].includes(blocked.releaseBlock.code),
        ),
      );
      assert.ok(f.calls.some((c) => c[0] === 'status' && c[1] === 5 && c[2] === 'Bloccato'));
      assert.ok(!f.calls.some((c) => c[0] === 'status' && c[2] === 'Risolto'));
      if (blocked.release) f.setMain('d'.repeat(40));
      const request = recoveryInput(f);
      const result = await recoverExactRelease(request);
      assert.equal(result.status, 'recovered');
      const recovered = f.getSaved().batches[0];
      assert.equal(recovered.exactReleaseRecoveries.length, 1);
      assert.deepEqual(recovered.exactReleaseRecoveries[0].dispatches, blocked.exactDemoDispatches);
      assert.equal(
        JSON.stringify({
          implementation: recovered.implementation,
          reviews: recovered.reviews,
          ledger: recovered.reviewLedger,
          reports: recovered.reviewReports,
        }),
        originalHistories,
      );
      const recoveredSnapshot = JSON.stringify(recovered);
      await assert.rejects(recoverExactRelease(request));
      assert.equal(
        JSON.stringify(f.getSaved().batches[0]),
        recoveredSnapshot,
        'replaying consumed block ID cannot archive or allocate again',
      );
      const released = await releaseBatch(exactInput(f));
      const freshDispatches = f.calls.filter((c) => c[0] === 'dispatch').slice(posts);
      assert.equal(freshDispatches.filter((c) => c[1] === 'preflight').length, 1);
      assert.equal(freshDispatches.filter((c) => c[1] === 'deploy').length, 1);
      const again = await releaseBatch(exactInput(f));
      assert.equal(again.mergeSha, mergeSha);
      assert.equal(f.calls.filter((c) => c[0] === 'dispatch').length, posts + 2);
      const current = f.getSaved().batches[0];
      for (const p of Object.values(current.exactDemoDispatches)) {
        assert.ok(
          !Object.values(blocked.exactDemoDispatches).some(
            (old) => old.dispatchId === p.dispatchId,
          ),
        );
        assert.ok(
          recovered.exactDemoRecovery.excludedRunIds.every((id) => p.priorRunIds.includes(id)),
        );
      }
      const target = released.deploymentSha ?? mergeSha;
      f.github.verifyDemoRelease = async ({ runUrl, mergeSha: actual }) => ({
        ...f.proof,
        runUrl,
        reviewedSha: sha,
        receipt: { ...f.proof.receipt, mergeSha: actual },
      });
      await recordDeployment({
        ...exactInput(f),
        mergeSha,
        deploymentSha: target,
        railwayRunUrl: released.railwayRunUrl,
        vercelUrl: 'https://fresh-target.vercel.app',
      });
      const completed = f.getSaved().batches[0];
      assert.equal(completed.release.mergeSha, mergeSha);
      assert.equal(completed.release.deployment.deploymentSha, target);
      assert.equal(completed.release.deployment.production.sha, target);
      assert.equal(completed.release.deployment.demo.receipt.mergeSha, target);
      assert.equal(completed.release.status, 'deployed');
      if (scenario === 'main movement before record') {
        assert.equal(completed.release.deployment.vercelUrl, 'https://fresh-target.vercel.app');
        assert.ok(!JSON.stringify(completed.release.deployment).includes('old-target'));
      }
      const comment = f.calls.find(
        (c) => c[0] === 'comment' && c[2].includes('Rilascio verificato'),
      );
      assert.match(comment[2], /Railway produzione verificato/);
      assert.match(comment[2], /Railway demo verificato/);
    });
});

test('exact backend requires production binding before merge and production proof before record', async () => {
  const unconfigured = exactBackendFixture();
  await wireExact(unconfigured);
  await assert.rejects(
    releaseBatch({
      ...exactInput(unconfigured),
      configured: { ...configured, railway: false },
    }),
    /RAILWAY_TOKEN/,
  );
  assert.equal(unconfigured.calls.filter((c) => c[0] === 'merge' || c[0] === 'dispatch').length, 0);
  for (const code of ['PRODUCTION_RUN_REQUIRED', 'PRODUCTION_PROOF_FAILED']) {
    const f = exactBackendFixture();
    await wireExact(f);
    const result = await releaseBatch(exactInput(f));
    f.github.verifyProductionBackend = async () => {
      const error = new Error(code);
      error.code = code;
      throw error;
    };
    let clock = Date.now();
    const expectedCode =
      code === 'PRODUCTION_RUN_REQUIRED' ? 'PRODUCTION_RUN_PENDING_TIMEOUT' : code;
    await assert.rejects(
      recordDeployment({
        ...exactInput(f),
        mergeSha,
        railwayRunUrl: result.railwayRunUrl,
        productionWait: {
          now: () => clock,
          delay: async (ms) => {
            clock += ms;
          },
          timeoutMs: 20,
          pollMs: 10,
        },
      }),
      new RegExp(expectedCode),
    );
    assert.equal(f.getSaved().batches[0].releaseBlock.code, expectedCode);
    assert.ok(!f.calls.some((c) => c[0] === 'status' && c[2] === 'Risolto'));
    const count = f.calls.filter((c) => c[0] === 'dispatch').length;
    await assert.rejects(releaseBatch(exactInput(f)), /releaseHold/);
    assert.equal(f.calls.filter((c) => c[0] === 'dispatch').length, count);
  }
});

test('explicit recovery rejects denied authorization, stale source, nonancestor, active/uncertain old runs and concurrent ownership without new intent', async (t) => {
  for (const name of [
    'no authority',
    'changed head',
    'unapproved source',
    'nonancestor',
    'concurrent ownership',
    'active run',
    'run tamper',
    'uncertain run',
    'wrong block',
    'cross repository',
  ])
    await t.test(name, async () => {
      const f = exactBackendFixture();
      await wireExact(f);
      await wireRecovery(f);
      const artifact = f.reader.artifact;
      f.reader.artifact = async (...args) => {
        const proof = await artifact(...args);
        proof.receipt.verifiedAt = '2020-01-01';
        return proof;
      };
      await assert.rejects(releaseBatch(exactInput(f)));
      f.reader.artifact = artifact;
      const input = recoveryInput(f);
      const blocked = f.getSaved().batches[0];
      if (name === 'no authority')
        f.github.authorizeReleaseRecovery = async () => {
          throw Error('denied');
        };
      if (name === 'changed head') f.feedback.head = 'e'.repeat(40);
      if (name === 'unapproved source') blocked.approvedSha = 'e'.repeat(40);
      if (name === 'nonancestor') {
        blocked.release = {
          sourcePolicy: DEMO_SOURCE_POLICIES.exact,
          status: 'merged',
          mergeSha,
          reviewedSha: sha,
        };
        f.feedback.state = 'MERGED';
        f.feedback.mergeCommitSha = mergeSha;
        f.setMain('d'.repeat(40));
        const read = f.reader.getJson;
        f.reader.getJson = async (route) =>
          route.startsWith('compare/')
            ? {
                base_commit: { sha: mergeSha },
                merge_base_commit: { sha: 'e'.repeat(40) },
                status: 'diverged',
              }
            : read(route);
      }
      if (name === 'concurrent ownership') {
        const read = f.github.currentReleaseMain;
        f.github.currentReleaseMain = async () => {
          blocked.plan.title = 'Different durable owner';
          return read();
        };
      }
      if (name === 'active run') f.runs[0].status = 'in_progress';
      if (name === 'run tamper') f.runs[0].run_attempt = 2;
      if (name === 'uncertain run') {
        delete blocked.exactDemoDispatches.preflight.runId;
        f.runs.length = 0;
      }
      if (name === 'wrong block') input.blockId = 'wrong';
      if (name === 'cross repository') input.repo = 'attacker/repo';
      const posts = f.calls.filter((c) => c[0] === 'dispatch').length,
        saves = f.calls.filter((c) => c[0] === 'save').length;
      await assert.rejects(recoverExactRelease(input));
      assert.equal(f.calls.filter((c) => c[0] === 'dispatch').length, posts);
      assert.equal(f.calls.filter((c) => c[0] === 'save').length, saves);
      assert.equal(blocked.exactReleaseRecoveries, undefined);
    });
});

test('recovery mutation guard rechecks retired runs and durable ownership at the actual store save', async () => {
  for (const change of ['active run', 'ownership']) {
    const f = exactBackendFixture();
    await wireExact(f);
    await wireRecovery(f);
    const artifact = f.reader.artifact;
    f.reader.artifact = async (...args) => {
      const proof = await artifact(...args);
      proof.receipt.verifiedAt = '2020-01-01';
      return proof;
    };
    await assert.rejects(releaseBatch(exactInput(f)));
    f.reader.artifact = artifact;
    const request = recoveryInput(f),
      save = f.store.save;
    const before = structuredClone(f.getSaved().batches[0]);
    let invoked = false;
    f.store.save = async (value, { guard }) => {
      invoked = true;
      if (change === 'active run') f.runs[0].status = 'in_progress';
      else f.getSaved().batches[0].plan.title = 'Concurrent operator update';
      await guard();
      return save(value);
    };
    await assert.rejects(recoverExactRelease(request));
    assert.equal(invoked, true);
    assert.equal(f.getSaved().batches[0].exactReleaseRecoveries, undefined);
    assert.deepEqual(f.getSaved().batches[0].releaseBlock, before.releaseBlock);
  }
});

test('actual record controller waits absent→running→success without blocking or production dispatch; failures/timeouts block once with explicit guidance', async (t) => {
  const { verifyProductionBackend } = await import('../../src/bug-pipeline/demo-deployment.mjs');
  for (const outcome of [
    'success',
    'failure',
    'absent timeout',
    'running timeout',
    'publication pending',
  ])
    await t.test(outcome, async () => {
      const f = exactBackendFixture();
      await wireExact(f);
      const released = await releaseBatch(exactInput(f));
      const initialPosts = f.calls.filter((c) => c[0] === 'dispatch').length;
      let state = 0,
        clock = Date.now(),
        sleeps = 0;
      const pending = () => state < 2 || outcome === 'running timeout';
      const run = () => ({
        id: 321,
        run_attempt: 1,
        head_sha: mergeSha,
        head_branch: 'main',
        repository: { full_name: f.state.repository },
        head_repository: { full_name: f.state.repository },
        path: '.github/workflows/deploy-backend.yml',
        event: 'push',
        status: pending() ? 'in_progress' : 'completed',
        conclusion: pending() ? null : outcome === 'failure' ? 'failure' : 'success',
      });
      const job = {
        id: 421,
        run_id: 321,
        run_attempt: 1,
        head_sha: mergeSha,
        name: 'deploy',
        status: 'completed',
        conclusion: 'success',
        steps: [
          {
            name: 'Deploy to Railway',
            status: 'completed',
            conclusion: 'success',
          },
        ],
      };
      const reader = {
        getJson: async (route) =>
          route.includes('/runs?')
            ? {
                total_count: state === 0 || outcome === 'absent timeout' ? 0 : 1,
                workflow_runs: state === 0 || outcome === 'absent timeout' ? [] : [run()],
              }
            : route.includes('/jobs?')
              ? { total_count: 1, jobs: [job] }
              : run(),
      };
      f.github.verifyProductionBackend = (input) => verifyProductionBackend({ ...input, reader });
      const demoProof = f.github.verifyDemoRelease;
      f.github.verifyDemoRelease = async (...args) => ({
        ...(await demoProof(...args)),
        runUrl: released.railwayRunUrl,
      });
      if (outcome === 'publication pending') {
        const verify = f.github.verifyDemoRelease;
        f.github.verifyDemoRelease = async (...args) => {
          const proof = await verify(...args);
          state = 1;
          return proof;
        };
      }
      const input = {
        ...exactInput(f),
        mergeSha,
        railwayRunUrl: released.railwayRunUrl,
        productionWait: {
          now: () => clock,
          delay: async (ms) => {
            clock += ms;
            state++;
            sleeps++;
          },
          timeoutMs: 40,
          pollMs: 10,
        },
      };
      if (outcome === 'success') {
        await recordDeployment(input);
        assert.equal(f.getSaved().batches[0].release.status, 'deployed');
        assert.equal(f.getSaved().batches[0].releaseBlock, undefined);
        assert.ok(!f.calls.some((c) => c[0] === 'status' && c[2] === 'Bloccato'));
        assert.equal(sleeps, 2);
      } else {
        const code = outcome.includes('timeout')
          ? 'PRODUCTION_RUN_PENDING_TIMEOUT'
          : 'PRODUCTION_PROOF_FAILED';
        await assert.rejects(
          recordDeployment(input),
          new RegExp(outcome === 'publication pending' ? 'PRODUCTION_RUN_PENDING' : code),
        );
        const block = f.getSaved().batches[0].releaseBlock;
        assert.equal(block.code, code);
        const blockComments = f.calls.filter(
          (c) => c[0] === 'comment' && c[2].includes('release-block:'),
        );
        assert.equal(blockComments.length, 2);
        assert.ok(!f.calls.some((c) => c[0] === 'status' && c[2] === 'Risolto'));
        if (outcome.includes('timeout'))
          assert.ok(
            blockComments.every(
              (c) => c[2].includes('dispatch manuale esplicito') && c[2].includes(mergeSha),
            ),
          );
        if (outcome === 'publication pending')
          assert.equal(sleeps, 2, 'publication performs strict read without another wait');
      }
      assert.equal(
        f.calls.filter((c) => c[0] === 'dispatch').length,
        initialPosts,
        'production reader never dispatches',
      );
    });
});

test('rejected POST, pre-POST main movement and uncertain acknowledgement retire only after settled two-read proof and explicit recovery', async (t) => {
  const {
    createExactDemoDispatcher,
    createExactDispatchPoster,
    verifyRetiredExactDispatches,
    DISPATCH_SETTLE_MS,
  } = await import('../../src/bug-pipeline/exact-demo-dispatch.mjs');
  for (const scenario of [
    'rejected POST',
    'main moved before POST',
    'uncertain acknowledgement',
    'late old title',
    'late during save',
  ])
    await t.test(scenario, async () => {
      const f = exactBackendFixture();
      await wireRecovery(f);
      let offset = 0,
        attempts = 0;
      const clock = () => Date.now() + offset;
      const delay = async (ms) => {
        offset += ms;
      };
      f.github.verifyExactRecoveryRuns = (input) =>
        verifyRetiredExactDispatches({
          ...input,
          reader: f.reader,
          now: clock,
          delay,
        });
      const poster = createExactDispatchPoster({
        cwd: '/tmp',
        run: async () => {
          attempts++;
          return scenario === 'uncertain acknowledgement'
            ? { ok: true, stdout: 'uncertain acknowledgement' }
            : { ok: false, stdout: '', stderr: 'synthetic dispatch rejected' };
        },
      });
      const first = createExactDemoDispatcher({
        reader: f.reader,
        postDispatch: poster,
        now: clock,
      });
      f.github.ensureExactDemoRun = (input) => first.ensure(input);
      const read = f.reader.getJson;
      if (scenario === 'main moved before POST') {
        let count = 0;
        f.reader.getJson = async (route) => {
          if (route === 'commits/main' && ++count === 2) f.setMain('d'.repeat(40));
          return read(route);
        };
      }
      await assert.rejects(releaseBatch(exactInput(f)));
      f.reader.getJson = read;
      const blocked = structuredClone(f.getSaved().batches[0]);
      const old = blocked.exactDemoDispatches.preflight;
      assert.equal(old.phase, 'intent');
      assert.ok(old.intentAt);
      assert.equal(old.runId, undefined);
      assert.equal(f.runs.length, 0);
      const attemptsBefore = attempts;
      await assert.rejects(releaseBatch(exactInput(f)), /releaseHold/);
      assert.equal(attempts, attemptsBefore);
      const request = { ...recoveryInput(f), now: clock };
      await assert.rejects(recoverExactRelease(request), /settle/);
      assert.equal(f.getSaved().batches[0].exactReleaseRecoveries, undefined);
      const origin = Math.max(Date.parse(old.intentAt), Date.parse(blocked.releaseBlock.at));
      offset = origin + DISPATCH_SETTLE_MS + 1 - Date.now();
      const oldRun = {
        id: 899,
        run_attempt: 1,
        status: 'completed',
        conclusion: 'success',
        head_sha: old.sha,
        head_branch: 'main',
        repository: { full_name: f.state.repository },
        head_repository: { full_name: f.state.repository },
        path: '.github/workflows/deploy-demo-exact-commit.yml',
        event: 'workflow_dispatch',
        display_title: `demo-exact preflight ${old.sha} ${old.dispatchId}`,
      };
      if (scenario === 'late during save') {
        const save = f.store.save;
        f.store.save = async (value, { guard }) => {
          f.runs.push(oldRun);
          await guard();
          return save(value);
        };
        await assert.rejects(recoverExactRelease(request), /late|proof/);
        assert.equal(f.getSaved().batches[0].exactReleaseRecoveries, undefined);
        return;
      }
      await recoverExactRelease(request);
      const recovered = f.getSaved().batches[0];
      assert.deepEqual(recovered.exactReleaseRecoveries[0].dispatches, blocked.exactDemoDispatches);
      assert.equal(recovered.exactReleaseRecoveries[0].retirementProof.noRunProofs.length, 1);
      assert.ok(recovered.exactDemoRecovery.excludedDispatchIds.includes(old.dispatchId));
      assert.ok(
        recovered.exactDemoRecovery.excludedDispatches.some(
          (p) => p.sha === old.sha && p.dispatchId === old.dispatchId,
        ),
      );
      const fresh = createExactDemoDispatcher({
        reader: f.reader,
        postDispatch: f.post,
        now: clock,
      });
      f.github.ensureExactDemoRun = (input) => fresh.ensure(input);
      if (scenario === 'late old title') {
        f.runs.push(oldRun);
        const posts = f.calls.filter((c) => c[0] === 'dispatch').length;
        await assert.rejects(releaseBatch(exactInput(f)), /late excluded/);
        assert.equal(f.calls.filter((c) => c[0] === 'dispatch').length, posts);
        return;
      }
      const released = await releaseBatch(exactInput(f));
      assert.equal(released.status, 'merged');
      assert.equal(f.calls.filter((c) => c[0] === 'dispatch' && c[1] === 'preflight').length, 1);
      assert.equal(f.calls.filter((c) => c[0] === 'dispatch' && c[1] === 'deploy').length, 1);
      await releaseBatch(exactInput(f));
      assert.equal(f.calls.filter((c) => c[0] === 'dispatch').length, 2);
    });
});

async function lateRetirementFixture() {
  const { createExactDemoDispatcher, verifyRetiredExactDispatches, DISPATCH_SETTLE_MS } =
    await import('../../src/bug-pipeline/exact-demo-dispatch.mjs');
  const f = exactBackendFixture();
  await wireRecovery(f);
  let offset = 0;
  const clock = () => Date.now() + offset;
  const save = f.store.save;
  f.store.save = async (value, options = {}) => {
    await options.guard?.();
    return save(value);
  };
  f.github.verifyExactRecoveryRuns = (input) =>
    verifyRetiredExactDispatches({
      ...input,
      reader: f.reader,
      now: clock,
      delay: async (ms) => {
        offset += ms;
      },
    });
  const rejected = createExactDemoDispatcher({
    reader: f.reader,
    postDispatch: async () => {
      throw Error('synthetic rejected POST');
    },
  });
  f.github.ensureExactDemoRun = (input) => rejected.ensure(input);
  await assert.rejects(releaseBatch(exactInput(f)), /rejected POST/);
  const original = structuredClone(f.getSaved().batches[0]);
  const old = original.exactDemoDispatches.preflight;
  offset = Math.max(Date.parse(old.intentAt), Date.parse(original.releaseBlock.at)) +
    DISPATCH_SETTLE_MS + 1 - Date.now();
  await recoverExactRelease({ ...recoveryInput(f), now: clock });
  const noRunArchive = structuredClone(f.getSaved().batches[0].exactReleaseRecoveries[0]);
  const late = { id: 899, run_attempt: 1, head_sha: old.sha, head_branch: 'main',
    repository: { full_name: f.state.repository },
    head_repository: { full_name: f.state.repository },
    path: '.github/workflows/deploy-demo-exact-commit.yml', event: 'workflow_dispatch',
    display_title: `demo-exact preflight ${old.sha} ${old.dispatchId}`,
    status: 'in_progress',
    conclusion: null,
  };
  f.runs.push(late);
  const dispatcher = createExactDemoDispatcher({
    reader: f.reader,
    postDispatch: f.post,
  });
  f.github.ensureExactDemoRun = (input) => dispatcher.ensure(input);
  await assert.rejects(releaseBatch(exactInput(f)), /late excluded/);
  assert.equal(f.calls.filter((c) => c[0] === 'dispatch').length, 0);
  return { ...f, late, old, clock, noRunArchive, dispatcher };
}

test('controller recovery absorbs a completed late no-run dispatch, permits exactly one fresh ensure and preserves exclusions through another recovery', async () => {
  const f = await lateRetirementFixture();
  const request = { ...recoveryInput(f), now: f.clock };
  await assert.rejects(recoverExactRelease(request), /active old dispatch/);
  assert.equal(f.getSaved().batches[0].exactReleaseRecoveries.length, 1);
  f.late.status = 'completed'; f.late.conclusion = 'success';
  await recoverExactRelease(request);
  let batch = f.getSaved().batches[0];
  assert.deepEqual(batch.exactReleaseRecoveries[0], f.noRunArchive);
  assert.ok(batch.exactDemoRecovery.excludedRunIds.includes(899));
  const proof = batch.exactReleaseRecoveries[1].retirementProof.lateRetiredRunIds;
  assert.equal(proof.length, 1);
  assert.equal(proof[0].runId, 899);
  assert.equal(proof[0].dispatchId, f.old.dispatchId);
  assert.equal(proof[0].run.conclusion, 'success');
  const exclusions = structuredClone(batch.exactDemoRecovery);
  const ensure = () => f.dispatcher.ensure({ operation: 'preflight',
    expectedSha: f.old.sha, progress: f.getSaved().batches[0].exactDemoDispatches?.preflight,
    excludedRunIds: exclusions.excludedRunIds,
    excludedDispatchIds: exclusions.excludedDispatchIds,
    excludedDispatches: exclusions.excludedDispatches,
    saveProgress: async (progress) => {
      const state = await f.store.load();
      state.batches[0].exactDemoDispatches.preflight = progress;
      await f.store.save(state);
    },
  });
  await ensure();
  await ensure();
  assert.equal(f.calls.filter((c) => c[0] === 'dispatch').length, 1);
  const artifact = f.reader.artifact;
  f.reader.artifact = async (...args) => {
    const value = await artifact(...args); value.receipt.verifiedAt = '2020-01-01'; return value;
  };
  await assert.rejects(releaseBatch(exactInput(f)), /expired/);
  f.reader.artifact = artifact;
  await recoverExactRelease({ ...recoveryInput(f), now: f.clock });
  batch = f.getSaved().batches[0];
  assert.equal(batch.exactReleaseRecoveries.length, 3);
  assert.deepEqual(batch.exactReleaseRecoveries[0], f.noRunArchive);
  assert.ok(batch.exactDemoRecovery.excludedRunIds.includes(899));
  assert.ok(batch.exactDemoRecovery.excludedRunIds.includes(901));
  assert.equal(batch.exactReleaseRecoveries[2].retirementProof.lateRetiredRunIds[0].runId, 899);
  assert.equal(f.calls.filter((c) => c[0] === 'dispatch').length, 1);
});

test('late retirement controller refuses ambiguous, malformed, incomplete or changed proofs at actual recovery save', async (t) => {
  for (const mode of [
    'ambiguous',
    'head repository',
    'repository',
    'SHA',
    'workflow',
    'event',
    'branch',
    'attempt',
    'conclusion',
    'incomplete',
    'detail drift',
    'save active',
    'save conclusion',
    'save disappeared',
    'save duplicate',
    'save main',
    'save block',
    'save authorization',
    'save original no-run proof',
  ])
    await t.test(mode, async () => {
      const f = await lateRetirementFixture();
      f.late.status = 'completed'; f.late.conclusion = 'success';
      const before = structuredClone(f.getSaved().batches[0]);
      if (mode === 'ambiguous') f.runs.push({ ...f.late, id: 898 });
      if (mode === 'head repository') f.late.head_repository = { full_name: 'foreign/repo' };
      if (mode === 'repository') f.late.repository = { full_name: 'foreign/repo' };
      if (mode === 'SHA') f.late.head_sha = 'e'.repeat(40);
      if (mode === 'workflow') f.late.path = '.github/workflows/foreign.yml';
      if (mode === 'event') f.late.event = 'push';
      if (mode === 'branch') f.late.head_branch = 'foreign';
      if (mode === 'attempt') f.late.run_attempt = 2;
      if (mode === 'conclusion') f.late.conclusion = null;
      const read = f.reader.getJson;
      f.reader.getJson = async (route) => {
        const result = await read(route);
        if (mode === 'SHA' && route.includes(`head_sha=${f.old.sha}`))
          return { total_count: 1, workflow_runs: [structuredClone(f.late)] };
        if (mode === 'incomplete' && route.includes('/runs?')) result.total_count++;
        if (mode === 'detail drift' && route === 'actions/runs/899') result.conclusion = 'failure';
        return result;
      };
      let reachedSave = false;
      if (mode.startsWith('save ')) {
        const save = f.store.save;
        f.store.save = async (value, options) => {
          reachedSave = true;
          if (mode === 'save active') { f.late.status = 'in_progress'; f.late.conclusion = null; }
          if (mode === 'save conclusion') f.late.conclusion = 'failure';
          if (mode === 'save disappeared') f.runs.length = 0;
          if (mode === 'save duplicate') f.runs.push({ ...f.late, id: 898 });
          if (mode === 'save main') f.setMain('e'.repeat(40));
          if (mode === 'save block') f.getSaved().batches[0].releaseBlock.id = 'changed';
          if (mode === 'save authorization') f.github.authorizeReleaseRecovery = async () => 'foreign';
          if (mode === 'save original no-run proof')
            f.getSaved().batches[0].exactReleaseRecoveries[0].retirementProof.noRunProofs[0].originAt =
              '2020-01-01T00:00:00.000Z';
          return save(value, options);
        };
      }
      await assert.rejects(recoverExactRelease({ ...recoveryInput(f), now: f.clock }));
      if (mode.startsWith('save ')) assert.equal(reachedSave, true);
      assert.equal(f.getSaved().batches[0].exactReleaseRecoveries.length, 1);
      if (!['save block', 'save original no-run proof'].includes(mode))
        assert.deepEqual(f.getSaved().batches[0], before);
      assert.equal(f.calls.filter((c) => c[0] === 'dispatch').length, 0);
    });
});

test('known late run disappearance or proof drift blocks both later recovery and dispatcher without a new POST', async (t) => {
  for (const mode of ['missing', 'identity', 'attempt', 'conclusion', 'detail drift'])
    await t.test(mode, async () => {
      const f = await lateRetirementFixture();
      f.late.status = 'completed'; f.late.conclusion = 'success';
      await recoverExactRelease({ ...recoveryInput(f), now: f.clock });
      const savedArchive = structuredClone(f.getSaved().batches[0].exactReleaseRecoveries[0]);
      if (mode === 'missing') f.runs.length = 0;
      if (mode === 'identity') f.late.display_title += ' changed';
      if (mode === 'attempt') f.late.run_attempt = 2;
      if (mode === 'conclusion') f.late.conclusion = 'failure';
      if (mode === 'detail drift') {
        const read = f.reader.getJson;
        f.reader.getJson = async (route) => {
          const value = await read(route);
          if (route === 'actions/runs/899') value.conclusion = 'failure';
          return value;
        };
      }
      await assert.rejects(releaseBatch(exactInput(f)));
      await assert.rejects(recoverExactRelease({ ...recoveryInput(f), now: f.clock }));
      assert.deepEqual(f.getSaved().batches[0].exactReleaseRecoveries[0], savedArchive);
      assert.equal(f.calls.filter((c) => c[0] === 'dispatch').length, 0);
      assert.equal(f.getSaved().batches[0].exactReleaseRecoveries.length, 2);
    });
});

test('recovery refuses orphan excluded dispatch descriptors even with no current dispatches or archives', async () => {
  const f = await lateRetirementFixture();
  const batch = f.getSaved().batches[0];
  assert.deepEqual(batch.exactDemoDispatches, {});
  assert.equal(batch.exactDemoRecovery.excludedDispatches.length, 1);
  batch.exactReleaseRecoveries = [];
  const before = structuredClone(batch);
  await assert.rejects(
    recoverExactRelease({ ...recoveryInput(f), now: f.clock }),
    /excluded dispatch missing archived identity/,
  );
  assert.deepEqual(f.getSaved().batches[0], before);
  assert.equal(f.calls.filter((c) => c[0] === 'dispatch').length, 0);
});

test('automatic release honors global pause, explicit subject handback and independent active operator holds', () => {
  const f = fixture();
  const before = JSON.stringify(f.batch);
  f.state.operatorTakeover = { active: true };
  assert.equal(selectAutoReleaseBatch(f.state), null);
  f.state.operatorTakeover.automation = {
    enabled: true,
    mode: 'new-unclaimed-only',
    protectedSubjects: [],
  };
  assert.equal(selectAutoReleaseBatch(f.state), f.batch);
  f.state.operatorTakeover.subjects = [
    { collection: 'batches', id: f.batch.id, sha: 'historical-sha' },
  ];
  assert.equal(selectAutoReleaseBatch(f.state), null);
  delete f.state.operatorTakeover.subjects;
  f.state.operatorTakeover.automation.protectedSubjects.push({
    collection: 'batches',
    id: f.batch.id,
  });
  assert.equal(selectAutoReleaseBatch(f.state), null);
  f.state.operatorTakeover.automation.protectedSubjects = [];
  f.batch.operatorCoordination = {
    active: true,
    finishedAt: 'historical-but-still-active',
  };
  assert.equal(selectAutoReleaseBatch(f.state), null);
  delete f.batch.operatorCoordination;
  f.batch.operatorReleaseCoordination = { stage: 'awaiting-provider-proof' };
  assert.equal(selectAutoReleaseBatch(f.state), null);
  delete f.batch.operatorReleaseCoordination;
  assert.equal(JSON.stringify(f.batch), before);
});

test('automatic release rechecks ownership on native fresh loads instead of relying on initial selection', async () => {
  for (const ownership of ['global', 'subject']) {
    const f = fixture();
    const load = f.store.load;
    let reads = 0;
    f.store.load = async () => {
      const state = await load();
      if (++reads >= 2) {
        if (ownership === 'global') state.operatorTakeover = { active: true };
        else state.batches[0].operatorCoordination = { active: true };
      }
      return state;
    };
    await assert.rejects(
      releaseBatch({
        repo: f.state.repository,
        github: f.github,
        store: f.store,
        batchId: f.batch.id,
        reviewedSha: sha,
        configured,
        execute: true,
        automatic: true,
      }),
      (error) => error.code === 'release-operator-owned',
    );
    assert.equal(
      f.calls.filter(([name]) => ['merge', 'save', 'ready', 'status', 'comment'].includes(name))
        .length,
      0,
    );
    assert.ok(reads >= 2);
    assert.equal(f.getSaved().batches[0].phase, 'ready');
  }
});

test('automatic native merge callback rejects late takeover and preserves the genuine existing reservation', async () => {
  const f = fixture();
  const reservation = {
    status: 'merging',
    nonce: 'synthetic-live-reservation',
    reviewedSha: sha,
    reservedAt: '2026-10-22T00:00:00Z',
  };
  f.batch.release = structuredClone(reservation);
  let callbackChecked = false;
  f.github.mergePullRequest = async (_, __, options) => {
    f.getSaved().operatorTakeover = { active: true };
    callbackChecked = true;
    await options.guard();
    assert.fail('native merge cannot proceed after observed handover');
  };
  await assert.rejects(
    releaseBatch({
      repo: f.state.repository,
      github: f.github,
      store: f.store,
      batchId: f.batch.id,
      reviewedSha: sha,
      configured,
      execute: true,
      automatic: true,
    }),
    (error) => error.code === 'release-operator-owned',
  );
  assert.equal(callbackChecked, true);
  assert.deepEqual(f.getSaved().batches[0].release, reservation);
  assert.equal(
    f.calls.filter(([name]) => ['merge', 'save', 'status', 'comment'].includes(name)).length,
    0,
  );
});

test('automatic release rejection does not leak into separately authorized explicit maintainer release', async () => {
  const f = fixture();
  f.state.operatorTakeover = { active: true };
  const args = {
    repo: f.state.repository,
    github: f.github,
    store: f.store,
    batchId: f.batch.id,
    reviewedSha: sha,
    configured,
    execute: true,
  };
  await assert.rejects(
    releaseBatch({ ...args, automatic: true }),
    (error) => error.code === 'release-operator-owned',
  );
  assert.equal(f.calls.length, 0);
  const result = await releaseBatch(args);
  assert.equal(result.status, 'merged');
  assert.equal(f.calls.filter(([name]) => name === 'merge').length, 1);
  assert.equal(f.getSaved().operatorTakeover.active, true);
});

test('automatic completion publication uses fresh ownership guards and retains pending deployment facts without issue writes', async () => {
  const f = fixture();
  await releaseBatch({
    repo: f.state.repository,
    github: f.github,
    store: f.store,
    batchId: f.batch.id,
    reviewedSha: sha,
    configured,
    execute: true,
  });
  const batch = f.getSaved().batches[0];
  batch.release.status = 'deployed';
  batch.release.deployment = {
    status: 'deployed',
    reviewedSha: sha,
    mergeSha,
    vercelUrl: 'https://clinicos-eosin.vercel.app',
  };
  batch.release.publication = { status: 'pending' };
  f.getSaved().operatorTakeover = { active: true };
  const before = structuredClone(f.getSaved()),
    count = f.calls.length;
  await assert.rejects(
    publishDeploymentCompletion({
      repo: f.state.repository,
      github: f.github,
      store: f.store,
      batch,
      automatic: true,
    }),
    (error) => error.code === 'release-operator-owned',
  );
  assert.deepEqual(f.getSaved(), before);
  assert.deepEqual(f.calls.slice(count), []);
});
