import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_URL } from '../../config';
import type { Paziente } from '../../types';
import { operatorHeaders } from '../../lib/operatorSession';
import { facilityLocalMinute } from '../../lib/facilityTime';
import { fetchPatientPage, mergePatientPage } from '../../lib/patientPage';
import {
  fetchConsegnePatientSummary,
  type ConsegnePatientSummary,
} from '../../lib/consegnePatientSummary';
import { isRosterChanged } from '../../lib/rosterOrder';
import { useRosterOrderContext } from '../shared/RosterOrderContext';
export type SummaryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'unavailable' }
  | { status: 'ready'; value: ConsegnePatientSummary };

export function useConsegneRoster(query: string, room: string, active: boolean) {
  const { options, requestKey, accept, recover } = useRosterOrderContext();
  const day = facilityLocalMinute().slice(0, 10);
  const filters = useMemo(
    () => ({ q: query.trim(), room: room.trim(), limit: 50, asOf: day, ...options }),
    [query, room, day, options],
  );
  const key = JSON.stringify([filters.q, filters.room, day, requestKey]);
  const [items, setItems] = useState<Paziente[]>([]);
  const [summaries, setSummaries] = useState<Record<string, SummaryState>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);
  const rows = useRef<Paziente[]>([]);
  const cursor = useRef<string | null>(null);
  const controllers = useRef(new Set<AbortController>());
  const more = useRef<Promise<Paziente[] | null> | null>(null);
  const refreshSummary = useCallback(async (patientIds: string[]) => {
    if (!patientIds.length) return;
    const version = generation.current;
    const controller = new AbortController();
    controllers.current.add(controller);
    setSummaries((current) => ({
      ...current,
      ...Object.fromEntries(patientIds.map((id) => [id, { status: 'loading' }])),
    }));
    try {
      const incoming = await fetchConsegnePatientSummary(API_URL, patientIds, {
        headers: operatorHeaders(),
        signal: controller.signal,
      });
      if (controller.signal.aborted || version !== generation.current) return;
      const map = new Map(incoming.map((item) => [item.patientId, item]));
      setSummaries((current) => ({
        ...current,
        ...Object.fromEntries(
          patientIds.map((id) => [
            id,
            map.has(id) ? { status: 'ready', value: map.get(id)! } : { status: 'unavailable' },
          ]),
        ),
      }));
    } catch {
      if (!controller.signal.aborted && version === generation.current)
        setSummaries((current) => ({
          ...current,
          ...Object.fromEntries(patientIds.map((id) => [id, { status: 'error' }])),
        }));
    } finally {
      controllers.current.delete(controller);
    }
  }, []);
  const read = useCallback(
    async (after?: string): Promise<Paziente[] | null> => {
      const version = generation.current;
      const controller = new AbortController();
      controllers.current.add(controller);
      setError('');
      if (after) setLoadingMore(true);
      else setLoading(true);
      try {
        const page = await fetchPatientPage(
          API_URL,
          { ...filters, cursor: after },
          { headers: operatorHeaders(), signal: controller.signal },
        );
        if (controller.signal.aborted || version !== generation.current) return null;
        if (after && page.nextCursor === after)
          throw new Error('La pagina non è avanzata. Ricarica il giro.');
        accept(page.roster);
        rows.current = mergePatientPage(rows.current, page.items, Boolean(after));
        cursor.current = page.nextCursor;
        setItems(rows.current);
        setNextCursor(page.nextCursor);
        void refreshSummary(page.items.map((patient) => patient.id));
        return page.items;
      } catch (cause) {
        if (!controller.signal.aborted && version === generation.current) {
          if (isRosterChanged(cause)) {
            const recovered = await recover();
            if (recovered || controller.signal.aborted || version !== generation.current)
              return null;
          }
          setError(cause instanceof Error ? cause.message : 'Elenco pazienti non disponibile.');
        }
        return null;
      } finally {
        controllers.current.delete(controller);
        if (version === generation.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [filters, accept, recover, refreshSummary],
  );
  useEffect(() => {
    if (!active) return;
    const version = ++generation.current;
    const requests = controllers.current;
    const timer = window.setTimeout(
      () => {
        rows.current = [];
        cursor.current = null;
        more.current = null;
        setItems([]);
        setNextCursor(null);
        setSummaries({});
        void read();
      },
      query || room ? 250 : 0,
    );
    return () => {
      window.clearTimeout(timer);
      generation.current = version + 1;
      requests.forEach((controller) => controller.abort());
      requests.clear();
      more.current = null;
    };
  }, [key, read, active, retry, query, room]);
  const loadMore = () => {
    if (more.current) return more.current;
    if (!cursor.current || loading || !active) return Promise.resolve(null);
    const request = read(cursor.current);
    more.current = request;
    void request.finally(() => {
      if (more.current === request) more.current = null;
    });
    return request;
  };
  return {
    items,
    summaries,
    loading,
    loadingMore,
    error,
    nextCursor,
    loadMore,
    refreshSummary,
    retry: () => setRetry((value) => value + 1),
    getSnapshot: () => ({
      items: rows.current,
      generation: generation.current,
      requestKey: `${key}:${active}`,
      nextCursor: cursor.current,
    }),
  };
}
