import { Router } from 'express';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import {
  createDraft,
  getDraft,
  patchDraft,
  listDrafts,
  seedDraftFromImport,
} from '../intake/draft-service.js';
import { confirmDraft } from '../ai/upload/confirm-service.js';
import { AiExtractionError } from '../ai/types.js';
import { importJobIsAccessible, requireOwnedIntakeDraft } from '../ai/ownership.js';
import { confirmPayloadFromDraft } from '../intake/confirm-payload.js';

// ── Intake Drafts Router — mounted at /intake/drafts (F3 EPIC #120 / #125) ───
// Operator-gated CRUD + autosave endpoints for PatientIntakeDraft.

const intakeDraftsRouter = Router();

intakeDraftsRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});
intakeDraftsRouter.use(requireOperator);
intakeDraftsRouter.param('id', requireOwnedIntakeDraft);

function handleError(res: import('express').Response, err: unknown) {
  // Clinical-safety / validation blocks from confirmDraft (allergy conflict, section loss,
  // invalid input) carry a specific Italian message the UI must surface — map like ai-jobs.
  if (err instanceof AiExtractionError) {
    const status = err.kind === 'not_found' ? 404 : err.kind === 'config' ? 400 : 503;
    return res.status(status).json({ error: err.message, kind: err.kind });
  }
  // Prisma "record not found" (e.g. patchDraft on a missing/confirmed draft) → 404, not 500.
  if (err && typeof err === 'object' && (err as { code?: string }).code === 'P2025') {
    return res.status(404).json({ error: 'Bozza non trovata' });
  }
  console.error('intake-drafts error:', err instanceof Error ? err.message : err);
  return res.status(500).json({ error: 'Errore interno bozza intake' });
}

// POST /intake/drafts/from-import — seed a draft from a completed AI extraction job.
// Body: { importJobId: string }
// Idempotent: if a draft already exists for the jobId, returns it (no duplicate).
// Returns 201 { id, data } on create or idempotent return.
intakeDraftsRouter.post('/from-import', async (req, res) => {
  try {
    const op = (req as AuthedRequest).operator;
    const { importJobId } = req.body ?? {};
    if (typeof importJobId !== 'string' || !importJobId.trim()) {
      return res.status(400).json({ error: 'importJobId è obbligatorio' });
    }
    if (!(await importJobIsAccessible(importJobId.trim(), op))) {
      return res.status(404).json({ error: 'Job non trovato' });
    }
    const draft = await seedDraftFromImport(importJobId.trim(), {
      createdById: op?.id,
      actor: op,
    });
    return res.status(201).json({ id: draft.id, data: draft.data });
  } catch (err) {
    // Map "job not found" (Prisma P2025) → 404, missing _narrative → 422.
    if (err instanceof Error && err.message.includes('_narrative')) {
      return res.status(422).json({ error: err.message });
    }
    return handleError(res, err);
  }
});

// POST /intake/drafts — create a new draft
intakeDraftsRouter.post('/', async (req, res) => {
  try {
    const op = (req as AuthedRequest).operator;
    const { source, importJobId } = req.body ?? {};
    const normalizedImportJobId = typeof importJobId === 'string' ? importJobId.trim() : undefined;
    if (normalizedImportJobId && !(await importJobIsAccessible(normalizedImportJobId, op))) {
      return res.status(404).json({ error: 'Job non trovato' });
    }
    const draft = await createDraft({
      createdById: op?.id,
      source: source === 'import' ? 'import' : 'manual',
      importJobId: normalizedImportJobId,
    });
    return res.status(201).json(draft);
  } catch (err) {
    return handleError(res, err);
  }
});

// GET /intake/drafts — list open drafts (optionally filtered by operator)
intakeDraftsRouter.get('/', async (req, res) => {
  try {
    const op = (req as AuthedRequest).operator;
    const drafts = await listDrafts(op?.id);
    return res.status(200).json(drafts);
  } catch (err) {
    return handleError(res, err);
  }
});

// GET /intake/drafts/:id — get a single draft
intakeDraftsRouter.get('/:id', async (req, res) => {
  try {
    const draft = await getDraft(String(req.params.id));
    if (!draft) return res.status(404).json({ error: 'Bozza non trovata' });
    return res.status(200).json(draft);
  } catch (err) {
    return handleError(res, err);
  }
});

// PATCH /intake/drafts/:id — autosave: shallow-merge top-level keys into data
intakeDraftsRouter.patch('/:id', async (req, res) => {
  try {
    const patch = (req.body ?? {}) as Record<string, unknown>;
    const draft = await patchDraft(String(req.params.id), patch);
    return res.status(200).json(draft);
  } catch (err) {
    return handleError(res, err);
  }
});

// POST /intake/drafts/:id/confirm — transactional patient creation from draft.
// Body: { patient, cartella?, confirmDuplicate? }
// 201 created / 200 idempotent|updated / 409 duplicate (mirrors ai-jobs.ts confirm).
intakeDraftsRouter.post('/:id/confirm', async (req, res) => {
  try {
    const draft = await getDraft(String(req.params.id));
    const draftData = (draft?.data ?? {}) as Record<string, unknown>;
    const accepted = (draftData._accepted ?? {}) as Record<string, unknown>;
    if (accepted.demographics !== true || accepted.therapy !== true) {
      return res.status(400).json({
        error: 'Revisiona e accetta anagrafica e terapia prima di creare il paziente',
      });
    }
    const importedRows = Array.isArray(draftData.terapiaImport)
      ? (draftData.terapiaImport as Array<{ stato?: unknown }>)
      : [];
    if (importedRows.some((row) => row.stato !== 'ok')) {
      return res.status(400).json({
        error: 'Completa la revisione delle terapie rilevate dalla dimissione',
      });
    }
    const dischargeTherapyText =
      typeof draftData._terapiaText === 'string' ? draftData._terapiaText.trim() : '';
    const manualRows = Array.isArray(draftData.terapia) ? draftData.terapia : [];
    if (dischargeTherapyText && importedRows.length === 0 && manualRows.length === 0) {
      return res.status(400).json({
        error:
          'La dimissione contiene una sezione terapia non riconosciuta: inserisci e verifica le prescrizioni prima di confermare',
      });
    }
    const payload = confirmPayloadFromDraft(draftData, req.body, (req as AuthedRequest).operator!);
    const result = await confirmDraft(
      String(req.params.id),
      payload,
      (req as AuthedRequest).operator!,
    );
    if (result.status === 'duplicate') {
      return res.status(409).json(result);
    }
    return res.status(result.status === 'created' ? 201 : 200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

export default intakeDraftsRouter;
