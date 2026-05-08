import { prisma } from '../lib/prisma.js'
import { Router } from 'express';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' },
    });
    console.log(`GET /patients → ${patients.length} record`);
    res.status(200).json(patients);
  } catch (error) {
    console.error('GET /patients error:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      res.status(404).json({ error: 'Paziente non trovato' });
      return;
    }
    res.status(200).json(patient);
  } catch (error) {
    console.error('GET /patients/:id error:', error);
    res.status(500).json({ error: 'Errore nel recupero del paziente' });
  }
});

router.post('/seed', async (_req, res) => {
  try {
    const patients = await prisma.patient.createMany({
      data: [
        {
          medicalRecordNumber: 'MRN-001',
          firstName: 'Mario',
          lastName: 'Rossi',
          dateOfBirth: new Date('1980-01-01'),
          email: 'mario.rossi@example.com',
          phone: '+39 333 111 2222',
        },
        {
          medicalRecordNumber: 'MRN-002',
          firstName: 'Luigi',
          lastName: 'Verdi',
          dateOfBirth: new Date('1990-05-10'),
          email: 'luigi.verdi@example.com',
          phone: '+39 333 444 5555',
        },
      ],
      skipDuplicates: true,
    });

    res.status(201).json({ created: patients.count });
  } catch (error) {
    console.error('Failed to seed patients:', error);
    res.status(500).json({ error: 'Failed to seed patients' });
  }
});
router.post('/', async (req, res) => {
  const body = req.body as {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    sex?: string;
    email?: string;
    phone?: string;
    address?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  };

  if (
    !body.firstName || typeof body.firstName !== 'string' || body.firstName.trim() === '' ||
    !body.lastName || typeof body.lastName !== 'string' || body.lastName.trim() === '' ||
    !body.dateOfBirth || typeof body.dateOfBirth !== 'string' || body.dateOfBirth.trim() === ''
  ) {
    res.status(400).json({ error: 'Nome, cognome e data di nascita sono obbligatori' });
    return;
  }

  const buildData = (mrn: string) => ({
    medicalRecordNumber: mrn,
    firstName: body.firstName!.trim(),
    lastName: body.lastName!.trim(),
    dateOfBirth: new Date(body.dateOfBirth!),
    ...(body.sex !== undefined && { sex: body.sex }),
    ...(body.email !== undefined && { email: body.email }),
    ...(body.phone !== undefined && { phone: body.phone }),
    ...(body.address !== undefined && { address: body.address }),
    ...(body.emergencyContactName !== undefined && { emergencyContactName: body.emergencyContactName }),
    ...(body.emergencyContactPhone !== undefined && { emergencyContactPhone: body.emergencyContactPhone }),
  });

  try {
    const patient = await prisma.patient.create({ data: buildData(`MRN-${Date.now()}`) });
    console.log(`POST /patients → creato id=${patient.id} nome="${patient.firstName} ${patient.lastName}"`);
    res.status(201).json(patient);
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2002') {
      try {
        const patient = await prisma.patient.create({
          data: buildData(`MRN-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
        });
        console.log(`POST /patients (retry) → creato id=${patient.id}`);
        res.status(201).json(patient);
      } catch (retryErr) {
        console.error('POST /patients retry error:', retryErr);
        res.status(500).json({ error: 'Errore durante la creazione del paziente' });
      }
    } else {
      console.error('POST /patients error:', error);
      res.status(500).json({ error: 'Errore durante la creazione del paziente' });
    }
  }
});

// ── PATCH /patients/:id — update patient demographics ─────────────────────

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const allowed = ['firstName', 'lastName', 'dateOfBirth', 'sex', 'email', 'phone',
    'address', 'emergencyContactName', 'emergencyContactPhone'] as const;

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates[key] = key === 'dateOfBirth' ? new Date(req.body[key]) : req.body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'Nessun campo da aggiornare' });
    return;
  }

  try {
    const patient = await prisma.patient.update({ where: { id }, data: updates });
    console.log(`PATCH /patients/${id} → aggiornato`);
    res.status(200).json(patient);
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      res.status(404).json({ error: 'Paziente non trovato' });
    } else {
      console.error('PATCH /patients/:id error:', error);
      res.status(500).json({ error: 'Errore durante aggiornamento paziente' });
    }
  }
});

// ── GET /patients/:id/cartella — load clinical record ─────────────────────

router.get('/:id/cartella', async (req, res) => {
  const { id } = req.params;
  try {
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      res.status(404).json({ error: 'Paziente non trovato' });
      return;
    }

    const cartella = await prisma.cartella.findUnique({ where: { patientId: id } });
    if (!cartella) {
      res.status(200).json({ patientId: id, data: null });
      return;
    }

    res.status(200).json({ patientId: id, data: cartella.data });
  } catch (error) {
    console.error('GET /patients/:id/cartella error:', error);
    res.status(500).json({ error: 'Errore nel recupero della cartella clinica' });
  }
});

// ── PUT /patients/:id/cartella — upsert clinical record ───────────────────

router.put('/:id/cartella', async (req, res) => {
  const { id } = req.params;
  const { data } = req.body as { data?: unknown };

  if (!data || typeof data !== 'object') {
    res.status(400).json({ error: 'Campo "data" obbligatorio (oggetto JSON)' });
    return;
  }

  try {
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      res.status(404).json({ error: 'Paziente non trovato' });
      return;
    }

    const cartella = await prisma.cartella.upsert({
      where: { patientId: id },
      create: { patientId: id, data: data as object },
      update: { data: data as object },
    });

    console.log(`PUT /patients/${id}/cartella → salvata`);
    res.status(200).json({ patientId: id, data: cartella.data });
  } catch (error) {
    console.error('PUT /patients/:id/cartella error:', error);
    res.status(500).json({ error: 'Errore durante salvataggio cartella clinica' });
  }
});

export default router;
