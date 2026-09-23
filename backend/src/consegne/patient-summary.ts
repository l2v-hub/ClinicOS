import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { prisma } from '../lib/prisma.js';
import { patientScopeWhere, hasGlobalPatientScope } from '../patients/patient-scope.js';
import { ConsegnaInputError, isSafeConsegnaId } from './query.js';

export interface ConsegnaPatientSummary {
  patientId: string;
  total: number;
  open: number;
  urgentOpen: number;
  statoRicovero: string | null;
}

export function parseConsegnaSummaryIds(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ConsegnaInputError('Richiesta riepilogo non valida');
  const body = value as Record<string, unknown>;
  const ids = body.patientIds;
  if (
    Object.keys(body).some((key) => key !== 'patientIds') ||
    !Array.isArray(ids) ||
    !ids.length ||
    ids.length > 50 ||
    ids.some((id) => typeof id !== 'string' || !isSafeConsegnaId(id))
  )
    throw new ConsegnaInputError('patientIds deve contenere da 1 a 50 identificativi validi');
  return [...new Set(ids)] as string[];
}

/** One bounded statement: patient ownership AND author/assignee visibility, preserving zeros. */
export async function loadConsegnaPatientSummary(value: unknown, actor: Operator) {
  const ids = parseConsegnaSummaryIds(value);
  const scope = patientScopeWhere(actor);
  const items = await prisma.$queryRaw<ConsegnaPatientSummary[]>(Prisma.sql`
    SELECT p.id AS "patientId", counts.total, counts.open, counts."urgentOpen",
      CASE WHEN jsonb_typeof(chart.data->'statoRicovero') = 'string'
        THEN LEFT(chart.data->>'statoRicovero', 64) ELSE NULL END AS "statoRicovero"
    FROM "Patient" p LEFT JOIN "Cartella" chart ON chart."patientId" = p.id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE c.stato <> 'completata')::int AS open,
        COUNT(*) FILTER (WHERE c.stato <> 'completata' AND c.priorita = 'urgente')::int AS "urgentOpen"
      FROM "Consegna" c WHERE c."pazienteId" = p.id
        AND ${hasGlobalPatientScope(actor.role) ? Prisma.sql`TRUE` : Prisma.sql`(c."creatoDaId" = ${actor.id} OR c."operatoreAssegnatoId" = ${actor.id})`}
    ) counts ON true
    WHERE p.id IN (${Prisma.join(ids)})
      ${scope.registeredById ? Prisma.sql`AND p."registeredById" = ${scope.registeredById}` : Prisma.empty}
    ORDER BY p.id COLLATE "C" LIMIT ${ids.length}
  `);
  return { items };
}
