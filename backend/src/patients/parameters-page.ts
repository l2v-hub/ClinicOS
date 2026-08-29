import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { prisma } from '../lib/prisma.js';
import { patientScopeWhere } from './patient-scope.js';
import {
  PatientPageInputError,
  decodePatientPageCursor,
  encodePatientPageCursor,
  parsePatientPageQuery,
} from './pagination.js';

const MAX_PARAMETERS_PAGE = 25;
const ACCENTED_LATIN = 'àáâäãåèéêëìíîïòóôöõùúûüç';
const PLAIN_LATIN = 'aaaaaaeeeeiiiiooooouuuuc';

interface ParameterPageRow {
  id: string;
  medicalRecordNumber: string;
  firstName: string;
  lastName: string;
  parametriMensili: unknown;
  cameraNumero: string | null;
  lettoNumero: string | null;
}

export interface PatientParametersPage {
  items: Array<{
    patient: Omit<ParameterPageRow, 'parametriMensili' | 'cameraNumero' | 'lettoNumero'>;
    cartella: {
      pazienteId: string;
      parametriMensili: unknown[];
      cameraNumero?: string;
      lettoNumero?: string;
    };
  }>;
  hasMore: boolean;
  nextCursor: string | null;
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
  const { month, year } = period(query);
  const limit = Math.min(input.limit, MAX_PARAMETERS_PAGE);
  const filters = { q: input.q, sex: input.sex };
  const position = input.cursor ? decodePatientPageCursor(input.cursor, filters) : undefined;
  const predicates: Prisma.Sql[] = [];

  const scope = patientScopeWhere(actor);
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
        ${normalizedSql(Prisma.sql`COALESCE(c."data"->>'cameraNumero', '')`)} LIKE ${pattern} ESCAPE '\\' OR
        ${normalizedSql(Prisma.sql`COALESCE(c."data"->>'lettoNumero', '')`)} LIKE ${pattern} ESCAPE '\\'
      )`);
    }
  }
  if (position) {
    predicates.push(Prisma.sql`(
      p."lastName" > ${position.lastName} OR
      (p."lastName" = ${position.lastName} AND p."firstName" > ${position.firstName}) OR
      (p."lastName" = ${position.lastName} AND p."firstName" = ${position.firstName} AND p."id" > ${position.id})
    )`);
  }

  const whereSql = predicates.length
    ? Prisma.sql`WHERE ${Prisma.join(predicates, ' AND ')}`
    : Prisma.empty;
  const rows = await prisma.$queryRaw<ParameterPageRow[]>(Prisma.sql`
    SELECT
      p."id",
      p."medicalRecordNumber",
      p."firstName",
      p."lastName",
      COALESCE((
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
      ), '[]'::jsonb) AS "parametriMensili",
      c."data"->>'cameraNumero' AS "cameraNumero",
      c."data"->>'lettoNumero' AS "lettoNumero"
    FROM "Patient" p
    LEFT JOIN "Cartella" c ON c."patientId" = p."id"
    ${whereSql}
    ORDER BY p."lastName" ASC, p."firstName" ASC, p."id" ASC
    LIMIT ${limit + 1}
  `);

  const hasMore = rows.length > limit;
  const visible = hasMore ? rows.slice(0, limit) : rows;
  const last = visible.at(-1);
  return {
    items: visible.map(({ parametriMensili, cameraNumero, lettoNumero, ...patient }) => ({
      patient,
      cartella: {
        pazienteId: patient.id,
        parametriMensili: Array.isArray(parametriMensili) ? parametriMensili : [],
        ...(cameraNumero && { cameraNumero }),
        ...(lettoNumero && { lettoNumero }),
      },
    })),
    hasMore,
    nextCursor:
      hasMore && last
        ? encodePatientPageCursor(
            { lastName: last.lastName, firstName: last.firstName, id: last.id },
            filters,
          )
        : null,
  };
}
