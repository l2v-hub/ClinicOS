import type { FarmacoTrovato } from './farmacoDocumento';

export type MedicationSearchCriterion = 'nome' | 'principio-attivo';
export interface MedicationSearchPage {
  esiti: FarmacoTrovato[];
  pageInfo?: { hasMore: boolean; nextCursor: string | null };
}
export interface MedicationSearchState {
  query: string;
  criterion: MedicationSearchCriterion;
  phase: 'idle' | 'loading' | 'ready' | 'error';
  items: FarmacoTrovato[];
  nextCursor: string | null;
}
export const emptyMedicationSearch = (
  query = '',
  criterion: MedicationSearchCriterion = 'nome',
): MedicationSearchState => ({ query, criterion, phase: 'idle', items: [], nextCursor: null });

export function medicationSearchUrl(
  baseUrl: string,
  query: string,
  criterion: MedicationSearchCriterion,
  cursor?: string | null,
): string {
  const params = new URLSearchParams({ q: query, limite: '25' });
  if (criterion === 'principio-attivo') params.set('pa', '1');
  if (cursor) params.set('cursor', cursor);
  return baseUrl + '/farmaci/cerca?' + params;
}

export async function loadExactDrugPackage(
  baseUrl: string,
  aic: string,
  signal: AbortSignal,
  request: typeof fetch = fetch,
): Promise<FarmacoTrovato> {
  if (!/^\d{9}$/.test(aic)) throw new Error('Invalid AIC');
  const response = await request(
    baseUrl + '/farmaci/cerca?q=' + encodeURIComponent(aic) + '&limite=1',
    { signal },
  );
  if (!response.ok) throw new Error('Package unavailable');
  const page = (await response.json()) as MedicationSearchPage;
  const exact = Array.isArray(page.esiti) ? page.esiti.find((item) => item.aic === aic) : null;
  if (!exact) throw new Error('Package unavailable');
  return exact;
}

/** One request lifecycle for both UIs; a late response cannot restore obsolete results. */
export function createMedicationSearch(
  fetchPage: (
    query: string,
    criterion: MedicationSearchCriterion,
    cursor: string | null,
    signal: AbortSignal,
  ) => Promise<MedicationSearchPage>,
  publish: (state: MedicationSearchState) => void,
  debounceMs = 300,
) {
  let state = emptyMedicationSearch();
  let generation = 0;
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const update = (next: MedicationSearchState) => {
    state = next;
    publish(next);
  };
  const cancel = () => {
    generation++;
    clearTimeout(timer);
    controller?.abort();
  };
  async function request(cursor: string | null, run: number) {
    if (run !== generation) return;
    controller = new AbortController();
    const signal = controller.signal;
    update({ ...state, phase: 'loading' });
    try {
      const page = await fetchPage(state.query, state.criterion, cursor, signal);
      if (run !== generation || signal.aborted) return;
      if (!Array.isArray(page.esiti)) throw new Error('Malformed search response');
      const nextCursor = page.pageInfo?.hasMore ? page.pageInfo.nextCursor : null;
      if (page.pageInfo?.hasMore && (!nextCursor || nextCursor === cursor))
        throw new Error('Malformed search cursor');
      const byAic = new Map((cursor ? state.items : []).map((item) => [item.aic, item]));
      for (const item of page.esiti) byAic.set(item.aic, item);
      update({ ...state, phase: 'ready', items: [...byAic.values()], nextCursor });
    } catch {
      if (run !== generation || signal.aborted) return;
      update({ ...state, phase: 'error' });
    }
  }
  return {
    search(query: string, criterion: MedicationSearchCriterion) {
      cancel();
      const text = query.trim();
      update({
        ...emptyMedicationSearch(text, criterion),
        phase: text.length < 3 ? 'idle' : 'loading',
      });
      if (text.length >= 3) {
        const run = generation;
        timer = setTimeout(() => void request(null, run), debounceMs);
      }
    },
    loadMore() {
      if (state.phase !== 'loading' && state.nextCursor) void request(state.nextCursor, generation);
    },
    retry() {
      if (state.phase === 'error') void request(state.nextCursor, generation);
    },
    cancel,
  };
}
