// Import job orchestration (REQ-014/REQ-023).
//
// Receives multiple documents/photos, validates + dedups + stores them as a job,
// and manages job lifecycle. NO Patient data is written here — confirmation and
// persistence are REQ-018; extraction is REQ-015.
//
// REQ-023: extraction is delegated to the AI Runtime service via neutral HTTP contract.
// The backend has NO Google/provider imports — only AI_RUNTIME_URL + AI_RUNTIME_SERVICE_TOKEN.

import { readFile } from 'node:fs/promises';
import { prisma } from '../../lib/prisma.js';
import { loadAiConfig, loadExtractionSchema, loadExtractionPrompt, type AiConfig } from '../config.js';
import { recordAudit } from '../audit.js';
import { mergeExtractions, type DocResult, type MergedProposal } from '../merge.js';
import { AiExtractionError } from '../types.js';
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

// ---------------------------------------------------------------------------
// AI Runtime HTTP client (REQ-023) — no provider SDK imported here.
// ---------------------------------------------------------------------------

interface RuntimeJobStatus {
  id: string;
  status: string;
  stage?: string | null;
  error?: string | null;
  model?: string | null;
}

interface RuntimeJobResult {
  data: unknown;
  model?: string | null;
  warnings?: string[];
}

/** Build the runtime create-job body matching the neutral contract (REQ-023 §3).
 *  Exported for contract testing. Field names MUST match clinicos_ai/domain/contracts.py. */
export function buildRuntimeCreateBody(
  jobId: string,
  documents: Array<{ id: string; filename: string; mimeType: string; data: Buffer }>,
  schema: unknown,
  prompt: string,
) {
  return {
    external_job_id: jobId,
    files: documents.map((d, i) => ({
      filename: d.filename,
      mime_type: d.mimeType,
      content_base64: d.data.toString('base64'),
      sort_order: i,
    })),
    schema,
    prompt,
  };
}

function getRuntimeUrl(): string {
  const url = process.env.AI_RUNTIME_URL;
  if (!url) throw new AiExtractionError('config', 'AI_RUNTIME_URL not configured');
  return url.replace(/\/$/, '');
}

function getRuntimeToken(): string {
  const token = process.env.AI_RUNTIME_SERVICE_TOKEN;
  if (!token) throw new AiExtractionError('config', 'AI_RUNTIME_SERVICE_TOKEN not configured');
  return token;
}

async function runtimeFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = getRuntimeUrl() + path;
  const token = getRuntimeToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  return res;
}

/** POST /v1/document-jobs — create a runtime job */
async function runtimeCreateJob(
  jobId: string,
  documents: Array<{ id: string; filename: string; mimeType: string; data: Buffer }>,
  schema: unknown,
  prompt: string,
): Promise<string> {
  const body = buildRuntimeCreateBody(jobId, documents, schema, prompt);
  const res = await runtimeFetch('/v1/document-jobs', { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AiExtractionError('provider_error', `Runtime createJob failed: ${res.status} ${text}`);
  }
  const json = await res.json() as { job_id: string };
  return json.job_id;
}

/** POST /v1/document-jobs/:id/run — trigger async processing */
async function runtimeRunJob(runtimeJobId: string): Promise<void> {
  const res = await runtimeFetch(`/v1/document-jobs/${runtimeJobId}/run`, {
    method: 'POST',
    body: JSON.stringify({ mode: 'extraction' }),
  });
  if (!res.ok && res.status !== 202) {
    const text = await res.text().catch(() => '');
    throw new AiExtractionError('provider_error', `Runtime runJob failed: ${res.status} ${text}`);
  }
}

/** GET /v1/document-jobs/:id — poll status */
async function runtimeGetJob(runtimeJobId: string): Promise<RuntimeJobStatus> {
  const res = await runtimeFetch(`/v1/document-jobs/${runtimeJobId}`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AiExtractionError('provider_error', `Runtime getJob failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<RuntimeJobStatus>;
}

/** GET /v1/document-jobs/:id/result — fetch extraction result */
async function runtimeGetResult(runtimeJobId: string): Promise<RuntimeJobResult> {
  const res = await runtimeFetch(`/v1/document-jobs/${runtimeJobId}/result`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AiExtractionError('provider_error', `Runtime getResult failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<RuntimeJobResult>;
}

/**
 * Wrap the runtime's RAW extraction ({anagrafica, cartella}) into the merged-proposal
 * shape the review UI + confirm flow expect (REQ-016/017): `_merge`, anagrafica as
 * MergedFields, cartella lists as MergedLists. Without this the runtime output is plain
 * schema JSON and `ImportReview` crashes on `proposal._merge.report`. Exported for tests.
 */
export function wrapRuntimeResult(
  raw: { anagrafica?: Record<string, unknown>; cartella?: Record<string, unknown> } | null | undefined,
  documents: Array<{ id: string; filename: string }>,
  model: string,
  preferRecent: boolean,
): MergedProposal {
  const docResults: DocResult[] = [{
    docId: documents[0]?.id ?? 'doc',
    filename: documents.map((d) => d.filename).join(', ') || 'documento',
    model,
    data: { anagrafica: raw?.anagrafica, cartella: raw?.cartella },
  }];
  return mergeExtractions(docResults, { preferRecent });
}

/** Map runtime status string to ClinicOS JobStatus */
export function mapRuntimeStatus(runtimeStatus: string): { jobStatus: JobStatus; isTerminal: boolean } {
  const terminalOk = ['completed', 'review_ready'];
  const terminalFail = ['failed', 'cancelled'];
  const retryable = ['retryable_error'];
  if (terminalOk.includes(runtimeStatus)) return { jobStatus: 'review_ready', isTerminal: true };
  if (retryable.includes(runtimeStatus)) return { jobStatus: 'retryable_error', isTerminal: true };
  if (terminalFail.includes(runtimeStatus)) return { jobStatus: 'failed', isTerminal: true };
  // in-progress
  const stageMap: Record<string, JobStatus> = {
    uploading_files: 'uploading_to_google',
    ocr_running: 'waiting_for_model',
    extraction_running: 'waiting_for_model',
    validating: 'validating_response',
    repairing: 'repairing_response',
  };
  return { jobStatus: stageMap[runtimeStatus] ?? 'waiting_for_model', isTerminal: false };
}

// ---------------------------------------------------------------------------
// Job lifecycle functions
// ---------------------------------------------------------------------------

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

    const storagePath = await storeFile(jobId, vf.sha256, incoming.data);
    const doc = await prisma.importDocument.create({
      data: {
        jobId,
        filename: vf.filename,
        mimeType: vf.mimeType,
        sizeBytes: vf.sizeBytes,
        sha256: vf.sha256,
        storagePath,
        sortOrder: acceptedCount,
        status: 'uploaded',
      },
    });

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

/** Remove a single document from a job (before processing). */
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

/** Enqueue a job for async processing (REQ-022): Returns immediately; the worker runs it. */
export async function enqueueJob(jobId: string): Promise<PublicJob> {
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job) throw new AiExtractionError('config', 'Job non trovato');
  if (!['uploaded', 'validating'].includes(job.status)) {
    throw new AiExtractionError('config', `Job non accodabile nello stato ${job.status}`);
  }
  await setState(jobId, 'queued', { stage: 'queued', error: null, errorCode: null } as Record<string, unknown>);
  await recordAudit(jobId, 'process_started', { detail: 'enqueue → queued' });
  return (await getJob(jobId))!;
}

/** Retry a failed/retryable job. */
export async function retryJob(jobId: string): Promise<PublicJob> {
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job) throw new AiExtractionError('config', 'Job non trovato');
  if (!['retryable_error', 'failed'].includes(job.status)) {
    throw new AiExtractionError('config', `Job non ritentabile nello stato ${job.status}`);
  }
  await prisma.importJob.update({ where: { id: jobId }, data: { status: 'queued', stage: 'queued', error: null } });
  await recordAudit(jobId, 'process_started', { detail: 'retry → queued' });
  return (await getJob(jobId))!;
}

async function setState(jobId: string, status: JobStatus, extra: Record<string, unknown> = {}): Promise<void> {
  await prisma.importJob.update({ where: { id: jobId }, data: { status, ...extra } });
}

/**
 * Worker entrypoint (REQ-022/REQ-023): run a CLAIMED job through the AI Runtime.
 * Calls the neutral HTTP contract: POST /v1/document-jobs → POST :id/run → poll GET :id → GET :id/result.
 * Maps runtime status into the existing job state machine (REQ-022).
 * No provider SDK is imported — only AI_RUNTIME_URL and AI_RUNTIME_SERVICE_TOKEN are used.
 */
export async function runJob(jobId: string): Promise<void> {
  const job = await prisma.importJob.findUnique({ where: { id: jobId }, include: { documents: true } });
  if (!job) return;

  const usable = job.documents.filter((d) => d.status === 'uploaded');
  if (usable.length === 0) { await setState(jobId, 'failed', { error: 'Nessun documento valido', stage: 'error' }); return; }

  await setState(jobId, 'uploading_to_google', { stage: 'uploading_files', startedAt: new Date(), error: null });

  try {
    // 0. Load the extraction schema + prompt the runtime should target (REQ-023 §3).
    const cfg = loadAiConfig();
    const schema = loadExtractionSchema(cfg);
    const prompt = loadExtractionPrompt(cfg);

    // 1. Read files from disk
    const docFiles = await Promise.all(
      usable.map(async (d) => ({
        id: d.id,
        filename: d.filename,
        mimeType: d.mimeType,
        data: await readFile(d.storagePath),
      })),
    );

    // 2. Create runtime job
    await setState(jobId, 'uploading_to_google', { stage: 'uploading_files' });
    const runtimeJobId = await runtimeCreateJob(jobId, docFiles, schema, prompt);
    await recordAudit(jobId, 'process_started', { detail: `runtime_job=${runtimeJobId}` });

    // 3. Trigger processing
    await runtimeRunJob(runtimeJobId);
    await setState(jobId, 'waiting_for_model', { stage: 'ocr_running' });

    // 4. Poll until terminal
    const maxPollMs = 30 * 60 * 1000; // 30 min
    const pollIntervalMs = 3000;
    const deadline = Date.now() + maxPollMs;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      const rStatus = await runtimeGetJob(runtimeJobId);
      const { jobStatus, isTerminal } = mapRuntimeStatus(rStatus.status);

      await setState(jobId, jobStatus, {
        stage: rStatus.stage ?? null,
        ...(rStatus.model ? { model: rStatus.model } : {}),
      });

      if (isTerminal) {
        if (jobStatus === 'review_ready') {
          // 5. Fetch result, wrap into the merged-proposal shape the UI/confirm need, persist.
          const resultPayload = await runtimeGetResult(runtimeJobId);
          const modelUsed = resultPayload.model ?? rStatus.model ?? 'runtime';
          const merged = wrapRuntimeResult(
            resultPayload.data as { anagrafica?: Record<string, unknown>; cartella?: Record<string, unknown> } | null,
            usable.map((d) => ({ id: d.id, filename: d.filename })),
            modelUsed,
            cfg.mergePreferRecent,
          );
          await prisma.importJob.update({
            where: { id: jobId },
            data: {
              status: 'review_ready',
              stage: 'completed',
              resultData: merged as object,
              model: modelUsed,
            },
          });
          await recordAudit(jobId, 'process_completed', { detail: 'runtime extraction + merge ok' });
        } else {
          // failed / retryable_error
          const retryable = jobStatus === 'retryable_error';
          await setState(jobId, retryable ? 'retryable_error' : 'failed', {
            stage: 'error',
            error: rStatus.error ?? 'Extraction failed',
          });
          await recordAudit(jobId, 'process_failed', { detail: rStatus.error ?? jobStatus });
        }
        return;
      }
    }

    // Timeout
    await setState(jobId, 'retryable_error', { stage: 'error', error: 'Runtime timeout' });
    await recordAudit(jobId, 'process_failed', { detail: 'timeout' });

  } catch (err) {
    const kind = err instanceof AiExtractionError ? err.kind : 'provider_error';
    const message = err instanceof Error ? err.message : 'Errore elaborazione';
    const retryable = kind === 'timeout' || kind === 'provider_error' || kind === 'provider_unavailable';
    await setState(jobId, retryable ? 'retryable_error' : 'failed', { stage: 'error', error: `[${kind}] ${message}` });
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
