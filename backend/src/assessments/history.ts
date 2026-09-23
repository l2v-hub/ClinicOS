import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { Operator } from '../ai/auth.js';
import { parameterDate } from '../patients/parameter-reading-input.js';
import { AssessmentError, type AssessmentHistoryItem } from './types.js';
import { assessmentId, parseInstant } from './input.js';
import {
  ASSESSMENT_INCLUDE,
  assessmentDto,
  assessmentTransaction,
  assessmentWhere,
  lockPatient,
} from './access.js';

export async function listAssessments(
  patientId: string,
  query: Record<string, unknown>,
  actor: Operator,
) {
  const invalid = () =>
    new AssessmentError(
      'Ricerca o pagina dello storico non valida',
      400,
      'assessment_invalid_cursor',
    );
  if (
    Object.keys(query).some(
      (key) => !['type', 'status', 'limit', 'cursor', 'from', 'to'].includes(key),
    )
  )
    throw invalid();
  const type = query.type ?? 'painad',
    status = query.status ?? 'all';
  if (type !== 'painad' || !['all', 'draft', 'final'].includes(status as string)) throw invalid();
  if (
    query.limit !== undefined &&
    (typeof query.limit !== 'string' || !/^\d{1,3}$/.test(query.limit))
  )
    throw invalid();
  const limit = Number(query.limit ?? 25);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw invalid();
  let from: string | undefined, to: string | undefined;
  try {
    from = query.from === undefined ? undefined : parameterDate(query.from);
    to = query.to === undefined ? undefined : parameterDate(query.to);
  } catch {
    throw invalid();
  }
  if (from && to && from > to) throw invalid();
  const binding = {
    patientId,
    actorId: actor.id,
    role: actor.role.toLowerCase(),
    type,
    status,
    from: from ?? null,
    to: to ?? null,
  };
  let position: { id: string; createdAt: string } | undefined;
  if (query.cursor !== undefined) {
    try {
      if (
        typeof query.cursor !== 'string' ||
        query.cursor.length > 1024 ||
        !/^[\w-]+$/.test(query.cursor)
      )
        throw invalid();
      const raw = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8'));
      if (raw.v !== 1 || JSON.stringify(raw.binding) !== JSON.stringify(binding)) throw invalid();
      position = { id: assessmentId(raw.id), createdAt: parseInstant(raw.createdAt) };
    } catch {
      throw invalid();
    }
  }
  return assessmentTransaction(
    async (tx) => {
      await lockPatient(tx, patientId, actor);
      const predicates = [
        Prisma.sql`a."patientId" = ${patientId} AND a.type = 'painad'`,
        Prisma.sql`(a.status = 'final' OR a."authorOperatorId" = ${actor.id})`,
      ];
      if (status !== 'all') predicates.push(Prisma.sql`a.status = ${status}`);
      if (from)
        predicates.push(
          Prisma.sql`a."assessedAt" >= (${from}::date::timestamp AT TIME ZONE 'Europe/Rome')`,
        );
      if (to)
        predicates.push(
          Prisma.sql`a."assessedAt" < ((${to}::date + 1)::timestamp AT TIME ZONE 'Europe/Rome')`,
        );
      if (position) {
        const anchor = await tx.$queryRaw<
          Array<{ id: string }>
        >(Prisma.sql`SELECT a.id FROM "PatientAssessment" a
        WHERE ${Prisma.join(predicates, ' AND ')} AND a.id = ${position.id} AND a."createdAt" = ${position.createdAt}::timestamptz LIMIT 1`);
        if (!anchor.length) throw invalid();
        predicates.push(
          Prisma.sql`(a."createdAt",a.id) < (${position.createdAt}::timestamptz,${position.id})`,
        );
      }
      const ids = await tx.$queryRaw<
        Array<{ id: string }>
      >(Prisma.sql`SELECT a.id FROM "PatientAssessment" a
      WHERE ${Prisma.join(predicates, ' AND ')} ORDER BY a."createdAt" DESC,a.id DESC LIMIT ${limit + 1}`);
      const hasMore = ids.length > limit;
      const rows = await tx.patientAssessment.findMany({
        where: {
          ...assessmentWhere(patientId, actor),
          id: { in: ids.slice(0, limit).map((row) => row.id) },
        },
        omit: { finalSnapshot: true },
        include: ASSESSMENT_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
      const items: AssessmentHistoryItem[] = rows.map((row) => {
        const {
          answers: _answers,
          finalSnapshot: _snapshot,
          ...item
        } = assessmentDto({ ...row, finalSnapshot: null });
        return item;
      });
      const last = items.at(-1);
      return {
        items,
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
