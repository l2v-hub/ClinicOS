import { prisma } from '../lib/prisma.js';
import { Router } from 'express';
import { requireOperator, type AuthedRequest, type Operator } from '../ai/auth.js';
import { requirePatientScope } from '../patients/access.js';
import { DiaryPageInputError } from '../patients/diary-pagination.js';
import { loadPatientDiary } from '../patients/diary-read-service.js';
import {
  DiaryWriteInputError,
  parseDiaryCreateBody,
  parseDiaryPatchBody,
} from '../patients/diary-write-validation.js';

const router = Router();

// Gate minimo (header-based, non IdP): il diario paziente e' un dato clinico reale,
// richiede un operatore identificato. Vedi backend/src/ai/auth.ts.
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});
router.use(requireOperator);
router.use('/:patientId/diary', requirePatientScope);

const DIARY_AUTHOR_TYPES = new Set([
  'medico',
  'infermiere',
  'oss',
  'fisioterapista',
  'operatore',
  'altro',
]);

async function authoritativeDiaryAuthor(operator: Operator): Promise<{
  authorType: string;
  authorName: string;
}> {
  const row = await prisma.operator.findUnique({
    where: { id: operator.id },
    select: { ruolo: true, user: { select: { fullName: true } } },
  });
  if (!row) throw new Error('operator_not_mapped');
  const normalizedRole = row.ruolo?.trim().toLowerCase() ?? '';
  return {
    authorType: DIARY_AUTHOR_TYPES.has(normalizedRole) ? normalizedRole : 'operatore',
    authorName: row.user.fullName.trim() || operator.name?.trim() || operator.id,
  };
}

// GET /patients/:patientId/diary
// Query params: authorType, from (YYYY-MM-DD), to (YYYY-MM-DD), limit, cursor.
// `offset` remains bounded for legacy clients; the UI uses the stable keyset cursor.
router.get('/:patientId/diary', async (req, res) => {
  const { patientId } = req.params;

  try {
    const page = await loadPatientDiary(
      patientId,
      req.query as Record<string, unknown>,
      (req as AuthedRequest).operator!,
    );
    if (!page) {
      res.status(404).json({ error: 'Paziente non trovato' });
      return;
    }
    res.status(200).json(page);
  } catch (error) {
    if (error instanceof DiaryPageInputError) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('GET /diary error:', error);
    res.status(500).json({ error: 'Errore nel recupero del diario' });
  }
});

// POST /patients/:patientId/diary
router.post('/:patientId/diary', async (req: AuthedRequest, res) => {
  const rawPatientId = req.params.patientId;
  const patientId = (Array.isArray(rawPatientId) ? rawPatientId[0] : rawPatientId) ?? '';
  let input;
  try {
    input = parseDiaryCreateBody(req.body);
  } catch (error) {
    if (error instanceof DiaryWriteInputError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }

  if (!patientId) {
    res.status(400).json({ error: 'patientId non valido' });
    return;
  }

  try {
    const author = await authoritativeDiaryAuthor(req.operator!);
    const entry = await prisma.patientDiaryEntry.create({
      data: {
        patientId,
        ...author,
        ...input,
      },
    });
    res.status(201).json({ entry });
  } catch (error) {
    console.error('POST /diary error:', error);
    res.status(500).json({ error: 'Errore nella creazione della voce' });
  }
});

// GET /patients/:patientId/diary/:entryId
router.get('/:patientId/diary/:entryId', async (req, res) => {
  const { patientId, entryId } = req.params;
  try {
    const entry = await prisma.patientDiaryEntry.findFirst({
      where: { id: entryId, patientId },
    });
    if (!entry) {
      res.status(404).json({ error: 'Voce non trovata' });
      return;
    }
    res.status(200).json({ entry });
  } catch (error) {
    console.error('GET /diary/:entryId error:', error);
    res.status(500).json({ error: 'Errore nel recupero della voce' });
  }
});

// PUT /patients/:patientId/diary/:entryId
router.put('/:patientId/diary/:entryId', async (req, res) => {
  const { patientId, entryId } = req.params;
  // Authorship is immutable and server-authoritative. Client author fields are ignored.
  let patch;
  try {
    patch = parseDiaryPatchBody(req.body);
  } catch (error) {
    if (error instanceof DiaryWriteInputError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }

  try {
    const existing = await prisma.patientDiaryEntry.findFirst({
      where: { id: entryId, patientId },
    });
    if (!existing) {
      res.status(404).json({ error: 'Voce non trovata' });
      return;
    }
    const entry = await prisma.patientDiaryEntry.update({
      where: { id: entryId },
      data: patch,
    });
    res.status(200).json({ entry });
  } catch (error) {
    console.error('PUT /diary/:entryId error:', error);
    res.status(500).json({ error: 'Errore nella modifica della voce' });
  }
});

// DELETE /patients/:patientId/diary/:entryId
router.delete('/:patientId/diary/:entryId', async (req, res) => {
  const { patientId, entryId } = req.params;
  try {
    const existing = await prisma.patientDiaryEntry.findFirst({
      where: { id: entryId, patientId },
    });
    if (!existing) {
      res.status(404).json({ error: 'Voce non trovata' });
      return;
    }
    await prisma.patientDiaryEntry.delete({ where: { id: entryId } });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('DELETE /diary/:entryId error:', error);
    res.status(500).json({ error: 'Errore nella eliminazione della voce' });
  }
});

export default router;
