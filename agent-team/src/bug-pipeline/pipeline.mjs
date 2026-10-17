import {
  MAX_CYCLES,
  planSchema,
  validatePlan,
  validateState,
  feedbackFingerprint,
} from './contracts.mjs';
import { externalReviewStep } from './external-review.mjs';
import { validateStandaloneState, finalizeStandaloneSubject } from './standalone-review.mjs';
import { controllerFailureCode } from './github.mjs';

function eligibleIssue(issue) {
  const labels = (issue.labels ?? []).map((l) => (typeof l === 'string' ? l : l.name));
  return (
    !issue.pull_request &&
    (!issue.state || issue.state.toLowerCase() === 'open') &&
    labels.includes('bug') &&
    labels.includes('codex-run') &&
    !labels.some((label) =>
      [
        'agent-working',
        'ready-for-dev',
        'assigned-to-claude',
        'ready-for-qa',
        'qa-passed',
        'codex-blocked',
        'codex-in-flight',
        'codex-processing',
        'status-blocked',
      ].includes(label),
    )
  );
}

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
  now = Date.now,
  triageWindowMs = 120_000,
  standaloneController,
  standaloneInfrastructureFiles = [],
}) {
  if (!['internal', 'external'].includes(reviewMode)) throw new Error('Unknown review mode');
  if (!Number.isSafeInteger(triageWindowMs) || triageWindowMs < 0 || triageWindowMs > 600_000)
    throw new Error('Invalid triage collection window');
  await gh.intake(event);
  const state = validateState(
    (await store.load()) ?? { schemaVersion: 1, repository: repo, batches: [] },
    repo,
  );
  let persistenceFailed = false;
  const save = async (options) => {
    try {
      if (state.standaloneReviews) validateStandaloneState(state);
      state.updatedAt = new Date().toISOString();
      return await store.save(state, {
        ...options,
        rebaseIndependentSubjects: (merged) => {
          validateState(merged, repo);
          if (merged.standaloneReviews) validateStandaloneState(merged);
        },
      });
    } catch (error) {
      persistenceFailed = true;
      throw error;
    }
  };
  if (state.standaloneReviews?.length) {
    validateStandaloneState(state);
    if (!standaloneController)
      throw new Error('Standalone subjects require their trusted controller');
    for (const subject of state.standaloneReviews) {
      if (subject.release?.status === 'merged') continue;
      try {
        await finalizeStandaloneSubject({
          subject,
          controller: standaloneController,
          github: gh,
          workspace,
          save,
          infrastructureFiles: standaloneInfrastructureFiles,
        });
      } catch (error) {
        if (persistenceFailed)
          throw new Error('Standalone state persistence failed', { cause: error });
        subject.phase = 'blocked';
        subject.reason =
          'Standalone identity, evidence, review or independent QA could not be verified; orchestrator recovery required';
        subject.failureCode = controllerFailureCode(error);
        delete subject.approvedSha;
        await save();
      }
    }
  }
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
  // Only the protected release confirmation job publishes deployed completion.
  // It owns live demo credentials and retries durable pending publication without model work.
  for (const batch of state.batches) {
    if (batch.release?.status === 'deployed') continue;
    const status = batch.phase === 'blocked' ? 'Bloccato' : 'In progress';
    for (const number of batch.issues) await gh.setIssueStatus(number, status);
  }
  const queue = await gh.discoverQueue({ normalize: true });
  let selected = [];
  for (const item of queue) {
    const issue = await gh.viewIssue(typeof item === 'number' ? item : item.number);
    if (claimed.has(issue.number)) continue;
    if (!eligibleIssue(issue)) continue;
    selected.push(issue);
  }
  if (state.pendingTriage) {
    if (state.pendingTriage.status !== 'claiming')
      throw new Error('Interrupted triage requires operator recovery; no automatic model restart');
    const pending = new Set(state.pendingTriage.issues);
    selected = selected.filter((issue) => pending.has(issue.number));
    if (selected.length !== pending.size)
      throw new Error('Pending claim is no longer authorized or open');
  } else if (selected.length) {
    // Persist a quiet window rather than sleeping in Actions. Labeling several issues in
    // succession must not freeze the first singleton plan before the others enter the queue.
    const timestamp = now();
    if (!Number.isSafeInteger(timestamp) || timestamp < 0) throw new Error('Invalid triage clock');
    const numbers = selected.map((issue) => issue.number).sort((a, b) => a - b);
    const previous = state.triageQueue;
    if (JSON.stringify(previous?.issues) !== JSON.stringify(numbers)) {
      state.triageQueue = {
        issues: numbers,
        openedAt: previous?.openedAt ?? timestamp,
        changedAt: timestamp,
      };
      await save();
    }
    const collection = state.triageQueue;
    if (
      timestamp - collection.changedAt < triageWindowMs &&
      timestamp - collection.openedAt < 600_000
    )
      selected = [];
  } else if (state.triageQueue) {
    delete state.triageQueue;
    await save();
  }
  if (selected.length) {
    // Recheck authorization and live labels after collection, before taking ownership.
    const authorized = new Set(
      (await gh.discoverQueue()).map((item) => (typeof item === 'number' ? item : item.number)),
    );
    for (const issue of selected)
      if (!authorized.has(issue.number) || !eligibleIssue(await gh.viewIssue(issue.number)))
        throw new Error('Selected issue authorization or ownership changed before claim');
    if (!state.pendingTriage) {
      delete state.triageQueue;
      state.pendingTriage = { issues: selected.map((i) => i.number), status: 'claiming' };
      await save();
    }
    for (const issue of selected) await gh.setIssueStatus(issue.number, 'In progress');
    for (const issue of selected)
      if (!eligibleIssue(await gh.viewIssue(issue.number)))
        throw new Error('Selected issue authorization or ownership changed before triage');
    state.pendingTriage.status = 'running';
    await save();
    const plan = validatePlan(
      await models.plan({
        cwd: workspace.root,
        issues: selected,
        scopeSchema: planSchema,
        packet: {
          activeBatches: state.batches
            .filter((batch) => batch.release?.status !== 'deployed')
            .map((batch) => ({
              id: batch.id,
              issues: batch.issues,
              feature: batch.plan?.feature ?? '',
              scope: batch.plan?.scope ?? [],
            })),
        },
      }),
      selected,
    );
    const existingBatches = [...state.batches];
    for (const group of plan.groups) {
      const id = `bug-batch-${Math.min(...group.issues)}`;
      // Older installed external-review workers validate plan with a closed schema.
      // Keep the frozen plan wire format compatible and store new grouping alongside it.
      const { fileMap, separationReason, ...frozenPlan } = group;
      const overlaps = existingBatches.filter(
        (batch) =>
          batch.release?.status !== 'deployed' &&
          batch.plan?.scope.some((file) => group.scope.includes(file)),
      );
      state.batches.push({
        id,
        branch: `codex/${id}`,
        issues: group.issues,
        plan: frozenPlan,
        grouping: { fileMap, separationReason },
        phase: overlaps.length ? 'blocked' : 'planned',
        ...(overlaps.length
          ? {
              reason: `File scope overlaps existing batches: ${overlaps.map((b) => b.id).join(', ')}. Coordinate the existing work before replanning; frozen plans and budgets cannot be reset.`,
            }
          : {}),
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
    for (const batch of state.batches.filter(
      (batch) =>
        batch.phase === 'blocked' &&
        batch.plan &&
        selected.some((i) => batch.issues.includes(i.number)),
    )) {
      for (const number of batch.issues) await gh.setIssueStatus(number, 'Bloccato');
      await report(batch, `**BLOCKED** — ${batch.reason}`);
    }
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
      } catch (error) {
        if (persistenceFailed)
          throw new Error('External review reconciliation persistence failed', { cause: error });
        batch.failureCode = controllerFailureCode(error);
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
        if (!eligibleIssue(live))
          throw new Error('source issue is no longer authorized, open or available');
      }
      await workspace.prepare(batch);
      await report(
        batch,
        `Codex ha raggruppato ${batch.issues.map((n) => `#${n}`).join(', ')}. Feature: ${batch.plan.feature.slice(0, 500)}. Motivo: ${batch.plan.rationale.slice(0, 2000)}\n\nMappa issue/file: ${JSON.stringify(batch.grouping?.fileMap ?? []).slice(0, 8000)}\n\nWorktree e piano: \`${batch.branch}\`. Esecutore configurato separatamente; Claude interviene nella review finale.`,
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
      batch.failureCode = controllerFailureCode(error);
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
