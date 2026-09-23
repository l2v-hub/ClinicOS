import type { RosterMetadata, RosterPreference } from '../rosterOrder';
export const rosterPreference: RosterPreference = {
  context: { id: 'synthetic-context-a', label: 'Reparto sintetico A', version: '4' },
  default: { criterion: 'location', direction: 'asc' },
  override: null,
  effective: { criterion: 'location', direction: 'asc' },
  source: 'department',
  revision: '0',
  canEdit: true,
  canEditDefault: false,
  temporary: false,
  reason: null,
};
export const rosterMetadata: RosterMetadata = {
  context: rosterPreference.context,
  order: rosterPreference.effective,
  source: 'department',
  revision: '0',
  temporary: false,
  asOf: '2026-09-23',
  epoch: { roster: '90071992547409930', therapy: '23' },
};
export const missingRosterProfile: RosterPreference = {
  context: null,
  default: null,
  override: null,
  effective: { criterion: 'name', direction: 'asc' },
  source: 'system',
  revision: null,
  canEdit: false,
  canEditDefault: false,
  temporary: true,
  reason: 'profile_missing',
};
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
