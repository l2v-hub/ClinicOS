import { useCallback, useState, useSyncExternalStore } from 'react';
import { createParameterDraftStore, type ParameterDraftStore } from './parameterEntryDrafts';

export function useParameterEntryDraft(patientId: string, provided?: ParameterDraftStore) {
  const [store] = useState(() => provided ?? createParameterDraftStore());
  const subscribe = useCallback(
    (listener: () => void) => store.subscribe(patientId, listener),
    [store, patientId],
  );
  const snapshot = useCallback(() => store.get(patientId), [store, patientId]);
  return { store, draft: useSyncExternalStore(subscribe, snapshot, snapshot) };
}
