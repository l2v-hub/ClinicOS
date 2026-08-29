import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { prisma } from '../lib/prisma.js';
import { buildConsegnaTsQuery, encodeConsegnaCursor, type ConsegnaFeedQuery } from './query.js';

const PRIVILEGED_ROLES = new Set(['admin', 'manager']);

const COLUMNS = Prisma.raw(`
  c."id", c."pazienteId", c."pazienteNome", c."priorita", c."stato", c."tipo",
  c."note", c."scadenza", c."oraScadenza", c."operatoreAssegnato",
  c."operatoreAssegnatoId", c."creatoDA", c."creatoDaId", c."createdAt", c."updatedAt"`);

export interface ConsegnaListRow {
  id: string;
  pazienteId: string;
  pazienteNome: string;
  priorita: string;
  stato: string;
  tipo: string;
  note: string;
  scadenza: string;
  oraScadenza: string | null;
  operatoreAssegnato: string;
  operatoreAssegnatoId: string | null;
  creatoDA: string;
  creatoDaId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsegnaSummary {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  urgentOpen: number;
}

function privileged(actor: Operator): boolean {
  return PRIVILEGED_ROLES.has(actor.role.toLowerCase());
}

function visibilitySql(actor: Operator): Prisma.Sql {
  return privileged(actor)
    ? Prisma.sql`TRUE`
    : Prisma.sql`(c."creatoDaId" = ${actor.id} OR c."operatoreAssegnatoId" = ${actor.id})`;
}

function searchSql(q?: string): Prisma.Sql {
  return q
    ? Prisma.sql`to_tsvector(
        'simple'::regconfig,
        coalesce(c."pazienteNome", '') || ' ' || coalesce(c."note", '') || ' ' ||
        coalesce(c."tipo", '') || ' ' || coalesce(c."operatoreAssegnato", '')
      ) @@ to_tsquery('simple'::regconfig, ${buildConsegnaTsQuery(q)})`
    : Prisma.sql`TRUE`;
}

function filterSql(input: ConsegnaFeedQuery, includeFeedFilters: boolean): Prisma.Sql {
  const filters: Prisma.Sql[] = [
    input.patientId ? Prisma.sql`c."pazienteId" = ${input.patientId}` : Prisma.sql`TRUE`,
    searchSql(input.q),
  ];
  if (includeFeedFilters) {
    filters.push(
      input.status === 'attive'
        ? Prisma.sql`c."stato" <> 'completata'`
        : input.status
          ? Prisma.sql`c."stato" = ${input.status}`
          : Prisma.sql`TRUE`,
      input.priority ? Prisma.sql`c."priorita" = ${input.priority}` : Prisma.sql`TRUE`,
      input.cursor
        ? Prisma.sql`(c."createdAt" < ${input.cursor.createdAt} OR
            (c."createdAt" = ${input.cursor.createdAt} AND c."id" < ${input.cursor.id}))`
        : Prisma.sql`TRUE`,
    );
  }
  return Prisma.join(filters, ' AND ');
}

function boundedFeedSql(actor: Operator, input: ConsegnaFeedQuery, take: number): Prisma.Sql {
  const filters = filterSql(input, true);
  if (privileged(actor)) {
    return Prisma.sql`
      SELECT ${COLUMNS}
      FROM "Consegna" c
      WHERE ${filters}
      ORDER BY c."createdAt" DESC, c."id" DESC
      LIMIT ${take}`;
  }
  const creator = Prisma.sql`
    SELECT ${COLUMNS}
    FROM "Consegna" c
    WHERE c."creatoDaId" = ${actor.id} AND ${filters}
    ORDER BY c."createdAt" DESC, c."id" DESC
    LIMIT ${take}`;
  const assignee = Prisma.sql`
    SELECT ${COLUMNS}
    FROM "Consegna" c
    WHERE c."operatoreAssegnatoId" = ${actor.id}
      AND (c."creatoDaId" IS NULL OR c."creatoDaId" <> ${actor.id})
      AND ${filters}
    ORDER BY c."createdAt" DESC, c."id" DESC
    LIMIT ${take}`;
  return Prisma.sql`
    SELECT * FROM ((${creator}) UNION ALL (${assignee})) scoped
    ORDER BY scoped."createdAt" DESC, scoped."id" DESC
    LIMIT ${take}`;
}

async function exactSummary(actor: Operator, input: ConsegnaFeedQuery): Promise<ConsegnaSummary> {
  const rows = await prisma.$queryRaw<ConsegnaSummary[]>(Prisma.sql`
    SELECT
      COUNT(*)::int AS "total",
      COUNT(*) FILTER (WHERE c."stato" <> 'completata')::int AS "open",
      COUNT(*) FILTER (WHERE c."stato" = 'in_corso')::int AS "inProgress",
      COUNT(*) FILTER (WHERE c."stato" = 'completata')::int AS "completed",
      COUNT(*) FILTER (
        WHERE c."stato" <> 'completata' AND c."priorita" = 'urgente'
      )::int AS "urgentOpen"
    FROM "Consegna" c
    WHERE ${visibilitySql(actor)} AND ${filterSql(input, false)}
  `);
  return rows[0] ?? { total: 0, open: 0, inProgress: 0, completed: 0, urgentOpen: 0 };
}

export async function loadConsegnaFeed(actor: Operator, input: ConsegnaFeedQuery) {
  const [rows, summary] = await Promise.all([
    prisma.$queryRaw<ConsegnaListRow[]>(boundedFeedSql(actor, input, input.limit + 1)),
    exactSummary(actor, input),
  ]);
  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  const last = items.at(-1);
  const cursorFilters = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.priority ? { priority: input.priority } : {}),
    ...(input.patientId ? { patientId: input.patientId } : {}),
    ...(input.q ? { q: input.q } : {}),
  };
  return {
    items,
    pageInfo: {
      hasMore,
      nextCursor:
        hasMore && last
          ? encodeConsegnaCursor({ createdAt: last.createdAt, id: last.id }, cursorFilters)
          : null,
    },
    summary,
  };
}

export async function loadConsegnaOverview(actor: Operator) {
  const emptyInput: ConsegnaFeedQuery = { limit: 5 };
  const [summary, urgentPreview, openPreview, byOperatorRows] = await Promise.all([
    exactSummary(actor, emptyInput),
    prisma.$queryRaw<ConsegnaListRow[]>(Prisma.sql`
      SELECT ${COLUMNS}
      FROM "Consegna" c
      WHERE ${visibilitySql(actor)}
        AND c."stato" <> 'completata'
        AND c."priorita" = 'urgente'
      ORDER BY c."createdAt" DESC, c."id" DESC
      LIMIT 5
    `),
    prisma.$queryRaw<ConsegnaListRow[]>(Prisma.sql`
      SELECT ${COLUMNS}
      FROM "Consegna" c
      WHERE ${visibilitySql(actor)} AND c."stato" <> 'completata'
      ORDER BY c."createdAt" DESC, c."id" DESC
      LIMIT 5
    `),
    privileged(actor)
      ? prisma.$queryRaw<Array<{ operatorId: string; open: number }>>(Prisma.sql`
          SELECT c."operatoreAssegnatoId" AS "operatorId", COUNT(*)::int AS "open"
          FROM "Consegna" c
          WHERE c."operatoreAssegnatoId" IS NOT NULL AND c."stato" <> 'completata'
          GROUP BY c."operatoreAssegnatoId"
        `)
      : Promise.resolve([]),
  ]);
  return {
    scope: privileged(actor) ? 'facility' : 'operator',
    summary,
    urgentPreview,
    openPreview,
    byOperator: Object.fromEntries(byOperatorRows.map((row) => [row.operatorId, row.open])),
  };
}

export async function loadPatientConsegnaCounts(patientIds: string[]) {
  const rows = await prisma.consegna.groupBy({
    by: ['pazienteId'],
    where: { pazienteId: { in: patientIds }, stato: { not: 'completata' } },
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.pazienteId, row._count._all]));
}
