// Dimissione del paziente: stato del ricovero e posto letto cambiano insieme, in una sola
// transazione. È un'operazione a sé (permesso `patients.discharge`) perché nessun profilo ha sia
// il salvataggio della cartella sia la gestione dei letti: chi dimette libera soltanto il letto del
// paziente che sta dimettendo, non sposta né assegna letti.
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { facilityDate } from '../lib/facility-time.js';
import type { Operator } from '../ai/auth.js';
import { assignmentMoveLockKeys, previousIsoDate } from '../routes/room-input.js';
import { hasFacilityPatientScope } from './patient-scope.js';

export class DischargeError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}

export interface FreedBed {
  room: string;
  bed: string;
}

export interface DischargeResult {
  patientId: string;
  data: Prisma.JsonValue;
  discharge: {
    /** True when the chart already said «dimesso» and no bed was still held. */
    alreadyDischarged: boolean;
    date: string;
    freedBeds: FreedBed[];
  };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * The bed is free from the discharge day. Assignment dates are whole, inclusive days, so a stay
 * that began earlier ends the day before (the same rule a bed move applies to the bed left);
 * one that began today or lies in the future never covered a night and is removed.
 */
export async function dischargePatient(
  patientId: string,
  actor: Operator,
  today: string = facilityDate(),
): Promise<DischargeResult> {
  return prisma.$transaction(async (tx) => {
    // Same patient key the bed routes take: a concurrent assignment or move waits for the
    // discharge (or the discharge for it) and is then read below.
    for (const key of assignmentMoveLockKeys(patientId, []))
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;

    const patients = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT p.id FROM "Patient" p WHERE p.id = ${patientId}
        ${hasFacilityPatientScope(actor.role) ? Prisma.empty : Prisma.sql`AND p."registeredById" = ${actor.id}`}
      FOR UPDATE OF p`);
    if (!patients.length)
      throw new DischargeError('Paziente non trovato', 404, 'patient_not_found');

    const charts = await tx.$queryRaw<Array<{ data: Prisma.JsonValue }>>`
      SELECT data FROM "Cartella" WHERE "patientId" = ${patientId} FOR UPDATE`;
    const current = record(charts[0]?.data);

    const held = await tx.patientRoomAssignment.findMany({
      where: { patientId, OR: [{ endDate: null }, { endDate: { gte: today } }] },
      select: {
        id: true,
        startDate: true,
        bed: { select: { label: true, room: { select: { numero: true } } } },
      },
      orderBy: { startDate: 'asc' },
    });

    if (current.statoRicovero === 'dimesso' && held.length === 0)
      return {
        patientId,
        data: charts[0]!.data,
        discharge: { alreadyDischarged: true, date: today, freedBeds: [] },
      };

    const ended = held.filter((assignment) => assignment.startDate < today);
    const removed = held.filter((assignment) => assignment.startDate >= today);
    if (ended.length)
      await tx.patientRoomAssignment.updateMany({
        where: { id: { in: ended.map((assignment) => assignment.id) } },
        data: { endDate: previousIsoDate(today) },
      });
    if (removed.length)
      await tx.patientRoomAssignment.deleteMany({
        where: { id: { in: removed.map((assignment) => assignment.id) } },
      });

    const freedBeds = held.map((assignment) => ({
      room: assignment.bed.room.numero,
      bed: assignment.bed.label,
    }));
    const { cameraNumero: _room, lettoNumero: _bed, ...rest } = current;
    const previous = record(current.dimissioneRegistrata);
    const data = {
      ...rest,
      statoRicovero: 'dimesso',
      // Who discharged, when and from which bed: the trace stays in the chart even when a
      // same-day bed assignment is removed.
      dimissioneRegistrata: {
        data: today,
        registrataIl: new Date().toISOString(),
        operatoreId: actor.id,
        operatore: actor.name ?? '',
        posti: freedBeds,
        // What «Annulla dimissione» goes back to. A chart that already said «dimesso» (status set
        // by an older plain save) keeps the regime recorded then, if any.
        statoPrecedente:
          typeof current.statoRicovero === 'string' && current.statoRicovero !== 'dimesso'
            ? current.statoRicovero
            : typeof previous.statoPrecedente === 'string'
              ? previous.statoPrecedente
              : 'ricoverato',
      },
    };
    const saved = await tx.cartella.upsert({
      where: { patientId },
      create: { patientId, data: data as Prisma.InputJsonObject },
      update: { data: data as Prisma.InputJsonObject },
    });
    return {
      patientId,
      data: saved.data,
      discharge: { alreadyDischarged: false, date: today, freedBeds },
    };
  });
}

const STAY_FIELDS = ['statoRicovero', 'cameraNumero', 'lettoNumero'] as const;

/**
 * «Dimesso» is entered and left only through the discharge commands. A plain chart save sends the
 * whole chart, often from a copy read earlier (another workstation, a form opened before the
 * discharge): without this it would silently bring the patient back among the present, or mark
 * one as discharged while the bed stays taken. The rest of the save goes through unchanged.
 * Call only after locking the patient and the existing Cartella row in the write transaction.
 */
export function preserveDischargeState(
  current: unknown,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const stored = record(current);
  const output = { ...incoming };
  const keep = (key: string) => {
    if (Object.hasOwn(stored, key)) output[key] = stored[key];
    else delete output[key];
  };
  // The trace is written by the commands only: never taken from a client.
  keep('dimissioneRegistrata');
  // A chart being created has no stay to protect.
  if (current === undefined || current === null) return output;
  if (stored.statoRicovero === 'dimesso') for (const key of STAY_FIELDS) keep(key);
  else if (output.statoRicovero === 'dimesso') keep('statoRicovero');
  return output;
}

export interface UndoDischargeResult {
  patientId: string;
  data: Prisma.JsonValue;
  undo: { alreadyPresent: boolean; status: string };
}

/** «Annulla dimissione»: back to the regime before the discharge. The bed is not reassigned. */
export async function undoDischarge(
  patientId: string,
  actor: Operator,
): Promise<UndoDischargeResult> {
  return prisma.$transaction(async (tx) => {
    const patients = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT p.id FROM "Patient" p WHERE p.id = ${patientId}
        ${hasFacilityPatientScope(actor.role) ? Prisma.empty : Prisma.sql`AND p."registeredById" = ${actor.id}`}
      FOR UPDATE OF p`);
    if (!patients.length)
      throw new DischargeError('Paziente non trovato', 404, 'patient_not_found');
    const charts = await tx.$queryRaw<Array<{ data: Prisma.JsonValue }>>`
      SELECT data FROM "Cartella" WHERE "patientId" = ${patientId} FOR UPDATE`;
    const current = record(charts[0]?.data);
    if (current.statoRicovero !== 'dimesso')
      return {
        patientId,
        data: charts[0]?.data ?? {},
        undo: {
          alreadyPresent: true,
          status: typeof current.statoRicovero === 'string' ? current.statoRicovero : '',
        },
      };
    const trace = record(current.dimissioneRegistrata);
    const status =
      typeof trace.statoPrecedente === 'string' && trace.statoPrecedente !== 'dimesso'
        ? trace.statoPrecedente
        : 'ricoverato';
    const data = {
      ...current,
      statoRicovero: status,
      // The discharge stays on record, marked as undone.
      ...(Object.keys(trace).length
        ? {
            dimissioneRegistrata: {
              ...trace,
              annullataIl: new Date().toISOString(),
              annullataDaId: actor.id,
              annullataDa: actor.name ?? '',
            },
          }
        : {}),
    };
    const saved = await tx.cartella.update({
      where: { patientId },
      data: { data: data as Prisma.InputJsonObject },
    });
    return { patientId, data: saved.data, undo: { alreadyPresent: false, status } };
  });
}
