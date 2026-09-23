import { useCallback, useSyncExternalStore } from 'react';
import type { ConsegnaDraftStore } from './consegnaDrafts';
export function useConsegnaDraft(store: ConsegnaDraftStore, patientId: string) {
  const snapshot = useCallback(() => store.get(patientId), [store, patientId]);
  return useSyncExternalStore(store.subscribe, snapshot, snapshot);
}
