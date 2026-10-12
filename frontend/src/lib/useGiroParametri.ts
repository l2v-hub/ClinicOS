// Giro parametri del giorno per il Turno dell'OSS (#446): chi è già stato rilevato oggi (stessa
// pagina della vista Parametri, giorno della struttura) e chi ha parametri critici.
import { useCallback, useEffect, useState } from 'react';
import { API_URL } from '../config';
import { facilityLocalMinute } from './facilityTime';
import { fetchPatientParametersPage } from './patientParametersPage';
import { fetchPatientClinicalSummary } from './patientPage';
import { operatorHeaders } from './operatorSession';
import { patientLocationLabel } from './patientIdentity';
import { DIARY_READING_CHANGED_EVENT } from './diaryReading';
import type { GiroPaziente } from './turnoVariant';

const MAX_PAGES = 4;

export interface GiroParametri {
  state: 'loading' | 'ready' | 'error';
  pazienti: GiroPaziente[];
  /** false se il reparto ha più pazienti di quelli letti: il totale è un minimo. */
  completo: boolean;
  aggiorna: () => void;
}

export function useGiroParametri(enabled: boolean): GiroParametri {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Omit<GiroParametri, 'aggiorna'>>({
    state: 'loading',
    pazienti: [],
    completo: false,
  });
  const aggiorna = useCallback(() => setRevision((r) => r + 1), []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const day = facilityLocalMinute().slice(0, 10);
    (async () => {
      const items = [];
      let cursor: string | undefined;
      let hasMore = true;
      for (let page = 0; page < MAX_PAGES && hasMore; page++) {
        const res = await fetchPatientParametersPage(
          API_URL,
          {
            limit: 50,
            date: day,
            month: Number(day.slice(5, 7)),
            year: Number(day.slice(0, 4)),
            view: 'entry',
            cursor,
          },
          { headers: operatorHeaders(), signal: controller.signal },
        );
        items.push(...res.items);
        hasMore = res.hasMore;
        cursor = res.nextCursor ?? undefined;
      }
      const summary = await fetchPatientClinicalSummary(
        API_URL,
        items.map((i) => i.patient.id),
        { headers: operatorHeaders(), signal: controller.signal },
      );
      const critici = new Set(summary.filter((s) => s.hasCriticalVitals).map((s) => s.patientId));
      // I dimessi non sono nel giro (#446 QA): stesso perimetro del «non dimessi» del sottotitolo.
      const dimessi = new Set(
        summary.filter((s) => s.statoRicovero === 'dimesso').map((s) => s.patientId),
      );
      if (controller.signal.aborted) return;
      setResult({
        state: 'ready',
        completo: !hasMore,
        pazienti: items
          .filter((i) => !dimessi.has(i.patient.id))
          .map((i) => ({
            patientId: i.patient.id,
            nome: `${i.patient.lastName} ${i.patient.firstName}`.trim(),
            luogo:
              i.patient.location !== undefined ? patientLocationLabel(i.patient.location) : null,
            // solo una lettura dello stesso giorno conta come rilevazione di oggi
            rilevatoOggi: (i.summaryDate ?? day) === day && (i.cartella.readingCount ?? 0) > 0,
            critico: critici.has(i.patient.id),
          })),
      });
    })().catch(() => {
      if (!controller.signal.aborted) setResult({ state: 'error', pazienti: [], completo: false });
    });
    return () => controller.abort();
  }, [enabled, revision]);
  // Una nuova rilevazione salvata altrove (cartella, Parametri) si riflette al rientro sul Turno.
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      if (document.visibilityState !== 'hidden') aggiorna();
    };
    window.addEventListener('focus', refresh);
    window.addEventListener(DIARY_READING_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener(DIARY_READING_CHANGED_EVENT, refresh);
    };
  }, [enabled, aggiorna]);
  return { ...result, aggiorna };
}
