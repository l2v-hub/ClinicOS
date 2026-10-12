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

const pumpRow: DischargeTherapyRow = {
  ...row,
  farmacoNome: 'Insulina in pompa sintetica',
  viaSomministrazione: 'EV',
  glucoseDoseUnit: 'ml/h',
  glucoseScale: [
    { minMgDl: 151, maxMgDl: 200, units: 2 },
    {
      minMgDl: 351,
      maxMgDl: null,
      units: 6,
      extraDoses: [{ amount: 6, unit: 'unità', route: 'EV', label: 'bolo' }],
    },
  ],
  glucoseScaleWarnings: ['Glicemia 201–350 mg/dL non coperta dallo schema'],
};

test('import row → form keeps pump unit and extra doses, and saves them back into the draft', () => {
  const form = dischargeRowToTherapyForm(pumpRow);
  assert.equal(form.glucoseDoseUnit, 'ml/h');
  assert.deepEqual(form.glucoseScale?.[1]?.extraDoses, [
    { amount: '6', unit: 'unità', route: 'EV', label: 'bolo' },
  ]);
  const saved = JSON.parse(JSON.stringify(therapyFormToDischargeRow(form, pumpRow)));
  assert.equal(saved.glucoseDoseUnit, 'ml/h');
  assert.deepEqual(saved.glucoseScale, pumpRow.glucoseScale);
  assert.deepEqual(saved.glucoseScaleWarnings, pumpRow.glucoseScaleWarnings);
  const input = dischargeRowToTherapyInput(saved);
  assert.deepEqual(therapyInputIssues(input), []);
  assert.deepEqual(input.doseProtocol, {
    kind: 'blood_glucose',
    measurementUnit: 'mg/dL',
    doseUnit: 'ml/h',
    rules: pumpRow.glucoseScale,
  });
});

test('legacy import row without a dose unit stays in units', () => {
  const form = dischargeRowToTherapyForm(row);
  assert.equal(form.glucoseDoseUnit, 'unità');
  const input = dischargeRowToTherapyInput(row);
  assert.equal((input.doseProtocol as { doseUnit: string }).doseUnit, 'unità');
});

test('review shows the parser warnings highlighted on the row, and the summary the pump unit', () => {
  const html = renderToStaticMarkup(
    createElement(DischargeTherapyReview, { rows: [pumpRow], onChange() {} }),
  );
  assert.match(html, /data-testid="discharge-glucose-warnings"/);
  assert.match(html, /Glicemia 201–350 mg\/dL non coperta dallo schema/);
  assert.match(html, /Velocità \(ml\/h\)/);
  assert.match(html, /\+ Dose aggiuntiva/);
  const reviewed = therapyFormToDischargeRow(dischargeRowToTherapyForm(pumpRow), {
    ...pumpRow,
    stato: 'ok',
  });
  const review = buildIntakeTherapyReview({ terapiaImport: [reviewed] })[0];
  const summary = renderToStaticMarkup(
    createElement(IntakeTherapySummary, { therapy: review, busy: false }),
  );
  assert.match(summary, /151–200 mg\/dL → 2 ml\/h/);
  assert.match(summary, /≥351 mg\/dL → 6 ml\/h \+ 6 unità EV \(bolo\)/);
});

test('overlapping imported scale is kept as written and blocks confirmation', () => {
  const overlapping: DischargeTherapyRow = {
    ...row,
    glucoseScale: [
      { minMgDl: 200, maxMgDl: 250, units: 4 },
      { minMgDl: 250, maxMgDl: 300, units: 6 },
    ],
  };
  const form = dischargeRowToTherapyForm(overlapping);
  assert.deepEqual(
    form.glucoseScale?.map((rule) => rule.minMgDl),
    ['200', '250'],
  );
  assert.match(
    therapyInputIssues(dischargeRowToTherapyInput(overlapping)).join(),
    /schema glicemico/,
  );
});

test('mixed-unit scale imports no bands: the operator must transcribe it before confirming', () => {
  const mixed: DischargeTherapyRow = {
    ...row,
    glucoseScale: [],
    glucoseDoseUnit: undefined,
    glucoseScaleWarnings: [
      'Fasce scritte in unità diverse (unità e ml/h): schema non importato, trascrivilo dal documento',
    ],
  };
  const form = dischargeRowToTherapyForm(mixed);
  assert.equal(form.doseMode, 'glucose_scale');
  assert.deepEqual(form.glucoseScale, []);
  const issues = therapyInputIssues(dischargeRowToTherapyInput(mixed));
  assert.ok(issues.length > 0, 'an empty scale must block confirmation');
  const html = renderToStaticMarkup(
    createElement(DischargeTherapyReview, { rows: [mixed], onChange() {} }),
  );
  assert.match(html, /unità diverse/);
});
