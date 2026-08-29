import { API_URL } from '../config';
import type { PatientTherapyAPI } from '../types';
import { cachedGetJson } from './cachedFetch';

export type TherapyListStatus = 'tutte' | 'attiva' | 'non_attiva';

export interface TherapyListPage {
  items: PatientTherapyAPI[];
  summary: {
    total: number;
    active: number;
    inactive: number;
  } | null;
  pageInfo: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

const PAGE_SIZE = 100;
const MAX_PAGES = 1000;

function assertPage(value: unknown): asserts value is TherapyListPage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Risposta terapie non valida');
  }
  const page = value as Partial<TherapyListPage>;
  const summary = page.summary;
  if (
    !Array.isArray(page.items) ||
    (summary !== null &&
      (!summary ||
        !Number.isSafeInteger(summary.total) ||
        !Number.isSafeInteger(summary.active) ||
        !Number.isSafeInteger(summary.inactive) ||
        summary.total < 0 ||
        summary.active < 0 ||
        summary.inactive < 0 ||
        summary.total !== summary.active + summary.inactive)) ||
    !page.pageInfo ||
    typeof page.pageInfo.hasMore !== 'boolean' ||
    (page.pageInfo.nextCursor !== null && typeof page.pageInfo.nextCursor !== 'string') ||
    (page.pageInfo.hasMore && !page.pageInfo.nextCursor)
  ) {
    throw new Error('Risposta terapie non valida');
  }
}

/**
 * Reads every bounded page before exposing data. Clinical consumers therefore never render a
 * silently truncated medication list, while each database query and HTTP payload stays bounded.
 */
export async function loadAllTherapyPages(
  patientId: string,
  status: TherapyListStatus = 'tutte',
): Promise<PatientTherapyAPI[]> {
  const items = new Map<string, PatientTherapyAPI>();
  const seenCursors = new Set<string>();
  let cursor: string | null = null;

  for (let pageNumber = 0; pageNumber < MAX_PAGES; pageNumber += 1) {
    const value = await loadTherapyPage(patientId, status, cursor);
    for (const item of value.items) {
      if (!item || typeof item.id !== 'string') throw new Error('Terapia senza identificativo');
      items.set(item.id, item);
    }
    if (!value.pageInfo.hasMore) return [...items.values()];

    const next = value.pageInfo.nextCursor!;
    if (seenCursors.has(next)) throw new Error('Paginazione terapie non valida');
    seenCursors.add(next);
    cursor = next;
  }

  throw new Error('Elenco terapie oltre il limite operativo');
}

export async function loadTherapyPage(
  patientId: string,
  status: TherapyListStatus = 'tutte',
  cursor: string | null = null,
): Promise<TherapyListPage> {
  const base = `${API_URL}/patients/${encodeURIComponent(patientId)}/therapies/page`;
  const query = new URLSearchParams({ limit: String(PAGE_SIZE), status });
  if (cursor) query.set('cursor', cursor);
  const value: unknown = await cachedGetJson(`${base}?${query.toString()}`);
  assertPage(value);
  if (cursor === null && value.summary === null) {
    throw new Error('Riepilogo terapie non disponibile');
  }
  return value;
}
