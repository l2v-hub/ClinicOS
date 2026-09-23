import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { parseIsoCalendarDate } from '../appointments/list-query.js';
import { facilityToday } from './parameter-reading-input.js';

export interface PatientLocationDto {
  status: 'assigned' | 'unassigned' | 'unavailable';
  source: 'assignment' | 'cartella' | null;
  room: string | null;
  bed: string | null;
  asOf: string;
}

export interface PatientIdentityDto {
  id: string;
  firstName: string;
  lastName: string;
  codiceFiscale: string | null;
  dateOfBirth: string | null;
  location: PatientLocationDto;
}

export interface OperationalPatientAccess {
  patientIds?: readonly string[] | null;
  registeredById?: string;
}

// CASE guards numeric casts; persisted assignment dates are strings, including
// legacy data that may contain impossible calendar days or malformed values.
function validAssignmentDate(value: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`CASE WHEN ${value} ~ '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
    THEN substring(${value}, 1, 4)::int > 0 AND substring(${value}, 9, 2)::int <=
      CASE substring(${value}, 6, 2)::int
        WHEN 2 THEN CASE WHEN substring(${value}, 1, 4)::int % 400 = 0
          OR (substring(${value}, 1, 4)::int % 4 = 0 AND substring(${value}, 1, 4)::int % 100 <> 0)
          THEN 29 ELSE 28 END
        WHEN 4 THEN 30 WHEN 6 THEN 30 WHEN 9 THEN 30 WHEN 11 THEN 30 ELSE 31 END
    ELSE FALSE END`;
}

/** One SQL row per patient. Internal aliases p/location are fixed, never user input. */
export function patientLocationJoin(asOf: string, today = facilityToday()): Prisma.Sql {
  parseIsoCalendarDate(asOf, 'Data');
  parseIsoCalendarDate(today, 'Data');
  return Prisma.sql`LEFT JOIN LATERAL (
    SELECT jsonb_build_object(
      'status', resolved.status, 'source', resolved.source, 'asOf', ${asOf}::text,
      'room', CASE WHEN resolved.status = 'assigned' THEN resolved.room ELSE NULL END,
      'bed', CASE WHEN resolved.status = 'assigned' THEN resolved.bed ELSE NULL END
    ) AS location
    FROM (
      SELECT count(*)::int AS history_count,
        coalesce(bool_or(NOT dates.valid), false) AS invalid_dates,
        count(DISTINCT (a."roomId", a."bedId")) FILTER (WHERE active.value)::int AS active_count,
        coalesce(bool_or(active.value AND (b.id IS NULL OR r.id IS NULL
          OR a."roomId" <> b."roomId" OR nullif(btrim(r.numero), '') IS NULL
          OR nullif(btrim(b.label), '') IS NULL)), false) AS invalid_active,
        min(nullif(btrim(r.numero), '')) FILTER (WHERE active.value) AS room,
        min(nullif(btrim(b.label), '')) FILTER (WHERE active.value) AS bed
      FROM "PatientRoomAssignment" a
      LEFT JOIN "Bed" b ON b.id = a."bedId"
      LEFT JOIN "Room" r ON r.id = b."roomId"
      CROSS JOIN LATERAL (SELECT (
        ${validAssignmentDate(Prisma.sql`a."startDate"`)}
        AND (a."endDate" IS NULL OR (${validAssignmentDate(Prisma.sql`a."endDate"`)}
          AND a."endDate" >= a."startDate"))
      ) AS valid) dates
      CROSS JOIN LATERAL (SELECT dates.valid AND a."startDate" <= ${asOf}
        AND (a."endDate" IS NULL OR a."endDate" >= ${asOf}) AS value) active
      WHERE a."patientId" = p.id
    ) assignments
    LEFT JOIN "Cartella" legacy ON legacy."patientId" = p.id
      AND assignments.history_count = 0 AND ${asOf === today}
    CROSS JOIN LATERAL (SELECT
      nullif(btrim(CASE WHEN jsonb_typeof(legacy.data->'cameraNumero') = 'string'
        THEN legacy.data->>'cameraNumero' END), '') AS room,
      nullif(btrim(CASE WHEN jsonb_typeof(legacy.data->'lettoNumero') = 'string'
        THEN legacy.data->>'lettoNumero' END), '') AS bed,
      coalesce(jsonb_typeof(legacy.data->'cameraNumero') NOT IN ('string', 'null'), false)
        OR coalesce(jsonb_typeof(legacy.data->'lettoNumero') NOT IN ('string', 'null'), false)
        AS invalid
    ) scalars
    CROSS JOIN LATERAL (SELECT
      CASE
        WHEN assignments.invalid_dates OR assignments.invalid_active OR assignments.active_count > 1
          THEN 'unavailable'
        WHEN assignments.active_count = 1 THEN 'assigned'
        WHEN assignments.history_count > 0 THEN 'unassigned'
        WHEN NOT ${asOf === today} OR scalars.invalid THEN 'unavailable'
        WHEN scalars.room IS NOT NULL OR scalars.bed IS NOT NULL THEN 'assigned'
        ELSE 'unassigned' END AS status,
      CASE WHEN assignments.history_count > 0 THEN 'assignment'
        WHEN scalars.invalid OR scalars.room IS NOT NULL OR scalars.bed IS NOT NULL THEN 'cartella'
        ELSE NULL END AS source,
      CASE WHEN assignments.history_count > 0 THEN assignments.room ELSE scalars.room END AS room,
      CASE WHEN assignments.history_count > 0 THEN assignments.bed ELSE scalars.bed END AS bed
    ) resolved
  ) location ON true`;
}

/** IDs are page-bounded by the caller; scope is reapplied before identity/location access. */
export async function loadOperationalIdentities(
  patientIds: readonly string[],
  access: OperationalPatientAccess,
  asOf?: string,
): Promise<Map<string, PatientIdentityDto>> {
  const today = facilityToday();
  const day = parseIsoCalendarDate(asOf ?? today, 'Data');
  const ids = [...new Set(patientIds)];
  if (!ids.length || access.patientIds?.length === 0) return new Map();
  const predicates = [Prisma.sql`p.id IN (${Prisma.join(ids)})`];
  if (access.patientIds)
    predicates.push(Prisma.sql`p.id IN (${Prisma.join([...access.patientIds])})`);
  if (access.registeredById)
    predicates.push(Prisma.sql`p."registeredById" = ${access.registeredById}`);
  const rows = await prisma.$queryRaw<PatientIdentityDto[]>(Prisma.sql`
    SELECT p.id, p."firstName", p."lastName", p."codiceFiscale",
      to_char(p."dateOfBirth", 'YYYY-MM-DD') AS "dateOfBirth", location.location
    FROM "Patient" p
    ${patientLocationJoin(day, today)}
    WHERE ${Prisma.join(predicates, ' AND ')}
    LIMIT ${ids.length}
  `);
  return new Map(rows.map((row) => [row.id, row]));
}
