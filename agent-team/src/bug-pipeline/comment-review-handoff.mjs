import { knownFailedCorrection, createWorkspace } from './workspace.mjs';
import { captureReleaseReviewProof } from './release.mjs';
import { operatorOwns } from './operator-ownership.mjs';
import {
  authorizationBinding,
  consumeOperatorAuthorization,
  authorizeObservationResume,
  settleImplementationAttempt,
  archiveUnavailableFailedOutput,
  implementationCheckpointRecovery,
} from './operator-authorization.mjs';
import {
  attemptLimit,
  finalQaIdentity,
  finalQaAccounting,
  finalQaLimit,
  finalQaHistoryDigest,
  historyDigest,
  implementationAttempts,
  activeImplementation,
  spentAttempts,
} from './attempt-budget.mjs';
import { githubOperationError, MERGE_RESERVATION_LEASE_MS } from './github.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { validateState, feedbackFingerprint, sha256, safeText } from './contracts.mjs';
import { validateReview } from '../../../scripts/quality-gate/claude-bug-review.mjs';

export const COMMENT_REVIEW_MARKER = '<!-- clinicos-review-handoff:v1 -->';
const REPO = 'l2v-hub/ClinicOS';
const clone = (value) => structuredClone(value);
const channel = (batch) => batch.externalReview?.channel === 'github-comments';

function ownershipChanged() {
  return Object.assign(new Error('Owned claim snapshot changed'), {
    code: 'review-ownership-changed',
  });
}
export function reviewSubjectIdentity(subject) {
  return {
    pr: subject.pr?.number, sha: subject.sha, baseSha: subject.baseSha,
    branch: subject.branch, baseRef: subject.baseRef ?? 'main', issues: subject.issues,
    plan: subject.plan ?? null, grouping: subject.grouping ?? null,
    packet: subject.packet ?? null, sourceManifest: subject.sourceManifest ?? null,
    preservedPackets: subject.preservedPackets ?? null,
    implementationOwner: activeImplementation(subject) ?? null,
    handoff: Object.fromEntries(['channel', 'status', 'owner', 'claimId', 'requestId', 'subjectSha']
      .map((key) => [key, subject.externalReview?.[key]])),
    reviews: subject.reviews.map(({ round, status, subjectSha }) => ({ round, status, subjectSha })),
    ledger: subject.reviewLedger ? {
      schema_version: subject.reviewLedger.schema_version,
      max_rounds: subject.reviewLedger.max_rounds,
      rounds: subject.reviewLedger.rounds.map(({ round, verdict, subject_sha, review_sha256 }) =>
        ({ round, verdict, subject_sha, review_sha256 })),
    } : null,
    reviewReports: subject.reviewReports ?? null,
  };
}
function assertExpectedClaim(batch, expectedClaim, login) {
  try {
    assert.deepEqual(reviewSubjectIdentity(batch), reviewSubjectIdentity(expectedClaim));
    assert.equal(expectedClaim.externalReview?.status, 'comment-running');
    assert.equal(expectedClaim.externalReview?.owner, login);
  } catch {
    throw ownershipChanged();
  }
}
function sourceChanged() {
  return Object.assign(new Error('Prepared review source changed'), { code: 'preclaim-source-changed' });
}
function assertExpectedSubject(batch, expectedSubject) {
  try {
    assert.deepEqual(reviewSubjectIdentity(batch), reviewSubjectIdentity(expectedSubject));
    assert.equal(expectedSubject.externalReview?.status, 'comment-requested');
  } catch { throw sourceChanged(); }
}

// Defense in depth: only the native pending -> running reservation may differ
// from the immutable subject that supplied the prepared inference packet.
export function assertClaimTransition(expectedSubject, claimed, { actor, expectedFeedbackFingerprint }) {
  const round = expectedSubject.reviews.length + 1, pending = clone(claimed);
  assert.equal(claimed.phase, 'reviewing');
  assert.equal(claimed.externalReview.status, 'comment-running');
  assert.equal(claimed.externalReview.owner, actor);
  assert.ok(typeof claimed.externalReview.claimId === 'string' && claimed.externalReview.claimId);
  assert.equal(claimed.externalReview.feedbackFingerprint, expectedFeedbackFingerprint);
  assert.equal(claimed.reviews.length, round);
  assert.deepEqual(claimed.reviews.at(-1), { round, status: 'running', subjectSha: expectedSubject.sha });
  assert.equal(claimed.reviewLedger.rounds.length, round);
  assert.deepEqual(claimed.reviewLedger.rounds.at(-1), { round, verdict: 'running', subject_sha: expectedSubject.sha });
  pending.reviews = pending.reviews.slice(0, -1);
  pending.reviewLedger.rounds = pending.reviewLedger.rounds.slice(0, -1);
  if (!expectedSubject.reviewLedger) {
    assert.equal(claimed.reviewLedger.schema_version, 1);
    assert.equal(claimed.reviewLedger.max_rounds, 4);
    delete pending.reviewLedger;
  }
  for (const key of ['status', 'owner', 'claimId']) {
    if (expectedSubject.externalReview[key] === undefined) delete pending.externalReview[key];
    else pending.externalReview[key] = expectedSubject.externalReview[key];
  }
  assertExpectedSubject(pending, expectedSubject);
}

export function handoffFeedbackFingerprint(feedback, owner, publisher = owner) {
  return feedbackFingerprint({
    ...feedback,
    comments: feedback.comments.filter(
      (comment) =>
        !(
          (comment.author === owner && String(comment.body).startsWith(COMMENT_REVIEW_MARKER)) ||
          (comment.author === publisher &&
            String(comment.body).startsWith(
              `<!-- clinicos-claude-cron:${feedback.number}:${feedback.head}:`,
            ))
        ),
    ),
  });
}

export function createCommentReviewHandoff({
  github,
  run,
  cwd,
  now = () => new Date(),
  nonce = randomUUID,
  subjectAdapter,
  authorizationVerifier,
  unavailabilityObserver,
  workspace,
  operationTimeouts = {},
  automatic = () => false,
}) {
  assert.equal(typeof automatic, 'function');
  const store = github.createStateStore();
  const timeouts = Object.freeze({
    ...operationTimeouts,
    merge: Math.max(MERGE_RESERVATION_LEASE_MS, operationTimeouts.merge ?? 0),
  });
  async function api(endpoint) {
    const result = await run({
      command: 'gh',
      args: ['api', endpoint],
      cwd,
      timeoutMs: 30000,
      maxOutputBytes: 16 * 1024 * 1024,
      envMode: 'controller',
    });
    if (!result.ok) throw githubOperationError(result, 'read');
    return JSON.parse(result.stdout);
  }
  async function actor() {
    const login = (await api('user')).login;
    assert.ok(
      typeof login === 'string' && (await github.authorized(login)),
      'Unauthorized handoff actor',
    );
    return login;
  }
  async function live(batch) {
    if (automatic()) await load(batch.pr.number);
    if (subjectAdapter) await subjectAdapter.live(batch);
    const feedback = await github.reviewFeedback(batch.pr.number);
    assert.ok(
      feedback.state === 'OPEN' &&
        !feedback.isDraft &&
        feedback.head === batch.sha &&
        feedback.headRef === batch.branch &&
        feedback.headRepo === REPO &&
        !feedback.headIsFork &&
        feedback.baseRef === 'main',
      'Review subject changed',
    );
    assert.ok(!['merged', 'deployed'].includes(batch.release?.status), 'Released subject');
    for (const number of batch.issues)
      assert.equal(
        String((await github.viewIssue(number)).state).toLowerCase(),
        'open',
        'Closed source issue',
      );
    return feedback;
  }
  async function load(pr, { includeManual = false } = {}) {
    const state = subjectAdapter
      ? subjectAdapter.validate(await store.load())
      : validateState(await store.load(), REPO);
    const batch = (
      subjectAdapter
        ? subjectAdapter.subjects(state)
        : [...state.batches, ...(includeManual ? (state.manualBatches ?? []) : [])]
    ).find((item) => item.pr?.number === pr);
    assert.ok(batch && batch.sha, 'PR has no controller-owned implementation/evidence packet');
    if (automatic()) {
      const collection = ['batches', 'manualBatches', 'standaloneReviews'].find((key) =>
        (state[key] ?? []).some((item) => item.id === batch.id),
      );
      if (operatorOwns(state, collection, batch))
        throw Object.assign(new Error('Automatic review subject is operator-owned'), {
          code: 'review-operator-owned',
        });
    }
    return { state, batch };
  }
  async function liveForClaim(batch, expectedClaim) {
    try {
      return await live(batch);
    } catch (error) {
      if (expectedClaim !== undefined && error?.code === 'ERR_ASSERTION')
        throw ownershipChanged();
      throw error;
    }
  }
  async function save(state, batch, login, { guard, recoveryHead, finalGuard } = {}) {
    if (subjectAdapter) subjectAdapter.validate(state);
    const expected = JSON.stringify(batch);
    state.updatedAt = now().toISOString();
    await store.save(state, {
      rebaseIndependentSubjects: async (merged) => {
        validateState(merged, REPO);
        if (automatic()) {
          const current = ['batches', 'manualBatches', 'standaloneReviews'].flatMap((collection) =>
            (merged[collection] ?? [])
              .filter((item) => item.id === batch.id)
              .map((item) => ({ collection, item })),
          );
          assert.equal(current.length, 1, 'Automatic handoff owner changed');
          if (operatorOwns(merged, current[0].collection, current[0].item))
            throw Object.assign(new Error('Automatic review subject is operator-owned'), {
              code: 'review-operator-owned',
            });
        }
        if (merged.standaloneReviews) {
          const { validateStandaloneState } = await import('./standalone-review.mjs');
          validateStandaloneState(merged);
        }
      },
      guard: async () => {
        const started = performance.now();
        if (guard) await guard();
        if (recoveryHead) await recoveryLive(batch, recoveryHead);
        else await live(batch);
        if (
          subjectAdapter?.reservationGuard &&
          ['comment-requested', 'comment-running'].includes(batch.externalReview?.status)
        )
          await subjectAdapter.reservationGuard(batch);
        assert.equal(JSON.stringify(batch), expected, 'Handoff subject mutated');
        assert.ok(await github.authorized(login), 'Handoff actor lost authorization');
        if (automatic()) await load(batch.pr.number);
        if (finalGuard) await finalGuard();
        assert.ok(performance.now() - started <= 60000, 'Handoff guard expired');
      },
    });
  }
  async function tracked(batch) {
    const tree = await api(`repos/${REPO}/git/trees/${batch.sha}?recursive=1`);
    assert.equal(tree.truncated, false, 'Incomplete reviewed source inventory');
    assert.ok(Array.isArray(tree.tree));
    return new Set(tree.tree.filter((item) => item.type === 'blob').map((item) => item.path));
  }
  async function message(batch, payload, { expectedClaim } = {}) {
    payload = clone(payload);
    const body = `${COMMENT_REVIEW_MARKER}\n${JSON.stringify(payload, null, 2)}`;
    assert.ok(body.length <= 60000, 'Review comment exceeds GitHub bound');
    const claimGuard = async () => {
      if (expectedClaim === undefined) return;
      const login = await actor();
      await liveForClaim(batch, expectedClaim);
      const current = (await load(batch.pr.number)).batch;
      assertExpectedClaim(current, expectedClaim, login);
    };
    await liveForClaim(batch, expectedClaim);
    const issue = await github.viewIssue(batch.pr.number);
    if (
      !issue.comments.some(
        (item) => (item.user?.login ?? item.author) === payload.actor && item.body === body,
      )
    ) {
      const current = (await load(batch.pr.number)).batch;
      if (expectedClaim !== undefined) assertExpectedClaim(current, expectedClaim, payload.actor);
      else assert.deepEqual(current, batch, 'Durable handoff changed before comment');
      await liveForClaim(batch, expectedClaim);
      assert.ok(await github.authorized(payload.actor), 'Comment actor lost authorization');
      if (automatic()) await load(batch.pr.number);
      // Reload AFTER live/auth awaits, immediately before the irreversible effect.
      // A same-actor replacement claim on the same SHA must not receive this result.
      await claimGuard();
      await github.commentPR(batch.pr.number, body);
    } else await claimGuard();
  }
  async function requestNotice(batch, login) {
    assert.equal(batch.externalReview?.status, 'comment-requested');
    const owner = batch.externalReview.requestedBy ?? batch.reviewHandoffHistory?.at(-1)?.actor;
    assert.equal(owner, login, 'Request notice belongs to another actor');
    await message(batch, {
      kind: 'request',
      actor: owner,
      pr: batch.pr.number,
      subject_sha: batch.sha,
      request_id: batch.externalReview.requestId,
      next_round: batch.reviews.length + 1,
      action:
        'Claude: claim through the trusted handoff CLI before reviewing; publish exact-SHA structured findings, then hand control to Codex.',
    });
  }
  async function authorization(state, batch, login, action, reference, details = {}) {
    return consumeOperatorAuthorization({
      verifier: authorizationVerifier,
      reference,
      state,
      binding: authorizationBinding({ state, subject: batch, actor: login, action, ...details }),
    });
  }
  async function releaseLease(
    state,
    batch,
    login,
    kind,
    previous,
    token,
    forceLive,
    authorizationRef,
  ) {
    const timestamp = previous.reservedAt ?? previous.startedAt;
    const start =
      typeof timestamp === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(timestamp)
        ? Date.parse(timestamp)
        : NaN;
    const validStart =
      Number.isFinite(start) &&
      [new Date(start).toISOString(), new Date(start).toISOString().replace('.000Z', 'Z')].includes(
        timestamp,
      );
    const timeout = timeouts[kind];
    const clock = now().getTime();
    const expired =
      validStart &&
      Number.isFinite(clock) &&
      Number.isSafeInteger(timeout) &&
      timeout > 0 &&
      clock >= start + timeout;
    const live = previous.status !== 'failed' && !expired;
    if (live)
      assert.equal(forceLive, true, 'Live or undated reservation requires authorized force');
    // Each QA retry and every ownership release consumes an external capability.
    return authorization(
      state,
      batch,
      login,
      live ? 'force-live-recovery' : 'release-reservation',
      authorizationRef,
      { reservation: { kind, token, previous: historyDigest(previous), forceLive: live } },
    );
  }
  async function request(pr, { recoverFailed = false, authorizationRef } = {}) {
    const login = await actor(),
      { state, batch } = await load(pr);
    await live(batch);
    assert.ok(
      !batch.reviews.some((item) => item.status === 'running') && !activeImplementation(batch),
      'Another worker owns this batch',
    );
    assert.ok(
      batch.reviews.length < attemptLimit(batch, 'reviews'),
      'Four review attempts exhausted',
    );
    assert.equal(
      implementationAttempts(batch).at(-1)?.status,
      'passed',
      'Implementation/evidence not verified',
    );
    assert.ok((await github.requiredChecks(pr)).ok, 'Required checks are not passing');
    if (channel(batch) && batch.externalReview.status === 'comment-requested') {
      await requestNotice(batch, login);
      return clone(batch);
    }
    if (batch.phase === 'blocked') {
      assert.ok(
        recoverFailed &&
          batch.externalReview?.status === 'failed' &&
          batch.reviews.at(-1)?.status === 'failed',
        'Explicit failed-execution recovery required',
      );
    } else
      assert.ok(
        ['waiting-review', 'waiting-checks', 'ready'].includes(batch.phase),
        'Batch not ready for handoff',
      );
    const previous = batch.reviews.at(-1);
    if (previous?.subjectSha === batch.sha)
      assert.ok(
        recoverFailed && previous.status === 'failed',
        'New code revision required after a substantive review',
      );
    const recoveryAuthorization = recoverFailed
      ? await authorization(state, batch, login, 'retry-failed-review', authorizationRef, {
          reservation: {
            requestId: batch.externalReview?.requestId ?? null,
            round: batch.reviews.length,
          },
        })
      : undefined;
    batch.reviewHandoffHistory ??= [];
    batch.reviewHandoffHistory.push({
      at: now().toISOString(),
      actor: login,
      previous: clone(batch.externalReview ?? null),
      recovery: recoverFailed,
      ...(recoveryAuthorization ? { authorization: recoveryAuthorization } : {}),
      spentReviews: batch.reviews.length,
    });
    batch.externalReview = {
      channel: 'github-comments',
      status: 'comment-requested',
      subjectSha: batch.sha,
      requestId: nonce(),
      requestedAt: now().toISOString(),
      requestedBy: login,
    };
    batch.reviewChannel = 'github-comments';
    batch.phase = 'waiting-review';
    delete batch.reason;
    await save(state, batch, login);
    try {
      await requestNotice(batch, login);
    } catch (error) {
      Object.assign(error, { persisted: true, projection: 'request-comment-failed', pr });
      throw error;
    }
    return clone(batch);
  }
  async function claim(pr, { expectedSubject, expectedFeedbackFingerprint, expectedActor } = {}) {
    const expected = expectedSubject === undefined ? undefined : clone(expectedSubject);
    if (expectedFeedbackFingerprint !== undefined) assert.match(expectedFeedbackFingerprint, /^[a-f0-9]{64}$/);
    const login = await actor(),
      { state, batch } = await load(pr);
    if (expected !== undefined) assertExpectedSubject(batch, expected);
    if (expectedActor !== undefined && expectedActor !== login) throw sourceChanged();
    assert.ok(
      channel(batch) && batch.externalReview.status === 'comment-requested',
      'Review is not available',
    );
    const boundLive = async () => {
      let feedback;
      try { feedback = await live(batch); }
      catch (error) {
        if ((expected !== undefined || expectedFeedbackFingerprint !== undefined) && error?.code === 'ERR_ASSERTION')
          throw sourceChanged();
        throw error;
      }
      if (expectedFeedbackFingerprint !== undefined &&
        handoffFeedbackFingerprint(feedback, login) !== expectedFeedbackFingerprint) throw sourceChanged();
      return feedback;
    };
    const feedback = await boundLive();
    assert.ok(!activeImplementation(batch), 'Operator continuation owns this subject');
    assert.ok(
      batch.reviews.length < attemptLimit(batch, 'reviews') && (await github.requiredChecks(pr)).ok,
      'Review prerequisites changed',
    );
    const round = batch.reviews.length + 1;
    batch.reviewLedger ??= { schema_version: 1, max_rounds: 4, rounds: [] };
    assert.equal(batch.reviewLedger.rounds.length, batch.reviews.length, 'Ledger inconsistent');
    batch.reviews.push({ round, status: 'running', subjectSha: batch.sha });
    batch.reviewLedger.rounds.push({ round, verdict: 'running', subject_sha: batch.sha });
    Object.assign(batch.externalReview, {
      status: 'comment-running',
      owner: login,
      claimId: nonce(),
      startedAt: now().toISOString(),
      feedbackFingerprint: handoffFeedbackFingerprint(feedback, login),
    });
    batch.phase = 'reviewing';
    try {
      await save(state, batch, login, {
        finalGuard: expected === undefined && expectedFeedbackFingerprint === undefined ? undefined : async () => {
          if (expected !== undefined) assertExpectedSubject((await load(pr)).batch, expected);
          await boundLive();
        },
      });
    } catch (error) {
      if (expected !== undefined && ['state-cas-conflict', 'state-rebase-conflict'].includes(error?.code))
        throw sourceChanged();
      throw error;
    } // CAS reservation BEFORE the local Claude starts its review.
    return clone(batch);
  }
  async function submit(pr, review, { expectedClaim } = {}) {
    const expected = expectedClaim === undefined ? undefined : clone(expectedClaim);
    const report = clone(review);
    const login = await actor(),
      { batch } = await load(pr);
    if (expected !== undefined) assertExpectedClaim(batch, expected, login);
    assert.ok(
      channel(batch) &&
        batch.externalReview.status === 'comment-running' &&
        batch.externalReview.owner === login,
      'No owned review reservation',
    );
    await liveForClaim(batch, expected);
    validateReview(report, batch.sha, await tracked(batch));
    await message(batch, {
      kind: 'report',
      actor: login,
      pr,
      subject_sha: batch.sha,
      request_id: batch.externalReview.requestId,
      claim_id: batch.externalReview.claimId,
      round: batch.reviews.length,
      report,
    }, { expectedClaim: expected });
    return { status: 'submitted', pr, sha: batch.sha, round: batch.reviews.length };
  }
  // A provider failure may spend only the exact reservation this worker acquired.
  // This is not recovery: it never releases ownership, refunds a round or retries.
  async function failOwnedClaim(pr, claimed, failureCode) {
    assert.ok([
      'claude-timeout', 'claude-output-limit', 'claude-nonzero-exit',
      'claude-spawn-failed', 'claude-authentication-error', 'claude-rate-limit',
      'claude-overloaded', 'claude-turn-limit', 'claude-execution-error',
      'claude-invalid-json', 'claude-missing-structured-report', 'review-validation-failed',
    ].includes(failureCode), 'Unknown provider failure');
    const login = await actor(), { state, batch } = await load(pr);
    assertExpectedClaim(batch, claimed, login);
    assert.ok(channel(batch) && batch.externalReview.status === 'comment-running');
    assert.equal(batch.externalReview.owner, login, 'Claim belongs to another actor');
    assert.ok(batch.externalReview.claimId && batch.externalReview.requestId);
    assert.equal(batch.externalReview.subjectSha, batch.sha);
    assert.equal(batch.reviews.at(-1)?.subjectSha, batch.sha);
    assert.equal(batch.reviews.at(-1)?.status, 'running');
    assert.equal(batch.reviewLedger?.rounds.at(-1)?.subject_sha, batch.sha);
    assert.equal(batch.reviewLedger?.rounds.at(-1)?.verdict, 'running');
    const noReport = async () => {
      const issue = await github.viewIssue(pr);
      for (const comment of issue.comments) {
        if ((comment.user?.login ?? comment.author) !== login ||
          !String(comment.body).startsWith(COMMENT_REVIEW_MARKER + '\n')) continue;
        let value;
        try { value = JSON.parse(comment.body.slice(COMMENT_REVIEW_MARKER.length + 1)); }
        catch { continue; }
        assert.ok(!(value.kind === 'report' && value.pr === pr && value.actor === login &&
          value.subject_sha === claimed.sha && value.request_id === claimed.externalReview.requestId &&
          value.claim_id === claimed.externalReview.claimId && value.round === claimed.reviews.length),
        'A report already exists for this claim; reconcile instead');
      }
    };
    await noReport();
    await live(batch);
    const previous = clone(batch.externalReview);
    batch.reviews.at(-1).status = 'failed';
    batch.reviewLedger.rounds.at(-1).verdict = 'failed';
    Object.assign(batch.externalReview, {
      status: 'failed', failureCode, failedAt: now().toISOString(),
    });
    batch.recoveryHistory ??= [];
    batch.recoveryHistory.push({
      action: 'owned-provider-failure', actor: login, at: now().toISOString(),
      subjectSha: batch.sha, token: previous.claimId,
      claimSnapshotSha256: sha256(JSON.stringify(claimed)), previous,
      consumedReviews: batch.reviews.length,
      consumedImplementation: spentAttempts(batch, 'implementation'),
    });
    batch.phase = 'blocked';
    batch.reason = 'Claude execution failed; its reserved attempt remains spent';
    delete batch.approvedSha;
    await save(state, batch, login, { guard: noReport });
    return clone(batch);
  }
  async function reconcile(batch, persist, { repairNotice = false } = {}) {
    if (automatic()) await load(batch.pr.number);
    if (!channel(batch)) return false;
    if (batch.externalReview.status === 'comment-requested') {
      if (repairNotice) await requestNotice(batch, await actor());
      return false;
    }
    if (batch.externalReview.status === 'published') return true;
    const handoff = batch.externalReview;
    assert.ok(
      ['comment-running', 'finished'].includes(handoff.status),
      'Unknown comment handoff state',
    );
    const owner = handoff.owner;
    assert.ok(await github.authorized(owner), 'Review author no longer authorized');
    let report;
    if (handoff.status === 'comment-running') {
      const issue = await github.viewIssue(batch.pr.number);
      for (const comment of issue.comments) {
        if (
          (comment.user?.login ?? comment.author) !== owner ||
          !String(comment.body).startsWith(COMMENT_REVIEW_MARKER + '\n')
        )
          continue;
        let value;
        try {
          value = JSON.parse(comment.body.slice(COMMENT_REVIEW_MARKER.length + 1));
        } catch {
          continue;
        }
        if (
          value.kind !== 'report' ||
          value.pr !== batch.pr.number ||
          value.actor !== owner ||
          value.subject_sha !== batch.sha ||
          value.request_id !== handoff.requestId ||
          value.claim_id !== handoff.claimId ||
          value.round !== batch.reviews.length
        )
          continue;
        report = validateReview(value.report, batch.sha, await tracked(batch));
        const fresh = await github.viewIssue(batch.pr.number);
        assert.ok(
          fresh.comments.some(
            (item) =>
              item.id === comment.id &&
              item.body === comment.body &&
              (item.user?.login ?? item.author) === owner,
          ),
          'Review source changed',
        );
        await live(batch);
        assert.ok(await github.authorized(owner), 'Review author lost authorization');
        assert.equal(batch.reviews.at(-1)?.status, 'running');
        assert.equal(batch.reviewLedger.rounds.at(-1)?.verdict, 'running');
        const content = JSON.stringify(report, null, 2) + '\n';
        batch.reviewReports ??= {};
        batch.reviewReports[`claude-review-${value.round}.json`] = content;
        Object.assign(batch.reviewLedger.rounds.at(-1), {
          verdict: report.verdict,
          review_sha256: sha256(content),
        });
        batch.reviews.at(-1).status = report.verdict;
        Object.assign(handoff, {
          status: 'finished',
          reportComment: comment.id,
          reportBodySha256: sha256(comment.body),
        });
        batch.phase = 'waiting-review';
        await persist({
          guard: async () => {
            const source = await github.viewIssue(batch.pr.number);
            assert.ok(
              source.comments.some(
                (item) =>
                  item.id === comment.id &&
                  item.body === comment.body &&
                  (item.user?.login ?? item.author) === owner,
              ),
              'Review changed before durable import',
            );
            await live(batch);
            assert.ok(
              await github.authorized(owner),
              'Reviewer authorization changed before import',
            );
          },
        });
        break;
      }
      if (!report) return false;
    } else {
      const content = batch.reviewReports[`claude-review-${batch.reviews.length}.json`];
      const last = batch.reviewLedger?.rounds?.at(-1);
      assert.equal(sha256(content), last?.review_sha256, 'Stored report hash changed');
      report = validateReview(JSON.parse(content), batch.sha, await tracked(batch));
      assert.equal(report.verdict, last.verdict, 'Ledger verdict changed');
      assert.equal(report.verdict, batch.reviews.at(-1).status, 'Attempt verdict changed');
      assert.equal(last.subject_sha, batch.sha, 'Stale ledger subject');
    }
    const publisher = await actor();
    const before = await live(batch);
    assert.ok(await github.authorized(owner), 'Reviewer authorization changed');
    const changed =
      handoffFeedbackFingerprint(before, owner, publisher) !== handoff.feedbackFingerprint;
    await github.publishExternalReview(
      batch.pr.number,
      batch.sha,
      report,
      batch.reviews.length,
      batch,
    );
    const after = await live(batch);
    Object.assign(handoff, {
      status: 'published',
      completedAt: now().toISOString(),
      feedbackChanged:
        changed ||
        handoffFeedbackFingerprint(after, owner, publisher) !== handoff.feedbackFingerprint,
      feedbackFingerprint: feedbackFingerprint(after),
    });
    batch.phase = 'waiting-review';
    await persist();
    return true;
  }
  async function reconcilePR(pr) {
    const login = await actor(),
      { state, batch } = await load(pr);
    let persisted = false;
    try {
      await reconcile(
        batch,
        async (options) => {
          await save(state, batch, login, options);
          persisted = true;
        },
        { repairNotice: true },
      );
    } catch (error) {
      if (persisted)
        Object.assign(error, { persisted: true, projection: 'report-publication-failed', pr });
      throw error;
    }
    return clone(batch);
  }
  async function recoveryLive(batch, expectedHead) {
    const feedback = await github.reviewFeedback(batch.pr.number);
    assert.ok(
      (feedback.state === 'OPEN' ||
        (feedback.state === 'MERGED' &&
          batch.release?.status === 'merged' &&
          feedback.mergeCommitSha === batch.release.mergeSha)) &&
        !feedback.isDraft &&
        feedback.headRef === batch.branch &&
        feedback.headRepo === REPO &&
        !feedback.headIsFork &&
        feedback.baseRef === 'main',
      'Recovery native identity changed',
    );
    if (expectedHead) assert.equal(feedback.head, expectedHead, 'Recovery head changed');
    return feedback.head;
  }
  async function maintainer() {
    const login = await actor();
    assert.ok(
      github.authorizedMaintainer && (await github.authorizedMaintainer(login)),
      'Recovery and budget changes require a maintainer',
    );
    return login;
  }
  async function extendBudget(pr, { kind, limit, reason, authorizationRef }) {
    const login = await maintainer(),
      { state, batch } = await load(pr, { includeManual: true });
    assert.ok(['implementation', 'reviews'].includes(kind));
    assert.ok(typeof reason === 'string' && reason.trim() && reason.length <= 1000);
    assert.ok(
      typeof authorizationRef === 'string' &&
        authorizationRef.trim() &&
        authorizationRef.length <= 200,
    );
    safeText(reason);
    safeText(authorizationRef);
    assert.ok(
      !batch.reviews.some((item) => item.status === 'running') && !activeImplementation(batch),
      'Finish owned attempt before extending budget',
    );
    const previousLimit = attemptLimit(batch, kind);
    assert.equal(limit, previousLimit + 1, 'Extend one attempt at a time');
    assert.ok(limit <= 32, 'Explicit storage policy required beyond 32 attempts');
    const approved = await authorization(state, batch, login, 'extend-budget', authorizationRef, {
      budget: { kind, previousLimit, limit },
    });
    batch.budgetExtensions ??= [];
    batch.budgetExtensions.push({
      entityId: batch.id,
      pr,
      kind,
      previousLimit,
      limit,
      actor: login,
      at: now().toISOString(),
      reason,
      authorizationRef,
      authorization: approved,
      nonce: nonce(),
      historyLength: spentAttempts(batch, kind),
      historyDigest: historyDigest(
        kind === 'implementation' ? implementationAttempts(batch) : batch[kind],
      ),
    });
    const recoveryHead = await recoveryLive(batch);
    await save(state, batch, login, {
      recoveryHead,
      guard: async () => {
        assert.ok(await github.authorizedMaintainer(login), 'Maintainer authorization revoked');
      },
    });
    return clone(batch);
  }
  async function recover(
    pr,
    { action, expectedSha, token, checkpointSha256, reason, round, forceLive = false,
      authorizationRef, unavailabilityEvidence },
  ) {
    const login = await maintainer(),
      { state, batch } = await load(pr, { includeManual: true });
    assert.equal(expectedSha, batch.sha, 'Recovery must name the durable subject SHA');
    assert.ok(typeof reason === 'string' && reason.trim() && reason.length <= 1000);
    safeText(reason);
    let recoveryHead;
    let recoveryAuthorization;
    let previous;
    let nextFailureCode;
    let reuseFinalQa = false;
    if (action !== 'release-merge-reservation') recoveryHead = await recoveryLive(batch);
    if (action === 'archive-unavailable-failed-output') {
      assert.ok(!subjectAdapter, 'Failed output archive requires a native controller journal');
      assert.equal(recoveryHead, batch.sha, 'Published source changed');
      await archiveUnavailableFailedOutput({
        state, subject: batch, actor: login, reference: authorizationRef,
        verifier: authorizationVerifier, verifyUnavailability: unavailabilityObserver,
        evidence: unavailabilityEvidence, progressSha256: token, checkpointSha256,
        reason, now,
      });
      await save(state, batch, login, {
        recoveryHead,
        guard: async () => {
          assert.ok(await github.authorizedMaintainer(login), 'Maintainer authorization revoked');
        },
      });
      return clone(batch);
    }
    if (action === 'abandon-claim') {
      previous = clone(batch.externalReview);
      assert.equal(previous?.status, 'comment-running');
      assert.equal(token, previous.claimId, 'Recovery claim changed');
      recoveryAuthorization = await releaseLease(
        state,
        batch,
        login,
        'claim',
        previous,
        token,
        forceLive,
        authorizationRef,
      );
      assert.equal(batch.reviews.at(-1)?.status, 'running');
      assert.equal(batch.reviewLedger?.rounds.at(-1)?.verdict, 'running');
      batch.reviews.at(-1).status = 'failed';
      batch.reviewLedger.rounds.at(-1).verdict = 'failed';
      batch.externalReview = { ...previous, status: 'failed', abandonedAt: now().toISOString() };
      delete batch.externalReview.claimId;
      batch.phase = 'blocked';
    } else if (action === 'settle-implementation') {
      assert.ok(!subjectAdapter, 'Implementation settlement requires a native controller journal');
      previous = clone(batch.controllerProgress);
      recoveryAuthorization = await settleImplementationAttempt({
        state,
        subject: batch,
        actor: login,
        reference: authorizationRef,
        verifier: authorizationVerifier,
        reason,
        progressSha256: token,
        round,
        now,
      });
      batch.recoveryHistory.pop(); // Shared authorizer's receipt is recorded below once.
      nextFailureCode = batch.failureCode;
    } else if (action === 'reconcile-implementation-checkpoint') {
      assert.ok(!subjectAdapter, 'Checkpoint reconciliation requires a native controller journal');
      const identity = implementationCheckpointRecovery(batch, { round, progressSha256: token });
      assert.ok(
        [identity.sourceSha, identity.checkpointSha].includes(recoveryHead),
        'Checkpoint publication outcome is not authoritatively observed',
      );
      const ownedWorkspace =
        workspace ?? createWorkspace({ root: cwd, repo: REPO, run, models: {} });
      const proof = await ownedWorkspace.inspectRecoveryCheckpoint(batch, identity);
      previous = {
        progress: clone(batch.controllerProgress),
        externalReview: clone(batch.externalReview),
        local: proof,
        observedHead: recoveryHead,
      };
      recoveryAuthorization = await authorization(state, batch, login, action, authorizationRef, {
        budget: {
          kind: 'controller-checkpoint-reconciliation',
          ...identity,
          observedHead: recoveryHead,
          localSha256: historyDigest(proof),
        },
      });
      assert.deepEqual(
        authorizationBinding({
          state,
          subject: batch,
          actor: login,
          action,
          budget: recoveryAuthorization.binding.budget,
        }),
        recoveryAuthorization.binding,
        'Checkpoint recovery history changed during authorization',
      );
      implementationCheckpointRecovery(batch, { round, progressSha256: token });
      await recoveryLive(batch, recoveryHead);
      assert.ok(await github.authorizedMaintainer(login), 'Maintainer authorization revoked');
      if (recoveryHead === identity.sourceSha) {
        await ownedWorkspace.restoreRecoveryRevision(batch, proof, identity.sourceSha);
        batch.sha = identity.sourceSha;
        nextFailureCode = batch.failureCode;
        batch.phase = 'blocked';
      } else {
        // Native observation confirms publication. Never republish or correct
        // the old review; the next controller step requests review of this SHA.
        assert.deepEqual(
          await ownedWorkspace.inspectRecoveryCheckpoint(batch, identity),
          proof,
          'Published checkpoint changed during authorization',
        );
        await ownedWorkspace.restoreRecoveryRevision(batch, proof, identity.checkpointSha);
        batch.externalReview = null;
        batch.controllerProgress.status = 'completed';
        if (batch.controllerProgress.next === 6)
          batch.controllerProgress.completed.push({ step: 'publish', observedHead: recoveryHead });
        batch.controllerProgress.next = 7;
        delete batch.controllerProgress.pending;
        batch.phase = 'waiting-checks';
      }
      batch.controllerProgress.checkpointRecovery = {
        outcome: recoveryHead === identity.sourceSha ? 'source-restored' : 'publication-observed',
        ...identity,
        observedHead: recoveryHead,
        localSha256: historyDigest(proof),
      };
    } else if (action === 'resume-observation') {
      assert.equal(
        token,
        batch.controllerInterruption?.progressSha256,
        'Observation checkpoint changed',
      );
      previous = clone(batch.controllerInterruption);
      recoveryAuthorization = await authorizeObservationResume({
        state,
        subject: batch,
        actor: login,
        reference: authorizationRef,
        verifier: authorizationVerifier,
        reason,
        now,
      });
      // The shared authorizer records the durable exact-history receipt once.
      batch.recoveryHistory.pop();
    } else if (['recover-final-qa', 'extend-final-qa'].includes(action)) {
      previous = clone(batch.codexFinalReview ?? null);
      assert.equal(
        token,
        previous?.nonce ?? historyDigest(previous),
        'Final QA recovery identity changed',
      );
      assert.ok(
        previous?.status !== 'running',
        'Release an owned QA lease through its existing safeguarded recovery first',
      );
      const feedback = await live(batch),
        identity = finalQaIdentity(batch, feedbackFingerprint(feedback));
      const accounting = finalQaAccounting(batch, previous, identity),
        limit = finalQaLimit(batch, identity);
      const digest = finalQaHistoryDigest(batch);
      if (action === 'extend-final-qa') {
        assert.ok(!accounting.ambiguous, 'Recover ambiguous QA history first');
        assert.ok(accounting.spent >= limit, 'Final QA allowance is not exhausted');
        assert.ok(limit < 32, 'Explicit storage policy required beyond 32 final-QA sessions');
        const budget = {
          kind: 'final-qa',
          identity,
          previousLimit: limit,
          limit: limit + 1,
          historyDigest: digest,
        };
        recoveryAuthorization = await authorization(state, batch, login, action, authorizationRef, {
          budget,
        });
        batch.finalQaAllowances ??= [];
        batch.finalQaAllowances.push({
          identity,
          previousLimit: limit,
          limit: limit + 1,
          historyDigest: digest,
          actor: login,
          at: now().toISOString(),
          reason,
          nonce: nonce(),
          authorizationRef,
          budget,
          authorization: recoveryAuthorization,
        });
        batch.phase = 'waiting-review';
      } else if (accounting.ambiguous) {
        const budget = {
          kind: 'final-qa-history',
          identity,
          limit,
          historyDigest: digest,
          ambiguousDigests: accounting.ambiguousDigests,
          knownKeys: accounting.keys,
        };
        recoveryAuthorization = await authorization(state, batch, login, action, authorizationRef, {
          budget,
        });
        batch.finalQaHistoryResolutions ??= [];
        batch.finalQaHistoryResolutions.push({
          identity,
          sealedLimit: limit,
          historyDigest: digest,
          ambiguousDigests: accounting.ambiguousDigests,
          knownKeys: accounting.keys,
          actor: login,
          at: now().toISOString(),
          reason,
          nonce: nonce(),
          authorizationRef,
          budget,
          authorization: recoveryAuthorization,
        });
        batch.phase = 'blocked';
        nextFailureCode = 'final-qa-infrastructure-exhausted';
      } else {
        reuseFinalQa =
          previous?.status === 'verified' &&
          previous.subjectSha === identity.subjectSha &&
          previous.claudeRound === identity.claudeRound &&
          previous.feedbackFingerprint === identity.feedbackFingerprint &&
          typeof previous.nonce === 'string' &&
          previous.nonce.trim() &&
          Number.isFinite(Date.parse(previous.reservedAt));
        assert.ok(
          reuseFinalQa || accounting.spent < limit,
          'Final QA allowance exhausted; extend exactly one unit',
        );
        recoveryAuthorization = await authorization(state, batch, login, action, authorizationRef, {
          budget: {
            kind: 'final-qa-recovery',
            identity,
            historyDigest: digest,
            ...(reuseFinalQa ? { reuseVerified: true } : {}),
          },
        });
        batch.phase = 'waiting-review';
      }
      if (!reuseFinalQa) {
        if (previous) {
          batch.qaHistory ??= [];
          batch.qaHistory.push(previous);
        }
        delete batch.codexFinalReview;
      }
    } else if (action === 'release-qa-reservation') {
      previous = clone(batch.codexFinalReview);
      assert.ok(['running', 'failed'].includes(previous?.status));
      assert.equal(token, previous.nonce ?? historyDigest(previous), 'Recovery QA changed');
      recoveryAuthorization = await releaseLease(
        state,
        batch,
        login,
        'qa',
        previous,
        token,
        forceLive,
        authorizationRef,
      );
      batch.qaHistory ??= [];
      batch.qaHistory.push(previous);
      delete batch.codexFinalReview;
      batch.phase = 'waiting-review';
    } else if (action === 'release-merge-reservation') {
      previous = clone(batch.release);
      assert.equal(previous?.status, 'merging');
      assert.equal(token, previous.nonce ?? historyDigest(previous), 'Recovery merge changed');
      assert.ok(!previous.recoveryReleasedAt, 'Merge reservation recovery already consumed');
      recoveryAuthorization = await releaseLease(
        state,
        batch,
        login,
        'merge',
        previous,
        token,
        forceLive,
        authorizationRef,
      );
      const feedback = await github.reviewFeedback(batch.pr.number);
      assert.equal(feedback.head, batch.sha, 'Recovery head changed');
      if (feedback.state === 'MERGED') {
        assert.match(feedback.mergeCommitSha ?? '', /^[a-f0-9]{40}$/);
        batch.release = { ...previous, status: 'merged', mergeSha: feedback.mergeCommitSha };
      } else {
        assert.equal(feedback.state, 'OPEN', 'Merge outcome cannot be reconciled');
        // A tombstone remains eligible for exact-head receipt reconciliation. Remote
        // merge can commit after this CAS, so deleting the reservation is unsafe.
        batch.release = {
          ...previous,
          recoveryReleasedAt: now().toISOString(),
          outcome: 'uncertain',
        };
        batch.phase = 'blocked';
        batch.reason = 'Merge outcome pending exact-head receipt reconciliation';
      }
      recoveryHead = await recoveryLive(batch, batch.sha);
      batch.mergeHistory ??= [];
      batch.mergeHistory.push(previous);
    } else if (action === 'resume') {
      assert.equal(batch.phase, 'blocked');
      assert.equal(
        token,
        historyDigest({ phase: batch.phase, failureCode: batch.failureCode ?? null }),
      );
      if (subjectAdapter?.recoveryVerify) {
        const projectionFailure =
          ['github-write-uncertain', 'github-write-rejected'].includes(batch.failureCode) &&
          batch.failureOperation === 'projection';
        const rejectedMerge =
          batch.failureCode === 'github-merge-rejected' &&
          !batch.release &&
          batch.mergeHistory?.at(-1)?.status === 'merging';
        assert.ok(
          ['github-read-transient', 'github-transient-exhausted'].includes(batch.failureCode) ||
            projectionFailure ||
            rejectedMerge,
          'Standalone resume requires an explicit retryable failure',
        );
        await subjectAdapter.recoveryVerify(batch);
      } else {
        const negativeReview =
          batch.externalReview?.status === 'published' &&
          batch.externalReview.subjectSha === batch.sha &&
          ['changes-requested', 'blocked'].includes(batch.reviews.at(-1)?.status) &&
          batch.reviews.at(-1)?.subjectSha === batch.sha;
        const progress = batch.controllerProgress;
        const knownCorrection =
          knownFailedCorrection(batch) && progress.failureCode === batch.failureCode;
        const allowance =
          batch.budgetExtensions?.length &&
          !activeImplementation(batch) &&
          !['running', 'interrupted'].includes(progress?.status) &&
          ((negativeReview && (!progress || progress.status === 'completed')) || knownCorrection) &&
          spentAttempts(batch, 'implementation') < attemptLimit(batch, 'implementation') &&
          batch.reviews.length < attemptLimit(batch, 'reviews');
        const archived = batch.mergeHistory?.at(-1);
        let rejectedMerge = false;
        if (
          batch.failureCode === 'github-merge-rejected' &&
          !batch.release &&
          archived?.status === 'merging' &&
          archived.reviewedSha === batch.sha &&
          archived.prNumber === batch.pr.number &&
          archived.reviewProof
        ) {
          const expected = captureReleaseReviewProof(
            { ...batch, codexFinalReview: archived.reviewProof.finalCodexReview },
            { repository: REPO },
          );
          rejectedMerge = JSON.stringify(expected) === JSON.stringify(archived.reviewProof);
        }
        assert.ok(
          ['github-read-transient', 'github-transient-exhausted'].includes(batch.failureCode) ||
            allowance ||
            rejectedMerge,
          'Resume requires transient recovery or unused audited correction and review allowances',
        );
      }
      await live(batch);
      previous = {
        phase: batch.phase,
        reason: batch.reason ?? null,
        failureCode: batch.failureCode ?? null,
      };
      batch.phase = 'waiting-review';
    } else assert.fail('Unknown recovery action');
    batch.recoveryHistory ??= [];
    batch.recoveryHistory.push({
      action,
      actor: login,
      at: now().toISOString(),
      reason,
      subjectSha: batch.sha,
      observedHead: recoveryHead,
      token,
      previous,
      ...(recoveryAuthorization
        ? {
            authorization: recoveryAuthorization,
            forceLive: recoveryAuthorization.binding.reservation?.forceLive ?? false,
          }
        : {}),
      consumedReviews: batch.reviews.length,
      consumedImplementation: spentAttempts(batch, 'implementation'),
    });
    delete batch.approvedSha;
    delete batch.failureCode;
    delete batch.failureOperation;
    if (nextFailureCode) batch.failureCode = nextFailureCode;
    if (action === 'resume') delete batch.lastTransientFailure;
    if (batch.release?.recoveryReleasedAt && batch.release.status === 'merging')
      batch.failureCode = 'github-write-uncertain';
    await save(state, batch, login, {
      recoveryHead,
      guard: async () => {
        assert.ok(await github.authorizedMaintainer(login), 'Maintainer authorization revoked');
      },
    });
    return clone(batch);
  }
  return { request, claim, submit, failOwnedClaim, reconcile, reconcilePR, load, actor, recover, extendBudget };
}
