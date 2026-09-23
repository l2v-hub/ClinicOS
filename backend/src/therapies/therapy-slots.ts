// Costruzione degli slot terapia di una giornata a partire da PatientTherapy + le somministrazioni
// gia' registrate. Il percorso interattivo usa pagine bounded; il reader completo resta solo per la
// rotta REST legacy. Agnos usa invece un aggregate SQL bounded dedicato. Sola lettura.

import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { Operator } from '../ai/auth.js';
import { withRosterSnapshot } from '../roster/snapshot.js';
import { encodeRosterCursor } from '../roster/cursor.js';
import type { AppliedRosterOrder } from '../roster/order-contract.js';
import { loadTherapyCandidates } from './therapy-candidate-page.js';
import {
  MAX_THERAPY_SCHEDULES,
  scheduleDoseLabel,
  type ScheduleInput,
} from '../lib/therapy-dose.js';
import { earliestOra } from './slot-scheduling.js';
import {
  findTherapyPageAdministrations,
  legacyAdministrationKey,
} from './therapy-administration-page.js';
import { TherapySlotCapacityError } from './therapy-capacity.js';
import { therapyWhereForAccess, type TherapyPatientAccess } from './therapy-query.js';
import {
  loadOperationalIdentities,
  type PatientLocationDto,
} from '../patients/operational-identity.js';

export { therapyWhereForDate, therapyWhereForDueDate } from './therapy-query.js';
export { TherapySlotCapacityError } from './therapy-capacity.js';

export const FASCE = [
  { fascia: 'mattina', ora: '08:00', label: 'Terapia Mattina', flagField: 'fasceMattina' },
  { fascia: 'pranzo', ora: '12:00', label: 'Terapia Pranzo', flagField: 'fascePranzo' },
  { fascia: 'pomeriggio', ora: '16:00', label: 'Terapia Pomeriggio', flagField: 'fascePomeriggio' },
  { fascia: 'sera', ora: '20:00', label: 'Terapia Sera', flagField: 'fasceSera' },
  { fascia: 'notte', ora: '22:00', label: 'Terapia Notte', flagField: 'fasceNotte' },
] as const;

type FlagField = (typeof FASCE)[number]['flagField'];

export const MAX_THERAPY_SLOT_SOURCE_ROWS = 5000;

export interface SlotAdministration {
  administrationId: string | null;
  therapyId: string;
  drugName: string;
  dosage: string;
  quantityLabel: string | null;
  route: string;
  scheduledTime: string;
  status: 'pending' | 'administered' | 'not_administered';
  administeredAt: string | null;
  administeredBy: string | null;
  notAdministeredReason: string | null;
}

export interface SlotPatient {
  patientId: string;
  firstName: string;
  lastName: string;
  codiceFiscale: string | null;
  dateOfBirth: string | null;
  location: PatientLocationDto;
  room: string;
  bed: string;
  administrations: SlotAdministration[];
}

export interface TherapySlot {
  id: string;
  fascia: string;
  label: string;
  ora: string;
  summary: { total: number; administered: number; notAdministered: number; pending: number };
  patients: SlotPatient[];
}

export interface TherapySlotSourcePage {
  slots: TherapySlot[];
  roster?: AppliedRosterOrder;
  pageInfo: {
    hasMore: boolean;
    nextId: string | null;
    nextCursor?: string | null;
    loadedTherapies: number;
  };
}

interface ExactSummaryRow {
  fascia: string;
  total: number;
  administered: number;
  notAdministered: number;
  pending: number;
}

function therapyAccessSql(access: TherapyPatientAccess): Prisma.Sql {
  const predicates: Prisma.Sql[] = [];
  if (Array.isArray(access.patientIds)) {
    if (access.patientIds.length === 0) return Prisma.sql`AND FALSE`;
    predicates.push(Prisma.sql`pt."patientId" IN (${Prisma.join([...access.patientIds])})`);
  }
  if (access.registeredById) {
    predicates.push(Prisma.sql`p."registeredById" = ${access.registeredById}`);
  }
  return predicates.length ? Prisma.sql`AND ${Prisma.join(predicates, ' AND ')}` : Prisma.empty;
}

/** Exact, constant-size fascia totals. Details remain cursor-paged independently. */
export async function buildTherapySlotExactSummary(
  date: string,
  access: TherapyPatientAccess = {},
  db: Prisma.TransactionClient = prisma,
): Promise<Map<string, TherapySlot['summary']>> {
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay() || 7;
  const weekdayPattern = `%,${weekday},%`;
  const rows = await db.$queryRaw<ExactSummaryRow[]>(Prisma.sql`
    WITH due_therapy AS (
      SELECT
        pt.id,
        pt."patientId",
        pt."farmacoNome",
        band.fascia
      FROM "PatientTherapy" pt
      JOIN "Patient" p ON p.id = pt."patientId"
      CROSS JOIN LATERAL (
        VALUES
          ('mattina', pt."fasceMattina"),
          ('pranzo', pt."fascePranzo"),
          ('pomeriggio', pt."fascePomeriggio"),
          ('sera', pt."fasceSera"),
          ('notte', pt."fasceNotte")
      ) AS band(fascia, enabled)
      WHERE pt.stato = 'attiva'
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
        AND band.enabled = TRUE
        ${therapyAccessSql(access)}
    ), legacy_administration AS (
      SELECT DISTINCT ON (ma."patientId", ma."farmacoNome", ma.fascia)
        ma."patientId",
        ma."farmacoNome",
        ma.fascia,
        ma.stato
      FROM due_therapy due
      JOIN "MedicationAdministration" ma
        ON ma."patientId" = due."patientId"
        AND ma."farmacoNome" = due."farmacoNome"
        AND ma.fascia = due.fascia
        AND ma.date = ${date}
        AND ma."therapyId" IS NULL
      ORDER BY ma."patientId", ma."farmacoNome", ma.fascia, ma.id DESC
    ), resolved AS (
      SELECT due.fascia, COALESCE(modern.stato, legacy.stato) AS stato
      FROM due_therapy due
      LEFT JOIN "MedicationAdministration" modern
        ON modern."therapyId" = due.id
        AND modern.date = ${date}
        AND modern.fascia = due.fascia
      LEFT JOIN legacy_administration legacy
        ON modern.id IS NULL
        AND legacy."patientId" = due."patientId"
        AND legacy."farmacoNome" = due."farmacoNome"
        AND legacy.fascia = due.fascia
    )
    SELECT
      fascia,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE stato = 'erogata')::int AS administered,
      COUNT(*) FILTER (WHERE stato = 'non_erogata')::int AS "notAdministered",
      COUNT(*) FILTER (WHERE stato IS NULL OR stato NOT IN ('erogata', 'non_erogata'))::int AS pending
    FROM resolved
    GROUP BY fascia
  `);
  return new Map(
    rows.map((row) => [
      row.fascia,
      {
        total: Number(row.total),
        administered: Number(row.administered),
        notAdministered: Number(row.notAdministered),
        pending: Number(row.pending),
      },
    ]),
  );
}

async function buildTherapySlotSourcePage(
  date: string,
  access: TherapyPatientAccess,
  limit: number,
  cursorId?: string,
  db: Prisma.TransactionClient = prisma,
  orderedIds?: string[],
  today?: string,
): Promise<TherapySlotSourcePage> {
  if (Array.isArray(access.patientIds) && access.patientIds.length === 0) {
    return { slots: [], pageInfo: { hasMore: false, nextId: null, loadedTherapies: 0 } };
  }
  const sourceRows = await db.patientTherapy.findMany({
    where: orderedIds
      ? { id: { in: orderedIds } }
      : cursorId
        ? { AND: [therapyWhereForAccess(date, access), { id: { gt: cursorId } }] }
        : therapyWhereForAccess(date, access),
    select: {
      id: true,
      patientId: true,
      farmacoNome: true,
      dosaggio: true,
      viaSomministrazione: true,
      tipo: true,
      fasceMattina: true,
      fascePranzo: true,
      fascePomeriggio: true,
      fasceSera: true,
      fasceNotte: true,
      commercialStrengthValue: true,
      commercialStrengthUnit: true,
      schedules: {
        take: MAX_THERAPY_SCHEDULES + 1,
        select: {
          fascia: true,
          time: true,
          quantityNumerator: true,
          quantityDenominator: true,
          administrationUnit: true,
        },
      },
      patient: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { id: 'asc' },
    take: limit + 1,
  });
  if (orderedIds) {
    const rank = new Map(orderedIds.map((id, index) => [id, index]));
    sourceRows.sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
  }
  const hasMore = sourceRows.length > limit;
  const therapies = sourceRows.slice(0, limit);
  if (therapies.some((therapy) => therapy.schedules.length > MAX_THERAPY_SCHEDULES)) {
    throw new TherapySlotCapacityError(
      `Terapia con troppi orari (massimo ${MAX_THERAPY_SCHEDULES})`,
    );
  }

  const validTherapies = therapies.filter((pt) => {
    if (!pt.patient) {
      console.error('Skipping invalid/orphan therapy: missing patient for therapyId', pt.id);
      return false;
    }
    return true;
  });

  const legacyCandidateKeys = new Set(
    validTherapies.flatMap((therapy) =>
      FASCE.filter((fascia) => therapy[fascia.flagField as FlagField] === true).map((fascia) =>
        legacyAdministrationKey(therapy.patientId, therapy.farmacoNome, fascia.fascia),
      ),
    ),
  );
  const identities = await loadOperationalIdentities(
    validTherapies.map((therapy) => therapy.patientId),
    access,
    date,
    db,
    today,
  );
  const administrations = await findTherapyPageAdministrations(
    date,
    validTherapies.map((therapy) => ({
      therapyId: therapy.id,
      patientId: therapy.patientId,
      drugName: therapy.farmacoNome,
      fasce: FASCE.filter((fascia) => therapy[fascia.flagField as FlagField] === true).map(
        ({ fascia }) => fascia,
      ),
    })),
    db,
  );
  const adminMap = new Map<string, (typeof administrations)[0]>(
    administrations.flatMap((administration) => {
      const legacyKey = legacyAdministrationKey(
        administration.patientId,
        administration.farmacoNome,
        administration.fascia,
      );
      return administration.therapyId
        ? [[`${administration.therapyId}|${administration.fascia}`, administration]]
        : legacyCandidateKeys.has(legacyKey)
          ? [[legacyKey, administration]]
          : [];
    }),
  );

  const slots: TherapySlot[] = FASCE.map((f) => {
    const fasciaTherapies = validTherapies.filter((pt) => pt[f.flagField as FlagField] === true);
    const patientMap = new Map<string, SlotPatient>();

    for (const pt of fasciaTherapies) {
      const patient = identities.get(pt.patientId);
      if (!patient) continue;
      const location = patient.location;
      const missingLabel = location.status === 'unassigned' ? 'Non assegnato' : 'Non disponibile';
      const room = location.room ?? missingLabel;
      const bed = location.bed ?? missingLabel;

      const existing =
        adminMap.get(`${pt.id}|${f.fascia}`) ??
        adminMap.get(legacyAdministrationKey(pt.patientId, pt.farmacoNome, f.fascia));
      let status: SlotAdministration['status'] = 'pending';
      if (existing?.stato === 'erogata') status = 'administered';
      if (existing?.stato === 'non_erogata') status = 'not_administered';

      // REQ-093: match the structured schedule for this fascia to surface the exact
      // fractional quantity + mg equivalent and the precise administration time.
      const sched = (pt.schedules as ScheduleInput[] | undefined)?.find(
        (s) => s.fascia === f.fascia,
      );
      const quantityLabel = sched
        ? scheduleDoseLabel(sched, pt.commercialStrengthValue, pt.commercialStrengthUnit)
        : null;

      const administrationEntry: SlotAdministration = {
        administrationId: existing?.id ?? null,
        therapyId: pt.id,
        drugName: pt.farmacoNome,
        dosage: quantityLabel ?? pt.dosaggio,
        quantityLabel,
        route: pt.viaSomministrazione || 'orale',
        scheduledTime: sched?.time || f.ora,
        status,
        administeredAt: existing?.confirmedAt ? new Date(existing.confirmedAt).toISOString() : null,
        administeredBy: existing?.operatoreNome ?? null,
        notAdministeredReason: existing?.motivo ?? null,
      };

      if (!patientMap.has(pt.patientId)) {
        patientMap.set(pt.patientId, {
          patientId: pt.patientId,
          firstName: patient.firstName,
          lastName: patient.lastName,
          codiceFiscale: patient.codiceFiscale,
          dateOfBirth: patient.dateOfBirth,
          location,
          room,
          bed,
          administrations: [],
        });
      }
      patientMap.get(pt.patientId)!.administrations.push(administrationEntry);
    }

    const patients = Array.from(patientMap.values());
    const allAdmins = patients.flatMap((p) => p.administrations);

    return {
      id: `ts-${f.fascia}`,
      fascia: f.fascia,
      label: f.label,
      ora: earliestOra(
        allAdmins.map((a) => a.scheduledTime),
        f.ora,
      ),
      summary: {
        total: allAdmins.length,
        administered: allAdmins.filter((a) => a.status === 'administered').length,
        notAdministered: allAdmins.filter((a) => a.status === 'not_administered').length,
        pending: allAdmins.filter((a) => a.status === 'pending').length,
      },
      patients,
    };
  });

  return {
    slots: slots.filter((slot) => slot.patients.length > 0),
    pageInfo: {
      hasMore,
      nextId: hasMore && therapies.length > 0 ? therapies[therapies.length - 1]!.id : null,
      loadedTherapies: therapies.length,
    },
  };
}

/** Legacy complete read. It fails explicitly instead of returning a truncated clinical agenda. */
export async function buildTherapySlots(
  date: string,
  access: TherapyPatientAccess = {},
): Promise<TherapySlot[]> {
  const page = await buildTherapySlotSourcePage(date, access, MAX_THERAPY_SLOT_SOURCE_ROWS);
  if (page.pageInfo.hasMore) {
    throw new TherapySlotCapacityError(
      `Troppe terapie per la giornata (massimo ${MAX_THERAPY_SLOT_SOURCE_ROWS})`,
    );
  }
  return page.slots;
}

/** One stable therapy-candidate page for the interactive agenda. */
export async function buildTherapySlotPage(
  date: string,
  access: TherapyPatientAccess,
  input: { limit: number; cursor?: string; sort?: string; direction?: string; contextId?: string },
  actor: Operator = { id: access.registeredById ?? 'internal-reader', role: 'operatore' },
): Promise<TherapySlotSourcePage> {
  return withRosterSnapshot(actor, access, 'therapy', input, {}, date, async (tx, snapshot) => {
    const candidates = await loadTherapyCandidates(tx, date, access, input.limit, snapshot);
    const page = await buildTherapySlotSourcePage(
      date,
      access,
      input.limit,
      undefined,
      tx,
      candidates.map((row) => row.id),
      snapshot.today,
    );
    const last = candidates.slice(0, input.limit).at(-1);
    page.roster = snapshot.roster;
    page.pageInfo.nextCursor =
      page.pageInfo.hasMore && last
        ? encodeRosterCursor(snapshot.binding, { patientId: last.patientId, therapyId: last.id })
        : null;
    // The first response seeds exact totals. Continuation pages carry details only, so the
    // expensive global aggregate is not repeated for every "load more" click.
    if (input.cursor || (Array.isArray(access.patientIds) && access.patientIds.length === 0)) {
      return page;
    }
    const exactSummary = await buildTherapySlotExactSummary(date, access, tx);
    const pageByFascia = new Map(page.slots.map((slot) => [slot.fascia, slot]));
    page.slots = FASCE.flatMap((fascia) => {
      const summary = exactSummary.get(fascia.fascia);
      if (!summary?.total) return [];
      const loaded = pageByFascia.get(fascia.fascia);
      return [
        {
          id: `ts-${fascia.fascia}`,
          fascia: fascia.fascia,
          label: fascia.label,
          ora: loaded?.ora ?? fascia.ora,
          summary,
          patients: loaded?.patients ?? [],
        },
      ];
    });
    return page;
  });
}
