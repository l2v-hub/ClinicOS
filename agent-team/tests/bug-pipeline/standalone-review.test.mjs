import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStandaloneReview,
  standaloneReviewStep,
  mergeStandaloneReview,
  validateStandaloneState,
  STANDALONE_REPO as repo,
} from '../../src/bug-pipeline/standalone-review.mjs';
import { sha256, feedbackFingerprint } from '../../src/bug-pipeline/contracts.mjs';
import { runPipeline } from '../../src/bug-pipeline/pipeline.mjs';
import { STANDALONE_INFRASTRUCTURE_FILES } from '../../src/bug-pipeline/cli.mjs';
import {
  finalizeEnvironment,
  main as handoffMain,
  handoffErrorDiagnostic,
} from '../../src/bug-pipeline/review-handoff-cli.mjs';
import {
  createGitHub,
  MERGE_PREPARATION_TIMEOUT_MS,
  MERGE_RESERVATION_LEASE_MS,
  MAX_DURABLE_STATE_BYTES,
  RESULT_RESERVATION_BYTES,
} from '../../src/bug-pipeline/github.mjs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import nodePath from 'node:path';
const clone = (value) => structuredClone(value);
// Core merge fixtures inject a harmless scope; production CLI policy remains empty.
const FIXTURE_INFRASTRUCTURE_FILES = Object.freeze(['docs/synthetic-review-regression.md']);
const sha = 'a'.repeat(40),
  baseSha = 'b'.repeat(40),
  testedSha = 'c'.repeat(40);
const path = 'artifacts/task-validation/standalone-review-81';
const report = () => ({
  subject_sha: sha,
  verdict: 'approved',
  summary: 'Inspected frozen source and evidence.',
  findings: [],
});
function fixture({ authorizationVerifier = true, now } = {}) {
  let remote = { schemaVersion: 1, repository: repo, batches: [] },
    version = 0,
    login = 'maintainer',
    authorized = true,
    allChecks = true,
    mutateTree,
    checksHook,
    mergeBase = baseSha;
  const writes = [],
    published = [],
    comments = [],
    labels = [];
  const treeOverrides = new Map(),
    fileContents = new Map();
  const pr = {
    number: 81,
    state: 'open',
    merged: false,
    draft: false,
    head: { sha, ref: 'feature/review', repo: { full_name: repo, fork: false } },
    base: { sha: baseSha, ref: 'main', repo: { full_name: repo } },
  };
  const feedback = {
    number: 81,
    url: `https://github.com/${repo}/pull/81`,
    state: 'OPEN',
    isDraft: false,
    head: sha,
    headRef: 'feature/review',
    headRepo: repo,
    headIsFork: false,
    baseRef: 'main',
    comments: [],
    unresolved: false,
    changesRequested: false,
  };
  const implementation = [1, 2, 3].map((round) => ({
    round,
    status: round === 3 ? 'passed' : 'failed',
    subjectSha: testedSha,
    evidence: `attempt-${round}.json`,
    legacy: { attempt: round, retained: true },
  }));
  const sources = [
    {
      path: 'agent-team/tests/example.mjs',
      blob: 'd'.repeat(40),
      mode: '100644',
      baseBlob: 'e'.repeat(40),
      baseMode: '100644',
    },
  ];
  const content = Object.fromEntries(
    [
      'task-contract.md',
      'analysis.md',
      'implementation-plan.md',
      'validation-report.md',
      ...implementation.map((a) => a.evidence),
    ].map((file) => [file, `Synthetic frozen ${file}\n`]),
  );
  const files = Object.fromEntries(
    Object.entries(content).map(([file, text]) => [file, sha256(text)]),
  );
  content['imported-history.json'] = JSON.stringify({
    implementation,
    reviews: [],
    reviewLedger: null,
    reviewReports: {},
    sourceManifest: sources,
    packetFiles: files,
  });
  const manifest = {
    schemaVersion: 1,
    repository: repo,
    pr: { number: 81, url: feedback.url },
    sha,
    baseSha,
    baseRef: 'main',
    branch: pr.head.ref,
    issues: [],
    packet: {
      path,
      files: { ...files, 'imported-history.json': sha256(content['imported-history.json']) },
    },
    sourceManifest: sources,
    implementation,
    reviews: [],
    reviewLedger: null,
    reviewReports: {},
    releaseHold: 'Await genuine reviews and infrastructure authorization',
  };
  const github = {
    createStateStore() {
      let loaded;
      return {
        load: async () => {
          loaded = version;
          return clone(remote);
        },
        save: async (state, { guard } = {}) => {
          const expected = loaded;
          if (guard) await guard();
          assert.equal(expected, version, 'CAS conflict');
          remote = clone(state);
          version++;
          loaded = version;
          writes.push(clone(state));
        },
      };
    },
    authorized: async () => authorized,
    authorizedMaintainer: async () => authorized,
    nativeReviewAuthorization: async () => ({
      author: 'pr-author',
      humanApproved: true,
      protectedReviews: true,
    }),
    requiredChecks: async () => {
      if (checksHook) await checksHook();
      return { ok: true, details: ['required: SUCCESS'] };
    },
    readFileAtRevision: async (file) => {
      const text = fileContents.has(file)
        ? fileContents.get(file)
        : content[file.slice(path.length + 1)];
      assert.equal(typeof text, 'string');
      return { content: text, sha256: sha256(text) };
    },
    viewIssue: async (number) => ({
      number,
      state: 'open',
      pull_request: number === 81 ? {} : undefined,
      comments: clone(comments),
      labels: clone(labels),
    }),
    reviewFeedback: async () => ({
      ...clone(feedback),
      comments: [
        ...clone(feedback.comments),
        ...clone(comments).map((c) => ({ id: c.id, body: c.body, author: c.user.login })),
      ],
    }),
    commentPR: async (number, body) =>
      comments.push({ id: comments.length + 1, body, user: { login, type: 'User' } }),
    publishExternalReview: async (number, head, review, round) => {
      published.push({ number, head, review, round });
      feedback.comments.push({
        id: 900,
        author: login,
        body: `<!-- clinicos-claude-cron:${number}:${head}:${round} -->\nreview`,
      });
    },
  };
  const run = async (call) => {
    assert.equal(call.command, 'gh', 'Review must never execute source or model commands');
    const args = call.args,
      endpoint = args[1];
    if (args[0] === 'pr' && args[1] === 'checks')
      return {
        ok: allChecks,
        stdout: JSON.stringify([
          {
            name: 'AI Runtime Tests',
            state: allChecks ? 'SUCCESS' : 'FAILURE',
            bucket: allChecks ? 'pass' : 'fail',
          },
        ]),
      };
    if (endpoint === 'user') return { ok: true, stdout: JSON.stringify({ login }) };
    if (endpoint === `repos/${repo}/pulls/81`) return { ok: true, stdout: JSON.stringify(pr) };
    if (endpoint.startsWith(`repos/${repo}/compare/`))
      return {
        ok: true,
        stdout: JSON.stringify({
          base_commit: { sha: pr.base.sha },
          merge_base_commit: { sha: mergeBase },
        }),
      };
    if (endpoint.startsWith(`repos/${repo}/git/trees/`)) {
      const revision = endpoint.split('/').at(-1).split('?')[0];
      if (treeOverrides.has(revision))
        return {
          ok: true,
          stdout: JSON.stringify({ truncated: false, tree: clone(treeOverrides.get(revision)) }),
        };
      const tree = [
        {
          path: sources[0].path,
          type: 'blob',
          mode: '100644',
          sha: revision === baseSha ? sources[0].baseBlob : sources[0].blob,
        },
      ];
      if (revision === sha)
        for (const [file, digest] of Object.entries(manifest.packet.files))
          tree.push({
            path: path + '/' + file,
            type: 'blob',
            mode: '100644',
            sha: digest.slice(0, 40),
          });
      if (mutateTree) mutateTree(tree, revision);
      return { ok: true, stdout: JSON.stringify({ truncated: false, tree }) };
    }
    if (endpoint === `repos/${repo}/issues/81/labels`) {
      const body = JSON.parse(call.input);
      labels.push(...body.labels.filter((l) => !labels.includes(l)));
      return { ok: true, stdout: '{}' };
    }
    if (endpoint.startsWith(`repos/${repo}/issues/81/labels/`)) {
      labels.splice(labels.indexOf(decodeURIComponent(endpoint.split('/').at(-1))), 1);
      return { ok: true, stdout: '' };
    }
    assert.fail('Unexpected transport ' + JSON.stringify(call));
  };
  let nonce = 0;
  let authorizationNonce = 0;
  const controller = createStandaloneReview({
    now,
    authorizationVerifier: authorizationVerifier ? async ({ binding }) => ({
      provenance: 'user-session', grantId: 'synthetic-session', sourceRef: 'test:session',
      consumptionNonce: `action-${++authorizationNonce}`, binding,
    }) : undefined,
    github,
    run,
    cwd: '/trusted',
    nonce: () => `request-${++nonce}`,
  });
  return {
    controller,
    github,
    manifest,
    content,
    writes,
    published,
    comments,
    feedback,
    labels,
    pr,
    remote: () => remote,
    setActor: (v) => (login = v),
    revoke: () => (authorized = false),
    failChecks: () => (allChecks = false),
    mutateTree: (fn) => (mutateTree = fn),
    checksHook: (fn) => (checksHook = fn),
    setMergeBase: (value) => (mergeBase = value),
    run,
    treeOverrides,
    fileContents,
  };
}

async function isolatedFinalizeEnvironment(t) {
  const home = await mkdtemp(nodePath.join(os.tmpdir(), 'standalone-finalize-auth-'));
  const codexHome = nodePath.join(home, 'synthetic-codex-home');
  await mkdir(codexHome);
  t.after(() => rm(home, { recursive: true, force: true }));
  return { HOME: home, CODEX_HOME: codexHome };
}
async function claimed(f) {
  await f.controller.adopt(f.manifest);
  await f.controller.request(81);
  return f.controller.claim(81);
}

test('standalone adoption binds true PR identity, source/config projection, packet and all three imported attempts', async () => {
  const f = fixture();
  const adopted = await f.controller.adopt(f.manifest);
  assert.equal(adopted.implementation.length, 3);
  assert.equal(adopted.implementation[2].subjectSha, testedSha);
  assert.equal(adopted.sha, sha);
  assert.equal(f.remote().batches.length, 0);
  assert.deepEqual(adopted.implementation, f.manifest.implementation);
  await assert.rejects(f.controller.adopt(f.manifest), /New verified SHA/);
});

test('adoption rejects fork, base drift, missing native checks, malformed source or packet, and historical source mismatch', async () => {
  for (const mutate of [
    (f) => (f.pr.head.repo.fork = true),
    (f) => (f.pr.base.ref = 'untrusted-base'),
    (f) => f.failChecks(),
    (f) => (f.content['analysis.md'] += 'edited'),
    (f) => (f.manifest.sourceManifest[0].blob = 'f'.repeat(40)),
    (f) =>
      f.mutateTree((tree, rev) => {
        if (rev === testedSha) tree[0].sha = 'f'.repeat(40);
      }),
  ]) {
    const f = fixture();
    mutate(f);
    await assert.rejects(f.controller.adopt(f.manifest));
    assert.equal(f.writes.length, 0);
  }
});

test('CAS claim reserves before analysis, retains imported history, and exclusive PR labels follow request/running/published', async () => {
  const f = fixture();
  await f.controller.adopt(f.manifest);
  let subject = await f.controller.request(81);
  f.labels.push('review-blocked');
  await f.controller.publishState(subject);
  assert.deepEqual(f.labels, ['claude-review-ready']);
  subject = await f.controller.claim(81);
  assert.equal(f.remote().standaloneReviews[0].reviews[0].status, 'running');
  assert.equal(f.published.length, 0);
  assert.equal(subject.implementation.length, 3);
  await f.controller.publishState(subject);
  assert.deepEqual(f.labels, ['claude-reviewing']);
  await assert.rejects(f.controller.claim(81));
  await f.controller.submit(81, report());
  subject = await f.controller.reconcilePR(81);
  assert.equal(subject.externalReview.status, 'published');
  assert.equal(subject.reviews.length, 1);
  assert.equal(
    subject.reviewLedger.rounds[0].review_sha256,
    sha256(subject.reviewReports['claude-review-1.json']),
  );
  await f.controller.publishState(subject);
  assert.deepEqual(f.labels, ['codex-review-ready']);
  assert.equal(f.published.length, 1);
});

test('cloud provider failure settles only its native standalone claim and projects blocked without refunding history', async () => {
  const f = fixture();
  const subject = await claimed(f);
  const snapshot = structuredClone(subject);
  const failed = await f.controller.failOwnedClaim(81, snapshot, 'claude-rate-limit');
  assert.equal(failed.reviews.length, snapshot.reviews.length);
  assert.equal(failed.reviews.at(-1).status, 'failed');
  assert.equal(failed.reviewLedger.rounds.at(-1).verdict, 'failed');
  assert.deepEqual(failed.implementation, snapshot.implementation);
  assert.deepEqual(failed.packet, snapshot.packet);
  assert.deepEqual(failed.sourceManifest, snapshot.sourceManifest);
  assert.deepEqual(failed.recoveryHistory.at(-1).previous, snapshot.externalReview);
  await f.controller.publishState(failed);
  assert.deepEqual(f.labels, ['review-blocked']);
  await assert.rejects(f.controller.claim(81));
  assert.equal(f.published.length, 0);
});

test('standalone simultaneous claims use one durable reservation and no fifth review is inferred', async () => {
  const f = fixture();
  await f.controller.adopt(f.manifest);
  await f.controller.request(81);
  let arrivals = 0,
    release;
  const gate = new Promise((resolve) => (release = resolve));
  f.checksHook(async () => {
    if (++arrivals === 2) release();
    await gate;
  });
  const result = await Promise.allSettled([f.controller.claim(81), f.controller.claim(81)]);
  assert.equal(result.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(f.remote().standaloneReviews[0].reviews.length, 1);
});

test('owner, nonce, SHA and full tracked tree protect standalone comment import', async () => {
  const f = fixture();
  await claimed(f);
  f.setActor('another-maintainer');
  await assert.rejects(f.controller.submit(81, report()), /owned review/);
  f.setActor('maintainer');
  const invalid = {
    ...report(),
    verdict: 'changes-requested',
    findings: [
      {
        severity: 'high',
        file: 'absent.mjs',
        line: 1,
        problem: 'Absent',
        requested_change: 'Correct',
        test_expectation: 'Regress',
      },
    ],
  };
  await assert.rejects(f.controller.submit(81, invalid));
  await f.controller.submit(81, report());
  const genuine = f.comments.pop();
  const replay = JSON.parse(genuine.body.split('\n').slice(1).join('\n'));
  replay.claim_id = 'old-claim';
  f.comments.push({
    ...genuine,
    body: genuine.body.split('\n')[0] + '\n' + JSON.stringify(replay),
  });
  assert.equal((await f.controller.reconcilePR(81)).externalReview.status, 'comment-running');
  f.comments.pop();
  f.comments.push(genuine);
  assert.equal((await f.controller.reconcilePR(81)).externalReview.status, 'published');
});

async function published(f) {
  await claimed(f);
  await f.controller.submit(81, report());
  return f.controller.reconcilePR(81);
}
function stepOptions(f, subject, qa) {
  const state = f.remote();
  state.standaloneReviews[0] = subject;
  return {
    subject,
    controller: f.controller,
    github: f.github,
    workspace: { finalQaStandalone: qa },
    save: async () => {
      const store = f.github.createStateStore();
      await store.load();
      await store.save(state);
    },
  };
}

test('pipeline independent QA reserves ownership, keeps release hold, and exposes genuine two-review readiness only', async () => {
  const f = fixture();
  const subject = await published(f);
  let calls = 0;
  const options = stepOptions(f, subject, async (s) => {
    calls++;
    assert.equal(f.remote().standaloneReviews[0].codexFinalReview.status, 'running');
    assert.equal(s.sha, sha);
    return { status: 'verified', summary: 'Read-only acceptance/evidence checked.' };
  });
  await standaloneReviewStep(options);
  assert.equal(calls, 1);
  assert.equal(subject.phase, 'ready');
  assert.equal(subject.approvedSha, sha);
  assert.equal(subject.releaseHold, f.manifest.releaseHold);
  await standaloneReviewStep(options);
  assert.equal(calls, 1, 'Independent QA never reruns implicitly');
  await assert.rejects(
    mergeStandaloneReview({
      subject,
      controller: f.controller,
      github: f.github,
      infrastructureFiles: [f.manifest.sourceManifest[0].path],
    }),
    /releaseHold/,
  );
});

test('QA findings and changed feedback block, while an existing running owner remains pending', async () => {
  for (const kind of ['findings', 'interrupted', 'feedback']) {
    const f = fixture();
    const subject = await published(f);
    let calls = 0;
    if (kind === 'interrupted')
      subject.codexFinalReview = { status: 'running', subjectSha: sha, claudeRound: 1 };
    if (kind === 'feedback')
      f.feedback.comments.push({ id: 500, author: 'human', body: 'Check regression' });
    await standaloneReviewStep(
      stepOptions(f, subject, async () => {
        calls++;
        return {
          status: 'blocked',
          summary: 'agent-team/tests/example.mjs:1: missing regression evidence',
        };
      }),
    );
    assert.equal(subject.phase, kind === 'interrupted' ? 'waiting-review' : 'blocked');
    assert.equal(subject.approvedSha, undefined);
    assert.equal(subject.implementation.length, 3);
    assert.equal(calls, kind === 'findings' ? 1 : 0);
  }
});

test('infrastructure merge boundary reuses exact-SHA protected merge and rejects application/deployment scope', async () => {
  const f = fixture();
  f.manifest.releaseHold = false;
  const subject = await published(f);
  await standaloneReviewStep(
    stepOptions(f, subject, async () => ({ status: 'verified', summary: 'No findings' })),
  );
  let called = 0;
  f.github.mergePullRequest = async (pr, head, { guard }) => {
    await guard();
    called++;
    assert.equal(pr, 81);
    assert.equal(head, sha);
    return { mergeSha: '9'.repeat(40) };
  };
  assert.equal(
    (
      await mergeStandaloneReview({
        subject,
        controller: f.controller,
        github: f.github,
        infrastructureFiles: [f.manifest.sourceManifest[0].path],
      })
    ).status,
    'ready-to-merge',
  );
  assert.equal(called, 0);
  subject.release = { status: 'merging', reviewedSha: sha, prNumber: 81, nonce: 'direct-reservation', reservedAt: new Date().toISOString() };
  await stepOptions(f, subject, async () => assert.fail()).save();
  await mergeStandaloneReview({
    subject,
    controller: f.controller,
    github: f.github,
    infrastructureFiles: [f.manifest.sourceManifest[0].path],
    execute: true,
  });
  assert.equal(called, 1);
  await assert.rejects(
    mergeStandaloneReview({
      subject,
      controller: f.controller,
      github: f.github,
      infrastructureFiles: [],
    }),
  );
  f.failChecks();
  await assert.rejects(
    mergeStandaloneReview({
      subject,
      controller: f.controller,
      github: f.github,
      infrastructureFiles: [f.manifest.sourceManifest[0].path],
    }),
  );
  assert.equal(called, 1);
});

function revision(f, { rewriteCopy = false, rewriteOld = false, removeOld = false } = {}) {
  const old = f.manifest,
    next = clone(old),
    current = 'f'.repeat(40),
    packet = path + '-revision-2';
  const previousEntries = Object.entries(old.packet.files).map(([file, digest]) => ({
    path: path + '/' + file,
    type: 'blob',
    mode: '100644',
    sha: digest.slice(0, 40),
  }));
  for (const [file, text] of Object.entries(f.content)) f.fileContents.set(path + '/' + file, text);
  if (rewriteOld) {
    f.fileContents.set(path + '/analysis.md', 'Rewritten historical contract analysis');
    previousEntries.find((e) => e.path === path + '/analysis.md').sha = sha256(
      'Rewritten historical contract analysis',
    ).slice(0, 40);
  }
  if (removeOld)
    previousEntries.splice(
      previousEntries.findIndex((e) => e.path === path + '/analysis.md'),
      1,
    );
  next.sha = current;
  next.packet = { path: packet, files: {} };
  next.sourceManifest = [
    ...clone(old.sourceManifest),
    ...previousEntries.map((e) => ({
      path: e.path,
      blob: e.sha,
      mode: e.mode,
      baseBlob: null,
      baseMode: null,
    })),
  ];
  const contents = clone(f.content);
  delete contents['imported-history.json'];
  if (rewriteCopy) contents['attempt-1.json'] = 'Rewritten failed attempt proof';
  for (const [file, text] of Object.entries(contents)) next.packet.files[file] = sha256(text);
  contents['imported-history.json'] = JSON.stringify({
    implementation: next.implementation,
    reviews: next.reviews,
    reviewLedger: next.reviewLedger,
    reviewReports: next.reviewReports,
    sourceManifest: next.sourceManifest,
    packetFiles: clone(next.packet.files),
  });
  next.packet.files['imported-history.json'] = sha256(contents['imported-history.json']);
  for (const [file, text] of Object.entries(contents))
    f.fileContents.set(packet + '/' + file, text);
  const tree = [
    {
      path: old.sourceManifest[0].path,
      type: 'blob',
      mode: '100644',
      sha: old.sourceManifest[0].blob,
    },
    ...previousEntries,
    ...Object.entries(next.packet.files).map(([file, digest]) => ({
      path: packet + '/' + file,
      type: 'blob',
      mode: '100644',
      sha: digest.slice(0, 40),
    })),
  ];
  f.treeOverrides.set(current, tree);
  f.pr.head.sha = current;
  f.feedback.head = current;
  return next;
}

test('revision appends new packet and preserves every old proof byte on the current head', async () => {
  const f = fixture();
  await f.controller.adopt(f.manifest);
  const next = revision(f);
  const adopted = await f.controller.adopt(next);
  assert.deepEqual(adopted.preservedPackets, [f.manifest.packet]);
  assert.equal(adopted.implementation.length, 3);
  assert.equal(f.writes.length, 2);
  await f.controller.verify(adopted);
});

test('revision rejects rewritten old-attempt copy and rewritten or removed historical packet bytes on NEW head', async () => {
  for (const options of [{ rewriteCopy: true }, { rewriteOld: true }, { removeOld: true }]) {
    const f = fixture();
    await f.controller.adopt(f.manifest);
    const next = revision(f, options);
    await assert.rejects(f.controller.adopt(next));
    assert.equal(f.writes.length, 1, 'Invalid revision must never persist');
  }
  const f = fixture();
  await f.controller.adopt(f.manifest);
  const next = clone(f.manifest);
  next.sha = 'f'.repeat(40);
  f.pr.head.sha = next.sha;
  f.feedback.head = next.sha;
  f.treeOverrides.set(next.sha, [
    {
      path: next.sourceManifest[0].path,
      type: 'blob',
      mode: '100644',
      sha: next.sourceManifest[0].blob,
    },
    ...Object.entries(next.packet.files).map(([file, digest]) => ({
      path: path + '/' + file,
      type: 'blob',
      mode: '100644',
      sha: digest.slice(0, 40),
    })),
  ]);
  await assert.rejects(f.controller.adopt(next), /Append a new revision packet/);
});

async function runRuntime(
  f,
  workspace = {
    finalQaStandalone: async () => ({
      status: 'verified',
      summary: 'Read-only source and evidence inspection passed.',
    }),
  },
) {
  f.github.intake = async () => {};
  f.github.discoverQueue = async () => [];
  return runPipeline({
    repo,
    event: {},
    gh: f.github,
    models: {},
    workspace,
    store: f.github.createStateStore(),
    standaloneController: f.controller,
    standaloneInfrastructureFiles: STANDALONE_INFRASTRUCTURE_FILES,
  });
}
function makeAllowlisted(f, file = FIXTURE_INFRASTRUCTURE_FILES[0]) {
  f.manifest.sourceManifest[0].path = file;
  const history = JSON.parse(f.content['imported-history.json']);
  history.sourceManifest = clone(f.manifest.sourceManifest);
  f.content['imported-history.json'] = JSON.stringify(history);
  f.manifest.packet.files['imported-history.json'] = sha256(f.content['imported-history.json']);
}

test('trusted runtime fixed policy protects all original infrastructure paths and leaves protected merge manual', async () => {
  assert.deepEqual(STANDALONE_INFRASTRUCTURE_FILES, []);
  assert.equal(Object.isFrozen(STANDALONE_INFRASTRUCTURE_FILES), true);
  const f = fixture();
  makeAllowlisted(f, 'docs/standalone-pr-review.md');
  f.manifest.releaseHold = false;
  await published(f);
  f.github.mergePullRequest = async () => assert.fail('Runbook is human protected');
  const state = await runRuntime(f);
  assert.equal(state.standaloneReviews[0].phase, 'ready');
  assert.equal(state.standaloneReviews[0].codexFinalReview.status, 'verified');
  assert.equal(state.standaloneReviews[0].release, undefined);
  await runRuntime(f, { finalQaStandalone: async () => assert.fail('Verified QA is idempotent') });
});

test('runtime never merges held, unknown, application, unreviewed or failed independent QA subjects', async () => {
  for (const kind of ['hold', 'unknown', 'application', 'no-claude', 'codex-finding']) {
    const f = fixture();
    makeAllowlisted(
      f,
      kind === 'application'
        ? 'frontend/src/actual.ts'
        : kind === 'unknown'
          ? 'agent-team/src/unreviewed-policy.mjs'
          : undefined,
    );
    f.manifest.releaseHold = kind === 'hold' ? 'Existing release hold' : false;
    if (kind === 'no-claude') {
      await f.controller.adopt(f.manifest);
      await f.controller.request(81);
    } else await published(f);
    let calls = 0;
    f.github.mergePullRequest = async () => {
      calls++;
      assert.fail('Forbidden merge');
    };
    const state = await runRuntime(f, {
      finalQaStandalone: async () => ({
        status: kind === 'codex-finding' ? 'blocked' : 'verified',
        summary: 'Read-only QA result',
      }),
    });
    assert.equal(calls, 0);
    assert.notEqual(state.standaloneReviews[0].release?.status, 'merged');
    assert.equal(state.standaloneReviews[0].implementation.length, 3);
  }
});

test('runtime recovers an actual exact-SHA merge after interruption without merging or reviewing again', async () => {
  const f = fixture();
  makeAllowlisted(f);
  f.manifest.releaseHold = false;
  let subject = await published(f);
  await standaloneReviewStep(
    stepOptions(f, subject, async () => ({
      status: 'verified',
      summary: 'Read-only inspection passed.',
    })),
  );
  const store = f.github.createStateStore();
  const state = await store.load();
  state.standaloneReviews[0].release = { status: 'merging', reviewedSha: sha, prNumber: 81 };
  await store.save(state);
  f.pr.state = 'closed';
  f.pr.merged = true;
  f.pr.merge_commit_sha = '8'.repeat(40);
  f.github.mergePullRequest = async () => assert.fail('Receipt recovery never merges');
  const next = await runRuntime(f, {
    finalQaStandalone: async () => assert.fail('Receipt recovery never reviews'),
  });
  assert.equal(next.standaloneReviews[0].release.status, 'merged');
  assert.equal(next.standaloneReviews[0].release.mergeSha, f.pr.merge_commit_sha);
});

test('authenticated frozen merge-base survives a real main advance and rejects changed review ancestry/head/base', async (t) => {
  const root = await mkdtemp(nodePath.join(os.tmpdir(), 'standalone-merge-base-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: root,
      env: { PATH: process.env.PATH, HOME: root, GIT_CONFIG_NOSYSTEM: '1' },
      encoding: 'utf8',
    }).trim();
  const commit = (message) => {
    git('add', '.');
    git('-c', 'core.hooksPath=/dev/null', 'commit', '-qm', message);
    return git('rev-parse', 'HEAD');
  };
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Synthetic QA');
  git('config', 'user.email', 'synthetic@example.invalid');
  await writeFile(nodePath.join(root, 'source.mjs'), 'Synthetic base source\n');
  const base = commit('base');
  git('checkout', '-qb', 'feature/review');
  await writeFile(nodePath.join(root, 'source.mjs'), 'Synthetic reviewed source\n');
  const tested = commit('feature');
  const f = fixture();
  f.manifest.baseSha = base;
  f.manifest.implementation.forEach((attempt) => (attempt.subjectSha = tested));
  f.manifest.sourceManifest = [
    {
      path: 'source.mjs',
      blob: git('rev-parse', `${tested}:source.mjs`),
      mode: '100644',
      baseBlob: git('rev-parse', `${base}:source.mjs`),
      baseMode: '100644',
    },
  ];
  f.content['imported-history.json'] = JSON.stringify({
    implementation: f.manifest.implementation,
    reviews: [],
    reviewLedger: null,
    reviewReports: {},
    sourceManifest: f.manifest.sourceManifest,
    packetFiles: Object.fromEntries(
      Object.entries(f.manifest.packet.files).filter(([file]) => file !== 'imported-history.json'),
    ),
  });
  f.manifest.packet.files['imported-history.json'] = sha256(f.content['imported-history.json']);
  await mkdir(nodePath.join(root, path), { recursive: true });
  for (const [file, text] of Object.entries(f.content))
    await writeFile(nodePath.join(root, path, file), text);
  const head = commit('frozen evidence publication');
  f.manifest.sha = head;
  f.pr.head.sha = head;
  f.feedback.head = head;
  f.pr.base.sha = base;
  const inventory = (revision) =>
    git('ls-tree', '-r', revision)
      .split('\n')
      .map((row) => {
        const [meta, path] = row.split('\t');
        const [mode, type, sha] = meta.split(' ');
        return { path, mode, type, sha };
      });
  for (const revision of [base, tested, head]) f.treeOverrides.set(revision, inventory(revision));
  f.setMergeBase(git('merge-base', base, head));
  await f.controller.adopt(f.manifest);
  git('checkout', '-q', 'main');
  git('-c', 'core.hooksPath=/dev/null', 'commit', '--allow-empty', '-qm', 'main advance');
  const advanced = git('rev-parse', 'HEAD');
  assert.notEqual(advanced, base);
  f.pr.base.sha = advanced;
  f.setMergeBase(git('merge-base', advanced, head));
  await f.controller.verify(f.remote().standaloneReviews[0]);
  f.setMergeBase(tested);
  await assert.rejects(f.controller.verify(f.remote().standaloneReviews[0]), /merge base changed/);
  f.setMergeBase(base);
  f.pr.head.sha = advanced;
  await assert.rejects(f.controller.verify(f.remote().standaloneReviews[0]), /identity changed/);
  f.pr.head.sha = head;
  f.pr.base.ref = 'other';
  await assert.rejects(f.controller.verify(f.remote().standaloneReviews[0]), /identity changed/);
});

test('finalize authentication accepts only an explicit synthetic directory without API-key conflict', async (t) => {
  const environment = await isolatedFinalizeEnvironment(t);
  assert.deepEqual(await finalizeEnvironment(environment), environment);

  await assert.rejects(
    finalizeEnvironment({ HOME: environment.HOME }),
    (error) => error.code === 'codex-auth-unavailable',
  );

  await assert.rejects(
    finalizeEnvironment({
      HOME: environment.HOME,
      CODEX_HOME: nodePath.join(environment.HOME, 'missing-codex-home'),
    }),
    (error) => error.code === 'codex-auth-unavailable',
  );

  const fileHome = nodePath.join(environment.HOME, 'not-a-directory');
  await writeFile(fileHome, 'synthetic test file');
  await assert.rejects(
    finalizeEnvironment({ HOME: environment.HOME, CODEX_HOME: fileHome }),
    (error) => error.code === 'codex-auth-unavailable',
  );

  const emptyHome = await mkdtemp(nodePath.join(os.tmpdir(), 'standalone-finalize-empty-home-'));
  t.after(() => rm(emptyHome, { recursive: true, force: true }));
  await assert.rejects(
    finalizeEnvironment({ HOME: emptyHome }),
    (error) => error.code === 'codex-auth-unavailable',
  );
  let dependencyCalls = 0;
  await assert.rejects(
    handoffMain({
      args: ['finalize', '--pr', '81'],
      env: { HOME: emptyHome },
      dependencies: {
        run: async () => dependencyCalls++,
        github: { createStateStore: () => (dependencyCalls++, { load: async () => null }) },
      },
    }),
    (error) => error.code === 'codex-auth-unavailable',
  );
  assert.equal(dependencyCalls, 0, 'Authentication gate runs before mocked dependencies');
  await assert.rejects(
    finalizeEnvironment({ ...environment, CODEX_API_KEY: 'synthetic-test-only-key' }),
    (error) => error.code === 'codex-auth-conflict',
  );
});

test('production finalize CLI dispatch runs separate Codex QA and leaves protected merge manual without repeating QA', async (t) => {
  const env = await isolatedFinalizeEnvironment(t);
  const f = fixture();
  makeAllowlisted(f, 'docs/standalone-pr-review.md');
  f.manifest.releaseHold = false;
  await published(f);
  let qa = 0,
    merges = 0;
  f.github.mergePullRequest = async (pr, head, { guard }) => {
    await guard();
    merges++;
    f.pr.state = 'closed';
    f.pr.merged = true;
    f.pr.merge_commit_sha = '7'.repeat(40);
    return { number: pr, reviewedSha: head, mergeSha: f.pr.merge_commit_sha };
  };
  const dependencies = {
    run: f.run,
    github: f.github,
    workspace: {
      finalQaStandalone: async (subject) => {
        qa++;
        assert.equal(f.remote().standaloneReviews[0].codexFinalReview.status, 'running');
        assert.equal(subject.sha, sha);
        return {
          status: 'verified',
          summary: 'Independent synthetic QA callback; no actual model invoked.',
        };
      },
    },
  };
  assert.equal(await handoffMain({ args: ['finalize', '--pr', '81'], env, dependencies }), 0);
  assert.equal(qa, 1);
  assert.equal(merges, 0);
  assert.equal(f.remote().standaloneReviews[0].phase, 'ready');
  assert.equal(f.remote().standaloneReviews[0].release, undefined);
  assert.equal(await handoffMain({ args: ['finalize', '--pr', '81'], env, dependencies }), 0);
  assert.equal(qa, 1);
  assert.equal(merges, 0);
});

test('finalize CLI cannot process normal/unadopted PR and preserves failed Codex execution as blocked', async (t) => {
  const env = await isolatedFinalizeEnvironment(t);
  const empty = fixture();
  await assert.rejects(
    handoffMain({
      args: ['finalize', '--pr', '81'],
      env,
      dependencies: { run: empty.run, github: empty.github },
    }),
    /explicitly adopted/,
  );
  const f = fixture();
  makeAllowlisted(f);
  f.manifest.releaseHold = false;
  await published(f);
  f.github.mergePullRequest = async () => assert.fail('Unverified Codex cannot merge');
  const result = await handoffMain({
    args: ['finalize', '--pr', '81'],
    env,
    dependencies: {
      run: f.run,
      github: f.github,
      workspace: {
        finalQaStandalone: async () => {
          throw new Error('Synthetic missing model authentication');
        },
      },
    },
  });
  assert.equal(result, 1);
  assert.equal(f.remote().standaloneReviews[0].phase, 'blocked');
  assert.equal(f.remote().standaloneReviews[0].codexFinalReview.status, 'failed');
  assert.equal(f.remote().standaloneReviews[0].approvedSha, undefined);
});

test('standalone production CLI imports legitimate UTF8 CJK and surrogate-pair reports from real temp files', async (t) => {
  const temporary = await mkdtemp(nodePath.join(os.tmpdir(), 'standalone-unicode-report-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  for (const [kind, summary] of [
    ['cjk', '確'.repeat(50000)],
    ['astral', '😀'.repeat(24900)],
  ]) {
    const f = fixture();
    await claimed(f);
    const file = nodePath.join(temporary, kind + '.json');
    const review = { ...report(), summary };
    const content = JSON.stringify(review, null, 2) + '\n';
    assert.ok(Buffer.byteLength(content) > 60000 && Buffer.byteLength(content) < 512000);
    assert.ok(content.length < 60000);
    await writeFile(file, content);
    assert.equal(
      await handoffMain({
        args: ['submit', '--pr', '81', '--report', file],
        env: {},
        dependencies: { run: f.run, github: f.github },
      }),
      0,
    );
    const subject = f.remote().standaloneReviews[0];
    assert.equal(subject.externalReview.status, 'published');
    assert.equal(subject.reviews[0].status, 'approved');
    assert.equal(JSON.parse(subject.reviewReports['claude-review-1.json']).summary, summary);
  }
});

test('Unicode CLI pre-read allowance never expands canonical comment limit or normal60kB input guard', async (t) => {
  const temporary = await mkdtemp(nodePath.join(os.tmpdir(), 'standalone-comment-bound-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const large = nodePath.join(temporary, 'large-comment.json');
  await writeFile(large, JSON.stringify({ ...report(), summary: 'x'.repeat(61000) }));
  const f = fixture();
  await claimed(f);
  await assert.rejects(
    handoffMain({
      args: ['submit', '--pr', '81', '--report', large],
      env: {},
      dependencies: { run: f.run, github: f.github },
    }),
    /comment exceeds/,
  );
  assert.equal(f.comments.length, 1, 'Only the preceding request was posted');
  assert.equal(f.remote().standaloneReviews[0].reviews[0].status, 'running');
  const unicode = nodePath.join(temporary, 'normal-unicode.json');
  await writeFile(unicode, JSON.stringify({ ...report(), summary: '確'.repeat(50000) }));
  const normal = fixture();
  await assert.rejects(
    handoffMain({
      args: ['submit', '--pr', '81', '--report', unicode],
      env: {},
      dependencies: { run: normal.run, github: normal.github },
    }),
    /Invalid report file/,
  );
  assert.equal(normal.comments.length, 0);
});

test('concurrent production finalize and pipeline observe active Codex QA without mutation, duplicate inference or merge', async (t) => {
  const env = await isolatedFinalizeEnvironment(t);
  const f = fixture();
  makeAllowlisted(f);
  f.manifest.releaseHold = false;
  await published(f);
  let announce, finish;
  const started = new Promise((resolve) => (announce = resolve)),
    gate = new Promise((resolve) => (finish = resolve));
  let qa = 0,
    merges = 0;
  f.github.mergePullRequest = async (pr, head, { guard }) => {
    await guard();
    merges++;
    f.pr.state = 'closed';
    f.pr.merged = true;
    f.pr.merge_commit_sha = '6'.repeat(40);
    return { number: pr, reviewedSha: head, mergeSha: f.pr.merge_commit_sha };
  };
  const first = handoffMain({
    args: ['finalize', '--pr', '81'],
    env,
    dependencies: {
      run: f.run,
      github: f.github,
      workspace: {
        finalQaStandalone: async () => {
          qa++;
          announce();
          await gate;
          return { status: 'verified', summary: 'Independent owner completed its bounded QA.' };
        },
      },
    },
  });
  await started;
  const before = JSON.stringify(f.remote()),
    writes = f.writes.length;
  assert.equal(f.remote().standaloneReviews[0].codexFinalReview.status, 'running');
  assert.equal(
    await handoffMain({
      args: ['finalize', '--pr', '81'],
      env,
      dependencies: {
        run: f.run,
        github: f.github,
        workspace: {
          finalQaStandalone: async () => assert.fail('Concurrent finalizer must not infer'),
        },
      },
    }),
    0,
  );
  await runRuntime(f, {
    finalQaStandalone: async () => assert.fail('Concurrent pipeline must not infer'),
  });
  assert.equal(JSON.stringify(f.remote()), before);
  assert.equal(f.writes.length, writes);
  assert.equal(qa, 1);
  assert.equal(merges, 0);
  finish();
  assert.equal(await first, 0);
  assert.equal(merges, 0);
  assert.equal(f.remote().standaloneReviews[0].phase, 'ready');
  assert.equal(f.remote().standaloneReviews[0].release, undefined);
  assert.equal(f.remote().standaloneReviews[0].codexFinalReview.status, 'verified');
});

test('an existing open merge reservation remains pending instead of racing its active owner', async () => {
  const f = fixture();
  makeAllowlisted(f);
  f.manifest.releaseHold = false;
  const subject = await published(f);
  await standaloneReviewStep(
    stepOptions(f, subject, async () => ({
      status: 'verified',
      summary: 'Verified synthetic QA result',
    })),
  );
  const store = f.github.createStateStore(),
    state = await store.load();
  state.standaloneReviews[0].release = { status: 'merging', reviewedSha: sha, prNumber: 81 };
  await store.save(state);
  const before = JSON.stringify(f.remote()),
    writes = f.writes.length;
  f.github.mergePullRequest = async () => assert.fail('Do not race a current merge owner');
  await runRuntime(f, { finalQaStandalone: async () => assert.fail('Do not repeat QA') });
  assert.equal(JSON.stringify(f.remote()), before);
  assert.equal(f.writes.length, writes);
});

function realSharedStateStore(initial) {
  let raw = Buffer.from(JSON.stringify(initial, null, 2) + '\n');
  const oid = () => createHash('sha1').update(`blob ${raw.length}\0`).update(raw).digest('hex');
  const stats = { writes: 0, conflicts: 0, puts: [] };
  const transport = createGitHub({
    cwd: '/tmp',
    repo,
    run: async (call) => {
      const endpoint = call.args[1];
      let value;
      if (call.args.includes('PUT')) {
        const body = JSON.parse(call.input);
        stats.puts.push(body);
        if (body.sha !== oid()) {
          stats.conflicts++;
          return { ok: false, code: 1, stderr: 'HTTP409 synthetic CAS conflict', stdout: '{}' };
        }
        raw = Buffer.from(body.content, 'base64');
        stats.writes++;
        value = { content: { sha: oid() } };
      } else if (endpoint.includes('/git/ref/')) value = { object: { sha: '1'.repeat(40) } };
      else if (endpoint.includes('/contents/'))
        value = {
          type: 'file',
          sha: oid(),
          size: raw.length,
          encoding: raw.length > 1024 * 1024 ? 'none' : 'base64',
          content: raw.length > 1024 * 1024 ? '' : raw.toString('base64'),
        };
      else if (endpoint.includes('/git/blobs/'))
        value = {
          sha: oid(),
          size: raw.length,
          encoding: 'base64',
          content: raw.toString('base64'),
        };
      else assert.fail('Unexpected state-only endpoint ' + endpoint);
      return { ok: true, stdout: JSON.stringify(value) };
    },
  });
  return {
    createStateStore: transport.createStateStore,
    stats,
    state: () => JSON.parse(raw),
    bytes: () => raw.length,
  };
}
function actualController(f, durable, number = 81) {
  const github = { ...f.github, createStateStore: durable.createStateStore };
  const controller = createStandaloneReview({
    github,
    cwd: '/trusted',
    run: (call) =>
      f.run({
        ...call,
        args: call.args.map((value) =>
          typeof value === 'string' ? value.replace(`/pulls/${number}`, '/pulls/81') : value,
        ),
      }),
  });
  return { github, controller };
}
async function largeHistoryState(f, publishedOwn = false) {
  if (publishedOwn) await published(f);
  else await f.controller.adopt(f.manifest);
  const state = clone(f.remote()),
    base = state.standaloneReviews[0];
  for (let pr = 82; pr < 105; pr++) {
    const subject = clone(base);
    subject.id = `standalone-pr-${pr}`;
    subject.pr = { number: pr, url: `https://github.com/${repo}/pull/${pr}` };
    subject.branch = `synthetic/history-${pr}`;
    subject.reviews = [];
    subject.reviewLedger = { schema_version: 1, max_rounds: 4, rounds: [] };
    subject.reviewReports = {};
    delete subject.externalReview;
    delete subject.reviewChannel;
    delete subject.reviewHandoffHistory;
    for (let round = 1; round <= 4; round++) {
      const content = JSON.stringify({
        ...report(),
        summary: 'Reviewed synthetic frozen source. ' + 'x'.repeat(88000),
      });
      subject.reviews.push({ round, status: 'approved', subjectSha: sha });
      subject.reviewLedger.rounds.push({
        round,
        verdict: 'approved',
        subject_sha: sha,
        review_sha256: sha256(content),
      });
      subject.reviewReports[`claude-review-${round}.json`] = content;
    }
    state.standaloneReviews.push(subject);
  }
  const size = () => Buffer.byteLength(JSON.stringify(state, null, 2) + '\n'),
    target = MAX_DURABLE_STATE_BYTES - 30000;
  let missing = target - size();
  assert.ok(missing > 0);
  for (const subject of state.standaloneReviews.slice(1))
    for (let round = 1; round <= 4 && missing > 0; round++) {
      const file = `claude-review-${round}.json`,
        value = JSON.parse(subject.reviewReports[file]),
        add = Math.min(missing, 99000 - value.summary.length);
      value.summary += 'x'.repeat(add);
      subject.reviewReports[file] = JSON.stringify(value);
      subject.reviewLedger.rounds[round - 1].review_sha256 = sha256(subject.reviewReports[file]);
      missing -= add;
    }
  assert.equal(size(), target);
  validateStandaloneState(state);
  return state;
}

test('organic24subject92report near-capacity history refuses claim before durable round or report, and QA before inference', async () => {
  const f = fixture(),
    initial = await largeHistoryState(f),
    durable = realSharedStateStore(initial),
    { controller } = actualController(f, durable);
  assert.equal(initial.standaloneReviews.length, 24);
  await controller.request(81);
  const writes = durable.stats.writes;
  await assert.rejects(controller.claim(81), (error) => error.code === 'state-capacity-exhausted');
  assert.equal(durable.stats.writes, writes);
  assert.equal(durable.state().standaloneReviews[0].reviews.length, 0);
  assert.equal(durable.state().standaloneReviews[0].externalReview.status, 'comment-requested');
  await assert.rejects(
    controller.submit(81, {
      ...report(),
      summary: 'Valid report must never be analyzed before claim',
    }),
    /owned review/,
  );
  assert.ok(
    f.comments.every(
      (comment) => JSON.parse(comment.body.split('\n').slice(1).join('\n')).kind === 'request',
    ),
  );
  const g = fixture();
  makeAllowlisted(g);
  g.manifest.releaseHold = false;
  const qaInitial = await largeHistoryState(g, true),
    qaStore = realSharedStateStore(qaInitial),
    owner = actualController(g, qaStore);
  let models = 0;
  owner.github.mergePullRequest = async () => assert.fail('No capacity, no merge');
  await assert.rejects(
    owner.controller.finalize(81, {
      infrastructureFiles: FIXTURE_INFRASTRUCTURE_FILES,
      workspace: {
        finalQaStandalone: async () => {
          models++;
          return { status: 'verified', summary: 'Never called' };
        },
      },
    }),
    (error) => error.code === 'state-capacity-exhausted',
  );
  assert.equal(models, 0);
  assert.equal(qaStore.stats.writes, 0);
  assert.equal(qaStore.state().standaloneReviews[0].codexFinalReview, undefined);
  assert.equal(qaStore.state().standaloneReviews[0].reviews.length, 1);
});

test('actual store disjoint request+claim while QA waits preserves both entities and the owner result, merges once', async () => {
  const f = fixture(),
    peer = fixture();
  makeAllowlisted(f);
  makeAllowlisted(peer);
  f.manifest.releaseHold = false;
  await published(f);
  await peer.controller.adopt(peer.manifest);
  const initial = clone(f.remote()),
    other = clone(peer.remote().standaloneReviews[0]);
  other.id = 'standalone-pr-82';
  other.pr = { number: 82, url: `https://github.com/${repo}/pull/82` };
  other.branch = 'synthetic/peer-82';
  initial.standaloneReviews.push(other);
  peer.pr.number = 82;
  peer.pr.head.ref = other.branch;
  peer.feedback.number = 82;
  peer.feedback.headRef = other.branch;
  peer.feedback.url = other.pr.url;
  const durable = realSharedStateStore(initial),
    owner = actualController(f, durable),
    sibling = actualController(peer, durable, 82);
  let enter, release;
  const entered = new Promise((resolve) => (enter = resolve)),
    barrier = new Promise((resolve) => (release = resolve));
  let models = 0,
    merges = 0;
  owner.github.mergePullRequest = async (pr, head, { guard }) => {
    await guard();
    merges++;
    f.pr.state = 'closed';
    f.pr.merged = true;
    f.pr.merge_commit_sha = '5'.repeat(40);
    return { number: pr, reviewedSha: head, mergeSha: f.pr.merge_commit_sha };
  };
  const finishing = owner.controller.finalize(81, {
    infrastructureFiles: FIXTURE_INFRASTRUCTURE_FILES,
    workspace: {
      finalQaStandalone: async () => {
        models++;
        enter();
        await barrier;
        return {
          status: 'verified',
          summary: 'Actual production boundary; synthetic model result',
        };
      },
    },
  });
  await entered;
  const first = clone(durable.state().standaloneReviews[0]);
  await sibling.controller.request(82);
  await sibling.controller.claim(82);
  assert.deepEqual(durable.state().standaloneReviews[0], first);
  release();
  const result = await finishing;
  assert.equal(result.release.status, 'merged');
  assert.equal(durable.state().standaloneReviews[0].codexFinalReview.status, 'verified');
  assert.equal(durable.state().standaloneReviews[1].reviews[0].status, 'running');
  assert.ok(durable.stats.conflicts >= 1);
  assert.equal(models, 1);
  assert.equal(merges, 1);
  await owner.controller.finalize(81, {
    infrastructureFiles: FIXTURE_INFRASTRUCTURE_FILES,
    workspace: { finalQaStandalone: async () => assert.fail('Do not repeat model') },
  });
  assert.equal(models, 1);
  assert.equal(merges, 1);
});

test('actual store same-subject modification during QA remains a conflict without overwriting peer hold or duplicating inference', async () => {
  const f = fixture();
  makeAllowlisted(f);
  f.manifest.releaseHold = false;
  await published(f);
  const durable = realSharedStateStore(f.remote()),
    owner = actualController(f, durable);
  let enter, release;
  const entered = new Promise((resolve) => (enter = resolve)),
    barrier = new Promise((resolve) => (release = resolve));
  let models = 0;
  owner.github.mergePullRequest = async () => assert.fail('Same-entity conflict must not merge');
  const finishing = owner.controller.finalize(81, {
    infrastructureFiles: FIXTURE_INFRASTRUCTURE_FILES,
    workspace: {
      finalQaStandalone: async () => {
        models++;
        enter();
        await barrier;
        return { status: 'verified', summary: 'Owner result cannot replace a changed subject' };
      },
    },
  });
  await entered;
  const peer = durable.createStateStore(),
    state = await peer.load();
  state.standaloneReviews[0].releaseHold = 'Independent operator hold';
  await peer.save(state);
  release();
  await assert.rejects(finishing, (error) => error.code === 'state-rebase-conflict');
  assert.equal(durable.state().standaloneReviews[0].releaseHold, 'Independent operator hold');
  assert.equal(durable.state().standaloneReviews[0].codexFinalReview.status, 'running');
  assert.equal(models, 1);
});

test('F1 trust-root and workflow changes never merge even through a caller-supplied allowlist', async () => {
  for (const file of [
    'agent-team/src/bug-pipeline/cli.mjs',
    'agent-team/src/bug-pipeline/review-policy.mjs',
    'agent-team/src/bug-pipeline/comment-review-handoff.mjs',
    '.github/workflows/anything.yml',
    'docs/claude-local-review-prompt.md',
    'agent-team/tests/bug-pipeline/github.test.mjs',
    'agent-team/tests/bug-pipeline/standalone-review.test.mjs',
    'agent-team/tests/bug-pipeline/standalone-review-contracts.test.mjs',
    'agent-team/tests/bug-pipeline/operator-authorization.test.mjs',
    'agent-team/tests/bug-pipeline/attempt-budget.test.mjs',
  ]) {
    const f = fixture();
    makeAllowlisted(f, file);
    f.manifest.releaseHold = false;
    const subject = await published(f);
    await standaloneReviewStep(
      stepOptions(f, subject, async () => ({ status: 'verified', summary: 'Synthetic QA' })),
    );
    f.github.mergePullRequest = async () =>
      assert.fail('Human-protected trust root cannot auto-merge');
    const result = await mergeStandaloneReview({
      subject,
      controller: f.controller,
      github: f.github,
      infrastructureFiles: [file],
      execute: true,
    });
    assert.equal(result.status, 'ready-to-merge');
    assert.equal(result.reason, 'human-protected-trust-root');
  }
  assert.ok(
    STANDALONE_INFRASTRUCTURE_FILES.every(
      (file) =>
        !file.startsWith('.github/') &&
        !file.startsWith('agent-team/src/') &&
        !file.includes('inspect-demo-source-topology'),
    ),
  );
});

test('F2 existing manual PR, branch or issue ownership blocks adoption without shortening history', async () => {
  for (const overlap of ['pr', 'branch', 'issue']) {
    const f = fixture();
    const store = f.github.createStateStore(),
      state = await store.load();
    state.manualBatches = [
      {
        id: 'real-owner',
        pr: { number: overlap === 'pr' ? 81 : 82 },
        branch: overlap === 'branch' ? f.manifest.branch : 'feature/owned',
        issues: overlap === 'issue' ? [12] : [],
        implementation: [],
        reviews: [
          { round: 1, status: 'failed' },
          { round: 2, status: 'failed' },
        ],
      },
    ];
    if (overlap === 'issue') f.manifest.issues = [12];
    await store.save(state);
    await assert.rejects(f.controller.adopt(f.manifest), /owner|overlap/);
    assert.equal(f.remote().manualBatches[0].reviews.length, 2);
    assert.equal(f.remote().standaloneReviews, undefined);
  }
});

test('F3 same-account report cannot authorize merge; distinct reviewer or protected native human approval can', async () => {
  const f = fixture();
  f.manifest.releaseHold = false;
  const subject = await published(f);
  await standaloneReviewStep(
    stepOptions(f, subject, async () => ({ status: 'verified', summary: 'Synthetic QA' })),
  );
  f.github.nativeReviewAuthorization = async () => ({
    author: 'maintainer',
    humanApproved: false,
    protectedReviews: true,
  });
  subject.release = { status: 'merging', reviewedSha: sha, prNumber: 81, nonce: 'direct-reservation', reservedAt: new Date().toISOString() };
  await stepOptions(f, subject, async () => assert.fail()).save();
  let merges = 0;
  f.github.mergePullRequest = async (_pr, _sha, { guard }) => {
    await guard();
    merges++;
    return { mergeSha: '8'.repeat(40) };
  };
  const merge = () =>
    mergeStandaloneReview({
      subject,
      controller: f.controller,
      github: f.github,
      infrastructureFiles: [subject.sourceManifest[0].path],
      execute: true,
    });
  assert.equal((await merge()).reason, 'independent-reviewer-required');
  assert.equal(merges, 0);
  f.github.nativeReviewAuthorization = async () => ({
    author: 'different-author',
    humanApproved: false,
    protectedReviews: true,
  });
  f.setActor('distinct-finalizer');
  await merge();
  assert.equal(merges, 1);
  f.setActor('maintainer');
  f.github.nativeReviewAuthorization = async () => ({
    author: 'maintainer',
    humanApproved: true,
    protectedReviews: true,
  });
  await merge();
  assert.equal(merges, 2);
});

test('F4 head-drift claim recovery preserves the consumed round and enables adoption of the new SHA', async () => {
  const f = fixture();
  const claimedSubject = await claimed(f);
  f.pr.head.sha = f.feedback.head = 'f'.repeat(40);
  const recovered = await f.controller.recover(81, {
    action: 'abandon-claim', forceLive: true, authorizationRef: 'test:session',
    expectedSha: sha,
    token: claimedSubject.externalReview.claimId,
    reason: 'Worker stopped after head changed',
  });
  assert.equal(recovered.reviews.length, 1);
  assert.equal(recovered.reviews[0].status, 'failed');
  assert.equal(recovered.reviewLedger.rounds[0].verdict, 'failed');
  assert.equal(recovered.externalReview.claimId, undefined);
  await assert.rejects(
    f.controller.recover(81, {
      action: 'abandon-claim', forceLive: true, authorizationRef: 'test:session',
      expectedSha: sha,
      token: claimedSubject.externalReview.claimId,
      reason: 'Replay',
    }),
  );
  for (const key of ['reviews', 'reviewLedger', 'reviewReports'])
    f.manifest[key] = clone(recovered[key]);
  const next = revision(f);
  await f.controller.adopt(next);
  await f.controller.request(81);
  const round2 = await f.controller.claim(81);
  assert.equal(round2.reviews.length, 2);
  assert.equal(round2.reviews[0].status, 'failed');
  assert.equal(round2.reviews[1].status, 'running');
});

test('F4 audited QA release is one-use, maintainer-only, preserves old reservation and reserves a fresh nonce', async () => {
  const f = fixture();
  const subject = await published(f);
  subject.codexFinalReview = {
    status: 'running',
    subjectSha: sha,
    claudeRound: 1,
    nonce: 'old-qa',
  };
  await stepOptions(f, subject, async () => assert.fail()).save();
  f.github.authorizedMaintainer = async () => false;
  await assert.rejects(
    f.controller.recover(81, {
      action: 'release-qa-reservation', forceLive: true, authorizationRef: 'test:session',
      expectedSha: sha,
      token: 'old-qa',
      reason: 'Owner stopped',
    }),
    /maintainer/,
  );
  f.github.authorizedMaintainer = async () => true;
  await assert.rejects(
    f.controller.recover(81, {
      action: 'release-qa-reservation', forceLive: true, authorizationRef: 'test:session',
      expectedSha: sha,
      token: 'wrong-nonce',
      reason: 'Owner stopped',
    }),
    /changed/,
  );
  const recovered = await f.controller.recover(81, {
    action: 'release-qa-reservation', forceLive: true, authorizationRef: 'test:session',
    expectedSha: sha,
    token: 'old-qa',
    reason: 'Owner stopped',
  });
  assert.deepEqual(recovered.qaHistory, [subject.codexFinalReview]);
  assert.equal(recovered.reviews.length, 1);
  await assert.rejects(
    f.controller.recover(81, {
      action: 'release-qa-reservation', forceLive: true, authorizationRef: 'test:session',
      expectedSha: sha,
      token: 'old-qa',
      reason: 'Replay',
    }),
  );
  await standaloneReviewStep(
    stepOptions(f, recovered, async () => ({ status: 'verified', summary: 'Fresh synthetic QA' })),
  );
  assert.equal(recovered.codexFinalReview.status, 'verified');
  assert.notEqual(recovered.codexFinalReview.nonce, 'old-qa');
});

test('F4 merge release requires native open/unmerged identity and archives the exact reservation', async () => {
  const f = fixture();
  const subject = await published(f);
  subject.release = { status: 'merging', reviewedSha: sha, prNumber: 81, nonce: 'merge-owner' };
  await stepOptions(f, subject, async () => assert.fail()).save();
  f.feedback.state = 'MERGED';
  await assert.rejects(
    f.controller.recover(81, {
      action: 'release-merge-reservation', forceLive: true, authorizationRef: 'test:session',
      expectedSha: sha,
      token: 'merge-owner',
      reason: 'Owner stopped',
    }),
    /identity|match/,
  );
  f.feedback.state = 'OPEN';
  const recovered = await f.controller.recover(81, {
    action: 'release-merge-reservation', forceLive: true, authorizationRef: 'test:session',
    expectedSha: sha,
    token: 'merge-owner',
    reason: 'Confirmed no native merge',
  });
  assert.deepEqual(recovered.mergeHistory, [subject.release]);
  assert.equal(recovered.release.status, 'merging');
  assert.ok(recovered.release.recoveryReleasedAt);
  assert.equal(recovered.release.nonce, 'merge-owner');
});

test('F5 persisted submit reports failed projection and reconcile alone converges without another round/comment', async (t) => {
  const f = fixture();
  await claimed(f);
  const dir = await mkdtemp(nodePath.join(os.tmpdir(), 'pr492-projection-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const reportFile = nodePath.join(dir, 'report.json');
  await writeFile(reportFile, JSON.stringify(report()));
  let failures = 0;
  const errors = [],
    originalError = console.error;
  console.error = (line) => errors.push(line);
  try {
    const code = await handoffMain({
      args: ['submit', '--pr', '81', '--report', reportFile],
      dependencies: {
        github: f.github,
        run: (call) => {
          if (call.args[1] === `repos/${repo}/issues/81/labels`) {
            failures++;
            return { ok: false, stderr: 'HTTP 502', stdout: '' };
          }
          return f.run(call);
        },
      },
    });
    assert.equal(code, 1);
  } finally {
    console.error = originalError;
  }
  assert.equal(failures, 3, 'Only idempotent label mutations retry');
  const failure = JSON.parse(errors.at(-1));
  assert.deepEqual(
    { persisted: failure.persisted, projection: failure.projection, next: failure.next },
    { persisted: true, projection: 'failed', next: 'node agent-team/src/bug-pipeline/review-handoff-cli.mjs reconcile --pr 81' },
  );
  const comments = f.comments.length,
    rounds = f.remote().standaloneReviews[0].reviews.length;
  assert.equal(f.remote().standaloneReviews[0].externalReview.status, 'published');
  assert.equal(
    await handoffMain({
      args: ['reconcile', '--pr', '81'],
      dependencies: { github: f.github, run: f.run },
    }),
    0,
  );
  assert.deepEqual(f.labels, ['codex-review-ready']);
  assert.equal(f.comments.length, comments);
  assert.equal(f.remote().standaloneReviews[0].reviews.length, rounds);
});

test('F7 immutable packet reads occur once through submit/reconcile/projection, while native identity remains live', async () => {
  const f = fixture();
  await claimed(f);
  const reads = new Map(),
    originalRead = f.github.readFileAtRevision;
  f.github.readFileAtRevision = async (file, revision) => {
    const key = `${revision}:${file}`;
    reads.set(key, (reads.get(key) ?? 0) + 1);
    return originalRead(file, revision);
  };
  let nativeReads = 0;
  const controller = createStandaloneReview({
    github: f.github,
    cwd: '/trusted',
    run: (call) => {
      if (call.args[1] === `repos/${repo}/pulls/81`) nativeReads++;
      return f.run(call);
    },
  });
  let subject;
  await controller.operation(async () => {
    await controller.submit(81, report());
    subject = await controller.reconcilePR(81);
    await controller.publishState(subject);
  });
  assert.equal(reads.size, Object.keys(f.manifest.packet.files).length);
  assert.ok([...reads.values()].every((count) => count === 1));
  assert.ok(nativeReads >= 3);
  f.pr.head.sha = 'f'.repeat(40);
  await assert.rejects(controller.publishState(subject), /identity/);
});

test('F8 only optional exact-name Vercel failures are tolerated; required checks remain mandatory', async () => {
  const f = fixture();
  const optionalRun = (call) =>
    call.args[0] === 'pr'
      ? {
          ok: false,
          code: 1,
          stdout: JSON.stringify([
            { name: 'required', bucket: 'pass' },
            { name: 'Vercel', bucket: 'fail' },
          ]),
        }
      : f.run(call);
  const controller = createStandaloneReview({
    github: f.github,
    run: optionalRun,
    cwd: '/trusted',
  });
  assert.equal((await controller.checks(81)).ok, true);
  f.github.requiredChecks = async () => ({ ok: false, details: ['Vercel required: FAILURE'] });
  await assert.rejects(controller.checks(81), /required checks/);
  f.github.requiredChecks = async () => ({ ok: true, details: ['required: SUCCESS'] });
  const unknown = createStandaloneReview({
    github: f.github,
    cwd: '/trusted',
    run: (call) =>
      call.args[0] === 'pr'
        ? { ok: false, stdout: JSON.stringify([{ name: 'UnreviewedOptional', bucket: 'fail' }]) }
        : f.run(call),
  });
  await assert.rejects(unknown.checks(81), /failed or pending/);
});

test('F9 independent QA reservation uses injected time', async () => {
  const f = fixture(),
    subject = await published(f);
  await standaloneReviewStep({
    ...stepOptions(f, subject, async () => ({ status: 'verified', summary: 'Synthetic QA' })),
    now: () => new Date('2025-01-02T03:04:05.000Z'),
  });
  assert.equal(subject.codexFinalReview.reservedAt, '2025-01-02T03:04:05.000Z');
});

test('F7 unusable persistence halts all later mutations and cannot leak an unsaved QA reservation', async () => {
  const f = fixture();
  await published(f);
  const backing = f.github.createStateStore();
  let initial = await backing.load();
  initial.batches = [
    {
      id: 'bug-batch-9',
      branch: 'codex/bug-batch-9',
      issues: [9],
      phase: 'blocked',
      implementation: [],
      reviews: [],
    },
  ];
  await backing.save(initial);
  let failed = false,
    normalStatus = 0;
  const store = {
    load: () => backing.load(),
    save: async (state, options) => {
      if (!failed && state.standaloneReviews[0].codexFinalReview?.status === 'running') {
        failed = true;
        throw Object.assign(new Error('Synthetic definite write failure'), {
          code: 'state-write-failed',
        });
      }
      return backing.save(state, options);
    },
  };
  f.github.intake = async () => {};
  f.github.setIssueStatus = async (number) => {
    if (number === 9) normalStatus++;
  };
  f.github.discoverQueue = async () => [17];
  const view = f.github.viewIssue;
  f.github.viewIssue = async (number) =>
    number === 17 ? { number, state: 'open', labels: ['bug', 'codex-run'] } : view(number);
  await assert.rejects(runPipeline({
    repo,
    event: {},
    gh: f.github,
    store,
    models: {},
    workspace: {
      finalQaStandalone: async () => assert.fail('Failed QA reservation must prevent inference'),
    },
    standaloneController: f.controller,
    now: () => 1000000,
    triageWindowMs: 120000,
  }), { code: 'state-write-failed' });
  assert.equal(failed, true);
  assert.equal(normalStatus, 0, 'No further writes after unusable persistence');
  assert.equal(f.remote().standaloneReviews[0].codexFinalReview, undefined);
  assert.equal(f.remote().triageQueue, undefined);
});

test('F4 a transient waiting-subject read failure leaves phase and consumed history unchanged', async () => {
  const f = fixture();
  await f.controller.adopt(f.manifest);
  await f.controller.request(81);
  const before = clone(f.remote().standaloneReviews[0]);
  f.github.intake = async () => {};
  f.github.discoverQueue = async () => [];
  const state = await runPipeline({
    repo,
    event: {},
    gh: f.github,
    store: f.github.createStateStore(),
    models: {},
    workspace: {},
    standaloneController: {
      ...f.controller,
      publishState: async () => {
        throw Object.assign(new Error('Synthetic HTTP 503'), { code: 'github-read-transient' });
      },
    },
  });
  const recorded = clone(state.standaloneReviews[0]);
  assert.equal(recorded.lastTransientFailure.count, 1);
  delete recorded.lastTransientFailure;
  assert.deepEqual(recorded, before);
  assert.deepEqual(f.remote().standaloneReviews[0], state.standaloneReviews[0]);
});

test('audited completed operator continuation remains the latest tested source across revision adoption without legacy folding', async () => {
  const { historyDigest } = await import('../../src/bug-pipeline/attempt-budget.mjs');
  const f = fixture();
  await f.controller.adopt(f.manifest);
  const store = f.github.createStateStore(),
    state = await store.load(),
    subject = state.standaloneReviews[0];
  const original = clone(subject.implementation);
  state.operatorTakeover = {
    nonce: 'operator-authorization',
    continuePastFourPreserveHistory: true,
    subjects: [{ collection: 'standaloneReviews', id: subject.id, pr: 81 }],
  };
  const testedContinuation = '2'.repeat(40);
  subject.operatorContinuations = [
    {
      round: 4,
      kind: 'explicit-operator-compatibility-continuation',
      status: 'passed',
      owner: 'operator',
      nonce: 'round4',
      startedAt: '2026-10-18T01:00:00Z',
      authorizationRef: 'operator-authorization',
      reason: 'Explicit owner correction',
      contractSha256: 'a'.repeat(64),
      preservedEntityDigest: 'b'.repeat(64),
      preservedLegacyImplementationDigest: historyDigest(original),
      preservedLegacyReviewsDigest: historyDigest([]),
      subjectSha: testedContinuation,
      evidence: 'continuation-4.json',
    },
  ];
  subject.operatorCoordination = { stage: 'independent-qa-passed' };
  await store.save(state);
  const next = revision(f),
    prefix = next.packet.path + '/';
  const proof = JSON.stringify({ status: 'passed', synthetic: true });
  next.packet.files['continuation-4.json'] = sha256(proof);
  f.fileContents.set(prefix + 'continuation-4.json', proof);
  const history = JSON.parse(f.fileContents.get(prefix + 'imported-history.json'));
  history.operatorContinuations = clone(subject.operatorContinuations);
  history.packetFiles = Object.fromEntries(
    Object.entries(next.packet.files).filter(([file]) => file !== 'imported-history.json'),
  );
  const content = JSON.stringify(history);
  f.fileContents.set(prefix + 'imported-history.json', content);
  next.packet.files['imported-history.json'] = sha256(content);
  const tree = f.treeOverrides.get(next.sha);
  tree.find((entry) => entry.path === prefix + 'imported-history.json').sha = sha256(content).slice(
    0,
    40,
  );
  tree.push({
    path: prefix + 'continuation-4.json',
    sha: sha256(proof).slice(0, 40),
    type: 'blob',
    mode: '100644',
  });
  f.treeOverrides.set(testedContinuation, [
    {
      path: next.sourceManifest[0].path,
      sha: next.sourceManifest[0].blob,
      type: 'blob',
      mode: '100644',
    },
  ]);
  // Legacy tested source now differs. Only the actual completed continuation matches the new source.
  f.treeOverrides.set(testedSha, [
    { path: next.sourceManifest[0].path, sha: '3'.repeat(40), type: 'blob', mode: '100644' },
  ]);
  const adopted = await f.controller.adopt(next);
  assert.deepEqual(adopted.implementation, original);
  assert.deepEqual(adopted.operatorContinuations, subject.operatorContinuations);
  assert.deepEqual(adopted.operatorCoordination, subject.operatorCoordination);
  assert.deepEqual(f.remote().operatorTakeover, state.operatorTakeover);
  await f.controller.verify(adopted);
  f.treeOverrides.set(testedContinuation, [
    { path: next.sourceManifest[0].path, sha: '4'.repeat(40), type: 'blob', mode: '100644' },
  ]);
  await assert.rejects(f.controller.verify(adopted), /Frozen standalone subject/);
});

async function fairSubjects() {
  const f = fixture();
  await f.controller.adopt(f.manifest);
  const initial = clone(f.remote());
  const second = clone(initial.standaloneReviews[0]);
  second.pr = { number: 82, url: `https://github.com/${repo}/pull/82` };
  second.id = 'standalone-pr-82';
  second.branch = 'feature/second';
  initial.standaloneReviews.push(second);
  let remote = clone(initial), saves = 0, clock = 10000;
  const store = {
    load: async () => clone(remote),
    save: async (state, options) => {
      await options?.guard?.();
      saves++;
      remote = clone(state);
    },
  };
  const github = { intake: async () => {}, discoverQueue: async () => [] };
  let failureCode = 'github-read-transient';
  const controller = {
    actor: async () => 'operator', guardSubject: async () => {}, publishState: async () => {},
    reconcile: async (subject, save) => {
      if (subject.pr.number === 81 && failureCode)
        throw Object.assign(new Error('Synthetic read failure'), { code: failureCode });
      subject.projectionTicks = (subject.projectionTicks ?? 0) + 1;
      await save();
      return false;
    },
  };
  return { initial, store, github, controller,
    remote: () => remote, saves: () => saves, setCode: (value) => { failureCode = value; },
    tick: async (elapsed = 10000) => { clock += elapsed; return runPipeline({ repo, event: {}, gh: github,
      store, workspace: {}, models: {}, standaloneController: controller, now: () => clock }); },
  };
}

test('transient fairness uses elapsed backoff, keeps three rapid ticks pending, and exhausts only after the window', async () => {
  const f = await fairSubjects();
  for (let tick = 1; tick <= 3; tick++) {
    await f.tick();
    assert.equal(f.remote().standaloneReviews[0].lastTransientFailure.count, 1);
    assert.equal(f.remote().standaloneReviews[0].phase, 'waiting-review');
    assert.equal(f.remote().standaloneReviews[1].projectionTicks, tick);
  }
  let previousRetry = f.remote().standaloneReviews[0].lastTransientFailure.nextRetryAt;
  for (const [elapsed, count, delay] of [[60000, 2, 120000], [120000, 3, 240000],
    [240000, 4, 480000], [480000, 5, 960000], [960000, 6, 1800000]]) {
    await f.tick(elapsed);
    const failure = f.remote().standaloneReviews[0].lastTransientFailure;
    assert.equal(failure.count, count);
    assert.equal(failure.nextRetryAt - Date.parse(failure.at), delay);
    assert.ok(failure.nextRetryAt > previousRetry);
    previousRetry = failure.nextRetryAt;
  }
  assert.equal(f.remote().standaloneReviews[0].phase, 'blocked');
  assert.equal(f.remote().standaloneReviews[0].failureCode, 'github-transient-exhausted');
  assert.equal(f.remote().standaloneReviews[1].projectionTicks, 8);
  assert.deepEqual(f.remote().standaloneReviews[0].implementation, f.initial.standaloneReviews[0].implementation);
});

test('permanent read failure blocks once while the next standalone subject progresses in the same tick', async () => {
  const f = await fairSubjects();
  f.setCode('github-read-rejected');
  await f.tick();
  assert.equal(f.remote().standaloneReviews[0].phase, 'blocked');
  assert.equal(f.remote().standaloneReviews[0].failureCode, 'github-read-rejected');
  assert.equal(f.remote().standaloneReviews[1].projectionTicks, 1);
  await f.tick();
  assert.equal(f.remote().standaloneReviews[1].projectionTicks, 2);
});

test('transient counters reset on successful work and changed SHA without resetting consumed attempts', async () => {
  const f = await fairSubjects();
  await f.tick();
  f.setCode(null);
  await f.tick(60000);
  assert.equal(f.remote().standaloneReviews[0].lastTransientFailure, undefined);
  f.setCode('github-read-transient');
  await f.tick();
  const changed = await f.store.load();
  changed.standaloneReviews[0].sha = 'e'.repeat(40);
  await f.store.save(changed);
  await f.tick();
  assert.equal(f.remote().standaloneReviews[0].lastTransientFailure.count, 1);
  assert.deepEqual(f.remote().standaloneReviews[0].implementation, f.initial.standaloneReviews[0].implementation);
});

test('human-protected prompt and policy tests reject automatic merge even with a supplied allowlist and native override', async () => {
  const { requiresHumanReview, standaloneMergePolicy } = await import('../../src/bug-pipeline/review-policy.mjs');
  const paths = ['docs/claude-local-review-prompt.md',
    'agent-team/tests/bug-pipeline/github.test.mjs',
    'agent-team/tests/bug-pipeline/standalone-review.test.mjs',
    'agent-team/tests/bug-pipeline/standalone-review-contracts.test.mjs',
    'agent-team/tests/bug-pipeline/operator-authorization.test.mjs',
    'agent-team/tests/bug-pipeline/attempt-budget.test.mjs',
    'docs/standalone-pr-review.md',
    'agent-team/tests/bug-pipeline/models.test.mjs',
    'agent-team/tests/bug-pipeline/workspace.test.mjs'];
  for (const path of paths) {
    assert.equal(requiresHumanReview(path), true);
    assert.equal(STANDALONE_INFRASTRUCTURE_FILES.includes(path), false);
    for (const files of [[path], ['docs/standalone-pr-review.md', path]])
      assert.equal(standaloneMergePolicy({ files, reviewer: 'reviewer', actor: 'actor',
        native: { humanApproved: true, author: 'author', protectedReviews: true } }),
      'human-protected-trust-root');
  }
  assert.equal(requiresHumanReview('docs/standalone-pr-review.md'), true);
});

test('post-save request notice failure is repaired by the actual suggested CLI command, idempotently without spending a round', async () => {
  const f = fixture();
  await f.controller.adopt(f.manifest);
  const comment = f.github.commentPR;
  let fail = true;
  f.github.commentPR = async (...args) => {
    if (fail) { fail = false; throw Object.assign(new Error('Synthetic uncertain comment'), { code: 'github-write-uncertain' }); }
    return comment(...args);
  };
  let diagnostic;
  await assert.rejects(handoffMain({ args: ['request', '--pr', '81'], env: {},
    dependencies: { github: f.github, run: f.run } }), (error) => {
    diagnostic = handoffErrorDiagnostic(error);
    return diagnostic.persisted === true;
  });
  const reserved = clone(f.remote().standaloneReviews[0]);
  const command = diagnostic.next;
  assert.equal(command, 'node agent-team/src/bug-pipeline/review-handoff-cli.mjs reconcile --pr 81');
  const args = command.split(' ').slice(2);
  const output = console.log;
  console.log = () => {};
  try {
    assert.equal(await handoffMain({ args, env: {}, dependencies: { github: f.github, run: f.run } }), 0);
    assert.equal(await handoffMain({ args, env: {}, dependencies: { github: f.github, run: f.run } }), 0);
  } finally { console.log = output; }
  const current = f.remote().standaloneReviews[0];
  assert.equal(current.externalReview.requestId, reserved.externalReview.requestId);
  assert.equal(current.externalReview.requestedBy, reserved.externalReview.requestedBy);
  assert.equal(current.reviews.length, 0);
  assert.deepEqual(current.reviewLedger, reserved.reviewLedger);
  const notices = f.comments.filter((comment) => comment.body.includes('"kind": "request"'));
  assert.equal(notices.length, 1);
});

test('uncertain request comment that committed is reconciled without a second notice; changed actor cannot repair it', async () => {
  const f = fixture();
  await f.controller.adopt(f.manifest);
  const comment = f.github.commentPR;
  f.github.commentPR = async (...args) => {
    await comment(...args);
    throw Object.assign(new Error('Synthetic committed write timeout'), { code: 'github-write-uncertain' });
  };
  await assert.rejects(f.controller.request(81));
  await f.controller.reconcilePR(81);
  assert.equal(f.comments.filter((item) => item.body.includes('"kind": "request"')).length, 1);
  f.setActor('another-authorized-user');
  await assert.rejects(f.controller.reconcilePR(81), /another actor/);
  assert.equal(f.remote().standaloneReviews[0].reviews.length, 0);
});

async function reservedMerge(f, reservedAt = '2026-10-18T00:00:00Z') {
  const subject = await published(f);
  subject.release = { status: 'merging', reviewedSha: sha, prNumber: 81,
    nonce: 'unique-merge-reservation', reservedAt };
  await stepOptions(f, subject, async () => assert.fail()).save();
  return subject;
}
function markMerged(f) {
  f.pr.state = 'closed';
  f.pr.merged = true;
  f.pr.merge_commit_sha = '9'.repeat(40);
  f.feedback.state = 'MERGED';
  f.feedback.mergeCommitSha = f.pr.merge_commit_sha;
}
const mergeRecovery = (extra = {}) => ({ action: 'release-merge-reservation', expectedSha: sha,
  token: 'unique-merge-reservation', reason: 'Exact reservation recovery',
  authorizationRef: 'test:session', ...extra });

test('merge lease covers bounded preparation plus command; recovery at 31 seconds still needs verified force', async () => {
  let clock = Date.parse('2026-10-18T00:00:00Z');
  const f = fixture({ now: () => new Date(clock) });
  await reservedMerge(f);
  await assert.rejects(f.controller.recover(81, mergeRecovery()), /authorized force/);
  clock += 31000;
  await assert.rejects(f.controller.recover(81, mergeRecovery()), /authorized force/);
  clock += MERGE_RESERVATION_LEASE_MS - 31000;
  const recovered = await f.controller.recover(81, mergeRecovery());
  assert.equal(recovered.release.status, 'merging');
  assert.equal(recovered.release.recoveryReleasedAt, new Date(clock).toISOString());
  assert.equal(recovered.recoveryHistory.at(-1).authorization.binding.reservation.forceLive, false);
  await assert.rejects(f.controller.recover(81, mergeRecovery()), /already consumed/);
});

test('force-live flag alone cannot replace trusted external capability verification', async () => {
  const f = fixture({ authorizationVerifier: false, now: () => new Date('2026-10-18T00:00:00Z') });
  await reservedMerge(f);
  const before = clone(f.remote());
  await assert.rejects(f.controller.recover(81, mergeRecovery({ forceLive: true })), /verifier unavailable/);
  assert.deepEqual(f.remote(), before);
});

test('explicit verified force is audited and cannot reset consumed implementation or review history', async () => {
  const f = fixture({ now: () => new Date('2026-10-18T00:00:00Z') });
  const old = await reservedMerge(f);
  const recovered = await f.controller.recover(81, mergeRecovery({ forceLive: true }));
  const binding = recovered.recoveryHistory.at(-1).authorization.binding;
  assert.equal(binding.action, 'force-live-recovery');
  assert.equal(binding.reservation.forceLive, true);
  assert.deepEqual(recovered.reviews, old.reviews);
  assert.deepEqual(recovered.implementation, old.implementation);
});

test('merge completed before release converges to exact-head receipt rather than waiting review', async () => {
  const f = fixture({ now: () => new Date('2026-10-18T00:06:00Z') });
  await reservedMerge(f);
  markMerged(f);
  const recovered = await f.controller.recover(81, mergeRecovery());
  assert.equal(recovered.release.status, 'merged');
  assert.equal(recovered.release.mergeSha, f.pr.merge_commit_sha);
  assert.equal(f.remote().standaloneReviews[0].release.status, 'merged');
});

test('merge during actual save guard refuses stale recovery and reconciles the retained reservation', async () => {
  const f = fixture({ now: () => new Date('2026-10-18T00:06:00Z') });
  await reservedMerge(f);
  const feedback = f.github.reviewFeedback;
  let reads = 0;
  f.github.reviewFeedback = async (...args) => {
    if (++reads === 3) markMerged(f); // final recovery save guard
    return feedback(...args);
  };
  await assert.rejects(f.controller.recover(81, mergeRecovery()), /identity/);
  assert.equal(reads, 3);
  assert.equal(f.remote().standaloneReviews[0].release.nonce, 'unique-merge-reservation');
  f.github.mergePullRequest = async () => assert.fail('Receipt recovery must not issue another merge');
  const recovered = await f.controller.finalize(81, { workspace: {}, infrastructureFiles: [] });
  assert.equal(recovered.release.status, 'merged');
  assert.equal(recovered.release.mergeSha, f.pr.merge_commit_sha);
});

test('merge after recovery CAS is reconciled through tombstone without a second merge', async () => {
  const f = fixture({ now: () => new Date('2026-10-18T00:06:00Z') });
  await reservedMerge(f);
  const tombstone = await f.controller.recover(81, mergeRecovery());
  assert.ok(tombstone.release.recoveryReleasedAt);
  markMerged(f);
  f.github.mergePullRequest = async () => assert.fail('No blind retry of uncertain remote outcome');
  const recovered = await f.controller.finalize(81, { workspace: {}, infrastructureFiles: [] });
  assert.equal(recovered.release.status, 'merged');
  assert.equal(recovered.mergeHistory[0].nonce, 'unique-merge-reservation');
});

test('failed QA reservation is terminal and needs no invented lease, but each release requires a fresh external consumption', async () => {
  const f = fixture({ now: () => new Date('2026-10-18T00:00:00Z') });
  const subject = await published(f);
  subject.codexFinalReview = { status: 'failed', subjectSha: sha, claudeRound: 1, nonce: 'failed-qa' };
  await stepOptions(f, subject, async () => assert.fail()).save();
  const recovered = await f.controller.recover(81, { action: 'release-qa-reservation', expectedSha: sha,
    token: 'failed-qa', reason: 'Terminal worker failure', authorizationRef: 'test:session' });
  assert.equal(recovered.codexFinalReview, undefined);
  assert.deepEqual(recovered.qaHistory, [subject.codexFinalReview]);
  assert.equal(recovered.recoveryHistory.at(-1).authorization.binding.reservation.forceLive, false);
});

test('definite protected merge rejection archives the full reservation for explicit resume without retrying', async () => {
  const f = fixture({ now: () => new Date('2026-10-18T00:00:00Z') });
  makeAllowlisted(f);
  f.manifest.releaseHold = false;
  await published(f);
  let merges = 0;
  f.github.mergePullRequest = async () => {
    merges++;
    const { githubOperationError } = await import('../../src/bug-pipeline/github.mjs');
    throw githubOperationError({ stderr: 'gh: protection refused (HTTP 405)' }, 'merge');
  };
  const subject = await f.controller.finalize(81, {
    workspace: { finalQaStandalone: async () => ({ status: 'verified', summary: 'Synthetic QA' }) },
    infrastructureFiles: FIXTURE_INFRASTRUCTURE_FILES,
  });
  assert.equal(subject.phase, 'blocked');
  assert.equal(subject.failureCode, 'github-merge-rejected');
  assert.equal(subject.release, undefined);
  assert.equal(subject.mergeHistory[0].status, 'merging');
  assert.match(subject.mergeHistory[0].nonce, /^[a-f0-9-]{36}$/);
  assert.equal(subject.mergeHistory[0].reservedAt, '2026-10-18T00:00:00.000Z');
  await f.controller.finalize(81, { workspace: {}, infrastructureFiles: STANDALONE_INFRASTRUCTURE_FILES });
  assert.equal(merges, 1, 'A refused reservation is never blindly repeated');
  const resumed = await f.controller.recover(81, { action: 'resume', expectedSha: sha,
    token: sha256(JSON.stringify({ phase: subject.phase, failureCode: subject.failureCode })), reason: 'Definite rejection diagnosed' });
  assert.equal(resumed.phase, 'waiting-review');
  assert.deepEqual(resumed.mergeHistory, subject.mergeHistory);
  assert.equal(merges, 1);
});

test('completed gh mergePullRequest GraphQL refusal archives after a fresh exact-open check and resumes without retrying', async () => {
  const f = fixture({ now: () => new Date('2026-10-18T00:00:00Z') });
  makeAllowlisted(f);
  f.manifest.releaseHold = false;
  await published(f);
  let merges = 0;
  const realGitHub = createGitHub({ repo, cwd: '/trusted', run: async () => {
    merges++;
    return { ok: false, code: 1,
      stderr: 'GraphQL: Head branch was modified. Review and try the merge again. (mergePullRequest)' };
  } });
  f.github.mergePullRequest = (...args) => realGitHub.mergePullRequest(...args);
  const subject = await f.controller.finalize(81, {
    workspace: { finalQaStandalone: async () => ({ status: 'verified', summary: 'Synthetic QA' }) },
    infrastructureFiles: FIXTURE_INFRASTRUCTURE_FILES,
  });
  assert.equal(subject.phase, 'blocked');
  assert.equal(subject.failureCode, 'github-merge-rejected');
  assert.equal(subject.failureOperation, 'merge');
  assert.equal(subject.release, undefined);
  assert.equal(subject.mergeHistory[0].status, 'merging');
  assert.equal(subject.mergeHistory[0].reviewedSha, sha);
  await f.controller.finalize(81, { workspace: {}, infrastructureFiles: STANDALONE_INFRASTRUCTURE_FILES });
  assert.equal(merges, 1, 'A refused reservation is never blindly repeated');
  const resumed = await f.controller.recover(81, { action: 'resume', expectedSha: sha,
    token: sha256(JSON.stringify({ phase: subject.phase, failureCode: subject.failureCode })),
    reason: 'Completed GraphQL refusal diagnosed' });
  assert.equal(resumed.phase, 'waiting-review');
  assert.deepEqual(resumed.mergeHistory, subject.mergeHistory);
  assert.equal(merges, 1);
});

test('unknown-outcome merge that committed reconciles receipt and preserves reservation nonce without a second write', async () => {
  const f = fixture({ now: () => new Date('2026-10-18T00:00:00Z') });
  makeAllowlisted(f);
  f.manifest.releaseHold = false;
  await published(f);
  let merges = 0;
  f.github.mergePullRequest = async () => {
    merges++;
    markMerged(f);
    const { githubOperationError } = await import('../../src/bug-pipeline/github.mjs');
    throw githubOperationError({ error: 'timeout' }, 'merge');
  };
  const uncertain = await f.controller.finalize(81, {
    workspace: { finalQaStandalone: async () => ({ status: 'verified', summary: 'Synthetic QA' }) },
    infrastructureFiles: FIXTURE_INFRASTRUCTURE_FILES,
  });
  assert.equal(uncertain.failureCode, 'github-write-uncertain');
  assert.equal(uncertain.release.status, 'merging');
  const recovered = await f.controller.finalize(81, { workspace: {}, infrastructureFiles: [] });
  assert.equal(recovered.release.status, 'merged');
  assert.equal(recovered.release.nonce, uncertain.release.nonce);
  assert.equal(recovered.release.mergeSha, f.pr.merge_commit_sha);
  assert.equal(merges, 1);
});

test('projection 502 retries block with operation metadata and resume only after exact evidence verification', async () => {
  const f = fixture();
  let rejectLabels = true, writes = 0;
  const controller = createStandaloneReview({ github: f.github, cwd: '/trusted', run: async (call) => {
    if (call.args[1] === `repos/${repo}/issues/81/labels` && rejectLabels) {
      writes++;
      return { ok: false, stderr: 'gh: unavailable (HTTP 502)', stdout: '' };
    }
    return f.run(call);
  } });
  await controller.adopt(f.manifest);
  const blocked = await controller.finalize(81, { workspace: {}, infrastructureFiles: [] });
  assert.equal(writes, 3);
  assert.equal(blocked.failureCode, 'github-write-uncertain');
  assert.equal(blocked.failureOperation, 'projection');
  const options = { action: 'resume', expectedSha: sha,
    token: sha256(JSON.stringify({ phase: blocked.phase, failureCode: blocked.failureCode })),
    reason: 'Idempotent projection repaired after native verification' };
  f.treeOverrides.set(testedSha, [{ path: f.manifest.sourceManifest[0].path,
    type: 'blob', mode: '100644', sha: '7'.repeat(40) }]);
  await assert.rejects(controller.recover(81, options), /Frozen standalone subject/);
  f.treeOverrides.delete(testedSha);
  const resumed = await controller.recover(81, options);
  assert.equal(resumed.phase, 'waiting-review');
  assert.equal(resumed.failureOperation, undefined);
  assert.deepEqual(resumed.implementation, blocked.implementation);
  rejectLabels = false;
  await controller.finalize(81, { workspace: {}, infrastructureFiles: [] });
  assert.equal(f.labels.length, 1);
});

test('uncertain or rejected non-projection mutations remain fail closed for resume', async () => {
  for (const failureCode of ['github-write-uncertain', 'github-write-rejected']) {
    const f = fixture();
    await f.controller.adopt(f.manifest);
    const store = f.github.createStateStore(), state = await store.load();
    Object.assign(state.standaloneReviews[0], { phase: 'blocked', failureCode, failureOperation: 'mutation' });
    await store.save(state);
    await assert.rejects(f.controller.recover(81, { action: 'resume', expectedSha: sha,
      token: sha256(JSON.stringify({ phase: 'blocked', failureCode })), reason: 'No safe retry evidence' }),
    /explicit retryable failure/);
  }
});

test('revision adoption preserves a full merging tombstone only at a verified OPEN different head', async () => {
  for (const condition of ['same-head', 'merged', 'open-new-head']) {
    const f = fixture();
    await f.controller.adopt(f.manifest);
    const store = f.github.createStateStore(), state = await store.load(), previous = state.standaloneReviews[0];
    previous.release = { status: 'merging', reviewedSha: sha, prNumber: 81,
      nonce: 'full-random-reservation', reservedAt: '2026-10-18T00:00:00Z',
      recoveryReleasedAt: '2026-10-18T00:06:00Z', diagnostic: { preserve: true } };
    previous.mergeHistory = [{ status: 'older-history', preserve: ['all', 'fields'] }];
    previous.budgetAuthorizationCutover = { schemaVersion: 1, legacyCount: 0,
      legacyDigest: sha256('[]'), actor: 'root', at: '2026-10-18T00:00:00Z', authorizationRef: 'test:cutover' };
    await store.save(state);
    const next = revision(f);
    if (condition === 'same-head') { f.pr.head.sha = sha; f.feedback.head = sha; }
    if (condition === 'merged') { f.pr.state = 'closed'; f.pr.merged = true; }
    if (condition !== 'open-new-head') {
      await assert.rejects(f.controller.adopt(next), /identity/);
      assert.deepEqual(f.remote().standaloneReviews[0].release, previous.release);
    } else {
      const adopted = await f.controller.adopt(next);
      assert.deepEqual(adopted.mergeHistory, [...previous.mergeHistory, previous.release]);
      assert.equal(adopted.release, undefined);
      assert.deepEqual(adopted.budgetAuthorizationCutover, previous.budgetAuthorizationCutover);
    }
  }
});

test('new adoption cannot supply a legacy budget authorization exemption; both validators reject unauthorized appended PR extensions', async () => {
  const f = fixture();
  const forged = clone(f.manifest);
  forged.budgetAuthorizationCutover = { schemaVersion: 1, legacyCount: 99 };
  await assert.rejects(f.controller.adopt(forged));
  await f.controller.adopt(f.manifest);
  const extended = await f.controller.extendBudget(81, { kind: 'implementation', limit: 5,
    reason: 'Synthetic independently verified action', authorizationRef: 'test:session' });
  assert.equal(extended.budgetAuthorizationCutover, undefined);
  const { validateState } = await import('../../src/bug-pipeline/contracts.mjs');
  for (const validate of [(state) => validateState(state, repo), validateStandaloneState]) {
    validate(f.remote());
    const altered = clone(f.remote());
    delete altered.standaloneReviews[0].budgetExtensions[0].authorization;
    assert.throws(() => validate(altered), /authorization provenance/);
  }
});

test('background standalone waiting notice neither reads the notice nor blocks when actor differs or notice reads fail', async () => {
  const f = fixture();
  await f.controller.adopt(f.manifest);
  await f.controller.request(81);
  f.setActor('another-authorized-user');
  const previous = clone(f.remote().standaloneReviews[0]), notices = f.comments.length;
  f.github.viewIssue = async () => { throw Object.assign(new Error('Synthetic notice read 503'), { code: 'github-read-transient' }); };
  const result = (await runRuntime(f, {})).standaloneReviews[0];
  // The label read has its own backoff; the notice path performs no API operation.

  assert.equal(await f.controller.reconcile(previous, async () => assert.fail('No pending notice state write')), false);
  assert.equal(f.comments.length, notices);
  assert.equal(result.phase, 'waiting-review');
});

test('slow merge readiness keeps 31-second reservation live and prevents commands after preparation deadline', async () => {
  for (const elapsed of [31000, MERGE_PREPARATION_TIMEOUT_MS]) {
    let clock = Date.parse('2026-10-18T00:00:00Z');
    const f = fixture({ now: () => new Date(clock) });
    makeAllowlisted(f); f.manifest.releaseHold = false;
    await published(f);
    let delayed = false, merges = 0;
    f.checksHook(async () => {
      if (!delayed && f.remote().standaloneReviews[0].release?.status === 'merging') {
        delayed = true; clock += elapsed;
        if (elapsed === 31000) {
          const release = f.remote().standaloneReviews[0].release;
          await assert.rejects(f.controller.recover(81, { ...mergeRecovery(), token: release.nonce }), /authorized force/);
        }
      }
    });
    f.github.mergePullRequest = async (_pr, _sha, { guard }) => {
      await guard(); merges++; markMerged(f);
      return { mergeSha: f.pr.merge_commit_sha };
    };
    const result = await f.controller.finalize(81, { workspace: {
      finalQaStandalone: async () => ({ status: 'verified', summary: 'Synthetic QA' }) },
      infrastructureFiles: FIXTURE_INFRASTRUCTURE_FILES });
    assert.equal(delayed, true);
    assert.equal(merges, elapsed === 31000 ? 1 : 0);
    assert.equal(result.release.status, elapsed === 31000 ? 'merged' : 'merging');
  }
});

test('definite merge rejection cannot archive a reservation after native head/state becomes uncertain', async () => {
  for (const outcome of ['new-head', 'merged', 'timeout']) {
    const f = fixture();
    makeAllowlisted(f); f.manifest.releaseHold = false;
    await published(f);
    let merges = 0;
    f.github.mergePullRequest = async () => {
      merges++;
      const { githubOperationError } = await import('../../src/bug-pipeline/github.mjs');
      if (outcome === 'new-head') f.pr.head.sha = '6'.repeat(40);
      if (outcome === 'merged') markMerged(f);
      throw githubOperationError(outcome === 'timeout' ? { error: 'timeout' } :
        { stderr: 'gh: definite rejection (HTTP 405)' }, 'merge');
    };
    const blocked = await f.controller.finalize(81, { infrastructureFiles: FIXTURE_INFRASTRUCTURE_FILES,
      workspace: { finalQaStandalone: async () => ({ status: 'verified', summary: 'Synthetic QA' }) } });
    assert.equal(merges, 1);
    assert.equal(blocked.release.status, 'merging');
    assert.equal(blocked.mergeHistory, undefined);
    assert.notEqual(blocked.failureCode, 'github-merge-rejected');
  }
});

test('standalone publisher explicitly rejects source cohorts without projecting labels',async()=>{
 const f=fixture();await f.controller.adopt(f.manifest);const subject=await f.controller.request(81);
 // The durable subject remains byte-identical to the explicit nonempty fixture.
 subject.issues=[17];f.remote().standaloneReviews[0].issues=[17];
 const before=f.labels.slice();const result=await f.controller.publishState(subject);
 assert.equal(result.status,'unsupported');assert.deepEqual(f.labels,before);
});
