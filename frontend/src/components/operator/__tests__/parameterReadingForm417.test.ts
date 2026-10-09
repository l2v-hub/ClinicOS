import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ParameterReadingForm } from '../ParameterReadingForm';
import { PatientParameterEntry } from '../PatientParameterEntry';
import { ParameterEntryPanel } from '../ParameterEntryPanel';
import { createParameterDraftStore } from '../../../lib/parameterEntryDrafts';
Object.assign(globalThis, { React });
const noop = () => {};
const form = (extra = {}) =>
  renderToStaticMarkup(
    React.createElement(ParameterReadingForm, {
      patientId: 'QA-SYNTHETIC-417',
      values: {},
      saving: false,
      uncertain: false,
      error: '',
      onChange: noop,
      onSave: noop,
      onOpenHistory: noop,
      ...extra,
    }),
  );

test('417 both workspaces use exactly the shared field order, full ACVPU options and no prior prefill', () => {
  const chart = renderToStaticMarkup(
    React.createElement(PatientParameterEntry, {
      patientId: 'QA-SYNTHETIC-417',
      operatorId: 'QA-ACTOR',
      onSaved: noop,
      onDayChange: noop,
      onShowToday: noop,
    }),
  );
  const ward = renderToStaticMarkup(
    React.createElement(ParameterEntryPanel, {
      patient: {
        id: 'QA-SYNTHETIC-417',
        firstName: 'Persona',
        lastName: 'Sintetica',
        medicalRecordNumber: 'QA',
      },
      draftStore: createParameterDraftStore(),
      onSave: async () => {
        throw Error('SSR never saves');
      },
      onOpenHistory: noop,
    }),
  );
  const fields = (html: string) =>
    [...html.matchAll(/aria-label="Nuova rilevazione ([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(fields(chart), fields(ward));
  assert.equal(fields(chart).length, 11);
  for (const html of [chart, ward]) {
    assert.match(html, /Confusione di nuova insorgenza/);
    assert.match(html, /Risponde alla voce/);
    assert.match(html, /Prima: …/);
    assert.doesNotMatch(html, /value="(?:120|80|98)"/);
    assert.match(html, /NEWS2 usa i sette parametri/);
  }
});
test('417 numeric raw text is never maxlength-truncated and keypad starts inactive', () => {
  const html = form({ values: { fc: '1'.repeat(50), pa: '120/80/70' } });
  const input = html.match(/<input[^>]+aria-label="Nuova rilevazione FC"[^>]*>/)?.[0];
  assert.ok(input);
  assert.doesNotMatch(input, /maxLength/i);
  assert.match(input, new RegExp('1'.repeat(50)));
  assert.match(html, /value="80\/70"/);
  assert.equal(
    (html.match(/class="ds-btn ds-btn--secondary" disabled="" aria-label=/g) ?? []).length,
    12,
  );
});
test('417 uncertain saves lock fields but retain enabled explicit retry and error/history guidance', () => {
  const html = form({
    uncertain: true,
    error: 'Risposta persa',
    pendingAt: '2026-10-09T08:00:00.000Z',
  });
  assert.match(html, /<fieldset disabled=""/);
  assert.match(html, /role="alert"/);
  assert.match(html, /Riprova salvataggio/);
  assert.match(html, /Controlla lo storico/);
  assert.doesNotMatch(html.match(/<button[^>]*type="submit"[^>]*>/)?.[0] ?? '', /disabled/);
});
