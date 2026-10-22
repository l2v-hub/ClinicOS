// Automatic controllers never inherit an operator's subjects or release authority.
export const OWNERSHIP_COLLECTIONS = ['batches', 'manualBatches', 'standaloneReviews'];

const subjectKey = ({ collection, id }) => `${collection}:${id}`;
const validIdentity = (entry) =>
  entry &&
  OWNERSHIP_COLLECTIONS.includes(entry.collection) &&
  typeof entry.id === 'string' &&
  entry.id.length > 0;

export function automationPaused(state) {
  if (!state.operatorTakeover?.active) return false;
  const handback = state.operatorTakeover.automation;
  return !(
    handback?.enabled === true &&
    handback.mode === 'new-unclaimed-only' &&
    Array.isArray(handback.protectedSubjects) &&
    handback.protectedSubjects.every(validIdentity)
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
