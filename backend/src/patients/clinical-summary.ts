import { Prisma } from '@prisma/client';

export const MAX_CLINICAL_SUMMARY_PATIENTS = 100;
const MAX_ADMISSION_STATUS_LENGTH = 64;

export interface PatientClinicalSummaryProjection {
  patientId: string;
  statoRicovero: string | null;
  hasCriticalVitals: boolean;
  hasHighRisk: boolean;
  allergieCount: number;
  hasSevereAllergy: boolean;
  terapieTotali: number;
  terapieCompletate: number;
}

export interface PatientClinicalSummary extends PatientClinicalSummaryProjection {
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
      ) AS "terapieCompletate"
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
      consegneAperte: consegneCounts.get(patientId) ?? 0,
    };
  });
}
