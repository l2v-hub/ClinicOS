import { AppointmentListInputError, parseIsoCalendarDate } from './list-query.js';
import type {
  CreateAppointmentInput,
  UpdateAppointmentPatch,
} from '../services/appointment-service.js';

export class AppointmentWriteInputError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = 'AppointmentWriteInputError';
  }
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const ALLOWED_STATUS = new Set(['programmato', 'in_corso', 'completato', 'annullato']);
const CREATE_FIELDS = new Set([
  'patientId',
  'operatorId',
  'data',
  'ora',
  'tipologia',
  'note',
  'durata',
  'stato',
  // Legacy actor fields are deliberately accepted then ignored: identity comes from auth.
  'operatorName',
]);
const PATCH_FIELDS = new Set(['operatorId', 'data', 'ora', 'tipologia', 'note', 'durata', 'stato']);
const MAX_BODY_CHARS = 16_384;

function objectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppointmentWriteInputError('Body JSON non valido');
  }
  const body = value as Record<string, unknown>;
  if (JSON.stringify(body).length > MAX_BODY_CHARS) {
    throw new AppointmentWriteInputError('Body appuntamento troppo grande', 413);
  }
  return body;
}

function onlyFields(body: Record<string, unknown>, allowed: Set<string>): void {
  const unknown = Object.keys(body).find((key) => !allowed.has(key));
  if (unknown) throw new AppointmentWriteInputError(`Campo non supportato: ${unknown}`);
}

function requiredString(body: Record<string, unknown>, field: string, max: number): string {
  const value = body[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppointmentWriteInputError(`${field} obbligatorio`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) throw new AppointmentWriteInputError(`${field} troppo lungo`);
  return trimmed;
}

function optionalString(
  body: Record<string, unknown>,
  field: string,
  max: number,
): string | undefined {
  if (body[field] === undefined) return undefined;
  if (typeof body[field] !== 'string') throw new AppointmentWriteInputError(`${field} non valido`);
  const value = (body[field] as string).trim();
  if (value.length > max) throw new AppointmentWriteInputError(`${field} troppo lungo`);
  return value;
}

function safeId(value: string, field: string): string {
  if (!SAFE_ID.test(value)) throw new AppointmentWriteInputError(`${field} non valido`);
  return value;
}

function time(value: string): string {
  if (!TIME.test(value)) throw new AppointmentWriteInputError('ora non valida');
  return value;
}

function calendarDate(value: string): string {
  try {
    return parseIsoCalendarDate(value, 'data');
  } catch (error) {
    if (error instanceof AppointmentListInputError) {
      throw new AppointmentWriteInputError(error.message);
    }
    throw error;
  }
}

function duration(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (value as number) < 5 || (value as number) > 480) {
    throw new AppointmentWriteInputError('durata deve essere un intero tra 5 e 480 minuti');
  }
  return value as number;
}

function status(value: string | undefined): string | undefined {
  if (value !== undefined && !ALLOWED_STATUS.has(value)) {
    throw new AppointmentWriteInputError('stato non valido');
  }
  return value;
}

export function parseAppointmentCreateBody(value: unknown): Omit<CreateAppointmentInput, 'actor'> {
  const body = objectBody(value);
  onlyFields(body, CREATE_FIELDS);
  const patientId = safeId(requiredString(body, 'patientId', 128), 'patientId');
  const operatorId = safeId(requiredString(body, 'operatorId', 128), 'operatorId');
  const data = calendarDate(requiredString(body, 'data', 10));
  const ora = time(requiredString(body, 'ora', 5));
  const tipologia = optionalString(body, 'tipologia', 100) ?? 'visita';
  if (!tipologia) throw new AppointmentWriteInputError('tipologia non valida');
  return {
    patientId,
    operatorId,
    data,
    ora,
    tipologia,
    note: optionalString(body, 'note', 2_000),
    durata: duration(body.durata),
    stato: status(optionalString(body, 'stato', 32)),
  };
}

export function parseAppointmentPatchBody(value: unknown): UpdateAppointmentPatch {
  const body = objectBody(value);
  onlyFields(body, PATCH_FIELDS);
  if (Object.keys(body).length === 0) throw new AppointmentWriteInputError('Patch vuota');
  const data = optionalString(body, 'data', 10);
  const ora = optionalString(body, 'ora', 5);
  const operatorId = optionalString(body, 'operatorId', 128);
  const tipologia = optionalString(body, 'tipologia', 100);
  if (tipologia !== undefined && !tipologia) {
    throw new AppointmentWriteInputError('tipologia non valida');
  }
  return {
    data: data === undefined ? undefined : calendarDate(data),
    ora: ora === undefined ? undefined : time(ora),
    operatorId: operatorId === undefined ? undefined : safeId(operatorId, 'operatorId'),
    tipologia,
    note: optionalString(body, 'note', 2_000),
    durata: duration(body.durata),
    stato: status(optionalString(body, 'stato', 32)),
  };
}

export function parseAppointmentId(value: string): string {
  return safeId(value, 'id');
}
