import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '../../config';
import type { ClinicalSummaryEntry, Paziente } from '../../types';
import { operatorHeaders } from '../../lib/operatorSession';
import {
  fetchPatientPage,
  fetchPatientClinicalSummary,
  mergePatientPage,
} from '../../lib/patientPage';

/** Keep identities independent of optional clinical reads; no patient cache survives unmount. */
export function usePatientListPage(query: string, sex: 'tutti' | 'M' | 'F') {
  const [patients, setPatients] = useState<Paziente[]>([]);
  const [summary, setSummary] = useState<ClinicalSummaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [pageError, setPageError] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const sequence = useRef(0);
  const active = useRef<AbortController | null>(null);
  const rows = useRef<Paziente[]>([]);
  const summaries = useRef<ClinicalSummaryEntry[]>([]);
  const loadedKey = useRef('');
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
    } catch (error) {
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
      const key = JSON.stringify([query.trim(), sex]);
      setPageError('');
      setSummaryError('');
      setSummaryLoading(true);
      setLoadingMore(append);
      setLoading(!append);
      if (!append) {
        // A same-query refresh retains identity rows. New filters never show old results.
        if (loadedKey.current !== key) {
          rows.current = [];
          setPatients([]);
        }
        summaries.current = [];
        setSummary([]);
        setHasMore(false);
        setNextCursor(null);
      }
      try {
        const page = await fetchPatientPage(
          API_URL,
          {
            q: query,
            sex: sex === 'tutti' ? undefined : sex,
            cursor,
            limit: 50,
          },
          { headers: operatorHeaders(), signal: controller.signal },
        );
        if (controller.signal.aborted || requestId !== sequence.current) return;
        rows.current = mergePatientPage(rows.current, page.items, append);
        loadedKey.current = key;
        setPatients(rows.current);
        setHasMore(page.hasMore);
        setNextCursor(page.nextCursor);
        setLoading(false);
        setLoadingMore(false);
        const knownIds = new Set(summaries.current.map((entry) => entry.patientId));
        await readSummary(
          rows.current.filter((p) => !knownIds.has(p.id)).map((p) => p.id),
          requestId,
          controller.signal,
        );
      } catch (error) {
        if (!controller.signal.aborted && requestId === sequence.current) {
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
    [query, sex, readSummary],
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
