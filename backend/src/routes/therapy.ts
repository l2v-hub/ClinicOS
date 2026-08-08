import { prisma } from '../lib/prisma.js';
import { Router } from 'express';
import { requireOperator } from '../ai/auth.js';
import { buildTherapySlots } from '../therapies/therapy-slots.js';

const router = Router();

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
// Body: { patientId, farmacoNome, farmacoDose, farmacoVia, date, fascia, ora, operatoreId, operatoreNome, therapyId? }
router.post('/confirm', async (req, res) => {
  const {
    patientId,
    farmacoNome,
    farmacoDose,
    farmacoVia,
    date,
    fascia,
    ora,
    operatoreId,
    operatoreNome,
    // therapyId accepted for forward-compat; not stored in DB yet
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    therapyId: _therapyId,
  } = req.body as {
    patientId: string;
    farmacoNome: string;
    farmacoDose: string;
    farmacoVia: string;
    date: string;
    fascia: string;
    ora: string;
    operatoreId: string;
    operatoreNome: string;
    therapyId?: string;
  };

  if (!patientId || !farmacoNome || !date || !fascia) {
    res.status(400).json({ error: 'Campi obbligatori: patientId, farmacoNome, date, fascia' });
    return;
  }

  try {
    // Check if already administered
    const existing = await prisma.medicationAdministration.findUnique({
      where: { patientId_farmacoNome_date_fascia: { patientId, farmacoNome, date, fascia } },
    });

    if (existing?.stato === 'erogata') {
      res.status(409).json({
        error: 'Terapia già erogata',
        existingRecord: {
          operatoreConferma: existing.operatoreNome,
          oraConferma: existing.confirmedAt
            ? new Date(existing.confirmedAt).toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : null,
        },
      });
      return;
    }

    const record = await prisma.medicationAdministration.upsert({
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
        operatoreId: operatoreId || null,
        operatoreNome: operatoreNome || null,
        confirmedAt: new Date(),
      },
      update: {
        stato: 'erogata',
        operatoreId: operatoreId || null,
        operatoreNome: operatoreNome || null,
        confirmedAt: new Date(),
        motivo: null,
        note: null,
      },
    });

    res.status(200).json(record);
  } catch (error) {
    console.error('POST /therapy-slots/confirm error:', error);
    res.status(500).json({ error: 'Errore durante conferma somministrazione' });
  }
});

// POST /therapy-slots/not-administered
// Body: { patientId, farmacoNome, farmacoDose, farmacoVia, date, fascia, ora, operatoreId, operatoreNome, motivo, note, therapyId? }
router.post('/not-administered', async (req, res) => {
  const {
    patientId,
    farmacoNome,
    farmacoDose,
    farmacoVia,
    date,
    fascia,
    ora,
    operatoreId,
    operatoreNome,
    motivo,
    note: noteText,
    // therapyId accepted for forward-compat; not stored in DB yet
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    therapyId: _therapyId,
  } = req.body as {
    patientId: string;
    farmacoNome: string;
    farmacoDose: string;
    farmacoVia: string;
    date: string;
    fascia: string;
    ora: string;
    operatoreId: string;
    operatoreNome: string;
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
    const record = await prisma.medicationAdministration.upsert({
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
        operatoreId: operatoreId || null,
        operatoreNome: operatoreNome || null,
        motivo,
        note: noteText || null,
      },
      update: {
        stato: 'non_erogata',
        motivo,
        note: noteText || null,
        operatoreId: operatoreId || null,
        operatoreNome: operatoreNome || null,
        confirmedAt: null,
      },
    });

    res.status(200).json(record);
  } catch (error) {
    console.error('POST /therapy-slots/not-administered error:', error);
    res.status(500).json({ error: 'Errore durante registrazione non somministrazione' });
  }
});

export default router;
