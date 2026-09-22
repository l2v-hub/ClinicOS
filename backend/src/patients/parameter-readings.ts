import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { Operator } from '../ai/auth.js';
import { patientScopeWhere } from './patient-scope.js';
import {
  PARAMETER_KEYS,
  facilityToday,
  PARAMETER_PATIENT_ID,
  ParameterReadingError,
  parseParameterReading,
  parseReadingQuery,
  encodeReadingCursor,
  type ParameterValues,
} from './parameter-reading-input.js';

export interface ParameterReadingRow {
  id: string;
  patientId: string;
  requestId: string;
  measuredAt: Date;
  values: ParameterValues;
  authorOperatorId: string;
  authorName: string;
  createdAt: Date;
}
// Explicit UTC projection avoids adapter/session timezone interpretation of timestamptz.
const READING_COLUMNS = Prisma.sql`"id", "patientId", "requestId", "values", "authorOperatorId", "authorName",
  "measuredAt" AT TIME ZONE 'UTC' AS "measuredAt", "createdAt" AT TIME ZONE 'UTC' AS "createdAt"`;
const dto = (row: ParameterReadingRow) => ({
  ...row,
  measuredAt: row.measuredAt.toISOString(),
  createdAt: row.createdAt.toISOString(),
});
async function assertPatient(
  patientId: string,
  actor: Operator,
  db: Pick<Prisma.TransactionClient, 'patient'> = prisma,
) {
  if (!PARAMETER_PATIENT_ID.test(patientId)) throw new ParameterReadingError('Paziente non valido');
  const patient = await db.patient.findFirst({
    where: { id: patientId, ...patientScopeWhere(actor) },
    select: { id: true },
  });
  if (!patient) throw new ParameterReadingError('Paziente non disponibile', 404);
}

/** The archive is independent of Cartella JSON: stale legacy writes cannot erase readings. */
export async function createParameterReading(patientId: string, body: unknown, actor: Operator) {
  const input = parseParameterReading(body);
  return prisma.$transaction(async (tx) => {
    await assertPatient(patientId, actor, tx);
    const author = await tx.operator.findUnique({
      where: { id: actor.id },
      select: { user: { select: { fullName: true } } },
    });
    if (!author)
      throw new ParameterReadingError('Operatore non disponibile. Accedi di nuovo.', 403);
    const inserted = await tx.$queryRaw<ParameterReadingRow[]>(Prisma.sql`
      INSERT INTO "PatientParameterReading" ("id", "patientId", "requestId", "measuredAt", "values", "authorOperatorId", "authorName")
      VALUES (${randomUUID()}, ${patientId}, ${input.requestId}, ${input.measuredAt}::timestamptz, ${JSON.stringify(input.values)}::jsonb, ${actor.id}, ${author.user.fullName})
      ON CONFLICT ("patientId", "requestId") DO NOTHING RETURNING ${READING_COLUMNS}
    `);
    const row =
      inserted[0] ??
      (
        await tx.$queryRaw<ParameterReadingRow[]>(Prisma.sql`
      SELECT ${READING_COLUMNS} FROM "PatientParameterReading" WHERE "patientId" = ${patientId} AND "requestId" = ${input.requestId}
    `)
      )[0];
    if (!row) throw new Error('Missing parameter reading');
    if (
      row.authorOperatorId !== actor.id ||
      row.measuredAt.toISOString() !== input.measuredAt ||
      PARAMETER_KEYS.some((key) => row.values[key] !== input.values[key])
    ) {
      throw new ParameterReadingError(
        'Questa richiesta corrisponde a una rilevazione diversa. Controlla lo storico.',
        409,
      );
    }
    const date = facilityToday(new Date(input.measuredAt));
    const [summary] = await tx.$queryRaw<
      Array<{ count: number; noteCount: number; lastReadingAt: Date | null }>
    >(Prisma.sql`
      SELECT count(*)::int AS "count", max("measuredAt") AT TIME ZONE 'UTC' AS "lastReadingAt",
        count(*) FILTER (WHERE jsonb_typeof("values"->'note') = 'string'
          AND btrim("values"->>'note') <> '')::int AS "noteCount"
      FROM "PatientParameterReading" WHERE "patientId" = ${patientId}
      AND "measuredAt" >= (${date}::date::timestamp AT TIME ZONE 'Europe/Rome')
      AND "measuredAt" < ((${date}::date + 1)::timestamp AT TIME ZONE 'Europe/Rome')
    `);
    return {
      reading: dto(row),
      replayed: inserted.length === 0,
      summary: {
        date,
        count: summary.count,
        noteCount: summary.noteCount,
        lastReadingAt: summary.lastReadingAt?.toISOString() ?? null,
      },
    };
  });
}

export async function listParameterReadings(
  patientId: string,
  query: Record<string, unknown>,
  actor: Operator,
) {
  const { filters, limit, position } = parseReadingQuery(patientId, query);
  await assertPatient(patientId, actor);
  const predicates = [Prisma.sql`"patientId" = ${patientId}`];
  if (filters.date)
    predicates.push(Prisma.sql`
    "measuredAt" >= (${filters.date}::date::timestamp AT TIME ZONE 'Europe/Rome')
    AND "measuredAt" < ((${filters.date}::date + 1)::timestamp AT TIME ZONE 'Europe/Rome')
  `);
  if (filters.month)
    predicates.push(Prisma.sql`
      "measuredAt" >= (${filters.month + '-01'}::date::timestamp AT TIME ZONE 'Europe/Rome')
      AND "measuredAt" < ((${filters.month + '-01'}::date + interval '1 month')::timestamp AT TIME ZONE 'Europe/Rome')
    `);
  if (position)
    predicates.push(
      Prisma.sql`("measuredAt", "id") < (${position.measuredAt}::timestamptz, ${position.id})`,
    );
  const rows = await prisma.$queryRaw<ParameterReadingRow[]>(Prisma.sql`
    SELECT ${READING_COLUMNS} FROM "PatientParameterReading" WHERE ${Prisma.join(predicates, ' AND ')}
    ORDER BY "measuredAt" DESC, "id" DESC LIMIT ${limit + 1}
  `);
  const hasMore = rows.length > limit;
  const readings = rows.slice(0, limit).map(dto);
  const last = readings.at(-1);
  return {
    readings,
    hasMore,
    nextCursor: hasMore && last ? encodeReadingCursor(last, filters) : null,
  };
}
