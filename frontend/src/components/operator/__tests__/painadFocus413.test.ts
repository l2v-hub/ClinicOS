import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PaperForm } from '../assessments/PaperForm';
import { PaperSheet } from '../assessments/PaperSheet';
import { createAssessmentDraftStore } from '../../../lib/assessments/assessmentDraftStore';
import { PAINAD_PAPER, PAPER_SCALES } from '../../../lib/assessments/paper/definitions';
import { paperItems, paperResult } from '../../../lib/assessments/paper/engine';
Object.assign(globalThis, { React });
const patient = { id: 'synthetic-413', firstName: 'Persona', lastName: 'Sintetica', dateOfBirth: '1980-01-01', sex: 'M' as const, codiceFiscale: null, medicalRecordNumber: 'QA-413' };
function form(focusCompilation = true, values: number[] = [], locked = false) {
  const store = createAssessmentDraftStore(), key = store.create(patient.id);
  const answers = Object.fromEntries(paperItems(PAINAD_PAPER).map((item, i) => [item.key, values[i] ?? null]));
  store.update(key, { answers });
  const draft = { ...store.get(key)!, busy: locked };
  return renderToStaticMarkup(React.createElement(PaperForm, { draft, store, scale: PAINAD_PAPER, patient, operatorName: 'Operatore sintetico', onSave() {}, onPreview() {}, focusCompilation } as React.ComponentProps<typeof PaperForm>));
}
test('413 focused compilation has persistent named actions, compact metadata, no repeated visible patient box', () => {
  const html = form();
  assert.match(html, /paper-form--focused/);
  assert.match(html, /aria-label="Azioni compilazione PAINAD"/);
  assert.match(html, /Bozza in modifica/);
  assert.match(html, /0 di 5 risposte/);
  assert.match(html, /punteggio parziale/);
  assert.doesNotMatch(html, /ANAGRAFICA PAZIENTE|Sintetica Persona/);
  assert.match(html, /<details[^>]*class="painad-metadata"/);
  assert.match(html, /Data e ora della valutazione/);
  assert.match(html, /disabled="">Salva e verifica anteprima/);
});
test('413 all validated options/points/accessibility names retained vs default rendering', () => {
  const focused = form(), original = form(false);
  const labels = (html: string) => [...html.matchAll(/aria-label="(\d [^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(labels(focused), labels(original));
  assert.equal((focused.match(/type="radio"/g) ?? []).length, 15);
  for (const item of paperItems(PAINAD_PAPER)) for (const option of item.options)
    assert.ok(focused.includes(option.label.replaceAll('&', '&amp;')));
  assert.doesNotMatch(original, /paper-form--focused|Azioni compilazione PAINAD/);
  assert.match(original, /ANAGRAFICA PAZIENTE/);
});
test('413 incomplete vs complete and locked actions never bypass explicit preview/finalization', () => {
  assert.match(form(true, [2]), /1 di 5 risposte/);
  assert.match(form(true, [2]), /disabled="">Salva e verifica anteprima/);
  const complete = form(true, [0, 1, 2, 1, 0]);
  assert.match(complete, /5 di 5 risposte/);
  assert.match(complete, /Compilazione completa · da verificare/);
  assert.doesNotMatch(complete, /disabled="">Salva e verifica anteprima/);
  assert.match(form(true, [0, 1, 2, 1, 0], true), /disabled="">Salva e verifica anteprima/);
  assert.doesNotMatch(complete, /Conferma e finalizza/);
});
test('413 compact request never changes read-only or other scale sheet defaults', () => {
  for (const scale of [PAINAD_PAPER, ...PAPER_SCALES]) {
    const answers = Object.fromEntries(paperItems(scale).map(item => [item.key, null]));
    const props = { scale, answers, fields: [{ label: 'Paziente', value: 'Persona sintetica' }], result: paperResult(scale, answers), answeredCount: 0 };
    const original = renderToStaticMarkup(React.createElement(PaperSheet, props));
    const compact = renderToStaticMarkup(React.createElement(PaperSheet, { ...props, compactCompilation: true } as React.ComponentProps<typeof PaperSheet>));
    assert.equal(compact, original);
  }
});
