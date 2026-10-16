import {
  MAX_CYCLES,
  planSchema,
  validatePlan,
  validateState,
  feedbackFingerprint,
} from './contracts.mjs';
import { publishDeploymentCompletion } from './release.mjs';
import { externalReviewStep } from './external-review.mjs';

// The controller owns every transition and reserves attempts remotely BEFORE starting models.
// Models never own GitHub mutation, budgets, release decisions or deployment credentials.
export async function runPipeline({
  repo,
  event,
  gh,
  models,
  workspace,
  store,
  reviewMode = 'internal',
}) {
  if (!['internal', 'external'].includes(reviewMode)) throw new Error('Unknown review mode');
  await gh.intake(event);
  const state = validateState(
    (await store.load()) ?? { schemaVersion: 1, repository: repo, batches: [] },
    repo,
  );
  let persistenceFailed = false;
  const save = async () => {
    try {
      state.updatedAt = new Date().toISOString();
      return await store.save(state);
    } catch (error) {
      persistenceFailed = true;
      throw error;
    }
  };
  const report = async (batch, text) => {
    for (const n of batch.issues)
      await gh.commentIssue(n, `<!-- codex-bug-pipeline:status -->\n${text}`);
  };
  const block = async (batch, reason) => {
    batch.phase = 'blocked';
    batch.reason = reason;
    await save();
    for (const number of batch.issues) await gh.setIssueStatus(number, 'Bloccato');
    await report(
      batch,
      `**BLOCKED** — ${reason}. Budget sviluppo ${batch.implementation.length}/4, review ${batch.reviews.length}/4. Il budget non viene azzerato da nuovi comandi.`,
    );
  };
  const claimed = new Set(state.batches.flatMap((b) => b.issues));
  // Retry label/closure publication from durable facts before taking new work.
  for (const batch of state.batches) {
    if (batch.release?.status === 'deployed') {
      await publishDeploymentCompletion({ batch, github: gh });
      continue;
    }
    const status = batch.phase === 'blocked' ? 'Bloccato' : 'In progress';
    for (const number of batch.issues) await gh.setIssueStatus(number, status);
  }
  const queue = await gh.discoverQueue();
  let selected = [];
  for (const item of queue) {
    const issue = await gh.viewIssue(typeof item === 'number' ? item : item.number);
    if (claimed.has(issue.number)) continue;
    const labels = (issue.labels ?? []).map((l) => (typeof l === 'string' ? l : l.name));
    if (
      labels.some((l) =>
        [
          'agent-working',
          'ready-for-dev',
          'assigned-to-claude',
          'ready-for-qa',
          'qa-passed',
        ].includes(l),
      )
    )
      continue;
    if (issue.state && issue.state.toLowerCase() !== 'open') continue;
    selected.push(issue);
  }
  if (state.pendingTriage) {
    if (state.pendingTriage.status !== 'claiming')
      throw new Error('Interrupted triage requires operator recovery; no automatic model restart');
    const pending = new Set(state.pendingTriage.issues);
    selected = selected.filter((issue) => pending.has(issue.number));
    if (selected.length !== pending.size)
      throw new Error('Pending claim is no longer authorized or open');
  }
  if (selected.length) {
    if (!state.pendingTriage) {
      state.pendingTriage = { issues: selected.map((i) => i.number), status: 'claiming' };
      await save();
    }
    for (const issue of selected) await gh.setIssueStatus(issue.number, 'In progress');
    state.pendingTriage.status = 'running';
    await save();
    const plan = validatePlan(
      await models.plan({ cwd: workspace.root, issues: selected, scopeSchema: planSchema }),
      selected,
    );
    for (const group of plan.groups) {
      const id = `bug-batch-${Math.min(...group.issues)}`;
      state.batches.push({
        id,
        branch: `codex/${id}`,
        issues: group.issues,
        plan: group,
        phase: 'planned',
        implementation: [],
        reviews: [],
        sha: null,
        pr: null,
      });
    }
    for (const rejected of plan.blocked)
      state.batches.push({
        id: `bug-batch-${rejected.issue}`,
        branch: `codex/bug-batch-${rejected.issue}`,
        issues: [rejected.issue],
        phase: 'blocked',
        implementation: [],
        reviews: [],
        reason: 'Essential information missing; see triage.',
      });
    delete state.pendingTriage;
    await save();
    for (const rejected of plan.blocked) await gh.setIssueStatus(rejected.issue, 'Bloccato');
    for (const rejected of plan.blocked)
      await gh.commentIssue(
        rejected.issue,
        '<!-- codex-bug-pipeline:status -->\n**BLOCKED** — il triage richiede informazioni essenziali. Nessuna implementazione avviata.',
      );
  }
  for (const batch of state.batches) {
    if (['merged', 'deployed'].includes(batch.release?.status)) continue;
    if (batch.phase === 'blocked') continue;
    if (reviewMode === 'external' && batch.externalReview?.status === 'running') continue;
    if (reviewMode === 'external' && batch.pr) {
      try {
        await externalReviewStep({ repo, batch, gh, workspace, save, report, block });
      } catch {
        if (persistenceFailed) throw new Error('External review reconciliation persistence failed');
        await block(
          batch,
          'External review consistency or correction failed; inspect the existing batch',
        );
      }
      continue;
    }
    if (
      batch.implementation.some((a) => a.status === 'running') ||
      batch.reviews.some((a) => a.status === 'running') ||
      ['implementing', 'simplifying', 'validating', 'publishing', 'reviewing'].includes(batch.phase)
    ) {
      await block(
        batch,
        'Previous execution interrupted; operator recovery required on the existing batch',
      );
      continue;
    }
    let feedback = null;
    if (batch.pr) {
      feedback = await gh.reviewFeedback(batch.pr.number);
      if (
        String(feedback.state).toUpperCase() !== 'OPEN' ||
        feedback.headRef !== batch.branch ||
        feedback.baseRef !== 'main' ||
        feedback.headIsFork ||
        feedback.headRepo !== repo ||
        feedback.head !== batch.sha
      ) {
        await block(batch, 'PR identity or head changed outside the controller');
        continue;
      }
      const fingerprint = feedbackFingerprint(feedback);
      if (
        ['ready', 'waiting-checks'].includes(batch.phase) &&
        fingerprint === batch.feedbackFingerprint &&
        batch.approvedSha === batch.sha
      ) {
        const checks = await gh.requiredChecks(batch.pr.number);
        batch.phase =
          checks.ok && !feedback.unresolved && !feedback.changesRequested
            ? 'ready'
            : 'waiting-checks';
        await save();
        continue;
      }
      if (batch.reviews.length >= MAX_CYCLES) {
        await block(batch, 'Four-review limit reached; new comments cannot restart the budget');
        continue;
      }
    }
    try {
      // Recheck every issue before any model/worktree mutation, after grouping and on restart.
      for (const n of batch.issues) {
        const live = await gh.viewIssue(n);
        if (live.state && live.state.toLowerCase() !== 'open')
          throw new Error('source issue is no longer open');
      }
      await workspace.prepare(batch);
      await report(
        batch,
        `Codex ha raggruppato ${batch.issues.map((n) => `#${n}`).join(', ')}. Worktree e piano: \`${batch.branch}\`. Esecutore configurato separatamente; Claude interviene nella review finale.`,
      );
      if (!batch.sha) {
        let passed = false;
        while (batch.implementation.length < MAX_CYCLES) {
          const attempt = { round: batch.implementation.length + 1, status: 'running' };
          batch.implementation.push(attempt);
          batch.phase = 'implementing';
          await save();
          try {
            const outcome = await workspace.execute(batch, {
              phase: 'implementation',
              round: attempt.round,
              feedback: batch.lastFailure ?? null,
            });
            if (outcome.status !== 'implemented') throw new Error('executor blocked');
            batch.phase = 'validating';
            await save();
            await workspace.verify(batch);
            batch.phase = 'simplifying';
            await save();
            if ((await workspace.simplify(batch)).status !== 'implemented')
              throw new Error('simplification blocked');
            batch.phase = 'validating';
            await save();
            await workspace.verify(batch);
            if ((await workspace.qa(batch)).status !== 'verified')
              throw new Error('independent Codex QA blocked');
            attempt.status = 'passed';
            passed = true;
            break;
          } catch (error) {
            if (persistenceFailed) throw error;
            attempt.status = 'failed';
            batch.lastFailure =
              'Implementation or required verification failed; inspect current local test-results.';
            batch.phase = 'planned';
            await save();
          }
        }
        if (!passed) {
          await block(batch, 'Four implementation attempts exhausted');
          continue;
        }
        batch.phase = 'publishing';
        await save();
        batch.sha = await workspace.checkpoint(batch);
        await workspace.publish(batch);
        batch.pr = await gh.createDraft({
          branch: batch.branch,
          title: batch.plan.title,
          body: workspace.prBody(batch),
        });
        batch.phase = 'waiting-checks';
        await save();
        await report(batch, await workspace.issueEvidence(batch));
      }
      if (reviewMode === 'external') {
        await externalReviewStep({ repo, batch, gh, workspace, save, report, block });
        continue;
      }
      // New PR feedback is handled once, in a new executor session, before the next review.
      if (feedback && feedbackFingerprint(feedback) !== batch.feedbackFingerprint) {
        batch.phase = 'implementing';
        await save();
        if (
          (
            await workspace.execute(batch, {
              phase: 'pr-feedback',
              round: batch.reviews.length + 1,
              feedback,
            })
          ).status !== 'implemented'
        )
          throw new Error('PR feedback correction blocked');
        batch.phase = 'validating';
        await save();
        await workspace.verify(batch);
        if ((await workspace.simplify(batch)).status !== 'implemented')
          throw new Error('simplification blocked');
        batch.phase = 'validating';
        await save();
        await workspace.verify(batch);
        if ((await workspace.qa(batch)).status !== 'verified')
          throw new Error('independent Codex QA blocked');
        batch.sha = await workspace.checkpoint(batch);
        await workspace.publish(batch);
        await report(batch, await workspace.issueEvidence(batch));
      }
      while (batch.reviews.length < MAX_CYCLES) {
        const current = await gh.reviewFeedback(batch.pr.number);
        if (current.head !== batch.sha) throw new Error('head changed before review');
        const attempt = {
          round: batch.reviews.length + 1,
          status: 'running',
          subjectSha: batch.sha,
        };
        batch.reviews.push(attempt);
        batch.phase = 'reviewing';
        await save();
        const review = await workspace.review(batch);
        if (review.subject_sha !== batch.sha) throw new Error('stale Claude review');
        attempt.status = review.verdict;
        if (!['approved', 'changes-requested', 'blocked'].includes(attempt.status))
          throw new Error('invalid Claude verdict');
        batch.feedbackFingerprint = feedbackFingerprint(current);
        batch.phase = 'waiting-checks';
        await save();
        await gh.commentPR(batch.pr.number, workspace.reviewBody(batch, review));
        const after = await gh.reviewFeedback(batch.pr.number);
        if (after.head !== batch.sha) throw new Error('head changed during review');
        if (
          review.verdict === 'approved' &&
          feedbackFingerprint(after) === batch.feedbackFingerprint
        ) {
          batch.approvedSha = batch.sha;
          const checks = await gh.requiredChecks(batch.pr.number);
          const ready = checks.ok && !after.unresolved && !after.changesRequested;
          batch.phase = ready ? 'ready' : 'waiting-checks';
          await save();
          await report(
            batch,
            `PR ${batch.pr.url}: Claude approva \`${batch.sha}\` dopo ${batch.reviews.length}/4 review. ${ready ? '**READY FOR CODEX QA**: evidenze e controlli richiesti superati.' : '**WAITING CHECKS**: merge/deploy bloccati fino ai controlli richiesti e alla risoluzione delle review GitHub.'}`,
          );
          break;
        }
        if (review.verdict === 'blocked' || attempt.round === MAX_CYCLES) {
          await block(batch, 'Claude review remains blocked or four-review limit reached');
          break;
        }
        batch.phase = 'implementing';
        await save();
        if (
          (
            await workspace.execute(batch, {
              phase: 'review-correction',
              round: attempt.round,
              feedback: { claude: review, github: after },
            })
          ).status !== 'implemented'
        )
          throw new Error('review correction blocked');
        batch.phase = 'validating';
        await save();
        await workspace.verify(batch);
        if ((await workspace.simplify(batch)).status !== 'implemented')
          throw new Error('simplification blocked');
        batch.phase = 'validating';
        await save();
        await workspace.verify(batch);
        if ((await workspace.qa(batch)).status !== 'verified')
          throw new Error('independent Codex QA blocked');
        batch.sha = await workspace.checkpoint(batch);
        await workspace.publish(batch);
        batch.approvedSha = null;
        await report(batch, await workspace.issueEvidence(batch));
        batch.phase = 'waiting-checks';
        await save();
      }
    } catch (error) {
      if (persistenceFailed) throw error;
      for (const a of [...batch.implementation, ...batch.reviews])
        if (a.status === 'running') a.status = 'failed';
      await block(
        batch,
        'Execution, evidence, authentication or remote consistency check failed; inspect sanitized controller diagnostics',
      );
    }
  }
  return state;
}
