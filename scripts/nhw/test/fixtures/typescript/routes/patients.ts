import { Router } from 'express';

export interface PatientDto {
  id: string;
}

export type PatientId = string;

export class PatientService {
  find(id: string) {
    return prisma.patient.findUnique({ where: { id } });
  }
}

export function requireAuth(_req, _res, next) {
  next();
}

const router = Router();

router.get('/:id', requireAuth, async (req, res) => {
  const patient = await prisma.patient.findUnique({
    where: { id: req.params.id },
  });
  if (!patient) {
    return res.status(404).json({ error: 'not_found' });
  }
  return res.status(200).json(patient);
});

const secondaryRouter = Router();
secondaryRouter.post('/audit', async (req, res) => {
  await prisma.aiAuditEvent.create({ data: req.body });
  return res.status(201).json({ accepted: true });
});

export { secondaryRouter };
export default router;
