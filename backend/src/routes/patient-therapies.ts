import { prisma } from '../lib/prisma.js';
import { Router } from 'express';

const router = Router();

// GET /patients/:patientId/therapies
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
  const body = req.body as {
    farmacoNome?: string;
    dosaggio?: string;
    viaSomministrazione?: string;
    tipo?: string;
    stato?: string;
    dataInizio?: string;
    dataFine?: string;
    fasceMattina?: boolean;
    fascePranzo?: boolean;
    fascePomeriggio?: boolean;
    fasceSera?: boolean;
    fasceNotte?: boolean;
    orarioSpecifico?: string;
    prescrittore?: string;
    operatoreInseritore?: string;
    note?: string;
    dataSomministrazione?: string;
    orarioSomministrazione?: string;
  };

  if (!body.farmacoNome || !body.dosaggio || !body.dataInizio) {
    res.status(400).json({ error: 'Campi obbligatori: farmacoNome, dosaggio, dataInizio' });
    return;
  }

  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      res.status(404).json({ error: 'Paziente non trovato' });
      return;
    }

    const therapy = await prisma.patientTherapy.create({
      data: {
        patientId,
        farmacoNome: body.farmacoNome,
        dosaggio: body.dosaggio,
        viaSomministrazione: body.viaSomministrazione || 'orale',
        tipo: body.tipo || 'periodica',
        stato: body.stato || 'attiva',
        dataInizio: body.dataInizio,
        dataFine: body.dataFine || null,
        fasceMattina: body.fasceMattina ?? true,
        fascePranzo: body.fascePranzo ?? false,
        fascePomeriggio: body.fascePomeriggio ?? false,
        fasceSera: body.fasceSera ?? false,
        fasceNotte: body.fasceNotte ?? false,
        orarioSpecifico: body.orarioSpecifico || null,
        prescrittore: body.prescrittore || null,
        operatoreInseritore: body.operatoreInseritore || null,
        note: body.note || null,
        dataSomministrazione: body.dataSomministrazione || null,
        orarioSomministrazione: body.orarioSomministrazione || null,
      },
    });

    console.log(`POST /patients/${patientId}/therapies → created id=${therapy.id}`);
    res.status(201).json(therapy);
  } catch (error) {
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

    const allowed = [
      'farmacoNome', 'dosaggio', 'viaSomministrazione', 'tipo', 'stato',
      'dataInizio', 'dataFine', 'fasceMattina', 'fascePranzo', 'fascePomeriggio',
      'fasceSera', 'fasceNotte', 'orarioSpecifico', 'prescrittore',
      'operatoreInseritore', 'note', 'dataSomministrazione', 'orarioSomministrazione',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    const therapy = await prisma.patientTherapy.update({
      where: { id: therapyId },
      data: updates,
    });

    console.log(`PUT /patients/${patientId}/therapies/${therapyId} → updated`);
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

export default router;
