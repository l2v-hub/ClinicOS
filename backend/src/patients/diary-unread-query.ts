import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { readsAllConsegne } from '../consegne/visibility.js';
import { patientScopeWhere } from './patient-scope.js';

// Match ECMAScript trim, including legacy author names: never count an author's own receipt.
const TRIM =
  '\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff';

/** Shared by badge, queue and patient counts. No date/priority/status truncation. */
export function unreadDiaryIdsSql(actor: Operator): Prisma.Sql {
  const scope = patientScopeWhere(actor);
  const resident = scope.registeredById
    ? Prisma.sql`p."registeredById" = ${scope.registeredById}`
    : Prisma.sql`TRUE`;
  const visibility = readsAllConsegne(actor)
    ? Prisma.sql`TRUE`
    : Prisma.sql`(c."creatoDaId" = ${actor.id} OR c."operatoreAssegnatoId" = ${actor.id})`;
  return Prisma.sql`
    SELECT d.id, d."patientId", 'diary'::text AS "sourceType", d.id AS "sourceId", d."entryDateTime"
    FROM "PatientDiaryEntry" d JOIN "Patient" p ON p.id = d."patientId"
    WHERE ${resident} AND NOT EXISTS (
      SELECT 1 FROM (
        SELECT "operatorId", "operatorName" FROM "DiaryEntryAcknowledgement" WHERE "entryId" = d.id
        UNION ALL SELECT "operatorId", "operatorName" FROM "DiaryEntryReadReceipt" WHERE "entryId" = d.id
      ) a WHERE CASE WHEN d."authorId" IS NOT NULL THEN a."operatorId" <> d."authorId"
        ELSE btrim(a."operatorName", ${TRIM}) <> btrim(d."authorName", ${TRIM}) END
    )
    UNION ALL
    SELECT 'consegna:' || c.id, c."pazienteId", 'consegna', c.id,
      to_char(c."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome', 'YYYY-MM-DD"T"HH24:MI')
    FROM "Consegna" c JOIN "Patient" p ON p.id = c."pazienteId"
    WHERE ${resident} AND ${visibility} AND NOT EXISTS (
      SELECT 1 FROM (
        SELECT "operatorId", "operatorName" FROM "ConsegnaAcknowledgement" WHERE "consegnaId" = c.id
        UNION ALL SELECT "operatorId", "operatorName" FROM "ConsegnaReadReceipt" WHERE "consegnaId" = c.id
      ) a WHERE CASE WHEN c."creatoDaId" IS NOT NULL THEN a."operatorId" <> c."creatoDaId"
        ELSE btrim(a."operatorName", ${TRIM}) <> btrim(c."creatoDA", ${TRIM}) END
    )`;
}
