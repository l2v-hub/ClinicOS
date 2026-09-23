import { Prisma } from '@prisma/client';
import { patientLocationJoin } from '../patients/operational-identity.js';
import { changed } from '../roster/order-contract.js';
import { rosterAfterSql, rosterOrderSql, type RosterPosition } from '../roster/order-key.js';
import type { RosterSnapshot } from '../roster/snapshot.js';
import type { TherapyPatientAccess } from './therapy-query.js';

export interface TherapyCandidate {
  id: string;
  patientId: string;
}
export async function loadTherapyCandidates(
  tx: Prisma.TransactionClient,
  date: string,
  access: TherapyPatientAccess,
  limit: number,
  snapshot: RosterSnapshot,
): Promise<TherapyCandidate[]> {
  const weekday = String(new Date(`${date}T00:00:00.000Z`).getUTCDay() || 7);
  const predicates = [
    Prisma.sql`pt.stato = 'attiva' AND pt.tipo <> 'al_bisogno'
    AND ((pt.tipo = 'una_tantum' AND pt."dataSomministrazione" = ${date})
      OR (pt.tipo <> 'una_tantum' AND pt."dataInizio" <= ${date}
        AND (pt."dataFine" IS NULL OR pt."dataFine" >= ${date})))
    AND (pt."giorniSettimana" IS NULL OR btrim(pt."giorniSettimana") = ''
      OR (',' || regexp_replace(pt."giorniSettimana", '[[:space:]]+', '', 'g') || ',') LIKE ${`%,${weekday},%`})`,
  ];
  if (access.patientIds)
    predicates.push(
      access.patientIds.length
        ? Prisma.sql`p.id IN (${Prisma.join([...access.patientIds])})`
        : Prisma.sql`FALSE`,
    );
  if (access.registeredById)
    predicates.push(Prisma.sql`p."registeredById" = ${access.registeredById}`);
  const order = snapshot.roster.order;
  const locationJoin =
    order.criterion === 'location' ? patientLocationJoin(date, snapshot.today) : Prisma.empty;
  if (snapshot.anchor) {
    const [position] = await tx.$queryRaw<RosterPosition[]>(Prisma.sql`
      SELECT p.id AS "patientId", pt.id AS "therapyId", p."firstName", p."lastName",
        ${order.criterion === 'location' ? Prisma.sql`location.location->>'room'` : Prisma.sql`NULL::text`} AS room,
        ${order.criterion === 'location' ? Prisma.sql`location.location->>'bed'` : Prisma.sql`NULL::text`} AS bed
      FROM "PatientTherapy" pt JOIN "Patient" p ON p.id = pt."patientId" ${locationJoin}
      WHERE ${Prisma.join(predicates, ' AND ')} AND p.id = ${snapshot.anchor.patientId}
        AND pt.id = ${snapshot.anchor.therapyId} LIMIT 1
    `);
    if (!position) throw changed('anchor');
    predicates.push(rosterAfterSql(order, position, Prisma.sql`location.location`, true));
  }
  return tx.$queryRaw<TherapyCandidate[]>(Prisma.sql`
    SELECT pt.id, pt."patientId" FROM "PatientTherapy" pt
    JOIN "Patient" p ON p.id = pt."patientId" ${locationJoin}
    WHERE ${Prisma.join(predicates, ' AND ')}
    ORDER BY ${rosterOrderSql(order, Prisma.sql`location.location`, true)} LIMIT ${limit + 1}
  `);
}
