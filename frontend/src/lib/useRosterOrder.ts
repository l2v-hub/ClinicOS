import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { API_URL } from '../config';
import { operatorHeaders } from './operatorSession';
import { createRosterOrderController } from './rosterOrderController';
import type { RosterPageOptions } from './rosterOrder';
const SERVER_EFFECTIVE_ORDER: RosterPageOptions = {};

export function useRosterOrder(sessionKey: string | null) {
  const controller = useMemo(
    () => createRosterOrderController(API_URL, { headers: operatorHeaders }, sessionKey),
    [sessionKey],
  );
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  useEffect(() => {
    if (!sessionKey) return;
    controller.activate();
    void controller.refresh();
    return controller.dispose;
  }, [controller, sessionKey]);
  const contextId = state.preference?.context?.id ?? state.metadata?.context?.id;
  const options: RosterPageOptions = useMemo(
    () =>
      state.explicit
        ? {
            sort: state.order.criterion,
            direction: state.order.direction,
            ...(contextId ? { contextId } : {}),
          }
        : SERVER_EFFECTIVE_ORDER,
    [state.explicit, state.order.criterion, state.order.direction, contextId],
  );
  const requestKey = JSON.stringify([
    options.sort,
    options.direction,
    options.contextId,
    state.explicit ? state.preference?.revision : undefined,
    state.explicit ? state.preference?.context?.version : undefined,
    state.restart,
  ]);
  return {
    ...state,
    options,
    requestKey,
    choose: controller.choose,
    refresh: controller.refresh,
    accept: controller.accept,
    recover: controller.recover,
  };
}
export type RosterOrderController = ReturnType<typeof useRosterOrder>;
