// Patient narrative clinical sections API (REQ-029).
// Mounted at /patients. originalText is never modified here — edits update reviewedText.

import { Router } from 'express';
import {
  NARRATIVE_SECTION_KEYS,
  type NarrativeSectionKey,
  getNarrativeSections,
  getNarrativeSection,
  upsertNarrativeSection,
} from '../ai/sections/patient-narrative.js';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import { requirePatientScope } from '../patients/access.js';
import { NarrativeInputError, parseNarrativeSaveInput } from '../ai/sections/narrative-input.js';

const router = Router();

// Gate minimo (header-based, non IdP): le sezioni narrative sono dati clinici paziente
// reali, richiedono un operatore identificato. Vedi backend/src/ai/auth.ts.
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});
router.use(requireOperator);
router.use('/:patientId/narrative-sections', requirePatientScope);

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
  if (!isKey(sectionKey)) {
    res.status(400).json({ error: 'sectionKey non valido' });
    return;
  }
  try {
    const dto = await getNarrativeSection(patientId, sectionKey);
    res.status(200).json(dto);
  } catch {
    res.status(500).json({ error: 'Errore nel recupero della sezione' });
  }
});

// PUT/PATCH /patients/:patientId/narrative-sections/:sectionKey — save reviewedText (+manual create)
async function save(req: AuthedRequest, res: import('express').Response) {
  const patientId = String(req.params.patientId);
  const sectionKey = String(req.params.sectionKey);
  if (!isKey(sectionKey)) {
    res.status(400).json({ error: 'sectionKey non valido' });
    return;
  }
  try {
    const body = parseNarrativeSaveInput(req.body);
    const dto = await upsertNarrativeSection(patientId, sectionKey, {
      reviewedText: body.reviewedText,
      // originalText accepted only to seed a manually-created section (ignored if row exists).
      originalText: body.originalText,
      reviewStatus: body.reviewStatus,
      updatedBy: req.operator!.id,
    });
    res.status(200).json(dto);
  } catch (error) {
    if (error instanceof NarrativeInputError) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Errore nel salvataggio della sezione' });
  }
}
router.put('/:patientId/narrative-sections/:sectionKey', save);
router.patch('/:patientId/narrative-sections/:sectionKey', save);

export default router;
