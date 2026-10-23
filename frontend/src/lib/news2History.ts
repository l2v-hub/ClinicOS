// Storico NEWS2 di un paziente dalle rilevazioni con data e ora (modello primario dei parametri).
import { news2, type News2Result } from './news2';
import { getCurrentOperator, getOperatorSessionEpoch } from './operatorSession';
import { fetchParameterReadings, PARAMETER_READING_SAVED_EVENT, type PatientParameterReading } from './patientParameterReadings';

export interface News2Point {
  reading: PatientParameterReading;
  result: News2Result;
}

export interface News2HistorySnapshot {
  readings: PatientParameterReading[];
  nextCursor: string | null;
  /** Cursors already consumed, including the initial page. Retained for history pagination. */
  visitedCursors: string[];
  /** The request budget ended before a complete score or the end of history. */
  verificationIncomplete?: boolean;
}

interface HistoryOptions {
  headers: HeadersInit;
  signal?: AbortSignal;
  fetcher?: typeof fetch;
  /** Internal epoch guard checked before/after every paginated request. */
  sessionEpoch?: number;
}

export const NEWS2_CONCURRENCY = 4;
export const NEWS2_MAX_PAGES = 3;
let activeRequests = 0;
const waiting: (() => void)[] = [];

async function boundedRequest<T>(read: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  assertNotAborted(signal);
  if (activeRequests >= NEWS2_CONCURRENCY) await new Promise<void>((resolve) => waiting.push(resolve));
  else activeRequests++;
  try {
    assertNotAborted(signal);
    return await read();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else activeRequests--;
  }
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Lettura annullata', 'AbortError');
}

export const NEWS2_CACHE_TTL_MS = 15_000;
export const NEWS2_CACHE_MAX_ENTRIES = 128;
interface CachedHistory {
  patientId: string;
  controller: AbortController;
  expires: number;
  promise: Promise<News2HistorySnapshot>;
}
const sharedHistory = new Map<string, CachedHistory>();
let cacheEpoch = -1;

function assertHistorySession(options: HistoryOptions) {
  assertNotAborted(options.signal);
  if (options.sessionEpoch !== undefined && options.sessionEpoch !== getOperatorSessionEpoch())
    throw new DOMException('Sessione cambiata', 'AbortError');
}

/** Invalidate before any saved-reading listeners reload; pending old responses cannot repopulate. */
export function invalidateNews2History(patientId?: string) {
  for (const [key, entry] of sharedHistory) {
    if (patientId && entry.patientId !== patientId) continue;
    entry.controller.abort();
    sharedHistory.delete(key);
  }
}
if (typeof window !== 'undefined') {
  window.addEventListener(PARAMETER_READING_SAVED_EVENT, (event) => {
    invalidateNews2History((event as CustomEvent<{ patientId?: string }>).detail?.patientId);
  });
}

function subscriberResult(entry: CachedHistory, options: HistoryOptions, epoch: number) {
  return new Promise<News2HistorySnapshot>((resolve, reject) => {
    const abort = () => reject(new DOMException('Lettura annullata', 'AbortError'));
    options.signal?.addEventListener('abort', abort, { once: true });
    entry.promise.then((history) => {
      try {
        assertHistorySession({ ...options, sessionEpoch: epoch });
        assertNotAborted(entry.controller.signal);
        // Consumers can paginate independently; never expose mutable cache-owned arrays/objects.
        resolve(structuredClone(history));
      } catch (error) { reject(error); }
    }, reject).finally(() => options.signal?.removeEventListener('abort', abort));
  });
}

/** Shared by roster and News2Chip/LazyNews2. Keys contain no credentials. */
export async function loadNews2History(
  apiUrl: string,
  patientId: string,
  options: HistoryOptions,
  previous?: News2HistorySnapshot,
): Promise<News2HistorySnapshot> {
  assertNotAborted(options.signal);
  assertHistorySession(options);
  const epoch = options.sessionEpoch ?? getOperatorSessionEpoch();
  if (cacheEpoch !== epoch) {
    invalidateNews2History();
    cacheEpoch = epoch;
  }
  // Without an authenticated session there is no cross-consumer cache reuse.
  if (previous || !getCurrentOperator())
    return readNews2History(apiUrl, patientId, { ...options, sessionEpoch: epoch }, previous);
  const key = JSON.stringify([epoch, apiUrl, patientId]);
  const existing = sharedHistory.get(key);
  if (existing && existing.expires > Date.now()) return subscriberResult(existing, options, epoch);
  if (existing) { existing.controller.abort(); sharedHistory.delete(key); }
  for (const [entryKey, entry] of sharedHistory) {
    if (entry.expires <= Date.now()) { entry.controller.abort(); sharedHistory.delete(entryKey); }
  }
  while (sharedHistory.size >= NEWS2_CACHE_MAX_ENTRIES) {
    const oldest = sharedHistory.keys().next().value!;
    sharedHistory.get(oldest)!.controller.abort();
    sharedHistory.delete(oldest);
  }
  const controller = new AbortController();
  const entry: CachedHistory = {
    patientId, controller, expires: Date.now() + NEWS2_CACHE_TTL_MS,
    promise: readNews2History(apiUrl, patientId, { ...options, signal: controller.signal, sessionEpoch: epoch }),
  };
  sharedHistory.set(key, entry);
  void entry.promise.catch(() => {
    if (sharedHistory.get(key) === entry) sharedHistory.delete(key);
  });
  return subscriberResult(entry, options, epoch);
}

/**
 * Find the latest complete observation, retaining newer partial observations (staleness).
 * Absence is verified only at the end of the history. A continuation loads one older page,
 * retaining both the history and cursor provenance for the existing “Carica precedenti”.
 */
async function readNews2History(
  apiUrl: string,
  patientId: string,
  options: HistoryOptions,
  previous?: News2HistorySnapshot,
): Promise<News2HistorySnapshot> {
  assertNotAborted(options.signal);
  const readings = [...(previous?.readings ?? [])];
  const ids = new Set(readings.map((reading) => reading.id));
  const visitedCursors = new Set(previous?.visitedCursors ?? []);
  let cursor = previous?.nextCursor ?? null;
  let pages = 0;
  if (previous && !cursor) throw new Error('Storico già completo.');
  do {
    assertHistorySession(options);
    const cursorKey = cursor ?? '';
    if (visitedCursors.has(cursorKey)) throw new Error('Paginazione dello storico non valida.');
    visitedCursors.add(cursorKey);
    const page = await boundedRequest(() => fetchParameterReadings(apiUrl, patientId, cursor ? { cursor } : {}, options), options.signal);
    pages++;
    assertHistorySession(options);
    if (
      page.readings.length > 50 ||
      (page.hasMore && (!page.nextCursor?.trim() || page.readings.length === 0)) ||
      (!page.hasMore && page.nextCursor !== null) ||
      (page.hasMore && visitedCursors.has(page.nextCursor!))
    ) {
      throw new Error('Paginazione dello storico non valida.');
    }
    for (const reading of page.readings) {
      if (
        !reading ||
        typeof reading.id !== 'string' ||
        !reading.id ||
        ids.has(reading.id) ||
        reading.patientId !== patientId ||
        typeof reading.measuredAt !== 'string' ||
        !Number.isFinite(Date.parse(reading.measuredAt)) ||
        typeof reading.authorName !== 'string' ||
        !reading.values ||
        typeof reading.values !== 'object' ||
        Array.isArray(reading.values) ||
        Object.values(reading.values).some((value) => typeof value !== 'string') ||
        (readings.length > 0 &&
          Date.parse(reading.measuredAt) > Date.parse(readings[readings.length - 1].measuredAt))
      ) {
        throw new Error('Rilevazione dello storico non valida.');
      }
      ids.add(reading.id);
      readings.push(reading);
    }
    cursor = page.hasMore ? page.nextCursor : null;
    if (previous || page.readings.some((reading) => news2(reading.values).complete)) break;
  } while (cursor && pages < NEWS2_MAX_PAGES);
  return { readings, nextCursor: cursor, visitedCursors: [...visitedCursors],
    verificationIncomplete: Boolean(cursor) && !readings.some((reading) => news2(reading.values).complete) };
}

/** Independent patient results: one failed source cannot erase another verified score. */
export async function loadRosterNews2(
  apiUrl: string,
  patientIds: string[],
  options: HistoryOptions,
): Promise<{ ids: Set<string>; unknownIds: Set<string> }> {
  const boundOptions = { ...options, sessionEpoch: getOperatorSessionEpoch() };
  assertHistorySession(boundOptions);
  const uniqueIds = [...new Set(patientIds)];
  const ids = new Set<string>();
  const unknownIds = new Set<string>();
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(NEWS2_CONCURRENCY, uniqueIds.length) }, async () => {
    while (next < uniqueIds.length) {
      assertHistorySession(boundOptions);
      const id = uniqueIds[next++];
      try {
        const history = await loadNews2History(apiUrl, id, boundOptions);
        if (latestCompleteNews2(news2Points(history.readings))) ids.add(id);
        else if (history.verificationIncomplete) unknownIds.add(id);
      } catch {
        assertHistorySession(boundOptions);
        unknownIds.add(id);
      }
    }
  }));
  assertHistorySession(boundOptions);
  return { ids, unknownIds };
}

export { PARAMETER_READING_SAVED_EVENT };

export function news2Points(readings: PatientParameterReading[]): News2Point[] {
  return readings
    .map((reading) => ({ reading, result: news2(reading.values) }))
    .sort((a, b) => b.reading.measuredAt.localeCompare(a.reading.measuredAt));
}

/** L'ultima rilevazione completa (i sette parametri misurati insieme), o null. */
export function latestCompleteNews2(points: News2Point[]): News2Point | null {
  return points.find((p) => p.result.complete) ?? null;
}

/**
 * Oltre questo tempo il punteggio va rivalutato, secondo la frequenza minima di monitoraggio RCP
 * per livello: 0 → 12 ore; 1–4 → 4–6 ore (si usa 6); singolo 3 e 5–6 → ogni ora; ≥ 7 →
 * monitoraggio continuo (si usa 1 ora per le rilevazioni manuali).
 */
export const NEWS2_STALE_MS: Record<NonNullable<News2Point['result']['risk']>, number> = {
  nessuno: 12 * 60 * 60 * 1000,
  basso: 6 * 60 * 60 * 1000,
  'basso-singolo': 60 * 60 * 1000,
  medio: 60 * 60 * 1000,
  alto: 60 * 60 * 1000,
};

/**
 * Un NEWS2 è da aggiornare se esistono rilevazioni più recenti ma incomplete (lo stato del
 * paziente può essere cambiato) o se è più vecchio della frequenza di monitoraggio del suo
 * livello: in questi casi non va mostrato come rassicurante.
 */
export function news2Staleness(
  points: News2Point[],
  latest: News2Point | null,
  now = Date.now(),
): { stale: boolean; newerIncomplete: number; ageMs: number | null } {
  if (!latest) return { stale: false, newerIncomplete: 0, ageMs: null };
  const newerIncomplete = points.filter(
    (p) => !p.result.complete && p.reading.measuredAt > latest.reading.measuredAt,
  ).length;
  const ageMs = now - new Date(latest.reading.measuredAt).getTime();
  const limit = NEWS2_STALE_MS[latest.result.risk ?? 'nessuno'];
  return { stale: newerIncomplete > 0 || ageMs > limit, newerIncomplete, ageMs };
}

/** Tono visivo del chip: dal livello di rischio NEWS2; 'none' se non calcolabile. */
export function news2Tone(
  point: News2Point | null,
): 'none' | 'ok' | 'low' | 'single' | 'medium' | 'high' {
  switch (point?.result.risk) {
    case 'nessuno':
      return 'ok';
    case 'basso':
      return 'low';
    case 'basso-singolo':
      return 'single';
    case 'medio':
      return 'medium';
    case 'alto':
      return 'high';
    default:
      return 'none';
  }
}
