import type { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { AppointmentListInputError, parseIsoCalendarDate } from '../appointments/list-query.js';
import { scheduleDoseLabel, type ScheduleInput } from '../lib/therapy-dose.js';
import { therapyWhereForDate } from './therapy-query.js';
import { hasGlobalPatientScope } from '../patients/patient-scope.js';

export class TherapyWriteInputError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = 'TherapyWriteInputError';
  }
}

export class TherapyNotDueError extends Error {
  constructor(message = 'Terapia non trovata o non prevista per questo slot') {
    super(message);
    this.name = 'TherapyNotDueError';
  }
}

export class TherapyNotFoundError extends Error {
  constructor(message = 'Terapia non trovata') {
    super(message);
    this.name = 'TherapyNotFoundError';
  }
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const FASCIA_FLAGS = {
  mattina: 'fasceMattina',
  pranzo: 'fascePranzo',
  pomeriggio: 'fascePomeriggio',
  sera: 'fasceSera',
  notte: 'fasceNotte',
} as const;
const FALLBACK_TIMES: Record<keyof typeof FASCIA_FLAGS, string> = {
  mattina: '08:00',
  pranzo: '12:00',
  pomeriggio: '16:00',
  sera: '20:00',
  notte: '22:00',
};
const ACCEPTED_FIELDS = new Set([
  'patientId',
  'therapyId',
  'date',
  'fascia',
  'motivo',
  'note',
  // Transitional display fields and legacy actor fields are accepted but never trusted.
  'farmacoNome',
  'farmacoDose',
  'farmacoVia',
  'ora',
  'operatoreId',
  'operatoreNome',
]);

export interface TherapyAdministrationInput {
  patientId: string;
  therapyId: string;
  date: string;
  fascia: keyof typeof FASCIA_FLAGS;
  motivo?: string;
  note?: string;
}

export interface AuthoritativeTherapyAdministration extends TherapyAdministrationInput {
  farmacoNome: string;
  farmacoDose: string;
  farmacoVia: string;
  ora: string;
}

function boundedString(
  body: Record<string, unknown>,
  field: string,
  max: number,
  required = false,
): string | undefined {
  const raw = body[field];
  if (raw === undefined && !required) return undefined;
  if (typeof raw !== 'string' || (required && raw.trim() === '')) {
    throw new TherapyWriteInputError(`${field} ${required ? 'obbligatorio' : 'non valido'}`);
  }
  const value = raw.trim();
  if (value.length > max) throw new TherapyWriteInputError(`${field} troppo lungo`);
  return value;
}

export function parseTherapyAdministrationBody(
  value: unknown,
  requireReason: boolean,
): TherapyAdministrationInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TherapyWriteInputError('Body JSON non valido');
  }
  const body = value as Record<string, unknown>;
  if (JSON.stringify(body).length > 16_384) {
    throw new TherapyWriteInputError('Body somministrazione troppo grande', 413);
  }
  const unknown = Object.keys(body).find((key) => !ACCEPTED_FIELDS.has(key));
  if (unknown) throw new TherapyWriteInputError(`Campo non supportato: ${unknown}`);
  const patientId = boundedString(body, 'patientId', 128, true)!;
  const therapyId = boundedString(body, 'therapyId', 128, true)!;
  if (!SAFE_ID.test(patientId) || !SAFE_ID.test(therapyId)) {
    throw new TherapyWriteInputError('Identificatore non valido');
  }
  let date: string;
  try {
    date = parseIsoCalendarDate(boundedString(body, 'date', 10, true)!, 'date');
  } catch (error) {
    if (error instanceof AppointmentListInputError) {
      throw new TherapyWriteInputError(error.message);
    }
    throw error;
  }
  const fascia = boundedString(body, 'fascia', 16, true)!;
  if (!(fascia in FASCIA_FLAGS)) throw new TherapyWriteInputError('fascia non valida');
  const motivo = boundedString(body, 'motivo', 200, requireReason);
  const note = boundedString(body, 'note', 2_000);
  return {
    patientId,
    therapyId,
    date,
    fascia: fascia as keyof typeof FASCIA_FLAGS,
    motivo,
    note,
  };
}

function isDueOnWeekday(date: string, days: string | null): boolean {
  if (!days?.trim()) return true;
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay() || 7;
  return days
    .split(',')
    .map((day) => Number(day.trim()))
    .includes(weekday);
}

export async function resolveAuthoritativeTherapy(
  tx: Prisma.TransactionClient,
  input: TherapyAdministrationInput,
  actor: Operator,
): Promise<AuthoritativeTherapyAdministration> {
  const therapy = await tx.patientTherapy.findFirst({
    where: {
      id: input.therapyId,
      patientId: input.patientId,
      ...therapyWhereForDate(input.date),
      ...(!hasGlobalPatientScope(actor.role) && { patient: { registeredById: actor.id } }),
    },
    select: {
      farmacoNome: true,
      dosaggio: true,
      viaSomministrazione: true,
      giorniSettimana: true,
      fasceMattina: true,
      fascePranzo: true,
      fascePomeriggio: true,
      fasceSera: true,
      fasceNotte: true,
      commercialStrengthValue: true,
      commercialStrengthUnit: true,
      schedules: {
        where: { fascia: input.fascia },
        take: 1,
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
  if (!isDueOnWeekday(input.date, therapy.giorniSettimana)) {
    throw new TherapyNotDueError();
  }
  const flag = FASCIA_FLAGS[input.fascia];
  const schedule = therapy.schedules[0] as ScheduleInput | undefined;
  // The read model creates slots from the fascia flags. A write must be accepted only for an
  // administration the operator could actually see in that same read model.
  if (!therapy[flag]) throw new TherapyNotDueError();
  return {
    ...input,
    farmacoNome: therapy.farmacoNome,
    farmacoDose:
      (schedule &&
        scheduleDoseLabel(
          schedule,
          therapy.commercialStrengthValue,
          therapy.commercialStrengthUnit,
        )) ||
      therapy.dosaggio,
    farmacoVia: therapy.viaSomministrazione || 'orale',
    ora: schedule?.time || FALLBACK_TIMES[input.fascia],
  };
}
