import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAssessmentDraftStore } from '../assessments/assessmentDraftStore';
import { createConsegnaDraftStore } from '../consegnaDrafts';
import { completeAnswers } from './assessments.fixtures';
import type { DraftStorage } from '../assessments/assessmentDraftPersistence';
const memory = (): DraftStorage => {
  const values = new Map<string, string>();
  return {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => {
      values.set(k, v);
    },
    removeItem: (k) => {
      values.delete(k);
    },
  };
};
test('unfinished assessment survives reload, is scoped to author, and deletion persists', () => {
  const storage = memory();
  const first = createAssessmentDraftStore();
  first.bindStorage('operator-a:infermiere', storage);
  const key = first.create('patient-a');
  first.update(key, { answers: { ...completeAnswers, respiration: null } });
  const fresh = createAssessmentDraftStore();
  fresh.bindStorage('operator-a:infermiere', storage);
  assert.equal(fresh.get(key)?.fields.answers.respiration, null);
  assert.equal(fresh.get(key)?.fields.answers.facialExpression, 2);
  const other = createAssessmentDraftStore();
  other.bindStorage('operator-b:infermiere', storage);
  assert.equal(other.list('patient-a').length, 0);
  fresh.discard(key);
  const after = createAssessmentDraftStore();
  after.bindStorage('operator-a:infermiere', storage);
  assert.equal(after.get(key), undefined);
});
test('interrupted assessment retains exact request and blocks discard until resolved', () => {
  const storage = memory();
  const first = createAssessmentDraftStore();
  first.bindStorage('operator-a:infermiere', storage);
  const key = first.create('patient-a');
  first.update(key, { answers: { ...completeAnswers } });
  const token = first.begin(key, 'save')!;
  const fresh = createAssessmentDraftStore();
  fresh.bindStorage('operator-a:infermiere', storage);
  assert.equal(fresh.get(key)?.busy, false);
  fresh.discard(key);
  assert.ok(fresh.get(key));
  assert.deepEqual(fresh.begin(key, 'save')?.operation, token.operation);
});
test('handover reload retains text, patient and immutable retry identity; logout clears', () => {
  const storage = memory();
  const first = createConsegnaDraftStore();
  first.bindStorage('operator-a:infermiere', storage);
  first.update('patient-a', { note: 'Osservazione sintetica', priorita: 'urgente' });
  const token = first.begin('patient-a')!;
  const fresh = createConsegnaDraftStore();
  fresh.bindStorage('operator-a:infermiere', storage);
  assert.equal(fresh.get('patient-a').saving, false);
  assert.equal(fresh.get('patient-a').fields.note, 'Osservazione sintetica');
  fresh.discard('patient-a');
  assert.equal(fresh.get('patient-a').pending?.requestId, token.request.requestId);
  assert.deepEqual(fresh.begin('patient-a')?.request, token.request);
  const other = createConsegnaDraftStore();
  other.bindStorage('operator-b:infermiere', storage);
  assert.equal(other.hasUnsaved(), false);
  fresh.clear();
  const after = createConsegnaDraftStore();
  after.bindStorage('operator-a:infermiere', storage);
  assert.equal(after.hasUnsaved(), false);
});
test('storage quota failure leaves writable in-memory drafts and reports failure', () => {
  const storage: DraftStorage = {
    getItem: () => null,
    setItem: () => {
      throw new Error('quota');
    },
    removeItem: () => {},
  };
  const store = createConsegnaDraftStore();
  store.bindStorage('operator-a:infermiere', storage);
  store.update('patient-a', { note: 'Sintetico' });
  assert.equal(store.persistenceFailed(), true);
  assert.equal(store.get('patient-a').fields.note, 'Sintetico');
  const forms = createAssessmentDraftStore();
  forms.bindStorage('operator-a:infermiere', storage);
  const key = forms.create('patient-a');
  forms.update(key, { answers: { ...completeAnswers } });
  assert.equal(forms.persistenceFailed(), true);
  assert.equal(forms.get(key)?.fields.answers.facialExpression, 2);
});
test('assessment read failure never removes or overwrites the saved draft', () => {
  let removed = 0,
    written = 0;
  const storage: DraftStorage = {
    getItem: () => {
      throw new Error('read blocked');
    },
    setItem: () => {
      written++;
    },
    removeItem: () => {
      removed++;
    },
  };
  const store = createAssessmentDraftStore();
  store.bindStorage('operator-a:infermiere', storage);
  assert.equal(store.persistenceFailed(), true);
  assert.equal(removed, 0);
  assert.equal(written, 0);
  const key = store.create('patient-a');
  store.update(key, { answers: { ...completeAnswers } });
  assert.equal(written, 0);
  assert.equal(store.get(key)?.fields.answers.facialExpression, 2);
  const handovers = createConsegnaDraftStore();
  handovers.bindStorage('operator-a:infermiere', storage);
  handovers.update('patient-a', { note: 'Bozza conservata in memoria' });
  assert.equal(handovers.persistenceFailed(), true);
  assert.equal(written, 0);
  assert.equal(removed, 0);
});
