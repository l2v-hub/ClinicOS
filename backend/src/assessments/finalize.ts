// POST /patients/:patientId/assessments/:id/finalize composition, moved verbatim from the route so
// the route and the Tool Layer (`assessments.finalize`) share it: finalize, then render the PDF
// synchronously unless the call is an idempotent replay.

import type { Operator } from '../ai/auth.js';
import { retryAssessmentPdf } from './pdf-service.js';
import { finalizeAssessment } from './service.js';

export async function finalizeAssessmentWithPdf(
  patientId: string,
  id: string,
  body: unknown,
  actor: Operator,
) {
  const result = await finalizeAssessment(patientId, id, body, actor);
  if (!result.replayed) result.assessment = await retryAssessmentPdf(patientId, id, actor);
  return result;
}
