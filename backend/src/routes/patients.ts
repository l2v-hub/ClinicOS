import { prisma } from '../lib/prisma.js'
import { Router } from 'express';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const patients = await prisma.patient.findMany();
    res.status(200).json(patients);
  } catch (error) {
    console.error('Failed to fetch patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
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
    res.status(201).json(patient);
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2002') {
      try {
        const patient = await prisma.patient.create({
          data: buildData(`MRN-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
        });
        res.status(201).json(patient);
      } catch {
        res.status(500).json({ error: 'Errore durante la creazione del paziente' });
      }
    } else {
      res.status(500).json({ error: 'Errore durante la creazione del paziente' });
    }
  }
});

export default router;
