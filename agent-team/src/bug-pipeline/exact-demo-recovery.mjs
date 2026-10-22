import { randomUUID } from 'node:crypto';

export const EXACT_BLOCK_CODES = Object.freeze([
  'EXACT_MAIN_CHANGED',
  'EXACT_PREFLIGHT_EXPIRED',
  'EXACT_RUN_FAILED',
  'PRODUCTION_BINDING_REQUIRED',
  'EXACT_DISPATCH_BLOCKED',
  'PRODUCTION_RUN_REQUIRED',
  'PRODUCTION_RUN_PENDING_TIMEOUT',
  'PRODUCTION_PROOF_FAILED',
]);
const SHA = /^[a-f0-9]{40}$/;
export function exactBlockCode(error) {
  if (error?.code === 'PRODUCTION_RUN_PENDING') return 'PRODUCTION_PROOF_FAILED';
  if (EXACT_BLOCK_CODES.includes(error?.code)) return error.code;
  if (/current main changed|saved dispatch identity mismatch/.test(error?.message ?? ''))
    return 'EXACT_MAIN_CHANGED';
  if (/preflight expired/.test(error?.message ?? '')) return 'EXACT_PREFLIGHT_EXPIRED';
  if (/workflow failed/.test(error?.message ?? '')) return 'EXACT_RUN_FAILED';
  return 'EXACT_DISPATCH_BLOCKED';
}
export function archivedRunIds(batch) {
  const values = [
    batch.exactDemoDispatches,
    ...(batch.exactReleaseRecoveries ?? []).map((x) => x.dispatches),
  ];
  const ids = [
    ...new Set([
      ...(batch.exactDemoRecovery?.excludedRunIds ?? []),
      ...(batch.exactReleaseRecoveries ?? []).flatMap((archive) => [
        ...(archive.excludedRunIds ?? []),
        ...(archive.retirementProof?.lateRetiredRunIds ?? []).map((proof) => proof.runId),
      ]),
      ...values.flatMap((value) =>
        Object.values(value ?? {}).flatMap((p) => [
          ...(p.priorRunIds ?? []),
          ...(p.runId ? [p.runId] : []),
        ]),
      ),
    ]),
  ];
  if (ids.length > 100 || ids.some((id) => !Number.isSafeInteger(id) || id <= 0))
    throw Error('bounded excluded run inventory required');
  return ids;
}
export async function verifyReleaseAncestry({ reader, originalMergeSha, deploymentSha }) {
  if (!SHA.test(originalMergeSha ?? '') || !SHA.test(deploymentSha ?? ''))
    throw Error('exact merge ancestry identity required');
  const main = await reader.getJson('commits/main');
  if (main?.sha !== deploymentSha) throw Error('current main changed during ancestry verification');
  if (originalMergeSha !== deploymentSha) {
    const result = await reader.getJson(`compare/${originalMergeSha}...${deploymentSha}`);
    if (
      result?.base_commit?.sha !== originalMergeSha ||
      result?.merge_base_commit?.sha !== originalMergeSha ||
      result?.status !== 'ahead' ||
      !Number.isSafeInteger(result.ahead_by) ||
      result.ahead_by < 1 ||
      result.behind_by !== 0
    )
      throw Error('original merge is not an authenticated ancestor of current main');
    // The compare route is fixed to both full SHAs; authenticate its head via the last commit.
    if (!Array.isArray(result.commits) || result.commits.at(-1)?.sha !== deploymentSha)
      throw Error('comparison head identity unavailable');
  }
  if ((await reader.getJson('commits/main'))?.sha !== deploymentSha)
    throw Error('current main changed during ancestry verification');
  return { originalMergeSha, deploymentSha };
}
export function archiveRecovery(
  batch,
  {
    actor,
    deploymentSha,
    extraRunIds = [],
    retirementProof = { retiredRunIds: [], noRunProofs: [] },
    newId = randomUUID,
    now = Date.now,
  },
) {
  const excludedRunIds = [...new Set([...archivedRunIds(batch), ...extraRunIds])];
  if (
    excludedRunIds.length > 100 ||
    excludedRunIds.some((id) => !Number.isSafeInteger(id) || id <= 0)
  )
    throw Error('bounded excluded run inventory required');
  const id = newId();
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id) ||
    (batch.exactReleaseRecoveries ?? []).some((x) => x.id === id)
  )
    throw Error('fresh recovery UUID required');
  const archive = {
    id,
    actor,
    at: new Date(now()).toISOString(),
    subjectSha: batch.sha,
    block: structuredClone(batch.releaseBlock),
    dispatches: structuredClone(batch.exactDemoDispatches ?? {}),
    release: structuredClone(batch.release ?? null),
    excludedRunIds,
    retirementProof: structuredClone(retirementProof),
    deploymentSha,
  };
  batch.exactReleaseRecoveries = [...(batch.exactReleaseRecoveries ?? []), archive];
  batch.exactDemoDispatches = {};
  const excludedDispatchIds = [
    ...new Set(
      [batch.exactDemoDispatches, ...batch.exactReleaseRecoveries.map((x) => x.dispatches)].flatMap(
        (value) =>
          Object.values(value ?? {})
            .map((p) => p.dispatchId)
            .filter(Boolean),
      ),
    ),
  ];
  if (excludedDispatchIds.length > 100 || excludedDispatchIds.includes(id))
    throw Error('fresh bounded recovery identity required');
  batch.exactDemoRecovery = {
    id,
    deploymentSha,
    excludedRunIds,
    excludedDispatchIds,
    excludedDispatches: batch.exactReleaseRecoveries
      .flatMap((x) => Object.values(x.dispatches ?? {}))
      .map(({ operation, sha, dispatchId, runId }) => {
        const late = batch.exactReleaseRecoveries.flatMap(
          (x) => x.retirementProof?.lateRetiredRunIds ?? [],
        ).find((p) => p.operation === operation && p.sha === sha && p.dispatchId === dispatchId);
        const known = late?.run ?? batch.exactReleaseRecoveries.flatMap(
          (x) => x.retirementProof?.retiredRuns ?? [],
        ).find((p) => p.displayTitle === `demo-exact ${operation} ${sha} ${dispatchId}`);
        const knownId = late?.runId ?? runId ?? known?.runId;
        return { operation, sha, dispatchId,
          ...(knownId === undefined ? {} : { runId: knownId }),
          ...(known === undefined ? {} : { run: structuredClone(known) }) };
      })
      .filter(
        (value, index, values) =>
          values.findIndex(
            (p) =>
              p.operation === value.operation &&
              p.sha === value.sha &&
              p.dispatchId === value.dispatchId,
          ) === index,
      ),
    postMerge: Boolean(batch.release?.mergeSha),
  };
  delete batch.releaseBlock;
  delete batch.releaseHold;
  if (batch.release) {
    batch.release.status = 'merged';
    batch.release.deploymentSha = deploymentSha;
    delete batch.release.deployment;
    delete batch.release.publication;
  }
  return archive;
}
