import { useEffect, useState } from 'react';
import { API_URL } from '../../../config';
import {
  createMedicationSearch,
  emptyMedicationSearch,
  medicationSearchUrl,
  type MedicationSearchCriterion,
} from './medicationSearch';

export function useMedicationSearch(query: string, criterion: MedicationSearchCriterion) {
  const [state, setState] = useState(emptyMedicationSearch);
  const [search] = useState(() =>
    createMedicationSearch(async (text, mode, cursor, signal) => {
      const response = await fetch(medicationSearchUrl(API_URL, text, mode, cursor), { signal });
      if (!response.ok) throw new Error('Medication search unavailable');
      return response.json();
    }, setState),
  );
  useEffect(() => {
    search.search(query, criterion);
    return search.cancel;
  }, [query, criterion, search]);
  // Hide the previous list on the query-changing render, before the effect runs.
  const current =
    state.query === query.trim() && state.criterion === criterion
      ? state
      : emptyMedicationSearch(query.trim(), criterion);
  return { ...current, loadMore: search.loadMore, retry: search.retry };
}
