import { useEffect, useRef, useState } from 'react';
import type { Paziente } from '../types';
import { API_URL } from '../config';
import { operatorHeaders } from './operatorSession';
import { fetchPatientPage } from './patientPage';

interface PatientDirectorySearchState {
  results: Paziente[];
  loading: boolean;
  error: string | null;
}

interface InternalSearchState extends PatientDirectorySearchState {
  query: string;
}

export function createLatestRequestGuard() {
  let latestRequest = 0;
  return {
    start: () => ++latestRequest,
    isCurrent: (request: number) => request === latestRequest,
    invalidate: (request?: number) => {
      if (request === undefined || request === latestRequest) latestRequest += 1;
    },
  };
}

/** Shared bounded patient lookup for global search and appointment creation. */
export function usePatientDirectorySearch(
  rawQuery: string,
  options: { enabled?: boolean; limit?: number; debounceMs?: number } = {},
): PatientDirectorySearchState {
  const enabled = options.enabled ?? true;
  const limit = Math.min(25, Math.max(1, options.limit ?? 6));
  const debounceMs = Math.min(1000, Math.max(0, options.debounceMs ?? 250));
  const query = rawQuery.trim();
  const [state, setState] = useState<InternalSearchState>({
    query: '',
    results: [],
    loading: false,
    error: null,
  });
  const requestGuard = useRef(createLatestRequestGuard());

  useEffect(() => {
    const guard = requestGuard.current;
    const request = guard.start();
    if (!enabled || query.length < 2) {
      return () => guard.invalidate(request);
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setState({ query, results: [], loading: true, error: null });
      fetchPatientPage(
        API_URL,
        { q: query, limit },
        {
          headers: operatorHeaders(),
          signal: controller.signal,
        },
      )
        .then((page) => {
          if (!guard.isCurrent(request)) return;
          setState({ query, results: page.items, loading: false, error: null });
        })
        .catch((error: unknown) => {
          if ((error as { name?: string }).name === 'AbortError') return;
          if (!guard.isCurrent(request)) return;
          setState({
            query,
            results: [],
            loading: false,
            error: 'Ricerca non disponibile. Riprova.',
          });
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
      guard.invalidate(request);
    };
  }, [debounceMs, enabled, limit, query]);

  if (!enabled || query.length < 2) return { results: [], loading: false, error: null };
  if (state.query !== query) return { results: [], loading: true, error: null };
  return state;
}
