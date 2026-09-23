import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TinettiForm } from '../assessments/TinettiForm';
import { AssessmentSummary } from '../assessments/AssessmentSummary';
import { AssessmentHistory } from '../assessments/AssessmentHistory';
import { ScalaTinettiTab, LegacyTinettiDetail } from '../cartella/ScalaTinettiTab';
import { createAssessmentDraftStore } from '../../../lib/assessments/assessmentDraftStore';
import { TINETTI_ITEMS } from '../../../lib/assessments/tinettiDefinition';
import { completeTinetti, tinettiAssessment } from '../../../lib/__tests__/tinetti.fixtures';
import { finalAssessment } from '../../../lib/__tests__/assessments.fixtures';
import {
  buildDocumentArchive,
  filterDocumentArchive,
  archiveEntryTypeLabel,
} from '../../../lib/patientDocumentArchive';
import { assertArchiveDocument } from '../../../lib/patientDocumentArchiveIO';
import { TINETTI_VERSION } from '../../../lib/assessments/tinettiTypes';
import type { CartellaPaziente, Paziente } from '../../../types';
Object.assign(globalThis, { React });
const render = (element: React.ReactElement) => renderToStaticMarkup(element);
const noop = () => {};
const patient = {
  id: 'patient-a',
  firstName: 'Paziente',
  lastName: 'Sintetico',
  dateOfBirth: '1940-01-01',
} as Paziente;

test('Tinetti editor shows two groups and 48 compact accessible options with no preselection', () => {
  const store = createAssessmentDraftStore();
  const key = store.create('patient-a', undefined, 'tinetti');
  const html = render(
    React.createElement(TinettiForm, {
      draft: store.get(key)!,
      store,
      onSave: noop,
      onPreview: noop,
    }),
  );
  assert.equal((html.match(/type="radio"/g) ?? []).length, 48);
  assert.equal((html.match(/checked=""/g) ?? []).length, 0);
  assert.equal((html.match(/class="assessment-item"/g) ?? []).length, 20);
  assert.match(html, /0 di 20 risposte/);
  assert.match(html, /Equilibrio · massimo 16/);
  assert.match(html, /Andatura · massimo 12/);
  assert.match(html, /tinetti-options/);
  assert.match(html, /nessun risultato o fascia di rischio/);
  assert.doesNotMatch(html, /Alto rischio|Basso rischio|\/10|maxlength="4000"/);
  for (const item of TINETTI_ITEMS) assert.ok(html.includes(`data-field-path="${item.id}"`));
});
test('Tinetti notes retain 4000 Unicode codepoints and remain editable above the limit without render crashes', () => {
  const store = createAssessmentDraftStore();
  const key = store.create('patient-a', undefined, 'tinetti');
  const answers = { ...completeTinetti(), notes: '😀'.repeat(4001) };
  store.update(key, { answers });
  const editor = () =>
    render(
      React.createElement(TinettiForm, {
        draft: store.get(key)!,
        store,
        onSave: noop,
        onPreview: noop,
      }),
    );
  let html = editor();
  assert.ok(html.includes(answers.notes));
  assert.match(html, /4001 di 4000/);
  assert.match(html, /role="alert"/);
  assert.equal(store.begin(key, 'save'), null);
  assert.equal(store.hasUnsaved(), true);
  assert.deepEqual(store.get(key)!.fields.answers, answers);
  assert.doesNotThrow(editor);
  answers.notes = '😀'.repeat(4000);
  store.update(key, { answers });
  html = editor();
  assert.ok(html.includes(answers.notes));
  assert.match(html, /4000 di 4000/);
  assert.doesNotMatch(html, /role="alert"/);
  assert.ok(store.begin(key, 'save'));
});
test('Tinetti summary/history use 28 denominator and frozen notes while PAINAD remains explicitly 10', () => {
  const record = tinettiAssessment({ status: 'final' });
  const html = render(React.createElement(AssessmentSummary, { record }));
  assert.match(html, /28\/28/);
  assert.match(html, /Equilibrio 16\/16 · Andatura 12\/12/);
  assert.ok(html.includes(record.answers.notes));
  assert.match(html, /quattro risposte distinte/);
  assert.doesNotMatch(html, /\/10(?!\/)|Dolore lieve/);
  const painad = render(React.createElement(AssessmentSummary, { record: finalAssessment() }));
  assert.match(painad, /4\/10/);
  assert.doesNotMatch(painad, /\/28/);
  const history = render(
    React.createElement(AssessmentHistory, {
      onOpen: noop,
      history: {
        items: [record],
        loading: false,
        error: '',
        status: 'all',
        setStatus: noop,
        from: '',
        setFrom: noop,
        to: '',
        setTo: noop,
        hasMore: false,
        loadMore: noop,
        refresh: noop,
      },
    }),
  );
  assert.match(history, /28\/28/);
  assert.doesNotMatch(history, /\/10(?!\/)/);
});
test('legacy detail and print source preserve data with no creation/deletion controls or risk on invalid rows', () => {
  const legacy = {
    ...completeTinetti(),
    id: 'old-id',
    data: '1999-01-01',
    createdAt: 'Original creation text',
    operatore: 'Operatore storico',
    note: 'Note\n legacy ',
  };
  const invalid = { ...legacy, id: 'old-incomplete', equilibrioSeduto: -1 };
  const cartella = { valutazioniTinetti: [legacy, invalid] } as unknown as CartellaPaziente;
  const before = JSON.stringify(cartella);
  const html = render(React.createElement(ScalaTinettiTab, { cartella, paziente: patient }));
  assert.match(html, /Storico precedente · sola lettura/);
  assert.match(html, /Stampa scheda precedente/);
  assert.match(html, /28\/28 · Basso rischio/);
  assert.match(html, /Incompleta o dati non validi/);
  assert.doesNotMatch(html, /<input|<textarea|Elimina|Nuova valutazione|role="tab"/);
  const printed = render(
    React.createElement(LegacyTinettiDetail, { record: invalid, paziente: patient }),
  );
  assert.match(printed, /Original creation text/);
  assert.match(printed, /old-incomplete/);
  assert.ok(printed.includes(legacy.note));
  assert.doesNotMatch(
    printed,
    /Basso rischio|Alto rischio|Rischio moderato|assessment-result|tinetti-it-/,
  );
  assert.equal(JSON.stringify(cartella), before);
  const store = createAssessmentDraftStore();
  store.create('patient-a', undefined, 'tinetti');
  assert.equal(JSON.stringify(cartella), before);
});
test('Tinetti archive metadata and filters carry the explicit module/version pair', () => {
  const doc = {
    id: 'doc-tinetti',
    originalName: 'Tinetti.pdf',
    documentType: 'patient_assessment',
    mimeType: 'application/pdf',
    sizeBytes: 120,
    importJobId: null,
    createdAt: '2026-09-23T10:00:00Z',
    assessment: {
      id: 'tinetti-a',
      type: 'tinetti' as const,
      formVersion: TINETTI_VERSION,
      assessedAt: '2026-09-23T09:00:00Z',
    },
  };
  assertArchiveDocument(doc);
  assert.throws(() =>
    assertArchiveDocument({
      ...doc,
      assessment: { ...doc.assessment, formVersion: 'painad-it-2026-09-22-v1' },
    }),
  );
  const entries = buildDocumentArchive([], [doc]);
  assert.equal(archiveEntryTypeLabel(entries[0]), 'Scala di Tinetti');
  assert.equal(
    filterDocumentArchive(
      entries,
      'valutazioni',
      'tinetti',
      'tutti',
      'patient_assessment',
      'tinetti',
    ).length,
    1,
  );
  assert.equal(
    filterDocumentArchive(entries, 'valutazioni', '', 'tutti', 'patient_assessment', 'painad')
      .length,
    0,
  );
});
