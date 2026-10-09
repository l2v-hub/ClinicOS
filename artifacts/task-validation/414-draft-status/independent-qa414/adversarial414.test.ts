import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createAssessmentDraftStore } from '../../../../frontend/src/lib/assessments/assessmentDraftStore';
import { assessment, completeAnswers, uncertain, conflict } from '../../../../frontend/src/lib/__tests__/assessments.fixtures';
import { AssessmentDraftStatus, draftAvailability } from '../../../../frontend/src/components/operator/assessments/AssessmentDraftStatus';
import { AssessmentCatalogView } from '../../../../frontend/src/components/operator/assessments/AssessmentCatalog';
import { LegacyDraftTools } from '../../../../frontend/src/components/operator/assessments/LegacyDraftTools';
import { CATALOG_TYPES } from '../../../../frontend/src/lib/assessments/assessmentCatalog';
import { ASSESSMENT_VERSIONS } from '../../../../frontend/src/lib/assessments/assessmentTypes';
import type { CartellaPaziente } from '../../../../frontend/src/types';
Object.assign(globalThis, { React });
const presentation = (store: ReturnType<typeof createAssessmentDraftStore>, key: string) => draftAvailability(store.get(key)!, store.persistenceFailed());
const isSaved = (label: string) => /Bozza salvata in ClinicOS/.test(label);

test('independent414 real store lifecycle: pending and uncertain are never an optimistic save, retry uses exact request', () => {
  const store = createAssessmentDraftStore(), key = store.create('patient-a');
  store.update(key, { answers: completeAnswers });
  const initial = structuredClone(store.get(key)!);
  assert.equal(isSaved(presentation(store, key).label), false);
  const token = store.begin(key, 'save')!;
  assert.equal(presentation(store, key).label, 'Salvataggio in corso');
  store.finish(token, uncertain);
  assert.equal(isSaved(presentation(store, key).label), false);
  assert.match(presentation(store, key).label, /verificare/);
  assert.deepEqual(store.get(key)!.fields.answers, initial.fields.answers);
  const retry = store.begin(key, 'save')!;
  assert.equal(retry.operation, token.operation);
  store.finish(retry, { kind: 'saved', assessment: assessment({ updatedAt: '2026-10-09T10:00:00.000Z' }) });
  assert.equal(isSaved(presentation(store, key).label), true);
  assert.equal(presentation(store, key).confirmedAt, '09/10/2026 12:00');
  store.update(key, { answers: { ...completeAnswers, respiration: 2 } });
  assert.equal(isSaved(presentation(store, key).label), false);
  assert.equal(presentation(store, key).confirmedAt, '09/10/2026 12:00');
});

test('independent414 conflict remains unconfirmed and immutable until existing explicit reconciliation', () => {
  const store = createAssessmentDraftStore(), key = store.load(assessment());
  store.update(key, { answers: { ...completeAnswers, respiration: 2 } });
  const token = store.begin(key, 'save')!;
  store.finish(token, conflict);
  assert.equal(isSaved(presentation(store, key).label), false);
  assert.equal(store.begin(key, 'save'), null);
  store.remote(key, assessment({ version: 2 }));
  store.resolve(key, true);
  assert.equal(store.get(key)!.fields.answers.respiration, 2);
  assert.equal(isSaved(presentation(store, key).label), false);
  const save = store.begin(key, 'save')!;
  assert.equal(save.operation.kind === 'patch' && save.operation.body.expectedVersion, 2);
});

test('independent414 partial saved draft failing preview does not falsify acknowledged save', () => {
  const store = createAssessmentDraftStore(), key = store.load(assessment({ answers: { respiration: 0, negativeVocalization: null, facialExpression: null, bodyLanguage: null, consolability: null } }));
  assert.equal(isSaved(presentation(store, key).label), true);
  assert.equal(store.preview(key), false);
  assert.equal(store.get(key)!.failure?.code, 'assessment_incomplete');
  assert.equal(store.get(key)!.dirty, false);
  assert.equal(presentation(store, key).label, 'Compilazione da completare');
  assert.match(presentation(store, key).help, /bozza è stata salvata/);
  assert.ok(presentation(store, key).confirmedAt);
  assert.equal(store.get(key)!.record?.version, 1);
});

test('independent414 saved draft cannot finalize without preview, but existing saved receipt stays true', () => {
  const store = createAssessmentDraftStore(), key = store.load(assessment());
  assert.equal(store.begin(key, 'finalize'), null);
  assert.equal(store.get(key)!.failure?.code, 'assessment_invalid_input');
  assert.ok(presentation(store, key).confirmedAt);
  assert.equal(store.get(key)!.record?.status, 'draft');
  assert.equal(store.get(key)!.dirty, false);
  assert.equal(store.get(key)!.preview, null);
});

test('independent414 failed browser storage never promises reload in unconfirmed state', () => {
  const store = createAssessmentDraftStore();
  store.bindStorage('operator-a:operatore', { getItem() { return null; }, setItem() { throw new Error('Synthetic blocked storage'); }, removeItem() {} });
  const key = store.create('patient-a'), token = store.begin(key, 'save')!;
  store.finish(token, uncertain);
  const state = presentation(store, key);
  assert.equal(isSaved(state.label), false);
  assert.match(state.help, /finestra/);
  assert.match(state.help, /non.*ricaricamento/);
  assert.doesNotMatch(state.help, /server|\bDraft\b/);
});

test('independent414 saved timestamp is receipt time in Rome, never observation or render clock', () => {
  const store = createAssessmentDraftStore(), key = store.load(assessment({ assessedAt: '2020-01-01T08:30:00.000Z', updatedAt: '2026-12-01T10:00:00.000Z' }));
  const before = structuredClone(store.get(key)!);
  assert.equal(presentation(store, key).confirmedAt, '01/12/2026 11:00');
  const html = renderToStaticMarkup(React.createElement(AssessmentDraftStatus, { draft: store.get(key)!, storageFailed: false }));
  assert.match(html, /Ultimo salvataggio confermato/);
  assert.match(html, /01\/12\/2026 11:00/);
  assert.doesNotMatch(html, /01\/01\/2020/);
  assert.deepEqual(store.get(key), before);
});

test('independent414 stale catalog counts never claim currently confirmed availability', () => {
  const data = { items: CATALOG_TYPES.map(type => ({ type, formVersion: ASSESSMENT_VERSIONS[type], latestFinal: null, ownDraftCount: 1, latestOwnDraft: { id: `synthetic-${type}`, formVersion: ASSESSMENT_VERSIONS[type], assessedAt: '2026-10-08T06:00:00.000Z', createdAt: '2026-10-09T10:00:00.000Z', updatedAt: '2026-10-09T10:00:00.000Z' } })) };
  const props = { cartella: {} as CartellaPaziente, localDraftTypes: new Set(['painad']), onRetry() {}, onOpen() {}, onNrs() {} };
  for (const status of ['loading', 'error'] as const) {
    const html = renderToStaticMarkup(React.createElement(AssessmentCatalogView, { ...props, state: { status, data, error: status === 'error' ? 'Errore sintetico' : null } }));
    assert.doesNotMatch(html, /bozza salvata personale|ultimo salvataggio confermato/);
    assert.match(html, /Bozza da riprendere/);
  }
  const ready = renderToStaticMarkup(React.createElement(AssessmentCatalogView, { ...props, state: { status: 'ready', data, error: null } }));
  assert.match(ready, /bozza salvata personale/);
  assert.match(ready, /ultimo salvataggio confermato/);
});

test('independent414 legacy draft conveys locality without inventing typed save receipt', () => {
  const html = renderToStaticMarkup(React.createElement(LegacyDraftTools, { dirty: true, error: false, onDelete() {} }));
  assert.match(html, /questa finestra/);
  assert.match(html, /altro dispositivo/);
  assert.match(html, /nuovo accesso/);
  assert.doesNotMatch(html, /Bozza salvata in ClinicOS|Ultimo salvataggio confermato|server|\bDraft\b/);
});
