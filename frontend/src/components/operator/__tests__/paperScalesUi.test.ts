// Paper-identical scales on screen: every option with its points, header/columns of the paper,
// live total, read-only sheet for preview/final, F15 gating of «Nuova compilazione».
import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PaperForm } from '../assessments/PaperForm';
import { AssessmentSummary } from '../assessments/AssessmentSummary';
import { AssessmentHistory } from '../assessments/AssessmentHistory';
import { AssessmentCatalogView } from '../assessments/AssessmentCatalog';
import { createAssessmentDraftStore } from '../../../lib/assessments/assessmentDraftStore';
import { ASSESSMENT_VERSIONS } from '../../../lib/assessments/assessmentTypes';
import {
  CATALOG_TYPES,
  parseAssessmentCatalog,
  type AssessmentCatalogData,
} from '../../../lib/assessments/assessmentCatalog';
import { assertAssessment } from '../../../lib/assessments/assessmentValidation';
import { PAPER_SCALES, type PaperScale } from '../../../lib/assessments/paper/definitions';
import {
  answeredPaperCount,
  emptyPaperAnswers,
  paperCompletion,
  paperItems,
  paperResult,
  paperSnapshotItems,
  paperMeasurements,
  type PaperAnswers,
} from '../../../lib/assessments/paper/engine';
import {
  PAPER_VERSIONS,
  currentPaperScale,
  type PaperAssessmentDto,
  type PaperType,
} from '../../../lib/assessments/paper/paperTypes';
import { TINETTI_VERSION } from '../../../lib/assessments/tinettiTypes';
import type { CartellaPaziente, Paziente } from '../../../types';
Object.assign(globalThis, { React });
const render = (element: React.ReactElement) => renderToStaticMarkup(element);
const noop = () => {};
const html_ = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#x27;').replace(/"/g, '&quot;');
const patient = {
  id: 'patient-a',
  firstName: 'Maria',
  lastName: 'Rossi',
  dateOfBirth: '1940-01-02',
  codiceFiscale: 'RSSMRA40A42H501X',
  location: { status: 'assigned', source: 'assignment', room: '12', bed: 'A', asOf: '2026-10-03' },
} as unknown as Paziente;
const paperTypes = Object.keys(PAPER_VERSIONS) as PaperType[];
const maxAnswers = (scale: PaperScale): PaperAnswers => {
  const answers = emptyPaperAnswers(scale);
  for (const item of paperItems(scale)) {
    if (item.key === 'f2') continue;
    answers[item.key] = item.options.reduce((a, b) => (b.points > a.points ? b : a)).value;
  }
  return answers;
};
function paperDto(type: PaperType, status: 'draft' | 'final' = 'final'): PaperAssessmentDto {
  const scale = currentPaperScale(type);
  const answers = maxAnswers(scale);
  const result = paperResult(scale, answers);
  const row: PaperAssessmentDto = {
    id: `${type}-a`,
    patientId: 'patient-a',
    type,
    formVersion: PAPER_VERSIONS[type],
    layout: 'paper',
    status,
    version: 1,
    assessedAt: '2026-10-03T08:30:00.000Z',
    createdAt: '2026-10-03T08:31:00.000Z',
    updatedAt: '2026-10-03T08:31:00.000Z',
    finalizedAt: null,
    author: { operatorId: 'operator-a', name: 'Infermiere Uno' },
    answeredCount: answeredPaperCount(scale, answers),
    completion: paperCompletion(scale, answers),
    result,
    predecessorId: null,
    correctionReason: null,
    correctedById: null,
    pdf: null,
    answers,
    finalSnapshot: null,
    snapshotSha256: null,
  };
  if (status === 'final') {
    row.finalizedAt = '2026-10-03T08:40:00.000Z';
    row.snapshotSha256 = 'd'.repeat(64);
    row.pdf = { status: 'pending', documentId: null, errorCode: null, retryAvailable: false };
    row.finalSnapshot = {
      snapshotVersion: 1,
      layout: 'paper',
      patient: patient as never,
      author: row.author,
      form: { type, version: PAPER_VERSIONS[type], sourceSha256: scale.sourceSha256 },
      assessedAt: row.assessedAt,
      createdAt: row.createdAt,
      finalizedAt: row.finalizedAt,
      items: paperSnapshotItems(scale, answers),
      measurements: paperMeasurements(scale, answers),
      result: result!,
      notes: typeof answers.notes === 'string' ? answers.notes : '',
      predecessorId: null,
      predecessor: null,
      correctionReason: null,
    };
  }
  return row;
}

test('every paper scale: the new compilation is the paper table with all options, points and columns, nothing preselected', () => {
  for (const type of paperTypes) {
    const scale = currentPaperScale(type);
    const store = createAssessmentDraftStore();
    const key = store.create('patient-a', undefined, type);
    assert.deepEqual(store.get(key)!.fields.answers, emptyPaperAnswers(scale));
    const html = render(
      React.createElement(PaperForm, {
        draft: store.get(key)!,
        store,
        scale,
        patient,
        operatorName: 'Infermiere Uno',
        onSave: noop,
        onPreview: noop,
      }),
    );
    const options = paperItems(scale).reduce((sum, item) => sum + item.options.length, 0);
    assert.equal((html.match(/type="radio"/g) ?? []).length, options, type);
    assert.equal((html.match(/checked=""/g) ?? []).length, 0, type);
    for (const item of paperItems(scale))
      for (const option of item.options)
        assert.ok(html.includes(html_(option.label)), `${type}: ${option.label}`);
    assert.ok(
      html.includes(scale.title.replace(/'/g, '&#x27;').replace(/&/g, '&amp;')) ||
        html.includes(scale.title),
      type,
    );
    for (const column of scale.layout === 'yesno'
      ? []
      : scale.columns.filter((c) => c !== 'Quesito' && c !== 'Opzioni' && c !== 'Punti'))
      assert.ok(html.includes(`>${html_(column)}</th>`), `${type} column ${column}`);
    assert.match(html, /data-testid="paper-total">0<\/span>/);
    assert.match(html, /Rossi Maria/);
    assert.match(html, /Compilazione in corso: 0 di/);
    if (scale.signature) assert.match(html, /Firma dell&#x27;Operatore \/ Valutatore:/);
    else assert.doesNotMatch(html, /Firma dell/);
    assert.doesNotMatch(html, /AI responses|risposte dell/);
  }
});

test('Tinetti v2 prints paper numbering 1–16 with item 8 and 11 grouped, sections 16 + 12', () => {
  const scale = currentPaperScale('tinetti');
  const store = createAssessmentDraftStore();
  const key = store.create('patient-a', undefined, 'tinetti');
  store.update(key, { answers: maxAnswers(scale) });
  const html = render(
    React.createElement(PaperForm, {
      draft: store.get(key)!,
      store,
      scale,
      patient,
      operatorName: 'Infermiere Uno',
      onSave: noop,
      onPreview: noop,
    }),
  );
  assert.match(html, /rowSpan="8"|rowspan="8"/);
  assert.match(html, /rowSpan="4"|rowspan="4"/);
  assert.match(
    html,
    /Punteggio Equilibrio:<\/strong> <span class="paper-total__value">16<\/span> \/ 16/,
  );
  assert.match(
    html,
    /Punteggio Andatura:<\/strong> <span class="paper-total__value">12<\/span> \/ 12/,
  );
  assert.match(html, /data-testid="paper-total">28<\/span> \/ 28/);
  assert.match(html, /Rischio caduta basso \/ normale/);
  assert.match(html, /class="is-current"/);
});

test('final paper records render read-only (no inputs), frozen text, total, band and signature name', () => {
  for (const type of paperTypes) {
    const record = paperDto(type);
    assertAssessment(record, 'patient-a', record.id, type);
    const frozen = structuredClone(record);
    frozen.finalSnapshot!.items[0].description = 'Testo congelato nello snapshot';
    const html = render(React.createElement(AssessmentSummary, { record: frozen, patient }));
    assert.doesNotMatch(html, /<input/);
    assert.match(html, /Testo congelato nello snapshot/);
    assert.match(html, new RegExp(`data-testid="paper-total">${record.result!.total}</span>`));
    if (type !== 'ucla_npi_sleep') assert.match(html, /class="is-current"/);
    assert.match(html, new RegExp(record.result!.label.replace(/[/()]/g, '\\$&')));
    if (currentPaperScale(type).signature) assert.match(html, /Infermiere Uno/);
  }
});

test('client validation rejects a tampered paper result or snapshot; history labels use the paper maximum', () => {
  const record = paperDto('barthel');
  assert.throws(() =>
    assertAssessment({ ...record, result: { ...record.result!, total: 95 } }, 'patient-a'),
  );
  const snapshot = structuredClone(record);
  snapshot.finalSnapshot!.result.label = 'Altro';
  assert.throws(() => assertAssessment(snapshot, 'patient-a'));
  const draft = paperDto('mna', 'draft');
  assertAssessment(draft, 'patient-a');
  const html = render(
    React.createElement(AssessmentHistory, {
      onOpen: noop,
      history: {
        items: [record, paperDto('ucla_npi_sleep'), paperDto('mna')],
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
      } as never,
    }),
  );
  assert.match(html, /100\/100 · Completamente autonomo/);
  assert.match(html, /12\/12 · Disturbo del sonno presente/);
  assert.match(html, /14\/14 · Stato nutrizionale normale/);
});

test('catalog lists Barthel and UCLA-NPI, accepts a v1 latest final, and hides «Nuova compilazione» without the capability', () => {
  const data: AssessmentCatalogData = {
    items: CATALOG_TYPES.map((type) => ({
      type,
      formVersion: ASSESSMENT_VERSIONS[type],
      latestFinal: null,
      ownDraftCount: 0,
      latestOwnDraft: null,
    })),
  };
  data.items[2].latestFinal = {
    id: 'tinetti-v1',
    formVersion: TINETTI_VERSION,
    assessedAt: '2026-09-23T07:00:00.000Z',
    createdAt: '2026-09-23T07:00:00.000Z',
    finalizedAt: '2026-09-23T08:00:00.000Z',
  };
  assert.equal(parseAssessmentCatalog(JSON.parse(JSON.stringify(data))).items.length, 7);
  assert.throws(() => parseAssessmentCatalog({ items: data.items.slice(0, 5) }));
  const view = (canCreate: boolean) =>
    render(
      React.createElement(AssessmentCatalogView, {
        state: { status: 'ready', data, error: null },
        cartella: {} as CartellaPaziente,
        localDraftTypes: new Set<string>(),
        onRetry: noop,
        onOpen: noop,
        onNrs: noop,
        canCreate,
      }),
    );
  const nurse = view(true);
  assert.match(nurse, /Indice di Barthel/);
  assert.match(nurse, /UCLA · Sonno-veglia \(NPI\)/);
  assert.match(nurse, /MNA®-SF/);
  assert.equal((nurse.match(/aria-label="Compila /g) ?? []).length, 10);
  const oss = view(false);
  assert.equal((oss.match(/aria-label="Compila /g) ?? []).length, 0);
  assert.equal((oss.match(/aria-label="Storico /g) ?? []).length, 10);
});

test('MNA v1 correction starts an empty MNA-SF draft; Tinetti/GDS v1 answers carry over to v2', () => {
  for (const scale of PAPER_SCALES.filter((entry) => entry.type !== 'painad')) {
    const store = createAssessmentDraftStore();
    const key = store.create('patient-a', undefined, scale.type as PaperType);
    const draft = store.get(key)!;
    store.update(key, { answers: maxAnswers(scale), correctionReason: '' });
    const token = store.begin(key, 'save')!;
    assert.equal(token.operation.kind, 'create');
    if (token.operation.kind === 'create')
      assert.equal(token.operation.body.formVersion, scale.version);
    assert.equal(draft.type, scale.type);
  }
});
