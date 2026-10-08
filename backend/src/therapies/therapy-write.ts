import type { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { AppointmentListInputError, parseIsoCalendarDate } from '../appointments/list-query.js';
import { scheduleDoseLabel, type ScheduleInput } from '../lib/therapy-dose.js';
import { therapyWhereForDate } from './therapy-query.js';
import { hasFacilityPatientScope } from '../patients/patient-scope.js';
import {
  doseForGlucose,
  InvalidDoseProtocolError,
  normalizeGlucoseScaleProtocol,
} from './glucose-scale.js';

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
  'measuredGlucose',
]);

export interface TherapyAdministrationInput {
  patientId: string;
  therapyId: string;
  date: string;
  fascia: keyof typeof FASCIA_FLAGS;
  motivo?: string;
  note?: string;
  measuredGlucose?: number;
}

export interface AuthoritativeTherapyAdministration extends TherapyAdministrationInput {
  farmacoNome: string;
  farmacoDose: string;
  farmacoVia: string;
  ora: string;
  doseContext?: {
    kind: 'blood_glucose';
    glucoseMgDl: number;
    doseUnits: number;
  };
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
  let measuredGlucose: number | undefined;
  if (body.measuredGlucose !== undefined) {
    const parsed = body.measuredGlucose;
    if (typeof parsed !== 'number' || !Number.isInteger(parsed) || parsed < 10 || parsed > 1000) {
      throw new TherapyWriteInputError('Glicemia non valida');
    }
    measuredGlucose = parsed;
  }
  return {
    patientId,
    therapyId,
    date,
    fascia: fascia as keyof typeof FASCIA_FLAGS,
    motivo,
    note,
    ...(measuredGlucose !== undefined ? { measuredGlucose } : {}),
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
  options: { requireDoseMeasurement?: boolean } = { requireDoseMeasurement: true },
): Promise<AuthoritativeTherapyAdministration> {
  const therapy = await tx.patientTherapy.findFirst({
    where: {
      id: input.therapyId,
      patientId: input.patientId,
      ...therapyWhereForDate(input.date),
      ...(!hasFacilityPatientScope(actor.role) && { patient: { registeredById: actor.id } }),
    },
    select: {
      farmacoNome: true,
      dosaggio: true,
      viaSomministrazione: true,
      giorniSettimana: true,
      doseMode: true,
      doseProtocol: true,
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
  let conditionalDose: number | null = null;
  let doseContext: AuthoritativeTherapyAdministration['doseContext'];
  if (therapy.doseMode === 'glucose_scale' && options.requireDoseMeasurement !== false) {
    if (input.measuredGlucose === undefined) {
      throw new TherapyWriteInputError(
        'Rileva la glicemia prima di confermare la somministrazione',
      );
    }
    let protocol: ReturnType<typeof normalizeGlucoseScaleProtocol>;
    try {
      protocol = normalizeGlucoseScaleProtocol(therapy.doseProtocol);
    } catch (error) {
      if (error instanceof InvalidDoseProtocolError) {
        throw new TherapyWriteInputError(
          'Schema glicemico non valido: verifica la prescrizione prima di somministrare',
          409,
        );
      }
      throw error;
    }
    conditionalDose = doseForGlucose(protocol, input.measuredGlucose);
    if (conditionalDose === null) {
      throw new TherapyWriteInputError(
        'Glicemia fuori dalle fasce prescritte: verifica la prescrizione prima di somministrare',
        409,
      );
    }
    doseContext = {
      kind: 'blood_glucose',
      glucoseMgDl: input.measuredGlucose,
      doseUnits: conditionalDose,
    };
  }
  return {
    ...input,
    farmacoNome: therapy.farmacoNome,
    farmacoDose:
      conditionalDose !== null
        ? `${conditionalDose} unità (glicemia ${input.measuredGlucose} mg/dL)`
        : therapy.doseMode === 'glucose_scale'
          ? 'Dose non determinata (schema glicemico)'
          : (schedule &&
              scheduleDoseLabel(
                schedule,
                therapy.commercialStrengthValue,
                therapy.commercialStrengthUnit,
              )) ||
            therapy.dosaggio,
    farmacoVia: therapy.viaSomministrazione || 'orale',
    ora: schedule?.time || FALLBACK_TIMES[input.fascia],
    ...(doseContext ? { doseContext } : {}),
  };
}
