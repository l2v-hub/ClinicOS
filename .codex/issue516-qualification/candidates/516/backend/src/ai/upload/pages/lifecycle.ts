import { randomUUID } from 'node:crypto';
import { prisma } from '../../../lib/prisma.js';
import { canAccessOwnedResource } from '../../ownership-policy.js';
import { getPageJob, lockJob, mutateSession, receipt, saveReceipt } from './repository.js';
import {
  ImportSessionError,
  LIMITS,
  assertEditable,
  assertRevision,
  id,
  manifest,
  object,
  renumber,
  renewedExpiry,
  revision,
  jsonInput,
} from './model.js';
import { clearPageSession } from './cleanup.js';
export async function editManifest(jobId: string, body: unknown) {
  const b = object(body);
  await mutateSession(jobId, b.requestId, b.expectedRevision, 'manifest', b, async (_tx, m) => {
    if (
      !Array.isArray(b.groups) ||
      !Array.isArray(b.pages) ||
      b.groups.length > LIMITS.maxGroups ||
      !b.groups.length
    )
      throw new ImportSessionError(400, 'invalid_manifest', 'Elenco lettere non valido');
    const groups = b.groups.map((v, i) => {
      const g = object(v);
      const label = typeof g.label === 'string' ? g.label.trim() : '';
      if (!label || label.length > 80 || g.sortOrder !== i)
        throw new ImportSessionError(
          400,
          'invalid_manifest',
          'Ordine o nome della lettera non valido',
        );
      return { id: id(g.id, 'groupId'), label, sortOrder: i };
    });
    const groupIds = new Set(groups.map((g) => g.id));
    const seen = new Set<string>();
    if (groupIds.size !== groups.length || b.pages.length !== m.pages.length)
      throw new ImportSessionError(
        400,
        'invalid_manifest',
        'Il manifest deve contenere ogni pagina una sola volta',
      );
    const pages = b.pages.map((v) => {
      const p = object(v);
      const old = m.pages.find((x) => x.id === p.id);
      if (
        !old ||
        seen.has(old.id) ||
        !groupIds.has(String(p.groupId)) ||
        !Number.isSafeInteger(p.sortOrder) ||
        Number(p.sortOrder) < 0
      )
        throw new ImportSessionError(400, 'invalid_manifest', 'Pagina o gruppo non valido');
      seen.add(old.id);
      return { ...old, groupId: String(p.groupId), sortOrder: Number(p.sortOrder) };
    });
    for (const g of groups) {
      const orders = pages
        .filter((p) => p.groupId === g.id)
        .map((p) => p.sortOrder)
        .sort((a, b) => a - b);
      if (orders.some((n, i) => n !== i))
        throw new ImportSessionError(400, 'invalid_manifest', 'Ordine delle pagine non valido');
    }
    m.groups = groups;
    m.pages = pages;
    renumber(m);
    return {};
  });
  return getPageJob(jobId);
}
export async function processPages(jobId: string, body: unknown, retry = false) {
  const b = object(body);
  await prisma.$transaction(async (tx) => {
    const job = await lockJob(tx, jobId);
    assertRevision(job.manifestRevision, b.expectedRevision);
    assertEditable(job.status);
    if (['queued_pages', 'processing_pages'].includes(job.status)) return;
    const m = manifest(job.manifest);
    if (!m.pages.length || m.groups.some((g) => !m.pages.some((p) => p.groupId === g.id)))
      throw new ImportSessionError(
        400,
        'empty_group',
        'Ogni lettera deve contenere almeno una pagina',
      );
    if (retry) {
      if (!['failed', 'retryable_error'].includes(job.status))
        throw new ImportSessionError(
          409,
          'invalid_state',
          'La sessione non richiede un nuovo tentativo',
        );
      const keys = [
        ...(Array.isArray(b.pageIds) ? b.pageIds : []),
        ...(Array.isArray(b.groupIds) ? b.groupIds : []),
      ].map((k) => id(k));
      const failed = await tx.importProcessingUnit.findMany({
        where: { jobId, status: 'failed', ...(keys.length ? { unitKey: { in: keys } } : {}) },
        select: { id: true, errorCode: true },
      });
      if (
        failed.some((u) =>
          ['output_truncated', 'output_incomplete', 'source_integrity', 'source_missing'].includes(
            u.errorCode ?? '',
          ),
        )
      )
        throw new ImportSessionError(
          409,
          'requires_new_input',
          'Rifai la pagina indicata prima di riprovare',
        );
      await tx.importProcessingUnit.updateMany({
        where: { id: { in: failed.map((u) => u.id) } },
        data: { status: 'pending', errorCode: null, errorMessage: null },
      });
    }
    await tx.importJob.update({
      where: { id: jobId },
      data: {
        status: 'queued_pages',
        stage: 'queued',
        runToken: null,
        leaseExpiresAt: null,
        runRevision: job.manifestRevision,
        error: null,
        expiresAt: renewedExpiry(),
      },
    });
  });
  return getPageJob(jobId);
}
type ResumeActor = { id: string; role: string };

export async function reopenPages(jobId: string, body: unknown, actor?: ResumeActor) {
  const b = object(body);
  // The explicit intent must never silently become the ordinary reopen path.
  if (Object.hasOwn(b, 'resumeDraft')) {
    const raw = b.resumeDraft;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
      throw new ImportSessionError(400, 'invalid_input', 'Bozza da riprendere non valida');
    const draftHint = object(raw);
    const draftId = id(draftHint.id, 'resumeDraft.id');
    const expectedVersion = revision(draftHint.expectedVersion);
    const expectedRevision = revision(b.expectedRevision);
    const requestId = id(b.requestId, 'requestId');
    if (!actor)
      throw new ImportSessionError(404, 'not_found', 'Sessione non trovata');
    await prisma.$transaction(async (tx) => {
      const job = await lockJob(tx, jobId);
      // Lock order matches draft writes and confirmation: job, then draft.
      await tx.$queryRaw`SELECT "id" FROM "PatientIntakeDraft" WHERE "id"=${draftId} FOR UPDATE`;
      const draft = await tx.patientIntakeDraft.findUnique({ where: { id: draftId } });
      if (
        !draft || !job.createdById || job.createdById !== draft.createdById ||
        !canAccessOwnedResource(actor, job.createdById) ||
        !canAccessOwnedResource(actor, draft.createdById) ||
        draft.importJobId !== job.id
      )
        throw new ImportSessionError(404, 'not_found', 'Sessione non trovata');
      if (draft.status !== 'draft' || draft.confirmedPatientId || draft.confirmedAt ||
          job.createdPatientId || job.confirmedAt || ['confirmed', 'cancelled'].includes(job.status))
        throw new ImportSessionError(409, 'session_closed', 'Pratica non modificabile');
      const r = await receipt(tx, jobId, requestId, 'resume-expired-draft', { jobId, ...b });
      // A lost response may be retried after files have already been reuploaded.
      if (r.previous) return;
      assertRevision(job.manifestRevision, expectedRevision);
      if (draft.version !== expectedVersion)
        throw new ImportSessionError(409, 'draft_version_conflict', 'La bozza è cambiata. Ricarica prima di riprovare.',
          { currentVersion: draft.version });
      const m = manifest(job.manifest);
      if (
        job.status !== 'expired' || m.groups.length !== 0 || m.pages.length !== 0 ||
        job.totalBytes !== 0 || job.resultData !== null || job.resultSummary !== null ||
        job.runToken !== null || job.runRevision !== null || job.leaseExpiresAt !== null ||
        job.currentFileName !== null || job.stage !== null || job.errorCode !== null ||
        (await tx.importDocument.count({ where: { jobId } })) !== 0 ||
        (await tx.importProcessingUnit.count({ where: { jobId } })) !== 0
      )
        throw new ImportSessionError(409, 'requires_new_input', 'La sorgente non può essere ripresa automaticamente');
      const nextRevision = job.manifestRevision + 1;
      await tx.importJob.update({
        where: { id: jobId },
        data: {
          manifest: jsonInput({ version: 1, groups: [{ id: randomUUID(), label: 'Lettera 1', sortOrder: 0 }], pages: [] }),
          manifestRevision: nextRevision,
          status: 'uploaded', stage: null, error: null, errorCode: null,
          expiresAt: renewedExpiry(),
        },
      });
      await tx.patientIntakeDraft.update({ where: { id: draftId }, data: { version: { increment: 1 } } });
      await saveReceipt(tx, jobId, r, 'resume-expired-draft', nextRevision,
        { draftId, reuploadRequired: true });
      await tx.importAudit.create({ data: {
        jobId, action: 'resume_expired_draft',
        detail: `reupload-required draft:${draftId} revision:${expectedRevision}->${nextRevision} op:${actor.id}`,
      } });
    }, { timeout: 30000, maxWait: 15000 });
    return getPageJob(jobId);
  }
  await prisma.$transaction(async (tx) => {
    const job = await lockJob(tx, jobId);
    assertRevision(job.manifestRevision, b.expectedRevision);
    assertEditable(job.status);
    await tx.importJob.update({
      where: { id: jobId },
      data: {
        status: 'uploaded',
        stage: null,
        runToken: null,
        leaseExpiresAt: null,
        error: null,
        expiresAt: renewedExpiry(),
      },
    });
  });
  return getPageJob(jobId);
}
export async function cancelPages(jobId: string) {
  await prisma.$transaction(async (tx) => {
    const job = await lockJob(tx, jobId);
    if (job.status === 'confirmed')
      throw new ImportSessionError(409, 'session_closed', 'Sessione già confermata');
    if (job.status !== 'cancelled') await clearPageSession(tx, jobId, 'cancelled');
  });
  return getPageJob(jobId);
}
