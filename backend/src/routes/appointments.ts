// SPEC-015 T024 (US4): REST appointments for the traditional UI agenda. Same open posture as the
// other UI data routes (/patients, /consegne: no auth middleware — identity is client-side today).
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
} from '../services/appointment-service.js';

const router = Router();

// GET /appointments?date=YYYY-MM-DD&operatorId=  → AppointmentDTO[]
// `date` optional: without it the whole agenda is returned (weekly/monthly views).
router.get('/', async (req, res) => {
  try {
    const date = typeof req.query.date === 'string' && req.query.date ? req.query.date : undefined;
    const operatorId =
      typeof req.query.operatorId === 'string' && req.query.operatorId
        ? req.query.operatorId
        : undefined;
    const rows = await listAppointments({ date, operatorId });
    res.status(200).json(rows);
  } catch (error) {
    if (error instanceof Error && /non valida/.test(error.message)) {
      res.status(400).json({ error: { kind: 'bad_request', message: error.message } });
      return;
    }
    console.error('GET /appointments error:', error);
    res
      .status(500)
      .json({ error: { kind: 'internal', message: 'Errore nel recupero degli appuntamenti' } });
  }
});

// POST /appointments { patientId, operatorId, data, ora, tipologia, note?, durata?, stato?, operatorName? }
router.post('/', async (req, res) => {
  const b = req.body as Record<string, unknown>;
  const patientId = String(b.patientId ?? '').trim();
  const operatorId = String(b.operatorId ?? '').trim();
  const data = String(b.data ?? '').trim();
  const ora = String(b.ora ?? '').trim();
  if (!patientId || !operatorId || !data || !ora) {
    res.status(400).json({
      error: {
        kind: 'bad_request',
        message: 'Campi obbligatori: patientId, operatorId, data, ora',
      },
    });
    return;
  }
  try {
    const created = await createAppointment({
      patientId,
      operatorId,
      data,
      ora,
      tipologia: String(b.tipologia ?? 'visita'),
      note: b.note !== undefined ? String(b.note) : undefined,
      durata: b.durata !== undefined ? Number(b.durata) : undefined,
      stato: b.stato !== undefined ? String(b.stato) : undefined,
      operatorName: b.operatorName !== undefined ? String(b.operatorName) : undefined,
    });
    console.log(`POST /appointments → created id=${created.id} ${created.data} ${created.ora}`);
    res.status(201).json(created);
  } catch (error) {
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
  const b = req.body as Record<string, unknown>;
  try {
    const updated = await updateAppointment(req.params.id, {
      data: b.data !== undefined ? String(b.data) : undefined,
      ora: b.ora !== undefined ? String(b.ora) : undefined,
      tipologia: b.tipologia !== undefined ? String(b.tipologia) : undefined,
      note: b.note !== undefined ? String(b.note) : undefined,
      durata: b.durata !== undefined ? Number(b.durata) : undefined,
      stato: b.stato !== undefined ? String(b.stato) : undefined,
      operatorId: b.operatorId !== undefined ? String(b.operatorId) : undefined,
    });
    res.status(200).json(updated);
  } catch (error) {
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
    const deleted = await uiOnlyDeleteAppointment(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: { kind: 'not_found', message: 'Appuntamento non trovato' } });
      return;
    }
    console.log(`DELETE /appointments/${req.params.id} → ok (UI button)`);
    res.status(204).end();
  } catch (error) {
    console.error('DELETE /appointments/:id error:', error);
    res.status(500).json({
      error: { kind: 'internal', message: 'Errore durante l’eliminazione dell’appuntamento' },
    });
  }
});

export default router;
