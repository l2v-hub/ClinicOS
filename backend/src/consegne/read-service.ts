import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { prisma } from '../lib/prisma.js';
import { patientScopeWhere } from '../patients/patient-scope.js';
import {
  loadOperationalIdentities,
  type PatientIdentityDto,
} from '../patients/operational-identity.js';
import { buildConsegnaTsQuery, encodeConsegnaCursor, type ConsegnaFeedQuery } from './query.js';
import { consegnaUrgencyActiveSql, consegnaUrgencyTakenSql } from '../lib/urgency.js';
import { withConsegnaUrgency } from './ack-service.js';
import { readsAllConsegne } from './visibility.js';

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
  identity: PatientIdentityDto | null;
}

/**
 * UX2 W8: a handover is a note (normal / urgent). The summary counts urgencies only: «da prendere
 * in carico» (active: no «Ho capito» by a non-author yet) and «prese in carico». The legacy
 * aperta / in corso / completata counts are gone from every reader-facing summary.
 */
export interface ConsegnaSummary {
  total: number;
  urgentActive: number;
  urgentTaken: number;
}

function privileged(actor: Operator): boolean {
  return PRIVILEGED_ROLES.has(actor.role.toLowerCase());
}

function visibilitySql(actor: Operator): Prisma.Sql {
  return readsAllConsegne(actor)
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
      input.urgency === 'active'
        ? consegnaUrgencyActiveSql
        : input.urgency === 'taken'
          ? consegnaUrgencyTakenSql
          : Prisma.sql`TRUE`,
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
  if (readsAllConsegne(actor)) {
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
      COUNT(*) FILTER (WHERE ${consegnaUrgencyActiveSql})::int AS "urgentActive",
      COUNT(*) FILTER (WHERE ${consegnaUrgencyTakenSql})::int AS "urgentTaken"
    FROM "Consegna" c
    WHERE ${visibilitySql(actor)} AND ${filterSql(input, false)}
  `);
  return rows[0] ?? { total: 0, urgentActive: 0, urgentTaken: 0 };
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
    ...(input.urgency ? { urgency: input.urgency } : {}),
    ...(input.patientId ? { patientId: input.patientId } : {}),
    ...(input.q ? { q: input.q } : {}),
  };
  const identities = await loadOperationalIdentities(
    items.map((row) => row.pazienteId),
    patientScopeWhere(actor),
  );
  const withUrgency = await withConsegnaUrgency(items, actor);
  return {
    items: withUrgency.map((row) => ({ ...row, identity: identities.get(row.pazienteId) ?? null })),
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
  const [summary, urgentRows, recentRows, byOperatorRows] = await Promise.all([
    exactSummary(actor, emptyInput),
    // Active urgencies only: once a non-author said «Ho capito» the handover leaves this list.
    prisma.$queryRaw<ConsegnaListRow[]>(Prisma.sql`
      SELECT ${COLUMNS}
      FROM "Consegna" c
      WHERE ${visibilitySql(actor)} AND ${consegnaUrgencyActiveSql}
      ORDER BY c."createdAt" DESC, c."id" DESC
      LIMIT 5
    `),
    prisma.$queryRaw<ConsegnaListRow[]>(Prisma.sql`
      SELECT ${COLUMNS}
      FROM "Consegna" c
      WHERE ${visibilitySql(actor)}
      ORDER BY c."createdAt" DESC, c."id" DESC
      LIMIT 5
    `),
    privileged(actor)
      ? prisma.$queryRaw<Array<{ operatorId: string; urgentActive: number }>>(Prisma.sql`
          SELECT c."operatoreAssegnatoId" AS "operatorId", COUNT(*)::int AS "urgentActive"
          FROM "Consegna" c
          WHERE c."operatoreAssegnatoId" IS NOT NULL AND ${consegnaUrgencyActiveSql}
          GROUP BY c."operatoreAssegnatoId"
        `)
      : Promise.resolve([]),
  ]);
  const [urgentPreview, recentPreview] = await Promise.all([
    withConsegnaUrgency(urgentRows, actor),
    withConsegnaUrgency(recentRows, actor),
  ]);
  const identities = await loadOperationalIdentities(
    [...urgentPreview, ...recentPreview].map((row) => row.pazienteId),
    patientScopeWhere(actor),
  );
  const enrich = <T extends ConsegnaListRow>(row: T) => ({
    ...row,
    identity: identities.get(row.pazienteId) ?? null,
  });
  return {
    scope: privileged(actor) ? 'facility' : 'operator',
    summary,
    urgentPreview: urgentPreview.map(enrich),
    recentPreview: recentPreview.map(enrich),
    /** Active urgencies per assignee (privileged readers only). */
    byOperator: Object.fromEntries(byOperatorRows.map((row) => [row.operatorId, row.urgentActive])),
  };
}

/** UX2 W8: per patient, the handovers whose urgency still waits for a «Ho capito». */
export async function loadPatientConsegnaCounts(patientIds: string[]) {
  if (!patientIds.length) return new Map<string, number>();
  const rows = await prisma.$queryRaw<Array<{ pazienteId: string; count: number }>>(Prisma.sql`
    SELECT c."pazienteId", COUNT(*)::int AS "count"
    FROM "Consegna" c
    WHERE c."pazienteId" IN (${Prisma.join(patientIds)}) AND ${consegnaUrgencyActiveSql}
    GROUP BY c."pazienteId"
  `);
  return new Map(rows.map((row) => [row.pazienteId, row.count]));
}
