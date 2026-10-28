// TEST ONLY: unchanged Source4 assertions, mechanically moved for bounded review context.
// Fixture authorization/reports are synthetic and confer no external approval.
import test from 'node:test';
import assert from 'node:assert/strict';
import { processCloudReview } from '../../src/bug-pipeline/cloud-review-worker.mjs';
import { createStandaloneReview, STANDALONE_REPO as repo } from '../../src/bug-pipeline/standalone-review.mjs';
import { sha256 } from '../../src/bug-pipeline/contracts.mjs';
const clone = value => structuredClone(value);
const sha = 'a'.repeat(40), baseSha = 'b'.repeat(40), testedSha = 'c'.repeat(40);
const path = 'artifacts/task-validation/standalone-review-81';
const report = () => ({ subject_sha: sha, verdict: 'approved', summary: 'Inspected frozen source and evidence.', findings: [] });
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
    authorizationVerifier: authorizationVerifier
      ? async ({ binding }) => ({
          provenance: 'user-session',
          grantId: 'synthetic-session',
          sourceRef: 'test:session',
          consumptionNonce: `action-${++authorizationNonce}`,
          binding,
        })
      : undefined,
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

async function claimed(f) {
  await f.controller.adopt(f.manifest);
  await f.controller.request(81);
  return f.controller.claim(81);
}

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


// TEST native controller fixtures; these reports are never external approvals.
test('cloud semantic diagnostics preserve actual native standalone failure and publication outcomes', async () => {
  const marker = 'TEST_MODEL_TEXT_MUST_NEVER_ENTER_DIAGNOSTICS';
  for (const kind of ['contradiction', 'approved', 'changes-requested', 'blocked']) {
    const f = fixture();
    await f.controller.adopt(f.manifest);
    await f.controller.request(81);
    const before = clone(f.remote().standaloneReviews[0]);
    const finding = {
      severity: 'low',
      file: f.manifest.sourceManifest[0].path,
      line: 1,
      problem: marker,
      requested_change: 'TEST preserve behavior',
      test_expectation: 'TEST regression check',
    };
    const typed = {
      ...report(),
      summary: marker,
      verdict: kind === 'contradiction' ? 'approved' : kind,
      findings: ['approved', 'blocked'].includes(kind)
        ? []
        : Array.from({ length: kind === 'contradiction' ? 3 : 1 }, () => ({ ...finding })),
    };
    const original = {
      ok: true,
      code: 0,
      stdout: JSON.stringify({ structured_output: typed }),
      stderr: '',
    };
    const originalBytes = JSON.stringify(original);
    const observations = [];
    let modelCalls = 0;
    const result = await processCloudReview({
      github: f.github,
      handoff: {},
      standalone: f.controller,
      cwd: '/trusted',
      env: {},
      retrieve: async () => ({
        packet: { subject_sha: sha, feedback: await f.github.reviewFeedback(81) },
        tracked: new Set([finding.file]),
      }),
      probe: async () => ({
        profile: { model: 'claude-opus-4-7', contextWindow: 1000000, maxOutputTokens: 64000 },
      }),
      communication: {},
      wake: async () => {},
      onValidationDiagnostic: async (value) => {
        observations.push(clone(value));
        throw new Error(marker);
      },
      run: async () => {
        modelCalls++;
        return original;
      },
    });
    assert.equal(modelCalls, 1);
    assert.equal(JSON.stringify(original), originalBytes);
    assert.equal(observations.length, 1);
    assert.deepEqual(result.validationDiagnostic, observations[0]);
    assert.equal(result.validationDiagnostic.findingCount, typed.findings.length);
    assert.equal(
      result.validationDiagnostic.category,
      kind === 'contradiction' ? 'contradiction' : 'valid',
    );
    assert.ok(!JSON.stringify(result.validationDiagnostic).includes(marker));
    assert.ok(!JSON.stringify(result.validationDiagnostic).includes(finding.file));
    const after = f.remote().standaloneReviews[0];
    assert.deepEqual(after.implementation, before.implementation);
    assert.deepEqual(after.packet, before.packet);
    assert.deepEqual(after.sourceManifest, before.sourceManifest);
    assert.equal(after.reviews.length, 1);
    if (kind === 'contradiction') {
      assert.equal(result.status, 'provider-failed');
      assert.equal(result.failureCode, 'review-validation-failed');
      assert.equal(result.report, undefined);
      assert.equal(after.reviews[0].status, 'failed');
      assert.equal(after.reviewLedger.rounds[0].verdict, 'failed');
      assert.equal(after.externalReview.failureCode, 'review-validation-failed');
      assert.equal(f.published.length, 0);
      assert.ok(!JSON.stringify(result).includes(marker));
    } else {
      assert.equal(result.status, 'published');
      assert.deepEqual(result.report, typed);
      assert.equal(after.reviews[0].status, kind);
      assert.equal(after.reviewLedger.rounds[0].verdict, kind);
      assert.equal(f.published.length, 1);
    }
  }
});

// TEST actual native failure/recovery grants must survive adoption without new authority.
test('revision adoption preserves failed-request handoff history and consumed authorization nonces byte exact', async () => {
  const { attemptLimit } = await import('../../src/bug-pipeline/attempt-budget.mjs');
  const f = fixture();
  const reserved = await claimed(f);
  await f.controller.failOwnedClaim(81, reserved, 'review-validation-failed');
  await f.controller.request(81, { recoverFailed: true, authorizationRef: 'test:session' });
  await f.controller.extendBudget(81, {
    kind: 'reviews',
    limit: 5,
    reason: 'TEST bounded review allowance with preserved audit history',
    authorizationRef: 'test:session',
  });
  const previous = clone(f.remote().standaloneReviews[0]);
  const historyBytes = JSON.stringify(previous.reviewHandoffHistory);
  const recoveryEntry = previous.reviewHandoffHistory.find((entry) => entry.recovery);
  assert.equal(recoveryEntry.previous.status, 'failed');
  assert.equal(recoveryEntry.spentReviews, 1);
  assert.ok(recoveryEntry.authorization.consumptionNonce);
  for (const field of ['reviews', 'reviewLedger', 'reviewReports'])
    f.manifest[field] = clone(previous[field]);
  const next = revision(f);
  const writesBefore = f.writes.length;
  const adopted = await f.controller.adopt(next);
  assert.equal(JSON.stringify(adopted.reviewHandoffHistory), historyBytes);
  assert.equal(JSON.stringify(f.remote().standaloneReviews[0].reviewHandoffHistory), historyBytes);
  assert.equal(
    adopted.reviewHandoffHistory.find((entry) => entry.recovery).authorization.consumptionNonce,
    recoveryEntry.authorization.consumptionNonce,
  );
  for (const field of [
    'implementation',
    'reviews',
    'reviewLedger',
    'reviewReports',
    'budgetExtensions',
    'recoveryHistory',
  ])
    assert.deepEqual(adopted[field], previous[field]);
  assert.equal(adopted.implementation.length, 3);
  assert.equal(adopted.reviews.length, 1);
  assert.equal(adopted.reviews[0].status, 'failed');
  assert.equal(attemptLimit(adopted, 'reviews'), 5);
  assert.equal(attemptLimit(adopted, 'reviews'), attemptLimit(previous, 'reviews'));
  assert.equal(f.writes.length, writesBefore + 1);
  assert.notEqual(adopted.reviewHandoffHistory, previous.reviewHandoffHistory);
  assert.equal(adopted.externalReview, undefined);
  assert.equal(f.published.length, 0);
  await f.controller.verify(adopted);
});
