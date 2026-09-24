// Chiavi e forme delle voci di cache di sessione condivise fra i tab della cartella (che le
// leggono al mount e le scrivono dopo ogni lettura) e il prefetch a browser inattivo avviato
// all'apertura della scheda (patientDetailPrefetch.ts). Modulo leggero: e' importato anche dal
// chunk principale, quindi non deve trascinare con se' i componenti dei tab.
import type { DiarioPazienteEntry, PatientTherapyAPI } from '../types';
import type { TherapyListFilters } from './therapyPages';

export interface TherapyListSnapshot {
  therapies: PatientTherapyAPI[];
  nextCursor: string | null;
  summary: { total: number; active: number; inactive: number } | null;
}

export interface DiarySnapshot {
  entries: DiarioPazienteEntry[];
  hasMore: boolean;
  nextCursor: string | null;
}

export const therapyListCacheKey = (patientId: string, filters: TherapyListFilters): string =>
  `therapies:${patientId}:${JSON.stringify(filters)}`;

export const diaryCacheKey = (patientId: string, filter: string): string =>
  `diary:${patientId}:${filter}`;

export const narrativeCacheKey = (patientId: string): string => `narrative:${patientId}`;

export const assessmentsCacheKey = (patientId: string): string => `assessments:${patientId}`;

const THERAPY_STATE_ORDER: Record<string, number> = { attiva: 0, sospesa: 1, conclusa: 2 };

/** Ordine di presentazione del tab Terapia: attive, poi sospese, poi concluse. */
export function sortTherapiesByState(items: PatientTherapyAPI[]): PatientTherapyAPI[] {
  return [...items].sort(
    (a, b) => (THERAPY_STATE_ORDER[a.stato] ?? 9) - (THERAPY_STATE_ORDER[b.stato] ?? 9),
  );
}
