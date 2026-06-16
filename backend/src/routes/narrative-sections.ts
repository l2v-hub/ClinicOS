// Patient narrative clinical sections API (REQ-029).
// Mounted at /patients. originalText is never modified here — edits update reviewedText.

import { Router } from 'express';
import {
  NARRATIVE_SECTION_KEYS, type NarrativeSectionKey,
  getNarrativeSections, getNarrativeSection, upsertNarrativeSection,
} from '../ai/sections/patient-narrative.js';

const router = Router();

function isKey(k: string): k is NarrativeSectionKey {
  return (NARRATIVE_SECTION_KEYS as readonly string[]).includes(k);
}

// GET /patients/:patientId/narrative-sections — all canonical sections (empty when absent)
router.get('/:patientId/narrative-sections', async (req, res) => {
  try {
    const sections = await getNarrativeSections(req.params.patientId);
    res.status(200).json({ sections, total: sections.length });
  } catch {
    res.status(500).json({ error: 'Errore nel recupero delle sezioni narrative' });
  }
});

// GET /patients/:patientId/narrative-sections/:sectionKey
router.get('/:patientId/narrative-sections/:sectionKey', async (req, res) => {
  const { patientId, sectionKey } = req.params;
  if (!isKey(sectionKey)) { res.status(400).json({ error: 'sectionKey non valido' }); return; }
  try {
    const dto = await getNarrativeSection(patientId, sectionKey);
    res.status(200).json(dto);
  } catch {
    res.status(500).json({ error: 'Errore nel recupero della sezione' });
  }
});

// PUT/PATCH /patients/:patientId/narrative-sections/:sectionKey — save reviewedText (+manual create)
async function save(req: import('express').Request, res: import('express').Response) {
  const patientId = String(req.params.patientId);
  const sectionKey = String(req.params.sectionKey);
  if (!isKey(sectionKey)) { res.status(400).json({ error: 'sectionKey non valido' }); return; }
  const body = (req.body ?? {}) as { reviewedText?: string; originalText?: string; reviewStatus?: string; updatedBy?: string };
  try {
    const dto = await upsertNarrativeSection(patientId, sectionKey, {
      reviewedText: typeof body.reviewedText === 'string' ? body.reviewedText : undefined,
      // originalText accepted only to seed a manually-created section (ignored if row exists).
      originalText: typeof body.originalText === 'string' ? body.originalText : undefined,
      reviewStatus: typeof body.reviewStatus === 'string' ? body.reviewStatus : undefined,
      updatedBy: body.updatedBy,
    });
    res.status(200).json(dto);
  } catch {
    res.status(500).json({ error: 'Errore nel salvataggio della sezione' });
  }
}
router.put('/:patientId/narrative-sections/:sectionKey', save);
router.patch('/:patientId/narrative-sections/:sectionKey', save);

export default router;
