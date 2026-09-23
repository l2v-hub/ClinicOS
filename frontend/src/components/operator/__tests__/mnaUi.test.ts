import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MnaForm } from '../assessments/MnaForm';
import { AssessmentSummary } from '../assessments/AssessmentSummary';
import { AssessmentHistory } from '../assessments/AssessmentHistory';
import { createAssessmentDraftStore } from '../../../lib/assessments/assessmentDraftStore';
import { updateMnaInput } from '../../../lib/assessments/mnaLocalInputs';
import { completeMna, mnaAssessment } from '../../../lib/__tests__/mna.fixtures';
import type { MnaAnswers } from '../../../lib/assessments/mnaTypes';
import { MNA_VERSION } from '../../../lib/assessments/mnaTypes';
import { assertArchiveDocument } from '../../../lib/patientDocumentArchiveIO';
import { archiveEntryTypeLabel, buildDocumentArchive } from '../../../lib/patientDocumentArchive';
Object.assign(globalThis, { React });
const noop = () => {};
const render = (element: React.ReactElement) => renderToStaticMarkup(element);
test('MNA starts in progressive screening with no clinical selection and opens full without losing G–R', () => {
  const store = createAssessmentDraftStore();
  const key = store.create('patient-a', undefined, 'mna');
  const editor = () =>
    render(
      React.createElement(MnaForm, {
        draft: store.get(key)!,
        store,
        onSave: noop,
        onPreview: noop,
      }),
    );
  let html = editor();
  assert.match(html, /Screening · A–F/);
  assert.match(html, /0 di 6 risposte/);
  assert.doesNotMatch(html, /class="is-selected"|K\. Consuma|Valutazione totale:/);
  assert.match(html, /Société des Produits Nestlé/);
  assert.match(html, /MNA®/);
  const full = { ...(store.get(key)!.fields.answers as MnaAnswers), extent: 'full' as const };
  store.update(key, { answers: full });
  html = editor();
  assert.match(html, /0 di 12 risposte/);
  assert.match(html, /0 di 3 risposte/);
  assert.match(html, /Una o due volte la settimana uova o legumi/);
  assert.match(html, /Demenza moderata/);
  assert.match(html, /Q corretto/);
  assert.match(html, /21–22 cm inclusi = 0,5/);
  full.K.dairyDaily = false;
  store.update(key, { answers: { ...full, extent: 'screening' } });
  html = editor();
  assert.match(html, /Dati globali aggiuntivi conservati/);
  assert.match(html, /1 di 3 risposte/);
});
test('invalid numeric/date input and over-limit Unicode notes stay rendered and recover without stale BMI or save', () => {
  const store = createAssessmentDraftStore();
  const key = store.load(mnaAssessment());
  const input = (raw: string) => {
    const f = store.get(key)!.fields;
    store.update(
      key,
      updateMnaInput(f.answers as MnaAnswers, f.mnaInputs, 'measurements.weightKg', raw),
    );
  };
  input('60');
  const fields = store.get(key)!.fields;
  store.update(
    key,
    updateMnaInput(fields.answers as MnaAnswers, fields.mnaInputs, 'measurements.heightCm', '170'),
  );
  input('60bad');
  const editor = () =>
    render(
      React.createElement(MnaForm, {
        draft: store.get(key)!,
        store,
        onSave: noop,
        onPreview: noop,
      }),
    );
  let html = editor();
  assert.match(html, /value="60bad"/);
  assert.match(html, /Calcolo e salvataggio non disponibili/);
  assert.doesNotMatch(html, /IMC: 20|Screening: 14\/14|Valutazione totale: 30/);
  assert.equal(store.begin(key, 'save'), null);
  input('61,5');
  const answers = store.get(key)!.fields.answers as MnaAnswers;
  store.update(key, { answers: { ...answers, notes: '😀'.repeat(4001) } });
  html = editor();
  assert.match(html, /4001 di 4000 caratteri/);
  assert.doesNotMatch(html, /maxlength="4000"/);
  assert.ok(html.includes('😀'.repeat(4001)));
  assert.equal(store.begin(key, 'save'), null);
  assert.doesNotThrow(editor);
  store.update(key, { answers: { ...answers, notes: '😀'.repeat(4000) } });
  assert.ok(store.begin(key, 'save'));
});
test('screening summary/history label extent, show retained partial K and copyright, and omit total30', () => {
  const answers = {
    ...completeMna(),
    extent: 'screening' as const,
    K: { dairyDaily: true, eggsOrLegumesWeekly: null, meatFishOrPoultryDaily: false },
  };
  const final = mnaAssessment({ answers, status: 'final' });
  const html = render(React.createElement(AssessmentSummary, { record: final }));
  assert.match(html, /Screening MNA®/);
  assert.match(html, /Dati globali aggiuntivi conservati/);
  assert.match(html, /Una o due volte la settimana uova o legumi\?: Non compilato/);
  assert.match(html, /Sesso/);
  assert.match(html, /Non disponibile/);
  assert.match(html, /Età alla data/);
  assert.match(html, /Trademark Owners/);
  assert.match(html, /Revision 2006/);
  assert.match(html, /www\.mna-elderly\.com/);
  assert.doesNotMatch(html, /Valutazione totale:|\/30/);
  const history = {
    items: [final],
    status: 'all',
    from: '',
    to: '',
    loading: false,
    error: null,
    hasMore: false,
    setStatus: noop,
    setFrom: noop,
    setTo: noop,
    refresh: noop,
    loadMore: noop,
  };
  const list = render(
    React.createElement(AssessmentHistory, {
      history: history as Parameters<typeof AssessmentHistory>[0]['history'],
      onOpen: noop,
    }),
  );
  assert.match(list, /Screening MNA®/);
  assert.match(list, /14\/14/);
  assert.doesNotMatch(list, /undefined|object Object|\/30/);
});
test('MNA document metadata validates type/version and navigable archive label', () => {
  const document = {
    id: 'doc-a',
    originalName: 'MNA.pdf',
    documentType: 'patient_assessment',
    mimeType: 'application/pdf',
    sizeBytes: 1000,
    createdAt: '2026-09-23T12:00:00.000Z',
    assessment: {
      id: 'mna-a',
      type: 'mna' as const,
      formVersion: MNA_VERSION,
      assessedAt: '2026-09-23T12:00:00.000Z',
    },
  };
  assert.doesNotThrow(() => assertArchiveDocument(document));
  assert.throws(() =>
    assertArchiveDocument({
      ...document,
      assessment: { ...document.assessment, formVersion: 'wrong' },
    }),
  );
  const entries = buildDocumentArchive([], [document]);
  assert.match(archiveEntryTypeLabel(entries[0]), /MNA/);
});
