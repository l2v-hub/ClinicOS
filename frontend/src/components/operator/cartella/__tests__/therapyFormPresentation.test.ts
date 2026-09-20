import assert from 'node:assert/strict';
import { test } from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyTherapyForm, TherapyFormFields } from '../TherapyFormFields';
import { TherapyFormPreview } from '../TherapyFormPreview';

Object.assign(globalThis, { React });

test('preview keeps incomplete OCR values visibly incomplete without filling a dose or date', () => {
  const value = {
    ...emptyTherapyForm(),
    dataInizio: '',
    viaSomministrazione: '',
    schedules: [{ time: '', quantityNumerator: 0, quantityDenominator: 1, administrationUnit: '' }],
  };
  const before = JSON.stringify(value);
  const html = renderToStaticMarkup(createElement(TherapyFormPreview, { value }));
  for (const text of [
    'Farmaco da selezionare',
    'Via: da indicare',
    'Inizio: da indicare',
    'Orario da indicare',
    'Quantità da indicare',
    'unità da indicare',
  ]) {
    assert.ok(html.includes(text), text);
  }
  assert.equal(JSON.stringify(value), before);
});

test('preview follows the therapy type without presenting latent schedules as active instructions', () => {
  const value = {
    ...emptyTherapyForm(),
    farmacoNome: '<script>sintetico</script>',
    tipo: 'una_tantum' as const,
    dataInizio: '2026-09-20',
    dataSomministrazione: '2026-09-21',
    orarioSomministrazione: '11:30',
  };
  const html = renderToStaticMarkup(createElement(TherapyFormPreview, { value }));
  assert.ok(html.includes('21/09/2026 · 11:30'));
  assert.ok(!html.includes('08:00'));
  assert.ok(!html.includes('<script>'));
  const prn = renderToStaticMarkup(
    createElement(TherapyFormPreview, { value: { ...value, tipo: 'al_bisogno' } }),
  );
  assert.ok(prn.includes('Indicazioni al bisogno da specificare nelle note.'));
  assert.ok(!prn.includes('11:30'));
});

test('multiple forms have unique labels and radio groups; imported notes and fractions remain exposed', () => {
  const value = {
    ...emptyTherapyForm(),
    note: 'Nota sintetica da verificare',
    allowedFractions: ['1', '1/2'],
  };
  const html = renderToStaticMarkup(
    createElement(
      React.Fragment,
      null,
      createElement(TherapyFormFields, { value, onChange: () => {} }),
      createElement(TherapyFormFields, { value, onChange: () => {} }),
    ),
  );
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const match of html.matchAll(/\sfor="([^"]+)"/g)) assert.ok(ids.includes(match[1]));
  const names = [...html.matchAll(/type="radio" name="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(names).size, 2);
  assert.equal(names.length, 6);
  assert.equal([...html.matchAll(/<details[^>]+open=""/g)].length, 4);
});
