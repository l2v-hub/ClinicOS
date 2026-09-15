import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  dischargeRowToTherapyInput,
  dischargeRowToTherapyForm,
  therapyFormToDischargeRow,
  type DischargeTherapyRow,
} from '../dischargeTherapy';
import { buildIntakeTherapyReview, therapyInputIssues } from '../intakeTherapies';
import { therapyFormToInput } from '../therapyFormPayload';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StepVerifica } from '../StepVerifica';
Object.assign(globalThis, { React });
import { assertValidSchedulesInput } from '../../../../../../backend/src/lib/therapy-dose';

const row: DischargeTherapyRow = {
  farmacoNome: 'Farmaco sintetico',
  forma: 'CPR',
  dosaggio: '20 MG',
  viaSomministrazione: 'OS',
  quantita: '1/2 Cpr',
  orari: ['08:00', '20:00'],
  giorni: ['Lun', 'Mer'],
  dataInizio: '2026-09-15',
  classe: '',
  note: '',
  originalText: 'Fixture sintetica',
  stato: 'ok',
};

test('import confirmation retains fraction, administration unit and weekdays', () => {
  const payload = dischargeRowToTherapyInput(row);
  assert.doesNotThrow(() => assertValidSchedulesInput(payload.schedules));
  assert.deepEqual(
    payload.schedules,
    ['08:00', '20:00'].map((time) => ({
      time,
      quantityNumerator: 1,
      quantityDenominator: 2,
      administrationUnit: 'compressa',
    })),
  );
  assert.equal(payload.giorniSettimana, '1,3');
  assert.equal(payload.commercialStrengthValue, 20);
});

test('reviewed schedules, dates, weekdays and status survive JSON draft reload', () => {
  const form = dischargeRowToTherapyForm(row);
  Object.assign(form, {
    dataFine: '2026-10-20',
    stato: 'sospesa',
    allowedFractions: ['1', '1/2', '1/4'],
    prescrittore: 'Prescrittore sintetico',
  });
  form.schedules[1] = {
    time: '19:30',
    quantityNumerator: 3,
    quantityDenominator: 4,
    administrationUnit: 'compressa',
  };
  const saved = JSON.parse(JSON.stringify(therapyFormToDischargeRow(form, row)));
  assert.deepEqual(dischargeRowToTherapyForm(saved), form);
  const input = dischargeRowToTherapyInput(saved);
  assert.deepEqual(input.schedules, form.schedules);
  assert.equal(input.dataFine, form.dataFine);
  assert.equal(input.stato, 'sospesa');
  assert.equal(input.giorniSettimana, '1,3');
  assert.equal(input.allowedFractions, '1,1/2,1/4');
  assert.deepEqual(therapyInputIssues(input), []);
  form.schedules[0].time = '09:00';
  assert.equal(saved.reviewedTherapy.schedules[0].time, '08:00');
});

test('one-off and as-needed reviews keep their type after reload without periodic schedules', () => {
  for (const tipo of ['una_tantum', 'al_bisogno'] as const) {
    const form = {
      ...dischargeRowToTherapyForm(row),
      tipo,
      dataSomministrazione: '2026-09-16',
      orarioSomministrazione: '10:15',
    };
    const saved = JSON.parse(JSON.stringify(therapyFormToDischargeRow(form, row)));
    const input = dischargeRowToTherapyInput(saved);
    assert.equal(input.tipo, tipo);
    assert.deepEqual(input.schedules, []);
    if (tipo === 'una_tantum') {
      assert.equal(input.dataSomministrazione, '2026-09-16');
      assert.equal(input.orarioSomministrazione, '10:15');
    }
    assert.deepEqual(therapyInputIssues(input), []);
  }
});

test('missing or ambiguous raw quantities never become a default dose', () => {
  for (const override of [
    { forma: 'SCIR', quantita: '5' },
    { forma: 'flacone', quantita: '1' },
    { quantita: '1 Dosi' },
    { quantita: '' },
    { orari: [] },
    { viaSomministrazione: '' },
    { dataInizio: '' },
    { giorni: ['incerto'] },
  ]) {
    const input = dischargeRowToTherapyInput({ ...row, ...override });
    assert.ok(therapyInputIssues(input).length > 0);
  }
  const empty = dischargeRowToTherapyForm({
    ...row,
    quantita: '',
    orari: [],
    forma: '',
    dataInizio: '',
  });
  assert.equal(empty.schedules[0].time, '');
  assert.equal(empty.schedules[0].quantityNumerator, 0);
  assert.equal(empty.schedules[0].administrationUnit, '');
  assert.equal(empty.dataInizio, '');
});

test('explicit unit takes priority over form and compound strength stays raw', () => {
  const input = dischargeRowToTherapyInput({
    ...row,
    forma: 'SCIR',
    quantita: '2,5 ml',
    dosaggio: '20mg/ml',
  });
  assert.equal(input.commercialStrengthValue, undefined);
  assert.equal(input.dosaggio, '20mg/ml');
  assert.deepEqual((input.schedules as unknown[])[0], {
    time: '08:00',
    quantityNumerator: 5,
    quantityDenominator: 2,
    administrationUnit: 'ml',
  });
  const fraction = dischargeRowToTherapyInput({ ...row, quantita: '1 / 2 Cpr' });
  assert.equal((fraction.schedules as { quantityDenominator: number }[])[0].quantityDenominator, 2);
});

test('blank drugs and invalid times stay in the ordered review and cannot confirm', () => {
  const manual = dischargeRowToTherapyForm(row);
  const review = buildIntakeTherapyReview({
    terapiaImport: [{ ...row, farmacoNome: '' }],
    terapia: [manual],
  });
  assert.equal(review.length, 2);
  assert.equal(review[0].index, 1);
  assert.match(review[0].issues.join(), /nome del farmaco/);
  assert.deepEqual(review[1].times, ['08:00', '20:00']);
  const invalid = therapyFormToInput({
    ...manual,
    schedules: [{ ...manual.schedules[0], time: '25:99' }],
  });
  assert.equal((invalid.schedules as unknown[]).length, 1);
  assert.match(therapyInputIssues(invalid).join(), /Orario 1/);
  for (const patch of [
    { dataInizio: '2026-02-30' },
    { dataFine: '2025-01-01' },
    { commercialStrengthValue: NaN },
    { schedules: [manual.schedules[0], manual.schedules[0]] },
  ])
    assert.ok(therapyInputIssues({ ...review[1].input, ...patch }).length > 0);
});

test('verification renders real manual times and an actionable indexed blocker', () => {
  const markup = renderToStaticMarkup(
    createElement(StepVerifica, {
      data: {
        terapiaImport: [{ ...row, farmacoNome: '' }],
        terapia: [dischargeRowToTherapyForm(row)],
      },
      busy: false,
      error: null,
      onConfirm() {},
      onUpdateSection() {},
      onReviewTherapies() {},
    }),
  );
  assert.match(markup, /ore 08:00, 20:00/);
  assert.match(markup, /Terapia 1: Indica il nome del farmaco/);
  assert.match(markup, /Correggi terapie/);
  assert.match(markup, /class="btn-success" disabled=""/);
});

test('liquid and inhaled quantities keep their explicit unit', () => {
  for (const [forma, quantita, unit, amount] of [
    ['SCIR', '5 ml', 'ml', 5],
    ['', '2 Puff', 'puff', 2],
  ] as const) {
    const payload = dischargeRowToTherapyInput({ ...row, forma, quantita });
    assert.doesNotThrow(() => assertValidSchedulesInput(payload.schedules));
    assert.deepEqual((payload.schedules as unknown[])[0], {
      time: '08:00',
      quantityNumerator: amount,
      quantityDenominator: 1,
      administrationUnit: unit,
    });
  }
});

test('ambiguous OCR source stays flagged through edits until explicitly reviewed', () => {
  const flagged = {
    ...row,
    stato: 'da_verificare' as const,
    note: 'Posologia sintetica da verificare',
  };
  const edited = therapyFormToDischargeRow(dischargeRowToTherapyForm(flagged), flagged);
  const review = buildIntakeTherapyReview({ terapiaImport: [edited] })[0];
  assert.equal(review.requiresSourceReview, true);
  assert.match(review.issues.join(), /confrontandoli con il documento/);
  const accepted = therapyFormToDischargeRow(dischargeRowToTherapyForm(edited), {
    ...edited,
    stato: 'ok',
  });
  assert.deepEqual(buildIntakeTherapyReview({ terapiaImport: [accepted] })[0].issues, []);
});
