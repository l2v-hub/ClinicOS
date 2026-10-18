import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { recordedOneTimeOutcomeSql } from './therapy-query.js';

export interface TherapyAdministrationCandidate {
  therapyId: string;
  patientId: string;
  drugName: string;
  fasce: string[];
  singleDayDose?: boolean;
}

export interface TherapyAdministrationPageRow {
  id: string;
  therapyId: string | null;
  patientId: string;
  farmacoNome: string;
  farmacoDose?: string;
  fascia: string;
  ora?: string;
  stato: string;
  confirmedAt: Date | null;
  updatedAt?: Date;
  operatoreNome: string | null;
  motivo: string | null;
}

export function legacyAdministrationKey(
  patientId: string,
  drugName: string,
  fascia: string,
  time?: string,
) {
  return JSON.stringify(
    time === undefined ? [patientId, drugName, fascia] : [patientId, drugName, fascia, time],
  );
}

/** Load only administrations that can match this exact therapy page. */
export async function findTherapyPageAdministrations(
  date: string,
  candidates: TherapyAdministrationCandidate[],
  db: Prisma.TransactionClient = prisma,
): Promise<TherapyAdministrationPageRow[]> {
  const dueCandidates = candidates.filter((candidate) => candidate.fasce.length > 0);
  if (dueCandidates.length === 0) return [];
  const modernCandidates = dueCandidates.flatMap((candidate) =>
    (candidate.singleDayDose ? candidate.fasce.slice(0, 1) : candidate.fasce).map((fascia) => ({
      therapyId: candidate.therapyId,
      patientId: candidate.patientId,
      fascia,
      singleDayDose: candidate.singleDayDose === true,
    })),
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

  const singleDayCandidates = dueCandidates.filter((candidate) => candidate.singleDayDose);
  const [modernRows, legacyRows, dayOutcomes] = await Promise.all([
    db.$queryRaw<TherapyAdministrationPageRow[]>(Prisma.sql`
      WITH candidate("therapyId", "patientId", fascia, "singleDayDose") AS (
        VALUES ${Prisma.join(
          modernCandidates.map(
            (candidate) =>
              Prisma.sql`(${candidate.therapyId}, ${candidate.patientId}, ${candidate.fascia}, ${candidate.singleDayDose}::boolean)`,
          ),
        )}
      )
      SELECT
        ma.id,
        ma."therapyId",
        ma."patientId",
        ma."farmacoNome",
        ma."farmacoDose",
        ma.fascia,
        ma.ora,
        ma.stato,
        ma."confirmedAt",
        ma."updatedAt",
        ma."operatoreNome",
        ma.motivo
      FROM candidate
      JOIN "MedicationAdministration" ma
        ON ma."therapyId" = candidate."therapyId"
        AND ma."patientId" = candidate."patientId"
        AND (ma.fascia = candidate.fascia OR candidate."singleDayDose")
        AND ma.date = ${date}
      ORDER BY ma.id ASC
    `),
    legacyCandidates.length === 0
      ? Promise.resolve([] as TherapyAdministrationPageRow[])
      : db.$queryRaw<TherapyAdministrationPageRow[]>(Prisma.sql`
          WITH candidate("patientId", "farmacoNome", fascia) AS (
            VALUES ${Prisma.join(
              legacyCandidates.map(
                (candidate) =>
                  Prisma.sql`(${candidate.patientId}, ${candidate.drugName}, ${candidate.fascia})`,
              ),
            )}
          )
          SELECT DISTINCT ON (ma."patientId", ma."farmacoNome", ma.fascia, ma.ora)
            ma.id,
            ma."therapyId",
            ma."patientId",
            ma."farmacoNome",
            ma."farmacoDose",
            ma.fascia,
            ma.ora,
            ma.stato,
            ma."confirmedAt",
            ma."updatedAt",
            ma."operatoreNome",
            ma.motivo
          FROM candidate
          JOIN "MedicationAdministration" ma
            ON ma."patientId" = candidate."patientId"
            AND ma."farmacoNome" = candidate."farmacoNome"
            AND ma.fascia = candidate.fascia
            AND ma.date = ${date}
            AND ma."therapyId" IS NULL
          ORDER BY ma."patientId", ma."farmacoNome", ma.fascia, ma.ora, ma.id DESC
        `),
    // Preserve the recurring legacy latest-record rule above. Single-day outcomes resolve across
    // all bands/duplicates with the same bounded given-wins query as exact totals and assistant.
    singleDayCandidates.length === 0
      ? Promise.resolve([] as TherapyAdministrationPageRow[])
      : db.$queryRaw<TherapyAdministrationPageRow[]>(Prisma.sql`
        WITH candidate("therapyId", "patientId", "drugName") AS (
          VALUES ${Prisma.join(singleDayCandidates.map((candidate) => Prisma.sql`(${candidate.therapyId}, ${candidate.patientId}, ${candidate.drugName})`))}
        )
        SELECT ma.* FROM candidate
        JOIN LATERAL (${recordedOneTimeOutcomeSql(date, {
          patientId: Prisma.sql`candidate."patientId"`,
          id: Prisma.sql`candidate."therapyId"`,
          drugName: Prisma.sql`candidate."drugName"`,
        })}) ma ON TRUE
      `),
  ]);
  return [...modernRows, ...dayOutcomes, ...legacyRows];
}
