import { prisma } from '../lib/prisma.js'
import { Router } from 'express';

const router = Router();

// GET /patients/:patientId/diary
// Query params: authorType, from (YYYY-MM-DD), to (YYYY-MM-DD)
router.get('/:patientId/diary', async (req, res) => {
  const { patientId } = req.params;
  const { authorType, from, to } = req.query as Record<string, string | undefined>;

  try {
    const entries = await prisma.patientDiaryEntry.findMany({
      where: {
        patientId,
        ...(authorType ? { authorType } : {}),
        ...(from || to ? {
          entryDateTime: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to + 'T23:59:59' } : {}),
          },
        } : {}),
      },
      orderBy: { entryDateTime: 'desc' },
    });
    res.status(200).json({ entries, total: entries.length });
  } catch (error) {
    console.error('GET /diary error:', error);
    res.status(500).json({ error: 'Errore nel recupero del diario' });
  }
});

// POST /patients/:patientId/diary
router.post('/:patientId/diary', async (req, res) => {
  const { patientId } = req.params;
  const { authorType, authorName, title, content, priority, status, entryDateTime, category } = req.body as {
    authorType?: string;
    authorName?: string;
    title?: string;
    content?: string;
    priority?: string;
    status?: string;
    entryDateTime?: string;
    category?: string;
  };

  if (!authorType || !authorName || !content || !entryDateTime) {
    res.status(400).json({ error: 'authorType, authorName, content, entryDateTime sono obbligatori' });
    return;
  }

  try {
    const entry = await prisma.patientDiaryEntry.create({
      data: {
        patientId,
        authorType,
        authorName,
        title: title ?? null,
        content,
        priority: priority ?? 'normale',
        status: status ?? 'aperta',
        entryDateTime,
        category: category ?? null,
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
  const { authorType, authorName, title, content, priority, status, entryDateTime, category } = req.body as {
    authorType?: string;
    authorName?: string;
    title?: string;
    content?: string;
    priority?: string;
    status?: string;
    entryDateTime?: string;
    category?: string;
  };

  try {
    const existing = await prisma.patientDiaryEntry.findFirst({ where: { id: entryId, patientId } });
    if (!existing) {
      res.status(404).json({ error: 'Voce non trovata' });
      return;
    }
    const entry = await prisma.patientDiaryEntry.update({
      where: { id: entryId },
      data: {
        ...(authorType !== undefined ? { authorType } : {}),
        ...(authorName !== undefined ? { authorName } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(entryDateTime !== undefined ? { entryDateTime } : {}),
        ...(category !== undefined ? { category } : {}),
      },
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
    const existing = await prisma.patientDiaryEntry.findFirst({ where: { id: entryId, patientId } });
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
