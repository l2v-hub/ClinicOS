export type ConsegnaStatus = 'aperta' | 'in_corso' | 'completata';
export type ConsegnaFeedStatus = ConsegnaStatus | 'attive';
export type ConsegnaPriority = 'normale' | 'alta' | 'urgente';

export interface ConsegnaCursor {
  createdAt: Date;
  id: string;
}

export interface ConsegnaFeedQuery {
  limit: number;
  status?: ConsegnaFeedStatus;
  priority?: ConsegnaPriority;
  patientId?: string;
  q?: string;
  cursor?: ConsegnaCursor;
}

export class ConsegnaInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConsegnaInputError';
  }
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const CURSOR_TOKEN = /^[A-Za-z0-9_-]{1,1536}$/;
const STATUSES = new Set<ConsegnaFeedStatus>(['attive', 'aperta', 'in_corso', 'completata']);
const PRIORITIES = new Set<ConsegnaPriority>(['normale', 'alta', 'urgente']);
const QUERY_KEYS = new Set(['limit', 'status', 'priority', 'patientId', 'q', 'cursor']);

function single(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new ConsegnaInputError(`${field} non valido`);
  return value;
}

function fingerprint(input: Omit<ConsegnaFeedQuery, 'limit' | 'cursor'>): string {
  return JSON.stringify({
    status: input.status ?? '',
    priority: input.priority ?? '',
    patientId: input.patientId ?? '',
    q: input.q ?? '',
  });
}

function parseLimit(value: unknown): number {
  const raw = single(value, 'limit');
  if (raw === undefined) return 20;
  if (!/^[1-9]\d*$/.test(raw)) throw new ConsegnaInputError('limit non valido');
  const limit = Number(raw);
  if (!Number.isSafeInteger(limit) || limit > 20) {
    throw new ConsegnaInputError('limit deve essere compreso tra 1 e 20');
  }
  return limit;
}

export function isSafeConsegnaId(value: string): boolean {
  return SAFE_ID.test(value);
}

export function buildConsegnaTsQuery(value: string): string {
  const tokens = value
    .normalize('NFKC')
    .toLocaleLowerCase('it-IT')
    .match(/[\p{L}\p{N}]+/gu)
    ?.slice(0, 8)
    .map((token) => token.slice(0, 32));
  if (!tokens?.length) throw new ConsegnaInputError('q non contiene termini ricercabili');
  return tokens.map((token) => `${token}:*`).join(' & ');
}

export function encodeConsegnaCursor(
  cursor: ConsegnaCursor,
  filters: Omit<ConsegnaFeedQuery, 'limit' | 'cursor'>,
): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id,
      filters: fingerprint(filters),
    }),
    'utf8',
  ).toString('base64url');
}

function decodeCursor(
  value: unknown,
  filters: Omit<ConsegnaFeedQuery, 'limit' | 'cursor'>,
): ConsegnaCursor | undefined {
  const raw = single(value, 'cursor');
  if (raw === undefined) return undefined;
  if (!CURSOR_TOKEN.test(raw)) throw new ConsegnaInputError('cursor non valido');
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as {
      createdAt?: unknown;
      id?: unknown;
      filters?: unknown;
    };
    if (
      typeof parsed.createdAt !== 'string' ||
      typeof parsed.id !== 'string' ||
      typeof parsed.filters !== 'string'
    ) {
      throw new Error('shape');
    }
    const createdAt = new Date(parsed.createdAt);
    if (
      Number.isNaN(createdAt.getTime()) ||
      createdAt.toISOString() !== parsed.createdAt ||
      !SAFE_ID.test(parsed.id) ||
      parsed.filters !== fingerprint(filters)
    ) {
      throw new Error('value');
    }
    return { createdAt, id: parsed.id };
  } catch {
    throw new ConsegnaInputError('cursor non valido o non coerente con i filtri');
  }
}

export function parseConsegnaFeedQuery(query: Record<string, unknown>): ConsegnaFeedQuery {
  const unknown = Object.keys(query).find((key) => !QUERY_KEYS.has(key));
  if (unknown) throw new ConsegnaInputError(`Parametro non consentito: ${unknown}`);
  const statusRaw = single(query.status, 'status');
  if (statusRaw !== undefined && !STATUSES.has(statusRaw as ConsegnaFeedStatus)) {
    throw new ConsegnaInputError('status non valido');
  }
  const priorityRaw = single(query.priority, 'priority');
  if (priorityRaw !== undefined && !PRIORITIES.has(priorityRaw as ConsegnaPriority)) {
    throw new ConsegnaInputError('priority non valida');
  }
  const patientIdRaw = single(query.patientId, 'patientId');
  if (patientIdRaw !== undefined && !SAFE_ID.test(patientIdRaw)) {
    throw new ConsegnaInputError('patientId non valido');
  }
  const qRaw = single(query.q, 'q')?.trim();
  if (qRaw && qRaw.length > 100) throw new ConsegnaInputError('q supera 100 caratteri');
  if (qRaw) buildConsegnaTsQuery(qRaw);
  const filters = {
    ...(statusRaw ? { status: statusRaw as ConsegnaFeedStatus } : {}),
    ...(priorityRaw ? { priority: priorityRaw as ConsegnaPriority } : {}),
    ...(patientIdRaw ? { patientId: patientIdRaw } : {}),
    ...(qRaw ? { q: qRaw } : {}),
  };
  const cursor = decodeCursor(query.cursor, filters);
  return { limit: parseLimit(query.limit), ...filters, ...(cursor ? { cursor } : {}) };
}
