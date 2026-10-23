// Automatic controllers never inherit an operator's subjects or release authority.
export const OWNERSHIP_COLLECTIONS = ['batches', 'manualBatches', 'standaloneReviews'];

const subjectKey = ({ collection, id }) => `${collection}:${id}`;
const validIdentity = (entry) =>
  entry &&
  OWNERSHIP_COLLECTIONS.includes(entry.collection) &&
  typeof entry.id === 'string' &&
  entry.id.length > 0;

// Audit fields describe the authorized canonical handback; they never authenticate
// a GitHub actor themselves. Only the trusted state writer may record this grant.
export function validAutomationHandback(handback) {
  return Boolean(
    handback &&
    typeof handback === 'object' &&
    !Array.isArray(handback) &&
    typeof handback.enabled === 'boolean' &&
    handback.mode === 'new-unclaimed-only' &&
    typeof handback.takeoverNonce === 'string' &&
    handback.takeoverNonce.trim() &&
    typeof handback.authorizedActor === 'string' &&
    handback.authorizedActor.trim() &&
    typeof handback.handedBackAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(handback.handedBackAt) &&
    Number.isFinite(Date.parse(handback.handedBackAt)) &&
    new Date(handback.handedBackAt).toISOString().replace('.000Z', 'Z') ===
      handback.handedBackAt.replace('.000Z', 'Z') &&
    Array.isArray(handback.protectedSubjects) &&
    handback.protectedSubjects.every(validIdentity),
  );
}

export function validOperatorTakeover(takeover) {
  return Boolean(
    takeover &&
    typeof takeover === 'object' &&
    !Array.isArray(takeover) &&
    (!Object.hasOwn(takeover, 'active') || typeof takeover.active === 'boolean') &&
    (takeover.nonce === undefined ||
      (typeof takeover.nonce === 'string' && takeover.nonce.trim())) &&
    (takeover.automation === undefined || validAutomationHandback(takeover.automation)),
  );
}

export function automationPaused(state) {
  const takeover = state.operatorTakeover;
  if (takeover === undefined) return false;
  if (!validOperatorTakeover(takeover)) return true;
  // Older budget-audit records without active are not an active takeover.
  if (takeover.active !== true) return false;
  const handback = takeover.automation;
  return !(
    validAutomationHandback(handback) &&
    handback.enabled === true &&
    typeof state.operatorTakeover.nonce === 'string' &&
    state.operatorTakeover.nonce.trim() &&
    handback.takeoverNonce === state.operatorTakeover.nonce
  );
}

export function operatorOwns(state, collection, subject) {
  if (automationPaused(state)) return true;
  const takeover = state.operatorTakeover;
  const key = subjectKey({ collection, id: subject.id });
  if (
    [...(takeover?.subjects ?? []), ...(takeover?.automation?.protectedSubjects ?? [])].some(
      (entry) => validIdentity(entry) && subjectKey(entry) === key,
    )
  )
    return true;
  if (subject.operatorCoordination?.active === true) return true;
  const release = subject.operatorReleaseCoordination;
  return Boolean(
    release &&
    !(
      release.status === 'finished' ||
      release.stage === 'finished' ||
      (typeof release.finishedAt === 'string' && release.finishedAt.trim())
    ),
  );
}

export function claimedIssues(state) {
  return new Set(
    OWNERSHIP_COLLECTIONS.flatMap((collection) =>
      (state[collection] ?? []).flatMap((subject) => subject.issues ?? []),
    ),
  );
}

export function occupiedSubjects(state) {
  return OWNERSHIP_COLLECTIONS.flatMap((collection) =>
    (state[collection] ?? [])
      .filter((subject) => !['merged', 'deployed'].includes(subject.release?.status))
      .map((subject) => ({
        collection,
        id: subject.id,
        issues: subject.issues ?? [],
        feature: subject.plan?.feature ?? '',
        scope: [
          ...new Set([
            ...(subject.plan?.scope ?? []),
            ...(subject.sourceManifest ?? []).map((file) => file.path),
          ]),
        ],
      })),
  );
}
