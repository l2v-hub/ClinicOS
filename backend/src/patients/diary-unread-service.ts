import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { prisma } from '../lib/prisma.js';
import { readsAllConsegne } from '../consegne/visibility.js';
import { patientScopeWhere } from './patient-scope.js';
import { loadOperationalIdentities } from './operational-identity.js';
import { loadDiaryAckFields } from './diary-ack-service.js';
import { unreadDiaryIdsSql } from './diary-unread-query.js';
import {
  DiaryPageInputError,
  decodeDiaryPageCursor,
  encodeDiaryPageCursor,
} from './diary-pagination.js';

const ID = /^[A-Za-z0-9_-]{1,200}$/;
function safeId(value: unknown): string {
  if (typeof value !== 'string' || !ID.test(value))
    throw new DiaryPageInputError('Identificativo non valido');
  return value;
}
export function parseUnreadPatientIds(value: unknown): string[] {
  if (typeof value !== 'string') throw new DiaryPageInputError('Elenco pazienti non valido');
  const ids = value.split(',').map(safeId);
  if (!ids.length || ids.length > 50 || new Set(ids).size !== ids.length)
    throw new DiaryPageInputError('Elenco limitato a 50 pazienti distinti');
  return ids;
}
export function parseUnreadDiaryQuery(query: Record<string, unknown>, actor: Operator) {
  if (Object.keys(query).some((key) => !['limit', 'cursor', 'patientId'].includes(key)))
    throw new DiaryPageInputError('Filtro della coda non valido');
  const patientId = query.patientId === undefined ? undefined : safeId(query.patientId);
  const limit =
    query.limit === undefined
      ? 20
      : typeof query.limit === 'string' && /^[1-9]\d*$/.test(query.limit)
        ? Number(query.limit)
        : NaN;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 20)
    throw new DiaryPageInputError('limit deve essere tra 1 e 20');
  const binding = createHash('sha256')
    .update(
      JSON.stringify([
        actor.id,
        actor.role,
        actor.appRole ?? null,
        patientScopeWhere(actor),
        readsAllConsegne(actor),
        patientId ?? null,
      ]),
    )
    .digest('hex')
    .slice(0, 32);
  const filters = { authorType: binding };
  const position =
    query.cursor === undefined
      ? undefined
      : typeof query.cursor === 'string'
        ? decodeDiaryPageCursor(query.cursor, filters)
        : (() => {
            throw new DiaryPageInputError('cursor non valido');
          })();
  return { patientId, limit, position, filters };
}
interface UnreadRow {
  id: string;
  patientId: string;
  sourceType: 'diary' | 'consegna';
  sourceId: string;
  entryDateTime: string;
  authorType: string;
  authorName: string;
  authorId: string | null;
  title: string | null;
  content: string;
  priority: string;
  status: string;
  category: string | null;
}
function exactCount(value: bigint) {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid unread count');
  return count;
}
export async function loadUnreadPatientCounts(
  ids: string[],
  actor: Operator,
  db: Prisma.TransactionClient = prisma,
) {
  if (!ids.length) return [];
  const scope = patientScopeWhere(actor);
  const rows = await db.$queryRaw<Array<{ patientId: string; total: bigint }>>(Prisma.sql`
    WITH unread AS (${unreadDiaryIdsSql(actor)})
    SELECT p.id AS "patientId", count(u.id) AS total
    FROM "Patient" p LEFT JOIN unread u ON u."patientId" = p.id
    WHERE p.id IN (${Prisma.join(ids)}) AND ${scope.registeredById ? Prisma.sql`p."registeredById" = ${scope.registeredById}` : Prisma.sql`TRUE`}
    GROUP BY p.id ORDER BY p.id LIMIT ${ids.length}
  `);
  return rows.map((row) => ({ patientId: row.patientId, total: exactCount(row.total) }));
}
/** Repeatable-read snapshot keeps page/counts/identities/receipts coherent, with no read side effect. */
export async function loadUnreadDiary(query: Record<string, unknown>, actor: Operator) {
  const input = parseUnreadDiaryQuery(query, actor);
  return prisma.$transaction(
    async (tx) => {
      const unread = unreadDiaryIdsSql(actor);
      const patientFilter = input.patientId
        ? Prisma.sql`"patientId" = ${input.patientId}`
        : Prisma.sql`TRUE`;
      const counts = await tx.$queryRaw<Array<{ total: bigint; filtered: bigint }>>(Prisma.sql`
      WITH unread AS (${unread}) SELECT count(*) AS total, count(*) FILTER (WHERE ${patientFilter}) AS filtered FROM unread
    `);
      const rows = await tx.$queryRaw<UnreadRow[]>(Prisma.sql`
      WITH unread AS (${unread}), page AS (
        SELECT * FROM unread WHERE ${patientFilter}
        AND ${input.position ? Prisma.sql`("entryDateTime", id) < (${input.position.entryDateTime}, ${input.position.id})` : Prisma.sql`TRUE`}
        ORDER BY "entryDateTime" DESC, id DESC LIMIT ${input.limit + 1}
      )
      SELECT page.*, CASE WHEN page."sourceType" = 'diary' THEN d."authorType"
        WHEN lower(trim(o.ruolo)) IN ('medico','infermiere','oss','fisioterapista','operatore','altro') THEN lower(trim(o.ruolo)) ELSE 'operatore' END AS "authorType",
        CASE WHEN page."sourceType" = 'diary' THEN d."authorName" ELSE COALESCE(NULLIF(trim(u."fullName"),''), NULLIF(trim(c."creatoDA"),''), 'Operatore non disponibile') END AS "authorName",
        CASE WHEN page."sourceType" = 'diary' THEN d."authorId" ELSE c."creatoDaId" END AS "authorId",
        CASE WHEN page."sourceType" = 'diary' THEN d.title ELSE 'Consegna · ' || c.tipo END AS title,
        CASE WHEN page."sourceType" = 'diary' THEN d.content ELSE c.note END AS content,
        CASE WHEN page."sourceType" = 'diary' THEN d.priority WHEN c.priorita = 'alta' THEN 'importante' ELSE c.priorita END AS priority,
        CASE WHEN page."sourceType" = 'diary' THEN d.status WHEN c.stato = 'completata' THEN 'completata' ELSE 'aperta' END AS status,
        CASE WHEN page."sourceType" = 'diary' THEN d.category ELSE 'Consegna' END AS category
      FROM page LEFT JOIN "PatientDiaryEntry" d ON page."sourceType" = 'diary' AND d.id = page."sourceId"
      LEFT JOIN "Consegna" c ON page."sourceType" = 'consegna' AND c.id = page."sourceId"
      LEFT JOIN "Operator" o ON o.id = c."creatoDaId" LEFT JOIN "User" u ON u.id = o."userId"
      ORDER BY page."entryDateTime" DESC, page.id DESC
    `);
      const page = rows.slice(0, input.limit),
        ids = [...new Set(page.map((row) => row.patientId))];
      const [identities, fields, patientCounts] = await Promise.all([
        loadOperationalIdentities(ids, patientScopeWhere(actor), undefined, tx),
        loadDiaryAckFields(page, actor, tx),
        loadUnreadPatientCounts(ids, actor, tx),
      ]);
      const entries = page.map(({ authorId: _authorId, ...row }) => ({
        ...row,
        identity: identities.get(row.patientId) ?? null,
        ...fields.get(row.id)!,
      }));
      const last = entries.at(-1),
        hasMore = rows.length > input.limit;
      return {
        entries,
        hasMore,
        nextCursor:
          hasMore && last
            ? encodeDiaryPageCursor(
                { id: last.id, entryDateTime: last.entryDateTime },
                input.filters,
              )
            : null,
        totalUnread: exactCount(counts[0].total),
        filteredUnread: exactCount(counts[0].filtered),
        patientCounts,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
