import { Router } from 'express';
import multer from 'multer';
import { loadAiConfig } from '../ai/config.js';
import { AiExtractionError } from '../ai/types.js';
import {
  addFiles,
  cancelJob,
  createJob,
  getJob,
  getJobResult,
  enqueueJob,
  reopenJob,
  retryJob,
  removeDocument,
  reorder,
  setLogicalDoc,
  sweepExpiredJobs,
} from '../ai/upload/job-service.js';
import type { IncomingFile } from '../ai/upload/validation.js';
import { confirmJob, type ConfirmPayload } from '../ai/upload/confirm-service.js';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import { importRateLimit, extractionCostGuard } from '../ai/rate-limit.js';
import { recordAudit } from '../ai/audit.js';

// ═══════════════════════════════════════════════════════════════════════════
// AI IMPORT JOBS — mounted at /ai/extraction/jobs (REQ-014)
// Multi-file upload + extraction job lifecycle. No Patient data is written here.
// ═══════════════════════════════════════════════════════════════════════════

const cfg = loadAiConfig();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: cfg.maxTotalMb * 1024 * 1024, // per-file hard cap; finer checks in validation
    files: cfg.maxFiles,
  },
});

const aiJobsRouter = Router();

// REQ-019: every import endpoint requires a known operator role + is rate limited.
// The /sweep maintenance route below also benefits from the gate (operator-only).
aiJobsRouter.use(requireOperator);
aiJobsRouter.use(importRateLimit);

function toIncoming(files: Express.Multer.File[] | undefined): IncomingFile[] {
  return (files ?? []).map((f) => ({
    filename: f.originalname,
    declaredMime: f.mimetype,
    data: f.buffer,
  }));
}

function handleError(res: import('express').Response, err: unknown) {
  if (err instanceof AiExtractionError) {
    return res
      .status(err.kind === 'config' ? 400 : 503)
      .json({ error: err.message, kind: err.kind });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload non valido: ${err.code}` });
  }
  console.error('ai-jobs error:', err instanceof Error ? err.message : err);
  return res.status(500).json({ error: 'Errore interno import' });
}

// POST /ai/extraction/jobs — create a job, optionally with the first batch of files.
aiJobsRouter.post('/', upload.array('files'), async (req, res) => {
  try {
    const idempotencyKey = (req.header('Idempotency-Key') ||
      req.body?.idempotencyKey ||
      undefined) as string | undefined;
    const op = (req as AuthedRequest).operator;
    const job = await createJob({ idempotencyKey, createdById: op?.id });
    await recordAudit(job.id, 'job_created', { operatorId: op?.id });
    const incoming = toIncoming(req.files as Express.Multer.File[]);
    if (incoming.length === 0) return res.status(201).json({ job, outcomes: [] });
    const result = await addFiles(job.id, incoming);
    await recordAudit(job.id, 'files_added', {
      operatorId: op?.id,
      detail: `${incoming.length} file`,
    });
    return res.status(201).json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

// POST /ai/extraction/jobs/:id/files — add more files / photos to an existing job.
aiJobsRouter.post('/:id/files', upload.array('files'), async (req, res) => {
  try {
    const incoming = toIncoming(req.files as Express.Multer.File[]);
    const result = await addFiles(String(req.params.id), incoming);
    await recordAudit(String(req.params.id), 'files_added', {
      operatorId: (req as AuthedRequest).operator?.id,
      detail: `${incoming.length} file`,
    });
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

// GET /ai/extraction/jobs/:id — job status + documents.
aiJobsRouter.get('/:id', async (req, res) => {
  try {
    const job = await getJob(String(req.params.id));
    if (!job) return res.status(404).json({ error: 'Job non trovato' });
    return res.status(200).json(job);
  } catch (err) {
    return handleError(res, err);
  }
});

// DELETE /ai/extraction/jobs/:id/files/:docId — remove a single document/photo.
aiJobsRouter.delete('/:id/files/:docId', async (req, res) => {
  try {
    const job = await removeDocument(String(req.params.id), String(req.params.docId));
    return res.status(200).json(job);
  } catch (err) {
    return handleError(res, err);
  }
});

// POST /ai/extraction/jobs/:id/reorder — body { order: string[] } of document ids.
aiJobsRouter.post('/:id/reorder', async (req, res) => {
  try {
    const order: string[] = Array.isArray(req.body?.order) ? req.body.order : [];
    const job = await reorder(String(req.params.id), order);
    return res.status(200).json(job);
  } catch (err) {
    return handleError(res, err);
  }
});

// POST /ai/extraction/jobs/:id/files/:docId/logical — group photos into one logical document.
aiJobsRouter.post('/:id/files/:docId/logical', async (req, res) => {
  try {
    const logicalDoc = typeof req.body?.logicalDoc === 'string' ? req.body.logicalDoc : '';
    const job = await setLogicalDoc(String(req.params.id), String(req.params.docId), logicalDoc);
    return res.status(200).json(job);
  } catch (err) {
    return handleError(res, err);
  }
});

// POST /ai/extraction/jobs/:id/cancel — cancel + cleanup.
aiJobsRouter.post('/:id/cancel', async (req, res) => {
  try {
    const job = await cancelJob(String(req.params.id));
    await recordAudit(String(req.params.id), 'job_cancelled', {
      operatorId: (req as AuthedRequest).operator?.id,
    });
    return res.status(200).json(job);
  } catch (err) {
    return handleError(res, err);
  }
});

// POST /ai/extraction/jobs/:id/process — ENQUEUE for async processing (REQ-022).
// Returns 202 immediately; the worker runs extraction. Poll GET /:id for status.
aiJobsRouter.post('/:id/process', extractionCostGuard, async (req, res) => {
  const jobId = String(req.params.id);
  const op = (req as AuthedRequest).operator;
  try {
    const job = await enqueueJob(jobId);
    await recordAudit(jobId, 'process_started', { operatorId: op?.id, detail: 'enqueued' });
    return res.status(202).json({ ...job, message: 'Elaborazione avviata' });
  } catch (err) {
    return handleError(res, err);
  }
});

// POST /ai/extraction/jobs/:id/reopen — REQ-036: back to the editable "documents" phase.
// Keeps files + OCR inputs, invalidates the derived draft. Does NOT auto-reprocess.
aiJobsRouter.post('/:id/reopen', async (req, res) => {
  const jobId = String(req.params.id);
  try {
    const job = await reopenJob(jobId);
    await recordAudit(jobId, 'process_started', {
      operatorId: (req as AuthedRequest).operator?.id,
      detail: 'reopen',
    });
    return res.status(200).json(job);
  } catch (err) {
    return handleError(res, err);
  }
});

// POST /ai/extraction/jobs/:id/retry — re-queue a failed/retryable job, files kept (REQ-022).
aiJobsRouter.post('/:id/retry', extractionCostGuard, async (req, res) => {
  const jobId = String(req.params.id);
  try {
    const job = await retryJob(jobId);
    await recordAudit(jobId, 'process_started', {
      operatorId: (req as AuthedRequest).operator?.id,
      detail: 'retry',
    });
    return res.status(202).json({ ...job, message: 'Nuovo tentativo avviato' });
  } catch (err) {
    return handleError(res, err);
  }
});

// POST /ai/extraction/jobs/:id/confirm — transactional patient creation (REQ-018).
// Body: { patient, cartella?, idempotencyKey?, confirmDuplicate? }.
aiJobsRouter.post('/:id/confirm', async (req, res) => {
  try {
    const payload = (req.body ?? {}) as ConfirmPayload;
    const result = await confirmJob(String(req.params.id), payload);
    if (result.status === 'duplicate') {
      return res.status(409).json(result); // client re-submits with confirmDuplicate:true
    }
    // created -> 201; updated/idempotent -> 200
    return res.status(result.status === 'created' ? 201 : 200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

// GET /ai/extraction/jobs/:id/result — validated extraction result (REQ-015).
aiJobsRouter.get('/:id/result', async (req, res) => {
  try {
    const result = await getJobResult(String(req.params.id));
    if (!result) return res.status(404).json({ error: 'Job non trovato' });
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

// POST /ai/extraction/jobs/sweep — manual retention sweep (also runs on an interval).
aiJobsRouter.post('/sweep', async (_req, res) => {
  try {
    const result = await sweepExpiredJobs();
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

export default aiJobsRouter;
