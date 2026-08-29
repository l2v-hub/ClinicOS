import type { Prisma } from '@prisma/client';

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
