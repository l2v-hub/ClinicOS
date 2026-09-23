import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { patientScopeWhere } from './patient-scope.js';
import { patientLocationJoin, type PatientLocationDto } from './operational-identity.js';
import { facilityToday, parameterDate, ParameterReadingError } from './parameter-reading-input.js';
import { withRosterSnapshot } from '../roster/snapshot.js';
import { changed, type AppliedRosterOrder } from '../roster/order-contract.js';
import { encodeRosterCursor } from '../roster/cursor.js';
import { rosterOrderSql, rosterAfterSql, type RosterPosition } from '../roster/order-key.js';
import { PatientPageInputError, parsePatientPageQuery } from './pagination.js';

const MAX_PARAMETERS_PAGE = 25;
const ACCENTED_LATIN = 'àáâäãåèéêëìíîïòóôöõùúûüç';
const PLAIN_LATIN = 'aaaaaaeeeeiiiiooooouuuuc';

interface ParameterPageRow {
  id: string;
  medicalRecordNumber: string;
  firstName: string;
  lastName: string;
  codiceFiscale: string | null;
  dateOfBirth: string | null;
  location: PatientLocationDto;
  parametriMensili: unknown;
  cameraNumero: string | null;
  lettoNumero: string | null;
  readingCount: number;
  noteCount: number;
  lastReadingAt: Date | null;
}

export interface PatientParametersPage {
  items: Array<{
    patient: Omit<
      ParameterPageRow,
      | 'parametriMensili'
      | 'cameraNumero'
      | 'lettoNumero'
      | 'readingCount'
      | 'noteCount'
      | 'lastReadingAt'
    >;
    cartella: {
      pazienteId: string;
      parametriMensili: unknown[];
      cameraNumero?: string;
      lettoNumero?: string;
      readingCount: number;
      noteCount: number;
      lastReadingAt: string | null;
    };
  }>;
  hasMore: boolean;
  nextCursor: string | null;
  roster: AppliedRosterOrder;
}

function period(query: Record<string, unknown>): { month: number; year: number } {
  const now = new Date();
  const rawMonth = query.month ?? String(now.getUTCMonth() + 1);
  const rawYear = query.year ?? String(now.getUTCFullYear());
  if (typeof rawMonth !== 'string' || !/^(?:[1-9]|1[0-2])$/.test(rawMonth)) {
    throw new PatientPageInputError('month non valido');
  }
  if (typeof rawYear !== 'string' || !/^20\d{2}$/.test(rawYear)) {
    throw new PatientPageInputError('year non valido');
  }
  return { month: Number(rawMonth), year: Number(rawYear) };
}

function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('it-IT');
}

function normalizedSql(value: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`translate(lower(${value}), ${ACCENTED_LATIN}, ${PLAIN_LATIN})`;
}

export async function loadPatientParametersPage(
  query: Record<string, unknown>,
  actor: Operator,
): Promise<PatientParametersPage> {
  const input = parsePatientPageQuery(query);
  if (query.view !== undefined && query.view !== 'entry')
    throw new PatientPageInputError('view non valido');
  const entryView = query.view === 'entry';
  const { month, year } = period(query);
  let readingDate: string;
  try {
    readingDate = query.date === undefined ? facilityToday() : parameterDate(query.date);
  } catch (error) {
    throw new PatientPageInputError(
      error instanceof ParameterReadingError ? error.message : 'Data non valida',
    );
  }
  const limit = Math.min(input.limit, MAX_PARAMETERS_PAGE);
  const filters = {
    q: input.q,
    sex: input.sex,
    month,
    year,
    view: entryView ? 'entry' : 'history',
  };
  const scope = patientScopeWhere(actor);
  return withRosterSnapshot(
    actor,
    scope,
    'parameters',
    query,
    filters,
    readingDate,
    async (tx, snapshot) => {
      const predicates: Prisma.Sql[] = [];
      const { order } = snapshot.roster;
      const projectLocation = Boolean(input.q) || order.criterion === 'location';
      const locationJoin = projectLocation
        ? patientLocationJoin(readingDate, snapshot.today)
        : Prisma.empty;
      if (scope.registeredById) {
        predicates.push(Prisma.sql`p."registeredById" = ${scope.registeredById}`);
      }

      if (input.sex) predicates.push(Prisma.sql`p."sex" = ${input.sex}`);
      if (input.q) {
        for (const token of input.q
          .split(/[,\s]+/)
          .filter(Boolean)
          .slice(0, 5)) {
          const pattern = likePattern(normalizeSearchText(token));
          predicates.push(Prisma.sql`(
        ${normalizedSql(Prisma.sql`p."firstName"`)} LIKE ${pattern} ESCAPE '\\' OR
        ${normalizedSql(Prisma.sql`p."lastName"`)} LIKE ${pattern} ESCAPE '\\' OR
        ${normalizedSql(Prisma.sql`p."medicalRecordNumber"`)} LIKE ${pattern} ESCAPE '\\' OR
        ${normalizedSql(Prisma.sql`COALESCE(location.location->>'room', '')`)} LIKE ${pattern} ESCAPE '\\' OR
        ${normalizedSql(Prisma.sql`COALESCE(location.location->>'bed', '')`)} LIKE ${pattern} ESCAPE '\\'
      )`);
        }
      }
      if (snapshot.anchor) {
        const [position] = await tx.$queryRaw<RosterPosition[]>(Prisma.sql`
      SELECT p.id AS "patientId", p."firstName", p."lastName",
        ${projectLocation ? Prisma.sql`location.location->>'room'` : Prisma.sql`NULL::text`} AS room,
        ${projectLocation ? Prisma.sql`location.location->>'bed'` : Prisma.sql`NULL::text`} AS bed
      FROM "Patient" p ${locationJoin}
      WHERE p.id = ${snapshot.anchor.patientId}
        ${predicates.length ? Prisma.sql`AND ${Prisma.join(predicates, ' AND ')}` : Prisma.empty}
      LIMIT 1
    `);
        if (!position) throw changed('anchor');
        predicates.push(rosterAfterSql(order, position));
      }

      const whereSql = predicates.length
        ? Prisma.sql`WHERE ${Prisma.join(predicates, ' AND ')}`
        : Prisma.empty;
      // Location must precede the limit for search, but ordinary pages only resolve
      // the selected patients instead of inspecting the whole authorized roster.
      const locationValue = projectLocation
        ? Prisma.sql`selected.location`
        : Prisma.sql`location.location`;
      const rows = await tx.$queryRaw<ParameterPageRow[]>(Prisma.sql`
    WITH page_patients AS MATERIALIZED (
      SELECT p."id" ${projectLocation ? Prisma.sql`, location.location` : Prisma.empty} FROM "Patient" p
      ${locationJoin}
      ${whereSql}
      ORDER BY ${rosterOrderSql(order)}
      LIMIT ${limit + 1}
    )
    SELECT
      p."id",
      p."medicalRecordNumber",
      p."firstName",
      p."lastName",
      p."codiceFiscale",
      to_char(p."dateOfBirth", 'YYYY-MM-DD') AS "dateOfBirth",
      ${locationValue} AS location,
      ${
        entryView
          ? Prisma.sql`'[]'::jsonb`
          : Prisma.sql`COALESCE((
        SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
          'id', month_entry->'id',
          'mese', month_entry->'mese',
          'anno', month_entry->'anno',
          'createdAt', month_entry->'createdAt',
          'giorni', COALESCE((
            SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
              'giorno', day_entry->'giorno',
              'pa', day_entry->'pa',
              'fc', day_entry->'fc',
              'spo2', day_entry->'spo2',
              'temperatura', day_entry->'temperatura',
              'dtx08', day_entry->'dtx08',
              'evacuazione', day_entry->'evacuazione',
              'note', day_entry->'note',
              'firmaIpM', day_entry->'firmaIpM'
            )))
            FROM jsonb_array_elements(
              CASE
                WHEN jsonb_typeof(month_entry->'giorni') = 'array'
                  THEN month_entry->'giorni'
                ELSE '[]'::jsonb
              END
            ) AS day_entry
          ), '[]'::jsonb)
        )))
        FROM jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(c."data"->'parametriMensili') = 'array'
              THEN c."data"->'parametriMensili'
            ELSE '[]'::jsonb
          END
        ) AS month_entry
        WHERE month_entry->>'mese' = ${String(month)}
          AND month_entry->>'anno' = ${String(year)}
      ), '[]'::jsonb)`
      } AS "parametriMensili",
      ${locationValue}->>'room' AS "cameraNumero",
      ${locationValue}->>'bed' AS "lettoNumero",
      daily."readingCount", daily."lastReadingAt", daily."noteCount"
    FROM page_patients selected
    JOIN "Patient" p ON p."id" = selected."id"
    ${projectLocation ? Prisma.empty : patientLocationJoin(readingDate, snapshot.today)}
    LEFT JOIN "Cartella" c ON c."patientId" = p."id"
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS "readingCount",
        max(r."measuredAt") AT TIME ZONE 'UTC' AS "lastReadingAt",
        count(*) FILTER (WHERE jsonb_typeof(r."values"->'note') = 'string'
          AND btrim(r."values"->>'note') <> '')::int AS "noteCount"
      FROM "PatientParameterReading" r WHERE r."patientId" = p."id"
        AND r."measuredAt" >= (${readingDate}::date::timestamp AT TIME ZONE 'Europe/Rome')
        AND r."measuredAt" < ((${readingDate}::date + 1)::timestamp AT TIME ZONE 'Europe/Rome')
    ) daily ON true
    ORDER BY ${rosterOrderSql(order, locationValue)}
  `);

      const hasMore = rows.length > limit;
      const visible = hasMore ? rows.slice(0, limit) : rows;
      const last = visible.at(-1);
      return {
        items: visible.map(
          ({
            parametriMensili,
            cameraNumero,
            lettoNumero,
            readingCount,
            noteCount,
            lastReadingAt,
            ...patient
          }) => ({
            patient,
            cartella: {
              pazienteId: patient.id,
              readingCount,
              noteCount,
              lastReadingAt: lastReadingAt?.toISOString() ?? null,
              parametriMensili: Array.isArray(parametriMensili) ? parametriMensili : [],
              ...(cameraNumero && { cameraNumero }),
              ...(lettoNumero && { lettoNumero }),
            },
          }),
        ),
        hasMore,
        roster: snapshot.roster,
        nextCursor:
          hasMore && last ? encodeRosterCursor(snapshot.binding, { patientId: last.id }) : null,
      };
    },
  );
}
