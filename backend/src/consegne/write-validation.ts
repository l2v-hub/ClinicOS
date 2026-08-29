import {
  ConsegnaInputError,
  isSafeConsegnaId,
  type ConsegnaPriority,
  type ConsegnaStatus,
} from './query.js';

export interface ConsegnaCreateInput {
  pazienteId: string;
  priorita: ConsegnaPriority;
  tipo: string;
  note: string;
  scadenza: string;
  oraScadenza: string | null;
  operatoreAssegnatoId: string | null;
}
export interface ConsegnaPatchInput {
  priorita?: ConsegnaPriority;
  stato?: ConsegnaStatus;
  tipo?: string;
  note?: string;
  scadenza?: string;
  oraScadenza?: string | null;
  operatoreAssegnatoId?: string | null;
}

const CREATE_KEYS = new Set([
  'pazienteId',
  'priorita',
  'tipo',
  'note',
  'scadenza',
  'oraScadenza',
  'operatoreAssegnatoId',
]);
const PATCH_KEYS = new Set([
  'priorita',
  'stato',
  'tipo',
  'note',
  'scadenza',
  'oraScadenza',
  'operatoreAssegnatoId',
]);
const PRIORITIES = new Set<ConsegnaPriority>(['normale', 'alta', 'urgente']);
const STATUSES = new Set<ConsegnaStatus>(['aperta', 'in_corso', 'completata']);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function objectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ConsegnaInputError('Corpo richiesta non valido');
  }
  return value as Record<string, unknown>;
}

function rejectUnknown(body: Record<string, unknown>, allowed: Set<string>): void {
  const unknown = Object.keys(body).find((key) => !allowed.has(key));
  if (unknown) throw new ConsegnaInputError(`Campo non consentito: ${unknown}`);
}

function requiredId(value: unknown, field: string): string {
  if (typeof value !== 'string' || !isSafeConsegnaId(value)) {
    throw new ConsegnaInputError(`${field} non valido`);
  }
  return value;
}

function optionalId(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  return requiredId(value, field);
}

function text(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ConsegnaInputError(`${field} obbligatorio`);
  }
  const normalized = value.trim();
  if (normalized.length > max) throw new ConsegnaInputError(`${field} supera ${max} caratteri`);
  return normalized;
}

function priority(value: unknown): ConsegnaPriority {
  if (value === undefined) return 'normale';
  if (typeof value !== 'string' || !PRIORITIES.has(value as ConsegnaPriority)) {
    throw new ConsegnaInputError('priorita non valida');
  }
  return value as ConsegnaPriority;
}

function status(value: unknown): ConsegnaStatus {
  if (typeof value !== 'string' || !STATUSES.has(value as ConsegnaStatus)) {
    throw new ConsegnaInputError('stato non valido');
  }
  return value as ConsegnaStatus;
}

function date(value: unknown): string {
  if (typeof value !== 'string' || !DATE.test(value)) {
    throw new ConsegnaInputError('scadenza non valida');
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ConsegnaInputError('scadenza non valida');
  }
  return value;
}

function time(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !TIME.test(value)) {
    throw new ConsegnaInputError('oraScadenza non valida');
  }
  return value;
}

export function parseConsegnaCreateBody(value: unknown): ConsegnaCreateInput {
  const body = objectBody(value);
  rejectUnknown(body, CREATE_KEYS);
  return {
    pazienteId: requiredId(body.pazienteId, 'pazienteId'),
    priorita: priority(body.priorita),
    tipo: text(body.tipo ?? 'Monitoraggio', 'tipo', 100),
    note: text(body.note, 'note', 4_000),
    scadenza: date(body.scadenza ?? new Date().toISOString().slice(0, 10)),
    oraScadenza: time(body.oraScadenza),
    operatoreAssegnatoId: optionalId(body.operatoreAssegnatoId, 'operatoreAssegnatoId'),
  };
}

export function parseConsegnaPatchBody(value: unknown): ConsegnaPatchInput {
  const body = objectBody(value);
  rejectUnknown(body, PATCH_KEYS);
  const patch: ConsegnaPatchInput = {};
  if (body.priorita !== undefined) patch.priorita = priority(body.priorita);
  if (body.stato !== undefined) patch.stato = status(body.stato);
  if (body.tipo !== undefined) patch.tipo = text(body.tipo, 'tipo', 100);
  if (body.note !== undefined) patch.note = text(body.note, 'note', 4_000);
  if (body.scadenza !== undefined) patch.scadenza = date(body.scadenza);
  if (body.oraScadenza !== undefined) patch.oraScadenza = time(body.oraScadenza);
  if (body.operatoreAssegnatoId !== undefined) {
    patch.operatoreAssegnatoId = optionalId(body.operatoreAssegnatoId, 'operatoreAssegnatoId');
  }
  if (Object.keys(patch).length === 0) throw new ConsegnaInputError('Nessuna modifica valida');
  return patch;
}
