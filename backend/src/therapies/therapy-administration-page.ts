import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export interface TherapyAdministrationCandidate {
  therapyId: string;
  patientId: string;
  drugName: string;
  fasce: string[];
}

export interface TherapyAdministrationPageRow {
  id: string;
  therapyId: string | null;
  patientId: string;
  farmacoNome: string;
  fascia: string;
  stato: string;
  confirmedAt: Date | null;
  operatoreNome: string | null;
  motivo: string | null;
}

export function legacyAdministrationKey(patientId: string, drugName: string, fascia: string) {
  return JSON.stringify([patientId, drugName, fascia]);
}

/** Load only administrations that can match this exact therapy page. */
export async function findTherapyPageAdministrations(
  date: string,
  candidates: TherapyAdministrationCandidate[],
): Promise<TherapyAdministrationPageRow[]> {
  const dueCandidates = candidates.filter((candidate) => candidate.fasce.length > 0);
  if (dueCandidates.length === 0) return [];
  const modernCandidates = dueCandidates.flatMap((candidate) =>
    candidate.fasce.map((fascia) => ({ therapyId: candidate.therapyId, fascia })),
  );
  const legacyCandidates = [
    ...new Map(
      dueCandidates.flatMap((candidate) =>
        candidate.fasce.map((fascia) => {
          const value = { patientId: candidate.patientId, drugName: candidate.drugName, fascia };
          return [
            legacyAdministrationKey(value.patientId, value.drugName, value.fascia),
            value,
          ] as const;
        }),
      ),
    ).values(),
  ];

  const [modernRows, legacyRows] = await Promise.all([
    prisma.$queryRaw<TherapyAdministrationPageRow[]>(Prisma.sql`
      WITH candidate("therapyId", fascia) AS (
        VALUES ${Prisma.join(
          modernCandidates.map(
            (candidate) => Prisma.sql`(${candidate.therapyId}, ${candidate.fascia})`,
          ),
        )}
      )
      SELECT
        ma.id,
        ma."therapyId",
        ma."patientId",
        ma."farmacoNome",
        ma.fascia,
        ma.stato,
        ma."confirmedAt",
        ma."operatoreNome",
        ma.motivo
      FROM candidate
      JOIN "MedicationAdministration" ma
        ON ma."therapyId" = candidate."therapyId"
        AND ma.fascia = candidate.fascia
        AND ma.date = ${date}
      ORDER BY ma.id ASC
    `),
    legacyCandidates.length === 0
      ? Promise.resolve([] as TherapyAdministrationPageRow[])
      : prisma.$queryRaw<TherapyAdministrationPageRow[]>(Prisma.sql`
          WITH candidate("patientId", "farmacoNome", fascia) AS (
            VALUES ${Prisma.join(
              legacyCandidates.map(
                (candidate) =>
                  Prisma.sql`(${candidate.patientId}, ${candidate.drugName}, ${candidate.fascia})`,
              ),
            )}
          )
          SELECT DISTINCT ON (ma."patientId", ma."farmacoNome", ma.fascia)
            ma.id,
            ma."therapyId",
            ma."patientId",
            ma."farmacoNome",
            ma.fascia,
            ma.stato,
            ma."confirmedAt",
            ma."operatoreNome",
            ma.motivo
          FROM candidate
          JOIN "MedicationAdministration" ma
            ON ma."patientId" = candidate."patientId"
            AND ma."farmacoNome" = candidate."farmacoNome"
            AND ma.fascia = candidate.fascia
            AND ma.date = ${date}
            AND ma."therapyId" IS NULL
          ORDER BY ma."patientId", ma."farmacoNome", ma.fascia, ma.id DESC
        `),
  ]);
  return [...modernRows, ...legacyRows];
}
