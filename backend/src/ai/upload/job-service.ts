// Import job orchestration (REQ-014).
//
// Receives multiple documents/photos, validates + dedups + stores them as a job,
// and manages job lifecycle. NO Patient data is written here — confirmation and
// persistence are REQ-018; extraction is REQ-015.

import { readFile } from 'node:fs/promises';
import { prisma } from '../../lib/prisma.js';
import { loadAiConfig, loadExtractionPrompt, loadExtractionSchema, type AiConfig } from '../config.js';
import { createExtractionProvider } from '../provider-factory.js';
import { validateExtraction } from '../extraction-validate.js';
import { mergeExtractions, type DocResult } from '../merge.js';
import { createAgentProvider } from '../agent/factory.js';
import { buildAgentProposal, proposalToExtractionData } from '../agent/tools.js';
import { recordAudit } from '../audit.js';
import { AiExtractionError, type ExtractionFile } from '../types.js';
import { validateFile, type IncomingFile, type RejectReason } from './validation.js';
import { removeFile, removeJobDir, storeFile, sweepExpiredDirs } from './storage.js';

export type JobStatus =
  | 'created' | 'uploaded' | 'queued' | 'uploading_to_google' | 'waiting_for_model'
  | 'validating_response' | 'repairing_response' | 'review_ready' | 'retryable_error'
  | 'failed' | 'expired' | 'cancelled' | 'confirmed'
  // legacy transient kept for backward compatibility
  | 'validating' | 'processing';

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
  // REQ-022 async progress
  stage: string | null;
  completedFiles: number;
  totalFiles: number;
  currentFileName: string | null;
  elapsedSeconds: number;
  canRetry: boolean;
  canCancel: boolean;
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

const TERMINAL: JobStatus[] = ['review_ready', 'failed', 'expired', 'cancelled', 'confirmed'];
const ACTIVE: JobStatus[] = ['queued', 'uploading_to_google', 'waiting_for_model', 'validating_response', 'repairing_response', 'processing'];

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
  const status = job.status as JobStatus;
  const totalFiles = job.documents.filter((d) => d.status !== 'duplicate' && d.status !== 'rejected').length;
  const completedFiles = job.documents.filter((d) => d.status === 'completed' || d.status === 'uploaded').length;
  const elapsedSeconds = job.startedAt ? Math.max(0, Math.round((Date.now() - job.startedAt.getTime()) / 1000)) : 0;
  return {
    id: job.id,
    status,
    stage: job.stage,
    completedFiles,
    totalFiles,
    currentFileName: job.currentFileName,
    elapsedSeconds,
    canRetry: status === 'retryable_error' || status === 'failed',
    canCancel: ACTIVE.includes(status) || status === 'uploaded',
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

/** Assign a logical-document label to a single item (group multiple photos as one doc). */
export async function setLogicalDoc(jobId: string, docId: string, logicalDoc: string): Promise<PublicJob> {
  const doc = await prisma.importDocument.findFirst({ where: { id: docId, jobId } });
  if (!doc) throw new AiExtractionError('config', 'Documento non trovato');
  const value = logicalDoc.trim().slice(0, 80) || null;
  await prisma.importDocument.update({ where: { id: doc.id }, data: { logicalDoc: value } });
  return (await getJob(jobId))!;
}

/** Cancel a job: delete files on disk and mark terminal. */
export async function cancelJob(jobId: string): Promise<PublicJob> {
  await removeJobDir(jobId);
  await prisma.importDocument.deleteMany({ where: { jobId } });
  await prisma.importJob.update({ where: { id: jobId }, data: { status: 'expired', totalBytes: 0 } });
  return (await getJob(jobId))!;
}

/** Enqueue a job for async processing (REQ-022): returns immediately; the worker runs it. */
export async function enqueueJob(jobId: string): Promise<PublicJob> {
  const job = await prisma.importJob.findUnique({ where: { id: jobId }, include: { documents: true } });
  if (!job) throw new AiExtractionError('config', 'Job non trovato');
  if (job.status === 'review_ready' || job.status === 'confirmed') return (await getJob(jobId))!;
  if (job.documents.filter((d) => d.status === 'uploaded').length === 0) {
    throw new AiExtractionError('config', 'Nessun documento valido da elaborare');
  }
  await prisma.importJob.update({ where: { id: jobId }, data: { status: 'queued', stage: 'queued', error: null, errorCode: null } });
  await recordAudit(jobId, 'process_started', { detail: 'queued' });
  return (await getJob(jobId))!;
}

/** Re-queue a failed/retryable job WITHOUT re-uploading documents (REQ-022). */
export async function retryJob(jobId: string): Promise<PublicJob> {
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job) throw new AiExtractionError('config', 'Job non trovato');
  if (!['retryable_error', 'failed'].includes(job.status)) {
    throw new AiExtractionError('config', `Job non ritentabile nello stato ${job.status}`);
  }
  await prisma.importJob.update({ where: { id: jobId }, data: { status: 'queued', stage: 'queued', error: null, errorCode: null } });
  await recordAudit(jobId, 'process_started', { detail: 'retry → queued' });
  return (await getJob(jobId))!;
}

async function setState(jobId: string, status: JobStatus, extra: Record<string, unknown> = {}): Promise<void> {
  await prisma.importJob.update({ where: { id: jobId }, data: { status, ...extra } });
}

/**
 * Worker entrypoint (REQ-022): run a CLAIMED job through the extraction state
 * machine. The model's raw response is never persisted or logged. Timeout/provider
 * failures become retryable_error (documents kept); schema/config errors are terminal.
 */
export async function runJob(jobId: string): Promise<void> {
  const job = await prisma.importJob.findUnique({ where: { id: jobId }, include: { documents: true } });
  if (!job) return;
  const usable = job.documents.filter((d) => d.status === 'uploaded');
  if (usable.length === 0) { await setState(jobId, 'failed', { error: 'Nessun documento valido', errorCode: 'no_documents', stage: 'error' }); return; }

  await setState(jobId, 'uploading_to_google', { stage: 'uploading_files', startedAt: new Date(), error: null, errorCode: null, attempts: { increment: 1 } });
  try {
    const cfg = loadAiConfig();
    const schema = loadExtractionSchema(cfg);
    const prompt = loadExtractionPrompt(cfg);

    // ── Agent-native path (REQ-021): an agent loop with tools decides new vs
    //    existing patient and produces the proposal. Persistence stays gated.
    //    On ANY agent failure (e.g. provider quota/429) we GRACEFULLY DEGRADE to
    //    the deterministic legacy pipeline so import keeps working.
    if (cfg.useAgent) {
      try {
        const files: ExtractionFile[] = [];
        for (const d of usable) {
          files.push({ id: d.id, filename: d.filename, mimeType: d.mimeType, data: await readFile(d.storagePath) });
        }
        await setState(jobId, 'waiting_for_model', { stage: 'model_processing' });
        const agent = createAgentProvider(cfg);
        const result = await agent.run({ jobId, files, schema, prompt });

        await setState(jobId, 'validating_response', { stage: 'validating', model: result.model });
        const check = validateExtraction(proposalToExtractionData(result.input));
        if (!check.valid) {
          throw new AiExtractionError('schema_validation', `Proposta agente non conforme: ${check.errors.slice(0, 4).join('; ')}`);
        }
        const proposal = buildAgentProposal(result.input, result.model, files.map((f) => f.filename));
        await setState(jobId, 'review_ready', { stage: 'completed', model: result.model, resultData: proposal as unknown as object, error: null, errorCode: null });
        await recordAudit(jobId, 'process_completed', { detail: `agent target=${proposal._target.mode} tools=${result.toolTrace.join(',')}` });
        return;
      } catch (agentErr) {
        const msg = agentErr instanceof Error ? agentErr.message : String(agentErr);
        console.warn(`[ai] agent path failed, falling back to legacy pipeline: ${msg.slice(0, 160)}`);
        await recordAudit(jobId, 'process_started', { detail: 'agent fallback → legacy' });
        // fall through to the legacy pipeline below
      }
    }

    // ── Legacy pipeline (per-document extract + deterministic merge) ──────────
    await setState(jobId, 'waiting_for_model', { stage: 'model_processing' });
    const provider = createExtractionProvider(cfg); // throws controlled error if google+no key

    // Extract each document SEPARATELY so the merge keeps per-document provenance (REQ-016).
    const docResults: DocResult[] = [];
    let modelUsed = provider.model;
    let schemaVersion = '';
    let promptVersion = '';
    for (const d of usable) {
      await prisma.importJob.update({ where: { id: jobId }, data: { currentFileName: d.filename } }).catch(() => {});
      const data = await readFile(d.storagePath);
      const file: ExtractionFile = { id: d.id, filename: d.filename, mimeType: d.mimeType, data };
      const result = await provider.extract({ jobId, files: [file], schema, prompt });

      // Validate EACH per-document extraction against the ClinicOS schema.
      const check = validateExtraction(result.data);
      if (!check.valid) {
        throw new AiExtractionError('schema_validation', `Documento ${d.filename}: output non conforme — ${check.errors.slice(0, 4).join('; ')}`);
      }
      modelUsed = result.model;
      schemaVersion = result.schemaVersion;
      promptVersion = result.promptVersion;
      const out = result.data as { anagrafica?: Record<string, unknown>; cartella?: Record<string, unknown> };
      docResults.push({
        docId: d.id,
        filename: d.filename,
        model: result.model,
        data: { anagrafica: out.anagrafica, cartella: out.cartella },
      });
    }

    await setState(jobId, 'validating_response', { stage: 'validating' });
    // Deterministic multi-document merge with provenance + explicit conflicts (REQ-016).
    const merged = mergeExtractions(docResults, { preferRecent: cfg.mergePreferRecent });
    await setState(jobId, 'review_ready', {
      stage: 'completed', model: modelUsed, schemaVersion, promptVersion, currentFileName: null,
      resultData: merged as unknown as object, error: null, errorCode: null,
    });
    await recordAudit(jobId, 'process_completed', { detail: 'legacy' });
  } catch (err) {
    const kind = err instanceof AiExtractionError ? err.kind : 'provider_error';
    const message = err instanceof Error ? err.message : 'Errore elaborazione';
    // timeout/provider issues are retryable (documents kept); schema/config are terminal.
    const retryable = kind === 'timeout' || kind === 'provider_error' || kind === 'provider_unavailable';
    await setState(jobId, retryable ? 'retryable_error' : 'failed', { stage: 'error', error: `[${kind}] ${message}`, errorCode: kind });
    await recordAudit(jobId, 'process_failed', { detail: kind });
  }
}

/** Extraction result for review (REQ-015 → consumed by REQ-016/017). */
export async function getJobResult(jobId: string): Promise<{ status: JobStatus; model: string | null; resultData: unknown } | null> {
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    select: { status: true, model: true, resultData: true },
  });
  if (!job) return null;
  return { status: job.status as JobStatus, model: job.model, resultData: job.resultData };
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
