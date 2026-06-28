import { Router } from 'express';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import { createDraft, getDraft, patchDraft, listDrafts } from '../intake/draft-service.js';

// ── Intake Drafts Router — mounted at /intake/drafts (F3 EPIC #120 / #125) ───
// Operator-gated CRUD + autosave endpoints for PatientIntakeDraft.

const intakeDraftsRouter = Router();

intakeDraftsRouter.use(requireOperator);

function handleError(res: import('express').Response, err: unknown) {
  // Prisma "record not found" (e.g. patchDraft on a missing/confirmed draft) → 404, not 500.
  if (err && typeof err === 'object' && (err as { code?: string }).code === 'P2025') {
    return res.status(404).json({ error: 'Bozza non trovata' });
  }
  console.error('intake-drafts error:', err instanceof Error ? err.message : err);
  return res.status(500).json({ error: 'Errore interno bozza intake' });
}

// POST /intake/drafts — create a new draft
intakeDraftsRouter.post('/', async (req, res) => {
  try {
    const op = (req as AuthedRequest).operator;
    const { source, importJobId } = req.body ?? {};
    const draft = await createDraft({
      createdById: op?.id,
      source: source === 'import' ? 'import' : 'manual',
      importJobId: typeof importJobId === 'string' ? importJobId : undefined,
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

export default intakeDraftsRouter;
