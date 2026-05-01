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
export default router;
