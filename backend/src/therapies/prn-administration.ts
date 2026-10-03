// PRN («al bisogno») administration — UX cycle 2026-10-03, owner-approved.
//
// A PRN prescription has no band: it can be given several times a day, so each dose is an
// append-only PrnAdministration row (the scheduled one-dose-per-band invariant of
// MedicationAdministration is untouched). Same safety rules as the scheduled flow:
// - actor identity from the authenticated operator only;
// - drug, dose and route resolved from the prescription; the time is the server time;
// - the client sends only patient, therapy, the mandatory indication (+ optional note) and an
//   idempotency key: a retried tap with the same requestId replays the first record.

import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { prisma } from '../lib/prisma.js';
import { scheduleDoseLabel, type ScheduleInput } from '../lib/therapy-dose.js';
import { hasGlobalPatientScope } from '../patients/patient-scope.js';
import { facilityToday } from '../patients/parameter-reading-input.js';
import {
  TherapyNotDueError,
  TherapyNotFoundError,
  TherapyWriteInputError,
} from './therapy-write.js';

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const REQUEST_ID = /^[A-Za-z0-9_-]{8,128}$/;
const ACCEPTED_FIELDS = new Set([
  'patientId',
  'therapyId',
  'indicazione',
  'note',
  'requestId',
  'confirmed',
]);

/** Same requestId reused for a different dose: never silently merged. */
export class PrnIdempotencyConflictError extends Error {
  constructor() {
    super('requestId già usato per una somministrazione diversa');
    this.name = 'PrnIdempotencyConflictError';
  }
}

export interface PrnAdministrationInput {
  patientId: string;
  therapyId: string;
  indicazione: string;
  note?: string;
  requestId: string;
}

export interface PrnAdministrationDto {
  id: string;
  therapyId: string | null;
  patientId: string;
  drugName: string;
  dosage: string;
  route: string;
  date: string;
  administeredAt: string;
  administeredBy: string;
  indication: string;
  note: string | null;
}

type PrnRow = Prisma.PrnAdministrationGetPayload<object>;

export function prnDto(row: PrnRow): PrnAdministrationDto {
  return {
    id: row.id,
    therapyId: row.therapyId,
    patientId: row.patientId,
    drugName: row.farmacoNome,
    dosage: row.farmacoDose,
    route: row.farmacoVia,
    date: row.date,
    administeredAt: row.administeredAt.toISOString(),
    administeredBy: row.operatoreNome,
    indication: row.indicazione,
    note: row.note,
  };
}

function text(body: Record<string, unknown>, field: string, max: number, required: boolean) {
  const raw = body[field];
  if (raw === undefined || raw === null) {
    if (required) throw new TherapyWriteInputError(`${field} obbligatorio`);
    return undefined;
  }
  if (typeof raw !== 'string') throw new TherapyWriteInputError(`${field} non valido`);
  // Clinical text is stored as written (never rewritten); only a blank value is refused.
  if (required && raw.trim() === '') throw new TherapyWriteInputError(`${field} obbligatorio`);
  if (raw.length > max) throw new TherapyWriteInputError(`${field} troppo lungo`);
  return raw.trim() === '' ? undefined : raw;
}

export function parsePrnAdministrationBody(value: unknown): PrnAdministrationInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TherapyWriteInputError('Body JSON non valido');
  }
  const body = value as Record<string, unknown>;
  if (JSON.stringify(body).length > 16_384) {
    throw new TherapyWriteInputError('Body somministrazione troppo grande', 413);
  }
  const unknown = Object.keys(body).find((key) => !ACCEPTED_FIELDS.has(key));
  if (unknown) throw new TherapyWriteInputError(`Campo non supportato: ${unknown}`);
  const patientId = text(body, 'patientId', 128, true)!;
  const therapyId = text(body, 'therapyId', 128, true)!;
  if (!SAFE_ID.test(patientId) || !SAFE_ID.test(therapyId)) {
    throw new TherapyWriteInputError('Identificatore non valido');
  }
  const requestId = text(body, 'requestId', 128, true)!;
  if (!REQUEST_ID.test(requestId)) throw new TherapyWriteInputError('requestId non valido');
  const indicazione = text(body, 'indicazione', 500, true)!;
  const note = text(body, 'note', 2_000, false);
  return { patientId, therapyId, indicazione, note, requestId };
}

function scopeWhere(actor: Operator): Prisma.PatientTherapyWhereInput {
  return hasGlobalPatientScope(actor.role) ? {} : { patient: { registeredById: actor.id } };
}

function sameDose(row: PrnRow, input: PrnAdministrationInput): boolean {
  return (
    row.therapyId === input.therapyId &&
    row.patientId === input.patientId &&
    row.indicazione === input.indicazione &&
    (row.note ?? undefined) === input.note
  );
}

/**
 * Records one PRN dose now. Returns the stored row and whether it was a replay of an earlier
 * request with the same requestId (idempotent retry → no second dose).
 */
export async function recordPrnAdministration(
  body: unknown,
  actor: Operator,
  now: () => Date = () => new Date(),
): Promise<{ record: PrnAdministrationDto; replayed: boolean }> {
  const input = parsePrnAdministrationBody(body);
  const replay = async () => {
    const existing = await prisma.prnAdministration.findUnique({
      where: { operatoreId_requestId: { operatoreId: actor.id, requestId: input.requestId } },
    });
    if (!existing) return null;
    if (!sameDose(existing, input)) throw new PrnIdempotencyConflictError();
    return { record: prnDto(existing), replayed: true };
  };
  const earlier = await replay();
  if (earlier) return earlier;

  const at = now();
  const date = facilityToday(at);
  try {
    const row = await prisma.$transaction(
      async (tx) => {
        const therapy = await tx.patientTherapy.findFirst({
          where: { id: input.therapyId, patientId: input.patientId, ...scopeWhere(actor) },
          select: {
            tipo: true,
            stato: true,
            dataInizio: true,
            dataFine: true,
            farmacoNome: true,
            dosaggio: true,
            viaSomministrazione: true,
            commercialStrengthValue: true,
            commercialStrengthUnit: true,
            schedules: {
              take: 1,
              orderBy: { time: 'asc' },
              select: {
                fascia: true,
                time: true,
                quantityNumerator: true,
                quantityDenominator: true,
                administrationUnit: true,
              },
            },
          },
        });
        if (!therapy) throw new TherapyNotFoundError();
        if (
          therapy.tipo !== 'al_bisogno' ||
          therapy.stato !== 'attiva' ||
          therapy.dataInizio > date ||
          (therapy.dataFine !== null && therapy.dataFine < date)
        ) {
          throw new TherapyNotDueError('Terapia al bisogno non attiva oggi');
        }
        const schedule = therapy.schedules[0] as ScheduleInput | undefined;
        const dose =
          (schedule &&
            scheduleDoseLabel(
              schedule,
              therapy.commercialStrengthValue,
              therapy.commercialStrengthUnit,
            )) ||
          therapy.dosaggio ||
          '';
        return tx.prnAdministration.create({
          data: {
            therapyId: input.therapyId,
            patientId: input.patientId,
            farmacoNome: therapy.farmacoNome,
            farmacoDose: dose,
            farmacoVia: therapy.viaSomministrazione || 'orale',
            date,
            administeredAt: at,
            indicazione: input.indicazione,
            note: input.note ?? null,
            operatoreId: actor.id,
            operatoreNome: actor.name || actor.id,
            requestId: input.requestId,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return { record: prnDto(row), replayed: false };
  } catch (error) {
    // Two concurrent submits with the same key: the loser replays the winner's record.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2002' || error.code === 'P2034')
    ) {
      const winner = await replay();
      if (winner) return winner;
    }
    throw error;
  }
}

/** PRN doses of one patient on one facility day (newest first), scoped like the slot reads. */
export async function listPrnAdministrations(
  patientId: string,
  date: string,
  actor: Operator,
): Promise<PrnAdministrationDto[]> {
  const rows = await prisma.prnAdministration.findMany({
    where: {
      patientId,
      date,
      ...(!hasGlobalPatientScope(actor.role) && { patient: { registeredById: actor.id } }),
    },
    orderBy: [{ administeredAt: 'desc' }, { id: 'desc' }],
    take: 200,
  });
  return rows.map(prnDto);
}
