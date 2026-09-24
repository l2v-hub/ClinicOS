import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '../../config';
import type { ClinicalSummaryEntry, Paziente } from '../../types';
import { operatorHeaders } from '../../lib/operatorSession';
import { useRosterOrderContext } from '../shared/RosterOrderContext';
import { isRosterChanged, type RosterPageOptions } from '../../lib/rosterOrder';
import {
  fetchPatientPage,
  fetchPatientClinicalSummary,
  mergePatientPage,
} from '../../lib/patientPage';
import { readSessionCache, writeSessionCache } from '../../lib/sessionCache';

interface PatientListSnapshot {
  patients: Paziente[];
  summary: ClinicalSummaryEntry[];
  hasMore: boolean;
  nextCursor: string | null;
}
const SNAPSHOT_PREFIX = 'patient-list:';

/** Riempie la cache di sessione della prima pagina (identita' + badge) senza montare la lista:
 * usato da App dopo il login, cosi' la prima apertura di "Pazienti" non attende la rete. Non
 * sovrascrive una pagina gia' in cache (quella e' piu' recente o identica). */
export async function prefetchPatientListSnapshot(
  apiUrl: string,
  input: {
    query: string;
    sex: 'tutti' | 'M' | 'F';
    rosterKey: string;
    rosterOptions: RosterPageOptions;
    headers: HeadersInit;
  },
): Promise<void> {
  const key = SNAPSHOT_PREFIX + JSON.stringify([input.query.trim(), input.sex, input.rosterKey]);
  if (readSessionCache(key)) return;
  try {
    const page = await fetchPatientPage(
      apiUrl,
      {
        q: input.query,
        sex: input.sex === 'tutti' ? undefined : input.sex,
        limit: 50,
        ...input.rosterOptions,
      },
      { headers: input.headers },
    );
    if (readSessionCache(key)) return;
    const summary = await fetchPatientClinicalSummary(
      apiUrl,
      page.items.map((p) => p.id),
      { headers: input.headers },
    ).catch(() => [] as ClinicalSummaryEntry[]);
    if (readSessionCache(key)) return;
    writeSessionCache<PatientListSnapshot>(key, {
      patients: page.items,
      summary,
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    });
  } catch {
    /* la lista ricarichera' da sola al primo accesso */
  }
}

/** Keep identities independent of optional clinical reads. The last page shown for a query stays
 * in the session cache: remounting (back from a chart, sidebar round trip) paints it at once and
 * revalidates in the background instead of showing "Caricamento…" again. */
export function usePatientListPage(query: string, sex: 'tutti' | 'M' | 'F') {
  const {
    options: rosterOptions,
    requestKey: rosterKey,
    accept: acceptRoster,
    recover: recoverRoster,
  } = useRosterOrderContext();
  const initialKey = JSON.stringify([query.trim(), sex, rosterKey]);
  const snapshot = readSessionCache<PatientListSnapshot>(SNAPSHOT_PREFIX + initialKey);
  const [patients, setPatients] = useState<Paziente[]>(() => snapshot?.patients ?? []);
  const [summary, setSummary] = useState<ClinicalSummaryEntry[]>(() => snapshot?.summary ?? []);
  const [loading, setLoading] = useState(!snapshot);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(snapshot?.hasMore ?? false);
  const [nextCursor, setNextCursor] = useState<string | null>(snapshot?.nextCursor ?? null);
  const [pageError, setPageError] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(!snapshot);
  const [summaryError, setSummaryError] = useState('');
  const sequence = useRef(0);
  const active = useRef<AbortController | null>(null);
  const rows = useRef<Paziente[]>(snapshot?.patients ?? []);
  const summaries = useRef<ClinicalSummaryEntry[]>(snapshot?.summary ?? []);
  const loadedKey = useRef(snapshot ? initialKey : '');
  const hasMoreRef = useRef(snapshot?.hasMore ?? false);
  const nextCursorRef = useRef<string | null>(snapshot?.nextCursor ?? null);
  const previousQuery = useRef(query);

  const readSummary = useCallback(async (ids: string[], requestId: number, signal: AbortSignal) => {
    setSummaryLoading(ids.length > 0);
    setSummaryError('');
    try {
      const incoming = await fetchPatientClinicalSummary(API_URL, ids, {
        headers: operatorHeaders(),
        signal,
      });
      if (signal.aborted || requestId !== sequence.current) return;
      const byId = new Map(summaries.current.map((entry) => [entry.patientId, entry]));
      incoming.forEach((entry) => byId.set(entry.patientId, entry));
      summaries.current = [...byId.values()];
      setSummary(summaries.current);
      writeSessionCache<PatientListSnapshot>(SNAPSHOT_PREFIX + loadedKey.current, {
        patients: rows.current,
        summary: summaries.current,
        hasMore: hasMoreRef.current,
        nextCursor: nextCursorRef.current,
      });
    } catch {
      if (!signal.aborted && requestId === sequence.current) {
        setSummaryError(
          'Ricoveri e segnalazioni cliniche non disponibili. L’elenco pazienti resta consultabile.',
        );
      }
    } finally {
      if (requestId === sequence.current) setSummaryLoading(false);
    }
  }, []);

  const loadPage = useCallback(
    async (cursor?: string, append = false) => {
      active.current?.abort();
      const controller = new AbortController();
      active.current = controller;
      const requestId = ++sequence.current;
      const key = JSON.stringify([query.trim(), sex, rosterKey]);
      setPageError('');
      setSummaryError('');
      setSummaryLoading(true);
      setLoadingMore(append);
      const sameKey = loadedKey.current === key;
      // A same-query refresh keeps rows and badges on screen while revalidating (the roster only
      // marks itself busy). New filters never show old results.
      setLoading(!append && !sameKey);
      if (!append) {
        if (!sameKey) {
          rows.current = [];
          setPatients([]);
          setSummary([]);
          setHasMore(false);
          setNextCursor(null);
        }
        // Badges are always re-read for the whole page: the known-id set starts empty.
        summaries.current = [];
      }
      try {
        const page = await fetchPatientPage(
          API_URL,
          {
            q: query,
            sex: sex === 'tutti' ? undefined : sex,
            cursor,
            limit: 50,
            ...rosterOptions,
          },
          { headers: operatorHeaders(), signal: controller.signal },
        );
        if (controller.signal.aborted || requestId !== sequence.current) return;
        acceptRoster(page.roster);
        rows.current = mergePatientPage(rows.current, page.items, append);
        loadedKey.current = key;
        hasMoreRef.current = page.hasMore;
        nextCursorRef.current = page.nextCursor;
        setPatients(rows.current);
        setHasMore(page.hasMore);
        setNextCursor(page.nextCursor);
        setLoading(false);
        setLoadingMore(false);
        writeSessionCache<PatientListSnapshot>(SNAPSHOT_PREFIX + key, {
          patients: rows.current,
          summary: readSessionCache<PatientListSnapshot>(SNAPSHOT_PREFIX + key)?.summary ?? [],
          hasMore: page.hasMore,
          nextCursor: page.nextCursor,
        });
        const knownIds = new Set(summaries.current.map((entry) => entry.patientId));
        await readSummary(
          rows.current.filter((p) => !knownIds.has(p.id)).map((p) => p.id),
          requestId,
          controller.signal,
        );
      } catch (error) {
        if (!controller.signal.aborted && requestId === sequence.current) {
          if (isRosterChanged(error) && (await recoverRoster())) return;
          setPageError((error as Error).message || 'Errore nel caricamento dei pazienti');
        }
      } finally {
        if (requestId === sequence.current) {
          setLoading(false);
          setLoadingMore(false);
          setSummaryLoading(false);
        }
      }
    },
    [query, sex, readSummary, rosterKey, rosterOptions, acceptRoster, recoverRoster],
  );

  const retrySummary = useCallback(() => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const requestId = ++sequence.current;
    const knownIds = new Set(summaries.current.map((entry) => entry.patientId));
    void readSummary(
      rows.current.filter((p) => !knownIds.has(p.id)).map((p) => p.id),
      requestId,
      controller.signal,
    );
  }, [readSummary]);

  useEffect(() => {
    const typing = previousQuery.current !== query;
    previousQuery.current = query;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (typing) {
      rows.current = [];
      summaries.current = [];
      setPatients([]);
      setSummary([]);
      setLoading(true);
      setSummaryLoading(true);
      setHasMore(false);
      setNextCursor(null);
      setPageError('');
      setSummaryError('');
      timer = setTimeout(() => void loadPage(), 250);
    } else {
      void loadPage();
    }
    return () => {
      clearTimeout(timer);
      active.current?.abort();
      sequence.current += 1;
    };
  }, [query, loadPage]);

  return {
    patients,
    summary,
    loading,
    loadingMore,
    hasMore,
    nextCursor,
    pageError,
    summaryLoading,
    summaryError,
    loadPage,
    retrySummary,
  };
}
