// Fonte autorizzata dal backend: pazienti accessibili all'operatore corrente.
// I GET di oggi sono condivisi con le anomalie tramite cachedGetJson; domani serve
// al riepilogo delle prossime scadenze, mentre i KPI restano riferiti solo a oggi.
import { useCallback, useEffect, useState } from 'react';
import { API_URL } from '../../../config';
import { readDashboardTherapyDay } from '../../../lib/dashboardTherapyRead';
import { peekCachedGet } from '../../../lib/cachedFetch';
import { parseTherapySlots } from '../../../lib/therapySlotPage';
import {
  summarizeDashboardTherapies,
  therapyCalendar,
  type DashboardTherapySummary,
} from '../../../lib/dashboardTherapies';
import type { TherapySlot } from '../../../types';

export type { RitardoVoce, RitardoPaziente } from '../../../lib/dashboardTherapies';

export interface RiepilogoSomministrazioni extends DashboardTherapySummary {
  inCorso: boolean;
  fallito: boolean;
  domaniInCorso: boolean;
  domaniFallito: boolean;
  aggiornamentoInCorso: boolean;
  aggiorna: () => void;
}

interface DayState {
  date: string;
  slots: TherapySlot[] | null;
  failed: boolean;
  refreshing: boolean;
}

const emptyDay = (date: string): DayState => ({
  date,
  slots: null,
  failed: false,
  refreshing: true,
});

// Ultima lettura del giorno gia' vista in sessione: i KPI compaiono subito con quei valori,
// marcati "in aggiornamento", mentre la rilettura fresca parte comunque nell'effetto sotto.
function seededDay(date: string): DayState {
  const known = peekCachedGet<unknown>(`${API_URL}/therapy-slots?date=${date}`);
  if (known === undefined) return emptyDay(date);
  try {
    return { date, slots: parseTherapySlots(known), failed: false, refreshing: true };
  } catch {
    return emptyDay(date);
  }
}

export function useRiepilogoSomministrazioni(attivo = true): RiepilogoSomministrazioni {
  const [now, setNow] = useState(() => new Date());
  const [revision, setRevision] = useState(0);
  const { oggi, domani } = therapyCalendar(now);
  const [today, setToday] = useState<DayState>(() => seededDay(oggi));
  const [tomorrow, setTomorrow] = useState<DayState>(() => seededDay(domani));
  const aggiorna = useCallback(() => {
    setNow(new Date());
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!attivo) return;
    const refreshVisible = () => {
      if (document.visibilityState !== 'hidden') aggiorna();
    };
    const timer = window.setInterval(refreshVisible, 60_000);
    window.addEventListener('focus', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshVisible);
      document.removeEventListener('visibilitychange', refreshVisible);
    };
  }, [attivo, aggiorna]);

  useEffect(() => {
    if (!attivo) return;
    let cancelled = false;
    for (const [date, setDay] of [
      [oggi, setToday],
      [domani, setTomorrow],
    ] as const) {
      setDay((current) =>
        current.date === date ? { ...current, refreshing: true } : emptyDay(date),
      );
      // Rilettura fresca al mount/refresh, con dedup delle richieste già in volo.
      void readDashboardTherapyDay(`${API_URL}/therapy-slots?date=${date}`)
        .then((slots) => {
          if (!cancelled) setDay({ date, slots, failed: false, refreshing: false });
        })
        .catch(() => {
          if (!cancelled) setDay({ date, slots: null, failed: true, refreshing: false });
        });
    }
    return () => {
      cancelled = true;
    };
  }, [attivo, oggi, domani, revision]);

  // Al cambio giorno non etichettare come odierne risposte del giorno precedente.
  const current = today.date === oggi && attivo ? today : emptyDay(oggi);
  const next = tomorrow.date === domani && attivo ? tomorrow : emptyDay(domani);
  return {
    ...summarizeDashboardTherapies(current.slots ?? [], next.slots ?? [], now),
    inCorso: current.slots === null && !current.failed,
    fallito: current.failed,
    domaniInCorso: next.slots === null && !next.failed,
    domaniFallito: next.failed,
    aggiornamentoInCorso: current.refreshing || next.refreshing,
    aggiorna,
  };
}
