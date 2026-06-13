import { Router } from 'express';
import multer from 'multer';
import { loadAiConfig } from '../ai/config.js';
import { AiExtractionError } from '../ai/types.js';
import {
  addFiles,
  cancelJob,
  createJob,
  getJob,
  processJob,
  removeDocument,
  reorder,
  sweepExpiredJobs,
} from '../ai/upload/job-service.js';
import type { IncomingFile } from '../ai/upload/validation.js';

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

function toIncoming(files: Express.Multer.File[] | undefined): IncomingFile[] {
  return (files ?? []).map((f) => ({
    filename: f.originalname,
    declaredMime: f.mimetype,
    data: f.buffer,
  }));
}

function handleError(res: import('express').Response, err: unknown) {
  if (err instanceof AiExtractionError) {
    return res.status(err.kind === 'config' ? 400 : 503).json({ error: err.message, kind: err.kind });
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
    const idempotencyKey = (req.header('Idempotency-Key') || req.body?.idempotencyKey || undefined) as string | undefined;
    const job = await createJob({ idempotencyKey });
    const incoming = toIncoming(req.files as Express.Multer.File[]);
    if (incoming.length === 0) return res.status(201).json({ job, outcomes: [] });
    const result = await addFiles(job.id, incoming);
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

// POST /ai/extraction/jobs/:id/cancel — cancel + cleanup.
aiJobsRouter.post('/:id/cancel', async (req, res) => {
  try {
    const job = await cancelJob(String(req.params.id));
    return res.status(200).json(job);
  } catch (err) {
    return handleError(res, err);
  }
});

// POST /ai/extraction/jobs/:id/process — explicit start of extraction (REQ-015 fills result).
aiJobsRouter.post('/:id/process', async (req, res) => {
  try {
    const job = await processJob(String(req.params.id));
    return res.status(200).json(job);
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
