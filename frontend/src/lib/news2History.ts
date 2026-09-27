// Storico NEWS2 di un paziente dalle rilevazioni con data e ora (modello primario dei parametri).
import { news2, type News2Result } from './news2';
import type { PatientParameterReading } from './patientParameterReadings';

export interface News2Point {
  reading: PatientParameterReading;
  result: News2Result;
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
