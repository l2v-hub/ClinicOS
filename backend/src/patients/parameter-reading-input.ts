export const PARAMETER_KEYS = [
  'pa',
  'spo2',
  'fc',
  'temperatura',
  'dtx',
  'evacuazione',
  'note',
] as const;
export type ParameterKey = (typeof PARAMETER_KEYS)[number];
export type ParameterValues = Partial<Record<ParameterKey, string>>;
export interface ParameterReadingInput {
  requestId: string;
  measuredAt: string;
  values: ParameterValues;
}
export class ParameterReadingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const PARAMETER_PATIENT_ID = /^[A-Za-z0-9_-]{1,128}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
export function parameterDate(value: unknown): string {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(value))
    throw new ParameterReadingError('Data non valida');
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value)
    throw new ParameterReadingError('Data non valida');
  return value;
}
export function facilityToday(now = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ParameterReadingError('Richiesta non valida');
  return value as Record<string, unknown>;
}
export function parseParameterReading(value: unknown): ParameterReadingInput {
  const body = object(value);
  if (Object.keys(body).some((key) => !['requestId', 'measuredAt', 'values'].includes(key)))
    throw new ParameterReadingError('Campo non consentito');
  if (typeof body.requestId !== 'string' || !UUID.test(body.requestId))
    throw new ParameterReadingError('Identificativo richiesta non valido');
  if (typeof body.measuredAt !== 'string' || !ISO_INSTANT.test(body.measuredAt))
    throw new ParameterReadingError('Orario di rilevazione non valido');
  const instant = new Date(body.measuredAt);
  if (
    !Number.isFinite(instant.getTime()) ||
    instant.toISOString() !== body.measuredAt ||
    !/^20\d{2}/.test(body.measuredAt)
  )
    throw new ParameterReadingError('Orario di rilevazione non valido');
  const raw = object(body.values);
  if (Object.keys(raw).some((key) => !PARAMETER_KEYS.includes(key as ParameterKey)))
    throw new ParameterReadingError('Parametro non consentito');
  const values: ParameterValues = {};
  for (const key of PARAMETER_KEYS) {
    const input = raw[key];
    if (input === undefined) continue;
    if (
      typeof input !== 'string' ||
      input.length > (key === 'note' ? 2000 : key === 'evacuazione' ? 200 : 32)
    )
      throw new ParameterReadingError(`${key}: valore non valido`);
    const text = input.trim();
    if (!text) continue;
    if (key === 'pa' && !/^\d{1,3}\s*\/\s*\d{1,3}$/.test(text))
      throw new ParameterReadingError('Pressione: usa il formato 120/80');
    if (
      ['spo2', 'fc', 'temperatura', 'dtx'].includes(key) &&
      !/^\d{1,4}(?:[.,]\d{1,2})?$/.test(text)
    )
      throw new ParameterReadingError(`${key}: inserisci un numero valido`);
    if (key === 'spo2' && Number(text.replace(',', '.')) > 100)
      throw new ParameterReadingError('SpO₂ deve essere compresa tra 0 e 100');
    values[key] = text;
  }
  if (!PARAMETER_KEYS.some((key) => key !== 'note' && values[key]))
    throw new ParameterReadingError('Inserisci almeno un parametro');
  return { requestId: body.requestId, measuredAt: body.measuredAt, values };
}
export interface ReadingFilters {
  patientId: string;
  date?: string;
}
export interface ReadingPosition {
  measuredAt: string;
  id: string;
}
export function encodeReadingCursor(position: ReadingPosition, filters: ReadingFilters): string {
  return Buffer.from(JSON.stringify({ v: 1, ...filters, ...position })).toString('base64url');
}
export function parseReadingQuery(patientId: string, query: Record<string, unknown>) {
  const date =
    query.date === undefined || query.date === '' ? undefined : parameterDate(query.date);
  if (
    query.limit !== undefined &&
    (typeof query.limit !== 'string' || !/^\d{1,3}$/.test(query.limit))
  )
    throw new ParameterReadingError('Limite non valido');
  const limit = query.limit === undefined ? 50 : Number(query.limit);
  if (limit < 1 || limit > 100) throw new ParameterReadingError('Limite non valido');
  const filters = { patientId, ...(date && { date }) };
  let position: ReadingPosition | undefined;
  if (query.cursor !== undefined) {
    try {
      if (
        typeof query.cursor !== 'string' ||
        query.cursor.length > 600 ||
        !/^[\w-]+$/.test(query.cursor)
      )
        throw new Error();
      const decoded = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8'));
      if (
        decoded.v !== 1 ||
        decoded.patientId !== patientId ||
        decoded.date !== date ||
        !UUID.test(decoded.id) ||
        !ISO_INSTANT.test(decoded.measuredAt) ||
        new Date(decoded.measuredAt).toISOString() !== decoded.measuredAt
      )
        throw new Error();
      position = { id: decoded.id, measuredAt: decoded.measuredAt };
    } catch {
      throw new ParameterReadingError('Pagina dello storico non valida. Ricarica la ricerca.');
    }
  }
  return { filters, limit, position };
}
