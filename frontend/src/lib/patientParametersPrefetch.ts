// Prefetch della prima pagina di "Parametri multipaziente" dopo il login: la pagina la legge
// dalla cache di sessione al mount (stessa chiave e stessa forma di MultiPatientParametri) e la
// rivalida in background, invece di aspettare la rete alla prima apertura.
import { API_URL } from '../config';
import { facilityLocalMinute } from './facilityTime';
import { operatorHeaders } from './operatorSession';
import {
  fetchPatientParametersPage,
  type PatientParametersPageItem,
} from './patientParametersPage';
import type { RosterPageOptions } from './rosterOrder';
import { readSessionCache, writeSessionCache } from './sessionCache';

export const parametersCacheKey = (q: string, rosterKey: string, day: string): string =>
  `parameters:${JSON.stringify([q, rosterKey, day])}`;

export async function prefetchPatientParametersSnapshot(input: {
  rosterKey: string;
  rosterOptions: RosterPageOptions;
}): Promise<void> {
  const day = facilityLocalMinute().slice(0, 10);
  const key = parametersCacheKey('', input.rosterKey, day);
  if (readSessionCache(key)) return;
  try {
    const page = await fetchPatientParametersPage(
      API_URL,
      {
        limit: 25,
        date: day,
        month: Number(day.slice(5, 7)),
        year: Number(day.slice(0, 4)),
        view: 'entry',
        ...input.rosterOptions,
      },
      { headers: operatorHeaders() },
    );
    if (readSessionCache(key)) return;
    const items: PatientParametersPageItem[] = page.items.map((item) => ({
      ...item,
      summaryDate: day,
    }));
    writeSessionCache(key, items);
  } catch {
    /* la pagina ricarichera' da sola alla prima apertura */
  }
}
