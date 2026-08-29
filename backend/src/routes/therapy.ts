import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import { buildTherapySlots } from '../therapies/therapy-slots.js';

const router = Router();

class TherapyAlreadyAdministeredError extends Error {}

function isConcurrentWriteConflict(error: unknown): boolean {
  return Boolean(
    error && typeof error === 'object' && (error as { code?: string }).code === 'P2034',
  );
}

// Gate minimo (header-based, non IdP): gli slot terapia espongono nominativi paziente e
// farmaci somministrati, richiedono un operatore identificato. Vedi backend/src/ai/auth.ts.
router.use(requireOperator);

// GET /therapy-slots?date=YYYY-MM-DD
// Returns slots grouped by patient, sourced exclusively from PatientTherapy.
router.get('/', async (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);

  try {
    res.status(200).json(await buildTherapySlots(date));
  } catch (error) {
    console.error('GET /therapy-slots error:', error);
    res.status(500).json({ error: 'Errore nel recupero degli slot terapia' });
  }
});

// POST /therapy-slots/confirm
// Actor identity always comes from req.operator; client-supplied actor fields are ignored.
// Body: { patientId, farmacoNome, farmacoDose, farmacoVia, date, fascia, ora, therapyId? }
router.post('/confirm', async (req, res) => {
  const {
    patientId,
    farmacoNome,
    farmacoDose,
    farmacoVia,
    date,
    fascia,
    ora,
    // therapyId accepted for forward-compat; not stored in DB yet
    therapyId: _therapyId,
  } = req.body as {
    patientId: string;
    farmacoNome: string;
    farmacoDose: string;
    farmacoVia: string;
    date: string;
    fascia: string;
    ora: string;
    therapyId?: string;
  };

  if (!patientId || !farmacoNome || !date || !fascia) {
    res.status(400).json({ error: 'Campi obbligatori: patientId, farmacoNome, date, fascia' });
    return;
  }

  try {
    const actor = (req as AuthedRequest).operator!;
    const record = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.medicationAdministration.findUnique({
          where: { patientId_farmacoNome_date_fascia: { patientId, farmacoNome, date, fascia } },
        });
        if (existing?.stato === 'erogata') throw new TherapyAlreadyAdministeredError();
        return tx.medicationAdministration.upsert({
          where: { patientId_farmacoNome_date_fascia: { patientId, farmacoNome, date, fascia } },
          create: {
            patientId,
            farmacoNome,
            farmacoDose: farmacoDose || '',
            farmacoVia: farmacoVia || 'orale',
            date,
            fascia,
            ora: ora || '',
            stato: 'erogata',
            operatoreId: actor.id,
            operatoreNome: actor.name || actor.id,
            confirmedAt: new Date(),
          },
          update: {
            stato: 'erogata',
            operatoreId: actor.id,
            operatoreNome: actor.name || actor.id,
            confirmedAt: new Date(),
            motivo: null,
            note: null,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    res.status(200).json(record);
  } catch (error) {
    if (error instanceof TherapyAlreadyAdministeredError) {
      res.status(409).json({ error: 'Terapia già erogata' });
      return;
    }
    if (isConcurrentWriteConflict(error)) {
      res.status(409).json({ error: 'Conflitto concorrente: ricaricare lo slot e riprovare' });
      return;
    }
    console.error('POST /therapy-slots/confirm error:', error);
    res.status(500).json({ error: 'Errore durante conferma somministrazione' });
  }
});

// POST /therapy-slots/not-administered
// Actor identity always comes from req.operator; client-supplied actor fields are ignored.
// Body: { patientId, farmacoNome, farmacoDose, farmacoVia, date, fascia, ora, motivo, note, therapyId? }
router.post('/not-administered', async (req, res) => {
  const {
    patientId,
    farmacoNome,
    farmacoDose,
    farmacoVia,
    date,
    fascia,
    ora,
    motivo,
    note: noteText,
    // therapyId accepted for forward-compat; not stored in DB yet
    therapyId: _therapyId,
  } = req.body as {
    patientId: string;
    farmacoNome: string;
    farmacoDose: string;
    farmacoVia: string;
    date: string;
    fascia: string;
    ora: string;
    motivo: string;
    note: string;
    therapyId?: string;
  };

  if (!patientId || !farmacoNome || !date || !fascia || !motivo) {
    res
      .status(400)
      .json({ error: 'Campi obbligatori: patientId, farmacoNome, date, fascia, motivo' });
    return;
  }

  try {
    const actor = (req as AuthedRequest).operator!;
    const record = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.medicationAdministration.findUnique({
          where: { patientId_farmacoNome_date_fascia: { patientId, farmacoNome, date, fascia } },
          select: { stato: true },
        });
        if (existing?.stato === 'erogata') throw new TherapyAlreadyAdministeredError();
        return tx.medicationAdministration.upsert({
          where: { patientId_farmacoNome_date_fascia: { patientId, farmacoNome, date, fascia } },
          create: {
            patientId,
            farmacoNome,
            farmacoDose: farmacoDose || '',
            farmacoVia: farmacoVia || 'orale',
            date,
            fascia,
            ora: ora || '',
            stato: 'non_erogata',
            operatoreId: actor.id,
            operatoreNome: actor.name || actor.id,
            motivo,
            note: noteText || null,
          },
          update: {
            stato: 'non_erogata',
            motivo,
            note: noteText || null,
            operatoreId: actor.id,
            operatoreNome: actor.name || actor.id,
            confirmedAt: null,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    res.status(200).json(record);
  } catch (error) {
    if (error instanceof TherapyAlreadyAdministeredError) {
      res.status(409).json({ error: 'Terapia già erogata: stato non modificabile' });
      return;
    }
    if (isConcurrentWriteConflict(error)) {
      res.status(409).json({ error: 'Conflitto concorrente: ricaricare lo slot e riprovare' });
      return;
    }
    console.error('POST /therapy-slots/not-administered error:', error);
    res.status(500).json({ error: 'Errore durante registrazione non somministrazione' });
  }
});

export default router;
