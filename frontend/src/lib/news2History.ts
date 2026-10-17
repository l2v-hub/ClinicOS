// Storico NEWS2 di un paziente dalle rilevazioni con data e ora (modello primario dei parametri).
import { news2, type News2Result } from './news2';
import { fetchParameterReadings, type PatientParameterReading } from './patientParameterReadings';

export interface News2Point {
  reading: PatientParameterReading;
  result: News2Result;
}

export interface News2HistorySnapshot {
  readings: PatientParameterReading[];
  nextCursor: string | null;
  /** Cursors already consumed, including the initial page. Retained for history pagination. */
  visitedCursors: string[];
}

interface HistoryOptions {
  headers: HeadersInit;
  signal?: AbortSignal;
  fetcher?: typeof fetch;
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Lettura annullata', 'AbortError');
}

/**
 * Find the latest complete observation, retaining newer partial observations (staleness).
 * Absence is verified only at the end of the history. A continuation loads one older page,
 * retaining both the history and cursor provenance for the existing “Carica precedenti”.
 */
export async function loadNews2History(
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
  if (previous && !cursor) throw new Error('Storico già completo.');
  do {
    assertNotAborted(options.signal);
    const cursorKey = cursor ?? '';
    if (visitedCursors.has(cursorKey)) throw new Error('Paginazione dello storico non valida.');
    visitedCursors.add(cursorKey);
    const page = await fetchParameterReadings(apiUrl, patientId, cursor ? { cursor } : {}, options);
    assertNotAborted(options.signal);
    if (
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
  } while (cursor);
  return { readings, nextCursor: cursor, visitedCursors: [...visitedCursors] };
}

/** Independent patient results: one failed source cannot erase another verified score. */
export async function loadRosterNews2(
  apiUrl: string,
  patientIds: string[],
  options: HistoryOptions,
): Promise<{ ids: Set<string>; unknownIds: Set<string> }> {
  assertNotAborted(options.signal);
  const results = await Promise.allSettled(
    patientIds.map((id) => loadNews2History(apiUrl, id, options)),
  );
  assertNotAborted(options.signal);
  const ids = new Set<string>();
  const unknownIds = new Set<string>();
  results.forEach((result, index) => {
    const id = patientIds[index];
    if (result.status === 'rejected') unknownIds.add(id);
    else if (latestCompleteNews2(news2Points(result.value.readings))) ids.add(id);
  });
  return { ids, unknownIds };
}

export { PARAMETER_READING_SAVED_EVENT } from './patientParameterReadings';

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
