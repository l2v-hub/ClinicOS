// Phase 6 — minimal idempotency guard for classic-GUI writes that have no DB-level key
// (therapy creation, plain diary entries). A client sends a `requestId` per logical submission and
// re-sends the SAME id when it retries (double click, lost response, timeout after commit):
//
//   same actor + scope + requestId + same payload → the FIRST result is replayed (no second write)
//   same key, different payload                     → 409 (never a silent overwrite)
//   concurrent identical requests                   → serialized on the first one
//
// Scope: in-memory, per backend instance, 24 h. A DB-backed receipt (like ConsegnaCreationReceipt)
// would survive restarts/multi-instance but needs a schema change — documented residual.

import { createHash } from 'node:crypto';

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 10_000;
const REQUEST_ID = /^[A-Za-z0-9_-]{8,128}$/;

export interface StoredResult {
  status: number;
  body: unknown;
}

type Entry =
  | { hash: string; at: number; done: StoredResult }
  | { hash: string; at: number; pending: Promise<StoredResult> };

const entries = new Map<string, Entry>();

export class IdempotencyError extends Error {
  constructor(
    public readonly code: 'invalid_request_id' | 'idempotency_conflict',
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable((value as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  return JSON.stringify(value ?? null);
}

function sweep(now: number) {
  for (const [key, entry] of entries) {
    if (now - entry.at > TTL_MS) entries.delete(key);
  }
  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    if (oldest === undefined) break;
    entries.delete(oldest);
  }
}

/** Extracts and removes an optional `requestId` from a request body (never persisted as data). */
export function takeRequestId(body: unknown): {
  requestId?: string;
  rest: Record<string, unknown>;
} {
  const source = body && typeof body === 'object' ? { ...(body as Record<string, unknown>) } : {};
  const raw = source.requestId;
  delete source.requestId;
  if (raw === undefined || raw === null || raw === '') return { rest: source };
  if (typeof raw !== 'string' || !REQUEST_ID.test(raw))
    throw new IdempotencyError('invalid_request_id', 'requestId non valido', 400);
  return { requestId: raw, rest: source };
}

export async function runIdempotent(
  scope: string,
  actorId: string,
  requestId: string | undefined,
  payload: unknown,
  run: () => Promise<StoredResult>,
  now: () => number = Date.now,
): Promise<StoredResult & { replayed: boolean }> {
  if (!requestId) return { ...(await run()), replayed: false };
  const key = `${scope}:${actorId}:${requestId}`;
  const hash = createHash('sha256').update(stable(payload)).digest('hex');
  const t = now();
  sweep(t);
  const existing = entries.get(key);
  if (existing) {
    if (existing.hash !== hash)
      throw new IdempotencyError(
        'idempotency_conflict',
        'Stessa richiesta con contenuto diverso: ricarica e riprova',
        409,
      );
    const result = 'done' in existing ? existing.done : await existing.pending;
    return { ...result, replayed: true };
  }
  const pending = run();
  entries.set(key, { hash, at: t, pending });
  try {
    const done = await pending;
    // Only successful writes are remembered: a failed attempt may be retried for real.
    if (done.status >= 200 && done.status < 300) entries.set(key, { hash, at: t, done });
    else entries.delete(key);
    return { ...done, replayed: false };
  } catch (error) {
    entries.delete(key);
    throw error;
  }
}

/** Test hook. */
export function resetIdempotencyStore() {
  entries.clear();
}
