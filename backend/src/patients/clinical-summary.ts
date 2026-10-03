import { Prisma } from '@prisma/client';

export const MAX_CLINICAL_SUMMARY_PATIENTS = 100;
const MAX_ADMISSION_STATUS_LENGTH = 64;

/** UX direct-access (additive): WHICH allergen / critical parameter / risk, so a card can name it
 *  instead of a bare flag. Bounded (max 10 items each, short strings); never the full chart. */
export interface SummaryAllergen {
  allergene: string;
  gravita: string | null;
}
export interface SummaryCriticalParameter {
  etichetta: string;
  valore: string | null;
  unita: string | null;
}
export interface SummaryHighRisk {
  tipo: string;
  livello: string;
  descrizione: string | null;
}
export const MAX_SUMMARY_DETAIL_ITEMS = 10;
const MAX_SUMMARY_DETAIL_TEXT = 80;

export interface PatientClinicalSummaryProjection {
  patientId: string;
  statoRicovero: string | null;
  hasCriticalVitals: boolean;
  hasHighRisk: boolean;
  allergieCount: number;
  hasSevereAllergy: boolean;
  terapieTotali: number;
  terapieCompletate: number;
  allergeni?: SummaryAllergen[];
  parametriCritici?: SummaryCriticalParameter[];
  rischiElevati?: SummaryHighRisk[];
}

export interface PatientClinicalSummary extends PatientClinicalSummaryProjection {
  allergeni: SummaryAllergen[];
  parametriCritici: SummaryCriticalParameter[];
  rischiElevati: SummaryHighRisk[];
  /** UX2 W8: urgent handovers still waiting for a «Ho capito» (name kept for API compatibility). */
  consegneAperte: number;
}

export function buildPatientClinicalSummaryQuery(patientIds: string[]): Prisma.Sql {
  if (patientIds.length === 0 || patientIds.length > MAX_CLINICAL_SUMMARY_PATIENTS) {
    throw new Error('clinical summary patient window must contain between 1 and 100 ids');
  }
  return Prisma.sql`
    SELECT chart."patientId",
      CASE WHEN jsonb_typeof(chart."data"->'statoRicovero') = 'string'
        THEN LEFT(chart."data"->>'statoRicovero', ${MAX_ADMISSION_STATUS_LENGTH})
        ELSE NULL
      END AS "statoRicovero",
      EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(chart."data"->'parametriVitali') = 'array'
            THEN chart."data"->'parametriVitali' ELSE '[]'::jsonb END
        ) vital
        WHERE jsonb_typeof(vital) = 'object' AND vital->>'stato' = 'critico'
      ) AS "hasCriticalVitals",
      EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(chart."data"->'indicatoriRischio') = 'array'
            THEN chart."data"->'indicatoriRischio' ELSE '[]'::jsonb END
        ) risk
        WHERE jsonb_typeof(risk) = 'object' AND risk->>'livello' IN ('alto', 'critico')
      ) AS "hasHighRisk",
      jsonb_array_length(
        CASE WHEN jsonb_typeof(chart."data"->'allergie') = 'array'
          THEN chart."data"->'allergie' ELSE '[]'::jsonb END
      )::int AS "allergieCount",
      EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(chart."data"->'allergie') = 'array'
            THEN chart."data"->'allergie' ELSE '[]'::jsonb END
        ) allergy
        WHERE jsonb_typeof(allergy) = 'object' AND allergy->>'gravita' = 'grave'
      ) AS "hasSevereAllergy",
      jsonb_array_length(
        CASE WHEN jsonb_typeof(chart."data"->'terapie') = 'array'
          THEN chart."data"->'terapie' ELSE '[]'::jsonb END
      )::int AS "terapieTotali",
      (
        SELECT COUNT(*)::int
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(chart."data"->'terapie') = 'array'
            THEN chart."data"->'terapie' ELSE '[]'::jsonb END
        ) therapy
        WHERE jsonb_typeof(therapy) = 'object' AND therapy->>'stato' = 'completata'
      ) AS "terapieCompletate",
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'allergene', LEFT(trim(a.item->>'allergene'), ${MAX_SUMMARY_DETAIL_TEXT}),
          'gravita', LEFT(a.item->>'gravita', 16)) ORDER BY a.ord)
        FROM (
          SELECT allergy AS item, ord
          FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(chart."data"->'allergie') = 'array'
              THEN chart."data"->'allergie' ELSE '[]'::jsonb END
          ) WITH ORDINALITY AS x(allergy, ord)
          WHERE jsonb_typeof(allergy) = 'object'
            AND jsonb_typeof(allergy->'allergene') = 'string'
            AND trim(allergy->>'allergene') <> ''
          ORDER BY ord
          LIMIT ${MAX_SUMMARY_DETAIL_ITEMS}
        ) a
      ), '[]'::jsonb) AS "allergeni",
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'etichetta', LEFT(trim(v.item->>'etichetta'), ${MAX_SUMMARY_DETAIL_TEXT}),
          'valore', LEFT(v.item->>'valore', 32),
          'unita', LEFT(v.item->>'unita', 16)) ORDER BY v.ord)
        FROM (
          SELECT vital AS item, ord
          FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(chart."data"->'parametriVitali') = 'array'
              THEN chart."data"->'parametriVitali' ELSE '[]'::jsonb END
          ) WITH ORDINALITY AS x(vital, ord)
          WHERE jsonb_typeof(vital) = 'object' AND vital->>'stato' = 'critico'
            AND jsonb_typeof(vital->'etichetta') = 'string'
          ORDER BY ord
          LIMIT ${MAX_SUMMARY_DETAIL_ITEMS}
        ) v
      ), '[]'::jsonb) AS "parametriCritici",
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'tipo', LEFT(r.item->>'tipo', 32),
          'livello', r.item->>'livello',
          'descrizione', LEFT(r.item->>'descrizione', ${MAX_SUMMARY_DETAIL_TEXT})) ORDER BY r.ord)
        FROM (
          SELECT risk AS item, ord
          FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(chart."data"->'indicatoriRischio') = 'array'
              THEN chart."data"->'indicatoriRischio' ELSE '[]'::jsonb END
          ) WITH ORDINALITY AS x(risk, ord)
          WHERE jsonb_typeof(risk) = 'object' AND risk->>'livello' IN ('alto', 'critico')
            AND jsonb_typeof(risk->'tipo') = 'string'
          ORDER BY ord
          LIMIT ${MAX_SUMMARY_DETAIL_ITEMS}
        ) r
      ), '[]'::jsonb) AS "rischiElevati"
    FROM "Cartella" chart
    WHERE chart."patientId" IN (${Prisma.join(patientIds)})
  `;
}

export async function loadPatientClinicalSummaryRows(
  patientIds: string[],
): Promise<PatientClinicalSummaryProjection[]> {
  if (patientIds.length === 0) return [];
  const { prisma } = await import('../lib/prisma.js');
  return prisma.$queryRaw<PatientClinicalSummaryProjection[]>(
    buildPatientClinicalSummaryQuery(patientIds),
  );
}

export function assemblePatientClinicalSummaries(
  patientIds: string[],
  projections: PatientClinicalSummaryProjection[],
  consegneCounts: ReadonlyMap<string, number>,
): PatientClinicalSummary[] {
  const byPatient = new Map(projections.map((row) => [row.patientId, row]));
  return patientIds.map((patientId) => {
    const row = byPatient.get(patientId);
    return {
      patientId,
      statoRicovero: row?.statoRicovero ?? null,
      hasCriticalVitals: row?.hasCriticalVitals ?? false,
      hasHighRisk: row?.hasHighRisk ?? false,
      allergieCount: row?.allergieCount ?? 0,
      hasSevereAllergy: row?.hasSevereAllergy ?? false,
      terapieTotali: row?.terapieTotali ?? 0,
      terapieCompletate: row?.terapieCompletate ?? 0,
      allergeni: row?.allergeni ?? [],
      parametriCritici: row?.parametriCritici ?? [],
      rischiElevati: row?.rischiElevati ?? [],
      consegneAperte: consegneCounts.get(patientId) ?? 0,
    };
  });
}
