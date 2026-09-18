import { Prisma } from '@prisma/client';
import type { PatientPagePosition } from './pagination.js';

// PostgreSQL 13+ / UTF-8. Normalize composed and decomposed accents identically and
// use one collation for both ORDER BY and the keyset predicate. Names stay untouched.
// The expression is shared by identity and parameter pages; folding only in JS or
// only in ORDER BY would skip/repeat patients at mixed-case page boundaries.
export function patientNameSortKey(value: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`regexp_replace(lower(normalize(btrim(${value}), NFD)), ${'[\u0300-\u036f]'}, '', 'g') COLLATE "C"`;
}

const lastName = patientNameSortKey(Prisma.sql`p."lastName"`);
const firstName = patientNameSortKey(Prisma.sql`p."firstName"`);

export const patientAlphabeticalOrder = Prisma.sql`${lastName} ASC, ${firstName} ASC, p."id" COLLATE "C" ASC`;

export function patientAlphabeticalAfter(position: PatientPagePosition): Prisma.Sql {
  return Prisma.sql`(${lastName}, ${firstName}, p."id" COLLATE "C") > (
    ${patientNameSortKey(Prisma.sql`${position.lastName}::text`)},
    ${patientNameSortKey(Prisma.sql`${position.firstName}::text`)},
    ${position.id} COLLATE "C"
  )`;
}

export function containsPattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}
