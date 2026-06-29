import { prisma } from '../lib/prisma.js';
import { Router } from 'express';
import {
  normalizeSchedules,
  deriveLegacyFromSchedules,
  scheduleDoseShort,
  type ScheduleInput,
} from '../lib/therapy-dose.js';
import { createTherapyInTx, type TherapyCreateInput } from '../therapies/therapy-create.js';

const router = Router();

// GET /patients/:patientId/therapies  (includes structured schedules)
router.get('/:patientId/therapies', async (req, res) => {
  const { patientId } = req.params;
  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      res.status(404).json({ error: 'Paziente non trovato' });
      return;
    }
    const therapies = await prisma.patientTherapy.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: { schedules: { orderBy: { time: 'asc' } } },
    });
    res.status(200).json(therapies);
  } catch (error) {
    console.error('GET /patients/:patientId/therapies error:', error);
    res.status(500).json({ error: 'Errore nel recupero delle terapie' });
  }
});

// POST /patients/:patientId/therapies
router.post('/:patientId/therapies', async (req, res) => {
  const { patientId } = req.params;
  const body = req.body as TherapyCreateInput;

  // Validate required fields BEFORE the 404 existence check (preserves original
  // 400-before-404 precedence: bad input → 400, then missing patient → 404).
  const farmacoNome = typeof body.farmacoNome === 'string' ? body.farmacoNome.trim() : '';
  const dataInizio = typeof body.dataInizio === 'string' ? body.dataInizio : '';
  if (!farmacoNome || !dataInizio) {
    res.status(400).json({ error: 'Campi obbligatori: farmacoNome, dataInizio' });
    return;
  }

  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      res.status(404).json({ error: 'Paziente non trovato' });
      return;
    }

    const therapy = await prisma.$transaction(tx =>
      createTherapyInTx(tx, patientId, body),
    );

    console.log(`POST /patients/${patientId}/therapies → created id=${therapy.id} (${therapy.schedules.length} schedules)`);
    res.status(201).json(therapy);
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('Campi obbligatori')) {
      res.status(400).json({ error: msg });
      return;
    }
    console.error('POST /patients/:patientId/therapies error:', error);
    res.status(500).json({ error: 'Errore durante creazione terapia' });
  }
});

// PUT /patients/:patientId/therapies/:therapyId
router.put('/:patientId/therapies/:therapyId', async (req, res) => {
  const { patientId, therapyId } = req.params;
  const body = req.body as Record<string, unknown>;

  try {
    const existing = await prisma.patientTherapy.findFirst({
      where: { id: therapyId, patientId },
    });
    if (!existing) {
      res.status(404).json({ error: 'Terapia non trovata' });
      return;
    }

    const scalarAllowed = [
      'farmacoNome', 'dosaggio', 'viaSomministrazione', 'tipo', 'stato',
      'dataInizio', 'dataFine', 'fasceMattina', 'fascePranzo', 'fascePomeriggio',
      'fasceSera', 'fasceNotte', 'orarioSpecifico', 'prescrittore',
      'operatoreInseritore', 'note', 'dataSomministrazione', 'orarioSomministrazione',
      'commercialStrengthValue', 'commercialStrengthUnit', 'pharmaceuticalForm',
      'allowedFractions', 'drugPackageRef',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of scalarAllowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (updates.commercialStrengthValue === '' ) updates.commercialStrengthValue = null;
    if (updates.commercialStrengthValue != null) updates.commercialStrengthValue = Number(updates.commercialStrengthValue);

    // If schedules are provided, replace them atomically and re-derive legacy fascia/orari.
    const hasSchedules = body.schedules !== undefined;
    const schedules: ScheduleInput[] = hasSchedules ? normalizeSchedules(body.schedules) : [];

    const therapy = await prisma.$transaction(async (tx) => {
      if (hasSchedules) {
        await tx.therapySchedule.deleteMany({ where: { therapyId } });
        if (schedules.length) {
          await tx.therapySchedule.createMany({
            data: schedules.map(s => ({ ...s, therapyId })),
          });
          const derived = deriveLegacyFromSchedules(schedules);
          updates.fasceMattina = derived.fasceMattina;
          updates.fascePranzo = derived.fascePranzo;
          updates.fascePomeriggio = derived.fascePomeriggio;
          updates.fasceSera = derived.fasceSera;
          updates.fasceNotte = derived.fasceNotte;
          updates.orarioSpecifico = derived.orarioSpecifico;
        }
      }
      return tx.patientTherapy.update({
        where: { id: therapyId },
        data: updates,
        include: { schedules: { orderBy: { time: 'asc' } } },
      });
    });

    console.log(`PUT /patients/${patientId}/therapies/${therapyId} → updated (${hasSchedules ? schedules.length + ' schedules' : 'scalars only'})`);
    res.status(200).json(therapy);
  } catch (error) {
    console.error('PUT /patients/:patientId/therapies/:therapyId error:', error);
    res.status(500).json({ error: 'Errore durante aggiornamento terapia' });
  }
});

// DELETE /patients/:patientId/therapies/:therapyId
router.delete('/:patientId/therapies/:therapyId', async (req, res) => {
  const { patientId, therapyId } = req.params;

  try {
    const existing = await prisma.patientTherapy.findFirst({
      where: { id: therapyId, patientId },
    });
    if (!existing) {
      res.status(404).json({ error: 'Terapia non trovata' });
      return;
    }

    await prisma.patientTherapy.delete({ where: { id: therapyId } });
    console.log(`DELETE /patients/${patientId}/therapies/${therapyId} → deleted`);
    res.status(204).send();
  } catch (error) {
    console.error('DELETE /patients/:patientId/therapies/:therapyId error:', error);
    res.status(500).json({ error: 'Errore durante eliminazione terapia' });
  }
});

// GET /patients/:patientId/medication-administrations
router.get('/:patientId/medication-administrations', async (req, res) => {
  const { patientId } = req.params;
  const date = req.query.date as string | undefined;
  const limit = parseInt(req.query.limit as string) || 100;

  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      res.status(404).json({ error: 'Paziente non trovato' });
      return;
    }

    const where: { patientId: string; date?: string } = { patientId };
    if (date) where.date = date;

    const administrations = await prisma.medicationAdministration.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    res.status(200).json(administrations);
  } catch (error) {
    console.error('GET /patients/:patientId/medication-administrations error:', error);
    res.status(500).json({ error: 'Errore nel recupero storico somministrazioni' });
  }
});

export { scheduleDoseShort };
export default router;
