import {
  createParameterReadingRequest,
  type ParameterReadingRequest,
  type ParameterValues,
} from './patientParameterReadings';

export interface ParameterEntryDraft {
  values: ParameterValues;
  notesOpen: boolean;
  saving: boolean;
  error: string;
  uncertain: boolean;
  savedAt: string | null;
  pending: ParameterReadingRequest | null;
}
const EMPTY_DRAFT: ParameterEntryDraft = {
  values: {},
  notesOpen: false,
  saving: false,
  error: '',
  uncertain: false,
  savedAt: null,
  pending: null,
};
export interface ParameterSaveToken {
  patientId: string;
  generation: number;
  request: ParameterReadingRequest;
}

/** Workspace-owned memory. Page membership can change independently of these patient-keyed drafts. */
export function createParameterDraftStore() {
  const drafts = new Map<string, ParameterEntryDraft>();
  const listeners = new Map<string, Set<() => void>>();
  let generation = 0;
  const get = (id: string) => drafts.get(id) ?? EMPTY_DRAFT;
  const patch = (id: string, change: Partial<ParameterEntryDraft>) => {
    drafts.set(id, { ...get(id), ...change });
    listeners.get(id)?.forEach((listener) => listener());
  };
  const matches = (token: ParameterSaveToken) =>
    token.generation === generation && get(token.patientId).pending === token.request;
  return {
    get,
    subscribe: (id: string, listener: () => void) => {
      if (!listeners.has(id)) listeners.set(id, new Set());
      listeners.get(id)!.add(listener);
      return () => {
        listeners.get(id)?.delete(listener);
      };
    },
    update: (id: string, key: keyof ParameterValues, value: string) => {
      const draft = get(id);
      if (draft.saving || draft.uncertain) return;
      patch(id, {
        values: { ...draft.values, [key]: value },
        error: '',
        savedAt: null,
        pending: null,
      });
    },
    toggleNotes: (id: string) => patch(id, { notesOpen: !get(id).notesOpen }),
    begin: (id: string): ParameterSaveToken | null => {
      const draft = get(id);
      if (draft.saving) return null;
      try {
        const request = draft.pending ?? createParameterReadingRequest(draft.values);
        patch(id, { pending: request, saving: true, error: '' });
        return { patientId: id, generation, request };
      } catch (cause) {
        patch(id, { error: cause instanceof Error ? cause.message : 'Parametri non validi' });
        return null;
      }
    },
    succeed: (token: ParameterSaveToken, measuredAt: string) => {
      if (matches(token))
        patch(token.patientId, { ...EMPTY_DRAFT, values: {}, savedAt: measuredAt });
    },
    fail: (token: ParameterSaveToken, error: string, uncertain: boolean) => {
      if (matches(token))
        patch(token.patientId, {
          error,
          uncertain,
          saving: false,
          pending: uncertain ? token.request : null,
        });
    },
    clear: () => {
      ++generation;
      drafts.clear();
      listeners.forEach((group) => group.forEach((listener) => listener()));
    },
  };
}
export type ParameterDraftStore = ReturnType<typeof createParameterDraftStore>;
