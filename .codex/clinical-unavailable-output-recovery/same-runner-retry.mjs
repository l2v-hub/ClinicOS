import assert from 'node:assert/strict';

// Offline composition only. All native authority, physical observation, state
// validation and controller behavior remain injected by the accepted runner.
// Never installs a verifier, grants budget, reconstructs a workspace or retries
// a thrown/unknown invocation. A second pass is the sole finite retry boundary.
export async function runSameRunnerPasses({
  targets, observe, assertExclusiveOwnership, captureCheckpoint,
  knownFailedCorrection, attemptLimit, spentAttempts, historyDigest,
  recover, runPass,
}) {
  assert.equal(targets.length, 2, 'Expected the exact two-target cohort');
  assert.equal(new Set(targets.map(t => t.id)).size, 2);
  assert.equal(new Set(targets.map(t => t.pr)).size, 2);
  for (const t of targets) {
    assert.ok(t.id && Number.isSafeInteger(t.issue) && Number.isSafeInteger(t.pr));
    assert.match(t.sha, /^[a-f0-9]{40}$/);
  }
  const find = (state, target) => {
    const matches = state.batches.filter(b => b.id === target.id);
    assert.equal(matches.length, 1, 'Exact target missing or ambiguous');
    const b = matches[0];
    assert.deepEqual(b.issues, [target.issue]);
    assert.equal(b.pr?.number, target.pr);
    assert.equal(b.branch, 'codex/' + target.id);
    return b;
  };
  const running = b =>
    [...(b.implementation ?? []), ...(b.operatorContinuations ?? []), ...(b.reviews ?? [])]
      .some(a => ['running', 'implemented-awaiting-independent-qa'].includes(a.status)) ||
    ['running', 'interrupted'].includes(b.controllerProgress?.status) ||
    b.release?.status === 'merging';
  const snapshot = async () => {
    const state = await observe();
    // The integrator verifies the canonical ownership inventory and accepted
    // source/config binding, with fresh remote head guards, in this boundary.
    await assertExclusiveOwnership(state, targets);
    for (const t of targets) find(state, t);
    return state;
  };
  let state = await snapshot();
  const startCounts = new Map();
  for (const t of targets) {
    const b = find(state, t);
    assert.equal(b.sha, t.sha);
    assert.equal(b.phase, 'waiting-review');
    assert.ok(!running(b), 'Initial target already running or publishing');
    assert.equal(b.reviews.at(-1)?.status, 'changes-requested');
    assert.ok(spentAttempts(b, 'implementation') < attemptLimit(b, 'implementation'));
    assert.ok(spentAttempts(b, 'reviews') < attemptLimit(b, 'reviews'));
    startCounts.set(t.id, spentAttempts(b, 'implementation'));
  }
  await runPass({ pass: 1 }); // A throw leaves an uncertain outcome: never replay.
  state = await snapshot();
  const candidates = [];
  const checkFailure = async (s, t, frozen) => {
    const b = find(s, t), p = b.controllerProgress;
    assert.equal(b.sha, t.sha, 'Published subject changed');
    assert.equal(b.phase, 'blocked');
    assert.equal(b.failureCode, 'workspace-verification-failed');
    assert.ok(knownFailedCorrection(b), 'Not a native known failed correction');
    assert.equal(p.status, 'failed');
    assert.equal(p.failureCode, b.failureCode);
    assert.ok(['verify-before', 'verify-after'].includes(p.failedStep));
    assert.equal(p.sourceSha, b.sha);
    assert.ok(!running(b), 'Running, unknown or publishing state cannot be retried');
    assert.ok(!b.release, 'Release activity cannot be retried here');
    assert.equal([...(b.implementation ?? []), ...(b.operatorContinuations ?? [])].at(-1)?.status, 'failed');
    assert.equal(b.reviews.at(-1)?.status, 'changes-requested');
    assert.ok(spentAttempts(b, 'implementation') === startCounts.get(t.id) + 1,
      'First pass must consume exactly one genuine implementation attempt');
    assert.ok(spentAttempts(b, 'implementation') < attemptLimit(b, 'implementation'));
    assert.ok(spentAttempts(b, 'reviews') < attemptLimit(b, 'reviews'));
    assert.ok(p.checkpoint && p.checkpoint.schemaVersion === 1);
    const actual = await captureCheckpoint(b);
    assert.deepEqual(actual, p.checkpoint, 'Exact physical checkpoint changed');
    assert.equal(p.checkpoint.head, b.sha);
    assert.equal(p.checkpoint.branch, b.branch);
    assert.equal(p.checkpoint.baseSha, b.baseSha);
    assert.equal(p.checkpoint.planSha256, historyDigest(b.plan));
    assert.ok(p.checkpoint.output && typeof p.checkpoint.output === 'object' &&
      !Array.isArray(p.checkpoint.output));
    if (frozen) assert.equal(historyDigest(b), frozen, 'Failed journal changed');
    return historyDigest(b);
  };
  // Preflight every failure before the first resume. Healthy or pending-review
  // targets are never resumed. Any malformed/unknown failed target stops all.
  for (const t of targets) {
    const b = find(state, t);
    if (b.phase !== 'blocked') {
      assert.ok(!running(b), 'Uncertain target outcome stops the cohort');
      assert.ok(['waiting-review', 'awaiting-external-review', 'review-requested',
        'waiting-checks', 'reviewing', 'ready', 'merged', 'released', 'completed'].includes(b.phase),
        'Unknown target phase stops the cohort');
      continue;
    }
    const frozen = await checkFailure(state, t);
    candidates.push({ t, frozen });
  }
  if (!candidates.length) return { passes: 1, resumed: [], stop: 'no-retryable-failure' };
  for (const { t, frozen } of candidates) {
    state = await snapshot();
    await checkFailure(state, t, frozen);
    await recover(t.pr, {
      action: 'resume', expectedSha: t.sha,
      token: historyDigest({ phase: 'blocked', failureCode: 'workspace-verification-failed' }),
      reason: 'Same exclusive runner retained the exact native failed verification checkpoint. Resume one normal correction using only unused previously authorized allowance; preserve every attempt.',
    });
  }
  // Recover mutates only native state. Verify all resumed identities and exact
  // retained bytes once more before the single remaining normal controller pass.
  state = await snapshot();
  for (const { t } of candidates) {
    const b = find(state, t);
    assert.equal(b.phase, 'waiting-review');
    assert.equal(b.sha, t.sha);
    assert.ok(!running(b));
    assert.ok(knownFailedCorrection(b));
    assert.deepEqual(await captureCheckpoint(b), b.controllerProgress.checkpoint);
    assert.ok(spentAttempts(b, 'implementation') < attemptLimit(b, 'implementation'));
    assert.ok(spentAttempts(b, 'reviews') < attemptLimit(b, 'reviews'));
  }
  await runPass({ pass: 2 });
  // Always observe terminal state for diagnostics; never take a third pass.
  await snapshot();
  return { passes: 2, resumed: candidates.map(({t}) => t.id), stop: 'finite-two-pass-bound' };
}
