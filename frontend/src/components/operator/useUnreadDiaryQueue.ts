import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '../../config';
import { operatorHeaders } from '../../lib/operatorSession';
import { DIARY_READING_CHANGED_EVENT, postDiaryRead } from '../../lib/diaryReading';
import { URGENCY_ACKNOWLEDGED_EVENT, postUrgencyAck } from '../../lib/urgency';
import {
  parseUnreadDiaryPage,
  unreadDiaryAckPath,
  type UnreadDiaryEntry,
  type UnreadDiaryPage,
} from '../../lib/diaryUnreadQueue';

/** `live`: si rilegge anche al ritorno sulla finestra e ogni 30 s, come il badge Consegne
 *  (useDiaryUnreadCount), così il Turno e il badge non si separano (#446 QA). */
export function useUnreadDiaryQueue(enabled = true, live = false) {
  const [page, setPage] = useState<UnreadDiaryPage | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null),
    [notice, setNotice] = useState('');
  const sequence = useRef(0),
    lifecycle = useRef(0),
    pending = useRef(false);
  const mutationPending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const read = useCallback(async (cursor?: string) => {
    const request = ++sequence.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (cursor) params.set('cursor', cursor);
      const response = await fetch(`${API_URL}/patients/diary-unread?${params}`, {
        headers: operatorHeaders(),
        signal: abort.signal,
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Coda delle note non confermate non disponibile.');
      const incoming = parseUnreadDiaryPage(await response.json());
      if (cursor && incoming.nextCursor === cursor)
        throw new Error('La pagina non è avanzata. Ricarica la coda.');
      if (abort.signal.aborted || request !== sequence.current) return;
      setPage((current) =>
        cursor && current
          ? {
              ...incoming,
              entries: [
                ...new Map(
                  [...current.entries, ...incoming.entries].map((row) => [row.id, row]),
                ).values(),
              ],
              patientCounts: [
                ...new Map(
                  [...current.patientCounts, ...incoming.patientCounts].map((row) => [
                    row.patientId,
                    row,
                  ]),
                ).values(),
              ],
            }
          : incoming,
      );
    } catch (cause) {
      if (!abort.signal.aborted && request === sequence.current)
        setError(cause instanceof Error ? cause.message : 'Coda non disponibile.');
    } finally {
      if (request === sequence.current) {
        setLoading(false);
        pending.current = false;
      }
    }
  }, []);
  useEffect(() => {
    const version = ++lifecycle.current;
    if (!enabled) {
      setPage(null);
      setLoading(false);
      return;
    }
    const refresh = () => {
      void read();
    };
    void read();
    window.addEventListener(DIARY_READING_CHANGED_EVENT, refresh);
    window.addEventListener(URGENCY_ACKNOWLEDGED_EVENT, refresh);
    const liveRefresh = () => {
      if (document.visibilityState !== 'hidden' && !mutationPending.current) refresh();
    };
    const timer = live ? window.setInterval(liveRefresh, 30_000) : undefined;
    if (live) {
      window.addEventListener('focus', liveRefresh);
      document.addEventListener('visibilitychange', liveRefresh);
    }
    return () => {
      lifecycle.current = version + 1;
      sequence.current++;
      controller.current?.abort();
      window.removeEventListener(DIARY_READING_CHANGED_EVENT, refresh);
      window.removeEventListener(URGENCY_ACKNOWLEDGED_EVENT, refresh);
      if (live) {
        window.clearInterval(timer);
        window.removeEventListener('focus', liveRefresh);
        document.removeEventListener('visibilitychange', liveRefresh);
      }
    };
  }, [read, enabled, live]);
  async function acknowledge(row: UnreadDiaryEntry, purpose: 'read' | 'urgency') {
    if (mutationPending.current) return;
    mutationPending.current = true;
    const version = lifecycle.current;
    setBusy(row.id);
    setError('');
    setNotice('');
    try {
      const url = `${API_URL}${unreadDiaryAckPath(row)}`;
      if (purpose === 'read') await postDiaryRead(url, operatorHeaders());
      else await postUrgencyAck(url, operatorHeaders());
      if (version !== lifecycle.current) return;
      setNotice(
        purpose === 'read'
          ? 'Lettura confermata. La presa in carico clinica non è stata modificata.'
          : 'Presa in carico dell’urgenza registrata.',
      );
      window.dispatchEvent(
        new Event(purpose === 'read' ? DIARY_READING_CHANGED_EVENT : URGENCY_ACKNOWLEDGED_EVENT),
      );
    } catch (cause) {
      if (version === lifecycle.current)
        setError(cause instanceof Error ? cause.message : 'Conferma non registrata.');
    } finally {
      if (version === lifecycle.current) {
        mutationPending.current = false;
        setBusy(null);
      }
    }
  }
  function loadMore() {
    if (loading || pending.current || mutationPending.current || !page?.nextCursor) return;
    pending.current = true;
    void read(page.nextCursor);
  }
  return { page, loading, error, busy, notice, acknowledge, loadMore, retry: () => void read() };
}
