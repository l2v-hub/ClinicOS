import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requirePatientScope } from '../patients/access.js';
import { deferredTherapies } from '../intake/therapy-selection.js';

export const patientIntakeReviewRouter = Router();
patientIntakeReviewRouter.get('/:id/intake-review', requirePatientScope, async (req, res) => {
  try {
    const patientId = String(req.params.id);
    const drafts = await prisma.patientIntakeDraft.findMany({
      where: { confirmedPatientId: patientId, status: 'confirmed' },
      orderBy: { confirmedAt: 'desc' },
      select: { id: true, data: true, importJobId: true },
    });
    const deferred = drafts.flatMap((draft) =>
      deferredTherapies(draft.data as Record<string, unknown>),
    );
    const documents = await prisma.patientDocument.findMany({
      where: {
        patientId,
        importJobId: { in: drafts.flatMap((d) => (d.importJobId ? [d.importJobId] : [])) },
      },
      select: { id: true },
    });
    res.json({
      draftId: drafts[0]?.id ?? null,
      deferredTherapies: deferred,
      sourceDocumentIds: documents.map((d) => d.id),
    });
  } catch {
    res.status(500).json({ error: 'Impossibile recuperare le terapie da verificare' });
  }
});
