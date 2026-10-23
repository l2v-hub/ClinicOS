import { API_URL } from '../config';
import type { PatientTherapyAPI } from '../types';
import { cachedGetJson, invalidateCachedGet } from './cachedFetch';

export type TherapyListStatus = 'tutte' | 'attiva' | 'non_attiva';
export type TherapyListType = 'periodica' | 'una_tantum' | 'al_bisogno';

export interface TherapyListFilters {
  q?: string;
  tipo?: TherapyListType;
  data?: string;
}

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
    page.items.length > PAGE_SIZE ||
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
    (page.pageInfo.hasMore
      ? !page.pageInfo.nextCursor || page.items.length === 0
      : page.pageInfo.nextCursor !== null)
  ) {
    throw new Error('Risposta terapie non valida');
  }
}

/**
 * Reads every bounded page before exposing data. Clinical consumers therefore never render a
 * silently truncated medication list, while each database query and HTTP payload stays bounded.
 * Patient identity and state totals also apply to emergency-print consumers.
 */
export async function loadAllTherapyPages(
  patientId: string,
  status: TherapyListStatus = 'tutte',
): Promise<PatientTherapyAPI[]> {
  const items = new Map<string, PatientTherapyAPI>();
  const seenCursors = new Set<string>();
  let cursor: string | null = null;
  let expectedTotal = 0;
  let expectedActive = 0;
  let expectedInactive = 0;

  try {
    for (let pageNumber = 0; pageNumber < MAX_PAGES; pageNumber += 1) {
      const value = await loadTherapyPage(patientId, status, cursor);
      if (cursor === null) {
        expectedTotal = value.summary!.total;
        expectedActive = value.summary!.active;
        expectedInactive = value.summary!.inactive;
        if (expectedTotal > MAX_PAGES * PAGE_SIZE)
          throw new Error('Elenco terapie oltre il limite operativo');
        if (
          (status === 'attiva' && expectedInactive !== 0) ||
          (status === 'non_attiva' && expectedActive !== 0)
        )
          throw new Error('Riepilogo terapie non valido');
      }
      if (
        cursor !== null &&
        value.summary &&
        (value.summary.total !== expectedTotal ||
          value.summary.active !== expectedActive ||
          value.summary.inactive !== expectedInactive)
      )
        throw new Error('Riepilogo terapie cambiato: riprovare');
      for (const item of value.items) {
        if (
          !item ||
          typeof item.id !== 'string' ||
          !item.id ||
          item.patientId !== patientId ||
          !['attiva', 'sospesa', 'conclusa'].includes(item.stato) ||
          items.has(item.id) ||
          (status === 'attiva' && item.stato !== 'attiva') ||
          (status === 'non_attiva' && item.stato === 'attiva')
        )
          throw new Error('Elenco terapie non valido: riprovare');
        items.set(item.id, item);
      }
      if (!value.pageInfo.hasMore) {
        const active = [...items.values()].filter((item) => item.stato === 'attiva').length;
        if (
          items.size !== expectedTotal ||
          active !== expectedActive ||
          items.size - active !== expectedInactive
        )
          throw new Error('Elenco terapie incompleto: riprovare');
        return [...items.values()];
      }

      const next = value.pageInfo.nextCursor!;
      if (seenCursors.has(next)) throw new Error('Paginazione terapie non valida');
      seenCursors.add(next);
      cursor = next;
    }

    throw new Error('Elenco terapie oltre il limite operativo');
  } catch (error) {
    // A valid HTTP envelope can still be an incomplete clinical snapshot. Do not replay
    // that rejected cached page when the operator explicitly retries emergency print.
    invalidateCachedGet(`${API_URL}/patients/${encodeURIComponent(patientId)}/therapies/page`);
    throw error;
  }
}

export async function loadTherapyPage(
  patientId: string,
  status: TherapyListStatus = 'tutte',
  cursor: string | null = null,
  filters: TherapyListFilters = {},
): Promise<TherapyListPage> {
  const base = `${API_URL}/patients/${encodeURIComponent(patientId)}/therapies/page`;
  const query = new URLSearchParams({ limit: String(PAGE_SIZE), status });
  if (filters.q) query.set('q', filters.q);
  if (filters.tipo) query.set('tipo', filters.tipo);
  if (filters.data) query.set('data', filters.data);
  if (cursor) query.set('cursor', cursor);
  const value: unknown = await cachedGetJson(`${base}?${query.toString()}`);
  assertPage(value);
  if (cursor === null && value.summary === null) {
    throw new Error('Riepilogo terapie non disponibile');
  }
  return value;
}
