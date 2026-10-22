import {
  attemptLimit,
  activeImplementation,
  reserveImplementation,
  spentAttempts,
} from './attempt-budget.mjs';
import { feedbackFingerprint, sha256 } from './contracts.mjs';
import { createIssueReviewCommunication } from './issue-review-communication.mjs';
import { createCommentReviewHandoff } from './comment-review-handoff.mjs';
import { createRunner } from './process.mjs';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

export function externalReport(batch) {
  const attempt = batch.reviews.at(-1);
  const ledger = batch.reviewLedger?.rounds?.at(-1);
  const content = batch.reviewReports?.[`claude-review-${attempt?.round}.json`];
  if (
    !attempt ||
    !ledger ||
    attempt.round !== batch.reviews.length ||
    ledger.round !== attempt.round ||
    ledger.subject_sha !== batch.sha ||
    attempt.subjectSha !== batch.sha ||
    ledger.verdict !== attempt.status ||
    typeof content !== 'string' ||
    sha256(content) !== ledger.review_sha256
  )
    throw new Error('External review proof is absent or inconsistent');
  const report = JSON.parse(content);
  if (
    report.subject_sha !== batch.sha ||
    report.verdict !== attempt.status ||
    !report.summary?.trim() ||
    !Array.isArray(report.findings) ||
    !['approved', 'changes-requested', 'blocked'].includes(report.verdict) ||
    (report.verdict === 'approved' && report.findings.length) ||
    (report.verdict === 'changes-requested' && !report.findings.length)
  )
    throw new Error('Invalid external review report');
  return report;
}

async function runExternalReviewStep({
  repo,
  batch,
  gh,
  workspace,
  save,
  report,
  block,
  communication = createIssueReviewCommunication({
    github: gh,
    repo,
    readReport: externalReport,
  }),
}) {
  const observedAt = new Date().toISOString();
  // Informational publication is recoverable by the sibling. It must not consume
  // an implementation attempt that was reserved for a real code correction.
  const notify = () =>
    communication.publishState(batch, { automatic: true }).catch((error) => {
      if (error?.code === 'review-operator-owned') throw error;
    });
  const blocked = async (reason) => {
    await block(batch, reason);
    await notify();
  };
  if (batch.externalReview?.channel === 'github-comments') {
    const receiver = createCommentReviewHandoff({
      github: gh,
      cwd: process.cwd(),
      run: createRunner({
        runtimeRoot: path.join(os.tmpdir(), 'clinicos-comment-review-controller'),
      }),
    });
    if (!(await receiver.reconcile(batch, save))) return notify();
  }
  for (const number of batch.issues) {
    const issue = await gh.viewIssue(number);
    if (String(issue.state).toLowerCase() !== 'open')
      return block(batch, 'Source issue was closed or cancelled during external review');
  }
  if (
    ['implementing', 'validating', 'simplifying', 'publishing'].includes(batch.phase) ||
    activeImplementation(batch)
  )
    return blocked('Interrupted Codex correction requires explicit recovery');
  // The real PR mirror also reaches an older installed Max worker, without changing
  // the PR feedback fingerprint format or treating issue text as approval.
  await communication.mirrorFeedback(batch, { automatic: true });
  const feedback = await gh.reviewFeedback(batch.pr.number);
  if (
    feedback.state !== 'OPEN' ||
    feedback.head !== batch.sha ||
    feedback.headRef !== batch.branch ||
    feedback.headRepo !== repo ||
    feedback.headIsFork ||
    feedback.baseRef !== 'main'
  )
    return block(batch, 'External review PR identity or head changed');
  const fingerprint = feedbackFingerprint(feedback);
  const handoff = batch.externalReview;
  if (handoff?.status === 'finished') return notify(); // Publication is retried by the external harness.
  if (handoff?.status === 'published') {
    // A running final session remains owned even if new feedback arrives.
    if (batch.codexFinalReview?.status === 'running')
      return blocked('Interrupted independent Codex review requires recovery');
    if (handoff.subjectSha !== batch.sha) return blocked('External review handoff SHA changed');
    const verdict = externalReport(batch);
    if (verdict.verdict === 'blocked')
      return blocked('External Claude reviewer blocked the change');
    let changed = handoff.feedbackChanged || fingerprint !== handoff.feedbackFingerprint;
    if (verdict.verdict === 'approved' && !changed) {
      if (
        feedback.unresolved ||
        feedback.changesRequested ||
        !(await gh.requiredChecks(batch.pr.number)).ok
      ) {
        batch.phase = 'waiting-checks';
        batch.approvedSha = null;
        await save();
        return notify();
      }
      const prior = batch.codexFinalReview;
      if (
        !prior ||
        prior.subjectSha !== batch.sha ||
        prior.claudeRound !== batch.reviews.length ||
        prior.feedbackFingerprint !== fingerprint ||
        prior.status === 'waiting-checks'
      ) {
        if (prior) {
          batch.codexFinalReviewHistory ??= [];
          batch.codexFinalReviewHistory.push(prior);
        }
        batch.codexFinalReview = {
          subjectSha: batch.sha,
          claudeRound: batch.reviews.length,
          feedbackFingerprint: fingerprint,
          status: 'running',
          reservedAt: new Date().toISOString(),
          nonce: randomUUID(),
        };
        batch.approvedSha = null;
        await save();
        await workspace.prepare(batch);
        const beforeQa = await gh.reviewFeedback(batch.pr.number);
        if (
          beforeQa.head !== batch.sha ||
          beforeQa.state !== 'OPEN' ||
          beforeQa.headRef !== batch.branch ||
          beforeQa.headRepo !== repo ||
          beforeQa.headIsFork ||
          beforeQa.baseRef !== 'main' ||
          feedbackFingerprint(beforeQa) !== fingerprint ||
          beforeQa.unresolved ||
          beforeQa.changesRequested
        ) {
          batch.codexFinalReview.status = 'blocked';
          await save();
          return blocked('PR identity or feedback changed before independent Codex review');
        }
        if (!(await gh.requiredChecks(batch.pr.number)).ok) {
          batch.codexFinalReview.status = 'waiting-checks';
          batch.phase = 'waiting-checks';
          await save();
          return notify();
        }
        try {
          const qa = await workspace.finalQa(batch);
          batch.codexFinalReview.status =
            qa.status === 'verified' ? 'verified' : 'changes-requested';
          batch.codexFinalReview.summary = qa.summary;
        } catch (error) {
          batch.codexFinalReview.status = 'failed';
          await save();
          throw error;
        }
        await save();
      }
      changed = batch.codexFinalReview.status !== 'verified';
      const current = await gh.reviewFeedback(batch.pr.number);
      if (
        current.state !== 'OPEN' ||
        current.head !== batch.sha ||
        current.headRef !== batch.branch ||
        current.headRepo !== repo ||
        current.headIsFork ||
        current.baseRef !== 'main'
      )
        return blocked('PR identity changed during independent Codex review');
      if (
        feedbackFingerprint(current) !== fingerprint ||
        current.unresolved ||
        current.changesRequested
      )
        return blocked('PR feedback changed during independent Codex review');
      if (!(await gh.requiredChecks(batch.pr.number)).ok) {
        batch.phase = 'waiting-checks';
        batch.approvedSha = null;
        await save();
        return notify();
      }
    }
    if (verdict.verdict === 'approved' && !changed) {
      batch.approvedSha = batch.sha;
      batch.feedbackFingerprint = fingerprint;
      const checks = await gh.requiredChecks(batch.pr.number);
      batch.phase =
        checks.ok && !feedback.unresolved && !feedback.changesRequested
          ? 'ready'
          : 'waiting-checks';
      await save();
      await notify();
      return;
    }
    if (batch.reviews.length >= attemptLimit(batch, 'reviews'))
      return blocked('Four external Claude review attempts exhausted');
    if (spentAttempts(batch, 'implementation') >= attemptLimit(batch, 'implementation'))
      return blocked('Four implementation/validation attempts exhausted');
    await workspace.prepare(batch);
    const attempt = reserveImplementation(batch);
    batch.phase = 'implementing';
    batch.approvedSha = null;
    batch.issueFeedbackSince ??= observedAt;
    await save();
    await notify();
    try {
      if (
        (
          await workspace.execute(batch, {
            phase: 'external-review-correction',
            round: attempt.round,
            feedback: {
              claude: verdict,
              github: feedback,
              ...(batch.codexFinalReview ? { codex: batch.codexFinalReview } : {}),
            },
          })
        ).status !== 'implemented'
      )
        throw new Error('Correction blocked');
      batch.phase = 'validating';
      await save();
      await workspace.verify(batch);
      batch.phase = 'simplifying';
      await save();
      if ((await workspace.simplify(batch)).status !== 'implemented')
        throw new Error('Simplification blocked');
      batch.phase = 'validating';
      await save();
      await workspace.verify(batch);
      if ((await workspace.qa(batch)).status !== 'verified')
        throw new Error('Independent QA blocked');
      batch.phase = 'publishing';
      await save();
      const previous = batch.sha;
      batch.sha = await workspace.checkpoint(batch);
      if (batch.sha === previous)
        throw new Error('Correction did not produce a new reviewed revision');
      await workspace.publish(batch);
      attempt.status = 'passed';
      batch.externalReview = null;
      batch.phase = 'waiting-checks';
      await save();
      await report(batch, await workspace.issueEvidence(batch));
    } catch (error) {
      attempt.status = 'failed';
      throw error;
    }
  } else if (handoff?.status === 'requested' && handoff.subjectSha === batch.sha) {
    // Human feedback arriving before Claude is included in its next snapshot, never treated as approval.
    return notify();
  }
  const checks = await gh.requiredChecks(batch.pr.number);
  if (!checks.ok) {
    batch.phase = 'waiting-checks';
    await save();
    await notify();
    return;
  }
  if (feedback.isDraft) await gh.draftReady(batch.pr.number);
  batch.externalReview = {
    status: batch.reviewChannel === 'github-comments' ? 'comment-requested' : 'requested',
    ...(batch.reviewChannel === 'github-comments'
      ? { channel: 'github-comments', requestId: randomUUID() }
      : {}),
    subjectSha: batch.sha,
    requestedAt: new Date().toISOString(),
    feedbackFingerprint: fingerprint,
  };
  batch.issueFeedbackSince ??= observedAt;
  batch.phase = 'waiting-review';
  await save();
  await notify();
  await report(
    batch,
    `PR ${batch.pr.url}: **Ready for review** su \`${batch.sha}\`. In attesa del cron Claude Code; review utilizzate ${batch.reviews.length}/${attemptLimit(batch, 'reviews')}. Commenti e richieste di modifica torneranno a Codex tramite GitHub.`,
  );
}

// Ownership loss is a skip, never permission to block, relabel or correct that subject.
export async function externalReviewStep(options) {
  try {
    return await runExternalReviewStep(options);
  } catch (error) {
    if (error?.code === 'review-operator-owned')
      return { status: 'skipped', reason: 'operator-owned' };
    throw error;
  }
}
