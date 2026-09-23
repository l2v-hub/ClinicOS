import type { ConsegnaFeedQuery } from './consegneFeed';
export interface ConsegneEntry {
  mode: 'rounds' | 'feed';
  query?: ConsegnaFeedQuery;
  focusId?: string | null;
  key: number;
}

export interface ConsegneViewScope {
  navKey: string;
  mode: 'rounds' | 'feed';
  patientId?: string;
}

export function canRefreshPatientConsegne(scope: ConsegneViewScope, patientId: string) {
  return scope.navKey === 'dettaglio-paziente' && scope.patientId === patientId;
}

export function canApplyPatientConsegne(
  captured: ConsegneViewScope,
  current: ConsegneViewScope,
  patientId: string,
) {
  return captured === current && canRefreshPatientConsegne(current, patientId);
}
