import type { ConfirmPatient } from '../ImportReviewFull';
import { createDraftFromImport, getDraft, patchDraftWithRecovery } from '../intake/intakeDraftApi';
import { reviewedDraftPatch } from './importReviewModel';
import type { ImportSessionApi } from './importSessionApi';
import type { ImportActor, ImportSource } from './importSessionTypes';

interface ReviewIntent {
  jobId: string;
  source: ImportSource;
  patient: ConfirmPatient;
  cartella: Record<string, unknown>;
  patch?: Record<string, unknown>;
}

/** Keep an uncertain first handoff in memory until its untouched seed is recovered. */
export class ImportReviewHandoff {
  private intent: ReviewIntent | null = null;

  get pending() {
    return this.intent !== null;
  }

  async complete(
    jobId: string,
    source: ImportSource,
    actor: ImportActor,
    api: Pick<ImportSessionApi, 'get'>,
    review?: { patient: ConfirmPatient; cartella: Record<string, unknown> },
  ) {
    if (
      this.intent &&
      (this.intent.jobId !== jobId ||
        this.intent.source.manifestRevision !== source.manifestRevision ||
        this.intent.source.resultHash !== source.resultHash)
    )
      throw new Error('La fonte è cambiata. Riapri la revisione prima di proseguire.');
    const latest = await api.get(jobId);
    if (latest.review.draftId && !latest.review.draftSourceIsCurrent)
      throw new Error(
        'La bozza richiede la revisione delle nuove pagine. Le modifiche sono conservate.',
      );
    if (latest.review.draftId && !this.intent)
      return { draftId: latest.review.draftId, job: latest };
    if (!this.intent) {
      if (!review) throw new Error('Rivedi i dati prima di creare la bozza.');
      this.intent = structuredClone({ jobId, source, ...review });
    }
    const intent = this.intent;
    const draft = latest.review.draftId
      ? await getDraft(latest.review.draftId, actor)
      : await createDraftFromImport(jobId, actor, intent.source);
    if (draft.version === undefined)
      throw new Error('Versione della bozza non disponibile. Riprova prima di proseguire.');
    // A later version can contain another operator's edits and must never be reseeded.
    if (draft.version === 0) {
      intent.patch ??= reviewedDraftPatch(draft.data, intent.patient, intent.cartella);
      await patchDraftWithRecovery(draft.id, intent.patch, actor, 0);
    }
    this.intent = null;
    return { draftId: draft.id, job: latest };
  }
}
