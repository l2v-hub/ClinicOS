import { prisma } from '../../../lib/prisma.js';
import { getPageJob, lockJob, mutateSession } from './repository.js';
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
export async function reopenPages(jobId: string, body: unknown) {
  const b = object(body);
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
