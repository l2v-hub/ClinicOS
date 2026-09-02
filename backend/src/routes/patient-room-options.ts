import { Router } from 'express';
import { requireOperator } from '../ai/auth.js';
import { prisma } from '../lib/prisma.js';
import { requirePatientScope } from '../patients/access.js';
import { toPatientRoomOptions } from './patient-room-option-model.js';

const router = Router();

router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});
router.use(requireOperator);

function activeAssignmentFilter(from = new Date().toISOString().slice(0, 10)) {
  return {
    startDate: { lte: from },
    OR: [{ endDate: null }, { endDate: { gte: from } }],
  };
}

/**
 * Patient-scoped room/bed choices. The response deliberately exposes availability only: an
 * operator can place a patient in a free bed without learning who occupies the other beds.
 */
router.get('/:patientId/room-options', requirePatientScope, async (req, res) => {
  const rawPatientId = req.params.patientId;
  const patientId = Array.isArray(rawPatientId) ? rawPatientId[0] : rawPatientId;
  try {
    const rooms = await prisma.room.findMany({
      where: { stato: 'attiva' },
      select: {
        id: true,
        numero: true,
        tipo: true,
        piano: true,
        reparto: true,
        stato: true,
        beds: {
          select: {
            id: true,
            label: true,
            stato: true,
            assignments: {
              where: activeAssignmentFilter(),
              orderBy: { startDate: 'desc' },
              take: 1,
              select: { patientId: true },
            },
          },
          orderBy: { label: 'asc' },
        },
      },
      orderBy: [{ reparto: 'asc' }, { numero: 'asc' }],
    });

    res.status(200).json(toPatientRoomOptions(rooms, patientId));
  } catch (error) {
    console.error('GET /patients/:patientId/room-options error:', error);
    res.status(500).json({ error: 'Errore nel recupero delle camere disponibili' });
  }
});

export default router;
