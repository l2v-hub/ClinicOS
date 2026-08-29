export const MAX_ROOM_BEDS = 8;
export const MAX_ROOM_NOTE_LENGTH = 2_000;

const ROOM_TYPES = new Set(['singola', 'doppia', 'altra']);
const ROOM_STATUSES = new Set(['attiva', 'inattiva', 'manutenzione']);
const BED_STATUSES = new Set(['libero', 'manutenzione']);

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

type RoomType = 'singola' | 'doppia' | 'altra';
type RoomStatus = 'attiva' | 'inattiva' | 'manutenzione';
type BedStatus = 'libero' | 'manutenzione';

function fail<T>(error: string): Result<T> {
  return { ok: false, error };
}

function bodyRecord(value: unknown): Result<Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fail('Body JSON non valido');
  }
  return { ok: true, value: value as Record<string, unknown> };
}

function boundedString(
  value: unknown,
  field: string,
  max: number,
  options: { required?: boolean; trim?: boolean } = {},
): Result<string | undefined> {
  if (value === undefined) {
    return options.required ? fail(`Campo obbligatorio: ${field}`) : { ok: true, value: undefined };
  }
  if (typeof value !== 'string') return fail(`Campo ${field} non valido`);
  const normalized = options.trim ? value.trim() : value;
  if (options.required && normalized.length === 0) return fail(`Campo obbligatorio: ${field}`);
  if (normalized.length > max) return fail(`Campo ${field} troppo lungo (massimo ${max})`);
  return { ok: true, value: normalized };
}

function enumValue<T extends string>(
  value: unknown,
  field: string,
  allowed: Set<string>,
): Result<T | undefined> {
  if (value === undefined) return { ok: true, value: undefined };
  if (typeof value !== 'string' || !allowed.has(value)) return fail(`Campo ${field} non valido`);
  return { ok: true, value: value as T };
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-'))
    return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateDateRange(
  startDate: unknown,
  endDate: unknown,
): Result<{
  startDate: string;
  endDate: string | null;
}> {
  if (!isIsoDate(startDate)) return fail('Data iniziale non valida: usare YYYY-MM-DD');
  if (endDate === undefined || endDate === null) {
    return { ok: true, value: { startDate, endDate: null } };
  }
  if (!isIsoDate(endDate)) return fail('Data finale non valida: usare YYYY-MM-DD');
  if (endDate < startDate) return fail('La data finale non può precedere la data iniziale');
  return { ok: true, value: { startDate, endDate } };
}

export function assignmentLockKeys(patientId: string, bedId: string): string[] {
  return [`bed:${bedId}`, `patient:${patientId}`].sort();
}

export function previousIsoDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function parseRoomCreate(value: unknown): Result<{
  numero: string;
  tipo: RoomType;
  piano: string;
  reparto: string;
  stato: RoomStatus;
  note: string;
  bedCount: number;
}> {
  const body = bodyRecord(value);
  if (!body.ok) return body;
  const numero = boundedString(body.value.numero, 'numero', 32, { required: true, trim: true });
  const tipo = enumValue<RoomType>(body.value.tipo, 'tipo', ROOM_TYPES);
  const piano = boundedString(body.value.piano, 'piano', 64, { trim: true });
  const reparto = boundedString(body.value.reparto, 'reparto', 64, { trim: true });
  const stato = enumValue<RoomStatus>(body.value.stato, 'stato', ROOM_STATUSES);
  const note = boundedString(body.value.note, 'note', MAX_ROOM_NOTE_LENGTH);
  if (!numero.ok) return numero;
  if (!tipo.ok) return tipo;
  if (!piano.ok) return piano;
  if (!reparto.ok) return reparto;
  if (!stato.ok) return stato;
  if (!note.ok) return note;
  const resolvedType = tipo.value ?? 'singola';
  let bedCount = resolvedType === 'singola' ? 1 : 2;
  if (resolvedType === 'altra') {
    const raw = body.value.numBeds ?? 1;
    if (!Number.isInteger(raw) || (raw as number) < 1 || (raw as number) > MAX_ROOM_BEDS) {
      return fail(`Campo numBeds non valido (intero 1-${MAX_ROOM_BEDS})`);
    }
    bedCount = raw as number;
  }
  return {
    ok: true,
    value: {
      numero: numero.value!,
      tipo: resolvedType,
      piano: piano.value ?? '',
      reparto: reparto.value ?? '',
      stato: stato.value ?? 'attiva',
      note: note.value ?? '',
      bedCount,
    },
  };
}

export function parseRoomUpdate(value: unknown): Result<{
  numero?: string;
  tipo?: RoomType;
  piano?: string;
  reparto?: string;
  stato?: RoomStatus;
  note?: string;
}> {
  const body = bodyRecord(value);
  if (!body.ok) return body;
  const numero = boundedString(body.value.numero, 'numero', 32, { trim: true });
  const tipo = enumValue<RoomType>(body.value.tipo, 'tipo', ROOM_TYPES);
  const piano = boundedString(body.value.piano, 'piano', 64, { trim: true });
  const reparto = boundedString(body.value.reparto, 'reparto', 64, { trim: true });
  const stato = enumValue<RoomStatus>(body.value.stato, 'stato', ROOM_STATUSES);
  const note = boundedString(body.value.note, 'note', MAX_ROOM_NOTE_LENGTH);
  if (!numero.ok) return numero;
  if (numero.value !== undefined && numero.value.length === 0)
    return fail('Campo numero non valido');
  if (!tipo.ok) return tipo;
  if (!piano.ok) return piano;
  if (!reparto.ok) return reparto;
  if (!stato.ok) return stato;
  if (!note.ok) return note;
  return {
    ok: true,
    value: {
      numero: numero.value,
      tipo: tipo.value,
      piano: piano.value,
      reparto: reparto.value,
      stato: stato.value,
      note: note.value,
    },
  };
}

export function parseBedCreate(value: unknown): Result<{
  label: string;
  stato: BedStatus;
  note: string;
}> {
  const body = bodyRecord(value);
  if (!body.ok) return body;
  const label = boundedString(body.value.label, 'label', 16, { required: true, trim: true });
  const stato = enumValue<BedStatus>(body.value.stato, 'stato', BED_STATUSES);
  const note = boundedString(body.value.note, 'note', MAX_ROOM_NOTE_LENGTH);
  if (!label.ok) return label;
  if (!stato.ok) return stato;
  if (!note.ok) return note;
  return {
    ok: true,
    value: { label: label.value!, stato: stato.value ?? 'libero', note: note.value ?? '' },
  };
}

export function parseBedUpdate(value: unknown): Result<{
  label?: string;
  stato?: BedStatus;
  note?: string;
}> {
  const body = bodyRecord(value);
  if (!body.ok) return body;
  const label = boundedString(body.value.label, 'label', 16, { trim: true });
  const stato = enumValue<BedStatus>(body.value.stato, 'stato', BED_STATUSES);
  const note = boundedString(body.value.note, 'note', MAX_ROOM_NOTE_LENGTH);
  if (!label.ok) return label;
  if (label.value !== undefined && label.value.length === 0) return fail('Campo label non valido');
  if (!stato.ok) return stato;
  if (!note.ok) return note;
  return { ok: true, value: { label: label.value, stato: stato.value, note: note.value } };
}

export function parseAssignmentCreate(value: unknown): Result<{
  bedId: string;
  startDate: string;
  endDate: string | null;
  note: string;
}> {
  const body = bodyRecord(value);
  if (!body.ok) return body;
  const bedId = boundedString(body.value.bedId, 'bedId', 128, { required: true, trim: true });
  if (!bedId.ok) return bedId;
  const range = validateDateRange(body.value.startDate, body.value.endDate);
  if (!range.ok) return range;
  const note = boundedString(body.value.note, 'note', MAX_ROOM_NOTE_LENGTH);
  if (!note.ok) return note;
  return { ok: true, value: { bedId: bedId.value!, ...range.value, note: note.value ?? '' } };
}

export function parseAssignmentUpdate(value: unknown): Result<{
  endDate?: string | null;
  note?: string;
}> {
  const body = bodyRecord(value);
  if (!body.ok) return body;
  let endDate: string | null | undefined;
  if (body.value.endDate !== undefined) {
    if (body.value.endDate === null) endDate = null;
    else if (isIsoDate(body.value.endDate)) endDate = body.value.endDate;
    else return fail('Data finale non valida: usare YYYY-MM-DD');
  }
  const note = boundedString(body.value.note, 'note', MAX_ROOM_NOTE_LENGTH);
  if (!note.ok) return note;
  return { ok: true, value: { endDate, note: note.value } };
}
