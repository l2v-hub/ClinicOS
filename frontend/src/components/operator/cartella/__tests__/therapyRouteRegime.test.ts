import assert from 'node:assert/strict';
import { test } from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyTherapyForm, TherapyFormFields, VIA_OPTIONS } from '../TherapyFormFields';
import { TherapyFormPreview } from '../TherapyFormPreview';
import { applyTherapyFormChange } from '../therapyFormChange';
import { therapyFormToInput } from '../../../shared/intake/therapyFormPayload';
import { therapyInputDiagnostics } from '../../../shared/intake/intakeTherapies';

Object.assign(globalThis, { React });
const regimes = [
  'al bisogno',
  'AL_BISOGNO',
  'al-bisogno',
  ' PRN ',
  'p.r.n.',
  'periodica',
  'una tantum',
];

test('route options never contain scheduling regimes', () => {
  for (const regime of regimes) assert.ok(!VIA_OPTIONS.includes(regime), regime);
  assert.ok(VIA_OPTIONS.includes('SC'));
});

test('legacy regimen route is not selectable or confirmed and remains unchanged for review', () => {
  for (const viaSomministrazione of regimes) {
    const value = { ...emptyTherapyForm(), viaSomministrazione };
    const before = JSON.stringify(value);
    const html = renderToStaticMarkup(
      createElement(TherapyFormFields, { value, onChange: () => {} }),
    );
    assert.ok(!html.includes(`option value="${viaSomministrazione}"`), viaSomministrazione);
    assert.match(html, /Via registrata da verificare/);
    assert.match(html, /aria-invalid="true"/);
    const preview = renderToStaticMarkup(createElement(TherapyFormPreview, { value }));
    assert.ok(preview.includes('Via: da verificare'));
    assert.ok(preview.includes('Tipo terapia: Periodica'));
    const routeIssues = therapyInputDiagnostics(therapyFormToInput(value)).filter(
      (i) => i.field === 'viaSomministrazione',
    );
    assert.equal(routeIssues.length, 1);
    assert.match(routeIssues[0].message, /regime/);
    assert.equal(JSON.stringify(value), before);
  }
});

test('selecting every regimen preserves real route and latent schedule draft without PRN active times', () => {
  for (const viaSomministrazione of VIA_OPTIONS) {
    const value = { ...emptyTherapyForm(), viaSomministrazione };
    for (const tipo of ['periodica', 'al_bisogno', 'una_tantum'] as const) {
      const next = applyTherapyFormChange(value, { tipo });
      assert.equal(next.viaSomministrazione, viaSomministrazione);
      assert.deepEqual(next.schedules, value.schedules);
      const payload = therapyFormToInput(next);
      assert.equal(payload.viaSomministrazione, viaSomministrazione);
      if (tipo === 'al_bisogno') {
        assert.deepEqual(payload.schedules, []);
        const html = renderToStaticMarkup(createElement(TherapyFormPreview, { value: next }));
        assert.ok(!html.includes('08:00'));
        assert.ok(html.includes('Tipo terapia: Al bisogno'));
        assert.ok(html.includes(`Via: ${viaSomministrazione}`));
      }
    }
  }
});

test('changing legacy type does not implicitly fix the recorded ambiguous route', () => {
  const value = { ...emptyTherapyForm(), viaSomministrazione: 'al bisogno' };
  assert.equal(
    applyTherapyFormChange(value, { tipo: 'al_bisogno' }).viaSomministrazione,
    'al bisogno',
  );
});
