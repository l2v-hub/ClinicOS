import { Prisma } from '@prisma/client';
import { PatientPageInputError } from './pagination.js';
import { containsPattern, patientNameSortKey } from './alphabetical-order.js';

export function parsePatientRoomFilter(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim().length > 80)
    throw new PatientPageInputError('room non valido');
  return (
    value
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase() || undefined
  );
}

export function patientRoomFilterSql(room: string): Prisma.Sql {
  return Prisma.sql`${patientNameSortKey(Prisma.sql`location.location->>'room'`)}
    LIKE ${containsPattern(room)} ESCAPE '\\'`;
}
