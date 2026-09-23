import { prisma } from '../../../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { extractionConfig, groupHash, pageHash } from './inputs.js';
import {
  LIMITS,
  ImportSessionError,
  assertEditable,
  assertRevision,
  hash,
  id,
  jsonInput,
  manifest,
  object,
  renewedExpiry,
  type Manifest,
  type Tx,
} from './model.js';
export const documentSelect = {
  id: true,
  filename: true,
  mimeType: true,
  sizeBytes: true,
  sha256: true,
  sortOrder: true,
  logicalDoc: true,
  status: true,
  rejectReason: true,
  pageCount: true,
} as const;
export async function isPageSession(jobId: string) {
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    select: { manifest: true },
  });
  return object(job?.manifest).version === 1;
}
export async function lockJob(tx: Tx, jobId: string) {
  await tx.$queryRaw`SELECT "id" FROM "ImportJob" WHERE "id" = ${jobId} FOR UPDATE`;
  const job = await tx.importJob.findUnique({ where: { id: jobId } });
  if (!job) throw new ImportSessionError(404, 'not_found', 'Sessione non trovata');
  manifest(job.manifest);
  return job;
}
export async function getPageJob(jobId: string) {
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      stage: true,
      currentFileName: true,
      startedAt: true,
      maxFiles: true,
      maxPages: true,
      maxTotalBytes: true,
      totalBytes: true,
      error: true,
      model: true,
      expiresAt: true,
      createdAt: true,
      manifest: true,
      manifestRevision: true,
      resultSummary: true,
      documents: { select: documentSelect, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      processingUnits: {
        select: {
          kind: true,
          unitKey: true,
          inputHash: true,
          outputHash: true,
          status: true,
          errorCode: true,
          errorMessage: true,
        },
      },
    },
  });
  if (!job) throw new ImportSessionError(404, 'not_found', 'Sessione non trovata');
  const m = manifest(job.manifest);
  const cfgHash = extractionConfig().digest;
  const shas = new Map(job.documents.map((d) => [d.id, d.sha256]));
  const state = (kind: string, key: string, inputHash: string) =>
    job.processingUnits.find(
      (u) => u.kind === kind && u.unitKey === key && u.inputHash === inputHash,
    );
  const pages = m.pages.map((p) => {
    const u = state('ocr', p.id, pageHash(p, shas.get(p.documentId) ?? ''));
    return {
      ...p,
      status: u?.status ?? 'pending',
      canRetry:
        u?.status === 'failed' &&
        !['output_truncated', 'output_incomplete', 'source_integrity', 'source_missing'].includes(
          u.errorCode ?? '',
        ),
      errorCode: u?.errorCode ?? null,
      error: u?.errorMessage ?? null,
    };
  });
  const outputs = new Map(
    pages.map((p) => [
      p.id,
      state('ocr', p.id, pageHash(p, shas.get(p.documentId) ?? ''))?.outputHash ?? '',
    ]),
  );
  const groups = m.groups.map((g) => {
    const u = state('extraction', g.id, groupHash(m, g.id, shas, cfgHash, outputs));
    return {
      ...g,
      status: u?.status ?? 'pending',
      pageCount: pages.filter((p) => p.groupId === g.id).length,
      completedPages: pages.filter((p) => p.groupId === g.id && p.status === 'completed').length,
      errorCode: u?.errorCode ?? null,
      error: u?.errorMessage ?? null,
      pdfUrl: pages.some((p) => p.groupId === g.id)
        ? `/ai/extraction/jobs/${jobId}/groups/${g.id}/pdf`
        : null,
    };
  });
  const drafts = await prisma.$queryRaw<Array<{ id: string; source: unknown }>>(
    Prisma.sql`SELECT "id", "data"->'_importSource' AS "source" FROM "PatientIntakeDraft" WHERE "importJobId"=${jobId} LIMIT 1`,
  );
  const summary = object(job.resultSummary);
  const pair = object(summary.source);
  const unresolved = Number(summary.unresolvedConflicts ?? 0);
  const current = pair.manifestRevision === job.manifestRevision;
  const status =
    job.status === 'queued_pages'
      ? 'queued'
      : job.status === 'processing_pages'
        ? 'processing'
        : job.status;
  const active = ['queued_pages', 'processing_pages'].includes(job.status);
  const phase =
    job.stage === 'ocr'
      ? 'ocr'
      : job.stage === 'extraction'
        ? 'extraction'
        : status === 'review_ready'
          ? 'review'
          : ['failed', 'retryable_error'].includes(status)
            ? 'error'
            : 'documents';
  const docs = job.documents.filter((d) => m.pages.some((p) => p.documentId === d.id));
  return {
    id: job.id,
    status,
    stage: job.stage,
    completedFiles: docs.filter((d) =>
      pages.filter((p) => p.documentId === d.id).every((p) => p.status === 'completed'),
    ).length,
    totalFiles: docs.length,
    currentFileName: job.currentFileName,
    elapsedSeconds: job.startedAt
      ? Math.max(0, Math.round((Date.now() - job.startedAt.getTime()) / 1000))
      : 0,
    canRetry: ['retryable_error', 'failed'].includes(status),
    canCancel: !['confirmed', 'expired', 'cancelled'].includes(status),
    maxFiles: job.maxFiles,
    maxTotalBytes: job.maxTotalBytes,
    totalBytes: job.totalBytes,
    fileCount: docs.length,
    error: job.error,
    model: job.model,
    expiresAt: job.expiresAt.toISOString(),
    createdAt: job.createdAt.toISOString(),
    documents: docs.map((d) => ({
      ...d,
      contentUrl: `/ai/extraction/jobs/${jobId}/files/${d.id}/content`,
    })),
    capabilities: { sessionVersion: 1 as const, pageEditing: true, atomicReplacement: true },
    manifest: { ...m, revision: job.manifestRevision, groups, pages },
    limits: {
      ...LIMITS,
      maxPages: job.maxPages ?? 30,
      maxSourceFiles: job.maxFiles,
      maxTotalBytes: job.maxTotalBytes,
    },
    progress: {
      phase,
      totalPages: pages.length,
      completedPages: pages.filter((p) => p.status === 'completed').length,
      failedPages: pages.filter((p) => p.status === 'failed').length,
      totalGroups: groups.length,
      completedGroups: groups.filter((g) => g.status === 'completed').length,
      currentPageId: active ? (pages.find((p) => p.status === 'running')?.id ?? null) : null,
      currentGroupId: active ? (groups.find((g) => g.status === 'running')?.id ?? null) : null,
    },
    review: {
      manifestRevision: pair.manifestRevision ?? null,
      resultHash: pair.resultHash ?? null,
      unresolvedConflicts: unresolved,
      canProceed: status === 'review_ready' && current && unresolved === 0,
      draftId: drafts[0]?.id ?? null,
      draftSourceIsCurrent:
        !drafts.length ||
        (object(drafts[0].source).resultHash === pair.resultHash &&
          object(drafts[0].source).manifestRevision === job.manifestRevision &&
          object(drafts[0].source).reviewHash === summary.reviewHash),
    },
  };
}
export async function receipt(
  tx: Tx,
  jobId: string,
  requestId: unknown,
  action: string,
  payload: unknown,
) {
  const key = id(requestId, 'requestId');
  const digest = hash(payload);
  const previous = await tx.importMutation.findUnique({
    where: { jobId_requestId: { jobId, requestId: key } },
  });
  if (previous && (previous.action !== action || previous.requestHash !== digest))
    throw new ImportSessionError(
      409,
      'idempotency_conflict',
      'La chiave della richiesta è già usata per contenuti diversi',
    );
  return { key, digest, previous };
}
export async function saveReceipt(
  tx: Tx,
  jobId: string,
  r: { key: string; digest: string },
  action: string,
  revision: number,
  outcomes: unknown,
) {
  await tx.importMutation.create({
    data: {
      jobId,
      requestId: r.key,
      action,
      requestHash: r.digest,
      resultingRevision: revision,
      outcomes: jsonInput(outcomes),
    },
  });
}
export async function mutateSession<T>(
  jobId: string,
  requestId: unknown,
  expected: unknown,
  action: string,
  payload: unknown,
  change: (tx: Tx, m: Manifest, job: Awaited<ReturnType<typeof lockJob>>) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      const job = await lockJob(tx, jobId);
      const r = await receipt(tx, jobId, requestId, action, payload);
      if (r.previous) return r.previous.outcomes as T;
      assertEditable(job.status);
      assertRevision(job.manifestRevision, expected);
      const m = structuredClone(manifest(job.manifest));
      const result = await change(tx, m, job);
      if (hash(m) === hash(job.manifest)) {
        await tx.importJob.update({ where: { id: jobId }, data: { expiresAt: renewedExpiry() } });
        await saveReceipt(tx, jobId, r, action, job.manifestRevision, result);
        return result;
      }
      const next = job.manifestRevision + 1;
      await tx.importJob.update({
        where: { id: jobId },
        data: {
          manifest: jsonInput(m),
          manifestRevision: next,
          status: 'uploaded',
          stage: null,
          error: null,
          errorCode: null,
          runToken: null,
          runRevision: null,
          leaseExpiresAt: null,
          expiresAt: renewedExpiry(),
        },
      });
      await saveReceipt(tx, jobId, r, action, next, result);
      return result;
    },
    { timeout: 30000, maxWait: 15000 },
  );
}
