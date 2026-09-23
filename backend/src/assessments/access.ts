import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { Operator } from '../ai/auth.js';
import { hasGlobalPatientScope, patientScopeWhere } from '../patients/patient-scope.js';
import { assessmentId } from './input.js';
import {
  AssessmentError,
  PAINAD_KEYS,
  PAINAD_VERSION,
  type AssessmentDto,
  type AssessmentSnapshot,
  type PainadAnswers,
  type PainadSnapshot,
  type TransfersSnapshot,
  type TransfersAnswers,
  TRANSFERS_VERSION,
} from './types.js';
import { painadResult } from './painad.js';
import { transfersCompletion } from './transfers.js';
import { tinettiCompletion, tinettiResult } from './tinetti.js';
import { TINETTI_VERSION, type TinettiAnswers, type TinettiSnapshot } from './types.js';
import { MNA_VERSION, type MnaSnapshot } from './mna-types.js';
import { parseMnaAnswers } from './mna-input.js';
import { mnaCompletion, mnaResult } from './mna.js';

export const assessmentNotFound = () =>
  new AssessmentError('Valutazione non disponibile', 404, 'assessment_not_found');
/** Prisma's pg adapter strips timestamptz offsets: confine UTC to this transaction, never the shared pool. */
export function assessmentTransaction<T>(
  action: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;
    return action(tx);
  }, options);
}
export async function lockPatient(
  tx: Prisma.TransactionClient,
  patientId: string,
  actor: Operator,
) {
  assessmentId(patientId);
  const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT p.id FROM "Patient" p WHERE p.id = ${patientId}
      ${hasGlobalPatientScope(actor.role) ? Prisma.empty : Prisma.sql`AND p."registeredById" = ${actor.id}`}
    FOR SHARE OF p`);
  if (!rows.length) throw assessmentNotFound();
}
export function assessmentWhere(
  patientId: string,
  actor: Operator,
): Prisma.PatientAssessmentWhereInput {
  return {
    patientId,
    patient: patientScopeWhere(actor),
    OR: [{ status: 'final' }, { authorOperatorId: actor.id }],
  };
}
export const ASSESSMENT_INCLUDE = {
  document: { select: { id: true } },
  corrections: { where: { status: 'final' }, take: 1, select: { id: true } },
} satisfies Prisma.PatientAssessmentInclude;
export type AssessmentRow = Prisma.PatientAssessmentGetPayload<{
  include: typeof ASSESSMENT_INCLUDE;
}>;
export async function readAssessmentRow(
  tx: Prisma.TransactionClient,
  patientId: string,
  id: string,
  actor: Operator,
) {
  assessmentId(id);
  const row = await tx.patientAssessment.findFirst({
    where: { id, ...assessmentWhere(patientId, actor) },
    include: ASSESSMENT_INCLUDE,
  });
  if (!row) throw assessmentNotFound();
  return row;
}
export async function lockAssessment(
  tx: Prisma.TransactionClient,
  patientId: string,
  id: string,
  actor: Operator,
) {
  await lockPatient(tx, patientId, actor);
  assessmentId(id);
  await tx.$queryRaw(
    Prisma.sql`SELECT id FROM "PatientAssessment" WHERE id = ${id} AND "patientId" = ${patientId} FOR UPDATE`,
  );
  return readAssessmentRow(tx, patientId, id, actor);
}
export function assessmentDto(row: AssessmentRow, now = new Date()): AssessmentDto {
  const common = {
    id: row.id,
    patientId: row.patientId,
    status: row.status as 'draft' | 'final',
    version: row.version,
    assessedAt: row.assessedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    finalizedAt: row.finalizedAt?.toISOString() ?? null,
    author: { operatorId: row.authorOperatorId, name: row.authorName },
    predecessorId: row.predecessorId,
    correctionReason: row.correctionReason,
    correctedById: row.corrections[0]?.id ?? null,
    snapshotSha256: row.snapshotSha256,
    pdf: row.pdfStatus
      ? {
          status: row.pdfStatus as 'pending' | 'ready' | 'failed',
          documentId: row.document?.id ?? null,
          errorCode: row.pdfErrorCode,
          retryAvailable:
            row.pdfStatus !== 'ready' && (!row.pdfLeaseUntil || row.pdfLeaseUntil <= now),
        }
      : null,
  };
  if (row.type === 'mna' && row.formVersion === MNA_VERSION) {
    const answers = parseMnaAnswers(row.answers);
    const completion = mnaCompletion(answers);
    return {
      ...common,
      type: 'mna',
      formVersion: MNA_VERSION,
      answers,
      extent: answers.extent,
      answeredCount: completion.screening.answeredCount + completion.global.answeredCount,
      completion,
      result: mnaResult(answers),
      finalSnapshot: row.finalSnapshot as unknown as MnaSnapshot | null,
    };
  }
  if (row.type === 'tinetti' && row.formVersion === TINETTI_VERSION) {
    const answers = row.answers as unknown as TinettiAnswers;
    const completion = tinettiCompletion(answers);
    return {
      ...common,
      type: 'tinetti',
      formVersion: TINETTI_VERSION,
      answers,
      answeredCount: 20 - completion.missingPaths.length,
      completion,
      result: tinettiResult(answers),
      finalSnapshot: row.finalSnapshot as unknown as TinettiSnapshot | null,
    };
  }
  if (row.type === 'postural_transfers' && row.formVersion === TRANSFERS_VERSION) {
    const answers = row.answers as unknown as TransfersAnswers;
    return {
      ...common,
      type: 'postural_transfers',
      formVersion: TRANSFERS_VERSION,
      answers,
      completion: transfersCompletion(answers),
      result: null,
      finalSnapshot: row.finalSnapshot as unknown as TransfersSnapshot | null,
    };
  }
  if (row.type !== 'painad' || row.formVersion !== PAINAD_VERSION) throw assessmentNotFound();
  const answers = row.answers as PainadAnswers;
  return {
    ...common,
    type: 'painad',
    formVersion: PAINAD_VERSION,
    answers,
    answeredCount: PAINAD_KEYS.filter((key) => answers[key] !== null).length,
    result: painadResult(answers),
    finalSnapshot: row.finalSnapshot as unknown as PainadSnapshot | null,
  };
}
