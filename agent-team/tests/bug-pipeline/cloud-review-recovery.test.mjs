import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudReviewRecovery } from '../../src/bug-pipeline/cloud-review-recovery.mjs';
import {
  attemptLimit,
  historyDigest,
  implementationAttempts,
} from '../../src/bug-pipeline/attempt-budget.mjs';

import {
  fixture,
  authorize,
  claim,
  selector,
  report,
  sha,
  base,
} from './cloud-recovery-fixture.mjs';

test('a stored request is not an execution capability; no default verifier grants recovery', async () => {
  const f = fixture({ verifier: false });
  await assert.rejects(f.core.prepare(selector), /execution capability/);
  await assert.rejects(authorize(f), /verifier unavailable/);
  f.assertPreserved();
  assert.equal(f.request().execution, undefined);
});
test('trusted execution authorization uses budget:null, a separate action and append-only replay audit', async () => {
  const f = fixture();
  const receipt = await authorize(f);
  assert.equal(receipt.authorization.binding.action, 'execute-cloud-review-recovery');
  assert.equal(receipt.authorization.binding.budget, null);
  assert.equal(receipt.authorization.binding.reservation.failedReviewNonce, 'failed-five');
  assert.equal(f.state().batches[0].recoveryHistory.length, 1);
  await assert.rejects(authorize(f));
  f.assertPreserved();
});
test('prepared source projects only generated canonical plan, never a committed implementation-plan', async () => {
  const f = fixture();
  await authorize(f);
  const p = await f.core.prepare(selector);
  assert.equal(p.subject.kind, 'post-merge-review-recovery');
  assert.equal(p.subject.packet.path, 'artifacts/task-validation/synthetic-followup');
  assert.equal(p.subject.canonicalRecoveryPlan.sourceSha, sha);
  assert.equal(p.subject.canonicalRecoveryPlan.provenance, 'canonical-recovery');
  assert.match(p.subject.canonicalRecoveryPlan.text, /NOT committed/);
  assert.equal(p.subject.reviews.length, 5);
  f.assertPreserved();
});
test('one technical claim, retain and exact global-round5 publication preserve every original byte', async () => {
  const f = fixture(),
    c = await claim(f);
  assert.equal(c.round, 5);
  assert.equal(f.request().execution.status, 'running');
  await f.core.retain(c, report, { tracked: new Set(['src/feature.ts']) });
  assert.equal(f.request().execution.reportSha256, historyDigest(report));
  const result = await f.core.publish(c);
  assert.equal(result.status, 'published');
  assert.equal(result.reviewId, 101);
  assert.equal(result.report.verdict, 'approved');
  assert.equal(f.calls.filter((x) => x.kind === 'post').length, 1);
  assert.equal(f.calls.find((x) => x.kind === 'post').round, 5);
  await f.core.publish(c);
  assert.equal(f.calls.filter((x) => x.kind === 'post').length, 1);
  await assert.rejects(f.core.prepare(selector));
  f.assertPreserved();
});
test('a distinct authenticated publisher cannot make its own actual review look like new human feedback', async () => {
  const f = fixture();
  f.controls.publisherLogin = 'publisher';
  const c = await claim(f);
  await f.core.retain(c, report, { tracked: new Set() });
  f.controls.beforePost = () => {
    f.controls.comments = [
      {
        author: 'publisher',
        body: `<!-- clinicos-claude-cron:82:${sha}:5 -->\nActual synthetic report`,
      },
    ];
  };
  assert.equal((await f.core.publish(c)).status, 'published');
  f.assertPreserved();
});
test('concurrent claimants have one CAS winner and no new review or allowance', async () => {
  const f = fixture();
  await authorize(f);
  const p = await f.core.prepare(selector);
  const options = { expectedFingerprint: p.fingerprint, actor: 'maintainer', runId: '123' };
  const outcomes = await Promise.allSettled([
    f.core.claim(selector, options),
    f.controller().claim(selector, options),
  ]);
  assert.equal(outcomes.filter((x) => x.status === 'fulfilled').length, 1);
  f.assertPreserved();
  assert.equal(f.calls.filter((x) => x.kind === 'post').length, 0);
});
for (const [name, change] of [
  [
    'head',
    (s) => {
      s.batches[0].postMergeFollowups[0].prHead = 'd'.repeat(40);
    },
  ],
  [
    'failed-review',
    (s) => {
      s.batches[0].postMergeFollowups[0].reviews[0].nonce = 'replacement';
    },
  ],
  [
    'owner',
    (s) => {
      s.batches[0].operatorCoordination.nonce = 'replacement';
    },
  ],
  [
    'source',
    (s) => {
      s.batches[0].postMergeFollowups[0].sourceManifest[0].blob = '1'.repeat(40);
    },
  ],
  [
    'request',
    (s) => {
      s.batches[0].postMergeFollowups[0].technicalRecoveryRequests[0].nonce = 'replacement';
    },
  ],
  [
    'capability',
    (s) => {
      s.batches[0].postMergeFollowups[0].technicalRecoveryRequests[0].executionAuthorization.authorization.binding.budget =
        {};
    },
  ],
])
  test(`changed ${name} fails closed before a recovery claim`, async () => {
    const f = fixture();
    await authorize(f);
    const p = await f.core.prepare(selector);
    f.mutate(change);
    await assert.rejects(
      f.core.claim(selector, {
        expectedFingerprint: p.fingerprint,
        actor: 'maintainer',
        runId: '123',
      }),
    );
    assert.equal(f.request()?.execution, undefined);
    assert.equal(f.calls.filter((x) => x.kind === 'post').length, 0);
  });
test('selector field injection, invalid round/nonce/SHA and duplicate native owner fail closed', async () => {
  const f = fixture();
  for (const invalid of [
    { ...selector, round: 6 },
    { ...selector, sha: '../bad' },
    { ...selector, requestNonce: '../bad' },
    { ...selector, allowance: 6 },
  ])
    await assert.rejects(f.core.prepare(invalid));
  f.mutate((s) => {
    s.standaloneReviews = [{ pr: { number: 82 } }];
  });
  await assert.rejects(authorize(f), /native subject/);
});
test('claims recheck live SHA, checks and maintainer authorization', async () => {
  for (const key of ['head', 'checks', 'revoked']) {
    const f = fixture();
    await authorize(f);
    const p = await f.core.prepare(selector);
    f.controls[key] = key === 'head' ? '1'.repeat(40) : key === 'revoked';
    await assert.rejects(
      f.core.claim(selector, {
        expectedFingerprint: p.fingerprint,
        actor: 'maintainer',
        runId: '123',
      }),
    );
    assert.equal(f.request().execution, undefined);
    f.assertPreserved();
  }
});
test('a takeover during CAS prerequisites prevents the reservation', async () => {
  const f = fixture();
  await authorize(f);
  const p = await f.core.prepare(selector);
  f.controls.beforeGuard = () =>
    f.mutate((s) => {
      s.batches[0].operatorCoordination.active = false;
    });
  await assert.rejects(
    f.core.claim(selector, {
      expectedFingerprint: p.fingerprint,
      actor: 'maintainer',
      runId: '123',
    }),
  );
  assert.equal(f.request().execution, undefined);
  f.assertPreserved();
});
test('a finite provider failure stays spent and can neither re-claim nor erase a genuine report', async () => {
  const f = fixture(),
    c = await claim(f);
  await assert.rejects(f.core.fail(c, 'arbitrary untrusted text'));
  await f.core.fail(c, 'claude-recovery-provider-failed');
  assert.equal(f.request().execution.status, 'failed');
  await assert.rejects(f.core.prepare(selector));
  await assert.rejects(f.core.retain(c, report, { tracked: new Set() }));
  f.assertPreserved();
  const g = fixture(),
    other = await claim(g);
  await g.core.retain(other, report, { tracked: new Set() });
  await assert.rejects(g.core.fail(other, 'claude-timeout'));
  assert.deepEqual(g.request().execution.report, report);
  g.assertPreserved();
});
test('unsafe, stale, contradictory or untracked findings are never retained/published', async () => {
  const f = fixture(),
    c = await claim(f);
  for (const invalid of [
    { ...report, subject_sha: 'a'.repeat(40) },
    { ...report, verdict: 'changes-requested' },
    { ...report, summary: 'postgresql://credential' },
    {
      ...report,
      verdict: 'changes-requested',
      findings: [
        {
          severity: 'low',
          file: 'missing.ts',
          line: 1,
          problem: 'A defect.',
          requested_change: 'Fix it.',
          test_expectation: 'Test it.',
        },
      ],
    },
  ]) {
    await assert.rejects(f.core.retain(c, invalid, { tracked: new Set(['src/feature.ts']) }));
  }
  assert.equal(f.request().execution.report, undefined);
  f.assertPreserved();
});
test('publication uncertainty retains the full genuine report and a second execution is refused', async () => {
  const f = fixture(),
    c = await claim(f);
  await f.core.retain(c, report, { tracked: new Set() });
  f.controls.postFailure = true;
  await assert.rejects(f.core.publish(c), /uncertain/);
  assert.equal(f.request().execution.status, 'report-retained');
  assert.deepEqual(f.request().execution.report, report);
  await assert.rejects(f.core.prepare(selector));
  f.assertPreserved();
});
test('revocation at actual POST boundary refuses publication without discarding evidence', async () => {
  const f = fixture(),
    c = await claim(f);
  await f.core.retain(c, report, { tracked: new Set() });
  f.controls.beforePost = () => {
    f.controls.revoked = true;
  };
  await assert.rejects(f.core.publish(c));
  assert.equal(f.calls.filter((x) => x.kind === 'post').length, 0);
  assert.equal(f.request().execution.status, 'report-retained');
  f.assertPreserved();
});
test('a replaced execution cannot receive stale failure/retention/publication', async () => {
  const f = fixture(),
    c = await claim(f);
  f.mutate((s) => {
    s.batches[0].postMergeFollowups[0].technicalRecoveryRequests[0].execution.nonce = 'new-owner';
  });
  await assert.rejects(f.core.fail(c, 'claude-timeout'));
  await assert.rejects(f.core.retain(c, report, { tracked: new Set() }));
  await assert.rejects(f.core.publish(c));
  assert.equal(f.request().execution.nonce, 'new-owner');
  f.assertPreserved();
});
test('authorization mismatch or replay cannot authorize a technical execution', async () => {
  const f = fixture();
  f.mutate((s) => {
    s.batches[0].recoveryHistory = [
      { authorization: { consumptionNonce: 'technical-consumption' } },
    ];
  });
  await assert.rejects(authorize(f), /replay/);
  assert.equal(f.request().executionAuthorization, undefined);
  f.assertPreserved();
  const g = fixture();
  await authorize(g);
  g.mutate((s) => {
    s.batches[0].recoveryHistory[0].authorization.provenance = 'untrusted-json';
  });
  await assert.rejects(g.core.prepare(selector));
  assert.equal(g.request().execution, undefined);
});
test('the technical route rejects failed executions that may have used inference', async () => {
  for (const field of [
    'inputTokens',
    'outputTokens',
    'durationApiMs',
    'modelUsageEmpty',
    'noReviewProduced',
  ]) {
    const f = fixture();
    f.mutate((s) => {
      s.batches[0].postMergeFollowups[0].reviews[0].authFailure[field] = [
        'modelUsageEmpty',
        'noReviewProduced',
      ].includes(field)
        ? false
        : 1;
    });
    await assert.rejects(authorize(f));
    assert.equal(f.request().execution, undefined);
  }
});
test('an older consumed round cannot recover after another global review was spent', async () => {
  const f = fixture();
  f.mutate((s) => {
    s.batches[0].postMergeFollowups.push({ pr: 83, reviews: [{ round: 6 }] });
  });
  await assert.rejects(authorize(f), /latest consumed round/);
  assert.equal(f.request().execution, undefined);
});
test('a second request cannot circumvent the one-execution fence of the failed reservation', async () => {
  const f = fixture();
  await authorize(f);
  f.mutate((s) => {
    s.batches[0].postMergeFollowups[0].technicalRecoveryRequests.push({
      nonce: 'another',
      execution: { nonce: 'already-reserved', status: 'failed' },
    });
  });
  await assert.rejects(f.core.prepare(selector));
  assert.equal(f.request().execution, undefined);
  f.assertPreserved();
});
test('post-publication competing ownership is never overwritten and genuine evidence survives', async () => {
  const f = fixture(),
    c = await claim(f);
  await f.core.retain(c, report, { tracked: new Set() });
  f.controls.overwriteAfterPost = true;
  await assert.rejects(f.core.publish(c));
  assert.equal(f.calls.filter((x) => x.kind === 'post').length, 1);
  assert.equal(f.request().execution.nonce, 'other');
  assert.deepEqual(f.request().execution.report, report);
  assert.equal(f.request().execution.status, 'report-retained');
  f.assertPreserved();
});
test('source drift during retention cannot replace an already-owned record', async () => {
  const f = fixture(),
    c = await claim(f);
  f.controls.head = '1'.repeat(40);
  await assert.rejects(f.core.retain(c, report, { tracked: new Set() }));
  assert.equal(f.request().execution.status, 'running');
  assert.equal(f.request().execution.report, undefined);
  f.assertPreserved();
});
test('missing or source-mismatched QA/CI never authorizes recovery', async () => {
  for (const change of [
    (f) => {
      f.qa.status = 'failed';
    },
    (f) => {
      f.ci.status = 'failed';
    },
    (f) => {
      f.qa.sourceSha = '1'.repeat(40);
    },
    (f) => {
      f.ci.sha = '1'.repeat(40);
    },
  ]) {
    const x = fixture();
    x.mutate((s) => change(s.batches[0].postMergeFollowups[0]));
    await assert.rejects(authorize(x));
    assert.equal(x.request().execution, undefined);
    x.assertPreserved();
  }
});
