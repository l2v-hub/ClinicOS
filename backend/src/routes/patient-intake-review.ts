import { Router } from 'express';
import type { AuthedRequest } from '../ai/auth.js';
import { requirePatientScope } from '../patients/access.js';
import { AssessmentError } from '../assessments/types.js';
import { patientIntakeReview } from '../intake/patient-review.js';

export const patientIntakeReviewRouter = Router();
patientIntakeReviewRouter.get(
  '/:id/intake-review',
  (req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  },
  requirePatientScope,
  async (req: AuthedRequest, res) => {
    try {
      const patientId = String(req.params.id);
      res.json(await patientIntakeReview(patientId, req.operator!));
    } catch (error) {
      if (error instanceof AssessmentError) {
        res.status(error.status).json({ error: error.message, code: error.code });
        return;
      }
      res.status(500).json({ error: 'Impossibile recuperare le terapie da verificare' });
    }
  },
);
