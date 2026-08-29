export type TherapyListStatus = 'tutte' | 'attiva' | 'non_attiva';
export type TherapyListType = 'periodica' | 'una_tantum' | 'al_bisogno';

export interface TherapyListCursor {
  createdAt: Date;
  id: string;
}

export interface TherapyListQuery {
  limit: number;
  status: TherapyListStatus;
  q?: string;
  tipo?: TherapyListType;
  data?: string;
  cursor?: TherapyListCursor;
}

export class TherapyListInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TherapyListInputError';
  }
}

interface TherapyListCursorPayload {
  v: 1;
  createdAt: string;
  id: string;
  status: TherapyListStatus;
  q?: string;
  tipo?: TherapyListType;
  data?: string;
}

type TherapyListFilters = Pick<TherapyListQuery, 'status' | 'q' | 'tipo' | 'data'>;

const QUERY_KEYS = new Set(['limit', 'status', 'q', 'tipo', 'data', 'cursor']);
const STATUSES = new Set<TherapyListStatus>(['tutte', 'attiva', 'non_attiva']);
const TYPES = new Set<TherapyListType>(['periodica', 'una_tantum', 'al_bisogno']);
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const MAX_CURSOR_LENGTH = 1024;

function scalar(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new TherapyListInputError(`${field} non valido`);
  return value;
}

function parseLimit(value: unknown): number {
  const raw = scalar(value, 'limit');
  if (raw === undefined) return 50;
  if (!/^[1-9]\d*$/.test(raw)) {
    throw new TherapyListInputError('limit deve essere un intero positivo');
  }
  const limit = Number(raw);
  if (!Number.isSafeInteger(limit) || limit > 100) {
    throw new TherapyListInputError('limit deve essere compreso tra 1 e 100');
  }
  return limit;
}

export function encodeTherapyListCursor(
  cursor: TherapyListCursor,
  filters: TherapyListFilters,
): string {
  const payload: TherapyListCursorPayload = {
    v: 1,
    createdAt: cursor.createdAt.toISOString(),
    id: cursor.id,
    status: filters.status,
    q: filters.q,
    tipo: filters.tipo,
    data: filters.data,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeTherapyListCursor(
  value: unknown,
  filters: TherapyListFilters,
): TherapyListCursor | undefined {
  const raw = scalar(value, 'cursor');
  if (raw === undefined) return undefined;
  if (!raw || raw.length > MAX_CURSOR_LENGTH || !BASE64URL.test(raw)) {
    throw new TherapyListInputError('cursor non valido');
  }

  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    if (Buffer.from(decoded, 'utf8').toString('base64url') !== raw) {
      throw new Error('cursor non canonico');
    }
    const payload = JSON.parse(decoded) as Partial<TherapyListCursorPayload>;
    const createdAt = new Date(payload.createdAt ?? '');
    if (
      payload.v !== 1 ||
      typeof payload.createdAt !== 'string' ||
      Number.isNaN(createdAt.getTime()) ||
      createdAt.toISOString() !== payload.createdAt ||
      typeof payload.id !== 'string' ||
      !SAFE_ID.test(payload.id) ||
      payload.status !== filters.status ||
      payload.q !== filters.q ||
      payload.tipo !== filters.tipo ||
      payload.data !== filters.data
    ) {
      throw new Error('payload non valido');
    }
    return { createdAt, id: payload.id };
  } catch {
    throw new TherapyListInputError('cursor non valido o non coerente con i filtri');
  }
}

export function parseTherapyListQuery(query: Record<string, unknown>): TherapyListQuery {
  const unknown = Object.keys(query).find((key) => !QUERY_KEYS.has(key));
  if (unknown) throw new TherapyListInputError(`Parametro non consentito: ${unknown}`);

  const rawStatus = scalar(query.status, 'status') ?? 'tutte';
  if (!STATUSES.has(rawStatus as TherapyListStatus)) {
    throw new TherapyListInputError('status non valido');
  }
  const status = rawStatus as TherapyListStatus;
  const q = scalar(query.q, 'q')?.trim() || undefined;
  if (q && (q.length < 2 || q.length > 80)) {
    throw new TherapyListInputError('q deve contenere da 2 a 80 caratteri');
  }
  if (q && /[%_\\]/.test(q)) {
    throw new TherapyListInputError('q contiene caratteri non consentiti');
  }
  const rawType = scalar(query.tipo, 'tipo');
  if (rawType !== undefined && !TYPES.has(rawType as TherapyListType)) {
    throw new TherapyListInputError('tipo non valido');
  }
  const tipo = rawType as TherapyListType | undefined;
  const data = scalar(query.data, 'data');
  if (data !== undefined) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
    if (!match) throw new TherapyListInputError('data non valida');
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    if (date.toISOString().slice(0, 10) !== data) {
      throw new TherapyListInputError('data non valida');
    }
  }
  const filters = {
    status,
    ...(q ? { q } : {}),
    ...(tipo ? { tipo } : {}),
    ...(data ? { data } : {}),
  };
  const cursor = decodeTherapyListCursor(query.cursor, filters);
  return { limit: parseLimit(query.limit), ...filters, ...(cursor ? { cursor } : {}) };
}
