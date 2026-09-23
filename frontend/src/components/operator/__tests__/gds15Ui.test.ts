import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GdsForm } from '../assessments/GdsForm';
import { AssessmentSummary } from '../assessments/AssessmentSummary';
import { AssessmentHistory } from '../assessments/AssessmentHistory';
import { createAssessmentDraftStore } from '../../../lib/assessments/assessmentDraftStore';
import { GDS15_ITEMS, GDS15_INSTRUCTION } from '../../../lib/assessments/gds15Definition';
import { GDS15_VERSION } from '../../../lib/assessments/gds15Types';
import { completeGds15, gds15Assessment } from '../../../lib/__tests__/gds15.fixtures';
import { finalAssessment } from '../../../lib/__tests__/assessments.fixtures';
import {
  buildDocumentArchive,
  filterDocumentArchive,
  archiveEntryTypeLabel,
} from '../../../lib/patientDocumentArchive';
import { assertArchiveDocument } from '../../../lib/patientDocumentArchiveIO';
import { assessmentPatientTab, patientTabGroup, TAB_GROUPS } from '../tabGroups';
Object.assign(globalThis, { React });
const render = (element: React.ReactElement) => renderToStaticMarkup(element);
const noop = () => {};
test('GDS has 15 explicit Sì/No pairs in source order, no defaults and contextual last-week instruction', () => {
  const store = createAssessmentDraftStore(),
    key = store.create('patient-a', undefined, 'gds15');
  const html = render(
    React.createElement(GdsForm, { draft: store.get(key)!, store, onSave: noop, onPreview: noop }),
  );
  assert.equal((html.match(/type="radio"/g) ?? []).length, 30);
  assert.equal((html.match(/checked=""/g) ?? []).length, 0);
  assert.equal((html.match(/class="assessment-item"/g) ?? []).length, 15);
  assert.match(html, /0 di 15 risposte/);
  assert.match(html, /ultima settimana/);
  assert.match(html, /calcolato automaticamente/);
  assert.doesNotMatch(html, /colonna/);
  assert.match(html, /<strong>Sì<\/strong> 0 punti/);
  assert.match(html, /<strong>No<\/strong> 1 punto/);
  const labels = [...html.matchAll(/<label[^>]*>(.*?)<\/label>/gs)].map((match) =>
    match[1].replace(/<[^>]*>/g, ''),
  );
  assert.ok(labels.includes('Sì 0 punti'));
  assert.ok(labels.includes('No 1 punto'));
  assert.ok(html.indexOf('ultima settimana') < html.indexOf('data-field-path="q1"'));
  assert.doesNotMatch(html, /Depressione grave|Depressione lieve|maxlength="4000"/);
  for (const item of GDS15_ITEMS) assert.ok(html.includes(`data-field-path="${item.id}"`));
});
test('GDS notes retain full Unicode input and errors while the store blocks invalid writes', () => {
  const store = createAssessmentDraftStore(),
    key = store.create('patient-a', undefined, 'gds15');
  const editor = () =>
    render(
      React.createElement(GdsForm, {
        draft: store.get(key)!,
        store,
        onSave: noop,
        onPreview: noop,
      }),
    );
  for (const notes of ['😀'.repeat(4001), '\ud800', '\udfff']) {
    store.update(key, { answers: { ...completeGds15(), notes } });
    assert.equal(store.begin(key, 'save'), null);
    const html = editor();
    assert.match(html, /role="alert"/);
    assert.match(html, /data-field-path="notes"/);
    assert.deepEqual(store.get(key)!.failure!.missingPaths, ['notes']);
    assert.equal((store.get(key)!.fields.answers as { notes: string }).notes, notes);
  }
  const notes = '😀'.repeat(4000);
  store.update(key, { answers: { ...completeGds15(), notes } });
  assert.ok(editor().includes(notes));
  assert.match(editor(), /4000 di 4000/);
  assert.doesNotMatch(editor(), /role="alert"/);
  assert.ok(store.begin(key, 'save'));
});
test('GDS summary and history use /15 with frozen text, while PAINAD keeps /10', () => {
  const record = gds15Assessment({ status: 'final' });
  let html = render(React.createElement(AssessmentSummary, { record }));
  assert.match(html, /10\/15/);
  assert.match(html, /Interpretazione dello screening/);
  assert.ok(html.includes(record.answers.notes));
  assert.match(html, /Sheikh/);
  assert.match(html, /colonna/);
  assert.equal(record.finalSnapshot!.instruction, GDS15_INSTRUCTION);
  const frozen = structuredClone(record);
  frozen.finalSnapshot!.items[0].label = 'Frozen question';
  frozen.finalSnapshot!.items[0].description = 'No';
  frozen.finalSnapshot!.instruction = 'Frozen instruction';
  frozen.finalSnapshot!.screeningNote = 'Frozen screening note';
  frozen.finalSnapshot!.reference = 'Frozen reference';
  html = render(React.createElement(AssessmentSummary, { record: frozen }));
  for (const text of [
    'Frozen question',
    'Frozen instruction',
    'Frozen screening note',
    'Frozen reference',
  ])
    assert.ok(html.includes(text));
  assert.match(
    render(React.createElement(AssessmentSummary, { record: finalAssessment() })),
    /4\/10/,
  );
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
  assert.match(history, /Screening GDS-15 · 10\/15/);
  assert.doesNotMatch(history, /10\/10/);
});
test('GDS archive metadata, type filters and tab navigation preserve gds15 wire type', () => {
  const doc = {
    id: 'doc-gds',
    originalName: 'GDS-15.pdf',
    documentType: 'patient_assessment',
    mimeType: 'application/pdf',
    sizeBytes: 120,
    importJobId: null,
    createdAt: '2026-09-23T10:00:00Z',
    assessment: {
      id: 'gds15-a',
      type: 'gds15' as const,
      formVersion: GDS15_VERSION,
      assessedAt: '2026-09-23T09:00:00Z',
    },
  };
  assertArchiveDocument(doc);
  assert.throws(() =>
    assertArchiveDocument({ ...doc, assessment: { ...doc.assessment, type: 'gds' } }),
  );
  assert.throws(() =>
    assertArchiveDocument({
      ...doc,
      assessment: { ...doc.assessment, formVersion: 'painad-it-2026-09-22-v1' },
    }),
  );
  const entries = buildDocumentArchive([], [doc]);
  assert.equal(archiveEntryTypeLabel(entries[0]), 'GDS-15 · Depressione');
  assert.equal(
    filterDocumentArchive(entries, 'valutazioni', '', 'tutti', 'patient_assessment', 'gds15')
      .length,
    1,
  );
  assert.equal(
    filterDocumentArchive(entries, 'valutazioni', '', 'tutti', 'patient_assessment', 'painad')
      .length,
    0,
  );
  assert.equal(assessmentPatientTab('gds15'), 'gds');
  assert.equal(assessmentPatientTab('mna'), 'mna');
  assert.equal(patientTabGroup('gds'), 'moduli');
  assert.equal(
    TAB_GROUPS.find((group) => group.id === 'moduli')!.tabs.some((tab) => tab.id === 'gds'),
    true,
  );
});
