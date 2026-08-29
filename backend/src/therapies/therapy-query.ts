import type { Prisma } from '@prisma/client';

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

/** Apply patient authorization in the database query, before any PHI relation is loaded. */
export function therapyWhereForAccess(
  date: string,
  access: TherapyPatientAccess = {},
): Prisma.PatientTherapyWhereInput {
  const scope: Prisma.PatientTherapyWhereInput[] = [therapyWhereForDate(date)];
  if (Array.isArray(access.patientIds)) scope.push({ patientId: { in: [...access.patientIds] } });
  if (access.registeredById) scope.push({ patient: { registeredById: access.registeredById } });
  return scope.length === 1 ? scope[0] : { AND: scope };
}
