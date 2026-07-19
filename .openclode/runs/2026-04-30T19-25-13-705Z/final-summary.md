# Final Summary

**Agents run:** 1
**Dry-run:** false

## Last agent output

FILE: backend/src/app.ts
import express from 'express';
import patientsRouter from './routes/patients.js';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
res.status(200).json({ status: 'ok' });
});

app.use('/patients', patientsRouter);

export default app;
END FILE
FILE: backend/src/routes/patients.ts
import { PrismaClient } from '@prisma/client';
import { Router } from 'express';

const prisma = new PrismaClient();
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

export default router;
END FILE
