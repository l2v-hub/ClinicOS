import { facilityLocalMinute } from '../facilityTime';
import {
  PAINAD_KEYS,
  PAINAD_VERSION,
  type AssessmentDto,
  type AssessmentFields,
  type AssessmentOperation,
  type AssessmentFailure,
  type AssessmentWriteResult,
} from './assessmentTypes';
import { assertPainadAnswers } from './assessmentValidation';
import { assessmentEditable, assessmentFields } from './assessmentTime';
import { emptyPainadAnswers, painadResult } from './painadDefinition';
import type { AssessmentClient } from './assessmentClient';
export interface AssessmentDraft {
  key: string;
  patientId: string;
  predecessorId: string | null;
  fields: AssessmentFields;
  record: AssessmentDto | null;
  remote: AssessmentDto | null;
  revision: number;
  dirty: boolean;
  busy: boolean;
  pending: AssessmentOperation | null;
  failure: AssessmentFailure | null;
  preview: { version: number; revision: number } | null;
}
export interface AssessmentWriteToken {
  key: string;
  patientId: string;
  generation: number;
  revision: number;
  operation: AssessmentOperation;
}
const validation = (message: string): AssessmentFailure => ({
  code: 'assessment_invalid_input',
  uncertain: false,
  message,
});
export function createAssessmentDraftStore() {
  const drafts = new Map<string, AssessmentDraft>();
  const listeners = new Set<() => void>();
  let generation = 0;
  let version = 0;
  const notify = () => {
    version++;
    listeners.forEach((listener) => listener());
  };
  const set = (key: string, value: AssessmentDraft) => {
    drafts.set(key, value);
    notify();
  };
  const current = (token: AssessmentWriteToken) =>
    generation === token.generation && drafts.get(token.key)?.pending === token.operation;
  const store = {
    get: (key: string) => drafts.get(key),
    getVersion: () => version,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    list: (patientId: string) =>
      [...drafts.values()].filter((draft) => draft.patientId === patientId),
    hasUnsaved: () =>
      [...drafts.values()].some((draft) => draft.dirty || draft.busy || draft.pending),
    create(patientId: string, predecessor?: AssessmentDto) {
      if (
        predecessor &&
        (predecessor.patientId !== patientId ||
          predecessor.status !== 'final' ||
          predecessor.correctedById)
      )
        throw new Error('Valutazione non rettificabile.');
      const existing = [...drafts.values()].find(
        (draft) =>
          draft.patientId === patientId &&
          !draft.record &&
          draft.predecessorId === (predecessor?.id ?? null),
      );
      if (existing) return existing.key;
      const key = crypto.randomUUID();
      const now = new Date();
      set(key, {
        key,
        patientId,
        predecessorId: predecessor?.id ?? null,
        fields: {
          assessedAtLocal: predecessor
            ? assessmentFields(predecessor).assessedAtLocal
            : facilityLocalMinute(now),
          instantChoice: predecessor?.assessedAt ?? now.toISOString(),
          answers: predecessor ? { ...predecessor.answers } : emptyPainadAnswers(),
          correctionReason: '',
        },
        record: null,
        remote: null,
        revision: 0,
        dirty: true,
        busy: false,
        pending: null,
        failure: null,
        preview: null,
      });
      return key;
    },
    load(record: AssessmentDto) {
      const existing = [...drafts.values()].find(
        (draft) => draft.patientId === record.patientId && draft.record?.id === record.id,
      );
      if (existing && (existing.dirty || existing.busy || existing.pending)) return existing.key;
      const key = existing?.key ?? crypto.randomUUID();
      set(key, {
        key,
        patientId: record.patientId,
        predecessorId: record.predecessorId,
        fields: assessmentFields(record),
        record,
        remote: null,
        revision: existing?.revision ?? 0,
        dirty: false,
        busy: false,
        pending: null,
        failure: null,
        preview: null,
      });
      return key;
    },
    update(key: string, fields: Partial<AssessmentFields>) {
      const draft = drafts.get(key);
      if (!draft || draft.busy || draft.pending || draft.record?.status === 'final') return;
      set(key, {
        ...draft,
        fields: { ...draft.fields, ...fields },
        revision: draft.revision + 1,
        dirty: true,
        failure: null,
        preview: null,
      });
    },
    preview(key: string) {
      const draft = drafts.get(key);
      if (
        !draft?.record ||
        draft.record.status !== 'draft' ||
        draft.busy ||
        draft.pending ||
        draft.dirty ||
        !painadResult(draft.fields.answers)
      )
        return false;
      set(key, { ...draft, preview: { revision: draft.revision, version: draft.record.version } });
      return true;
    },
    edit(key: string) {
      const draft = drafts.get(key);
      if (draft && !draft.busy && !draft.pending) set(key, { ...draft, preview: null });
    },
    begin(key: string, kind: 'save' | 'finalize'): AssessmentWriteToken | null {
      const draft = drafts.get(key);
      if (!draft || draft.busy || draft.record?.status === 'final') return null;
      if (draft.pending && draft.failure && !draft.failure.uncertain) return null;
      let operation = draft.pending;
      try {
        if (!operation) {
          if (kind === 'finalize') {
            if (
              !draft.record ||
              draft.dirty ||
              draft.preview?.revision !== draft.revision ||
              draft.preview?.version !== draft.record.version ||
              !painadResult(draft.fields.answers)
            )
              throw new Error('Salva e verifica l’anteprima completa prima di finalizzare.');
            operation = {
              kind: 'finalize',
              id: draft.record.id,
              body: Object.freeze({
                requestId: crypto.randomUUID(),
                expectedVersion: draft.record.version,
              }),
            };
          } else {
            const fields = assessmentEditable(draft.fields, !!draft.predecessorId);
            assertPainadAnswers(fields.answers);
            Object.freeze(fields.answers);
            operation = draft.record
              ? {
                  kind: 'patch',
                  id: draft.record.id,
                  body: Object.freeze({ ...fields, expectedVersion: draft.record.version }),
                }
              : {
                  kind: 'create',
                  body: Object.freeze({
                    ...fields,
                    requestId: crypto.randomUUID(),
                    type: 'painad',
                    formVersion: PAINAD_VERSION,
                    ...(draft.predecessorId ? { predecessorId: draft.predecessorId } : {}),
                  }),
                };
          }
        }
        set(key, { ...draft, pending: operation, busy: true, failure: null, remote: null });
        return { key, patientId: draft.patientId, generation, revision: draft.revision, operation };
      } catch (error) {
        set(key, {
          ...draft,
          failure: validation(error instanceof Error ? error.message : 'Dati non validi.'),
        });
        return null;
      }
    },
    finish(token: AssessmentWriteToken, outcome: AssessmentWriteResult) {
      if (!current(token)) return false;
      const draft = drafts.get(token.key)!;
      if (
        outcome.kind === 'saved' &&
        (outcome.assessment.patientId !== token.patientId ||
          (token.operation.kind !== 'create' && outcome.assessment.id !== token.operation.id))
      )
        outcome = {
          kind: 'failed',
          failure: {
            code: 'unverified',
            uncertain: true,
            message: 'Ricevuta non verificata. I dati sono conservati.',
          },
        };
      if (outcome.kind === 'saved') {
        const record = outcome.assessment;
        set(token.key, {
          ...draft,
          record,
          fields: draft.revision === token.revision ? assessmentFields(record) : draft.fields,
          dirty: draft.revision !== token.revision,
          busy: false,
          pending: null,
          failure: null,
          remote: null,
          preview: null,
        });
        return true;
      }
      const editableFailure = ['assessment_invalid_input', 'assessment_incomplete'].includes(
        outcome.failure.code,
      );
      set(token.key, {
        ...draft,
        busy: false,
        pending: editableFailure ? null : token.operation,
        failure: outcome.failure,
      });
      return false;
    },
    remote(key: string, record: AssessmentDto) {
      const draft = drafts.get(key);
      if (
        !draft ||
        draft.busy ||
        draft.patientId !== record.patientId ||
        draft.record?.id !== record.id
      )
        return;
      set(key, { ...draft, remote: record });
    },
    resolve(key: string, keepLocal: boolean) {
      const draft = drafts.get(key);
      const remote = draft?.remote;
      if (!draft || !remote || draft.busy || (keepLocal && remote.status !== 'draft')) return;
      set(key, {
        ...draft,
        record: remote,
        fields: keepLocal ? draft.fields : assessmentFields(remote),
        dirty: keepLocal,
        revision: draft.revision + 1,
        pending: null,
        failure: null,
        remote: null,
        preview: null,
      });
    },
    discard(key: string) {
      const draft = drafts.get(key);
      if (draft && !draft.busy) {
        drafts.delete(key);
        notify();
      }
    },
    clear() {
      generation++;
      drafts.clear();
      notify();
    },
    current,
  };
  return store;
}
export type AssessmentDraftStore = ReturnType<typeof createAssessmentDraftStore>;
export function patchMatches(record: AssessmentDto, operation: AssessmentOperation) {
  return (
    operation.kind === 'patch' &&
    record.id === operation.id &&
    record.status === 'draft' &&
    record.version === operation.body.expectedVersion + 1 &&
    record.assessedAt === operation.body.assessedAt &&
    PAINAD_KEYS.every((key) => record.answers[key] === operation.body.answers[key]) &&
    (record.correctionReason ?? '') === (operation.body.correctionReason ?? '')
  );
}
export async function submitAssessment(
  store: AssessmentDraftStore,
  token: AssessmentWriteToken,
  client: AssessmentClient,
  isActive: () => boolean = () => true,
) {
  let result: AssessmentWriteResult;
  try {
    result = await client.write(token.patientId, token.operation);
  } catch {
    result = {
      kind: 'failed',
      failure: {
        code: 'unverified',
        uncertain: true,
        message: 'Esito non verificato. I dati sono conservati.',
      },
    };
  }
  if (!store.current(token)) return false;
  if (
    result.kind === 'failed' &&
    result.failure.uncertain &&
    token.operation.kind === 'patch' &&
    isActive()
  ) {
    try {
      const record = await client.get(token.patientId, token.operation.id);
      if (!store.current(token)) return false;
      if (patchMatches(record, token.operation)) result = { kind: 'saved', assessment: record };
    } catch {
      /* Keep the exact uncertain operation for reconciliation/retry. */
    }
  }
  return store.finish(token, result);
}
