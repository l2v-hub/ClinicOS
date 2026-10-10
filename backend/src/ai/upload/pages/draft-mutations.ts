import type { PatientIntakeDraft } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import {
  ImportSessionError,
  canonical,
  hash,
  id,
  jsonInput,
  object,
  renewedExpiry,
  type Json,
  type Tx,
} from './model.js';
import { lockJob, receipt, saveReceipt } from './repository.js';
import { assertCurrentReview, assertDraftSource } from './review.js';
import { refreshedPageData } from './draft-source.js';
import { sameTherapySource } from '../../../intake/therapy-source-inventory.js';

export const IMMUTABLE_DRAFT_FIELDS = [
  '_narrative',
  '_sections',
  '_terapiaText',
  '_confirmation',
  '_importedFields',
  '_importSource',
  '_importProposals',
  '_importReview',
];
/** Server-owned AI merge keys: silently dropped from client PATCH payloads (never rejected). */
export const SERVER_DRAFT_KEYS = ['_fieldOrigin', '_fieldProposals', '_aiMerge'] as const;
export const draftLinkChanged = () =>
  new ImportSessionError(
    409,
    'draft_link_changed',
    'I documenti collegati alla scheda sono cambiati. Ricarica e riprova.',
    { retryable: true },
  );
export function assertDraftVersion(draft: PatientIntakeDraft, expected: unknown, required = true) {
  if (!required && expected === undefined) return;
  if (!Number.isSafeInteger(expected) || expected !== draft.version)
    throw new ImportSessionError(
      409,
      'draft_version_conflict',
      'La bozza è cambiata. Ricarica prima di salvare.',
      { currentVersion: draft.version, draft },
    );
}

export async function draftPatchReceipt(tx: Tx, draft: PatientIntakeDraft, body: Json) {
  if (!draft.importJobId || !object(draft.data)._importSource) return null;
  const key = body.requestId ?? `patch-${hash([draft.id, body.expectedDraftVersion])}`;
  try {
    return await receipt(tx, draft.importJobId, key, 'draft-patch', { draftId: draft.id, ...body });
  } catch (error) {
    // A second edit at the same automatic version key is a stale autosave, not
    // client misuse of an explicitly supplied idempotency key.
    if (
      body.requestId === undefined &&
      error instanceof ImportSessionError &&
      error.code === 'idempotency_conflict'
    )
      assertDraftVersion(draft, body.expectedDraftVersion);
    throw error;
  }
}

export function guardPageRows(previous: Json, patch: Json, result: Json | undefined) {
  if (patch.terapiaImport === undefined) return;
  const before = Array.isArray(previous.terapiaImport) ? (previous.terapiaImport as Json[]) : [];
  if (!Array.isArray(patch.terapiaImport) ||
    (previous._importSource ? patch.terapiaImport.length !== before.length : patch.terapiaImport.length < before.length))
    throw new ImportSessionError(
      400,
      'immutable_source',
      'Aggiungi le nuove terapie tramite le proposte della revisione',
    );
  patch.terapiaImport.forEach((value, index) => {
    const row = object(value),
      old = object(before[index]);
    // Existing import evidence is server-owned. Legacy appended rows have no
    // prior source and retain their existing creation path.
    if (index < before.length && canonical(row.originalText) !== canonical(old.originalText))
      throw new ImportSessionError(
        400,
        'immutable_source',
        'Il testo originale della terapia non può essere modificato',
      );
    for (const key of ['importSource', 'importSources', 'conflictDeferred', 'conflictId',
      'sourceKind', 'structuredSource', 'structuredOccurrenceKey', 'importRowKey']) {
      if (canonical(row[key]) !== canonical(old[key]))
        throw new ImportSessionError(
          400,
          'immutable_source',
          'La provenienza della terapia non può essere modificata',
        );
    }
    if (old.conflictDeferred === true && row.excludedFromConfirm !== true)
      throw new ImportSessionError(
        409,
        'conflict_deferred',
        'La terapia rinviata non può essere prescritta',
      );
    const changed =
      row.sourceOutdated !== old.sourceOutdated || row.sourceReviewHash !== old.sourceReviewHash;
    if (!changed) return;
    if (
      !result ||
      old.sourceOutdated !== true ||
      row.sourceOutdated !== false ||
      row.stato !== 'ok' ||
      !Object.keys(object(row.reviewedTherapy)).length ||
      row.sourceReviewHash !== object(result._source).resultHash
    )
      throw new ImportSessionError(
        409,
        'source_review_required',
        'Verifica esplicitamente la terapia rispetto alle nuove pagine',
      );
    assertDraftSource(previous, result);
  });
}

export type LinkedDraftChange = (ctx: {
  tx: Tx;
  job: Awaited<ReturnType<typeof lockJob>>;
  draft: PatientIntakeDraft;
  existing: Json;
  body: Json;
}) => Promise<Json | null> | Json | null;

/**
 * Shared locked mutation of a draft linked to a page session: job lock → draft lock →
 * idempotency receipt → state and version checks → change → version bump + receipt.
 * `change` returning null means "nothing to write" (receipt still recorded).
 */
export async function mutateLinkedDraft(
  idValue: string,
  body: unknown,
  action: string,
  receiptExtra: Json,
  change: LinkedDraftChange,
) {
  const b = object(body);
  const hint = await prisma.patientIntakeDraft.findUniqueOrThrow({
    where: { id: idValue },
    select: { importJobId: true },
  });
  if (!hint.importJobId)
    throw new ImportSessionError(
      409,
      'session_version',
      'La bozza non è associata a una sessione multipagina',
    );
  return prisma.$transaction(
    async (tx) => {
      const job = await lockJob(tx, hint.importJobId!);
      await tx.$queryRaw`SELECT "id" FROM "PatientIntakeDraft" WHERE "id"=${idValue} FOR UPDATE`;
      const draft = await tx.patientIntakeDraft.findUniqueOrThrow({ where: { id: idValue } });
      // The link may have changed between the unlocked hint and the locks.
      if (draft.importJobId !== job.id) throw draftLinkChanged();
      const r = await receipt(tx, job.id, b.requestId, action, {
        ...b,
        draftId: idValue,
        ...receiptExtra,
      });
      if (r.previous) return draft;
      if (draft.status !== 'draft')
        throw new ImportSessionError(409, 'draft_closed', 'La bozza è già confermata');
      assertDraftVersion(draft, b.expectedDraftVersion);
      const data = await change({ tx, job, draft, existing: object(draft.data), body: b });
      const updated = data
        ? await tx.patientIntakeDraft.update({
            where: { id: idValue },
            data: { data: jsonInput(data), version: { increment: 1 } },
          })
        : draft;
      if (!['cancelled', 'expired', 'confirmed'].includes(job.status))
        await tx.importJob.update({ where: { id: job.id }, data: { expiresAt: renewedExpiry() } });
      await saveReceipt(tx, job.id, r, action, job.manifestRevision, {
        draftId: idValue,
        version: updated.version,
      });
      return updated;
    },
    { timeout: 30000, maxWait: 15000 },
  );
}

function mutateDraft(
  idValue: string,
  body: unknown,
  action: 'refresh-import' | 'import-proposal',
  proposalId?: string,
) {
  return mutateLinkedDraft(idValue, body, action, { proposalId }, ({ job, existing, body: b }) => {
    const result = assertCurrentReview(job, action === 'refresh-import' ? b : undefined);
    if (action === 'refresh-import') return refreshedPageData(existing, result);
    assertDraftSource(existing, result);
    const proposals = Array.isArray(existing._importProposals)
      ? (structuredClone(existing._importProposals) as Json[])
      : [];
    const proposal = proposals.find((p) => p.id === id(proposalId, 'proposalId'));
    if (!proposal || !['add', 'defer'].includes(String(b.action)))
      throw new ImportSessionError(400, 'invalid_proposal', 'Proposta non valida');
    if (proposal.status !== 'pending')
      throw new ImportSessionError(409, 'proposal_decided', 'La proposta è già stata gestita');
    const rows = Array.isArray(existing.terapiaImport) ? [...existing.terapiaImport] : [];
    if (b.action === 'add') {
      if (object(proposal.row).conflictDeferred)
        throw new ImportSessionError(
          409,
          'conflict_deferred',
          'La terapia rinviata non può essere aggiunta',
        );
      if (rows.some((row) => sameTherapySource(object(row), object(proposal.row))))
        throw new ImportSessionError(
          409,
          'proposal_duplicate',
          'Questa terapia è già presente nella bozza',
        );
      rows.push({ ...object(proposal.row), stato: 'da_verificare' });
    }
    proposal.status = b.action === 'add' ? 'added' : 'deferred';
    return { ...existing, terapiaImport: rows, _importProposals: proposals };
  });
}
export const refreshImportDraft = (draftId: string, body: unknown) =>
  mutateDraft(draftId, body, 'refresh-import');
export const decideImportProposal = (draftId: string, proposalId: string, body: unknown) =>
  mutateDraft(draftId, body, 'import-proposal', proposalId);
