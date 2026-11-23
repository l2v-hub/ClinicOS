// Milo, casi d'uso «chi ha seguito il paziente» e «quando si libera una camera».
// Stesse regole del gateway: sola lettura, perimetro del paziente o gate di struttura verificati dal
// backend, fonte su ogni dato, audit. Dai turni escono solo dati organizzativi; dall'occupazione
// solo conteggi, numeri di camera e date previste, mai nomi di pazienti.

import { prisma } from '../../lib/prisma.js';
import { facilityToday } from '../../patients/parameter-reading-input.js';
import { gatewayAudit } from './audit.js';
import { assertPatientAllowed, assertTenant, canFacilityRead } from './context.js';
import {
  appointmentSource,
  diarySource,
  roomOccupancySource,
  shiftSource,
  vitalSource,
} from './sources.js';
import { GatewayError, type SourceReference, type UserContext } from './types.js';

type Sourced<T> = { data: T[]; sourceRefs: SourceReference[]; truncated: boolean };
const nowIso = () => new Date().toISOString();

// ── Chi ha seguito il paziente: ultima rilevazione, ultima visita, ultimo medico, con i turni ──

export interface CareShift {
  giorno: string;
  oraInizio: string;
  oraFine: string;
}
export interface CarePerson {
  name: string;
  ruolo: string | null;
  /** Turni settimanali; null quando non disponibili per questo ruolo o non configurati. */
  turni: CareShift[] | null;
}
export interface CareContacts {
  patientId: string;
  lastReading: {
    measuredAt: string;
    author: string;
    ruolo: string | null;
    parametri: string[];
  } | null;
  lastVisit: { scheduledAt: string; operator: string; ruolo: string | null; status: string } | null;
  lastDoctorNote: { entryDateTime: string; author: string } | null;
  people: CarePerson[];
}

const shiftsOf = (data: unknown): CareShift[] => {
  const turni = (data as { turni?: unknown } | null)?.turni;
  return (Array.isArray(turni) ? turni : [])
    .filter(
      (t): t is CareShift & { disponibile?: boolean } =>
        !!t &&
        typeof t === 'object' &&
        typeof (t as CareShift).giorno === 'string' &&
        typeof (t as CareShift).oraInizio === 'string' &&
        typeof (t as CareShift).oraFine === 'string',
    )
    .filter((t) => t.disponibile !== false)
    .map((t) => ({ giorno: t.giorno, oraInizio: t.oraInizio, oraFine: t.oraFine }));
};

/**
 * Chi ha registrato l'ultima rilevazione, chi ha fatto l'ultima visita (appuntamento già avvenuto,
 * non annullato) e l'ultima nota del medico, con i turni settimanali di quelle persone. Il motivo
 * della visita e il testo delle note NON escono: restano nella scheda.
 */
export async function getPatientCareContacts(
  args: { patientId: string },
  ctx: UserContext,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Sourced<CareContacts>> {
  assertTenant(ctx);
  assertPatientAllowed(ctx, args.patientId);
  const patientId = args.patientId;
  const [reading, visit, note] = await Promise.all([
    prisma.patientParameterReading.findFirst({
      where: { patientId },
      orderBy: [{ measuredAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        measuredAt: true,
        values: true,
        authorOperatorId: true,
        authorName: true,
      },
    }),
    prisma.appointment.findFirst({
      where: {
        patientId,
        scheduledAt: { lte: new Date() },
        status: { in: ['COMPLETED', 'SCHEDULED'] },
      },
      orderBy: [{ scheduledAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        operatorId: true,
        operator: {
          select: { ruolo: true, qualifica: true, user: { select: { fullName: true } } },
        },
      },
    }),
    prisma.patientDiaryEntry.findFirst({
      where: { patientId, authorType: 'medico' },
      orderBy: [{ entryDateTime: 'desc' }, { id: 'desc' }],
      select: { id: true, entryDateTime: true, authorName: true, authorId: true },
    }),
  ]);

  // Persone coinvolte → operatori → turni (solo con le funzioni di struttura abilitate).
  const operatorIds = [
    ...new Set(
      [reading?.authorOperatorId, visit?.operatorId, note?.authorId].filter(
        (id): id is string => typeof id === 'string' && id.length > 0,
      ),
    ),
  ];
  const facility = canFacilityRead(env);
  const operators = operatorIds.length
    ? await prisma.operator.findMany({
        where: { id: { in: operatorIds } },
        select: {
          id: true,
          ruolo: true,
          qualifica: true,
          user: { select: { fullName: true } },
          schedule: { select: { id: true, data: true } },
        },
      })
    : [];
  const byId = new Map(operators.map((o) => [o.id, o]));
  const roleOf = (id: string | null | undefined) => {
    const op = id ? byId.get(id) : undefined;
    return op ? (op.ruolo ?? op.qualifica) : null;
  };

  const sources: SourceReference[] = [];
  const people = new Map<string, CarePerson>();
  const addPerson = (name: string, operatorId: string | null | undefined) => {
    if (!name || people.has(name)) return;
    const op = operatorId ? byId.get(operatorId) : undefined;
    const turni = facility && op?.schedule ? shiftsOf(op.schedule.data) : null;
    if (facility && op?.schedule) sources.push(shiftSource(op.schedule.id, `Turni di ${name}`));
    people.set(name, { name, ruolo: roleOf(operatorId), turni });
  };

  const contacts: CareContacts = {
    patientId,
    lastReading: null,
    lastVisit: null,
    lastDoctorNote: null,
    people: [],
  };
  if (reading) {
    const parametri = Object.keys((reading.values ?? {}) as Record<string, unknown>).filter(
      (k) => k !== 'note',
    );
    contacts.lastReading = {
      measuredAt: reading.measuredAt.toISOString(),
      author: reading.authorName,
      ruolo: roleOf(reading.authorOperatorId),
      parametri,
    };
    sources.unshift(
      vitalSource(
        patientId,
        reading.id,
        'Ultima rilevazione dei parametri',
        `Registrata da ${reading.authorName}`,
        reading.measuredAt.toISOString(),
      ),
    );
    addPerson(reading.authorName, reading.authorOperatorId);
  }
  if (visit) {
    const name = visit.operator.user.fullName;
    contacts.lastVisit = {
      scheduledAt: visit.scheduledAt.toISOString(),
      operator: name,
      ruolo: visit.operator.ruolo ?? visit.operator.qualifica,
      status: visit.status,
    };
    sources.push(
      appointmentSource(patientId, visit.id, `Visita con ${name}`, visit.scheduledAt.toISOString()),
    );
    addPerson(name, visit.operatorId);
  }
  if (note) {
    contacts.lastDoctorNote = { entryDateTime: note.entryDateTime, author: note.authorName };
    sources.push(
      diarySource(patientId, note.id, 'Ultima nota del medico', `Autore: ${note.authorName}`),
    );
    addPerson(note.authorName, note.authorId);
  }
  contacts.people = [...people.values()];
  const found = !!(reading || visit || note);
  gatewayAudit(
    ctx,
    'get_patient_care_contacts',
    [patientId],
    found ? 1 : 0,
    found ? 'ok' : 'empty',
    nowIso(),
  );
  return { data: found ? [contacts] : [], sourceRefs: sources, truncated: false };
}

// ── Disponibilità delle camere per tipo, con le dimissioni previste ───────────────────────────

export interface RoomInput {
  numero: string;
  tipo: string;
  stato: string;
  beds: Array<{ stato: string; assignments: Array<{ startDate: string; endDate: string | null }> }>;
}
export interface PlannedRelease {
  camera: string;
  tipo: string;
  /** Ultimo giorno di permanenza previsto (dimissione): dal giorno dopo il letto è libero. */
  data: string;
  lettiLiberati: number;
  /** true quando da quella data tutta la camera è libera. */
  cameraLibera: boolean;
}
export interface TypeAvailability {
  tipo: string;
  camere: number;
  camereOccupate: number;
  camereConLettiLiberi: number;
  letti: number;
  lettiOccupati: number;
  lettiLiberi: number;
  /** Prima camera di questo tipo che avrà almeno un letto libero. */
  prossimoLettoLibero: PlannedRelease | null;
  /** Prima camera di questo tipo che sarà interamente libera. */
  prossimaCameraLibera: PlannedRelease | null;
}

/** Calcolo puro (testabile): occupazione per tipo e prossime liberazioni previste. */
export function roomAvailability(
  rooms: RoomInput[],
  today: string,
): { perTipo: TypeAvailability[]; liberazioni: PlannedRelease[] } {
  const types = new Map<string, TypeAvailability>();
  const releases: PlannedRelease[] = [];
  for (const room of rooms.filter((r) => r.stato !== 'inattiva')) {
    const t =
      types.get(room.tipo) ??
      types
        .set(room.tipo, {
          tipo: room.tipo,
          camere: 0,
          camereOccupate: 0,
          camereConLettiLiberi: 0,
          letti: 0,
          lettiOccupati: 0,
          lettiLiberi: 0,
          prossimoLettoLibero: null,
          prossimaCameraLibera: null,
        })
        .get(room.tipo)!;
    const usable = room.beds.filter((b) => b.stato !== 'manutenzione');
    // Per ogni letto: occupato oggi? fino a quando (null = senza data prevista)?
    const states = usable.map((bed) => {
      const active = bed.assignments.filter(
        (a) => a.startDate <= today && (a.endDate === null || a.endDate >= today),
      );
      if (!active.length) return { occupied: false, until: null as string | null, open: false };
      const open = active.some((a) => a.endDate === null);
      const until = open
        ? null
        : active
            .map((a) => a.endDate!)
            .sort()
            .pop()!;
      return { occupied: true, until, open };
    });
    const occupied = states.filter((s) => s.occupied).length;
    t.camere += 1;
    t.letti += usable.length;
    t.lettiOccupati += occupied;
    t.lettiLiberi += usable.length - occupied;
    if (occupied > 0) t.camereOccupate += 1;
    if (usable.length - occupied > 0) t.camereConLettiLiberi += 1;
    const planned = states.filter((s) => s.occupied && s.until).map((s) => s.until!);
    const allPlanned =
      occupied > 0 && states.filter((s) => s.occupied).every((s) => s.until !== null);
    const roomFreeOn = allPlanned ? [...planned].sort().pop()! : null;
    for (const date of [...new Set(planned)].sort()) {
      releases.push({
        camera: room.numero,
        tipo: room.tipo,
        data: date,
        lettiLiberati: planned.filter((d) => d === date).length,
        cameraLibera: roomFreeOn === date,
      });
    }
  }
  releases.sort((a, b) => a.data.localeCompare(b.data) || a.camera.localeCompare(b.camera));
  for (const t of types.values()) {
    const mine = releases.filter((r) => r.tipo === t.tipo);
    t.prossimoLettoLibero = mine[0] ?? null;
    t.prossimaCameraLibera = mine.find((r) => r.cameraLibera) ?? null;
  }
  return {
    perTipo: [...types.values()].sort((a, b) => a.tipo.localeCompare(b.tipo)),
    liberazioni: releases.slice(0, 30),
  };
}

/** Occupazione per tipo di camera e dimissioni previste (lettura di struttura, solo conteggi). */
export async function getRoomAvailability(
  ctx: UserContext,
  env: NodeJS.ProcessEnv = process.env,
): Promise<ReturnType<typeof roomAvailability> & { source: SourceReference }> {
  assertTenant(ctx);
  if (!canFacilityRead(env))
    throw new GatewayError('forbidden', 'Funzioni di struttura non abilitate');
  const today = facilityToday();
  const rooms = await prisma.room.findMany({
    take: 500,
    orderBy: { numero: 'asc' },
    select: {
      numero: true,
      tipo: true,
      stato: true,
      beds: {
        select: {
          stato: true,
          assignments: {
            where: { OR: [{ endDate: null }, { endDate: { gte: today } }] },
            select: { startDate: true, endDate: true },
          },
        },
      },
    },
  });
  const out = roomAvailability(rooms as unknown as RoomInput[], today);
  const text = out.perTipo
    .map(
      (t) =>
        `${t.tipo}: ${t.camereOccupate}/${t.camere} camere occupate, ${t.lettiLiberi} letti liberi`,
    )
    .join('; ');
  return { ...out, source: roomOccupancySource(text, nowIso()) };
}
