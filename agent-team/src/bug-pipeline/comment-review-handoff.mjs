import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { validateState, feedbackFingerprint, sha256, MAX_CYCLES } from './contracts.mjs';
import { validateReview } from '../../../scripts/quality-gate/claude-bug-review.mjs';

export const COMMENT_REVIEW_MARKER = '<!-- clinicos-review-handoff:v1 -->';
const REPO = 'l2v-hub/ClinicOS';
const clone = (value) => structuredClone(value);
const channel = (batch) => batch.externalReview?.channel === 'github-comments';

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
}) {
  const store = github.createStateStore();
  async function api(endpoint) {
    const result = await run({
      command: 'gh',
      args: ['api', endpoint],
      cwd,
      timeoutMs: 30000,
      maxOutputBytes: 16 * 1024 * 1024,
      envMode: 'controller',
    });
    assert.equal(result.ok, true, 'GitHub handoff read failed');
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
  async function load(pr) {
    const state = subjectAdapter
      ? subjectAdapter.validate(await store.load())
      : validateState(await store.load(), REPO);
    const batch = (subjectAdapter ? subjectAdapter.subjects(state) : state.batches).find(
      (item) => item.pr?.number === pr,
    );
    assert.ok(batch && batch.sha, 'PR has no controller-owned implementation/evidence packet');
    return { state, batch };
  }
  async function save(state, batch, login, { guard } = {}) {
    if (subjectAdapter) subjectAdapter.validate(state);
    const expected = JSON.stringify(batch);
    state.updatedAt = now().toISOString();
    await store.save(state, {
      rebaseIndependentSubjects: async (merged) => {
        validateState(merged, REPO);
        if (merged.standaloneReviews) {
          const { validateStandaloneState } = await import('./standalone-review.mjs');
          validateStandaloneState(merged);
        }
      },
      guard: async () => {
        const started = performance.now();
        if (guard) await guard();
        await live(batch);
        if (
          subjectAdapter?.reservationGuard &&
          ['comment-requested', 'comment-running'].includes(batch.externalReview?.status)
        )
          await subjectAdapter.reservationGuard(batch);
        assert.equal(JSON.stringify(batch), expected, 'Handoff subject mutated');
        assert.ok(await github.authorized(login), 'Handoff actor lost authorization');
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
  async function message(batch, payload) {
    const body = `${COMMENT_REVIEW_MARKER}\n${JSON.stringify(payload, null, 2)}`;
    assert.ok(body.length <= 60000, 'Review comment exceeds GitHub bound');
    await live(batch);
    const issue = await github.viewIssue(batch.pr.number);
    if (
      !issue.comments.some(
        (item) => (item.user?.login ?? item.author) === payload.actor && item.body === body,
      )
    ) {
      const current = (await load(batch.pr.number)).batch;
      assert.deepEqual(current, batch, 'Durable handoff changed before comment');
      await live(batch);
      assert.ok(await github.authorized(payload.actor), 'Comment actor lost authorization');
      await github.commentPR(batch.pr.number, body);
    }
  }
  async function request(pr, { recoverFailed = false } = {}) {
    const login = await actor(),
      { state, batch } = await load(pr);
    await live(batch);
    assert.ok(
      !batch.reviews.some((item) => item.status === 'running') &&
        !batch.implementation.some((item) => item.status === 'running'),
      'Another worker owns this batch',
    );
    assert.ok(batch.reviews.length < MAX_CYCLES, 'Four review attempts exhausted');
    assert.equal(
      batch.implementation.at(-1)?.status,
      'passed',
      'Implementation/evidence not verified',
    );
    assert.ok((await github.requiredChecks(pr)).ok, 'Required checks are not passing');
    if (channel(batch) && batch.externalReview.status === 'comment-requested') return clone(batch);
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
    batch.reviewHandoffHistory ??= [];
    batch.reviewHandoffHistory.push({
      at: now().toISOString(),
      actor: login,
      previous: clone(batch.externalReview ?? null),
      recovery: recoverFailed,
      spentReviews: batch.reviews.length,
    });
    batch.externalReview = {
      channel: 'github-comments',
      status: 'comment-requested',
      subjectSha: batch.sha,
      requestId: nonce(),
      requestedAt: now().toISOString(),
    };
    batch.reviewChannel = 'github-comments';
    batch.phase = 'waiting-review';
    delete batch.reason;
    await save(state, batch, login);
    await message(batch, {
      kind: 'request',
      actor: login,
      pr,
      subject_sha: batch.sha,
      request_id: batch.externalReview.requestId,
      next_round: batch.reviews.length + 1,
      action:
        'Claude: claim through the trusted handoff CLI before reviewing; publish exact-SHA structured findings, then hand control to Codex.',
    });
    return clone(batch);
  }
  async function claim(pr) {
    const login = await actor(),
      { state, batch } = await load(pr);
    assert.ok(
      channel(batch) && batch.externalReview.status === 'comment-requested',
      'Review is not available',
    );
    const feedback = await live(batch);
    assert.ok(
      batch.reviews.length < MAX_CYCLES && (await github.requiredChecks(pr)).ok,
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
    await save(state, batch, login); // CAS reservation BEFORE the local Claude starts its review.
    return clone(batch);
  }
  async function submit(pr, review) {
    const login = await actor(),
      { batch } = await load(pr);
    assert.ok(
      channel(batch) &&
        batch.externalReview.status === 'comment-running' &&
        batch.externalReview.owner === login,
      'No owned review reservation',
    );
    await live(batch);
    validateReview(review, batch.sha, await tracked(batch));
    await message(batch, {
      kind: 'report',
      actor: login,
      pr,
      subject_sha: batch.sha,
      request_id: batch.externalReview.requestId,
      claim_id: batch.externalReview.claimId,
      round: batch.reviews.length,
      report: review,
    });
    return { status: 'submitted', pr, sha: batch.sha, round: batch.reviews.length };
  }
  async function reconcile(batch, persist) {
    if (!channel(batch)) return false;
    if (batch.externalReview.status === 'comment-requested') return false;
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
    await github.publishExternalReview(batch.pr.number, batch.sha, report, batch.reviews.length);
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
    await reconcile(batch, (options) => save(state, batch, login, options));
    return clone(batch);
  }
  return { request, claim, submit, reconcile, reconcilePR, load, actor };
}
