import type { Operator } from '../ai/auth.js';
import { AssessmentError } from './types.js';
import {
  assessmentDto,
  assessmentTransaction,
  assessmentWhere,
  ASSESSMENT_INCLUDE,
  lockPatient,
} from './access.js';
export function currentAssessment(
  patientId: string,
  query: Record<string, unknown>,
  actor: Operator,
) {
  if (
    Object.keys(query).some((key) => key !== 'type') ||
    !['painad', 'postural_transfers', 'tinetti', 'mna', 'gds15'].includes(query.type as string)
  )
    throw new AssessmentError('Tipo di valutazione non valido');
  return assessmentTransaction(async (tx) => {
    await lockPatient(tx, patientId, actor);
    const row = await tx.patientAssessment.findFirst({
      where: {
        ...assessmentWhere(patientId, actor),
        type: query.type as string,
        status: 'final',
        corrections: { none: { status: 'final' } },
      },
      include: ASSESSMENT_INCLUDE,
      orderBy: [{ assessedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    });
    return row ? assessmentDto(row) : null;
  });
}
