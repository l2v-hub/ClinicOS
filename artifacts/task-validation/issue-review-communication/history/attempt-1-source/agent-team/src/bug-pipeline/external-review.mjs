import { feedbackFingerprint, MAX_CYCLES, sha256 } from './contracts.mjs';
import { createIssueReviewCommunication } from './issue-review-communication.mjs';

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

export async function externalReviewStep({
  repo,
  batch,
  gh,
  workspace,
  save,
  report,
  block,
  communication = createIssueReviewCommunication({ github: gh, repo, readReport: externalReport }),
}) {
  const observedAt = new Date().toISOString();
  // Informational publication is recoverable by the sibling. It must not consume
  // an implementation attempt that was reserved for a real code correction.
  const notify = () => communication.publishState(batch).catch(() => {});
  const blocked = async (reason) => {
    await block(batch, reason);
    await notify();
  };
  for (const number of batch.issues) {
    const issue = await gh.viewIssue(number);
    if (String(issue.state).toLowerCase() !== 'open')
      return block(batch, 'Source issue was closed or cancelled during external review');
  }
  if (
    ['implementing', 'validating', 'simplifying', 'publishing'].includes(batch.phase) ||
    batch.implementation.some((attempt) => attempt.status === 'running')
  )
    return blocked('Interrupted Codex correction requires explicit recovery');
  // The real PR mirror also reaches an older installed Max worker, without changing
  // the PR feedback fingerprint format or treating issue text as approval.
  await communication.mirrorFeedback(batch);
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
    const verdict = externalReport(batch);
    if (verdict.verdict === 'blocked')
      return blocked('External Claude reviewer blocked the change');
    const changed = handoff.feedbackChanged || fingerprint !== handoff.feedbackFingerprint;
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
    if (batch.reviews.length >= MAX_CYCLES)
      return blocked('Four external Claude review attempts exhausted');
    if (batch.implementation.length >= MAX_CYCLES)
      return blocked('Four implementation/validation attempts exhausted');
    await workspace.prepare(batch);
    const attempt = { round: batch.implementation.length + 1, status: 'running' };
    batch.implementation.push(attempt);
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
            feedback: { claude: verdict, github: feedback },
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
    status: 'requested',
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
    `PR ${batch.pr.url}: **Ready for review** su \`${batch.sha}\`. In attesa del cron Claude Code; review utilizzate ${batch.reviews.length}/4. Commenti e richieste di modifica torneranno a Codex tramite GitHub.`,
  );
}
