import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssessmentForm } from '../assessments/AssessmentForm';
import { AssessmentFinal } from '../assessments/AssessmentFinal';
import { AssessmentHistory } from '../assessments/AssessmentHistory';
import { createAssessmentDraftStore } from '../../../lib/assessments/assessmentDraftStore';
import { PAINAD } from '../../../lib/assessments/painadDefinition';
import { assessment, finalAssessment } from '../../../lib/__tests__/assessments.fixtures';
import { TAB_GROUPS, patientTabGroup } from '../tabGroups';
Object.assign(globalThis, { React });
const render = (element: React.ReactElement) => renderToStaticMarkup(element);
const noop = () => {};

test('empty form exposes all 15 complete choices with no clinical selection or final result', () => {
  const store = createAssessmentDraftStore();
  const key = store.create('patient-a');
  const html = render(
    React.createElement(AssessmentForm, {
      store,
      draft: store.get(key)!,
      onSave: noop,
      onPreview: noop,
    }),
  );
  assert.equal((html.match(/type="radio"/g) ?? []).length, 15);
  assert.equal((html.match(/checked=""/g) ?? []).length, 0);
  assert.equal((html.match(/<legend>/g) ?? []).length, 5);
  for (const item of PAINAD.items)
    for (const option of item.options) assert.ok(html.includes(option));
  assert.match(html, /0 di 5 risposte/);
  assert.match(html, /nessun risultato definitivo/);
  assert.doesNotMatch(html, /0\/10/);
});

test('saved complete form displays exactly five selections and allows an explicit preview', () => {
  const store = createAssessmentDraftStore();
  const key = store.load(assessment());
  const html = render(
    React.createElement(AssessmentForm, {
      store,
      draft: store.get(key)!,
      onSave: noop,
      onPreview: noop,
    }),
  );
  assert.equal((html.match(/checked=""/g) ?? []).length, 5);
  assert.match(html, /4\/10/);
  assert.match(html, /Segna come non valutato/);
  assert.match(html, /Salva e verifica anteprima/);
  assert.match(html, /disabled="">Salva bozza/);
});

test('final stays saved through pending/failed PDF, while correction and reciprocal links remain explicit', () => {
  for (const status of ['pending', 'failed', 'ready'] as const) {
    const record = finalAssessment({
      predecessorId: 'previous',
      correctionReason: 'Motivo sintetico',
      pdf: {
        status,
        documentId: status === 'ready' ? 'document-a' : null,
        errorCode: null,
        retryAvailable: status === 'failed',
      },
    });
    const html = render(
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
    assert.match(html, /Valutazione finale salvata/);
    assert.match(html, /Predecessore sintetico/);
    assert.match(html, /Motivo sintetico/);
    assert.match(html, /Crea rettifica/);
    assert.match(html, /Apri valutazione precedente/);
    assert.doesNotMatch(html, /type="radio"|Salva bozza|Conferma e finalizza/);
    if (status === 'ready') assert.match(html, /Vai al documento in archivio/);
    else assert.match(html, /La valutazione finale è conservata/);
    if (status === 'failed') assert.match(html, /Riprova generazione PDF/);
    for (const item of record.finalSnapshot!.items) assert.ok(html.includes(item.description));
  }
});

test('history exposes metadata, filters and bounded continuation without answer descriptions', () => {
  const html = render(
    React.createElement(AssessmentHistory, {
      onOpen: noop,
      history: {
        items: [assessment(), finalAssessment({ id: 'final-b' })],
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
  assert.match(html, /Le mie bozze/);
  assert.match(html, /Valutazione dal/);
  assert.match(html, /Carica altre valutazioni/);
  assert.match(html, /Riprendi bozza/);
  assert.match(html, /Apri valutazione/);
  assert.doesNotMatch(html, /Lamenti o gemiti occasionali|Respirazione|RUMOROSA/);
});

test('PAINAD coexists with NRS and direct discharge in patient navigation', () => {
  assert.equal(patientTabGroup('painad'), 'moduli');
  assert.equal(patientTabGroup('dimissione'), 'dimissione');
  assert.ok(
    TAB_GROUPS.find((group) => group.id === 'moduli')!.tabs.some((tab) => tab.id === 'nrs'),
  );
});
