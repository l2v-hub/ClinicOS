// SPEC-015 T024 (US4): REST appointments for the traditional UI agenda. Gated by requireOperator
// (header-based, not a real IdP) like the other UI data routes (/patients, /consegne — see the
// "gate minimo" task that added this gate to all of them in one pass).
// Uses the SAME appointment-service as the Agnos AI actions (FR-007). DELETE is the ONLY deletion
// path and belongs exclusively to the UI button (FR-008/FR-010): no AI module reaches it.

import { Router } from 'express';
import {
  listAppointments,
  createAppointment,
  updateAppointment,
  uiOnlyDeleteAppointment,
  SlotConflictError,
  AppointmentNotFoundError,
  AppointmentViewCapacityError,
  AppointmentForbiddenError,
  type AppointmentActor,
} from '../services/appointment-service.js';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import {
  AppointmentListInputError,
  parseAppointmentListQuery,
} from '../appointments/list-query.js';
import {
  AppointmentWriteInputError,
  parseAppointmentCreateBody,
  parseAppointmentId,
  parseAppointmentPatchBody,
} from '../appointments/write-validation.js';

const router = Router();

function actorFrom(req: AuthedRequest): AppointmentActor {
  const operator = req.operator!;
  return { operatorId: operator.id, role: operator.role, name: operator.name };
}

// Gate minimo (header-based, non IdP): l'agenda espone nominativi paziente/operatore,
// richiede un operatore identificato. Vedi backend/src/ai/auth.ts.
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});
router.use(requireOperator);

// GET /appointments?date=YYYY-MM-DD or ?from=YYYY-MM-DD&to=YYYY-MM-DD&operatorId=
// The explicit visible interval is mandatory and may span at most 42 days.
router.get('/', async (req, res) => {
  try {
    const query = parseAppointmentListQuery(req.query as Record<string, unknown>);
    const rows = await listAppointments({ ...query, actor: actorFrom(req as AuthedRequest) });
    res.status(200).json(rows);
  } catch (error) {
    if (error instanceof AppointmentListInputError) {
      res.status(400).json({ error: { kind: 'bad_request', message: error.message } });
      return;
    }
    if (error instanceof AppointmentViewCapacityError) {
      res.status(422).json({ error: { kind: 'capacity', message: error.message } });
      return;
    }
    console.error('GET /appointments error:', error);
    res
      .status(500)
      .json({ error: { kind: 'internal', message: 'Errore nel recupero degli appuntamenti' } });
  }
});

// POST /appointments { patientId, operatorId, data, ora, tipologia, note?, durata?, stato? }
router.post('/', async (req, res) => {
  try {
    const input = parseAppointmentCreateBody(req.body);
    const created = await createAppointment({
      ...input,
      actor: actorFrom(req as AuthedRequest),
    });
    console.log(`POST /appointments → created id=${created.id} ${created.data} ${created.ora}`);
    res.status(201).json(created);
  } catch (error) {
    if (error instanceof AppointmentWriteInputError || error instanceof AppointmentListInputError) {
      res.status(error instanceof AppointmentWriteInputError ? error.status : 400).json({
        error: { kind: 'bad_request', message: error.message },
      });
      return;
    }
    if (error instanceof AppointmentForbiddenError) {
      res.status(403).json({ error: { kind: 'forbidden', message: error.message } });
      return;
    }
    if (error instanceof SlotConflictError) {
      res.status(409).json({ error: { kind: 'slot_conflict', message: error.message } });
      return;
    }
    if (
      error instanceof Error &&
      (/non valida/.test(error.message) || error.message.includes('Foreign key'))
    ) {
      res.status(400).json({ error: { kind: 'bad_request', message: error.message } });
      return;
    }
    console.error('POST /appointments error:', error);
    res.status(500).json({
      error: { kind: 'internal', message: 'Errore durante la creazione dell’appuntamento' },
    });
  }
});

// PATCH /appointments/:id (partial fields) → 200 | 404 | 409
router.patch('/:id', async (req, res) => {
  try {
    const id = parseAppointmentId(req.params.id);
    const patch = parseAppointmentPatchBody(req.body);
    const updated = await updateAppointment(id, patch, actorFrom(req as AuthedRequest));
    res.status(200).json(updated);
  } catch (error) {
    if (error instanceof AppointmentWriteInputError || error instanceof AppointmentListInputError) {
      res.status(error instanceof AppointmentWriteInputError ? error.status : 400).json({
        error: { kind: 'bad_request', message: error.message },
      });
      return;
    }
    if (error instanceof AppointmentForbiddenError) {
      res.status(403).json({ error: { kind: 'forbidden', message: error.message } });
      return;
    }
    if (error instanceof AppointmentNotFoundError) {
      res.status(404).json({ error: { kind: 'not_found', message: error.message } });
      return;
    }
    if (error instanceof SlotConflictError) {
      res.status(409).json({ error: { kind: 'slot_conflict', message: error.message } });
      return;
    }
    if (error instanceof Error && /non valida/.test(error.message)) {
      res.status(400).json({ error: { kind: 'bad_request', message: error.message } });
      return;
    }
    console.error('PATCH /appointments/:id error:', error);
    res.status(500).json({
      error: { kind: 'internal', message: 'Errore durante l’aggiornamento dell’appuntamento' },
    });
  }
});

// DELETE /appointments/:id → 204. Reached ONLY by the traditional UI button (FR-010).
router.delete('/:id', async (req, res) => {
  try {
    const id = parseAppointmentId(req.params.id);
    const deleted = await uiOnlyDeleteAppointment(id, actorFrom(req as AuthedRequest));
    if (!deleted) {
      res.status(404).json({ error: { kind: 'not_found', message: 'Appuntamento non trovato' } });
      return;
    }
    console.log(`DELETE /appointments/${req.params.id} → ok (UI button)`);
    res.status(204).end();
  } catch (error) {
    if (error instanceof AppointmentWriteInputError) {
      res.status(error.status).json({ error: { kind: 'bad_request', message: error.message } });
      return;
    }
    if (error instanceof AppointmentForbiddenError) {
      res.status(403).json({ error: { kind: 'forbidden', message: error.message } });
      return;
    }
    console.error('DELETE /appointments/:id error:', error);
    res.status(500).json({
      error: { kind: 'internal', message: 'Errore durante l’eliminazione dell’appuntamento' },
    });
  }
});

export default router;
