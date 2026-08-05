// Import job orchestration (REQ-014/REQ-023).
//
// Receives multiple documents/photos, validates + dedups + stores them as a job,
// and manages job lifecycle. NO Patient data is written here — confirmation and
// persistence are REQ-018; extraction is REQ-015.
//
// REQ-023: extraction is delegated to the AI Runtime service via neutral HTTP contract.
// The backend has NO Google/provider imports — only AI_RUNTIME_URL + AI_RUNTIME_SERVICE_TOKEN.

import { access, readFile } from 'node:fs/promises';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { loadAiConfig, loadExtractionPrompt, loadOutputSchema, type AiConfig } from '../config.js';
import { recordAudit } from '../audit.js';
import { mergeExtractions, type DocResult, type MergedProposal } from '../merge.js';
import {
  buildSectionsRequest,
  postProcessSections,
  buildNarrativeDraft,
  narrativeFromRawText,
  parseNarrativeFromMarkdown,
  narrativeHasSectionText,
  type SectionsResult,
} from '../sections/index.js';
import { filterRepeatedHeaders } from '../sections/header-filter.js';
import { AiExtractionError } from '../types.js';
import { validateFile, type IncomingFile, type RejectReason } from './validation.js';
import { removeFile, removeJobDir, storeFile, sweepExpiredDirs } from './storage.js';

export type JobStatus =
  | 'created'
  | 'uploaded'
  | 'queued'
  | 'uploading_to_google'
  | 'waiting_for_model'
  | 'validating_response'
  | 'repairing_response'
  | 'review_ready'
  | 'retryable_error'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'confirmed'
  // legacy transient kept for backward compatibility
  | 'validating'
  | 'processing';

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
const ACTIVE: JobStatus[] = [
  'queued',
  'uploading_to_google',
  'waiting_for_model',
  'validating_response',
  'repairing_response',
  'processing',
];

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
  // Il tetto e' sulla SINGOLA richiesta, non sull'elaborazione: il runtime lavora in modo
  // asincrono (run risponde 202, lo stato si legge in polling), quindi nessuna di queste
  // chiamate deve attendere il modello. Senza AbortSignal una connessione appesa blocca il
  // poll per sempre e il job resta in "waiting_for_model" senza mai fallire ne' scadere.
  const timeoutMs = loadAiConfig().requestTimeoutMs;
  try {
    return await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers ?? {}),
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      throw new AiExtractionError('timeout', `Runtime non risponde entro ${timeoutMs}ms: ${path}`);
    }
    throw err;
  }
}

/** POST /v1/document-jobs — create a runtime job */
async function runtimeCreateJob(
  jobId: string,
  documents: Array<{ id: string; filename: string; mimeType: string; data: Buffer }>,
  schema: unknown,
  prompt: string,
): Promise<string> {
  const body = buildRuntimeCreateBody(jobId, documents, schema, prompt);
  const res = await runtimeFetch('/v1/document-jobs', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AiExtractionError(
      'provider_error',
      `Runtime createJob failed: ${res.status} ${text}`,
    );
  }
  const json = (await res.json()) as { job_id: string };
  return json.job_id;
}

/** POST /v1/document-jobs/:id/run — trigger async processing */
// `mode` sceglie il RUOLO che esegue il job lato runtime: 'extraction' usa il modello di
// estrazione, 'ocr' il motore di layout (Document Intelligence), che restituisce markdown.
async function runtimeRunJob(runtimeJobId: string, mode: 'extraction' | 'ocr' = 'extraction') {
  const res = await runtimeFetch(`/v1/document-jobs/${runtimeJobId}/run`, {
    method: 'POST',
    body: JSON.stringify({ mode }),
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
  const j = (await res.json()) as RuntimeJobStatus & { error?: unknown };
  // The runtime returns a normalized error OBJECT {kind,message}; coerce to a string
  // so it can be stored (job.error is a String column) and shown to the operator.
  if (j.error && typeof j.error === 'object') {
    const e = j.error as { kind?: string; message?: string };
    j.error = `[${e.kind ?? 'error'}] ${e.message ?? ''}`.trim();
  }
  return j as RuntimeJobStatus;
}

/** GET /v1/document-jobs/:id/result — fetch extraction result */
async function runtimeGetResult(runtimeJobId: string): Promise<RuntimeJobResult> {
  const res = await runtimeFetch(`/v1/document-jobs/${runtimeJobId}/result`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AiExtractionError(
      'provider_error',
      `Runtime getResult failed: ${res.status} ${text}`,
    );
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
  raw:
    { anagrafica?: Record<string, unknown>; cartella?: Record<string, unknown> } | null | undefined,
  documents: Array<{ id: string; filename: string }>,
  model: string,
  preferRecent: boolean,
): MergedProposal {
  const docResults: DocResult[] = [
    {
      docId: documents[0]?.id ?? 'doc',
      filename: documents.map((d) => d.filename).join(', ') || 'documento',
      model,
      data: { anagrafica: raw?.anagrafica, cartella: raw?.cartella },
    },
  ];
  return mergeExtractions(docResults, { preferRecent });
}

// Best-effort integral OCR transcription (REQ-015 "Testo riconosciuto"). Runs as a
// SEPARATE runtime job so a long/truncated transcription can never break the
// structured extraction. Returns '' on any failure.
// Le intestazioni markdown NON sono un vezzo di formattazione: `parseNarrativeFromMarkdown`
// segmenta la narrativa su di esse. Mistral Document AI le produceva nativamente; un modello
// generalista no, e senza di esse il parser aggancia la prima etichetta utile e ammassa TUTTO
// il referto in un'unica sezione (osservato in produzione: 17.880 caratteri su 18.987 finiti in
// PRESTAZIONI_E_INTERVENTI, con Terapia e Diagnosi vuote). Le euristiche di fallback sul testo
// piano sono fragili — scartano le righe con punteggiatura o piu' lunghe di 60 caratteri —
// mentre una riga `## NOME` viene riconosciuta sempre.
const TRANSCRIBE_PROMPT =
  'Sei un sistema OCR clinico. Trascrivi INTEGRALMENTE e fedelmente tutto il testo ' +
  "leggibile dei documenti allegati, mantenendo l'ordine originale. Non riassumere, " +
  'non interpretare, non tradurre, non dedurre. Per parti illeggibili usa [ILLEGGIBILE]. ' +
  'STRUTTURA: ogni volta che nel documento inizia una sezione clinica, inserisci PRIMA del ' +
  'suo contenuto una riga di intestazione markdown `## NOME`, scegliendo NOME tra: ' +
  'ANAMNESI, DIAGNOSI, DECORSO_OSPEDALIERO, CONSULENZE, DIAGNOSTICA_PER_IMMAGINI, ' +
  'PRESTAZIONI_E_INTERVENTI, TERAPIA, CONSIGLI_E_CONTROLLI, ALLERGIE. ' +
  "Usa TERAPIA per la terapia farmacologica alla dimissione o domiciliare. Conserva anche l'" +
  'intestazione originale del documento subito sotto quella markdown. Non inventare sezioni ' +
  "assenti e non spostare testo da una sezione all'altra: il contenuto resta dove si trova. " +
  'Restituisci SOLO JSON valido nel formato {"rawText": "<trascrizione integrale>"}.';

// Deve essere un JSON Schema VERO, non un esempio: gli adapter con structured output nativo
// (Azure gpt-5.5) lo passano in `response_format` e un esempio verrebbe rifiutato con 400,
// facendo fallire la trascrizione in silenzio (e' best-effort, quindi l'errore non emerge).
const TRANSCRIBE_SCHEMA = {
  type: 'object',
  properties: { rawText: { type: 'string' } },
  required: ['rawText'],
  additionalProperties: false,
};

async function runtimeTranscribe(
  jobId: string,
  documents: Array<{ id: string; filename: string; mimeType: string; data: Buffer }>,
): Promise<string> {
  const rid = await runtimeCreateJob(jobId, documents, TRANSCRIBE_SCHEMA, TRANSCRIBE_PROMPT);
  // Ruolo 'ocr': se e' configurato un motore di layout produce markdown con le intestazioni
  // e una riga per voce (elenchi di terapia inclusi); se il ruolo 'ocr' punta a un modello di
  // chat il prompt qui sopra continua a valere e il comportamento resta quello di prima.
  await runtimeRunJob(rid, 'ocr');
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const s = await runtimeGetJob(rid);
    const { jobStatus, isTerminal } = mapRuntimeStatus(s.status);
    if (isTerminal) {
      if (jobStatus !== 'review_ready') return '';
      const r = await runtimeGetResult(rid);
      return String((r.data as { rawText?: unknown } | null)?.rawText ?? '');
    }
  }
  return '';
}

// Focused second pass for the clinical LISTS (REQ-015 tuning). gemma omits these from
// the big monolithic schema, but handles a small, directive, list-only task. Best-effort:
// merged into the main extraction only when it finds items; never blocks the import.
// Come TRANSCRIBE_SCHEMA: JSON Schema vero, non un esempio (vedi nota sopra).
const listOf = (props: string[]) => ({
  type: 'array',
  items: {
    type: 'object',
    properties: Object.fromEntries(props.map((p) => [p, { type: 'string' }])),
    additionalProperties: false,
  },
});
const CLINICAL_LISTS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    diagnosi: listOf(['codiceICD', 'descrizione', 'tipo', 'stato']),
    allergie: listOf(['allergene', 'reazione', 'gravita']),
    farmaci: listOf(['nome', 'dose', 'frequenza', 'via']),
    terapie: listOf(['tipo', 'descrizione']),
  },
};
const CLINICAL_LISTS_PROMPT =
  'Sei un estrattore clinico. Dai documenti allegati estrai TUTTE le diagnosi, allergie, ' +
  "farmaci e terapie presenti. Per OGNI voce trovata inserisci un oggetto nell'array " +
  'corrispondente (es. due allergie => due oggetti in "allergie"). Se una categoria è ' +
  'assente, usa []. Non inventare. Restituisci SOLO JSON valido conforme allo schema fornito.';
const CLINICAL_LIST_KEYS = ['diagnosi', 'allergie', 'farmaci', 'terapie'] as const;

async function runtimeClinicalLists(
  jobId: string,
  documents: Array<{ id: string; filename: string; mimeType: string; data: Buffer }>,
  rawText = '',
): Promise<Record<string, unknown>> {
  // Con una trascrizione fedele al layout il compito diventa "leggi queste righe" invece di
  // "interpreta queste immagini": e' sugli elenchi di farmaci, dove dose e posologia sono
  // allineate in colonna, che la differenza si sente di piu'.
  const prompt = rawText.trim()
    ? `${CLINICAL_LISTS_PROMPT}\n\nTESTO DEL DOCUMENTO (ogni riga e' una voce a se'):\n${rawText}`
    : CLINICAL_LISTS_PROMPT;
  const rid = await runtimeCreateJob(jobId, documents, CLINICAL_LISTS_SCHEMA, prompt);
  await runtimeRunJob(rid);
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const s = await runtimeGetJob(rid);
    const { jobStatus, isTerminal } = mapRuntimeStatus(s.status);
    if (isTerminal) {
      if (jobStatus !== 'review_ready') return {};
      const r = await runtimeGetResult(rid);
      return (r.data as Record<string, unknown> | null) ?? {};
    }
  }
  return {};
}

/** Overlay focused clinical lists onto the main extraction when they found items. */
function applyClinicalLists(
  raw: { anagrafica?: Record<string, unknown>; cartella?: Record<string, unknown> } | null,
  lists: Record<string, unknown>,
): { anagrafica?: Record<string, unknown>; cartella?: Record<string, unknown> } {
  const base = raw ?? {};
  const cartella = { ...(base.cartella ?? {}) };
  for (const k of CLINICAL_LIST_KEYS) {
    const v = lists[k];
    if (
      Array.isArray(v) &&
      v.some(
        (it) =>
          it && typeof it === 'object' && Object.values(it).some((x) => x !== '' && x != null),
      )
    ) {
      cartella[k] = v;
    }
  }
  return { ...base, cartella };
}

// Faithful clinical-sections pass (REQ-026). Best-effort, opt-in via AI_SECTIONS_PASS.
// Adds one model call per import; never blocks the import. Output is post-processed
// (annotations reconciled, single block per section, allergy status) before storage.
async function runtimeSections(
  jobId: string,
  documents: Array<{ id: string; filename: string; mimeType: string; data: Buffer }>,
): Promise<SectionsResult | null> {
  const { schema, prompt } = buildSectionsRequest();
  const rid = await runtimeCreateJob(jobId, documents, schema, prompt);
  await runtimeRunJob(rid);
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const s = await runtimeGetJob(rid);
    const { jobStatus, isTerminal } = mapRuntimeStatus(s.status);
    if (isTerminal) {
      if (jobStatus !== 'review_ready') return null;
      const r = await runtimeGetResult(rid);
      try {
        return postProcessSections(r.data);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Map runtime status string to ClinicOS JobStatus */
export function mapRuntimeStatus(runtimeStatus: string): {
  jobStatus: JobStatus;
  isTerminal: boolean;
} {
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
export async function createJob(
  opts: { idempotencyKey?: string; createdById?: string } = {},
): Promise<PublicJob> {
  const cfg = loadAiConfig();
  if (opts.idempotencyKey) {
    const existing = await prisma.importJob.findUnique({
      where: { idempotencyKey: opts.idempotencyKey },
    });
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
export async function addFiles(
  jobId: string,
  files: IncomingFile[],
): Promise<{ job: PublicJob; outcomes: FileOutcome[] }> {
  const cfg = loadAiConfig();
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    include: { documents: true },
  });
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
      outcomes.push({
        filename: incoming.filename,
        status: 'rejected',
        reason: res.reason,
        message: res.message,
      });
      continue;
    }
    const vf = res.file;
    if (seen.has(vf.sha256)) {
      outcomes.push({
        filename: incoming.filename,
        status: 'duplicate',
        message: 'Documento già presente nel job',
      });
      continue;
    }
    if (acceptedCount + 1 > job.maxFiles) {
      outcomes.push({
        filename: incoming.filename,
        status: 'rejected',
        reason: 'too_large',
        message: `Massimo ${job.maxFiles} file per job`,
      });
      continue;
    }
    if (runningTotal + vf.sizeBytes > maxTotalBytes) {
      outcomes.push({
        filename: incoming.filename,
        status: 'rejected',
        reason: 'too_large',
        message: 'Dimensione totale superata',
      });
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
        // BUG-049: keep a durable in-DB copy too — disk is used for OCR processing, but the DB copy
        // guarantees the file can still become a PatientDocument at confirm on ephemeral storage.
        dataBase64: incoming.data.toString('base64'),
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
  const totalFiles = job.documents.filter(
    (d) => d.status !== 'duplicate' && d.status !== 'rejected',
  ).length;
  const completedFiles = job.documents.filter(
    (d) => d.status === 'completed' || d.status === 'uploaded',
  ).length;
  const elapsedSeconds = job.startedAt
    ? Math.max(0, Math.round((Date.now() - job.startedAt.getTime()) / 1000))
    : 0;
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
export async function setLogicalDoc(
  jobId: string,
  docId: string,
  logicalDoc: string,
): Promise<PublicJob> {
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
  await prisma.importJob.update({
    where: { id: jobId },
    data: { status: 'expired', totalBytes: 0 },
  });
  return (await getJob(jobId))!;
}

/** Enqueue a job for async processing (REQ-022): Returns immediately; the worker runs it.
 *  REQ-036: idempotent — a double press while the job is already queued/in-flight is a no-op
 *  (never starts a second run, never resets an in-flight job back to `queued`). */
export async function enqueueJob(jobId: string): Promise<PublicJob> {
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job) throw new AiExtractionError('config', 'Job non trovato');
  const status = job.status as JobStatus;
  // Already queued or actively processing → idempotent no-op (REQ-036 double-press guard).
  if (status === 'queued' || ACTIVE.includes(status)) return (await getJob(jobId))!;
  if (!['uploaded', 'validating'].includes(status)) {
    throw new AiExtractionError('config', `Job non accodabile nello stato ${status}`);
  }
  await setState(jobId, 'queued', { stage: 'queued', error: null, errorCode: null } as Record<
    string,
    unknown
  >);
  await recordAudit(jobId, 'process_started', { detail: 'enqueue → queued' });
  return (await getJob(jobId))!;
}

/**
 * REQ-036: return a processed/failed job to the editable "Caricamento" phase so the operator can
 * reorder, add or remove documents and then reprocess — WITHOUT re-uploading. The files and their
 * on-disk OCR inputs are kept; only the derived draft is invalidated. Does NOT auto-reprocess.
 * Allowed from a terminal-but-not-confirmed state OR from an in-flight state (cooperative abort:
 * runJob notices the `uploaded` status and stops before persisting a stale result).
 */
export async function reopenJob(jobId: string): Promise<PublicJob> {
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job) throw new AiExtractionError('config', 'Job non trovato');
  const status = job.status as JobStatus;
  if (status === 'confirmed')
    throw new AiExtractionError('config', 'Paziente già creato: job non riapribile');
  if (status === 'expired' || status === 'cancelled')
    throw new AiExtractionError('config', `Job non riapribile nello stato ${status}`);
  // Back to the editable phase; invalidate the derived draft, keep files + documents.
  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: 'uploaded',
      stage: null,
      error: null,
      errorCode: null,
      currentFileName: null,
      startedAt: null,
      resultData: Prisma.DbNull,
      model: null,
    },
  });
  await recordAudit(jobId, 'process_started', { detail: 'reopen → uploaded (draft invalidated)' });
  return (await getJob(jobId))!;
}

/** Retry a failed/retryable job. */
export async function retryJob(jobId: string): Promise<PublicJob> {
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job) throw new AiExtractionError('config', 'Job non trovato');
  if (!['retryable_error', 'failed'].includes(job.status)) {
    throw new AiExtractionError('config', `Job non ritentabile nello stato ${job.status}`);
  }
  await prisma.importJob.update({
    where: { id: jobId },
    data: { status: 'queued', stage: 'queued', error: null },
  });
  await recordAudit(jobId, 'process_started', { detail: 'retry → queued' });
  return (await getJob(jobId))!;
}

async function setState(
  jobId: string,
  status: JobStatus,
  extra: Record<string, unknown> = {},
): Promise<void> {
  await prisma.importJob.update({ where: { id: jobId }, data: { status, ...extra } });
}

/**
 * REQ-036: a run is "superseded" when the operator reopened/cancelled the job mid-flight
 * (status flipped back to `uploaded`, or to `cancelled`/`expired`). The in-flight runJob
 * checks this cooperatively and aborts WITHOUT persisting a stale result, so the invalidated
 * draft stays invalidated and the operator's new order/reprocess wins.
 */
async function runSuperseded(jobId: string): Promise<boolean> {
  const j = await prisma.importJob.findUnique({ where: { id: jobId }, select: { status: true } });
  return !j || j.status === 'uploaded' || j.status === 'cancelled' || j.status === 'expired';
}

/**
 * Worker entrypoint (REQ-022/REQ-023): run a CLAIMED job through the AI Runtime.
 * Calls the neutral HTTP contract: POST /v1/document-jobs → POST :id/run → poll GET :id → GET :id/result.
 * Maps runtime status into the existing job state machine (REQ-022).
 * No provider SDK is imported — only AI_RUNTIME_URL and AI_RUNTIME_SERVICE_TOKEN are used.
 */
export async function runJob(jobId: string): Promise<void> {
  // REQ-036: documents MUST be read in the operator-defined order (sortOrder). The extraction
  // (page merge, section continuity) depends on it; a wrong order splits Diagnosi/Anamnesi/Decorso.
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    include: { documents: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!job) return;

  const usable = job.documents.filter((d) => d.status === 'uploaded');
  if (usable.length === 0) {
    await setState(jobId, 'failed', { error: 'Nessun documento valido', stage: 'error' });
    return;
  }

  await setState(jobId, 'uploading_to_google', {
    stage: 'uploading_files',
    startedAt: new Date(),
    error: null,
  });

  try {
    // 0. Load the prompt + the real JSON Schema. Structured-output models (Mistral
    //    Document AI) use it as the annotation schema; chat models get it in-prompt.
    const cfg = loadAiConfig();
    const schema = loadOutputSchema(cfg);
    const prompt = loadExtractionPrompt(cfg);

    // 1. Read files from disk.
    // I documenti vivono sul disco EFFIMERO del container: se questo e' stato sostituito fra
    // il caricamento e l'elaborazione (deploy, riavvio, oppure una seconda istanza che non ha
    // ricevuto l'upload), i file non ci sono piu'. Va accertato SUBITO e detto in chiaro:
    // lasciando che il guasto emerga a meta' pipeline, i passaggi best-effort lo inghiottono e
    // il job finisce per somigliare a un import riuscito ma vuoto — che su una lettera di
    // dimissione puo' far concludere all'operatore che la terapia non c'era.
    const mancanti: string[] = [];
    for (const d of usable) {
      try {
        await access(d.storagePath);
      } catch {
        mancanti.push(d.filename);
      }
    }
    if (mancanti.length > 0) {
      await setState(jobId, 'failed', {
        stage: 'error',
        error:
          `Documenti non piu' disponibili sul server (${mancanti.length} di ${usable.length}). ` +
          'Ricaricali e riprova.',
      });
      // Non e' 'retryable_error': riprovare senza ricaricare non puo' funzionare, i file
      // non esistono. Dirlo esplicitamente evita all'operatore un giro di tentativi inutili.
      await recordAudit(jobId, 'process_failed', { detail: 'documenti mancanti su disco' });
      return;
    }
    const docFiles = await Promise.all(
      usable.map(async (d) => ({
        id: d.id,
        filename: d.filename,
        mimeType: d.mimeType,
        data: await readFile(d.storagePath),
      })),
    );

    // 2. Trascrizione PRIMA dell'estrazione. Con un motore di layout (Document Intelligence)
    //    il testo arriva fedele riga per riga: darlo al modello di estrazione, invece di
    //    fargli rileggere i pixel da zero, e' cio' che tiene insieme farmaco, dose e posologia
    //    quando stanno su colonne o dopo spaziature ampie. E' anche piu' economico: elaborare
    //    testo costa una frazione rispetto alle immagini.
    let rawText = '';
    if (process.env.AI_OCR_TRANSCRIPTION !== 'false') {
      try {
        await setState(jobId, 'waiting_for_model', { stage: 'transcribing' });
        rawText = await runtimeTranscribe(jobId, docFiles);
      } catch {
        /* trascrizione best-effort: se fallisce si estrae dalle sole immagini, come prima */
      }
    }
    // Con una trascrizione sostanziosa le immagini diventano ridondanti e si possono omettere
    // (meno token, import piu' veloce). Se l'OCR ha reso poco o nulla si torna alle immagini,
    // che restano la sorgente di verita'.
    const OCR_ENOUGH_CHARS = 200;
    const ocrUsable = rawText.trim().length >= OCR_ENOUGH_CHARS;
    const extractionPrompt = ocrUsable
      ? `${prompt}\n\nTESTO DEL DOCUMENTO (trascrizione fedele al layout: ogni riga e' una voce a se'):\n${rawText}`
      : prompt;
    const extractionFiles = ocrUsable ? [] : docFiles;

    // 3. Create runtime job
    await setState(jobId, 'uploading_to_google', { stage: 'uploading_files' });
    const runtimeJobId = await runtimeCreateJob(jobId, extractionFiles, schema, extractionPrompt);
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
      // REQ-036: operator reopened the job (back to documents) while we were running → abort
      // quietly and DO NOT overwrite the now-editable state with a stale extraction result.
      if (await runSuperseded(jobId)) {
        await recordAudit(jobId, 'process_failed', { detail: 'superseded by reopen' });
        return;
      }
      const rStatus = await runtimeGetJob(runtimeJobId);
      const { jobStatus, isTerminal } = mapRuntimeStatus(rStatus.status);

      await setState(jobId, jobStatus, {
        stage: rStatus.stage ?? null,
        ...(rStatus.model ? { model: rStatus.model } : {}),
      });

      if (isTerminal) {
        if (jobStatus === 'review_ready') {
          // 5. Fetch result. Persist BOTH the merged proposal (compat: report/conflicts)
          //    AND the full raw extraction (_full, lossless — every schema field) plus a
          //    best-effort integral transcription (rawText) for the full review editor.
          const resultPayload = await runtimeGetResult(runtimeJobId);
          let raw = resultPayload.data as {
            anagrafica?: Record<string, unknown>;
            cartella?: Record<string, unknown>;
          } | null;
          const modelUsed = resultPayload.model ?? rStatus.model ?? 'runtime';
          // Focused clinical-lists pass (best-effort, opt-in). Adds one model call per
          // import — disabled by default to protect constrained provider quota. Enable
          // with AI_CLINICAL_LISTS_PASS=true once a capable/quota'd model is configured.
          if (process.env.AI_CLINICAL_LISTS_PASS === 'true') {
            try {
              // Come l'estrazione principale: se c'e' una trascrizione fedele al layout la si
              // passa al posto delle immagini. E' proprio sugli elenchi (farmaci con dose e
              // posologia) che la fedelta' di riga conta di piu'.
              const lists = await runtimeClinicalLists(jobId, extractionFiles, rawText);
              raw = applyClinicalLists(raw, lists);
            } catch {
              /* best-effort; keep the main extraction */
            }
          }
          const merged = wrapRuntimeResult(
            raw,
            usable.map((d) => ({ id: d.id, filename: d.filename })),
            modelUsed,
            cfg.mergePreferRecent,
          );
          // `rawText` e' gia' stato prodotto PRIMA dell'estrazione (passo 2) e da' in pasto al
          // modello il testo fedele al layout: qui serve solo per l'anteprima e per il parsing
          // delle sezioni, senza una seconda chiamata al servizio.
          // REQ-033: faithful clinical-sections + narrative are now the DEFAULT import path
          // (set AI_SECTIONS_PASS=false only to disable). The discharge letter is never
          // rendered as structured diagnosis/therapy rows.
          // REQ-028/033: flat narrative draft (faithful text blocks, NO diagnoses[]/medications[]
          // arrays). ALWAYS present — derived from the sections when available, otherwise from
          // the integral OCR rawText, so the UI never falls back to the legacy structured table.
          const ana = (raw?.anagrafica ?? {}) as Record<string, unknown>;
          const demo = {
            firstName: String(ana.nome ?? ''),
            lastName: String(ana.cognome ?? ''),
            dateOfBirth: String(ana.dataNascita ?? ''),
            sex: String(ana.sesso ?? ''),
            fiscalCode: String(
              (raw?.cartella as Record<string, unknown> | undefined)?.codiceFiscale ?? '',
            ),
          };
          // REQ-037: strip repetitive page headers/footers from the combined transcription BEFORE
          // composing sections, so a per-page patient header can't break Anamnesi/Decorso/Terapia
          // continuity or duplicate the anagraphic data. `rawText` (the integral OCR) is kept
          // immutable for the document preview; `cleanedRawText` is what the parser consumes.
          const hf = filterRepeatedHeaders(rawText);
          const cleanedRawText = hf.cleanedText;
          // REQ-035: populate the narrative from the (cleaned) OCR markdown — the model already
          // produced the section text; just map it (no extra AI call). Prefer this when it found
          // section text; otherwise fall back to the sections pass, then to raw text.
          let narrative = parseNarrativeFromMarkdown(
            cleanedRawText,
            demo,
            usable[0] ? { id: usable[0].id, filename: usable[0].filename } : undefined,
          );
          // The sections pass is a further FULL model round-trip over every document — the most
          // expensive step of the import — and its result is only consumed when the markdown parse
          // above found no section text. Run it lazily, so the common case pays for it no more.
          let sections: SectionsResult | null = null;
          if (!narrativeHasSectionText(narrative)) {
            if (process.env.AI_SECTIONS_PASS !== 'false') {
              try {
                await setState(jobId, 'waiting_for_model', { stage: 'sectioning' });
                sections = await runtimeSections(jobId, docFiles);
              } catch {
                /* sectioning is best-effort; the narrative falls back to the integral OCR text */
              }
            }
            narrative = sections
              ? buildNarrativeDraft(
                  sections,
                  usable.map((d) => ({ id: d.id, filename: d.filename })),
                )
              : narrativeFromRawText(cleanedRawText, demo);
          }
          // REQ-036: final supersede check — the operator may have reopened during the
          // best-effort transcription/sections passes above. Never persist a stale draft.
          if (await runSuperseded(jobId)) {
            await recordAudit(jobId, 'process_failed', {
              detail: 'superseded by reopen (pre-persist)',
            });
            return;
          }
          await prisma.importJob.update({
            where: { id: jobId },
            data: {
              status: 'review_ready',
              stage: 'completed',
              resultData: {
                ...merged,
                _full: raw ?? {},
                rawText,
                cleanedRawText,
                _headerFilter: {
                  warnings: hf.warnings,
                  removedHeaderBlocks: hf.removedHeaderBlocks,
                  removedFooterLines: hf.removedFooterLines,
                  detectedPageNumbers: hf.detectedPageNumbers,
                  matchedLabels: hf.matchedLabels,
                },
                _sections: sections,
                _narrative: narrative,
              } as object,
              model: modelUsed,
            },
          });
          await recordAudit(jobId, 'process_completed', {
            detail: 'runtime extraction + merge + transcription',
          });
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
    const retryable =
      kind === 'timeout' || kind === 'provider_error' || kind === 'provider_unavailable';
    await setState(jobId, retryable ? 'retryable_error' : 'failed', {
      stage: 'error',
      error: `[${kind}] ${message}`,
    });
    await recordAudit(jobId, 'process_failed', { detail: kind });
  }
}

/**
 * REQ-035: idempotently (re)build the narrative draft for an already-processed job from its
 * stored OCR markdown (rawText) — no new AI call. Returns the (possibly updated) resultData.
 * Heals older jobs whose `_narrative` section text is empty even though rawText has content.
 */
export async function rebuildNarrativeDraftFromExistingExtraction(
  jobId: string,
  resultData: Record<string, unknown> | null,
): Promise<Record<string, unknown> | null> {
  if (!resultData) return resultData;
  const rawText = typeof resultData.rawText === 'string' ? resultData.rawText : '';
  const current = resultData._narrative as { allergiesText?: string } | null | undefined;
  const hasText = !!current && narrativeHasSectionText(current as never);
  if (hasText || !rawText.trim()) return resultData; // already populated, or nothing to parse
  const ana = ((resultData._full as { anagrafica?: Record<string, unknown> } | undefined)
    ?.anagrafica ?? {}) as Record<string, unknown>;
  // REQ-037: parse from the header/footer-cleaned text (reuse the stored cleaned text when present).
  const cleaned =
    typeof resultData.cleanedRawText === 'string' && resultData.cleanedRawText.trim()
      ? resultData.cleanedRawText
      : filterRepeatedHeaders(rawText).cleanedText;
  const rebuilt = parseNarrativeFromMarkdown(cleaned, {
    firstName: String(ana.nome ?? ''),
    lastName: String(ana.cognome ?? ''),
    dateOfBirth: String(ana.dataNascita ?? ''),
    sex: String(ana.sesso ?? ''),
  });
  if (!narrativeHasSectionText(rebuilt)) return resultData; // no recognisable sections — leave as-is
  const updated = { ...resultData, _narrative: rebuilt };
  try {
    await prisma.importJob.update({
      where: { id: jobId },
      data: { resultData: updated as object },
    });
  } catch {
    /* read path must not fail on a heal-write error */
  }
  return updated;
}

/** Extraction result for review (REQ-015 → consumed by REQ-016/017). */
export async function getJobResult(
  jobId: string,
): Promise<{ status: JobStatus; model: string | null; resultData: unknown } | null> {
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    select: { status: true, model: true, resultData: true },
  });
  if (!job) return null;
  // REQ-035: self-heal legacy jobs whose narrative text was never populated from the markdown.
  const resultData = await rebuildNarrativeDraftFromExistingExtraction(
    jobId,
    job.resultData as Record<string, unknown> | null,
  );
  return { status: job.status as JobStatus, model: job.model, resultData };
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
    await prisma.importJob.update({
      where: { id: j.id },
      data: { status: 'expired', totalBytes: 0 },
    });
  }
  const removedDirs = await sweepExpiredDirs();
  return { expiredJobs: expired.length, removedDirs };
}
