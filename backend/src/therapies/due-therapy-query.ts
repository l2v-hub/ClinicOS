import { temporaryPsAdministrationAllowedSql } from '../patients/temporary-ps-query.js';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { facilityClock } from '../lib/facility-time.js';
import type { TherapyDueItem, TherapyToVerifyItem } from '../ai/assistant/facility-signals.js';
import { scheduleDoseLabel } from '../lib/therapy-dose.js';
import {
  therapyBandEnabledSql,
  normalizedTherapyClockSql,
  oneTimeVerificationWhereSql,
  recordedOneTimeOutcomeSql,
  type TherapyPatientAccess,
} from './therapy-query.js';

interface TherapyDueRow {
  bucket: 'overdue' | 'dueSoon';
  totalCount: number;
  patientId: string;
  patientName: string;
  room: string;
  bed: string;
  fascia: string;
  therapyId: string;
  drugName: string;
  dosage: string;
  commercialStrengthValue: number | null;
  commercialStrengthUnit: string | null;
  quantityNumerator: number | null;
  quantityDenominator: number | null;
  administrationUnit: string | null;
  scheduledTime: string;
  scheduledMinutes: number;
}

export interface TherapyDueResult {
  overdueCount: number;
  dueSoonCount: number;
  overdue: TherapyDueItem[];
  dueSoon: TherapyDueItem[];
  toVerifyCount: number;
  toVerify: TherapyToVerifyItem[];
  truncated: boolean;
}

function therapyAccessSql(access: TherapyPatientAccess): Prisma.Sql {
  const predicates: Prisma.Sql[] = [];
  if (Array.isArray(access.patientIds)) {
    if (!access.patientIds.length) return Prisma.sql`AND FALSE`;
    predicates.push(Prisma.sql`pt."patientId" IN (${Prisma.join([...access.patientIds])})`);
  }
  if (access.registeredById)
    predicates.push(Prisma.sql`p."registeredById" = ${access.registeredById}`);
  return predicates.length ? Prisma.sql`AND ${Prisma.join(predicates, ' AND ')}` : Prisma.empty;
}

/**
 * Exact counts plus bounded, urgency-ordered samples for the assistant queue.
 * ACL, date, weekday and administration state are all resolved in PostgreSQL before PHI leaves it.
 */
export async function findTherapiesDue(
  date: string,
  access: TherapyPatientAccess,
  now: Date,
  windowMinutes: number,
  sampleLimit = 5,
): Promise<TherapyDueResult> {
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay() || 7;
  const weekdayPattern = `%,${weekday},%`;
  const currentMinutes = facilityClock(now).minutes;
  const boundedWindow = Math.max(0, Math.min(24 * 60, Math.trunc(windowMinutes)));
  const boundedSample = Math.max(1, Math.min(50, Math.trunc(sampleLimit)));

  const rows = await prisma.$queryRaw<TherapyDueRow[]>(Prisma.sql`
    WITH due_therapy AS (
      SELECT
        pt.id AS "therapyId",
        pt.tipo,
        pt."patientId",
        pt."farmacoNome" AS "drugName",
        pt.dosaggio,
        pt."commercialStrengthValue",
        pt."commercialStrengthUnit",
        p."firstName",
        p."lastName",
        band.fascia,
        COALESCE(CASE WHEN pt.tipo = 'una_tantum' THEN ${normalizedTherapyClockSql()} ELSE schedule.time END, band."defaultTime") AS "scheduledTime",
        (
          SELECT count(*)::int FROM "TherapySchedule" bs
          WHERE bs."therapyId" = pt.id AND bs.fascia = band.fascia
        ) AS "bandDoses",
        schedule."quantityNumerator",
        schedule."quantityDenominator",
        schedule."administrationUnit",
        COALESCE(room.numero, cartella.data->>'cameraNumero', 'Non assegnato') AS room,
        COALESCE(room."bedLabel", cartella.data->>'lettoNumero', 'Non assegnato') AS bed
      FROM "PatientTherapy" pt
      JOIN "Patient" p ON p.id = pt."patientId"
      CROSS JOIN LATERAL (
        VALUES
          ('mattina', '08:00', pt."fasceMattina"),
          ('pranzo', '12:00', pt."fascePranzo"),
          ('pomeriggio', '16:00', pt."fascePomeriggio"),
          ('sera', '20:00', pt."fasceSera"),
          ('notte', '22:00', pt."fasceNotte")
      ) AS band(fascia, "defaultTime", enabled)
      LEFT JOIN LATERAL (
        SELECT
          ts.time,
          ts."quantityNumerator",
          ts."quantityDenominator",
          ts."administrationUnit"
        FROM "TherapySchedule" ts
        WHERE ts."therapyId" = pt.id AND ts.fascia = band.fascia
        ORDER BY ts.time ASC, ts.id ASC
      ) schedule ON TRUE
      LEFT JOIN LATERAL (
        SELECT r.numero, b.label AS "bedLabel"
        FROM "PatientRoomAssignment" pra
        JOIN "Bed" b ON b.id = pra."bedId"
        JOIN "Room" r ON r.id = pra."roomId"
        WHERE pra."patientId" = pt."patientId"
          AND pra."startDate" <= ${date}
          AND (pra."endDate" IS NULL OR pra."endDate" >= ${date})
        ORDER BY pra."startDate" DESC, pra.id DESC
        LIMIT 1
      ) room ON TRUE
      LEFT JOIN "Cartella" cartella ON cartella."patientId" = pt."patientId"
      WHERE pt.stato = 'attiva'
        AND ${temporaryPsAdministrationAllowedSql(Prisma.sql`cartella.data`)}
        AND pt.tipo <> 'al_bisogno'
        AND (
          (pt.tipo = 'una_tantum' AND pt."dataSomministrazione" = ${date})
          OR (
            pt.tipo <> 'una_tantum'
            AND pt."dataInizio" <= ${date}
            AND (pt."dataFine" IS NULL OR pt."dataFine" >= ${date})
          )
        )
        AND (
          pt."giorniSettimana" IS NULL
          OR btrim(pt."giorniSettimana") = ''
          OR (
            ',' || regexp_replace(pt."giorniSettimana", '[[:space:]]+', '', 'g') || ','
          ) LIKE ${weekdayPattern}
        )
        AND ${therapyBandEnabledSql()}
        ${therapyAccessSql(access)}
    ), legacy_administration AS (
      SELECT DISTINCT ON (ma."patientId", ma."farmacoNome", ma.fascia, ma.ora)
        ma."patientId", ma."farmacoNome", ma.fascia, ma.ora, ma.stato
      FROM due_therapy due
      JOIN "MedicationAdministration" ma
        ON ma."patientId" = due."patientId"
        AND ma."farmacoNome" = due."drugName"
        AND ma.fascia = due.fascia
        AND ma.date = ${date}
        AND ma."therapyId" IS NULL
      ORDER BY ma."patientId", ma."farmacoNome", ma.fascia, ma.ora, ma.id DESC
    ), pending AS (
      SELECT
        due.*,
        (
          split_part(due."scheduledTime", ':', 1)::int * 60
          + split_part(due."scheduledTime", ':', 2)::int
        ) AS "scheduledMinutes"
      FROM due_therapy due
      LEFT JOIN LATERAL (${recordedOneTimeOutcomeSql(date, {
        patientId: Prisma.sql`due."patientId"`,
        id: Prisma.sql`due."therapyId"`,
        drugName: Prisma.sql`due."drugName"`,
      })}) day_record ON due.tipo = 'una_tantum'
      -- A band with ONE prescribed dose has one record for the day whatever its hour (the time
      -- may have moved after the dose was given); several doses match by exact hour.
      LEFT JOIN LATERAL (
        SELECT ma.id, ma.stato
        FROM "MedicationAdministration" ma
        WHERE ma."therapyId" = due."therapyId"
          AND ma.date = ${date}
          AND ma."patientId" = due."patientId"
          AND (due.tipo = 'una_tantum' OR (
            ma.fascia = due.fascia
            AND (ma.ora = due."scheduledTime" OR due."bandDoses" <= 1)
          ))
        ORDER BY (ma.stato = 'erogata') DESC, (ma.ora = due."scheduledTime") DESC, ma.id ASC
        LIMIT 1
      ) modern ON TRUE
      LEFT JOIN legacy_administration legacy
        ON modern.id IS NULL
        AND legacy."patientId" = due."patientId"
        AND legacy."farmacoNome" = due."drugName"
        AND legacy.fascia = due.fascia
        AND legacy.ora = due."scheduledTime"
      WHERE (COALESCE(day_record.stato, modern.stato, legacy.stato) IS NULL
        OR COALESCE(day_record.stato, modern.stato, legacy.stato) NOT IN ('erogata', 'non_erogata'))
        AND due."scheduledTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    ), categorized AS (
      SELECT
        pending.*,
        CASE
          WHEN "scheduledMinutes" < ${currentMinutes} THEN 'overdue'
          WHEN "scheduledMinutes" <= ${currentMinutes + boundedWindow} THEN 'dueSoon'
          ELSE NULL
        END AS bucket
      FROM pending
    ), ranked AS (
      SELECT
        categorized.*,
        COUNT(*) OVER (PARTITION BY bucket)::int AS "totalCount",
        ROW_NUMBER() OVER (
          PARTITION BY bucket
          ORDER BY "scheduledMinutes" ASC, "therapyId" ASC
        ) AS sample_rank
      FROM categorized
      WHERE bucket IS NOT NULL
    )
    SELECT
      bucket,
      "totalCount",
      "patientId",
      trim("lastName" || ' ' || "firstName") AS "patientName",
      room,
      bed,
      fascia,
      "therapyId",
      "drugName",
      dosaggio AS dosage,
      "commercialStrengthValue",
      "commercialStrengthUnit",
      "quantityNumerator",
      "quantityDenominator",
      "administrationUnit",
      "scheduledTime",
      "scheduledMinutes"
    FROM ranked
    WHERE sample_rank <= ${boundedSample}
    ORDER BY bucket ASC, "scheduledMinutes" ASC, "therapyId" ASC
  `);

  // Count before LIMIT; one base row per therapy, irrespective of flags or schedule multiplicity.
  const verificationRows = await prisma.$queryRaw<
    Array<TherapyToVerifyItem & { totalCount: number }>
  >(Prisma.sql`
    SELECT pt.id AS "therapyId", pt."patientId", pt."farmacoNome" AS "drugName",
      trim(p."lastName" || ' ' || p."firstName") AS "patientName",
      'to_verify'::text AS status, NULL::text AS fascia, NULL::text AS "scheduledTime",
      NULL::text AS dosage, false AS "canAdminister", count(*) OVER()::int AS "totalCount"
    FROM "PatientTherapy" pt JOIN "Patient" p ON p.id = pt."patientId"
    WHERE ${oneTimeVerificationWhereSql(date, access)}
      AND NOT EXISTS (${recordedOneTimeOutcomeSql(date)})
    ORDER BY pt.id ASC LIMIT ${boundedSample}`);
  const toVerifyCount = Number(verificationRows[0]?.totalCount ?? 0);
  const toVerify = verificationRows.map(({ totalCount: _total, ...item }) => item);

  const toItem = (row: TherapyDueRow): TherapyDueItem => ({
    patientId: row.patientId,
    patientName: row.patientName,
    room: row.room,
    bed: row.bed,
    fascia: row.fascia,
    therapyId: row.therapyId,
    drugName: row.drugName,
    dosage:
      row.quantityNumerator && row.quantityDenominator && row.administrationUnit
        ? scheduleDoseLabel(
            {
              fascia: row.fascia,
              time: row.scheduledTime,
              quantityNumerator: Number(row.quantityNumerator),
              quantityDenominator: Number(row.quantityDenominator),
              administrationUnit: row.administrationUnit,
            },
            row.commercialStrengthValue,
            row.commercialStrengthUnit,
          )
        : row.dosage,
    scheduledTime: row.scheduledTime,
    minutesLate: Math.max(0, currentMinutes - Number(row.scheduledMinutes)),
    minutesUntil: Math.max(0, Number(row.scheduledMinutes) - currentMinutes),
  });
  const overdueRows = rows.filter((row) => row.bucket === 'overdue');
  const dueSoonRows = rows.filter((row) => row.bucket === 'dueSoon');
  const overdueCount = Number(overdueRows[0]?.totalCount ?? 0);
  const dueSoonCount = Number(dueSoonRows[0]?.totalCount ?? 0);
  return {
    overdueCount,
    dueSoonCount,
    overdue: overdueRows.map(toItem),
    dueSoon: dueSoonRows.map(toItem),
    toVerifyCount,
    toVerify,
    truncated:
      overdueCount > overdueRows.length ||
      dueSoonCount > dueSoonRows.length ||
      toVerifyCount > toVerify.length,
  };
}
