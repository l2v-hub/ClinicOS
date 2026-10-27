import type { DraftResponse } from '../intake/intakeDraftApi';
import { assertSessionJob, ImportApiError } from './importSessionApi';
import { opaqueKey, type ImportJob } from './importSessionTypes';

export interface ExpiredDraftRecovery {
  job: ImportJob;
  draft: { id: string; expectedVersion: number };
}
export interface DraftResumeIntent extends ExpiredDraftRecovery {
  requestId: string;
}

/** Presentation eligibility only: the server rechecks current ownership and association. */
export function expiredDraftRecovery(
  draft: DraftResponse | null,
  error: unknown,
): ExpiredDraftRecovery | null {
  if (
    !draft ||
    draft.status !== 'draft' ||
    draft.confirmedPatientId ||
    typeof draft.id !== 'string' ||
    !draft.id.trim() ||
    typeof draft.importJobId !== 'string' ||
    !draft.importJobId.trim() ||
    !Number.isSafeInteger(draft.version) ||
    draft.version! < 0 ||
    !(error instanceof ImportApiError) ||
    error.status !== 410 ||
    error.code !== 'session_terminal' ||
    !error.job ||
    error.job.status !== 'expired'
  )
    return null;
  const job = error.job;
  // Use the existing protocol validator; an expired, compatible job intentionally throws
  // a terminal error carrying that exact validated snapshot.
  try {
    assertSessionJob(job);
    return null;
  } catch (validated) {
    if (!(validated instanceof ImportApiError) || validated.job !== job) return null;
  }
  if (
    job.id !== draft.importJobId ||
    job.review?.draftId !== draft.id ||
    job.totalBytes !== 0 ||
    job.documents.length ||
    job.manifest.pages.length ||
    job.manifest.groups.length
  )
    return null;
  return { job, draft: { id: draft.id, expectedVersion: draft.version! } };
}

/** An uncertain response retains the exact operation, never a fresh key or refreshed body. */
export function draftResumeIntent(
  candidate: ExpiredDraftRecovery,
  previous: DraftResumeIntent | null,
  newKey: () => string = opaqueKey,
): DraftResumeIntent {
  if (previous) {
    if (
      previous.job.id !== candidate.job.id ||
      previous.draft.id !== candidate.draft.id ||
      previous.job.manifest.revision !== candidate.job.manifest.revision ||
      previous.draft.expectedVersion !== candidate.draft.expectedVersion
    )
      throw new Error('La pratica è cambiata. Rileggi lo stato prima di riprovare.');
    return previous;
  }
  return { ...structuredClone(candidate), requestId: newKey() };
}
