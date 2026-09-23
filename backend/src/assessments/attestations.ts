import { Prisma, type PatientAssessmentAttestation } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { assessmentId, bodyObject, parseInstant } from './input.js';
import {
  assessmentNotFound,
  assessmentTransaction,
  lockAssessment,
  lockPatient,
  readAssessmentRow,
  type AssessmentRow,
} from './access.js';
import {
  AssessmentError,
  ATTESTATION_KINDS,
  type AttestationKind,
  type AssessmentAttestationDto,
  type AssessmentAttestationPage,
} from './types.js';
function finalForAttestation(row: AssessmentRow) {
  if (row.type !== 'postural_transfers')
    throw new AssessmentError(
      'Conferme non disponibili per questo modulo',
      400,
      'assessment_attestation_type',
    );
  if (row.status !== 'final' || !row.snapshotSha256)
    throw new AssessmentError(
      'Finalizza la scheda prima della conferma',
      409,
      'assessment_not_final',
    );
  return row.snapshotSha256;
}
type RegisteredActor = { name: string; qualification: string | null };
async function registeredActor(
  tx: Prisma.TransactionClient,
  actor: Operator,
): Promise<RegisteredActor> {
  const [row] = await tx.$queryRaw<
    RegisteredActor[]
  >`SELECT u."fullName" AS name,o.qualifica AS qualification
    FROM "Operator" o JOIN "User" u ON u.id=o."userId" WHERE o.id=${actor.id} FOR SHARE OF o,u`;
  if (!row) throw assessmentNotFound();
  return row;
}
const eligible = (qualification: string | null): AttestationKind[] =>
  qualification?.trim().toLowerCase() === 'fisioterapista'
    ? [...ATTESTATION_KINDS]
    : ['operator_acknowledgement'];
function dto(row: PatientAssessmentAttestation): AssessmentAttestationDto {
  return {
    id: row.id,
    assessmentId: row.assessmentId,
    snapshotSha256: row.snapshotSha256,
    kind: row.kind as AttestationKind,
    actor: {
      operatorId: row.actorOperatorId,
      name: row.actorName,
      registeredQualification: row.registeredQualification,
    },
    createdAt: row.createdAt.toISOString(),
  };
}
export async function attestAssessment(
  patientId: string,
  id: string,
  value: unknown,
  actor: Operator,
) {
  const input = bodyObject(value, ['kind', 'snapshotSha256']);
  if (
    !ATTESTATION_KINDS.includes(input.kind as AttestationKind) ||
    typeof input.snapshotSha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(input.snapshotSha256)
  )
    throw new AssessmentError('Conferma non valida');
  return assessmentTransaction(async (tx) => {
    const row = await lockAssessment(tx, patientId, id, actor);
    const hash = finalForAttestation(row);
    if (hash !== input.snapshotSha256)
      throw new AssessmentError(
        'La versione da confermare non corrisponde',
        409,
        'assessment_snapshot_conflict',
      );
    const where = {
      assessmentId_kind_actorOperatorId: {
        assessmentId: id,
        kind: input.kind as string,
        actorOperatorId: actor.id,
      },
    };
    const existing = await tx.patientAssessmentAttestation.findUnique({ where });
    if (existing) return { attestation: dto(existing), replayed: true };
    const person = await registeredActor(tx, actor);
    if (!eligible(person.qualification).includes(input.kind as AttestationKind))
      throw new AssessmentError(
        'La qualifica registrata non consente questa conferma',
        403,
        'assessment_attestation_forbidden',
      );
    const event = await tx.patientAssessmentAttestation.create({
      data: {
        assessmentId: id,
        snapshotSha256: hash,
        kind: input.kind as string,
        actorOperatorId: actor.id,
        actorName: person.name,
        registeredQualification: person.qualification,
      },
    });
    return { attestation: dto(event), replayed: false };
  });
}
export async function listAttestations(
  patientId: string,
  id: string,
  query: Record<string, unknown>,
  actor: Operator,
): Promise<AssessmentAttestationPage> {
  const invalid = () =>
    new AssessmentError('Pagina conferme non valida', 400, 'assessment_invalid_cursor');
  if (
    Object.keys(query).some((key) => !['limit', 'cursor'].includes(key)) ||
    (query.limit !== undefined &&
      (typeof query.limit !== 'string' || !/^\d{1,3}$/.test(query.limit)))
  )
    throw invalid();
  const limit = Number(query.limit ?? 25);
  if (limit < 1 || limit > 100 || !Number.isInteger(limit)) throw invalid();
  return assessmentTransaction(
    async (tx) => {
      await lockPatient(tx, patientId, actor);
      const row = await readAssessmentRow(tx, patientId, id, actor),
        hash = finalForAttestation(row);
      const binding = { patientId, id, hash, actorId: actor.id, role: actor.role.toLowerCase() };
      let position: { id: string; createdAt: string } | undefined;
      if (query.cursor !== undefined)
        try {
          if (
            typeof query.cursor !== 'string' ||
            query.cursor.length > 1024 ||
            !/^[\w-]+$/.test(query.cursor)
          )
            throw invalid();
          const raw = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8'));
          if (raw.v !== 1 || JSON.stringify(raw.binding) !== JSON.stringify(binding))
            throw invalid();
          position = { id: assessmentId(raw.id), createdAt: parseInstant(raw.createdAt) };
          if (
            !(await tx.patientAssessmentAttestation.findFirst({
              where: {
                assessmentId: id,
                snapshotSha256: hash,
                id: position.id,
                createdAt: new Date(position.createdAt),
              },
              select: { id: true },
            }))
          )
            throw invalid();
        } catch {
          throw invalid();
        }
      const where = { assessmentId: id, snapshotSha256: hash };
      const [events, counts, mine, person] = await Promise.all([
        tx.patientAssessmentAttestation.findMany({
          where: {
            ...where,
            ...(position
              ? {
                  OR: [
                    { createdAt: { lt: new Date(position.createdAt) } },
                    { createdAt: new Date(position.createdAt), id: { lt: position.id } },
                  ],
                }
              : {}),
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: limit + 1,
        }),
        tx.patientAssessmentAttestation.groupBy({ by: ['kind'], where, _count: { _all: true } }),
        tx.patientAssessmentAttestation.findMany({
          where: { ...where, actorOperatorId: actor.id },
          select: { kind: true },
          take: 2,
        }),
        registeredActor(tx, actor),
      ]);
      const items = events.slice(0, limit).map(dto),
        hasMore = events.length > limit,
        last = items.at(-1);
      return {
        assessmentId: id,
        snapshotSha256: hash,
        correctedById: row.corrections[0]?.id ?? null,
        items,
        counts: {
          physiotherapist_confirmation:
            counts.find((c) => c.kind === 'physiotherapist_confirmation')?._count._all ?? 0,
          operator_acknowledgement:
            counts.find((c) => c.kind === 'operator_acknowledgement')?._count._all ?? 0,
        },
        me: {
          registeredQualification: person.qualification,
          allowedKinds: eligible(person.qualification),
          attestedKinds: mine.map((item) => item.kind as AttestationKind),
        },
        pageInfo: {
          loadedCount: items.length,
          hasMore,
          nextCursor:
            hasMore && last
              ? Buffer.from(
                  JSON.stringify({ v: 1, binding, id: last.id, createdAt: last.createdAt }),
                ).toString('base64url')
              : null,
        },
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
