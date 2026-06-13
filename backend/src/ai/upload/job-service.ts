// Import job orchestration (REQ-014).
//
// Receives multiple documents/photos, validates + dedups + stores them as a job,
// and manages job lifecycle. NO Patient data is written here — confirmation and
// persistence are REQ-018; extraction is REQ-015.

import { prisma } from '../../lib/prisma.js';
import { loadAiConfig, type AiConfig } from '../config.js';
import { createExtractionProvider } from '../provider-factory.js';
import { AiExtractionError } from '../types.js';
import { validateFile, type IncomingFile, type RejectReason } from './validation.js';
import { removeFile, removeJobDir, storeFile, sweepExpiredDirs } from './storage.js';

export type JobStatus =
  | 'uploaded' | 'validating' | 'processing' | 'review_ready' | 'failed' | 'expired' | 'confirmed';

export interface FileOutcome {
  filename: string;
  status: 'accepted' | 'duplicate' | 'rejected';
  documentId?: string;
  reason?: RejectReason;
  message?: string;
}

export interface PublicDocument {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  sortOrder: number;
  logicalDoc: string | null;
  status: string;
  rejectReason: string | null;
}

export interface PublicJob {
  id: string;
  status: JobStatus;
  maxFiles: number;
  maxTotalBytes: number;
  totalBytes: number;
  fileCount: number;
  error: string | null;
  model: string | null;
  expiresAt: string;
  createdAt: string;
  documents: PublicDocument[];
}

function expiry(cfg: AiConfig): Date {
  return new Date(Date.now() + cfg.jobRetentionMin * 60_000);
}

/** Create a new (empty) import job. Idempotent on idempotencyKey. */
export async function createJob(opts: { idempotencyKey?: string; createdById?: string } = {}): Promise<PublicJob> {
  const cfg = loadAiConfig();
  if (opts.idempotencyKey) {
    const existing = await prisma.importJob.findUnique({ where: { idempotencyKey: opts.idempotencyKey } });
    if (existing) return getJob(existing.id) as Promise<PublicJob>;
  }
  const job = await prisma.importJob.create({
    data: {
      status: 'uploaded',
      idempotencyKey: opts.idempotencyKey,
      createdById: opts.createdById,
      maxFiles: cfg.maxFiles,
      maxTotalBytes: cfg.maxTotalMb * 1024 * 1024,
      expiresAt: expiry(cfg),
    },
  });
  return getJob(job.id) as Promise<PublicJob>;
}

/** Add files to a job. Invalid/duplicate files are reported but never abort the valid ones. */
export async function addFiles(jobId: string, files: IncomingFile[]): Promise<{ job: PublicJob; outcomes: FileOutcome[] }> {
  const cfg = loadAiConfig();
  const job = await prisma.importJob.findUnique({ where: { id: jobId }, include: { documents: true } });
  if (!job) throw new AiExtractionError('config', 'Job non trovato');
  if (!['uploaded', 'validating'].includes(job.status)) {
    throw new AiExtractionError('config', `Job non modificabile nello stato ${job.status}`);
  }

  const maxTotalBytes = job.maxTotalBytes;
  const seen = new Set(job.documents.map((d) => d.sha256));
  let acceptedCount = job.documents.filter((d) => d.status === 'uploaded').length;
  let runningTotal = job.totalBytes;
  const outcomes: FileOutcome[] = [];

  for (const incoming of files) {
    const res = validateFile(incoming, { maxFileBytes: maxTotalBytes });
    if (!res.ok || !res.file) {
      outcomes.push({ filename: incoming.filename, status: 'rejected', reason: res.reason, message: res.message });
      continue;
    }
    const vf = res.file;
    if (seen.has(vf.sha256)) {
      outcomes.push({ filename: incoming.filename, status: 'duplicate', message: 'Documento già presente nel job' });
      continue;
    }
    if (acceptedCount + 1 > job.maxFiles) {
      outcomes.push({ filename: incoming.filename, status: 'rejected', reason: 'too_large', message: `Massimo ${job.maxFiles} file per job` });
      continue;
    }
    if (runningTotal + vf.sizeBytes > maxTotalBytes) {
      outcomes.push({ filename: incoming.filename, status: 'rejected', reason: 'too_large', message: 'Dimensione totale superata' });
      continue;
    }

    const doc = await prisma.importDocument.create({
      data: {
        jobId,
        filename: vf.safeName,
        mimeType: vf.mimeType,
        sizeBytes: vf.sizeBytes,
        sha256: vf.sha256,
        storagePath: '',
        sortOrder: acceptedCount,
        status: 'uploaded',
      },
    });
    const path = await storeFile(jobId, doc.id, incoming.data);
    await prisma.importDocument.update({ where: { id: doc.id }, data: { storagePath: path } });

    seen.add(vf.sha256);
    acceptedCount++;
    runningTotal += vf.sizeBytes;
    outcomes.push({ filename: incoming.filename, status: 'accepted', documentId: doc.id });
  }

  await prisma.importJob.update({ where: { id: jobId }, data: { totalBytes: runningTotal } });
  return { job: (await getJob(jobId))!, outcomes };
}

export async function getJob(jobId: string): Promise<PublicJob | null> {
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    include: { documents: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!job) return null;
  return {
    id: job.id,
    status: job.status as JobStatus,
    maxFiles: job.maxFiles,
    maxTotalBytes: job.maxTotalBytes,
    totalBytes: job.totalBytes,
    fileCount: job.documents.filter((d) => d.status === 'uploaded').length,
    error: job.error,
    model: job.model,
    expiresAt: job.expiresAt.toISOString(),
    createdAt: job.createdAt.toISOString(),
    documents: job.documents.map((d) => ({
      id: d.id,
      filename: d.filename,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      sha256: d.sha256,
      sortOrder: d.sortOrder,
      logicalDoc: d.logicalDoc,
      status: d.status,
      rejectReason: d.rejectReason,
    })),
  };
}

/** Remove a single document (file + row) and recompute the running total. */
export async function removeDocument(jobId: string, docId: string): Promise<PublicJob> {
  const doc = await prisma.importDocument.findFirst({ where: { id: docId, jobId } });
  if (!doc) throw new AiExtractionError('config', 'Documento non trovato');
  if (doc.storagePath) await removeFile(doc.storagePath);
  await prisma.importDocument.delete({ where: { id: doc.id } });
  const remaining = await prisma.importDocument.findMany({ where: { jobId, status: 'uploaded' } });
  const total = remaining.reduce((s, d) => s + d.sizeBytes, 0);
  await prisma.importJob.update({ where: { id: jobId }, data: { totalBytes: total } });
  return (await getJob(jobId))!;
}

/** Set document order (for multi-page photos / logical grouping). */
export async function reorder(jobId: string, orderedDocIds: string[]): Promise<PublicJob> {
  await prisma.$transaction(
    orderedDocIds.map((id, idx) =>
      prisma.importDocument.updateMany({ where: { id, jobId }, data: { sortOrder: idx } }),
    ),
  );
  return (await getJob(jobId))!;
}

/** Cancel a job: delete files on disk and mark terminal. */
export async function cancelJob(jobId: string): Promise<PublicJob> {
  await removeJobDir(jobId);
  await prisma.importDocument.deleteMany({ where: { jobId } });
  await prisma.importJob.update({ where: { id: jobId }, data: { status: 'expired', totalBytes: 0 } });
  return (await getJob(jobId))!;
}

/**
 * Explicit start of processing (REQ-014: only on user confirmation).
 * REQ-014 transitions state and, when a provider is available, runs extraction
 * (mock in CI). Full extraction + schema validation is REQ-015.
 */
export async function processJob(jobId: string): Promise<PublicJob> {
  const job = await prisma.importJob.findUnique({ where: { id: jobId }, include: { documents: true } });
  if (!job) throw new AiExtractionError('config', 'Job non trovato');
  const usable = job.documents.filter((d) => d.status === 'uploaded');
  if (usable.length === 0) throw new AiExtractionError('config', 'Nessun documento valido da elaborare');

  await prisma.importJob.update({ where: { id: jobId }, data: { status: 'processing', error: null } });
  try {
    const cfg = loadAiConfig();
    const provider = createExtractionProvider(cfg); // throws controlled error if google+no key
    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: 'review_ready', model: provider.model },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore elaborazione';
    await prisma.importJob.update({ where: { id: jobId }, data: { status: 'failed', error: message } });
  }
  return (await getJob(jobId))!;
}

/** Sweep expired jobs (DB rows + on-disk dirs). Safe to call periodically. */
export async function sweepExpiredJobs(): Promise<{ expiredJobs: number; removedDirs: number }> {
  const now = new Date();
  const expired = await prisma.importJob.findMany({
    where: { expiresAt: { lt: now }, status: { notIn: ['confirmed', 'expired'] } },
    select: { id: true },
  });
  for (const j of expired) {
    await removeJobDir(j.id);
    await prisma.importDocument.deleteMany({ where: { jobId: j.id } });
    await prisma.importJob.update({ where: { id: j.id }, data: { status: 'expired', totalBytes: 0 } });
  }
  const removedDirs = await sweepExpiredDirs();
  return { expiredJobs: expired.length, removedDirs };
}
