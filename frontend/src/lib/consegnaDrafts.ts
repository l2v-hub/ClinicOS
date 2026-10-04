import type { NewConsegnaInput } from '../types';
import { localIsoDate } from './appointmentRange';
import type { DraftStorage } from './assessments/assessmentDraftPersistence';
import {
  createConsegnaRequest,
  type ConsegnaCreate,
  type ConsegnaCreateRequest,
  type ConsegnaCreateResult,
} from './consegnaCreation';
export type ConsegnaFields = Omit<NewConsegnaInput, 'pazienteId'>;
export const emptyConsegnaFields = (): ConsegnaFields => ({
  tipo: 'Monitoraggio',
  priorita: 'normale',
  note: '',
  scadenza: localIsoDate(),
  oraScadenza: '',
  operatoreAssegnatoId: null,
});
export interface ConsegnaDraft {
  fields: ConsegnaFields;
  revision: number;
  dirty: boolean;
  saving: boolean;
  pending: ConsegnaCreateRequest | null;
  outcome: ConsegnaCreateResult | null;
  receipt: Extract<ConsegnaCreateResult, { kind: 'saved' }> | null;
}
export interface ConsegnaSaveToken {
  patientId: string;
  generation: number;
  revision: number;
  request: ConsegnaCreateRequest;
}
export function createConsegnaDraftStore() {
  const drafts = new Map<string, ConsegnaDraft>();
  const listeners = new Set<() => void>();
  let generation = 0;
  let version = 0;
  let persistence: { storage: DraftStorage; key: string } | null = null;
  let scope: string | null = null;
  let persistenceError = false;
  let readFailed = false;
  const notify = () => {
    if (persistence && !readFailed) {
      try {
        const rows = [...drafts].filter(([, d]) => d.dirty || d.pending);
        const json = JSON.stringify(rows);
        if (rows.length > 100 || json.length > 1_000_000) throw new Error('Draft storage limit');
        if (rows.length) persistence.storage.setItem(persistence.key, json);
        else persistence.storage.removeItem(persistence.key);
        persistenceError = false;
      } catch { persistenceError = true; }
    }
    version++;
    listeners.forEach((listener) => listener());
  };
  const get = (id: string): ConsegnaDraft => {
    if (!drafts.has(id))
      drafts.set(id, {
        fields: emptyConsegnaFields(),
        revision: 0,
        dirty: false,
        saving: false,
        pending: null,
        outcome: null,
        receipt: null,
      });
    return drafts.get(id)!;
  };
  const matches = (token: ConsegnaSaveToken) =>
    token.generation === generation && get(token.patientId).pending === token.request;
  const store = {
    persistenceFailed: () => persistenceError,
    bindStorage(nextScope: string, storage?: DraftStorage) {
      if (scope === nextScope) return;
      generation++;
      drafts.clear();
      scope = nextScope;
      readFailed = false;
      persistenceError = false;
      try {
        persistence = { storage: storage ?? window.sessionStorage, key: `clinicos:handover-drafts:v1:${encodeURIComponent(nextScope)}` };
        const raw = persistence.storage.getItem(persistence.key);
        const rows: unknown = raw && raw.length <= 1_000_000 ? JSON.parse(raw) : [];
        if (!Array.isArray(rows) || rows.length > 100) throw new Error('Invalid draft storage');
        for (const row of rows) {
          if (!Array.isArray(row) || row.length !== 2) continue;
          const [id, d] = row as [string, ConsegnaDraft];
          if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id) || !d?.fields ||
              typeof d.fields.note !== 'string' || d.fields.note.length > 4000 ||
              !['normale', 'alta', 'urgente'].includes(d.fields.priorita) ||
              !Number.isSafeInteger(d.revision) || d.revision < 0) continue;
          if (d.pending) {
            try {
              createConsegnaRequest(d.pending);
              if (d.pending.pazienteId !== id || !/^[A-Za-z0-9_-]{1,128}$/.test(d.pending.requestId)) continue;
            } catch { continue; }
          }
          drafts.set(id, { fields: { ...emptyConsegnaFields(), ...d.fields }, revision: d.revision,
            dirty: true, saving: false, pending: d.pending ? Object.freeze(d.pending) : null,
            receipt: null, outcome: d.pending ? { kind: 'failed', uncertain: true, code: 'unverified', message: 'Invio interrotto: riprova lo stesso salvataggio.' } : null });
        }
      } catch { persistenceError = true; readFailed = true; }
      version++;
      listeners.forEach((listener) => listener());
    },
    get,
    getVersion: () => version,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    hasUnsaved: () =>
      [...drafts.values()].some((draft) => draft.dirty || draft.saving || draft.pending),
    hasCurrentReceipt: (token: ConsegnaSaveToken) => {
      if (token.generation !== generation) return false;
      const draft = get(token.patientId);
      return (
        draft.revision === token.revision &&
        draft.receipt?.requestId === token.request.requestId &&
        !draft.dirty &&
        !draft.saving &&
        !draft.pending
      );
    },
    update: (id: string, fields: Partial<ConsegnaFields>) => {
      const draft = get(id);
      if (draft.saving || draft.pending) return;
      drafts.set(id, {
        ...draft,
        fields: { ...draft.fields, ...fields },
        revision: draft.revision + 1,
        dirty: true,
        outcome: null,
      });
      notify();
    },
    discard: (id: string) => {
      if (get(id).saving || get(id).pending) return;
      drafts.delete(id);
      notify();
    },
    begin: (id: string): ConsegnaSaveToken | null => {
      const draft = get(id);
      if (draft.saving) return null;
      if (draft.pending && draft.outcome?.kind === 'failed' && !draft.outcome.uncertain)
        return null;
      try {
        const request = draft.pending ?? createConsegnaRequest({ ...draft.fields, tipo: 'Segnalazione', scadenza: localIsoDate(), oraScadenza: '', pazienteId: id });
        drafts.set(id, { ...draft, pending: request, saving: true, outcome: null });
        notify();
        return { patientId: id, revision: draft.revision, generation, request };
      } catch (error) {
        drafts.set(id, {
          ...draft,
          outcome: {
            kind: 'failed',
            code: 'validation',
            uncertain: false,
            message: error instanceof Error ? error.message : 'Dati non validi.',
          },
        });
        notify();
        return null;
      }
    },
    finish: (token: ConsegnaSaveToken, outcome: ConsegnaCreateResult) => {
      if (!matches(token)) return false;
      const draft = get(token.patientId);
      if (
        outcome.kind === 'saved' &&
        (outcome.requestId !== token.request.requestId ||
          outcome.record.pazienteId !== token.patientId)
      )
        outcome = {
          kind: 'failed',
          uncertain: true,
          code: 'unverified',
          message: 'Ricevuta non verificata. Riprova lo stesso salvataggio.',
        };
      if (outcome.kind === 'saved')
        drafts.set(token.patientId, {
          ...draft,
          ...(draft.revision === token.revision
            ? { fields: emptyConsegnaFields(), dirty: false }
            : {}),
          saving: false,
          pending: null,
          receipt: outcome,
          outcome,
        });
      else
        drafts.set(token.patientId, {
          ...draft,
          saving: false,
          outcome,
          pending: outcome.code === 'validation' ? null : token.request,
        });
      notify();
      return outcome.kind === 'saved';
    },
    clear: () => {
      generation++;
      drafts.clear();
      readFailed = false;
      notify();
    },
    current: matches,
  };
  return store;
}
export type ConsegnaDraftStore = ReturnType<typeof createConsegnaDraftStore>;
export async function submitConsegna(
  store: ConsegnaDraftStore,
  token: ConsegnaSaveToken,
  onAdd: ConsegnaCreate,
) {
  let outcome: ConsegnaCreateResult;
  try {
    outcome = await onAdd(token.request);
  } catch {
    outcome = {
      kind: 'failed',
      uncertain: true,
      code: 'unverified',
      message: 'Esito non verificato. Riprova lo stesso salvataggio.',
    };
  }
  return store.finish(token, outcome);
}
