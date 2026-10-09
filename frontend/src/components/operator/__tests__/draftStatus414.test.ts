import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createAssessmentDraftStore } from '../../../lib/assessments/assessmentDraftStore';
import { AssessmentDraftStatus, draftAvailability } from '../assessments/AssessmentDraftStatus';
import type { AssessmentDraft } from '../../../lib/assessments/assessmentDraftStore';
Object.assign(globalThis, { React });
function draft(): AssessmentDraft {
  const store = createAssessmentDraftStore(), key = store.create('synthetic-414');
  return store.get(key)!;
}
const saved = (value = draft()): AssessmentDraft => ({ ...value, dirty: false,
  record: { status: 'draft', updatedAt: '2026-10-09T10:00:00.000Z', assessedAt: '2026-10-08T06:00:00.000Z', author: { name: 'Autore Sintetico', operatorId: 'synthetic-author' } } as AssessmentDraft['record'] });
test('414 locality is same open window, never whole device or another operator', () => {
  const value = draftAvailability(draft(), false);
  assert.match(value.label, /Non salvata in ClinicOS/);
  assert.match(value.help, /questa finestra/);
  assert.match(value.help, /altro dispositivo/);
  assert.match(value.help, /nuovo accesso/);
  assert.doesNotMatch(value.help, /server|\bDraft\b/);
  const html = renderToStaticMarkup(React.createElement(AssessmentDraftStatus, { draft: draft(), storageFailed: false }));
  assert.match(html, /role="status"/);
  assert.match(html, /Non salvata in ClinicOS/);
});
test('414 only clean acknowledged save reports saved, timestamp is confirmed updatedAt not observedAt', () => {
  const value = draftAvailability(saved(), false);
  assert.equal(value.label, 'Bozza salvata in ClinicOS');
  assert.equal(value.confirmedAt, '09/10/2026 12:00');
  assert.match(value.help, /stesso account/);
  assert.match(value.help, /accesso al paziente/);
  assert.match(value.help, /altri operatori non possono/);
  assert.match(draftAvailability({ ...saved(), dirty: true }, false).label, /Modifiche non salvate/);
  assert.equal(draftAvailability({ ...saved(), dirty: true }, false).confirmedAt, value.confirmedAt);
});
test('414 busy/pending/failure never claim saved success or erase last confirmed receipt', () => {
  const base = saved(), pending = { kind: 'create', body: {} } as NonNullable<AssessmentDraft['pending']>;
  assert.equal(draftAvailability({ ...base, busy: true, pending }, false).label, 'Salvataggio in corso');
  assert.equal(draftAvailability({ ...base, pending, failure: { code: 'unverified', uncertain: true, message: 'sintetico' } }, false).label, 'Salvataggio da verificare');
  assert.equal(draftAvailability({ ...base, failure: { code: 'assessment_invalid_input', uncertain: false, message: 'sintetico' } }, false).label, 'Salvataggio non completato');
  assert.match(draftAvailability({ ...base, busy: true, pending: { ...pending, kind: 'finalize' } as AssessmentDraft['pending'] }, false).label, /Finalizzazione in corso/);
  assert.match(draftAvailability({ ...base, pending }, true).help, /non.*ricaricamento/);
  assert.equal(draftAvailability({ ...base, failure: { code: 'assessment_incomplete', uncertain: false, message: 'sintetico' } }, false).label, 'Compilazione da completare');
});
test('414 blocked storage gives no reload guarantee; confirmed saved state remains independently true', () => {
  assert.match(draftAvailability(draft(), true).help, /non.*ricaricamento/);
  assert.equal(draftAvailability(saved(), true).label, 'Bozza salvata in ClinicOS');
  const broken = saved(); broken.record = { ...broken.record!, updatedAt: 'invalid' };
  assert.equal(draftAvailability(broken, false).confirmedAt, null);
});
