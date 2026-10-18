import { Prisma } from '@prisma/client';

/** These expressions use the pt alias shared by the bounded readers. */
export function normalizedTherapyClockSql(
  value: Prisma.Sql = Prisma.sql`pt."orarioSomministrazione"`,
) {
  return Prisma.sql`CASE WHEN btrim(${value}) ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
    THEN lpad(btrim(${value}), 5, '0') ELSE NULL END`;
}

export function oneTimeFasciaSql() {
  const time = normalizedTherapyClockSql();
  return Prisma.sql`CASE
    WHEN ${time} BETWEEN '05:00' AND '10:59' THEN 'mattina'
    WHEN ${time} BETWEEN '11:00' AND '13:59' THEN 'pranzo'
    WHEN ${time} BETWEEN '14:00' AND '17:59' THEN 'pomeriggio'
    WHEN ${time} BETWEEN '18:00' AND '21:59' THEN 'sera'
    ELSE 'notte' END`;
}

export function oneTimeSchedulableSql() {
  return Prisma.sql`(${normalizedTherapyClockSql()} IS NOT NULL
    AND (SELECT count(*) FROM "TherapySchedule" count_schedule WHERE count_schedule."therapyId" = pt.id) <= 1
    AND NOT EXISTS (SELECT 1 FROM "TherapySchedule" conflict
      WHERE conflict."therapyId" = pt.id AND (
        ${normalizedTherapyClockSql(Prisma.sql`conflict.time`)} IS DISTINCT FROM ${normalizedTherapyClockSql()}
        OR conflict.fascia <> ${oneTimeFasciaSql()})))`;
}

/** Missing/null clocks are explicitly verification, never SQL UNKNOWN and silently omitted. */
export function oneTimeVerificationSql() {
  return Prisma.sql`(pt.tipo = 'una_tantum' AND NOT ${oneTimeSchedulableSql()})`;
}

export function therapyBandEnabledSql() {
  return Prisma.sql`CASE WHEN pt.tipo = 'una_tantum' THEN
    ${oneTimeSchedulableSql()} AND band.fascia = ${oneTimeFasciaSql()}
    ELSE band.enabled END`;
}

export interface TherapyPatientAccess {
  /** null/undefined means verified global scope; an empty array means no patient access. */
  patientIds?: readonly string[] | null;
  /** Used by ordinary REST operators whose patient ownership is stored relationally. */
  registeredById?: string;
}

/** One row per authorized ambiguous one-off; no band/schedule join can multiply it. */
export function oneTimeVerificationWhereSql(date: string, access: TherapyPatientAccess) {
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay() || 7;
  return Prisma.sql`pt.stato = 'attiva' AND pt."dataSomministrazione" = ${date}
    AND ${oneTimeVerificationSql()}
    AND (pt."giorniSettimana" IS NULL OR btrim(pt."giorniSettimana") = ''
      OR (',' || regexp_replace(pt."giorniSettimana", '[[:space:]]+', '', 'g') || ',') LIKE ${`%,${weekday},%`})
    ${Array.isArray(access.patientIds) ? (access.patientIds.length ? Prisma.sql`AND pt."patientId" IN (${Prisma.join([...access.patientIds])})` : Prisma.sql`AND FALSE`) : Prisma.empty}
    ${access.registeredById ? Prisma.sql`AND p."registeredById" = ${access.registeredById}` : Prisma.empty}`;
}

/** Bound therapy candidates to the requested day before Prisma loads any relations. */
export function therapyWhereForDate(date: string): Prisma.PatientTherapyWhereInput {
  return {
    stato: 'attiva',
    tipo: { not: 'al_bisogno' },
    OR: [
      { tipo: 'una_tantum', dataSomministrazione: date },
      {
        tipo: { not: 'una_tantum' },
        dataInizio: { lte: date },
        OR: [{ dataFine: null }, { dataFine: { gte: date } }],
      },
    ],
  };
}

/** Apply the normalized intermittent-weekday schedule before agenda pagination. */
export function therapyWhereForDueDate(date: string): Prisma.PatientTherapyWhereInput {
  const jsDay = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  const isoDay = String(jsDay === 0 ? 7 : jsDay);
  return {
    AND: [
      therapyWhereForDate(date),
      {
        OR: [
          { giorniSettimana: null },
          { giorniSettimana: '' },
          { giorniSettimana: isoDay },
          { giorniSettimana: { startsWith: `${isoDay},` } },
          { giorniSettimana: { endsWith: `,${isoDay}` } },
          { giorniSettimana: { contains: `,${isoDay},` } },
        ],
      },
    ],
  };
}

/** Apply patient authorization in the database query, before any PHI relation is loaded. */
export function therapyWhereForAccess(
  date: string,
  access: TherapyPatientAccess = {},
): Prisma.PatientTherapyWhereInput {
  const scope: Prisma.PatientTherapyWhereInput[] = [therapyWhereForDueDate(date)];
  if (Array.isArray(access.patientIds)) scope.push({ patientId: { in: [...access.patientIds] } });
  if (access.registeredById) scope.push({ patient: { registeredById: access.registeredById } });
  return scope.length === 1 ? scope[0] : { AND: scope };
}

/** Same single-day identity and given-wins priority as recordedOneTimeOutcome. pt/p aliases are scoped. */
export function recordedOneTimeOutcomeSql(
  date: string,
  identity = {
    patientId: Prisma.sql`pt."patientId"`,
    id: Prisma.sql`pt.id`,
    drugName: Prisma.sql`pt."farmacoNome"`,
  },
) {
  return Prisma.sql`SELECT ma.* FROM "MedicationAdministration" ma
    WHERE ma.date = ${date} AND ma."patientId" = ${identity.patientId}
      AND (ma."therapyId" = ${identity.id} OR (ma."therapyId" IS NULL AND ma."farmacoNome" = ${identity.drugName}))
      AND ma.stato IN ('erogata', 'non_erogata')
    ORDER BY (ma.stato = 'erogata') DESC, (ma."therapyId" IS NOT NULL) DESC, ma.id ASC LIMIT 1`;
}
