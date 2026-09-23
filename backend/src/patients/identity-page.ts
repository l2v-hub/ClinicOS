import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { prisma } from '../lib/prisma.js';
import {
  containsPattern,
  patientAlphabeticalAfter,
  patientAlphabeticalOrder,
} from './alphabetical-order.js';
import { patientScopeWhere } from './patient-scope.js';
import { loadOperationalIdentities, type PatientLocationDto } from './operational-identity.js';
import {
  decodePatientPageCursor,
  encodePatientPageCursor,
  parsePatientPageQuery,
} from './pagination.js';

interface PatientIdentityRow {
  id: string;
  medicalRecordNumber: string;
  codiceFiscale: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  sex: string | null;
  email: string | null;
  phone: string | null;
  location: PatientLocationDto;
}

export async function loadPatientIdentityPage(
  query: Record<string, unknown>,
  actor: Operator,
): Promise<{ items: PatientIdentityRow[]; hasMore: boolean; nextCursor: string | null }> {
  const input = parsePatientPageQuery(query);
  const filters = { q: input.q, sex: input.sex };
  const position = input.cursor ? decodePatientPageCursor(input.cursor, filters) : undefined;
  const predicates: Prisma.Sql[] = [];
  const scope = patientScopeWhere(actor);
  if (scope.registeredById) {
    predicates.push(Prisma.sql`p."registeredById" = ${scope.registeredById}`);
  }
  if (input.sex) predicates.push(Prisma.sql`p."sex" = ${input.sex}`);

  const normalizedFiscalQuery = input.q?.replace(/\s+/g, '').toUpperCase() ?? '';
  if (/^[A-Z0-9]{16}$/.test(normalizedFiscalQuery)) {
    predicates.push(Prisma.sql`p."codiceFiscale" = ${normalizedFiscalQuery}`);
  } else {
    for (const token of input.q
      ?.split(/[,\s]+/)
      .filter(Boolean)
      .slice(0, 5) ?? []) {
      const pattern = containsPattern(token);
      const fiscalToken = token.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      const fields = [
        Prisma.sql`p."lastName" ILIKE ${pattern} ESCAPE '\\'`,
        Prisma.sql`p."firstName" ILIKE ${pattern} ESCAPE '\\'`,
      ];
      if (fiscalToken) {
        fields.push(
          Prisma.sql`p."codiceFiscale" ILIKE ${containsPattern(fiscalToken)} ESCAPE '\\'`,
        );
      }
      predicates.push(Prisma.sql`(${Prisma.join(fields, ' OR ')})`);
    }
  }
  if (position) predicates.push(patientAlphabeticalAfter(position));
  const where = predicates.length
    ? Prisma.sql`WHERE ${Prisma.join(predicates, ' AND ')}`
    : Prisma.empty;

  // Prisma cannot express a folded ORDER BY through findMany. Parameterized SQL
  // keeps filtering and limit+1 in PostgreSQL instead of sorting an unbounded roster.
  const rows = await prisma.$queryRaw<Omit<PatientIdentityRow, 'location'>[]>(Prisma.sql`
    SELECT p."id", p."medicalRecordNumber", p."codiceFiscale", p."firstName", p."lastName",
      p."dateOfBirth", p."sex", p."email", p."phone"
    FROM "Patient" p
    ${where}
    ORDER BY ${patientAlphabeticalOrder}
    LIMIT ${input.limit + 1}
  `);
  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  const last = items.at(-1);
  const identities = await loadOperationalIdentities(
    items.map((item) => item.id),
    scope,
  );
  return {
    items: items.flatMap((item) => {
      const identity = identities.get(item.id);
      return identity ? [{ ...item, location: identity.location }] : [];
    }),
    hasMore,
    nextCursor:
      hasMore && last
        ? encodePatientPageCursor(
            { lastName: last.lastName, firstName: last.firstName, id: last.id },
            filters,
          )
        : null,
  };
}
