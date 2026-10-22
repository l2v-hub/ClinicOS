import { randomUUID } from 'node:crypto';
import { DEMO_SOURCE_POLICIES, validateReceipt } from './demo-deployment.mjs';

const REPO = 'l2v-hub/ClinicOS';
const WORKFLOW = '.github/workflows/deploy-demo-exact-commit.yml';
const ROUTE = `repos/${REPO}/actions/workflows/deploy-demo-exact-commit.yml/dispatches`;
const SHA = /^[a-f0-9]{40}(?![\s\S])/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}(?![\s\S])/;
const integer = (n) => Number.isSafeInteger(n) && n > 0;
const fail = (message) => {
  throw new Error(`Exact demo dispatch blocked: ${message}`);
};
const title = (p) => `demo-exact ${p.operation} ${p.sha} ${p.dispatchId}`;

export const DISPATCH_SETTLE_MS = 15 * 60_000;
export const NO_RUN_OBSERVATION_GAP_MS = 10_000;
const timestamp = (value) => {
  if (typeof value !== 'string') fail('trusted dispatch timestamp required');
  const ms = Date.parse(value);
  if (!Number.isSafeInteger(ms) || new Date(ms).toISOString() !== value)
    fail('trusted dispatch timestamp required');
  return ms;
};
function validateTimes(progress, currentTime, blockedAt) {
  if (!Number.isSafeInteger(currentTime) || currentTime < 0)
    fail('trusted dispatch clock required');
  const intent = progress.intentAt === undefined ? undefined : timestamp(progress.intentAt);
  const submitted =
    progress.submittedAt === undefined ? undefined : timestamp(progress.submittedAt);
  const blocked = blockedAt === undefined ? undefined : timestamp(blockedAt);
  if (
    [intent, submitted, blocked].some((t) => t !== undefined && t > currentTime) ||
    (submitted !== undefined && (intent === undefined || submitted < intent)) ||
    (blocked !== undefined &&
      ((intent !== undefined && blocked < intent) ||
        (submitted !== undefined && blocked < submitted)))
  )
    fail('dispatch timestamp order or future time invalid');
  return Math.max(...[intent, submitted, blocked].filter((t) => t !== undefined));
}
function validateInventory(list) {
  if (
    !Array.isArray(list?.workflow_runs) ||
    !Number.isSafeInteger(list.total_count) ||
    list.total_count < 0 ||
    list.total_count > 100 ||
    list.workflow_runs.length !== list.total_count ||
    list.workflow_runs.some((run) => !integer(run?.id)) ||
    new Set(list.workflow_runs.map((run) => run.id)).size !== list.total_count
  )
    fail('bounded complete run inventory unavailable');
  return list.workflow_runs;
}
function validateRun(run, progress) {
  if (
    !integer(run?.id) ||
    run.run_attempt !== 1 ||
    run.head_sha !== progress.sha ||
    run.repository?.full_name !== REPO ||
    run.head_repository?.full_name !== REPO ||
    run.path !== WORKFLOW ||
    run.event !== 'workflow_dispatch' ||
    run.head_branch !== 'main' ||
    run.display_title !== title(progress) ||
    progress.priorRunIds.includes(run.id) ||
    (progress.runId !== undefined && run.id !== progress.runId)
  )
    fail('run identity mismatch');
}

function runProof(run) {
  return {
    runId: run.id,
    runAttempt: run.run_attempt,
    sha: run.head_sha,
    repository: run.repository?.full_name,
    headRepository: run.head_repository?.full_name,
    workflow: run.path,
    event: run.event,
    branch: run.head_branch,
    displayTitle: run.display_title,
    status: run.status,
    conclusion: run.conclusion,
  };
}
const sameProof = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function validateCompleted(run) {
  if (run.status !== 'completed') fail('active old dispatch cannot be recovered');
  if (!['success', 'failure', 'cancelled', 'timed_out', 'action_required', 'neutral',
    'skipped', 'stale', 'startup_failure'].includes(run.conclusion))
    fail('unsettled old dispatch cannot be recovered');
}
async function dispatchInventory(reader, sha) {
  const rows = validateInventory(await reader.getJson(
    `actions/workflows/deploy-demo-exact-commit.yml/runs?branch=main&event=workflow_dispatch&head_sha=${sha}&per_page=100`,
  ));
  if (rows.some((run) => run.head_sha !== sha || run.repository?.full_name !== REPO ||
    run.head_repository?.full_name !== REPO || run.path !== WORKFLOW ||
    run.event !== 'workflow_dispatch' || run.head_branch !== 'main' ||
    !integer(run.run_attempt) || typeof run.display_title !== 'string'))
    fail('retired inventory identity mismatch');
  return rows;
}
function validateNoRunProof(proof, progress, blockedAt, currentTime) {
  const origin = validateTimes(progress, currentTime, blockedAt);
  const first = timestamp(proof.firstObservedAt), second = timestamp(proof.secondObservedAt);
  if (!Number.isFinite(origin) || proof.originAt !== new Date(origin).toISOString() ||
    proof.operation !== progress.operation || proof.sha !== progress.sha ||
    proof.dispatchId !== progress.dispatchId || proof.settleMs !== DISPATCH_SETTLE_MS ||
    proof.observationGapMs !== NO_RUN_OBSERVATION_GAP_MS ||
    first < origin + DISPATCH_SETTLE_MS || second < first + NO_RUN_OBSERVATION_GAP_MS ||
    second > currentTime) fail('retired no-run proof changed or late run observed');
}

// This adapter has one literal dispatch endpoint, a fixed main ref and bounded output.
// A successful POST only acknowledges submission; ensure() requires the actual run and receipt.
export function createExactDispatchPoster({ run, cwd }) {
  return async (body) => {
    if (
      body?.ref !== 'main' ||
      !SHA.test(body.inputs?.reviewed_sha ?? '') ||
      !['preflight', 'deploy'].includes(body.inputs?.operation) ||
      !UUID.test(body.inputs?.dispatch_id ?? '') ||
      Object.keys(body).sort().join(',') !== 'inputs,ref' ||
      Object.keys(body.inputs).sort().join(',') !== 'dispatch_id,operation,reviewed_sha'
    )
      fail('fixed main dispatch inputs required');
    const result = await run({
      command: 'gh',
      args: ['api', ROUTE, '-X', 'POST', '--input', '-'],
      input: JSON.stringify(body),
      cwd,
      timeoutMs: 30_000,
      maxOutputBytes: 64 * 1024,
    });
    if (!result?.ok || result.stdout.trim() !== '')
      fail('dispatch acknowledgement uncertain; intent retained');
  };
}

export function createExactDemoDispatcher({
  reader,
  postDispatch,
  now = Date.now,
  delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  newId = randomUUID,
  timeoutMs = 45 * 60_000,
  pollMs = 10_000,
} = {}) {
  if (
    !reader?.getJson ||
    !reader?.artifact ||
    typeof postDispatch !== 'function' ||
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > 45 * 60_000 ||
    !Number.isFinite(pollMs) ||
    pollMs <= 0
  )
    throw new TypeError('bounded exact dispatcher dependencies required');
  const currentMain = async (expected) => {
    const head = await reader.getJson('commits/main');
    if (!SHA.test(head?.sha ?? '') || (expected !== undefined && head.sha !== expected))
      fail('current main changed');
    return head.sha;
  };
  const runs = async (sha) => {
    const list = await reader.getJson(
      `actions/workflows/deploy-demo-exact-commit.yml/runs?branch=main&event=workflow_dispatch&head_sha=${sha}&per_page=100`,
    );
    return validateInventory(list);
  };
  return {
    async ensure({
      operation,
      expectedSha,
      progress,
      saveProgress,
      excludedRunIds = [],
      excludedDispatchIds = [],
      excludedDispatches = [],
      guard = async () => {},
    }) {
      if (
        !['preflight', 'deploy'].includes(operation) ||
        (expectedSha !== undefined && !SHA.test(expectedSha)) ||
        (operation === 'deploy' && expectedSha === undefined) ||
        typeof saveProgress !== 'function' ||
        !Array.isArray(excludedDispatches) ||
        excludedDispatches.length > 100 ||
        excludedDispatches.some(
          (p) =>
            !SHA.test(p?.sha ?? '') ||
            !UUID.test(p?.dispatchId ?? '') ||
            !['preflight', 'deploy'].includes(p?.operation) ||
            !excludedDispatchIds.includes(p.dispatchId) ||
            (p.runId !== undefined && (!integer(p.runId) || !excludedRunIds.includes(p.runId))),
        ) ||
        !Array.isArray(excludedDispatchIds) ||
        excludedDispatchIds.length > 100 ||
        excludedDispatchIds.some((id) => !UUID.test(id)) ||
        !Array.isArray(excludedRunIds) ||
        excludedRunIds.length > 100 ||
        excludedRunIds.some((id) => !integer(id))
      )
        throw new TypeError('fixed operation and exact merged SHA required');
      const started = now();
      if (!Number.isSafeInteger(started) || started < 0) fail('trusted dispatch clock required');
      let lastTick = started;
      const tick = () => {
        const current = now();
        if (!Number.isSafeInteger(current) || current < lastTick)
          fail('dispatch clock moved backwards');
        lastTick = current;
        return current;
      };
      const checkLate = async (sha) => {
        for (const sourceSha of new Set([sha, ...excludedDispatches.map((p) => p.sha)])) {
          const inventory = await runs(sourceSha);
          for (const excluded of excludedDispatches.filter((p) => p.sha === sourceSha)) {
            const matches = inventory.filter((run) => run.display_title === title(excluded));
            if (matches.length > 1 || (excluded.runId !== undefined &&
              (matches.length !== 1 || matches[0].id !== excluded.runId)))
              fail('late excluded dispatch identity missing or ambiguous; no new POST');
            if (excluded.runId !== undefined) {
              const detail = await reader.getJson(`actions/runs/${excluded.runId}`);
              validateRun(detail, { ...excluded, priorRunIds: [] });
              if (!sameProof(runProof(detail), runProof(matches[0])) ||
                (excluded.run && !sameProof(excluded.run, runProof(detail))))
                fail('late excluded dispatch proof changed; no new POST');
            }
          }
          for (const run of inventory) {
            if (
              (excludedDispatchIds.length || excludedDispatches.length) &&
              (run.head_sha !== sourceSha ||
                run.repository?.full_name !== REPO ||
                run.head_repository?.full_name !== REPO ||
                run.path !== WORKFLOW ||
                run.event !== 'workflow_dispatch' ||
                run.head_branch !== 'main' ||
                !integer(run.run_attempt) ||
                typeof run.display_title !== 'string')
            )
              fail('excluded run inventory identity mismatch');
            const excluded = excludedDispatches.find(
              (p) => p.sha === sourceSha && run.display_title === title(p),
            );
            const matchesId = excludedDispatchIds.some(
              (id) =>
                run.display_title === `demo-exact preflight ${sourceSha} ${id}` ||
                run.display_title === `demo-exact deploy ${sourceSha} ${id}`,
            );
            if (excluded || matchesId) {
              if (
                !excludedRunIds.includes(run.id) ||
                run.run_attempt !== 1 ||
                run.status !== 'completed'
              )
                fail('late excluded dispatch run observed; no new POST');
            }
          }
        }
      };
      await guard();
      const sha = await currentMain(expectedSha);
      await checkLate(sha);
      if (progress !== undefined) {
        if (
          progress.operation !== operation ||
          progress.sha !== sha ||
          !UUID.test(progress.dispatchId ?? '') ||
          !['intent', 'submitted', 'observed', 'succeeded'].includes(progress.phase) ||
          !Array.isArray(progress.priorRunIds) ||
          progress.priorRunIds.length > 100 ||
          progress.priorRunIds.some((id) => !integer(id)) ||
          excludedRunIds.some((id) => !progress.priorRunIds.includes(id)) ||
          excludedDispatchIds.includes(progress.dispatchId) ||
          (progress.runId !== undefined && !integer(progress.runId))
        )
          fail('saved dispatch identity mismatch');
        validateTimes(progress, tick());
        progress = structuredClone(progress);
      } else {
        const prior = await runs(sha);
        const dispatchId = newId();
        if (!UUID.test(dispatchId) || excludedDispatchIds.includes(dispatchId))
          fail('invalid correlation identity');
        progress = {
          operation,
          sha,
          dispatchId,
          phase: 'intent',
          intentAt: new Date(tick()).toISOString(),
          priorRunIds: [...new Set([...prior.map((run) => run.id), ...excludedRunIds])],
        };
        if (progress.priorRunIds.length > 100) fail('bounded excluded run inventory required');
        validateTimes(progress, tick());
        await saveProgress(progress); // Durable intent precedes the one possible mutation.
        await guard();
        await currentMain(sha);
        await checkLate(sha);
        await guard();
        await currentMain(sha);
        tick();
        await postDispatch({
          ref: 'main',
          inputs: { reviewed_sha: sha, operation, dispatch_id: dispatchId },
        });
        progress = { ...progress, phase: 'submitted', submittedAt: new Date(tick()).toISOString() };
        validateTimes(progress, tick());
        await saveProgress(progress);
      }
      for (;;) {
        await guard();
        await currentMain(sha);
        const matches = (await runs(sha)).filter((run) => run.display_title === title(progress));
        if (matches.length > 1) fail('ambiguous correlated runs; no redispatch');
        const run = structuredClone(
          progress.runId === undefined
            ? matches[0]
            : await reader.getJson(`actions/runs/${progress.runId}`),
        );
        if (run) {
          validateRun(run, progress);
          if (progress.runId === undefined) {
            progress = { ...progress, runId: run.id, phase: 'observed' };
            await saveProgress(progress);
          }
          if (run.status === 'completed') {
            if (run.conclusion !== 'success') fail('workflow failed; no redispatch');
            const kind =
              operation === 'preflight' ? 'clinicos-demo-preflight' : 'clinicos-demo-backend';
            const proof = await reader.artifact(run, kind);
            validateReceipt(proof.receipt, run, kind, now(), DEMO_SOURCE_POLICIES.exact);
            await currentMain(sha);
            // Re-read attempt and identity after artifact retrieval to reject a concurrent rerun.
            const finalRun = await reader.getJson(`actions/runs/${run.id}`);
            validateRun(finalRun, progress);
            if (finalRun.status !== 'completed' || finalRun.conclusion !== 'success')
              fail('completed run changed');
            progress = { ...progress, phase: 'succeeded' };
            await saveProgress(progress);
            await guard();
            await currentMain(sha);
            return {
              ...proof,
              runUrl: `https://github.com/${REPO}/actions/runs/${run.id}`,
              progress,
            };
          }
          if (!['queued', 'in_progress', 'waiting', 'pending', 'requested'].includes(run.status))
            fail('unrecognized run status');
        }
        if (tick() - started >= timeoutMs)
          fail('run discovery or completion timed out; no redispatch');
        await delay(Math.min(pollMs, timeoutMs - (tick() - started)));
      }
    },
  };
}

// Only an explicit, authenticated recovery may retire a settled no-run intent.
export async function verifyRetiredExactDispatches({
  reader,
  dispatches = {},
  blockedAt,
  now = Date.now,
  delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  retirementProof,
  recoveries = [],
  excludedDispatches = [],
}) {
  const retiredRunIds = [], retiredRuns = [], noRunProofs = [];
  let lastClock = now();
  const clock = () => {
    const value = now();
    if (!Number.isSafeInteger(value) || value < lastClock) fail('retirement clock invalid');
    lastClock = value;
    return value;
  };
  if (!Number.isSafeInteger(lastClock) || lastClock < 0 || typeof delay !== 'function')
    fail('retirement clock invalid');
  for (const [operation, progress] of Object.entries(dispatches)) {
    if (
      operation !== progress?.operation ||
      !['preflight', 'deploy'].includes(progress?.operation) ||
      !SHA.test(progress.sha ?? '') ||
      !UUID.test(progress.dispatchId ?? '') ||
      !Array.isArray(progress.priorRunIds) ||
      progress.priorRunIds.length > 100 ||
      progress.priorRunIds.some((id) => !integer(id)) ||
      (progress.runId !== undefined && !integer(progress.runId)) ||
      !['intent', 'submitted', 'observed', 'succeeded'].includes(progress.phase)
    )
      fail('retired dispatch identity mismatch');
    const origin = validateTimes(progress, clock(), blockedAt);
    const inventory = () => dispatchInventory(reader, progress.sha);
    const matches = async () =>
      (await inventory()).filter((run) => run.display_title === title(progress));
    let run;
    if (progress.runId) {
      const correlated = await matches();
      if (correlated.length !== 1 || correlated[0].id !== progress.runId)
        fail('known retired dispatch missing or ambiguous');
      run = await reader.getJson(`actions/runs/${progress.runId}`);
      if (!sameProof(runProof(run ?? {}), runProof(correlated[0])))
        fail('retired run inventory/detail proof changed');
    } else {
      const priorProof = retirementProof?.noRunProofs?.find(
        (p) =>
          p.sha === progress.sha &&
          p.operation === progress.operation &&
          p.dispatchId === progress.dispatchId,
      );
      const correlated = await matches();
      if (correlated.length > 1) fail('ambiguous old dispatch cannot be recovered');
      if (priorProof) {
        validateNoRunProof(priorProof, progress, blockedAt, clock());
        if (correlated.length) fail('retired no-run proof changed or late run observed');
        noRunProofs.push(structuredClone(priorProof));
        continue;
      }
      if (correlated.length === 1) {
        run = await reader.getJson(`actions/runs/${correlated[0].id}`);
        if (!sameProof(runProof(run ?? {}), runProof(correlated[0])))
          fail('retired run inventory/detail proof changed');
      }
      else {
        if (
          !['intent', 'submitted'].includes(progress.phase) ||
          !Number.isFinite(origin) ||
          clock() - origin < DISPATCH_SETTLE_MS
        )
          fail('uncertain old dispatch is inside settle window or untimed');
        const first = clock();
        await delay(NO_RUN_OBSERVATION_GAP_MS);
        const second = clock();
        if (second - first < NO_RUN_OBSERVATION_GAP_MS)
          fail('retirement observations must be separated in time');
        const secondMatches = await matches();
        clock();
        if (secondMatches.length) fail('late or ambiguous old dispatch cannot be retired');
        noRunProofs.push({
          operation: progress.operation,
          sha: progress.sha,
          dispatchId: progress.dispatchId,
          originAt: new Date(origin).toISOString(),
          firstObservedAt: new Date(first).toISOString(),
          secondObservedAt: new Date(second).toISOString(),
          settleMs: DISPATCH_SETTLE_MS,
          observationGapMs: NO_RUN_OBSERVATION_GAP_MS,
          origin:
            progress.intentAt === undefined
              ? 'durable-block-time'
              : 'latest-trusted-dispatch-or-block-time',
        });
        continue;
      }
    }
    validateRun(run, progress);
    validateCompleted(run);
    if (progress.phase === 'succeeded' && run.conclusion !== 'success')
      fail('retired successful dispatch changed');
    retiredRuns.push(runProof(run));
    retiredRunIds.push(run.id);
  }
  const lateRetiredRunIds = await verifyArchivedDispatches({ reader, recoveries,
    excludedDispatches, clock });
  const identities = new Map();
  for (const proof of [...retiredRuns, ...lateRetiredRunIds.map((p) => p.run)]) {
    if (identities.has(proof.runId) && !sameProof(identities.get(proof.runId), proof))
      fail('same retired run ID has inconsistent dispatch identity');
    identities.set(proof.runId, proof);
  }
  const result = { retiredRunIds, noRunProofs, retiredRuns, lateRetiredRunIds };
  if (retirementProof && !sameProof(result, retirementProof))
    fail('retired dispatch proof identities changed');
  return result;
}

// Historical no-run observations stay immutable. A later explicit recovery may
// additionally retire their single authenticated completed run, never retry POST.
async function verifyArchivedDispatches({ reader, recoveries, excludedDispatches, clock }) {
  if (!Array.isArray(recoveries) || recoveries.length > 100 ||
    !Array.isArray(excludedDispatches) || excludedDispatches.length > 100)
    fail('bounded archived dispatch inventory required');
  const entries = new Map(), knownIds = new Map();
  const key = (p) => `${p.operation}/${p.sha}/${p.dispatchId}`;
  for (const archive of recoveries) {
    for (const [operation, progress] of Object.entries(archive.dispatches ?? {})) {
      if (operation !== progress?.operation || !['preflight', 'deploy'].includes(operation) ||
        !SHA.test(progress.sha ?? '') || !UUID.test(progress.dispatchId ?? '') ||
        !Array.isArray(progress.priorRunIds) || progress.priorRunIds.length > 100 ||
        progress.priorRunIds.some((id) => !integer(id)) ||
        !['intent', 'submitted', 'observed', 'succeeded'].includes(progress.phase) ||
        (progress.runId !== undefined && !integer(progress.runId)))
        fail('archived dispatch identity mismatch');
      const k = key(progress);
      if (entries.has(k)) fail('duplicate archived dispatch identity');
      const noRun = archive.retirementProof?.noRunProofs?.find((p) => key(p) === k);
      if (noRun) validateNoRunProof(noRun, progress, archive.block?.at, clock());
      const known = archive.retirementProof?.retiredRuns?.find((p) => p.displayTitle === title(progress));
      entries.set(k, { progress, noRun, known, runId: progress.runId ?? known?.runId });
    }
  }
  for (const archive of recoveries) {
    for (const proof of archive.retirementProof?.lateRetiredRunIds ?? []) {
      const entry = entries.get(key(proof));
      if (!entry || !integer(proof.runId) ||
        (entry.runId !== undefined && entry.runId !== proof.runId) ||
        (entry.known && !sameProof(entry.known, proof.run)))
        fail('archived late run proof identity mismatch');
      entry.runId = proof.runId;
      entry.known = proof.run;
    }
  }
  for (const p of excludedDispatches) {
    const entry = entries.get(key(p));
    if (!entry || (p.runId !== undefined && entry.runId !== p.runId) ||
      (p.run !== undefined && !sameProof(p.run, entry.known)))
      fail('excluded dispatch missing archived identity');
  }
  if (entries.size > 100) fail('bounded archived dispatch inventory required');
  const result = [];
  for (const [k, { progress, noRun, known, runId }] of entries) {
    const rows = await dispatchInventory(reader, progress.sha);
    const matches = rows.filter((run) => run.display_title === title(progress));
    if (matches.length > 1 || (runId !== undefined &&
      (matches.length !== 1 || matches[0].id !== runId)))
      fail('known archived dispatch missing or ambiguous');
    if (!matches.length) {
      if (!noRun) fail('archived dispatch has no authenticated no-run proof');
      continue;
    }
    const run = await reader.getJson(`actions/runs/${matches[0].id}`);
    validateRun(run, { ...progress, ...(runId === undefined ? {} : { runId }) });
    validateCompleted(run);
    const proof = runProof(run);
    if (!sameProof(proof, runProof(matches[0])) || (known && !sameProof(known, proof)) ||
      (progress.phase === 'succeeded' && run.conclusion !== 'success'))
      fail('archived run proof changed');
    if (knownIds.has(run.id) && knownIds.get(run.id) !== k)
      fail('same archived run ID has inconsistent dispatch identity');
    knownIds.set(run.id, k);
    result.push({ operation: progress.operation, sha: progress.sha,
      dispatchId: progress.dispatchId, runId: run.id, run: proof });
  }
  return result;
}
