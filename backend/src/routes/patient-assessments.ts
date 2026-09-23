import { Router, type Response } from 'express';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import { AssessmentError } from '../assessments/types.js';
import {
  createAssessment,
  finalizeAssessment,
  getAssessment,
  patchAssessment,
} from '../assessments/service.js';
import { listAssessments } from '../assessments/history.js';
import { retryAssessmentPdf } from '../assessments/pdf-service.js';
import { bodyObject } from '../assessments/input.js';
import { currentAssessment } from '../assessments/current.js';
import { attestAssessment, listAttestations } from '../assessments/attestations.js';

const router = Router();
type Action = (request: AuthedRequest, response: Response) => Promise<void>;
const handle = (action: Action) => async (req: AuthedRequest, res: Response) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    await action(req, res);
  } catch (error) {
    if (error instanceof AssessmentError) {
      res.status(error.status).json({ error: error.message, code: error.code, ...error.details });
      return;
    }
    res
      .status(500)
      .json({ error: 'Operazione sulla valutazione non riuscita', code: 'assessment_unavailable' });
  }
};
const patient = (req: AuthedRequest) => String(req.params.patientId);
const id = (req: AuthedRequest) => String(req.params.id);
router.get(
  '/:patientId/assessments/current',
  requireOperator,
  handle(async (req, res) => {
    res.json({ assessment: await currentAssessment(patient(req), req.query, req.operator!) });
  }),
);
router.get(
  '/:patientId/assessments/:id/attestations',
  requireOperator,
  handle(async (req, res) => {
    res.json(await listAttestations(patient(req), id(req), req.query, req.operator!));
  }),
);
router.post(
  '/:patientId/assessments/:id/attestations',
  requireOperator,
  handle(async (req, res) => {
    const result = await attestAssessment(patient(req), id(req), req.body, req.operator!);
    res.status(result.replayed ? 200 : 201).json(result);
  }),
);
router.post(
  '/:patientId/assessments',
  requireOperator,
  handle(async (req, res) => {
    const result = await createAssessment(patient(req), req.body, req.operator!);
    res.status(result.replayed ? 200 : 201).json(result);
  }),
);
router.get(
  '/:patientId/assessments',
  requireOperator,
  handle(async (req, res) => {
    res.json(await listAssessments(patient(req), req.query, req.operator!));
  }),
);
router.get(
  '/:patientId/assessments/:id',
  requireOperator,
  handle(async (req, res) => {
    res.json({ assessment: await getAssessment(patient(req), id(req), req.operator!) });
  }),
);
router.patch(
  '/:patientId/assessments/:id',
  requireOperator,
  handle(async (req, res) => {
    res.json({ assessment: await patchAssessment(patient(req), id(req), req.body, req.operator!) });
  }),
);
router.post(
  '/:patientId/assessments/:id/finalize',
  requireOperator,
  handle(async (req, res) => {
    const result = await finalizeAssessment(patient(req), id(req), req.body, req.operator!);
    if (!result.replayed)
      result.assessment = await retryAssessmentPdf(patient(req), id(req), req.operator!);
    res.json(result);
  }),
);
router.post(
  '/:patientId/assessments/:id/pdf/retry',
  requireOperator,
  handle(async (req, res) => {
    bodyObject(req.body, []);
    res.json({ assessment: await retryAssessmentPdf(patient(req), id(req), req.operator!) });
  }),
);
export default router;
