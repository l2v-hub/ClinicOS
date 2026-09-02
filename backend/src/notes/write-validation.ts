import { NotesInputError, isSafeNoteId } from './query.js';

export type NotePriority = 'normale' | 'alta' | 'urgente';
export type NoteStatus = 'non_letta' | 'letta' | 'risolta';

export interface NoteCreateInput {
  destinatarioId: string;
  pazienteId: string | null;
  priorita: NotePriority;
  messaggio: string;
}

export interface NotePatchInput {
  destinatarioId?: string;
  pazienteId?: string | null;
  priorita?: NotePriority;
  messaggio?: string;
  stato?: NoteStatus;
}

const CREATE_KEYS = new Set([
  'autoreId',
  'autoreNome',
  'destinatarioId',
  'destinatarioNome',
  'pazienteId',
  'pazienteNome',
  'priorita',
  'messaggio',
  'stato',
]);
const PATCH_KEYS = new Set([
  'destinatarioId',
  'destinatarioNome',
  'pazienteId',
  'pazienteNome',
  'priorita',
  'messaggio',
  'stato',
]);
const PRIORITIES = new Set<NotePriority>(['normale', 'alta', 'urgente']);
const STATUSES = new Set<NoteStatus>(['non_letta', 'letta', 'risolta']);

function bodyObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new NotesInputError('Corpo richiesta non valido');
  }
  return value as Record<string, unknown>;
}

function rejectUnknown(body: Record<string, unknown>, allowed: Set<string>): void {
  const unknown = Object.keys(body).find((key) => !allowed.has(key));
  if (unknown) throw new NotesInputError(`Campo non consentito: ${unknown}`);
}

function requiredMessage(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new NotesInputError('messaggio obbligatorio');
  }
  const message = value.trim();
  if (message.length > 4_000) throw new NotesInputError('messaggio supera 4000 caratteri');
  return message;
}

function destination(value: unknown): string {
  const id = value;
  if (typeof id !== 'string' || !isSafeNoteId(id)) {
    throw new NotesInputError('destinatarioId non valido');
  }
  return id;
}

function patient(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !isSafeNoteId(value)) {
    throw new NotesInputError('pazienteId non valido');
  }
  return value;
}

function priority(value: unknown): NotePriority {
  if (value === undefined) return 'normale';
  if (typeof value !== 'string' || !PRIORITIES.has(value as NotePriority)) {
    throw new NotesInputError('priorita non valida');
  }
  return value as NotePriority;
}

function status(value: unknown): NoteStatus {
  if (typeof value !== 'string' || !STATUSES.has(value as NoteStatus)) {
    throw new NotesInputError('stato non valido');
  }
  return value as NoteStatus;
}

export function parseNoteCreateBody(value: unknown): NoteCreateInput {
  const body = bodyObject(value);
  rejectUnknown(body, CREATE_KEYS);
  return {
    destinatarioId: destination(body.destinatarioId),
    pazienteId: patient(body.pazienteId),
    priorita: priority(body.priorita),
    messaggio: requiredMessage(body.messaggio),
  };
}

export function parseNotePatchBody(value: unknown): NotePatchInput {
  const body = bodyObject(value);
  rejectUnknown(body, PATCH_KEYS);
  const patch: NotePatchInput = {};
  if (body.destinatarioId !== undefined) patch.destinatarioId = destination(body.destinatarioId);
  if (body.pazienteId !== undefined) patch.pazienteId = patient(body.pazienteId);
  if (body.priorita !== undefined) patch.priorita = priority(body.priorita);
  if (body.messaggio !== undefined) patch.messaggio = requiredMessage(body.messaggio);
  if (body.stato !== undefined) patch.stato = status(body.stato);
  if (Object.keys(patch).length === 0) throw new NotesInputError('Nessuna modifica valida');
  return patch;
}
