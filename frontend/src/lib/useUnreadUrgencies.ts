// Urgenze da prendere in carico per il Turno (#446 QA): la coda del badge è paginata (20 voci, le
// più recenti prima) e non filtra per priorità, quindi un'urgenza più vecchia di 20 note sparirebbe.
// Si sfoglia la coda fino a MAX_PAGES pagine; oltre, il Turno dice che ce ne possono essere altre.
import { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { operatorHeaders } from './operatorSession';
import { parseUnreadDiaryPage, type UnreadDiaryEntry } from './diaryUnreadQueue';
import { DIARY_READING_CHANGED_EVENT } from './diaryReading';
import { URGENCY_ACKNOWLEDGED_EVENT } from './urgency';
import { takeChargeRows } from './turnoUnread';

const MAX_PAGES = 5;

export interface UnreadUrgencies {
  state: 'loading' | 'ready' | 'error';
  rows: UnreadDiaryEntry[];
  /** La coda ha altre pagine oltre quelle lette: le urgenze mostrate sono un minimo. */
  atLeast: boolean;
}

export function useUnreadUrgencies(enabled: boolean): UnreadUrgencies {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<UnreadUrgencies>({
    state: 'loading',
    rows: [],
    atLeast: false,
  });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    (async () => {
      const rows: UnreadDiaryEntry[] = [];
      let cursor: string | null = null;
      let hasMore = true;
      for (let page = 0; page < MAX_PAGES && hasMore; page++) {
        const params = new URLSearchParams({ limit: '20' });
        if (cursor) params.set('cursor', cursor);
        const response = await fetch(`${API_URL}/patients/diary-unread?${params}`, {
          headers: operatorHeaders(),
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('unavailable');
        const body = parseUnreadDiaryPage(await response.json());
        rows.push(...takeChargeRows(body.entries));
        hasMore = body.hasMore;
        cursor = body.nextCursor;
      }
      if (!controller.signal.aborted) setResult({ state: 'ready', rows, atLeast: hasMore });
    })().catch(() => {
      if (!controller.signal.aborted) setResult({ state: 'error', rows: [], atLeast: false });
    });
    return () => controller.abort();
  }, [enabled, revision]);
  // Stessi momenti di rilettura del badge Consegne.
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      if (document.visibilityState !== 'hidden') setRevision((r) => r + 1);
    };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener(URGENCY_ACKNOWLEDGED_EVENT, refresh);
    window.addEventListener(DIARY_READING_CHANGED_EVENT, refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(URGENCY_ACKNOWLEDGED_EVENT, refresh);
      window.removeEventListener(DIARY_READING_CHANGED_EVENT, refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [enabled]);
  return enabled ? result : { state: 'ready', rows: [], atLeast: false };
}
