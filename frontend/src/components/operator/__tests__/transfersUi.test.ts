import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TransfersForm } from '../assessments/TransfersForm';
import { TransfersSummary } from '../assessments/TransfersSummary';
import { AssessmentFinal } from '../assessments/AssessmentFinal';
import { AssessmentHistory } from '../assessments/AssessmentHistory';
import { PatientArchiveTree } from '../cartella/PatientArchiveTree';
import { createAssessmentDraftStore } from '../../../lib/assessments/assessmentDraftStore';
import { transfersAssessment, completeTransfers } from '../../../lib/__tests__/transfers.fixtures';
import {
  AID_KEYS,
  AID_LABELS,
  assertTransfersAnswers,
  transfersCompletion,
  validTransfersAdmissionDate,
} from '../../../lib/assessments/transfersDefinition';
import {
  buildDocumentArchive,
  filterDocumentArchive,
  archiveFolderLabel,
  archiveEntryTypeLabel,
} from '../../../lib/patientDocumentArchive';
import { assertArchiveDocument } from '../../../lib/patientDocumentArchiveIO';
import { TRANSFERS_VERSION } from '../../../lib/assessments/transfersTypes';
import { PAINAD_VERSION } from '../../../lib/assessments/assessmentTypes';
import { patientTabGroup } from '../tabGroups';
Object.assign(globalThis, { React });
const render = (element: React.ReactElement) => renderToStaticMarkup(element);
const noop = () => {};

test('Transfers editor has five groups, no selected clinical answers, compact short choices and twelve aid controls', () => {
  const store = createAssessmentDraftStore();
  const key = store.create('patient-a', undefined, 'postural_transfers');
  const html = render(
    React.createElement(TransfersForm, {
      draft: store.get(key)!,
      store,
      onSave: noop,
      onPreview: noop,
    }),
  );
  assert.equal((html.match(/checked=""/g) ?? []).length, 0);
  for (const title of ['1. Contesto', '2. Mobilizzazione', '3. Assistenza', '4. Ausili', '5. Note'])
    assert.ok(html.includes(title));
  assert.equal((html.match(/class="transfers-aid"/g) ?? []).length, 12);
  assert.match(html, /transfers-aids-grid/);
  assert.match(html, /transfers-choice--compact/);
  for (const key of AID_KEYS) assert.ok(html.includes(AID_LABELS[key]));
  const toilet = html.split('data-field-path="transfers.toilet"')[1].split('</fieldset>')[0];
  assert.equal((toilet.match(/type="radio"/g) ?? []).length, 6);
  assert.doesNotMatch(toilet, /sollevatore/i);
  const outbound = html
    .split('data-field-path="transfers.bedToWheelchair"')[1]
    .split('</fieldset>')[0];
  assert.equal((outbound.match(/type="radio"/g) ?? []).length, 8);
  assert.match(outbound, /deambulatore con tavolo/);
  assert.doesNotMatch(html, /\d\/10(?!\/)|Conferma e finalizza/);
  assert.match(html, /Salva bozza/);
});

test('owned aid property stays near its aid; plain aids never receive property and missing field is identified', () => {
  const store = createAssessmentDraftStore();
  const answers = completeTransfers();
  answers.aids.rollator.selected = true;
  const key = store.load(transfersAssessment({ answers }));
  store.preview(key);
  const html = render(
    React.createElement(TransfersForm, {
      draft: store.get(key)!,
      store,
      onSave: noop,
      onPreview: noop,
    }),
  );
  assert.match(html, /data-field-path="aids.rollator.ownership"[^>]*aria-invalid="true"/);
  assert.match(html, /Proprietà · Deambulatore rollator/);
  for (const key of ['wheelchairRestraint', 'spinalBrace', 'kneeBrace'])
    assert.ok(!html.includes(`data-field-path="aids.${key}.ownership"`));
});

test('invalid admission dates remain editable and unsaved until corrected, without losing other answers', () => {
  const store = createAssessmentDraftStore();
  const record = transfersAssessment();
  const key = store.load(record);
  const answers = structuredClone(record.answers);
  const editor = () =>
    render(
      React.createElement(TransfersForm, {
        draft: store.get(key)!,
        store,
        onSave: noop,
        onPreview: noop,
      }),
    );
  for (const value of ['10000-01-01', '0000-01-01', '1900-02-29', '2026-02-30']) {
    answers.context.admissionDate.value = value;
    store.update(key, { answers });
    assert.equal(validTransfersAdmissionDate(value), false);
    assert.throws(() => assertTransfersAnswers(answers), /Data ingresso non valida/);
    assert.deepEqual(transfersCompletion(answers), {
      complete: false,
      missingPaths: ['context.admissionDate.value'],
    });
    const html = editor();
    const input = html.match(/<input[^>]*data-field-path="context.admissionDate.value"[^>]*>/)![0];
    assert.ok(input.includes(`value="${value}"`));
    assert.match(input, /aria-invalid="true"/);
    const errorId = input.match(/aria-describedby="([^"]+)"/)![1];
    assert.ok(html.includes(`<span id="${errorId}" role="alert">`));
    assert.match(html, /anno da 0001 a 9999/);
    assert.doesNotMatch(html, /Campi verificati\./);
    assert.equal(store.begin(key, 'save'), null);
    const draft = store.get(key)!;
    assert.equal(draft.failure?.code, 'assessment_invalid_input');
    assert.equal(draft.pending, null);
    assert.equal(draft.busy, false);
    assert.equal(draft.dirty, true);
    assert.equal(store.hasUnsaved(), true);
    assert.deepEqual(draft.fields.answers, answers);
    assert.deepEqual(draft.record, record);
    assert.doesNotThrow(editor);
  }
  for (const value of ['0001-01-01', '1904-02-29', '2000-02-29', '9999-12-31', '1999-01-01']) {
    answers.context.admissionDate.value = value;
    store.update(key, { answers });
    assert.equal(validTransfersAdmissionDate(value), true);
    assert.doesNotThrow(() => assertTransfersAnswers(answers));
    assert.equal(transfersCompletion(answers).complete, true);
    assert.equal(store.get(key)!.failure, null);
    const html = editor();
    assert.match(html, /Campi verificati\./);
    assert.doesNotMatch(html, /aria-invalid="true"|role="alert"/);
    assert.ok(html.includes(`value="${value}"`));
  }
  const token = store.begin(key, 'save');
  assert.ok(token);
  assert.equal(token.operation.kind, 'patch');
  if (token.operation.kind !== 'patch') throw new Error('Expected a draft patch.');
  assert.deepEqual(token.operation.body.answers, answers);
  assert.equal(store.hasUnsaved(), true);
  assert.equal(
    store.finish(token, {
      kind: 'saved',
      assessment: transfersAssessment({ answers: structuredClone(answers), version: 2 }),
    }),
    true,
  );
  assert.equal(store.hasUnsaved(), false);
  assert.deepEqual(store.get(key)!.fields.answers, answers);
});

test('final summary preserves multiline context/notes, source labels and saved status through failed PDF without score', () => {
  const record = transfersAssessment({
    status: 'final',
    pdf: { status: 'failed', documentId: null, errorCode: 'render', retryAvailable: true },
  });
  const summary = render(React.createElement(TransfersSummary, { record }));
  assert.ok(summary.includes(record.answers.notes));
  assert.ok(summary.includes(record.answers.context.diagnosis.text));
  assert.match(summary, /25\/10\/2026|25\.10\.2026|25 ott|25 ottobre/);
  assert.doesNotMatch(summary, /\d\/10(?!\/)|Dolore moderato|type="radio"/);
  const final = render(
    React.createElement(AssessmentFinal, {
      record,
      busy: false,
      onPdf: noop,
      onRefreshPdf: noop,
      onOpenRecord: noop,
      onCorrect: noop,
      onOpenArchive: noop,
    }),
  );
  assert.match(final, /Valutazione finale salvata/);
  assert.match(final, /La valutazione finale è conservata/);
  assert.match(final, /Riprova generazione PDF/);
});

test('history shows operational completion and no answer payload or numeric score', () => {
  const html = render(
    React.createElement(AssessmentHistory, {
      onOpen: noop,
      history: {
        items: [transfersAssessment({ status: 'final' })],
        loading: false,
        error: '',
        status: 'all',
        setStatus: noop,
        from: '',
        setFrom: noop,
        to: '',
        setTo: noop,
        hasMore: true,
        loadMore: noop,
        refresh: noop,
      },
    }),
  );
  assert.match(html, /Compilazione completa/);
  assert.match(html, /Carica altre valutazioni/);
  assert.doesNotMatch(html, /Diagnosi sintetica|Carrozzina-letto|\d\/10(?!\/)/);
});

test('archive separates PAINAD and Transfers by trusted metadata and retains typed deep-link IDs', () => {
  const base = {
    originalName: 'scheda.pdf',
    documentType: 'patient_assessment',
    mimeType: 'application/pdf',
    sizeBytes: 100,
    importJobId: null,
    createdAt: '2026-10-25T03:00:00.000Z',
  };
  const transfers = {
    ...base,
    id: 'document-transfers',
    assessment: {
      id: 'transfers-a',
      type: 'postural_transfers' as const,
      formVersion: TRANSFERS_VERSION,
      assessedAt: '2026-10-25T01:30:00.000Z',
    },
  };
  const painad = {
    ...base,
    id: 'document-painad',
    assessment: {
      id: 'painad-a',
      type: 'painad' as const,
      formVersion: PAINAD_VERSION,
      assessedAt: '2026-10-24T09:00:00.000Z',
    },
  };
  assertArchiveDocument(transfers);
  assertArchiveDocument(painad);
  assert.throws(() =>
    assertArchiveDocument({
      ...transfers,
      assessment: { ...transfers.assessment, formVersion: PAINAD_VERSION },
    }),
  );
  const entries = buildDocumentArchive([], [transfers, painad]);
  assert.deepEqual(
    filterDocumentArchive(
      entries,
      'valutazioni',
      '',
      'tutti',
      'patient_assessment',
      'postural_transfers',
    ).map((row) => row.document?.id),
    ['document-transfers'],
  );
  assert.equal(archiveEntryTypeLabel(entries[0]), 'Trasferimenti posturali');
  assert.equal(
    archiveFolderLabel({
      category: 'valutazioni',
      type: 'patient_assessment',
      assessmentType: 'painad',
    }),
    'PAINAD',
  );
  assert.equal(filterDocumentArchive(entries, 'valutazioni', 'trasferimenti', 'tutti').length, 1);
  const html = render(
    React.createElement(PatientArchiveTree, {
      entries,
      selected: { category: 'valutazioni', assessmentType: 'postural_transfers' },
      complete: true,
      onSelect: noop,
    }),
  );
  assert.match(html, /Trasferimenti posturali/);
  assert.match(html, /PAINAD/);
  assert.equal(patientTabGroup('painad'), 'moduli');
  assert.equal(patientTabGroup('postural_transfers'), 'moduli');
  assert.equal(patientTabGroup('dimissione'), 'dimissione');
});
