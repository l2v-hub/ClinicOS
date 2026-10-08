import assert from 'node:assert/strict';
import { test } from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  dischargeRowToTherapyForm,
  therapyFormToDischargeRow,
  dischargeRowToTherapyInput,
  type DischargeTherapyRow,
} from '../dischargeTherapy';
import { buildIntakeTherapyReview, therapyInputIssues } from '../intakeTherapies';
import { DischargeTherapyReview } from '../DischargeTherapyReview';
import { IntakeTherapySummary } from '../IntakeTherapySummary';
Object.assign(globalThis, { React });

const row: DischargeTherapyRow = {
  farmacoNome: 'Insulina sintetica',
  forma: 'FL',
  dosaggio: '100 UI/ML',
  viaSomministrazione: 'SC',
  quantita: '',
  orari: ['08:00', '12:00'],
  giorni: [],
  dataInizio: '2033-01-01',
  classe: '',
  note: '',
  originalText: 'Fonte sintetica',
  stato: 'da_verificare',
  doseMode: 'glucose_scale',
  glucoseScale: [
    { minMgDl: 200, maxMgDl: 250, units: 4 },
    { minMgDl: 251, maxMgDl: 300, units: 6 },
  ],
};

test('scale mapping retains review and source metadata without a fixed clinical quantity', () => {
  const form = dischargeRowToTherapyForm(row);
  assert.equal(form.doseMode, 'glucose_scale');
  const saved = JSON.parse(JSON.stringify(therapyFormToDischargeRow(form, row)));
  assert.equal(saved.stato, 'da_verificare');
  assert.equal(saved.quantita, '');
  assert.equal(saved.originalText, row.originalText);
  assert.deepEqual(dischargeRowToTherapyForm(saved), form);
  const input = dischargeRowToTherapyInput(saved);
  assert.deepEqual(therapyInputIssues(input), []);
  assert.deepEqual((input.doseProtocol as { rules: unknown }).rules, row.glucoseScale);
  assert.match(
    buildIntakeTherapyReview({ terapiaImport: [saved] })[0].issues.join(),
    /confrontandoli/,
  );
});

test('scale does not invent a time and invalid protocol still blocks confirmation', () => {
  const form = dischargeRowToTherapyForm({ ...row, orari: [] });
  assert.equal(form.schedules[0].time, '');
  assert.match(
    therapyInputIssues(dischargeRowToTherapyInput({ ...row, orari: [] })).join(),
    /ora valida/,
  );
  const bad = dischargeRowToTherapyInput({ ...row, glucoseScale: [] });
  assert.match(therapyInputIssues(bad).join(), /schema glicemico/);
});

test('summary renders measured-dose protocol rather than technical schedule quantity', () => {
  const reviewed = therapyFormToDischargeRow(dischargeRowToTherapyForm(row), {
    ...row,
    stato: 'ok',
  });
  const review = buildIntakeTherapyReview({ terapiaImport: [reviewed] })[0];
  assert.deepEqual(review.issues, []);
  const html = renderToStaticMarkup(
    createElement(IntakeTherapySummary, { therapy: review, busy: false }),
  );
  assert.match(html, /Schema glicemico/);
  assert.match(html, /200–250 mg\/dL/);
  assert.match(html, /6 unità/);
  assert.doesNotMatch(html, /data-summary-field="quantity"/);
  assert.match(html, /Rileva la glicemia/);
});

test('comparison remains visible when OCR detects zero therapies and source text is escaped', () => {
  const html = renderToStaticMarkup(
    createElement(DischargeTherapyReview, {
      rows: [],
      onChange() {},
      sourceText: '<script>synthetic()</script>\nPrescrizione sintetica non riconosciuta',
    }),
  );
  assert.match(html, /therapy-source-comparison/);
  assert.match(html, /Nessuna terapia riconosciuta/);
  assert.match(html, /Prescrizione sintetica non riconosciuta/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
