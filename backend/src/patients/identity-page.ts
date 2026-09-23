import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { containsPattern } from './alphabetical-order.js';
import { patientScopeWhere } from './patient-scope.js';
import {
  loadOperationalIdentities,
  patientLocationJoin,
  type PatientLocationDto,
} from './operational-identity.js';
import { parsePatientPageQuery } from './pagination.js';
import { parsePatientRoomFilter, patientRoomFilterSql } from './room-filter.js';
import { facilityToday } from './parameter-reading-input.js';
import { changed, rosterDate, type AppliedRosterOrder } from '../roster/order-contract.js';
import { withRosterSnapshot } from '../roster/snapshot.js';
import { encodeRosterCursor } from '../roster/cursor.js';
import { rosterOrderSql, rosterAfterSql, type RosterPosition } from '../roster/order-key.js';

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
): Promise<{
  items: PatientIdentityRow[];
  hasMore: boolean;
  nextCursor: string | null;
  roster: AppliedRosterOrder;
}> {
  const input = parsePatientPageQuery(query);
  const room = parsePatientRoomFilter(query.room);
  const filters = { q: input.q, sex: input.sex, room };
  const scope = patientScopeWhere(actor);
  const asOf = query.asOf === undefined ? facilityToday() : rosterDate(query.asOf);
  return withRosterSnapshot(
    actor,
    scope,
    'patients',
    query,
    filters,
    asOf,
    async (tx, snapshot) => {
      const predicates: Prisma.Sql[] = [];
      if (scope.registeredById) {
        predicates.push(Prisma.sql`p."registeredById" = ${scope.registeredById}`);
      }
      if (input.sex) predicates.push(Prisma.sql`p."sex" = ${input.sex}`);
      if (room) predicates.push(patientRoomFilterSql(room));

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
      const { order } = snapshot.roster;
      const locationJoin =
        order.criterion === 'location' || room
          ? patientLocationJoin(asOf, snapshot.today)
          : Prisma.empty;
      if (snapshot.anchor) {
        const [position] = await tx.$queryRaw<RosterPosition[]>(Prisma.sql`
      SELECT p.id AS "patientId", p."firstName", p."lastName",
        ${order.criterion === 'location' ? Prisma.sql`location.location->>'room'` : Prisma.sql`NULL::text`} AS room,
        ${order.criterion === 'location' ? Prisma.sql`location.location->>'bed'` : Prisma.sql`NULL::text`} AS bed
      FROM "Patient" p ${locationJoin}
      WHERE p.id = ${snapshot.anchor.patientId}
        ${predicates.length ? Prisma.sql`AND ${Prisma.join(predicates, ' AND ')}` : Prisma.empty}
      LIMIT 1
    `);
        if (!position) throw changed('anchor');
        predicates.push(rosterAfterSql(order, position));
      }
      const where = predicates.length
        ? Prisma.sql`WHERE ${Prisma.join(predicates, ' AND ')}`
        : Prisma.empty;

      // Prisma cannot express a folded ORDER BY through findMany. Parameterized SQL
      // keeps filtering and limit+1 in PostgreSQL instead of sorting an unbounded roster.
      const rows = await tx.$queryRaw<Omit<PatientIdentityRow, 'location'>[]>(Prisma.sql`
    SELECT p."id", p."medicalRecordNumber", p."codiceFiscale", p."firstName", p."lastName",
      p."dateOfBirth", p."sex", p."email", p."phone"
    FROM "Patient" p
    ${locationJoin}
    ${where}
    ORDER BY ${rosterOrderSql(order)}
    LIMIT ${input.limit + 1}
  `);
      const hasMore = rows.length > input.limit;
      const items = hasMore ? rows.slice(0, input.limit) : rows;
      const last = items.at(-1);
      const identities = await loadOperationalIdentities(
        items.map((item) => item.id),
        scope,
        asOf,
        tx,
        snapshot.today,
      );
      return {
        items: items.flatMap((item) => {
          const identity = identities.get(item.id);
          return identity ? [{ ...item, location: identity.location }] : [];
        }),
        hasMore,
        roster: snapshot.roster,
        nextCursor:
          hasMore && last ? encodeRosterCursor(snapshot.binding, { patientId: last.id }) : null,
      };
    },
  );
}
