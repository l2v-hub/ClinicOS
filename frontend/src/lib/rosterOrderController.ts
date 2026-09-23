import {
  DEFAULT_ROSTER_ORDER,
  RosterApiError,
  parseRosterPreference,
  rosterJson,
  type RosterMetadata,
  type RosterOrder,
  type RosterPreference,
  type RosterRequestOptions,
} from './rosterOrder';

export interface RosterOrderState {
  ready: boolean;
  loading: boolean;
  saving: boolean;
  preference: RosterPreference | null;
  metadata: RosterMetadata | null;
  explicit: boolean;
  order: RosterOrder;
  temporary: boolean;
  message: string;
  error: string;
  restart: number;
}
/** One controller per authenticated session; contains preferences only, never patient data. */
export function createRosterOrderController(
  apiUrl: string,
  options: RosterRequestOptions,
  sessionKey?: string | null,
) {
  let state: RosterOrderState = {
    ready: false,
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
  };
  const listeners = new Set<() => void>();
  let active = false;
  let sequence = 0;
  let controller: AbortController | null = null;
  let recovering = false;
  const update = (patch: Partial<RosterOrderState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  const sameOrder = (left: RosterOrder, right: RosterOrder) =>
    left.criterion === right.criterion && left.direction === right.direction;
  const apply = (preference: RosterPreference) => {
    const changedPage =
      !state.explicit &&
      state.metadata &&
      (!sameOrder(state.metadata.order, preference.effective) ||
        state.metadata.context?.id !== preference.context?.id);
    update({
      preference,
      order: preference.effective,
      ready: true,
      metadata: changedPage ? null : state.metadata,
      restart: state.restart + Number(Boolean(changedPage)),
      temporary: preference.temporary || Boolean(changedPage),
      loading: false,
      saving: false,
      error: '',
      message: changedPage
        ? 'Preferenza aggiornata. Ricaricamento elenco…'
        : preference.temporary
          ? 'Profilo non disponibile: ordine temporaneo.'
          : '',
    });
  };
  async function refresh() {
    if (!active) return;
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    const request = ++sequence;
    update({ loading: true, error: '' });
    try {
      const preference = await rosterJson(
        `${apiUrl}/me/roster-order`,
        parseRosterPreference,
        options,
        signal,
      );
      if (active && request === sequence) apply(preference);
    } catch (cause) {
      if (active && request === sequence && !signal.aborted)
        update({
          ready: true,
          loading: false,
          saving: false,
          temporary: true,
          error: cause instanceof Error ? cause.message : 'Preferenza non disponibile.',
          message: 'Ordine temporaneo: la preferenza non è verificata.',
        });
    }
  }
  async function choose(override: RosterOrder | null) {
    if (!active || state.saving) return;
    const preference = state.preference;
    const order = override ?? preference?.default ?? DEFAULT_ROSTER_ORDER;
    controller?.abort();
    ++sequence;
    update({
      order,
      explicit: true,
      loading: false,
      temporary: true,
      error: '',
      message: 'Ordine temporaneo.',
    });
    if (!preference?.canEdit || !preference.context || preference.revision === null) return;
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    const request = ++sequence;
    update({ saving: true, loading: false, message: 'Salvataggio preferenza…' });
    try {
      const saved = await rosterJson(
        `${apiUrl}/me/roster-order`,
        parseRosterPreference,
        options,
        signal,
        { contextId: preference.context.id, override, expectedVersion: preference.revision },
      );
      if (active && request === sequence) {
        apply(saved);
        update({ message: override ? 'Preferenza salvata.' : 'Ordine del reparto ripristinato.' });
      }
    } catch (cause) {
      if (!active || request !== sequence || signal.aborted) return;
      if (cause instanceof RosterApiError && cause.status === 409) {
        await refresh();
        if (active)
          update({
            message: '',
            error:
              'Impostazione modificata nel frattempo. Dati aggiornati: scegli di nuovo per riprovare.',
          });
      } else
        update({
          saving: false,
          temporary: true,
          error: 'Preferenza non salvata. Ordine temporaneo: riprova.',
          message: '',
        });
    }
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    activate: () => {
      active = sessionKey !== null;
    },
    dispose: () => {
      active = false;
      ++sequence;
      controller?.abort();
      recovering = false;
    },
    refresh,
    choose,
    accept: (metadata?: RosterMetadata) => {
      if (!active || !metadata) return;
      recovering = false;
      update({
        metadata,
        ready: true,
        ...(!state.explicit
          ? {
              order: metadata.order,
              temporary:
                Boolean(state.error) ||
                !state.preference ||
                state.preference.temporary ||
                metadata.temporary ||
                !sameOrder(state.preference.effective, metadata.order) ||
                metadata.context?.id !== state.preference.context?.id,
            }
          : {}),
      });
      if (state.preference && metadata.context?.id !== state.preference.context?.id) void refresh();
    },
    recover: async () => {
      if (!active || recovering) return false;
      recovering = true;
      await refresh();
      if (active)
        update({
          restart: state.restart + 1,
          message: 'Dati del reparto aggiornati. Elenco ricaricato.',
        });
      return true;
    },
  };
}
