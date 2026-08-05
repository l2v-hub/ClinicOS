// SPEC-015 T023 (US4): shared appointment service — the ONE business layer used by BOTH the
// traditional UI REST routes (routes/appointments.ts) and the Agnos AI actions (FR-007: no
// duplicated business logic). Slots are 30 minutes: same operator + same date/time = conflict.
//
// Delete policy (FR-008/FR-010): deletion exists ONLY for the traditional UI button. It is
// exported exclusively as `uiOnlyDeleteAppointment` and NO module under backend/src/ai/ may
// import it — the AI path has create/update only, by construction.

import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export class SlotConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SlotConflictError';
  }
}
export class AppointmentNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppointmentNotFoundError';
  }
}

/** UI-facing DTO: the Prisma model mapped to the agenda's date/time/tipologia vocabulary. */
export interface AppointmentDTO {
  id: string;
  patientId: string;
  patientName: string | null; // "Cognome, Nome" — the agenda card label
  operatorId: string;
  operatorName: string | null;
  data: string; // YYYY-MM-DD (local)
  ora: string; // HH:MM (local)
  durata: number; // minutes
  tipologia: string; // stored in Appointment.reason
  note: string; // stored in Appointment.notes
  stato: 'programmato' | 'completato' | 'annullato';
}

export interface CreateAppointmentInput {
  patientId: string;
  operatorId: string;
  data: string; // YYYY-MM-DD
  ora: string; // HH:MM
  tipologia: string;
  note?: string;
  durata?: number;
  stato?: string; // UI status ('programmato' | 'in_corso' | 'completato' | 'annullato')
  /** Display name used when the operator row must be provisioned on the fly. */
  operatorName?: string;
}

export interface UpdateAppointmentPatch {
  data?: string;
  ora?: string;
  tipologia?: string;
  note?: string;
  durata?: number;
  stato?: string;
  operatorId?: string;
}

// ── date/status mapping ──────────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

/** Combine agenda date+time (server-local, symmetric with dataOraFrom). */
export function toScheduledAt(data: string, ora: string): Date {
  if (!DATE_RE.test(data)) throw new Error(`Data non valida: ${data} (atteso YYYY-MM-DD)`);
  if (!TIME_RE.test(ora)) throw new Error(`Ora non valida: ${ora} (atteso HH:MM)`);
  return new Date(`${data}T${ora}:00`);
}

function dataOraFrom(dt: Date): { data: string; ora: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    data: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
    ora: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
  };
}

// UI stato → Prisma AppointmentStatus ('in_corso' has no DB equivalent → SCHEDULED).
const STATUS_TO_DB: Record<string, 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'> = {
  programmato: 'SCHEDULED',
  in_corso: 'SCHEDULED',
  completato: 'COMPLETED',
  annullato: 'CANCELLED',
};
const STATUS_TO_UI: Record<string, AppointmentDTO['stato']> = {
  SCHEDULED: 'programmato',
  COMPLETED: 'completato',
  CANCELLED: 'annullato',
  NO_SHOW: 'annullato',
};

type AppointmentRow = {
  id: string;
  patientId: string;
  operatorId: string;
  scheduledAt: Date;
  durationMinutes: number;
  reason: string | null;
  notes: string | null;
  status: string;
  patient?: { firstName: string; lastName: string } | null;
  operator?: { user?: { fullName: string } | null } | null;
};

function toDTO(row: AppointmentRow): AppointmentDTO {
  const { data, ora } = dataOraFrom(row.scheduledAt);
  return {
    id: row.id,
    patientId: row.patientId,
    patientName: row.patient ? `${row.patient.lastName}, ${row.patient.firstName}` : null,
    operatorId: row.operatorId,
    operatorName: row.operator?.user?.fullName ?? null,
    data,
    ora,
    durata: row.durationMinutes,
    tipologia: row.reason ?? '',
    note: row.notes ?? '',
    stato: STATUS_TO_UI[row.status] ?? 'programmato',
  };
}

const INCLUDE = {
  patient: { select: { firstName: true, lastName: true } },
  operator: { select: { user: { select: { fullName: true } } } },
} as const;

// ── operator bridge ──────────────────────────────────────────────────────────
//
// The UI's operator ids ('op1'…) are client-side mock identities while Appointment.operatorId /
// createdByUserId are Restrict FKs. To persist appointments without schema changes or a full
// operator-management rework, an unknown operator id is provisioned on first use as a lightweight
// Operator (+ backing User) row that PRESERVES the UI id, so agenda filtering keeps working.

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

async function ensureOperator(
  operatorId: string,
  displayName?: string,
): Promise<{ id: string; userId: string }> {
  const existing = await prisma.operator.findUnique({
    where: { id: operatorId },
    select: { id: true, userId: true },
  });
  if (existing) return existing;
  // Provisioning avviene fuori da qualunque lock (chiamato prima che createAppointment/
  // updateAppointment entrino nella transazione con pg_advisory_xact_lock, per non tenere il
  // lock durante una query non correlata allo slot). Due richieste concorrenti per lo stesso
  // operatorId possono quindi arrivare qui entrambe con existing === null: il secondo upsert
  // puo' vedere l'unique constraint su email/id gia' soddisfatto dal primo e fallire invece di
  // aggiornare — si ripiega su una rilettura anziche' propagare l'errore.
  let user;
  try {
    user = await prisma.user.upsert({
      where: { email: `${operatorId}@clinicos.local` },
      update: {},
      create: {
        email: `${operatorId}@clinicos.local`,
        passwordHash: 'UI_OPERATOR_NOT_A_REAL_HASH',
        fullName: displayName?.trim() || operatorId,
        role: 'OPERATOR',
      },
    });
  } catch (err) {
    if (!isUniqueConstraintError(err)) throw err;
    user = await prisma.user.findUniqueOrThrow({
      where: { email: `${operatorId}@clinicos.local` },
    });
  }
  try {
    return await prisma.operator.upsert({
      where: { id: operatorId },
      update: {},
      create: { id: operatorId, userId: user.id },
      select: { id: true, userId: true },
    });
  } catch (err) {
    if (!isUniqueConstraintError(err)) throw err;
    return prisma.operator.findUniqueOrThrow({
      where: { id: operatorId },
      select: { id: true, userId: true },
    });
  }
}

// ── read ─────────────────────────────────────────────────────────────────────

export async function listAppointments(
  filter: { date?: string; operatorId?: string } = {},
): Promise<AppointmentDTO[]> {
  const where: Record<string, unknown> = {};
  if (filter.date) {
    if (!DATE_RE.test(filter.date))
      throw new Error(`Data non valida: ${filter.date} (atteso YYYY-MM-DD)`);
    const from = new Date(`${filter.date}T00:00:00`);
    const to = new Date(from.getTime() + 24 * 60 * 60_000);
    where.scheduledAt = { gte: from, lt: to };
  }
  if (filter.operatorId) where.operatorId = filter.operatorId;
  const rows = await prisma.appointment.findMany({
    where,
    orderBy: { scheduledAt: 'asc' },
    include: INCLUDE,
    take: 1000,
  });
  return rows.map(toDTO);
}

// A regular PrismaClient query and a `tx` handed out by `prisma.$transaction(async (tx) => ...)`
// expose the same model delegates, so the conflict query can run on either — the create/update
// paths below reuse it INSIDE their lock transaction (`tx`) instead of the standalone client.
type QueryClient = typeof prisma | Prisma.TransactionClient;

async function findConflictWith(
  client: QueryClient,
  operatorId: string,
  data: string,
  ora: string,
  excludeId?: string,
): Promise<AppointmentDTO | null> {
  const row = await client.appointment.findFirst({
    where: {
      operatorId,
      scheduledAt: toScheduledAt(data, ora),
      status: { not: 'CANCELLED' },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: INCLUDE,
  });
  return row ? toDTO(row) : null;
}

/** 30-min slot conflict: same operator, same date/time, not cancelled. Reused by the AI preview. */
export async function findConflict(
  operatorId: string,
  data: string,
  ora: string,
  excludeId?: string,
): Promise<AppointmentDTO | null> {
  return findConflictWith(prisma, operatorId, data, ora, excludeId);
}

/** Locate the appointment an update command refers to ("l'appuntamento delle 15" of a patient). */
export async function findAppointmentAt(
  patientId: string,
  data: string,
  ora: string,
): Promise<AppointmentDTO | null> {
  const row = await prisma.appointment.findFirst({
    where: { patientId, scheduledAt: toScheduledAt(data, ora), status: { not: 'CANCELLED' } },
    include: INCLUDE,
  });
  return row ? toDTO(row) : null;
}

// ── create / update (shared UI + AI) ────────────────────────────────────────

export async function createAppointment(input: CreateAppointmentInput): Promise<AppointmentDTO> {
  const scheduledAt = toScheduledAt(input.data, input.ora);

  // ensureOperator provisions the User/Operator rows on first use (idempotent upsert) and is
  // needed regardless of whether the slot turns out to be free — it stays OUTSIDE the lock
  // transaction below so its writes commit even if the conflict check subsequently rejects the
  // request, and so the (unrelated) operator-provisioning path never holds the slot's advisory
  // lock longer than necessary.
  const operator = await ensureOperator(input.operatorId, input.operatorName);

  // Conflict check + create are one atomic unit: without a lock, two concurrent requests for the
  // same operator+slot can both pass the conflict check before either commits. A Postgres
  // advisory lock keyed on operatorId+scheduledAt (held for the transaction only, no schema
  // change) serializes them so the second request re-reads post-commit state and is rejected.
  const lockKey = `${operator.id}|${scheduledAt.toISOString()}`;
  const row = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const conflict = await findConflictWith(tx, input.operatorId, input.data, input.ora);
    if (conflict) {
      throw new SlotConflictError(
        `Slot già occupato: l'operatore ha già un appuntamento il ${input.data} alle ${input.ora}.`,
      );
    }

    return tx.appointment.create({
      data: {
        patientId: input.patientId,
        operatorId: operator.id,
        createdByUserId: operator.userId,
        scheduledAt,
        durationMinutes: input.durata && input.durata > 0 ? input.durata : 30,
        reason: input.tipologia || 'visita',
        notes: input.note ?? null,
        status: STATUS_TO_DB[input.stato ?? 'programmato'] ?? 'SCHEDULED',
      },
      include: INCLUDE,
    });
  });
  return toDTO(row);
}

export async function updateAppointment(
  id: string,
  patch: UpdateAppointmentPatch,
): Promise<AppointmentDTO> {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) throw new AppointmentNotFoundError(`Appuntamento non trovato: ${id}`);

  const current = dataOraFrom(existing.scheduledAt);
  const data = patch.data ?? current.data;
  const ora = patch.ora ?? current.ora;
  const operatorId = patch.operatorId ?? existing.operatorId;
  if (patch.operatorId && patch.operatorId !== existing.operatorId)
    await ensureOperator(patch.operatorId);

  const slotChanged =
    data !== current.data || ora !== current.ora || operatorId !== existing.operatorId;

  const scheduledAt = toScheduledAt(data, ora);

  // Conflict check + update are one atomic unit whenever the slot actually moves — same
  // advisory-lock pattern as createAppointment, keyed on the DESTINATION operator+slot so a
  // concurrent create/update landing on that same slot is serialized against this one. When the
  // slot is unchanged there is nothing to race against, so the lock/check is skipped (identical
  // to prior behaviour) and the transaction only wraps the update itself.
  const row = await prisma.$transaction(async (tx) => {
    if (slotChanged) {
      const lockKey = `${operatorId}|${scheduledAt.toISOString()}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      const conflict = await findConflictWith(tx, operatorId, data, ora, id);
      if (conflict) {
        throw new SlotConflictError(
          `Slot già occupato: l'operatore ha già un appuntamento il ${data} alle ${ora}.`,
        );
      }
    }

    return tx.appointment.update({
      where: { id },
      data: {
        scheduledAt,
        operatorId,
        ...(patch.durata !== undefined ? { durationMinutes: patch.durata } : {}),
        ...(patch.tipologia !== undefined ? { reason: patch.tipologia } : {}),
        ...(patch.note !== undefined ? { notes: patch.note } : {}),
        ...(patch.stato !== undefined ? { status: STATUS_TO_DB[patch.stato] ?? 'SCHEDULED' } : {}),
      },
      include: INCLUDE,
    });
  });
  return toDTO(row);
}

// ── delete: TRADITIONAL UI ONLY ─────────────────────────────────────────────
//
// FR-008/FR-010: this export is reserved for the DELETE /appointments/:id route behind the UI
// button. It is intentionally named `uiOnlyDeleteAppointment` and MUST NOT be imported by any
// module under backend/src/ai/ (asserted by unit test): Agnos has no delete path, by construction.

export async function uiOnlyDeleteAppointment(id: string): Promise<boolean> {
  const existing = await prisma.appointment.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;
  await prisma.appointment.delete({ where: { id } });
  return true;
}
