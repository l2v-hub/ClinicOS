import { createContext, useContext } from 'react';
import type { RosterOrderController } from '../../lib/useRosterOrder';
import { DEFAULT_ROSTER_ORDER } from '../../lib/rosterOrder';

const fallback: RosterOrderController = {
  ready: true,
  loading: false,
  saving: false,
  preference: null,
  metadata: null,
  explicit: false,
  order: DEFAULT_ROSTER_ORDER,
  temporary: true,
  message: '',
  error: '',
  restart: 0,
  options: {},
  requestKey: 'standalone',
  choose: async () => {},
  refresh: async () => {},
  accept: () => {},
  recover: async () => false,
};
export const RosterOrderContext = createContext<RosterOrderController>(fallback);
export function useRosterOrderContext() {
  return useContext(RosterOrderContext);
}
