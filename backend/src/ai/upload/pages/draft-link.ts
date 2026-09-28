// Documents inside an open intake draft: link a page session, unlink it, merge its AI results
// and decide field proposals. Every write takes job → draft locks like the other draft mutations.
import type { PatientIntakeDraft } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { canAccessOwnedResource } from '../../ownership-policy.js';
import {
  ImportSessionError,
  assertEditable,
  id,
  jsonInput,
  manifest,
  object,
  renewedExpiry,
  type Json,
} from './model.js';
import { lockJob, receipt, saveReceipt } from './repository.js';
import { assertCurrentReview } from './review.js';
import { assertDraftVersion, mutateLinkedDraft, SERVER_DRAFT_KEYS } from './draft-mutations.js';
import { currentGroupUnits, extractionConfig } from './inputs.js';
import { clearPageSession } from './cleanup.js';
import {
  aiDraftFields,
  decideFieldProposal,
  letterResult,
  mergeAiIntoDraft,
} from './draft-merge.js';
import type { GroupResult } from './results.js';

type Actor = { id: string; role: string };
const CLOSED = ['confirmed', 'cancelled', 'expired'];

const linkedElsewhere = () =>
  new ImportSessionError(
    409,
    'import_job_linked',
    'Questi documenti sono già collegati a un’altra scheda',
  );

async function lockDraft(tx: Parameters<typeof lockJob>[0], draftId: string, actor: Actor) {
  await tx.$queryRaw`SELECT "id" FROM "PatientIntakeDraft" WHERE "id"=${draftId} FOR UPDATE`;
  const draft = await tx.patientIntakeDraft.findUnique({ where: { id: draftId } });
  if (!draft || !canAccessOwnedResource(actor, draft.createdById))
    throw new ImportSessionError(404, 'not_found', 'Bozza non trovata');
  return draft;
}

/** POST /intake/drafts/:id/import-job — link an operator's page session to an open draft. */
export async function linkImportJob(
  draftId: string,
  body: unknown,
  actor: Actor,
): Promise<PatientIntakeDraft> {
  const b = object(body);
  const jobId = id(b.importJobId, 'importJobId');
  try {
    return await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "ImportJob" WHERE "id"=${jobId} FOR UPDATE`;
        const job = await tx.importJob.findUnique({ where: { id: jobId } });
        if (!job || !canAccessOwnedResource(actor, job.createdById))
          throw new ImportSessionError(404, 'not_found', 'Sessione non trovata');
        manifest(job.manifest); // 409 session_version for legacy single-shot jobs
        const draft = await lockDraft(tx, draftId, actor);
        // Documents and chart must belong to the same operator, whoever performs the link
        // (admins and managers included): the confirmed patient inherits a single owner.
        if (job.createdById !== draft.createdById)
          throw new ImportSessionError(
            409,
            'owner_mismatch',
            'I documenti e la scheda appartengono a operatori diversi',
          );
        const r = await receipt(tx, job.id, b.requestId, 'link-import', { ...b, draftId });
        if (r.previous) return draft;
        if (draft.status !== 'draft')
          throw new ImportSessionError(409, 'draft_closed', 'La bozza è già confermata');
        if (CLOSED.includes(job.status) || job.createdPatientId)
          throw new ImportSessionError(409, 'session_closed', 'Sessione non modificabile');
        if (draft.importJobId)
          throw new ImportSessionError(409, 'draft_linked', 'La scheda ha già documenti collegati');
        assertDraftVersion(draft, b.expectedDraftVersion);
        const other = await tx.patientIntakeDraft.findUnique({
          where: { importJobId: job.id },
          select: { id: true },
        });
        if (other) throw linkedElsewhere();
        const updated = await tx.patientIntakeDraft.update({
          where: { id: draftId },
          data: { importJobId: job.id, version: { increment: 1 } },
        });
        await tx.importJob.update({ where: { id: job.id }, data: { expiresAt: renewedExpiry() } });
        await saveReceipt(tx, job.id, r, 'link-import', job.manifestRevision, {
          draftId,
          version: updated.version,
        });
        return updated;
      },
      { timeout: 30000, maxWait: 15000 },
    );
  } catch (error) {
    // The @unique on importJobId is the last word on a concurrent second link.
    if ((error as { code?: string })?.code === 'P2002') throw linkedElsewhere();
    throw error;
  }
}

/**
 * DELETE /intake/drafts/:id/import-job — allowed until the final merge attached `_importSource`.
 * Cancels the session (its temporary documents are cleared) and keeps every value in the draft;
 * the AI bookkeeping goes with the source, so the remaining values become the operator's.
 */
export async function unlinkImportJob(
  draftId: string,
  body: unknown,
  actor: Actor,
): Promise<PatientIntakeDraft> {
  const b = object(body);
  const hint = await prisma.patientIntakeDraft.findUnique({
    where: { id: draftId },
    select: { importJobId: true },
  });
  if (!hint) throw new ImportSessionError(404, 'not_found', 'Bozza non trovata');
  if (!hint.importJobId)
    throw new ImportSessionError(409, 'draft_not_linked', 'La scheda non ha documenti collegati');
  return prisma.$transaction(
    async (tx) => {
      const job = await lockJob(tx, hint.importJobId!);
      if (!canAccessOwnedResource(actor, job.createdById))
        throw new ImportSessionError(404, 'not_found', 'Sessione non trovata');
      const draft = await lockDraft(tx, draftId, actor);
      if (draft.importJobId !== job.id)
        throw new ImportSessionError(409, 'draft_not_linked', 'La scheda è cambiata. Ricarica.');
      if (draft.status !== 'draft')
        throw new ImportSessionError(409, 'draft_closed', 'La bozza è già confermata');
      if (b.expectedDraftVersion !== undefined) assertDraftVersion(draft, b.expectedDraftVersion);
      const data = object(draft.data);
      if (data._importSource)
        throw new ImportSessionError(
          409,
          'import_source_attached',
          'I documenti sono già stati uniti alla scheda e non possono essere scollegati',
        );
      if (job.status === 'confirmed' || job.createdPatientId)
        throw new ImportSessionError(409, 'session_closed', 'Sessione già confermata');
      if (!['cancelled', 'expired'].includes(job.status))
        await clearPageSession(tx, job.id, 'cancelled');
      const kept: Json = Object.fromEntries(
        Object.entries(data).filter(
          ([key]) => !(SERVER_DRAFT_KEYS as readonly string[]).includes(key),
        ),
      );
      return tx.patientIntakeDraft.update({
        where: { id: draftId },
        data: { importJobId: null, data: jsonInput(kept), version: { increment: 1 } },
      });
    },
    { timeout: 30000, maxWait: 15000 },
  );
}

/**
 * POST /intake/drafts/:id/merge-import.
 * Final: `{ requestId, expectedDraftVersion, manifestRevision, resultHash }` — the current,
 * fully resolved review. Letter: `{ requestId, expectedDraftVersion, groupId?, resultHash? }` —
 * completed units of the current input hash only (all current letters when groupId is absent);
 * a letter already merged at the same input hash is skipped.
 */
export function mergeImportIntoDraft(draftId: string, body: unknown) {
  const raw = object(body);
  const final = raw.mode === 'final' || raw.manifestRevision !== undefined;
  return mutateLinkedDraft(
    draftId,
    body,
    'merge-import',
    {},
    async ({ tx, job, existing, body: b }) => {
      if (final) {
        const result = assertCurrentReview(job, {
          manifestRevision: b.manifestRevision,
          resultHash: b.resultHash,
        });
        const groupIds = ((result._groups ?? []) as GroupResult[]).map((g) => g.groupId);
        return mergeAiIntoDraft(existing, { fields: aiDraftFields(result), result }, 'final', {
          groupIds,
        }).data;
      }
      assertEditable(job.status);
      const m = manifest(job.manifest);
      const requested = b.groupId === undefined ? undefined : id(b.groupId, 'groupId');
      if (requested && !m.groups.some((g) => g.id === requested))
        throw new ImportSessionError(404, 'group_not_found', 'Lettera non trovata');
      const [documents, units] = await Promise.all([
        tx.importDocument.findMany({
          where: { jobId: job.id },
          select: { id: true, sha256: true },
        }),
        tx.importProcessingUnit.findMany({
          where: { jobId: job.id },
          select: {
            id: true,
            kind: true,
            unitKey: true,
            inputHash: true,
            outputHash: true,
            status: true,
          },
        }),
      ]);
      const current = currentGroupUnits(
        m,
        new Map(documents.map((d) => [d.id, d.sha256])),
        units,
        extractionConfig().digest,
      );
      const order = [...m.groups]
        .sort((a, c) => a.sortOrder - c.sortOrder)
        .map((g) => g.id)
        .filter((g) => !requested || g === requested);
      let data = existing;
      let merged = 0;
      for (const groupId of order) {
        const { inputHash, unit } = current.groups.get(groupId)!;
        if (unit?.status !== 'completed') {
          if (requested)
            throw new ImportSessionError(
              409,
              'group_not_ready',
              'La lettera non ha ancora un risultato aggiornato',
            );
          continue;
        }
        if (requested && b.resultHash !== undefined && b.resultHash !== unit.outputHash)
          throw new ImportSessionError(
            409,
            'group_result_outdated',
            'Il risultato della lettera è cambiato. Ricarica.',
          );
        if (object(object(data._aiMerge).groups)[groupId] === inputHash) continue;
        const row = await tx.importProcessingUnit.findUniqueOrThrow({
          where: { id: unit.id },
          select: { result: true },
        });
        const group = row.result as unknown as GroupResult;
        data = mergeAiIntoDraft(data, { fields: aiDraftFields(letterResult(group)) }, 'letter', {
          groupIds: [groupId],
          groupId,
          inputHash,
        }).data;
        merged++;
      }
      return merged ? data : null;
    },
  );
}

/** POST /intake/drafts/:id/field-proposals/:pid/decide `{ action: 'apply'|'keep', ... }`. */
export function decideDraftFieldProposal(draftId: string, proposalIdValue: string, body: unknown) {
  const pid = id(proposalIdValue, 'proposalId');
  return mutateLinkedDraft(
    draftId,
    body,
    'field-proposal',
    { proposalId: pid },
    ({ existing, body: b }) => decideFieldProposal(existing, pid, b.action),
  );
}
