export type NotesBox = 'all' | 'received' | 'sent' | 'unread';

export interface NotesCursor {
  createdAt: Date;
  id: string;
}

export interface NotesListQuery {
  box: NotesBox;
  limit: number;
  q?: string;
  cursor?: NotesCursor;
}

export class NotesInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotesInputError';
  }
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const CURSOR_TOKEN = /^[A-Za-z0-9_-]{1,1024}$/;

function singleQueryValue(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new NotesInputError(`${field} non valido`);
  return value;
}

function parseLimit(value: unknown): number {
  const raw = singleQueryValue(value, 'limit');
  if (raw === undefined) return 50;
  if (!/^[1-9]\d*$/.test(raw)) throw new NotesInputError('limit non valido');
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed > 50) {
    throw new NotesInputError('limit deve essere compreso tra 1 e 50');
  }
  return parsed;
}

export function encodeNotesCursor(cursor: NotesCursor): string {
  return Buffer.from(
    JSON.stringify({ createdAt: cursor.createdAt.toISOString(), id: cursor.id }),
    'utf8',
  ).toString('base64url');
}

export function decodeNotesCursor(value: unknown): NotesCursor | undefined {
  const raw = singleQueryValue(value, 'cursor');
  if (raw === undefined) return undefined;
  if (!CURSOR_TOKEN.test(raw)) throw new NotesInputError('cursor non valido');
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as {
      createdAt?: unknown;
      id?: unknown;
    };
    if (typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'string') {
      throw new Error('shape');
    }
    const createdAt = new Date(parsed.createdAt);
    if (
      Number.isNaN(createdAt.getTime()) ||
      createdAt.toISOString() !== parsed.createdAt ||
      !SAFE_ID.test(parsed.id)
    ) {
      throw new Error('value');
    }
    return { createdAt, id: parsed.id };
  } catch {
    throw new NotesInputError('cursor non valido');
  }
}

export function parseNotesListQuery(query: Record<string, unknown>): NotesListQuery {
  const boxRaw = singleQueryValue(query.box, 'box') ?? 'all';
  if (!['all', 'received', 'sent', 'unread'].includes(boxRaw)) {
    throw new NotesInputError('box non valido');
  }
  const qRaw = singleQueryValue(query.q, 'q')?.trim();
  if (qRaw && qRaw.length > 100) throw new NotesInputError('q supera 100 caratteri');
  const cursor = decodeNotesCursor(query.cursor);
  return {
    box: boxRaw as NotesBox,
    limit: parseLimit(query.limit),
    ...(qRaw ? { q: qRaw } : {}),
    ...(cursor ? { cursor } : {}),
  };
}

export function isSafeNoteId(value: string): boolean {
  return SAFE_ID.test(value);
}

/** Prefix full-text query: bounded token count/length and no PostgreSQL syntax from user input. */
export function buildNotesTsQuery(value: string): string {
  const tokens = value
    .normalize('NFKC')
    .toLocaleLowerCase('it-IT')
    .match(/[\p{L}\p{N}]+/gu)
    ?.slice(0, 8)
    .map((token) => token.slice(0, 32));
  if (!tokens?.length) throw new NotesInputError('q non contiene termini ricercabili');
  return tokens.map((token) => `${token}:*`).join(' & ');
}
