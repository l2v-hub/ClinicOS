import { Prisma } from '@prisma/client';

/** Same one-off clock/band contract as oneTimeSlot; aliases belong to the bounded readers. */
export function therapyBandEnabledSql() {
  return Prisma.sql`CASE WHEN pt.tipo = 'una_tantum' THEN
    pt."orarioSomministrazione" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND NOT EXISTS (
      SELECT 1 FROM "TherapySchedule" conflict
      WHERE conflict."therapyId" = pt.id AND conflict.time <> pt."orarioSomministrazione"
    )
    AND band.fascia = CASE
      WHEN pt."orarioSomministrazione" BETWEEN '05:00' AND '10:59' THEN 'mattina'
      WHEN pt."orarioSomministrazione" BETWEEN '11:00' AND '13:59' THEN 'pranzo'
      WHEN pt."orarioSomministrazione" BETWEEN '14:00' AND '17:59' THEN 'pomeriggio'
      WHEN pt."orarioSomministrazione" BETWEEN '18:00' AND '21:59' THEN 'sera'
      ELSE 'notte' END
    ELSE band.enabled END`;
}

export interface TherapyPatientAccess {
  /** null/undefined means verified global scope; an empty array means no patient access. */
  patientIds?: readonly string[] | null;
  /** Used by ordinary REST operators whose patient ownership is stored relationally. */
  registeredById?: string;
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
