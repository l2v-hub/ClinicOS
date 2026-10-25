import {
  automationPaused,
  operatorOwns,
  claimedIssues,
  occupiedSubjects,
} from './operator-ownership.mjs';
import {
  attemptLimit,
  implementationAttempts,
  activeImplementation,
  reserveImplementation,
  spentAttempts,
} from './attempt-budget.mjs';
import {
  planSchema,
  validatePlan,
  validateState,
  feedbackFingerprint,
  sha256,
} from './contracts.mjs';
import { observationProgressDigest, validateObservationResume } from './operator-authorization.mjs';
import { runImplementationStages } from './workspace.mjs';
import { externalReviewStep } from './external-review.mjs';
import { validateStandaloneState, finalizeStandaloneSubject } from './standalone-review.mjs';
import {
  controllerFailureCode,
  isRetryableGitHubFailure,
  recordTransientGitHubFailure,
} from './github.mjs';

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
  let state = validateState(
    (await store.load()) ?? { schemaVersion: 1, repository: repo, batches: [] },
    repo,
  );
  // Ownership must be loaded before intake can normalize labels or touch old subjects.
  if (automationPaused(state)) return state;
  let processingSubject = null;
  let persistenceFailed = false;
  const ownershipLost = () =>
    Object.assign(new Error('Automatic ownership changed during state reconciliation'), {
      code: 'review-operator-owned',
    });
  const assertOwnership = (observed) => {
    if (
      automationPaused(observed) ||
      (processingSubject &&
        operatorOwns(
          observed,
          processingSubject.collection,
          observed[processingSubject.collection]?.find(
            (item) => item.id === processingSubject.id,
          ) ?? processingSubject,
        ))
    )
      throw ownershipLost();
  };
  const freshOwnership = async () => {
    let raw;
    try {
      raw = await (store.observe ? store.observe() : store.load());
    } catch (error) {
      if (isRetryableGitHubFailure(error) || error?.code === 'github-read-failed')
        throw Object.assign(new Error('Fresh ownership observation unavailable before operation'), {
          code: 'ownership-observation-failed',
          beforeInvocation: true,
          cause: error,
        });
      if (error?.code === 'github-read-rejected') throw error;
      throw Object.assign(new Error('Fresh ownership state could not be validated'), {
        code: 'ownership-observation-invalid',
        cause: error,
      });
    }
    let observed;
    try {
      observed = validateState(raw ?? { schemaVersion: 1, repository: repo, batches: [] }, repo);
      if (observed.standaloneReviews) validateStandaloneState(observed);
    } catch (error) {
      throw Object.assign(new Error('Fresh ownership state could not be validated'), {
        code: 'ownership-observation-invalid',
        cause: error,
      });
    }
    assertOwnership(observed);
  };
  const recoverOwnership = async (error) => {
    if (persistenceFailed || error?.code !== 'review-operator-owned') return false;
    // Discard unsaved work only for the finite, observed ownership-loss code.
    // Uncertain writes and genuine CAS/integrity failures still halt the pass.
    state = validateState(await store.load(), repo);
    if (state.standaloneReviews) validateStandaloneState(state);
    return true;
  };
  const pauseObservation = async (batch, error) => {
    if (persistenceFailed || error?.code !== 'ownership-observation-failed') return false;
    const progress = batch.controllerProgress;
    if (
      progress?.status === 'running' ||
      (progress?.status === 'completed' &&
        (implementationAttempts(batch).some(
          (item) => item.round === progress.round && item.status === 'running',
        ) ||
          (!batch.pr && progress.flow === 'implementation') ||
          ['implementing', 'validating', 'simplifying', 'publishing'].includes(batch.phase)))
    )
      progress.status = 'interrupted';
    if (
      batch.codexFinalReview?.status === 'running' &&
      !batch.codexFinalQaInfrastructure?.attempts?.some(
        (item) => item.nonce === batch.codexFinalReview.nonce,
      )
    ) {
      batch.codexFinalReview.status = 'blocked';
      batch.codexFinalReview.invocation = {
        status: 'not-started',
        boundary: 'ownership-observation',
        nonce: batch.codexFinalReview.nonce,
      };
    }
    batch.controllerInterruption = {
      schemaVersion: 1,
      code: 'ownership-observation-failed',
      beforeInvocation: true,
      transport: {
        code: controllerFailureCode(error.cause),
        diagnostic: [
          'unknown',
          'spawn-failed',
          'output-limit',
          'timeout',
          'rate-limit',
          'http-status',
        ].includes(error.cause?.diagnostic)
          ? error.cause.diagnostic
          : 'unknown',
        httpStatus: Number.isSafeInteger(error.cause?.httpStatus) ? error.cause.httpStatus : null,
        operation: 'read',
      },
      subjectSha: batch.sha ?? null,
      progressSha256: progress ? observationProgressDigest(progress) : sha256(JSON.stringify(null)),
      at: new Date(now()).toISOString(),
    };
    batch.failureCode = controllerFailureCode(error.cause);
    batch.phase = 'blocked';
    delete batch.approvedSha;
    // If persistence remains unavailable this throws, retaining the last genuine
    // reservation. No durable diagnostic or completed operation is fabricated.
    await save();
    return true;
  };
  const guarded = (target, methods) =>
    new Proxy(target, {
      get(object, key) {
        const value = object[key];
        if (!methods.includes(key) || typeof value !== 'function') return value;
        return async (...args) => {
          await freshOwnership();
          return value.apply(object, args);
        };
      },
    });
  // Every asynchronous model/effect boundary re-reads ownership, including internal
  // feedback/review correction paths and prebuilt workspace implementations.
  workspace = guarded(workspace, [
    'prepare',
    'resume',
    'execute',
    'verify',
    'simplify',
    'qa',
    'finalQa',
    'checkpoint',
    'publish',
    'review',
    'issueEvidence',
  ]);
  gh = guarded(gh, [
    'intake',
    'discoverQueue',
    'setIssueStatus',
    'commentIssue',
    'commentPR',
    'createDraft',
    'draftReady',
  ]);
  const save = async (options) => {
    try {
      await freshOwnership();
      if (state.standaloneReviews) validateStandaloneState(state);
      state.updatedAt = new Date().toISOString();
      return await store.save(state, {
        ...options,
        checkFreshOwnership: (fresh) => {
          validateState(fresh, repo);
          if (fresh.standaloneReviews) validateStandaloneState(fresh);
          assertOwnership(fresh);
        },
        rebaseIndependentSubjects: (merged) => {
          validateState(merged, repo);
          if (merged.standaloneReviews) validateStandaloneState(merged);
          assertOwnership(merged);
        },
      });
    } catch (error) {
      if (!['review-operator-owned', 'ownership-observation-failed'].includes(error?.code))
        persistenceFailed = true;
      throw error;
    }
  };
  if (state.standaloneReviews?.length) {
    validateStandaloneState(state);
    // Snapshot identities, never object references: a failed CAS reload replaces all
    // canonical objects. Later subjects must resolve against the refreshed state.
    const subjectIds = state.standaloneReviews.map((subject) => subject.id);
    for (const id of subjectIds) {
      let subject = state.standaloneReviews.find((item) => item.id === id);
      if (
        !subject ||
        operatorOwns(state, 'standaloneReviews', subject) ||
        subject.release?.status === 'merged' ||
        (subject.phase === 'blocked' && subject.release?.status !== 'merging')
      )
        continue;
      const transient = subject.lastTransientFailure;
      if (transient?.subjectSha === subject.sha && transient.nextRetryAt > now()) continue;
      if (!standaloneController)
        throw new Error('Standalone subjects require their trusted controller');
      processingSubject = { collection: 'standaloneReviews', id };
      try {
        await finalizeStandaloneSubject({
          automatic: true,
          subject,
          controller: standaloneController,
          github: gh,
          workspace,
          save,
          infrastructureFiles: standaloneInfrastructureFiles,
          now: () => new Date(now()),
        });
        if (subject.lastTransientFailure) {
          delete subject.lastTransientFailure;
          await save();
        }
      } catch (error) {
        // A failed persistence boundary halts the entire mutation pass. Loading a
        // snapshot does not establish that writes are usable again.
        if (persistenceFailed) throw error;
        state = validateState(await store.load(), repo);
        if (state.standaloneReviews) validateStandaloneState(state);
        subject = state.standaloneReviews?.find((item) => item.id === id);
        if (
          error?.code === 'review-operator-owned' ||
          !subject ||
          operatorOwns(state, 'standaloneReviews', subject)
        )
          continue;
        const code = controllerFailureCode(error);
        if (isRetryableGitHubFailure(error)) {
          if (recordTransientGitHubFailure(subject, now())) {
            subject.phase = 'blocked';
            subject.failureCode = 'github-transient-exhausted';
            subject.reason = 'Retryable GitHub reads failed across the recovery window';
            delete subject.approvedSha;
          }
        } else {
          subject.phase = 'blocked';
          subject.reason =
            'Standalone identity, evidence or GitHub operation requires explicit recovery';
          subject.failureCode = code;
          delete subject.failureOperation;
          if (['projection', 'merge', 'mutation', 'read'].includes(error.operation))
            subject.failureOperation = error.operation;
          delete subject.approvedSha;
        }
        // Failure here propagates: no diagnostic is claimed durable and unrelated
        // subjects cannot carry unsafe unsaved mutations into a later write.
        await save();
      }
    }
  }

  processingSubject = null;
  if (automationPaused(state)) return state;
  const report = async (batch, text) => {
    await freshOwnership();
    for (const n of batch.issues)
      await gh.commentIssue(n, `<!-- codex-bug-pipeline:status -->\n${text}`);
  };
  const block = async (batch, reason) => {
    await freshOwnership();
    batch.phase = 'blocked';
    batch.reason = reason;
    await save();
    for (const number of batch.issues) await gh.setIssueStatus(number, 'Bloccato');
    await report(
      batch,
      `**BLOCKED** — ${reason}. Budget sviluppo ${spentAttempts(batch, 'implementation')}/${attemptLimit(batch, 'implementation')}, review ${batch.reviews.length}/${attemptLimit(batch, 'reviews')}. Il budget non viene azzerato da nuovi comandi.`,
    );
  };
  const claimed = claimedIssues(state);
  // A command targeting an already owned issue cannot even normalize its labels.
  if (!event?.issue || !claimed.has(event.issue.number)) await gh.intake(event);
  // Only the protected release confirmation job publishes deployed completion.
  // It owns live demo credentials and retries durable pending publication without model work.
  const runCorrection = async (batch, context, retained = false) => {
    const previous = batch.controllerProgress;
    // Legacy observation-resume journals used review rounds, without a paid
    // implementation reservation. Resume those exact retained stages as before.
    const legacyResume = retained && previous.implementationRound === undefined;
    const attempt = legacyResume
      ? null
      : retained
        ? implementationAttempts(batch).find(
            (entry) => entry.round === previous.implementationRound && entry.status === 'running',
          )
        : reserveImplementation(batch, () => new Date(now()));
    if (!legacyResume && !attempt) throw new Error('Implementation reservation changed');
    try {
      await runImplementationStages({
        batch,
        workspace,
        save,
        context: {
          ...context,
          round: legacyResume ? previous.round : attempt.round,
          ...(legacyResume ? {} : { implementationRound: attempt.round }),
        },
      });
      if (attempt) attempt.status = 'passed';
    } catch (error) {
      if (attempt && batch.controllerProgress?.status === 'failed') attempt.status = 'failed';
      throw error;
    }
  };
  for (const id of state.batches.map((batch) => batch.id)) {
    const batch = state.batches.find((batch) => batch.id === id);
    if (operatorOwns(state, 'batches', batch) || batch.release?.status === 'deployed') continue;
    processingSubject = { collection: 'batches', id };
    const status = batch.phase === 'blocked' ? 'Bloccato' : 'In progress';
    try {
      for (const number of batch.issues) await gh.setIssueStatus(number, status);
    } catch (error) {
      if (!(await recoverOwnership(error))) throw error;
    }
  }
  processingSubject = null;
  if (automationPaused(state)) return state;
  const queue = await gh.discoverQueue({
    normalize: true,
    excludeIssues: [...claimed],
  });
  let selected = [];
  for (const item of queue) {
    const issue = await gh.viewIssue(typeof item === 'number' ? item : item.number);
    if (claimed.has(issue.number)) continue;
    if (!eligibleIssue(issue)) continue;
    selected.push(issue);
  }
  const assertSelectedUnclaimed = () => {
    if (automationPaused(state) || selected.some((issue) => claimedIssues(state).has(issue.number)))
      throw new Error('Selected issue acquired another durable owner before triage');
  };
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
      assertSelectedUnclaimed();
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
    assertSelectedUnclaimed();
    // Recheck authorization and live labels after collection, before taking ownership.
    const authorized = new Set(
      (await gh.discoverQueue()).map((item) => (typeof item === 'number' ? item : item.number)),
    );
    for (const issue of selected)
      if (!authorized.has(issue.number) || !eligibleIssue(await gh.viewIssue(issue.number)))
        throw new Error('Selected issue authorization or ownership changed before claim');
    if (!state.pendingTriage) {
      delete state.triageQueue;
      state.pendingTriage = {
        issues: selected.map((i) => i.number),
        status: 'claiming',
      };
      await save();
    }
    assertSelectedUnclaimed();
    for (const issue of selected) {
      assertSelectedUnclaimed();
      await gh.setIssueStatus(issue.number, 'In progress');
    }
    for (const issue of selected)
      if (!eligibleIssue(await gh.viewIssue(issue.number)))
        throw new Error('Selected issue authorization or ownership changed before triage');
    state.pendingTriage.status = 'running';
    await save();
    assertSelectedUnclaimed();
    await freshOwnership();
    const plan = validatePlan(
      await models.plan({
        cwd: workspace.root,
        issues: selected,
        scopeSchema: planSchema,
        packet: {
          activeBatches: occupiedSubjects(state),
        },
      }),
      selected,
    );
    const existingBatches = occupiedSubjects(state);
    for (const group of plan.groups) {
      const id = `bug-batch-${Math.min(...group.issues)}`;
      // Older installed external-review workers validate plan with a closed schema.
      // Keep the frozen plan wire format compatible and store new grouping alongside it.
      const { fileMap, separationReason, ...frozenPlan } = group;
      const overlaps = existingBatches.filter((batch) =>
        batch.scope.some((file) => group.scope.includes(file)),
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
  for (const id of state.batches.map((batch) => batch.id)) {
    const batch = state.batches.find((batch) => batch.id === id);
    if (!batch || operatorOwns(state, 'batches', batch)) continue;
    processingSubject = { collection: 'batches', id: batch.id };
    try {
      if (['merging', 'merged', 'deployed'].includes(batch.release?.status)) continue;
      if (batch.phase === 'blocked') continue;
      if (reviewMode === 'external' && batch.externalReview?.status === 'running') continue;
      if (reviewMode === 'external' && batch.pr) {
        try {
          await externalReviewStep({
            repo,
            batch,
            gh,
            workspace,
            save,
            report,
            block,
          });
        } catch (error) {
          if (await recoverOwnership(error)) continue;
          try {
            if (await pauseObservation(batch, error)) continue;
          } catch (pauseError) {
            if (await recoverOwnership(pauseError)) continue;
            throw pauseError;
          }
          if (persistenceFailed)
            throw new Error('External review reconciliation persistence failed', {
              cause: error,
            });
          batch.failureCode = controllerFailureCode(error);
          try {
            await block(
              batch,
              'External review consistency or correction failed; inspect the existing batch',
            );
          } catch (blockingError) {
            if (await recoverOwnership(blockingError)) continue;
            throw blockingError;
          }
        }
        continue;
      }
      const resuming =
        batch.controllerProgress?.status === 'interrupted' &&
        Boolean(batch.controllerProgress.resumeAuthorization);
      if (resuming) validateObservationResume(batch);
      if (
        !resuming &&
        (activeImplementation(batch) ||
          batch.reviews.some((a) => a.status === 'running') ||
          ['implementing', 'simplifying', 'validating', 'publishing', 'reviewing'].includes(
            batch.phase,
          ))
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
        if (batch.reviews.length >= attemptLimit(batch, 'reviews')) {
          await block(batch, 'Four-review limit reached; new comments cannot restart the budget');
          continue;
        }
      }
      // Recheck every issue before any model/worktree mutation, after grouping and on restart.
      for (const n of batch.issues) {
        const live = await gh.viewIssue(n);
        if (!eligibleIssue(live))
          throw new Error('source issue is no longer authorized, open or available');
      }
      if (!resuming) await workspace.prepare(batch);
      await report(
        batch,
        `Codex ha raggruppato ${batch.issues.map((n) => `#${n}`).join(', ')}. Feature: ${batch.plan.feature.slice(0, 500)}. Motivo: ${batch.plan.rationale.slice(0, 2000)}\n\nMappa issue/file: ${JSON.stringify(batch.grouping?.fileMap ?? []).slice(0, 8000)}\n\nWorktree e piano: \`${batch.branch}\`. Esecutore configurato separatamente; Claude interviene nella review finale.`,
      );
      if (!batch.sha || (resuming && batch.controllerProgress.flow === 'implementation')) {
        let passed = false;
        while (
          (resuming && batch.controllerProgress.flow === 'implementation') ||
          spentAttempts(batch, 'implementation') < attemptLimit(batch, 'implementation')
        ) {
          const attempt =
            (resuming &&
              batch.controllerProgress.flow === 'implementation' &&
              implementationAttempts(batch)[batch.controllerProgress.round - 1]) ||
            reserveImplementation(batch, () => new Date(now()));
          try {
            await runImplementationStages({
              batch,
              workspace,
              save,
              context: {
                phase: 'implementation',
                round: attempt.round,
                ...(resuming && batch.controllerProgress.implementationRound === undefined
                  ? {}
                  : { implementationRound: attempt.round }),
                feedback: batch.lastFailure ?? null,
              },
            });
            attempt.status = 'passed';
            passed = true;
            break;
          } catch (error) {
            if (
              persistenceFailed ||
              batch.controllerProgress?.status !== 'failed' ||
              resuming ||
              /^github-/.test(error?.code ?? '') ||
              [
                'review-operator-owned',
                'ownership-observation-failed',
                'ownership-observation-invalid',
              ].includes(error?.code)
            )
              throw error;
            attempt.status = 'failed';
            batch.lastFailure =
              'Implementation or required verification failed; inspect current local test-results.';
            batch.phase = 'planned';
            await save();
          }
        }
        if (!passed) {
          await block(batch, 'Implementation allowance exhausted');
          continue;
        }
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
        await externalReviewStep({
          repo,
          batch,
          gh,
          workspace,
          save,
          report,
          block,
        });
        continue;
      }
      // New PR feedback is handled once, in a new executor session, before the next review.
      if (feedback && feedbackFingerprint(feedback) !== batch.feedbackFingerprint) {
        await runCorrection(
          batch,
          {
            phase: 'pr-feedback',
            reviewRound: batch.reviews.length + 1,
            feedback:
              resuming && batch.controllerProgress.flow === 'pr-feedback'
                ? batch.controllerProgress.feedback
                : feedback,
          },
          resuming && batch.controllerProgress.flow === 'pr-feedback',
        );
        await report(batch, await workspace.issueEvidence(batch));
      }
      if (
        (resuming || batch.controllerProgress?.status === 'failed') &&
        batch.controllerProgress.flow === 'review-correction'
      ) {
        const retained = batch.controllerProgress;
        if (
          !resuming &&
          (retained.sourceSha !== batch.sha ||
            retained.planSha256 !== sha256(JSON.stringify(batch.plan)) ||
            retained.feedbackSha256 !== sha256(JSON.stringify(retained.feedback)))
        )
          throw new Error('Failed correction identity changed');
        await runCorrection(
          batch,
          {
            phase: 'review-correction',
            reviewRound: retained.reviewRound ?? retained.round,
            feedback: retained.feedback,
          },
          resuming,
        );
        batch.approvedSha = null;
        batch.phase = 'waiting-checks';
        await save();
        await report(batch, await workspace.issueEvidence(batch));
      }
      while (batch.reviews.length < attemptLimit(batch, 'reviews')) {
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
        if (review.verdict === 'blocked' || attempt.round === attemptLimit(batch, 'reviews')) {
          await block(batch, 'Claude review remains blocked or four-review limit reached');
          break;
        }
        await runCorrection(batch, {
          phase: 'review-correction',
          reviewRound: attempt.round,
          feedback: { claude: review, github: after },
        });
        batch.approvedSha = null;
        await report(batch, await workspace.issueEvidence(batch));
        batch.phase = 'waiting-checks';
        await save();
      }
    } catch (error) {
      if (await recoverOwnership(error)) continue;
      try {
        if (await pauseObservation(batch, error)) continue;
      } catch (pauseError) {
        if (await recoverOwnership(pauseError)) continue;
        throw pauseError;
      }
      if (persistenceFailed) throw error;
      batch.failureCode = controllerFailureCode(error);
      for (const a of [...implementationAttempts(batch), ...batch.reviews])
        if (
          a.status === 'running' &&
          !['running', 'interrupted'].includes(batch.controllerProgress?.status)
        )
          a.status = 'failed';
      try {
        await block(
          batch,
          'Execution, evidence, authentication or remote consistency check failed; inspect sanitized controller diagnostics',
        );
      } catch (blockingError) {
        if (await recoverOwnership(blockingError)) continue;
        throw blockingError;
      }
    }
  }
  return state;
}
