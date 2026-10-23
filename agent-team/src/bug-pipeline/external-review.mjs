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

// Recovery moves final-QA records between collections. Count the original intent,
// not its current pointer or the number of archived copies. Originals stay untouched.
function finalQaSpend(batch, prior, binding) {
  const infrastructure = (batch.codexFinalQaInfrastructure ??= { attempts: [] });
  if (
    !Array.isArray(infrastructure.attempts) ||
    (batch.qaHistory !== undefined && !Array.isArray(batch.qaHistory)) ||
    (batch.codexFinalReviewHistory !== undefined && !Array.isArray(batch.codexFinalReviewHistory))
  )
    return { infrastructure, ambiguous: true };
  const seen = new Set();
  let ambiguous = false;
  const spentStatus = (status) =>
    ['running', 'failed', 'verified', 'changes-requested'].includes(status);
  const differentIdentity = (entry) =>
    (typeof entry.subjectSha === 'string' &&
      /^[a-f0-9]{40}$/.test(entry.subjectSha) &&
      entry.subjectSha !== binding.subjectSha) ||
    (Number.isSafeInteger(entry.claudeRound) && entry.claudeRound !== binding.claudeRound) ||
    (typeof entry.feedbackFingerprint === 'string' &&
      entry.feedbackFingerprint.trim() &&
      entry.feedbackFingerprint !== binding.feedbackFingerprint);
  const include = (entry, origin, archived) => {
    if (['waiting-checks', 'blocked'].includes(entry?.status)) return;
    if (archived && !spentStatus(entry?.status)) return;
    if (entry && differentIdentity(entry)) return;
    if (
      !entry ||
      !spentStatus(entry.status) ||
      !Object.keys(binding).every((key) => entry[key] === binding[key]) ||
      typeof entry.nonce !== 'string' ||
      !entry.nonce.trim() ||
      typeof entry.reservedAt !== 'string' ||
      !Number.isFinite(Date.parse(entry.reservedAt))
    ) {
      ambiguous = true;
      return;
    }
    if (seen.has(entry.nonce)) return;
    seen.add(entry.nonce);
    if (archived)
      infrastructure.attempts.push({
        ...structuredClone(entry),
        legacy: true,
        importedFrom: origin,
      });
  };
  for (const entry of infrastructure.attempts) include(entry, 'infrastructure', false);
  for (const [origin, entries] of [
    ['current', prior ? [prior] : []],
    ['qaHistory', batch.qaHistory ?? []],
    ['codexFinalReviewHistory', batch.codexFinalReviewHistory ?? []],
  ])
    for (const entry of entries) include(entry, origin, true);
  return { infrastructure, spent: seen.size, ambiguous };
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
  if (batch.phase === 'blocked') return notify();
  if (batch.externalReview?.channel === 'github-comments') {
    const receiver = createCommentReviewHandoff({
      automatic: () => true,
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
        ['waiting-checks', 'failed', 'blocked'].includes(prior.status)
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
        // Count durably reserved inference sessions, not identity/check polling.
        // This allowance is independent of the implementation correction budget.
        const binding = {
          subjectSha: batch.sha,
          claudeRound: batch.reviews.length,
          feedbackFingerprint: fingerprint,
        };
        const { infrastructure, spent, ambiguous } = finalQaSpend(batch, prior, binding);
        if (ambiguous) {
          batch.codexFinalReview.status = 'blocked';
          batch.codexFinalReview.failureCode = 'final-qa-infrastructure-history-ambiguous';
          await save();
          return blocked(
            'Independent final QA inference history is ambiguous; explicit recovery required',
          );
        }
        if (spent >= 3) {
          batch.codexFinalReview.status = 'blocked';
          batch.codexFinalReview.failureCode = 'final-qa-infrastructure-exhausted';
          await save();
          return blocked(
            'Independent final QA infrastructure allowance exhausted; explicit recovery required',
          );
        }
        const inference = {
          nonce: batch.codexFinalReview.nonce,
          subjectSha: batch.sha,
          claudeRound: batch.reviews.length,
          feedbackFingerprint: fingerprint,
          reservedAt: new Date().toISOString(),
          status: 'running',
        };
        infrastructure.attempts.push(inference);
        await save();
        try {
          const qa = await workspace.finalQa(batch);
          if (
            !['verified', 'blocked', 'changes-requested'].includes(qa?.status) ||
            typeof qa.summary !== 'string' ||
            !qa.summary.trim()
          )
            throw new Error('Independent final QA returned no usable verdict');
          batch.codexFinalReview.status =
            qa.status === 'verified' ? 'verified' : 'changes-requested';
          batch.codexFinalReview.summary = qa.summary;
          inference.status = batch.codexFinalReview.status;
        } catch (error) {
          if (error?.code === 'review-operator-owned') throw error;
          inference.status = 'failed';
          batch.codexFinalReview.status = 'failed';
          await save();
          throw error;
        }
        await save();
      }
      if (!['verified', 'changes-requested'].includes(batch.codexFinalReview.status))
        return blocked('Independent final QA is unavailable; explicit recovery required');
      changed = batch.codexFinalReview.status === 'changes-requested';
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
      if (error?.code !== 'review-operator-owned') attempt.status = 'failed';
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

// Preserve the finite ownership-loss classification until the controller reloads
// canonical state. Returning a skip here would leave unsaved subject edits in its
// writer snapshot and leak them into the next independent subject's save.
export async function externalReviewStep(options) {
  return runExternalReviewStep(options);
}
