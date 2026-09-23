import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { Operator } from '../ai/auth.js';
import { loadOperationalIdentities } from '../patients/operational-identity.js';
import { patientScopeWhere } from '../patients/patient-scope.js';
import { facilityToday } from '../patients/parameter-reading-input.js';
import { parseCreate, parseFinalize, parsePatch, payloadHash } from './input.js';
import {
  assessmentDto,
  assessmentNotFound,
  assessmentTransaction,
  lockAssessment,
  lockPatient,
  readAssessmentRow,
} from './access.js';
import {
  AssessmentError,
  PAINAD_KEYS,
  PAINAD_SOURCE_SHA256,
  PAINAD_VERSION,
  type AssessmentSnapshot,
  type PainadAnswers,
  type PainadScore,
  type AssessmentType,
  type TransfersAnswers,
  TRANSFERS_VERSION,
  TRANSFERS_SOURCE_SHA256,
} from './types.js';
import { PAINAD_INTERPRETATIONS, PAINAD_ITEMS, painadResult } from './painad.js';
import { transfersCompletion, transfersSections } from './transfers.js';
import { tinettiCompletion, tinettiResult, tinettiSnapshotItems } from './tinetti.js';
import { parseMnaAnswers } from './mna-input.js';
import { mnaCompletion } from './mna.js';
import { mnaSnapshot, mnaSnapshotHash } from './mna-snapshot.js';
import type { MnaSnapshot } from './mna-types.js';
import { parseGds15Answers, gds15Completion } from './gds15.js';
import { gds15Snapshot, gds15SnapshotHash } from './gds15-snapshot.js';
import type { Gds15Snapshot } from './types.js';
import { TINETTI_PROVENANCE } from './tinetti-definition.js';
import {
  TINETTI_VERSION,
  TINETTI_SOURCE_SHA256,
  TINETTI_REFERENCE_SHA256,
  type TinettiAnswers,
} from './tinetti-types.js';

const conflict = () =>
  new AssessmentError(
    'La richiesta corrisponde a dati diversi',
    409,
    'assessment_request_conflict',
  );
const corrected = () =>
  new AssessmentError(
    'La valutazione è già stata rettificata',
    409,
    'assessment_already_corrected',
  );
function assertVersion(actual: number, expected: number) {
  if (actual !== expected)
    throw new AssessmentError(
      'La bozza è cambiata. Ricaricala prima di salvare.',
      409,
      'assessment_version_conflict',
      { currentVersion: actual },
    );
}
async function assertPredecessor(
  tx: Prisma.TransactionClient,
  patientId: string,
  id: string,
  type: string,
) {
  const predecessor = await tx.patientAssessment.findFirst({
    where: { id, patientId, type, status: 'final' },
    select: { id: true, assessedAt: true, authorName: true },
  });
  if (!predecessor) throw assessmentNotFound();
  return predecessor;
}
export async function getAssessment(patientId: string, id: string, actor: Operator) {
  return assessmentTransaction(async (tx) => {
    await lockPatient(tx, patientId, actor);
    return assessmentDto(await readAssessmentRow(tx, patientId, id, actor));
  });
}
export async function createAssessment(patientId: string, value: unknown, actor: Operator) {
  const input = parseCreate(value);
  const hash = payloadHash({ operation: 'create', patientId, ...input });
  return assessmentTransaction(async (tx) => {
    await lockPatient(tx, patientId, actor);
    const existing = await tx.patientAssessment.findUnique({
      where: {
        authorOperatorId_requestId: { authorOperatorId: actor.id, requestId: input.requestId },
      },
      select: { id: true, patientId: true, creationPayloadHash: true },
    });
    if (existing) {
      if (existing.patientId !== patientId || existing.creationPayloadHash !== hash)
        throw conflict();
      return {
        assessment: assessmentDto(await readAssessmentRow(tx, patientId, existing.id, actor)),
        requestId: input.requestId,
        replayed: true,
      };
    }
    if (input.predecessorId)
      await assertPredecessor(tx, patientId, input.predecessorId, input.type);
    const author = await tx.operator.findUnique({
      where: { id: actor.id },
      select: { user: { select: { fullName: true } } },
    });
    if (!author) throw assessmentNotFound();
    const inserted = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      INSERT INTO "PatientAssessment" (id,"patientId",type,"formVersion","authorOperatorId","authorName","assessedAt",answers,"requestId","creationPayloadHash","predecessorId","correctionReason")
      VALUES (${randomUUID()},${patientId},${input.type},${input.formVersion},${actor.id},${author.user.fullName},${input.assessedAt}::timestamptz,
        ${JSON.stringify(input.answers)}::jsonb,${input.requestId},${hash},${input.predecessorId},${input.correctionReason})
      ON CONFLICT ("authorOperatorId","requestId") DO NOTHING RETURNING id`);
    const row = await tx.patientAssessment.findUniqueOrThrow({
      where: {
        authorOperatorId_requestId: { authorOperatorId: actor.id, requestId: input.requestId },
      },
      select: { id: true, patientId: true, creationPayloadHash: true },
    });
    if (row.patientId !== patientId || row.creationPayloadHash !== hash) throw conflict();
    return {
      assessment: assessmentDto(await readAssessmentRow(tx, patientId, row.id, actor)),
      requestId: input.requestId,
      replayed: inserted.length === 0,
    };
  });
}
export async function patchAssessment(
  patientId: string,
  id: string,
  value: unknown,
  actor: Operator,
) {
  return assessmentTransaction(async (tx) => {
    const row = await lockAssessment(tx, patientId, id, actor);
    const input = parsePatch(value, row.type as AssessmentType);
    if (row.authorOperatorId !== actor.id) throw assessmentNotFound();
    if (row.status !== 'draft')
      throw new AssessmentError('La valutazione è già finalizzata', 409, 'assessment_finalized');
    assertVersion(row.version, input.expectedVersion);
    if (Boolean(row.predecessorId) !== Boolean(input.correctionReason))
      throw new AssessmentError('Motivo della rettifica non valido');
    await tx.patientAssessment.update({
      where: { id },
      data: {
        assessedAt: new Date(input.assessedAt),
        answers: input.answers as unknown as Prisma.InputJsonValue,
        correctionReason: input.correctionReason,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });
    return assessmentDto(await readAssessmentRow(tx, patientId, id, actor));
  });
}
export async function finalizeAssessment(
  patientId: string,
  id: string,
  value: unknown,
  actor: Operator,
) {
  const input = parseFinalize(value);
  const hash = payloadHash({ operation: 'finalize', patientId, id, ...input });
  try {
    return await assessmentTransaction(async (tx) => {
      const row = await lockAssessment(tx, patientId, id, actor);
      if (row.authorOperatorId !== actor.id) throw assessmentNotFound();
      if (row.status === 'final') {
        if (row.finalizeRequestId === input.requestId) {
          if (row.finalizePayloadHash !== hash) throw conflict();
          return { assessment: assessmentDto(row), requestId: input.requestId, replayed: true };
        }
        throw new AssessmentError('La valutazione è già finalizzata', 409, 'assessment_finalized');
      }
      assertVersion(row.version, input.expectedVersion);
      const answers = row.answers as PainadAnswers;
      const result = row.type === 'painad' ? painadResult(answers) : null;
      if (row.type === 'painad' && !result)
        throw new AssessmentError(
          'Completa tutte le risposte prima di confermare',
          422,
          'assessment_incomplete',
          { missingItems: PAINAD_KEYS.filter((key) => answers[key] === null) },
        );
      if (
        row.type === 'postural_transfers' ||
        row.type === 'tinetti' ||
        row.type === 'mna' ||
        row.type === 'gds15'
      ) {
        const completion =
          row.type === 'gds15'
            ? gds15Completion(parseGds15Answers(row.answers))
            : row.type === 'mna'
              ? mnaCompletion(parseMnaAnswers(row.answers))
              : row.type === 'tinetti'
                ? tinettiCompletion(row.answers as unknown as TinettiAnswers)
                : transfersCompletion(row.answers as unknown as TransfersAnswers);
        if (!completion.complete)
          throw new AssessmentError(
            'Completa tutte le risposte prima di confermare',
            422,
            'assessment_incomplete',
            { missingPaths: completion.missingPaths },
          );
      }
      let predecessor: AssessmentSnapshot['predecessor'] = null;
      if (row.predecessorId) {
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM "PatientAssessment" WHERE id = ${row.predecessorId} FOR UPDATE`,
        );
        const previous = await assertPredecessor(tx, patientId, row.predecessorId, row.type);
        predecessor = {
          id: previous.id,
          assessedAt: previous.assessedAt.toISOString(),
          authorName: previous.authorName,
        };
        if (
          await tx.patientAssessment.findFirst({
            where: { predecessorId: row.predecessorId, status: 'final' },
            select: { id: true },
          })
        )
          throw corrected();
      }
      const now = new Date();
      const identity = (
        await loadOperationalIdentities(
          [patientId],
          patientScopeWhere(actor),
          facilityToday(row.assessedAt),
          tx,
        )
      ).get(patientId);
      if (!identity) throw assessmentNotFound();
      const common = {
        snapshotVersion: 1 as const,
        patient: identity,
        author: { operatorId: actor.id, name: row.authorName },
        assessedAt: row.assessedAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
        finalizedAt: now.toISOString(),
        predecessor,
        predecessorId: row.predecessorId,
        correctionReason: row.correctionReason,
      };
      const snapshot: AssessmentSnapshot =
        row.type === 'gds15'
          ? gds15Snapshot(common, row.answers)
          : row.type === 'mna'
            ? await mnaSnapshot(tx, common, row.answers)
            : row.type === 'tinetti'
              ? {
                  ...common,
                  form: {
                    type: 'tinetti',
                    version: TINETTI_VERSION,
                    sourceSha256: TINETTI_SOURCE_SHA256,
                    referenceSha256: TINETTI_REFERENCE_SHA256,
                  },
                  items: tinettiSnapshotItems(row.answers as unknown as TinettiAnswers),
                  result: tinettiResult(row.answers as unknown as TinettiAnswers)!,
                  notes: (row.answers as unknown as TinettiAnswers).notes,
                  provenance: TINETTI_PROVENANCE,
                }
              : row.type === 'postural_transfers'
                ? {
                    ...common,
                    form: {
                      type: 'postural_transfers',
                      version: TRANSFERS_VERSION,
                      sourceSha256: TRANSFERS_SOURCE_SHA256,
                    },
                    sections: transfersSections(row.answers as unknown as TransfersAnswers),
                    result: null,
                    signatureLabels: ['Firma Fisioterapista', 'Firma Operatori'],
                  }
                : {
                    ...common,
                    form: {
                      type: 'painad',
                      version: PAINAD_VERSION,
                      sourceSha256: PAINAD_SOURCE_SHA256,
                    },
                    items: PAINAD_ITEMS.map((item) => ({
                      id: item.id,
                      label: item.label,
                      score: answers[item.id] as PainadScore,
                      description: item.options[answers[item.id] as PainadScore],
                    })),
                    result: result!,
                    interpretation: PAINAD_INTERPRETATIONS[result!.band],
                  };
      await tx.patientAssessment.update({
        where: { id },
        data: {
          status: 'final',
          version: { increment: 1 },
          updatedAt: now,
          finalizedAt: now,
          finalizeRequestId: input.requestId,
          finalizePayloadHash: hash,
          finalSnapshot: snapshot as unknown as Prisma.InputJsonValue,
          snapshotSha256:
            row.type === 'gds15'
              ? gds15SnapshotHash(snapshot as Gds15Snapshot)
              : row.type === 'mna'
                ? mnaSnapshotHash(snapshot as MnaSnapshot)
                : payloadHash(snapshot),
          pdfStatus: 'pending',
          pdfUpdatedAt: now,
        },
      });
      return {
        assessment: assessmentDto(await readAssessmentRow(tx, patientId, id, actor)),
        requestId: input.requestId,
        replayed: false,
      };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      throw conflict();
    throw error;
  }
}
