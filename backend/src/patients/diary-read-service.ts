import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { prisma } from '../lib/prisma.js';
import { hasGlobalPatientScope, patientScopeWhere } from './patient-scope.js';
import {
  decodeDiaryPageCursor,
  encodeDiaryPageCursor,
  parseDiaryPageQuery,
} from './diary-pagination.js';

interface DiaryFeedRow {
  id: string;
  patientId: string;
  authorType: string;
  authorName: string;
  title: string | null;
  content: string;
  priority: string;
  status: string;
  entryDateTime: string;
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
  sourceType: 'diary' | 'consegna';
  sourceId: string;
}

/** One read model, no mirrored diary records. Existing handovers remain the source of truth. */
export async function loadPatientDiary(
  patientId: string,
  query: Record<string, unknown>,
  actor: Operator,
) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, ...patientScopeWhere(actor) },
    select: { id: true },
  });
  if (!patient) return null;
  const input = parseDiaryPageQuery(query);
  const filters = { authorType: input.authorType, from: input.from, to: input.to };
  const position = input.cursor ? decodeDiaryPageCursor(input.cursor, filters) : undefined;
  // Preserve the handover feed's author/assignee visibility, in addition to patient scope.
  const handoverVisibility = hasGlobalPatientScope(actor.role)
    ? Prisma.sql`TRUE`
    : Prisma.sql`(c."creatoDaId" = ${actor.id} OR c."operatoreAssegnatoId" = ${actor.id})`;
  const predicates = [
    input.authorType ? Prisma.sql`"authorType" = ${input.authorType}` : Prisma.sql`TRUE`,
    input.from ? Prisma.sql`"entryDateTime" >= ${input.from}` : Prisma.sql`TRUE`,
    input.to ? Prisma.sql`"entryDateTime" <= ${input.to + 'T23:59:59.999'}` : Prisma.sql`TRUE`,
    position
      ? Prisma.sql`("entryDateTime", "id") < (${position.entryDateTime}, ${position.id})`
      : Prisma.sql`TRUE`,
  ];
  const rows = await prisma.$queryRaw<DiaryFeedRow[]>(Prisma.sql`
    SELECT * FROM (
      SELECT d."id", d."patientId", d."authorType", d."authorName", d."title", d."content",
        d."priority", d."status", d."entryDateTime", d."category", d."createdAt", d."updatedAt",
        'diary'::text AS "sourceType", d."id" AS "sourceId"
      FROM "PatientDiaryEntry" d WHERE d."patientId" = ${patientId}
      UNION ALL
      SELECT 'consegna:' || c."id", c."pazienteId",
        CASE WHEN lower(trim(o."ruolo")) IN ('medico', 'infermiere', 'oss', 'fisioterapista', 'operatore', 'altro')
          THEN lower(trim(o."ruolo")) ELSE 'operatore' END,
        COALESCE(NULLIF(trim(u."fullName"), ''), NULLIF(trim(c."creatoDA"), ''), 'Operatore non disponibile'),
        'Consegna · ' || c."tipo", c."note",
        CASE WHEN c."priorita" = 'alta' THEN 'importante' ELSE c."priorita" END,
        CASE WHEN c."stato" = 'completata' THEN 'completata' ELSE 'aperta' END,
        to_char(c."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome', 'YYYY-MM-DD"T"HH24:MI'),
        'Consegna', c."createdAt", c."updatedAt", 'consegna', c."id"
      FROM "Consegna" c
      LEFT JOIN "Operator" o ON o."id" = c."creatoDaId"
      LEFT JOIN "User" u ON u."id" = o."userId"
      WHERE c."pazienteId" = ${patientId} AND ${handoverVisibility}
    ) entries
    WHERE ${Prisma.join(predicates, ' AND ')}
    ORDER BY "entryDateTime" DESC, "id" DESC
    LIMIT ${input.limit + 1} OFFSET ${input.offset ?? 0}
  `);
  const hasMore = rows.length > input.limit;
  const entries = rows.slice(0, input.limit);
  const last = entries.at(-1);
  return {
    entries,
    loadedCount: entries.length,
    hasMore,
    nextCursor:
      hasMore && last
        ? encodeDiaryPageCursor({ entryDateTime: last.entryDateTime, id: last.id }, filters)
        : null,
  };
}
