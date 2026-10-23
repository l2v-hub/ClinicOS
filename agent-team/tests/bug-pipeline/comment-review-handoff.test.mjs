import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createGitHub } from '../../src/bug-pipeline/github.mjs';
import { externalReviewStep } from '../../src/bug-pipeline/external-review.mjs';
import { feedbackFingerprint } from '../../src/bug-pipeline/contracts.mjs';
import {
  COMMENT_REVIEW_MARKER,
  createCommentReviewHandoff,
  handoffFeedbackFingerprint,
} from '../../src/bug-pipeline/comment-review-handoff.mjs';

const repo = 'l2v-hub/ClinicOS';
const sha = 'a'.repeat(40);
const clone = (value) => structuredClone(value);
const gitBlobSHA = (bytes) =>
  createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const validPlan = {
  title: 'Synthetic regression',
  feature: 'Synthetic feature',
  rationale: 'One source file needs a bounded fix.',
  analysis: 'Synthetic plan for controller tests.',
  execution: { difficulty: 'low', mode: 'direct', reason: 'Single file.' },
  issues: [17],
  scope: ['src/feature.ts'],
  fileMap: [{ issue: 17, files: ['src/feature.ts'] }],
  separationReason: '',
  acceptance: [{ issue: 17, criteria: ['The current selection persists.'] }],
  tasks: [
    {
      title: 'Keep the selection',
      files: ['src/feature.ts'],
      steps: ['Preserve the selected value.'],
    },
  ],
  verification: [
    { command: 'node', args: ['--test', 'feature.test.mjs'] },
    { command: 'npm', args: ['--prefix', 'frontend', 'run', 'build'] },
  ],
  evidence: [
    {
      issue: 17,
      screenshot: 'artifacts/task-validation/bug-batch-17/evidence/17.png',
      trace: 'artifacts/task-validation/bug-batch-17/evidence/17.zip',
      video: '',
    },
  ],
};

function fixture({
  failed = false,
  reviewCount,
  actor = 'review-bot',
  authorizationVerifier = true,
  blobState = false,
  automatic = () => false,
} = {}) {
  let round = failed ? 1 : 0;
  const batch = {
    id: 'bug-batch-17',
    branch: 'codex/bug-batch-17',
    issues: [17],
    sha,
    phase: failed ? 'blocked' : 'waiting-review',
    implementation: [{ round: 1, status: 'passed' }],
    reviews: failed
      ? [{ round: 1, subjectSha: sha, status: 'failed' }]
      : Array.from({ length: reviewCount ?? 0 }, (_, index) => ({
          round: index + 1,
          subjectSha: 'b'.repeat(40),
          status: 'changes-requested',
        })),
    reviewLedger: failed
      ? {
          schema_version: 1,
          max_rounds: 4,
          rounds: [
            {
              round: 1,
              subject_sha: sha,
              verdict: 'failed',
              review_sha256: 'c'.repeat(64),
            },
          ],
        }
      : undefined,
    pr: { number: 81, url: `https://github.com/${repo}/pull/81` },
    plan: clone(validPlan),
    ...(failed
      ? {
          externalReview: { status: 'failed', subjectSha: sha, failureCode: 'claude-timeout' },
          releaseHold: { reason: 'Synthetic hold remains in force.' },
        }
      : { externalReview: { status: 'requested', subjectSha: sha } }),
  };
  const remote = {
    schemaVersion: 1,
    repository: repo,
    batches: [batch],
    ...(blobState ? { retainedHistory: 'x'.repeat(1024 * 1024 + 128) } : {}),
  };
  let actorName = actor;
  let permission = 'write';
  let revokeOnTree = false;
  let onViewIssue = () => {};
  let checks = true;
  const feedback = {
    number: 81,
    state: 'OPEN',
    isDraft: false,
    head: sha,
    headRef: batch.branch,
    headRepo: repo,
    headIsFork: false,
    baseRef: 'main',
    comments: [],
    unresolved: false,
    changesRequested: false,
  };
  const pr = { comments: [] };
  const sources = new Map([[17, { number: 17, state: 'open', comments: [] }]]);
  const calls = [];
  const writes = [];
  const reported = [];
  let commentId = 200;
  const apiRun = async (call) => {
    calls.push(clone(call));
    const endpoint = call.args[1];
    const method = call.args.includes('-X') ? call.args[call.args.indexOf('-X') + 1] : 'GET';
    if (endpoint === 'user') return { ok: true, stdout: JSON.stringify({ login: actorName }) };
    if (/^repos\/l2v-hub\/ClinicOS\/collaborators\/[^/]+\/permission$/.test(endpoint))
      return { ok: true, stdout: JSON.stringify({ permission }) };
    if (endpoint === `repos/${repo}/git/ref/heads/codex/bug-control`)
      return { ok: true, stdout: JSON.stringify({ object: { sha: 'branch-sha' } }) };
    if (endpoint.startsWith(`repos/${repo}/contents/.codex-bug-state.json`)) {
      if (method === 'GET') {
        const bytes = Buffer.from(JSON.stringify(remote), 'utf8');
        return {
          ok: true,
          stdout: JSON.stringify({
            type: 'file',
            sha: gitBlobSHA(bytes),
            size: bytes.length,
            encoding: blobState ? 'none' : 'base64',
            content: blobState ? '' : bytes.toString('base64'),
          }),
        };
      }
      const body = JSON.parse(call.input);
      writes.push({ endpoint, method, body });
      if (body.sha !== gitBlobSHA(Buffer.from(JSON.stringify(remote), 'utf8')))
        return { ok: false, stdout: '', stderr: 'gh: conflict (HTTP 409)' };
      const bytes = Buffer.from(body.content, 'base64');
      const next = JSON.parse(bytes.toString('utf8'));
      for (const key of Object.keys(remote)) delete remote[key];
      Object.assign(remote, next);
      const fileSha = gitBlobSHA(bytes);
      return { ok: true, stdout: JSON.stringify({ content: { sha: fileSha } }) };
    }
    if (endpoint.startsWith(`repos/${repo}/git/blobs/`)) {
      const bytes = Buffer.from(JSON.stringify(remote), 'utf8');
      const oid = gitBlobSHA(bytes);
      assert.equal(endpoint, `repos/${repo}/git/blobs/${oid}`);
      assert.equal(call.maxOutputBytes, 16 * 1024 * 1024);
      return {
        ok: true,
        stdout: JSON.stringify({
          sha: oid,
          size: bytes.length,
          encoding: 'base64',
          content: bytes
            .toString('base64')
            .match(/.{1,60}/g)
            .join('\n'),
        }),
      };
    }
    if (endpoint.startsWith(`repos/${repo}/git/trees/`)) {
      if (revokeOnTree) permission = 'read';
      return {
        ok: true,
        stdout: JSON.stringify({
          truncated: false,
          tree: [{ type: 'blob', path: 'src/feature.ts' }],
        }),
      };
    }
    assert.fail(`Unexpected GitHub API call: ${method} ${endpoint}`);
  };
  const github = createGitHub({ cwd: '/synthetic/worktree', repo, run: apiRun });
  github.reviewFeedback = async () => ({
    ...clone(feedback),
    comments: [
      ...clone(feedback.comments),
      ...pr.comments.map((comment) => ({
        id: comment.id,
        author: comment.user.login,
        body: comment.body,
      })),
    ],
  });
  github.viewIssue = async (number) => {
    onViewIssue(number);
    if (number === 81) return { number, state: 'open', comments: clone(pr.comments) };
    return clone(sources.get(number));
  };
  github.requiredChecks = async () => ({ ok: checks });
  github.commentPR = async (number, body) => {
    const comment = { id: ++commentId, body, user: { login: actorName, type: 'User' } };
    pr.comments.push(comment);
    return clone(comment);
  };
  github.publishExternalReview = async (number, head, report, currentRound) => {
    reported.push({ number, head, report: clone(report), round: currentRound });
    const body = `<!-- clinicos-claude-cron:${number}:${head}:${currentRound} -->\nClaude report ${report.verdict}`;
    feedback.comments.push({ id: ++commentId, author: actorName, body });
  };
  let nonceValue = 0,
    authorizationNonce = 0;
  const handoff = createCommentReviewHandoff({
    github,
    run: apiRun,
    automatic,
    cwd: '/synthetic/worktree',
    now: () => new Date('2026-10-17T00:00:00.000Z'),
    nonce: () => `nonce-${++nonceValue}`,
    authorizationVerifier: authorizationVerifier
      ? async ({ binding }) => ({
          provenance: 'user-session',
          grantId: 'synthetic-session',
          sourceRef: 'test:session',
          consumptionNonce: `grant-${++authorizationNonce}`,
          binding,
        })
      : undefined,
  });
  return {
    batch,
    github,
    handoff,
    remote,
    feedback,
    pr,
    sources,
    calls,
    writes,
    reported,
    setActor: (value) => {
      actorName = value;
    },
    setPermission: (value) => {
      permission = value;
    },
    setChecks: (value) => {
      checks = value;
    },
    revokeOnTree: () => {
      revokeOnTree = true;
    },
    onViewIssue: (fn) => {
      onViewIssue = fn;
    },
  };
}

const validApproved = () => ({
  subject_sha: sha,
  verdict: 'approved',
  summary: 'No actionable findings remain.',
  findings: [],
});

async function requestedClaimed(f) {
  await f.handoff.request(81);
  return f.handoff.claim(81);
}

test('failed round recovery is explicit, preserves the spent round, ledger, release hold, and reserves round two', async () => {
  const f = fixture({ failed: true });
  const oldLedger = clone(f.batch.reviewLedger);
  const oldHold = clone(f.batch.releaseHold);
  await assert.rejects(f.handoff.request(81), /Explicit failed-execution recovery required/);
  assert.deepEqual(f.remote.batches[0], f.batch);
  const requested = await f.handoff.request(81, {
    recoverFailed: true,
    authorizationRef: 'test:session',
  });
  assert.equal(requested.reviews.length, 1);
  assert.equal(requested.reviews[0].status, 'failed');
  assert.deepEqual(requested.reviewLedger, oldLedger);
  assert.deepEqual(requested.releaseHold, oldHold);
  assert.equal(requested.externalReview.status, 'comment-requested');
  assert.equal(requested.externalReview.channel, 'github-comments');
  assert.equal(requested.externalReview.requestId, 'nonce-1');
  assert.equal(requested.reviewHandoffHistory[0].spentReviews, 1);

  const claimed = await f.handoff.claim(81);
  assert.deepEqual(
    claimed.reviews.map((item) => item.status),
    ['failed', 'running'],
  );
  assert.deepEqual(
    claimed.reviewLedger.rounds.map((item) => item.verdict),
    ['failed', 'running'],
  );
  assert.equal(claimed.reviews[1].round, 2);
  assert.equal(claimed.reviews[1].subjectSha, sha);
  assert.equal(claimed.externalReview.owner, 'review-bot');
  assert.equal(claimed.externalReview.requestId, requested.externalReview.requestId);
  assert.equal(claimed.externalReview.claimId, 'nonce-2');
  assert.deepEqual(claimed.releaseHold, oldHold);
  assert.equal(claimed.phase, 'reviewing');
  assert.equal(f.writes.length, 2, 'request and claim each use the GitHub content CAS');
  assert.equal(f.reported.length, 0, 'claim reserves the review before any model/report work');
});

test('recovery does not reset a substantive attempt and requires a new SHA', async () => {
  const f = fixture({ failed: true });
  f.batch.reviews[0].status = 'changes-requested';
  f.batch.reviewLedger.rounds[0].verdict = 'changes-requested';
  f.remote.batches[0] = clone(f.batch);
  await assert.rejects(
    f.handoff.request(81, { recoverFailed: true, authorizationRef: 'test:session' }),
    /Explicit failed-execution recovery required/,
  );
  assert.equal(f.writes.length, 0);
});

test('only one concurrent claimant wins the durable compare-and-swap', async () => {
  const f = fixture();
  await f.handoff.request(81);
  let arrivals = 0;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  f.github.requiredChecks = async () => {
    if (++arrivals === 2) release();
    await gate;
    return { ok: true };
  };
  const results = await Promise.allSettled([f.handoff.claim(81), f.handoff.claim(81)]);
  assert.equal(results.filter((item) => item.status === 'fulfilled').length, 1);
  assert.equal(results.filter((item) => item.status === 'rejected').length, 1);
  assert.match(
    String(results.find((item) => item.status === 'rejected').reason),
    /compare-and-swap/,
  );
  assert.equal(f.remote.batches[0].reviews.length, 1);
  assert.equal(f.remote.batches[0].reviews[0].status, 'running');
});

test('active workers, repeated claims, exhausted budgets and changed review subjects cannot be taken over', async () => {
  const active = fixture();
  active.batch.reviews = [{ round: 1, subjectSha: sha, status: 'running' }];
  active.remote.batches[0] = clone(active.batch);
  await assert.rejects(active.handoff.request(81), /Another worker owns this batch/);

  const repeated = fixture();
  await requestedClaimed(repeated);
  await assert.rejects(repeated.handoff.claim(81), /Review is not available/);

  const spent = fixture({ reviewCount: 4 });
  await assert.rejects(spent.handoff.request(81), /Four review attempts exhausted/);
  assert.equal(spent.writes.length, 0);

  for (const change of [
    (f) => {
      f.feedback.head = 'd'.repeat(40);
    },
    (f) => {
      f.feedback.headIsFork = true;
    },
    (f) => {
      f.feedback.state = 'CLOSED';
    },
    (f) => {
      f.feedback.isDraft = true;
    },
    (f) => {
      f.setChecks(false);
    },
    (f) => {
      f.sources.get(17).state = 'closed';
    },
  ]) {
    const f = fixture();
    change(f);
    await assert.rejects(f.handoff.request(81));
    assert.equal(f.writes.length, 0);
  }
});

test('unauthorized actors and authorization revoked inside the CAS guard cannot claim', async () => {
  const outsider = fixture({ actor: 'outsider' });
  outsider.setPermission('read');
  await assert.rejects(outsider.handoff.request(81), /Unauthorized handoff actor/);
  assert.equal(outsider.writes.length, 0);

  const revoked = fixture();
  await revoked.handoff.request(81);
  let checks = 0;
  const original = revoked.github.authorized;
  revoked.github.authorized = async (login) => {
    if (++checks === 2) revoked.setPermission('read');
    return original(login);
  };
  await assert.rejects(revoked.handoff.claim(81), /lost authorization/);
  assert.equal(revoked.remote.batches[0].reviews.length, 0);
  assert.equal(revoked.writes.length, 1, 'only the preceding request was committed');
});

test('report submit accepts no implicit approval and rejects stale, replayed, invalid, unsafe, and untracked reports', async () => {
  const f = fixture();
  const claimed = await requestedClaimed(f);
  const badReports = [
    { ...validApproved(), subject_sha: 'f'.repeat(40) },
    { ...validApproved(), verdict: 'changes-requested', findings: [] },
    {
      subject_sha: sha,
      verdict: 'changes-requested',
      summary: 'Finding exists.',
      findings: [
        {
          severity: 'medium',
          file: 'src/missing.ts',
          line: 2,
          problem: 'Missing file.',
          requested_change: 'Track file.',
          test_expectation: 'Check it.',
        },
      ],
    },
    { ...validApproved(), summary: 'postgresql://private.invalid/database' },
  ];
  for (const bad of badReports) await assert.rejects(f.handoff.submit(81, bad));
  assert.equal(f.pr.comments.length, 1, 'only the request comment exists');
  assert.equal(f.remote.batches[0].reviews.at(-1).status, 'running');
  assert.equal(f.reported.length, 0);

  const submitted = await f.handoff.submit(81, validApproved());
  assert.deepEqual(submitted, { status: 'submitted', pr: 81, sha, round: 1 });
  assert.equal(f.remote.batches[0].reviews.at(-1).status, 'running');
  assert.equal(f.remote.batches[0].reviewReports, undefined);
  assert.equal(f.reported.length, 0, 'submitting the comment is not approval or publication');

  const reportBody = f.pr.comments.at(-1).body;
  const payload = JSON.parse(reportBody.slice(COMMENT_REVIEW_MARKER.length + 1));
  const validComment = f.pr.comments.pop();
  const invalid = [
    ['request_id', 'old-request'],
    ['claim_id', 'old-claim'],
    ['subject_sha', 'f'.repeat(40)],
    ['round', 0],
    ['pr', 82],
    ['actor', 'another-maintainer'],
  ];
  for (let index = 0; index < invalid.length; index++) {
    const replay = { ...payload, [invalid[index][0]]: invalid[index][1] };
    f.pr.comments.push({
      id: 999 + index,
      body: `${COMMENT_REVIEW_MARKER}\n${JSON.stringify(replay)}`,
      user: { login: 'review-bot', type: 'User' },
    });
  }
  assert.equal(
    await f.handoff.reconcilePR(81).then((value) => value.externalReview.status),
    'comment-running',
  );
  assert.equal(f.remote.batches[0].reviews.at(-1).status, 'running');
  f.pr.comments.splice(-invalid.length);
  f.pr.comments.push(validComment);
});

test('edited report comments and reviewer revocation prevent importing a report', async () => {
  for (const mutation of ['edit', 'revoke']) {
    const f = fixture();
    await requestedClaimed(f);
    await f.handoff.submit(81, validApproved());
    const reportComment = f.pr.comments.at(-1);
    if (mutation === 'edit') {
      let views = 0;
      f.onViewIssue((number) => {
        if (number === 81 && ++views === 2) reportComment.body += ' edited';
      });
    } else f.revokeOnTree();
    await assert.rejects(
      f.handoff.reconcilePR(81),
      mutation === 'edit' ? /Review source changed/ : /lost authorization/,
    );
    assert.equal(f.remote.batches[0].reviews.at(-1).status, 'running');
    assert.equal(f.remote.batches[0].reviewReports, undefined);
    assert.equal(f.reported.length, 0);
  }
});

test('valid exact-SHA report imports a hashed ledger and publishes a same-SHA server review idempotently', async () => {
  const f = fixture();
  await requestedClaimed(f);
  await f.handoff.submit(81, validApproved());
  const published = await f.handoff.reconcilePR(81);
  assert.equal(published.externalReview.status, 'published');
  assert.equal(published.externalReview.channel, 'github-comments');
  assert.equal(published.externalReview.subjectSha, sha);
  assert.equal(published.reviews.length, 1);
  assert.equal(published.reviews[0].status, 'approved');
  assert.equal(published.reviewLedger.rounds[0].verdict, 'approved');
  assert.match(published.reviewLedger.rounds[0].review_sha256, /^[a-f0-9]{64}$/);
  assert.equal(published.reviewReports['claude-review-1.json'].endsWith('\n'), true);
  assert.deepEqual(
    f.reported.map((item) => ({ number: item.number, head: item.head, round: item.round })),
    [{ number: 81, head: sha, round: 1 }],
  );
  const writes = f.writes.length;
  const calls = f.reported.length;
  const again = await f.handoff.reconcilePR(81);
  assert.equal(again.reviews.length, 1);
  assert.equal(f.writes.length, writes);
  assert.equal(f.reported.length, calls);
});

test('finished import retries interrupted server publication without spending another review round', async () => {
  const f = fixture();
  await requestedClaimed(f);
  await f.handoff.submit(81, validApproved());
  const original = f.github.publishExternalReview;
  let fail = true;
  f.github.publishExternalReview = async (...args) => {
    if (fail) {
      fail = false;
      throw new Error('synthetic transient publication failure');
    }
    return original(...args);
  };
  await assert.rejects(f.handoff.reconcilePR(81), /synthetic transient/);
  assert.equal(f.remote.batches[0].externalReview.status, 'finished');
  assert.equal(f.remote.batches[0].reviews.length, 1);
  assert.equal(f.remote.batches[0].reviews[0].status, 'approved');
  const resumed = await f.handoff.reconcilePR(81);
  assert.equal(resumed.externalReview.status, 'published');
  assert.equal(resumed.reviews.length, 1);
  assert.equal(f.reported.length, 1);
});

test('feedback fingerprint excludes only own protocol comments, includes others, and records unrelated feedback changes', async () => {
  const f = fixture();
  await requestedClaimed(f);
  await f.handoff.submit(81, validApproved());
  const owner = f.remote.batches[0].externalReview.owner;
  f.feedback.comments.push({
    id: 401,
    author: owner,
    body: `${COMMENT_REVIEW_MARKER}\nprivate protocol request`,
  });
  const before = handoffFeedbackFingerprint(await f.github.reviewFeedback(), owner);
  f.feedback.comments.push({
    id: 402,
    author: 'another-maintainer',
    body: `${COMMENT_REVIEW_MARKER}\nA comment by another author remains feedback.`,
  });
  const withOtherAuthor = handoffFeedbackFingerprint(await f.github.reviewFeedback(), owner);
  assert.notEqual(withOtherAuthor, before);

  f.feedback.comments.push({
    id: 403,
    author: 'another-maintainer',
    body: 'Please check the empty filter.',
  });
  const published = await f.handoff.reconcilePR(81);
  assert.equal(published.externalReview.status, 'published');
  assert.equal(published.externalReview.feedbackChanged, true);
  const after = await f.github.reviewFeedback();
  assert.equal(feedbackFingerprint(after), published.externalReview.feedbackFingerprint);
  assert.ok(
    f.feedback.comments.some(
      (comment) =>
        comment.author === owner &&
        comment.body.startsWith(`<!-- clinicos-claude-cron:81:${sha}:1 -->`),
    ),
  );
});

test('own request, report, and published review comments do not create feedback changes', async () => {
  const f = fixture();
  await requestedClaimed(f);
  await f.handoff.submit(81, validApproved());
  const claimed = f.remote.batches[0];
  const owner = claimed.externalReview.owner;
  assert.equal(
    handoffFeedbackFingerprint(await f.github.reviewFeedback(), owner),
    claimed.externalReview.feedbackFingerprint,
    'the handoff request and report comments belong to the owner protocol',
  );
  const published = await f.handoff.reconcilePR(81);
  assert.equal(published.externalReview.feedbackChanged, false);
  assert.equal(
    handoffFeedbackFingerprint(await f.github.reviewFeedback(), owner),
    claimed.externalReview.feedbackFingerprint,
    'the exact published review marker is excluded for its own author',
  );
  f.feedback.comments.push({
    id: 502,
    author: 'another-maintainer',
    body: 'Please review this unrelated note.',
  });
  assert.notEqual(
    handoffFeedbackFingerprint(await f.github.reviewFeedback(), owner),
    claimed.externalReview.feedbackFingerprint,
    'another author’s comment remains part of the review feedback',
  );
});

test('a distinct authorized controller publishes the owner report without inventing new feedback', async () => {
  const f = fixture();
  await requestedClaimed(f);
  await f.handoff.submit(81, validApproved());
  f.setActor('maintainer');
  const result = await f.handoff.reconcilePR(81);
  assert.equal(result.externalReview.status, 'published');
  assert.equal(result.externalReview.owner, 'review-bot');
  assert.equal(result.externalReview.feedbackChanged, false);
  assert.equal(result.reviews.length, 1);
  const baseline = handoffFeedbackFingerprint(
    await f.github.reviewFeedback(81),
    'review-bot',
    'maintainer',
  );
  f.feedback.comments.push({
    id: 999,
    author: 'another-maintainer',
    body: 'Human regression finding remains actionable.',
  });
  assert.notEqual(
    handoffFeedbackFingerprint(await f.github.reviewFeedback(81), 'review-bot', 'maintainer'),
    baseline,
  );
});

test('audited allowances plus explicit recovery resume exhausted normal corrections without changing historical attempts', async () => {
  const { historyDigest } = await import('../../src/bug-pipeline/attempt-budget.mjs');
  const f = fixture({ reviewCount: 4 });
  f.setPermission('admin');
  f.batch.phase = 'blocked';
  f.batch.implementation = [1, 2, 3, 4].map((round) => ({ round, status: 'passed' }));
  f.batch.reviews[3].subjectSha = sha;
  f.batch.externalReview = { status: 'published', subjectSha: sha };
  const original = {
    implementation: clone(f.batch.implementation),
    reviews: clone(f.batch.reviews),
  };
  const resume = () =>
    f.handoff.recover(81, {
      action: 'resume',
      expectedSha: sha,
      token: historyDigest({ phase: 'blocked', failureCode: null }),
      reason: 'Owner authorized correction after exhausted default budget',
    });
  await assert.rejects(resume(), /allowances/);
  await f.handoff.extendBudget(81, {
    kind: 'implementation',
    limit: 5,
    authorizationRef: 'owner-command-1',
    reason: 'One implementation allowance',
  });
  await assert.rejects(resume(), /allowances/);
  await f.handoff.extendBudget(81, {
    kind: 'reviews',
    limit: 5,
    authorizationRef: 'owner-command-2',
    reason: 'One review allowance',
  });
  const recovered = await resume();
  assert.equal(recovered.phase, 'waiting-review');
  assert.deepEqual(recovered.implementation, original.implementation);
  assert.deepEqual(recovered.reviews, original.reviews);
  assert.equal(recovered.budgetExtensions.length, 2);
  assert.equal(recovered.recoveryHistory.at(-1).action, 'resume');
  await assert.rejects(resume());
});

test('maintainer permission and a free-text instruction cannot extend budgets without an external verifier', async () => {
  const f = fixture({ authorizationVerifier: false });
  f.setPermission('admin');
  const before = clone(f.remote);
  await assert.rejects(
    f.handoff.extendBudget(81, {
      kind: 'implementation',
      limit: 5,
      authorizationRef: 'I authorize myself',
      reason: 'Synthetic instruction',
    }),
    /verifier unavailable/,
  );
  assert.deepEqual(f.remote, before);
});

test('wrapped large Git blob state supports actual handoff request/reconcile/load and rejects stale CAS without losing history', async () => {
  const f = fixture({ blobState: true });
  const original = clone(f.remote);
  const requested = await f.handoff.request(81);
  assert.equal(requested.externalReview.status, 'comment-requested');
  const reconciled = await f.handoff.reconcilePR(81);
  assert.equal(reconciled.externalReview.requestId, requested.externalReview.requestId);
  assert.equal(f.pr.comments.length, 1);
  assert.equal(reconciled.reviews.length, 0);
  assert.deepEqual(reconciled.implementation, original.batches[0].implementation);
  assert.equal(f.remote.retainedHistory, original.retainedHistory);
  assert.ok(f.calls.some((call) => call.args[1].includes('/git/blobs/')));
  const stale = f.github.createStateStore();
  const staleState = await stale.load();
  const concurrent = f.github.createStateStore();
  const fresh = await concurrent.load();
  fresh.peerDiagnostic = 'separate durable revision';
  await concurrent.save(fresh);
  staleState.batches[0].reason = 'Must not overwrite the newer revision';
  await assert.rejects(stale.save(staleState), { code: 'state-cas-conflict' });
  assert.equal(f.remote.peerDiagnostic, 'separate durable revision');
  assert.equal(f.remote.batches[0].reason, undefined);
  assert.equal(f.remote.batches[0].externalReview.requestId, requested.externalReview.requestId);
  const loaded = await f.handoff.load(81);
  assert.equal(loaded.state.retainedHistory, original.retainedHistory);
});

test('default compatibility2 spends3/4 without extensions and same-account external verifier authorizes only the next5', async () => {
  const {
    reserveImplementation,
    implementationAttempts,
    historyDigest,
    validateOperatorContinuations,
  } = await import('../../src/bug-pipeline/attempt-budget.mjs');
  const f = fixture();
  f.setPermission('admin');
  f.remote.operatorTakeover = {
    nonce: 'takeover-scope',
    continuePastFourPreserveHistory: true,
    subjects: [{ collection: 'batches', id: f.batch.id, pr: 81 }],
  };
  f.batch.operatorContinuations = [
    {
      kind: 'explicit-operator-compatibility-continuation',
      round: 2,
      status: 'passed',
      owner: 'review-bot',
      nonce: 'reservation2',
      startedAt: '2026-10-18T00:00:00Z',
      reason: 'Observed scope authorization',
      authorizationRef: 'takeover-scope',
      contractSha256: 'c'.repeat(64),
      preservedEntityDigest: 'd'.repeat(64),
      preservedLegacyImplementationDigest: historyDigest(f.batch.implementation),
      preservedLegacyReviewsDigest: historyDigest(f.batch.reviews),
    },
  ];
  const prefix = clone(implementationAttempts(f.batch));
  reserveImplementation(f.batch).status = 'passed';
  reserveImplementation(f.batch).status = 'passed';
  validateOperatorContinuations(f.remote);
  assert.throws(() => reserveImplementation(f.batch), /allowance exhausted/);
  const extended = await f.handoff.extendBudget(81, {
    kind: 'implementation',
    limit: 5,
    authorizationRef: 'test:external-session-action5',
    reason: 'Actual scoped session verifier fixture',
  });
  assert.equal(extended.budgetExtensions.length, 1);
  assert.equal(extended.budgetExtensions[0].authorization.provenance, 'user-session');
  assert.equal(extended.budgetExtensions[0].authorization.binding.actor, 'review-bot');
  assert.equal(extended.budgetExtensions[0].authorization.binding.budget.previousLimit, 4);
  const fifth = reserveImplementation(extended);
  assert.equal(fifth.round, 5);
  assert.equal(fifth.budgetExtensionNonce, extended.budgetExtensions[0].nonce);
  assert.deepEqual(implementationAttempts(extended).slice(0, 2), prefix);
});

test('background normal waiting reconciliation never repairs notices across accounts or transient reads', async () => {
  const f = fixture();
  await f.handoff.request(81);
  const previous = clone(f.remote.batches[0]),
    callCount = f.calls.length,
    notices = f.pr.comments.length;
  f.setActor('another-authorized-user');
  f.github.viewIssue = async () => {
    throw Object.assign(new Error('Synthetic notice 503'), { code: 'github-read-transient' });
  };
  assert.equal(
    await f.handoff.reconcile(previous, async () =>
      assert.fail('Waiting phase must remain unchanged'),
    ),
    false,
  );
  assert.equal(
    f.calls.length,
    callCount,
    'No actor or notice API in the background reconciliation',
  );
  assert.equal(f.pr.comments.length, notices);
  assert.deepEqual(f.remote.batches[0], previous);
});

test('automatic native handoff reload rejects global or subject ownership without reinterpreting it as a failed review', async () => {
  for (const kind of ['global', 'subject']) {
    const f = fixture({ automatic: () => true });
    await f.handoff.request(81);
    if (kind === 'global') f.remote.operatorTakeover = { active: true };
    else f.remote.batches[0].operatorCoordination = { active: true };
    const before = clone(f.remote),
      writes = f.writes.length;
    await assert.rejects(f.handoff.load(81), (error) => error.code === 'review-operator-owned');
    await assert.rejects(
      f.handoff.reconcile(f.remote.batches[0], async () => assert.fail('no state write')),
      (error) => error.code === 'review-operator-owned',
    );
    assert.deepEqual(f.remote, before);
    assert.equal(f.writes.length, writes);
  }
});

test('automatic handoff persistence observes a takeover during native source checks before CAS/comment effects', async () => {
  const f = fixture({ automatic: () => true });
  const before = clone(f.remote.batches[0]);
  f.onViewIssue(() => {
    f.remote.operatorTakeover = { active: true };
  });
  await assert.rejects(f.handoff.request(81), (error) => error.code === 'review-operator-owned');
  assert.deepEqual(f.remote.batches[0], before);
  assert.equal(f.writes.length, 0);
  assert.equal(f.pr.comments.length, 0);
});

test('QA6-F3 actual authorized typed QA recovery retains one legacy spend and permits only two new sessions', async () => {
  const f = fixture();
  f.setPermission('maintain');
  const b = f.remote.batches[0];
  const fingerprint = feedbackFingerprint(await f.github.reviewFeedback(81));
  const report = JSON.stringify({
    subject_sha: b.sha,
    verdict: 'approved',
    summary: 'Synthetic approved review',
    findings: [],
  });
  b.reviews = [{ round: 1, status: 'approved', subjectSha: b.sha }];
  b.reviewLedger = {
    rounds: [
      {
        round: 1,
        verdict: 'approved',
        subject_sha: b.sha,
        review_sha256: createHash('sha256').update(report).digest('hex'),
      },
    ],
  };
  b.reviewReports = { 'claude-review-1.json': report };
  b.phase = 'blocked';
  b.failureCode = 'controller-invariant';
  b.externalReview = { status: 'published', subjectSha: b.sha, feedbackFingerprint: fingerprint };
  const legacy = {
    status: 'failed',
    subjectSha: b.sha,
    claudeRound: 1,
    feedbackFingerprint: fingerprint,
    nonce: 'legacy-spent',
    reservedAt: '2026-10-17T00:00:00.000Z',
  };
  b.codexFinalReview = structuredClone(legacy);
  const recover = async () => {
    const current = f.remote.batches[0];
    return f.handoff.recover(81, {
      action: 'release-qa-reservation',
      expectedSha: current.sha,
      token: current.codexFinalReview.nonce,
      reason: 'Synthetic authorized infrastructure recovery',
      authorizationRef: 'test:trusted-host',
    });
  };
  await recover();
  let calls = 0;
  for (let i = 0; i < 3; i++) {
    const current = structuredClone(f.remote.batches[0]);
    const args = {
      repo,
      batch: current,
      gh: f.github,
      communication: { mirrorFeedback: async () => {}, publishState: async () => {} },
      workspace: {
        prepare: async () => {},
        execute: async () => assert.fail('no implementation'),
        finalQa: async () => {
          calls++;
          throw new Error('synthetic infrastructure failure');
        },
      },
      save: async () => {
        const store = f.github.createStateStore();
        const state = await store.load();
        state.batches[0] = structuredClone(current);
        await store.save(state);
      },
      block: async () => {},
      report: async () => {},
    };
    if (i < 2) await assert.rejects(externalReviewStep(args), /synthetic infrastructure failure/);
    else await externalReviewStep(args);
    if (i < 2) await recover();
  }
  const final = f.remote.batches[0];
  assert.equal(calls, 2);
  assert.equal(final.implementation.length, 1);
  assert.deepEqual(final.qaHistory[0], legacy);
  assert.equal(final.qaHistory.length, 3);
  assert.equal(new Set(final.codexFinalQaInfrastructure.attempts.map((x) => x.nonce)).size, 3);
  assert.equal(final.codexFinalReview.failureCode, 'final-qa-infrastructure-exhausted');
});
