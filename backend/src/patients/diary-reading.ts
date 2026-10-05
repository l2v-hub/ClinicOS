import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { prisma } from '../lib/prisma.js';
import {
  isAuthorAck,
  isAuthorOf,
  type AckRowLike,
  type UrgencySubject,
  type UrgencyTakenBy,
} from '../lib/urgency.js';
import { patientScopeWhere } from './patient-scope.js';
import { readsAllConsegne } from '../consegne/visibility.js';
// ECMAScript trim whitespace: SQL and the JS receipt projection must recognize the same legacy author.
const NAME_TRIM_CHARS =
  '\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff';

export interface DiaryReadReceipt {
  state: 'unread' | 'read';
  readBy: UrgencyTakenBy | null;
  isAuthor: boolean;
  canAcknowledge: boolean;
}

/** Only an explicit non-author receipt proves reading, regardless of priority or clinical status. */
export function diaryReadReceipt(
  subject: UrgencySubject,
  acks: readonly AckRowLike[],
  actor: { id: string; name?: string | null },
): DiaryReadReceipt {
  const isAuthor = isAuthorOf(subject, actor);
  const reader = acks.find((row) => !isAuthorAck(subject, row));
  return {
    state: reader ? 'read' : 'unread',
    readBy: reader
      ? {
          operatorName: reader.operatorName,
          operatorRole: reader.operatorRole,
          acknowledgedAt: reader.acknowledgedAt.toISOString(),
          byMe: reader.operatorId === actor.id,
        }
      : null,
    isAuthor,
    canAcknowledge: !reader && !isAuthor,
  };
}

/** Exact aggregate of the same two sources and visibility rules as loadPatientDiary, never a preview count. */
export async function countUnreadDiary(actor: Operator): Promise<number> {
  const scope = patientScopeWhere(actor);
  const residentScope = scope.registeredById
    ? Prisma.sql`p."registeredById" = ${scope.registeredById}`
    : Prisma.sql`TRUE`;
  const handoverVisibility = readsAllConsegne(actor)
    ? Prisma.sql`TRUE`
    : Prisma.sql`(c."creatoDaId" = ${actor.id} OR c."operatoreAssegnatoId" = ${actor.id})`;
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*) AS count FROM (
      SELECT d."id" FROM "PatientDiaryEntry" d
      JOIN "Patient" p ON p."id" = d."patientId"
      WHERE ${residentScope} AND NOT EXISTS (
        SELECT 1 FROM "DiaryEntryAcknowledgement" a WHERE a."entryId" = d."id"
        AND CASE WHEN d."authorId" IS NOT NULL THEN a."operatorId" <> d."authorId"
          ELSE btrim(a."operatorName", ${NAME_TRIM_CHARS}) <> btrim(d."authorName", ${NAME_TRIM_CHARS}) END
      )
      UNION ALL
      SELECT c."id" FROM "Consegna" c
      JOIN "Patient" p ON p."id" = c."pazienteId"
      WHERE ${residentScope} AND ${handoverVisibility} AND NOT EXISTS (
        SELECT 1 FROM "ConsegnaAcknowledgement" a WHERE a."consegnaId" = c."id"
        AND CASE WHEN c."creatoDaId" IS NOT NULL THEN a."operatorId" <> c."creatoDaId"
          ELSE btrim(a."operatorName", ${NAME_TRIM_CHARS}) <> btrim(c."creatoDA", ${NAME_TRIM_CHARS}) END
      )
    ) unread
  `);
  const count = Number(rows[0]?.count ?? 0);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid unread count');
  return count;
}
