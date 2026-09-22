import assert from 'node:assert/strict';
import test from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PatientTherapyAPI } from '../../../../types';
import { CampoFarmaco } from '../CampoFarmaco';
import { SelectedDrugPackage } from '../SelectedDrugPackage';
import { emptyTherapyForm, TherapyFormFields } from '../TherapyFormFields';
import { applyTherapyFormChange } from '../therapyFormChange';
import { formToPayload, therapyToForm } from '../therapyFormMapping';
import {
  freeTextDrug,
  selectDrugPackage,
  needsCommercialStrengthReview,
} from '../drugPackageSelection';
import { therapyFormToInput } from '../../../shared/intake/therapyFormPayload';
import {
  dischargeRowToTherapyForm,
  dischargeRowToTherapyInput,
  therapyFormToDischargeRow,
  type DischargeTherapyRow,
} from '../../../shared/intake/dischargeTherapy';

Object.assign(globalThis, { React });
const selected = {
  aic: '123456789',
  denominazione: 'Prodotto sintetico',
  descrizione: '1000 MG 20 COMPRESSE',
  forma: 'Compressa',
  linkFi: null,
  linkRcp: null,
  principiAttivi: [{ nome: 'Principio sintetico', quantita: null, unita: null }],
};
function savedTherapy(): PatientTherapyAPI {
  return {
    id: 'synthetic-therapy',
    patientId: 'synthetic-patient',
    farmacoNome: selected.denominazione,
    drugPackageRef: selected.aic,
    dosaggio: '1000 mg compressa',
    pharmaceuticalForm: 'compressa',
    commercialStrengthValue: 1000,
    commercialStrengthUnit: 'mg',
    allowedFractions: '1,1/2',
    viaSomministrazione: 'orale',
    tipo: 'periodica',
    stato: 'attiva',
    dataInizio: '2026-09-23',
    dataFine: null,
    giorniSettimana: '1,3,5',
    prescrittore: 'Operatore sintetico',
    note: 'Nota estesa conservata\nSeconda riga',
    operatoreInseritore: 'Operatore sintetico',
    fasceMattina: true,
    fascePranzo: false,
    fascePomeriggio: false,
    fasceSera: true,
    fasceNotte: false,
    orarioSpecifico: '08:00,20:00',
    dataSomministrazione: null,
    orarioSomministrazione: null,
    schedules: [
      {
        id: 'schedule-1',
        therapyId: 'synthetic-therapy',
        time: '08:00',
        fascia: 'mattina',
        quantityNumerator: 1,
        quantityDenominator: 2,
        administrationUnit: 'compressa',
      },
      {
        id: 'schedule-2',
        therapyId: 'synthetic-therapy',
        time: '20:00',
        fascia: 'sera',
        quantityNumerator: 2,
        quantityDenominator: 1,
        administrationUnit: 'compressa',
      },
    ],
    createdAt: '2026-09-23',
    updatedAt: '2026-09-23',
  };
}
const baseImport: DischargeTherapyRow = {
  farmacoNome: '',
  forma: '',
  dosaggio: '',
  viaSomministrazione: '',
  quantita: '',
  orari: [],
  giorni: [],
  dataInizio: '',
  classe: '',
  note: '',
  originalText: 'Fonte sintetica',
  stato: 'ok',
};

test('existing therapy GET → form → PUT preserves exact AIC, notes and prescribed schedule', () => {
  const saved = savedTherapy();
  const form = therapyToForm(JSON.parse(JSON.stringify(saved)));
  const payload = formToPayload(form, saved.patientId, 'Operatore sintetico');
  assert.equal(form.drugPackageRef, selected.aic);
  assert.equal(payload.drugPackageRef, selected.aic);
  assert.equal(payload.commercialStrengthValue, 1000);
  assert.deepEqual(
    payload.schedules,
    saved.schedules!.map(
      ({ time, quantityNumerator, quantityDenominator, administrationUnit }) => ({
        time,
        quantityNumerator,
        quantityDenominator,
        administrationUnit,
      }),
    ),
  );
  assert.equal(payload.viaSomministrazione, saved.viaSomministrazione);
  assert.equal(payload.note, saved.note);
  assert.equal(payload.giorniSettimana, '1,3,5');
});

test('changing package clears old commercial strength without inferring dose or changing administrations', () => {
  const form = therapyToForm(savedTherapy());
  const next = applyTherapyFormChange(
    form,
    selectDrugPackage(
      { ...selected, aic: '987654321', forma: 'Sciroppo' },
      form.pharmaceuticalForm,
    ),
  );
  const payload = formToPayload(next, 'synthetic-patient', 'Operatore sintetico');
  assert.equal(next.drugPackageRef, '987654321');
  assert.equal(next.pharmaceuticalForm, 'sciroppo');
  assert.equal(next.commercialStrengthValue, '');
  assert.equal(payload.commercialStrengthValue, null);
  assert.deepEqual(payload.schedules, form.schedules);
  assert.equal(payload.viaSomministrazione, form.viaSomministrazione);
  assert.deepEqual(next.allowedFractions, form.allowedFractions);
  assert.equal(needsCommercialStrengthReview(next), true);
  assert.equal('commercialStrengthNeedsReview' in payload, false);
  const markup = renderToStaticMarkup(
    createElement(TherapyFormFields, { value: next, onChange() {} }),
  );
  assert.match(markup, /dosaggio commerciale precedente è stato rimosso/);
  assert.match(markup, /08:00/);
  assert.match(markup, /20:00/);
});

test('manual and imported intake JSON preserve explicit package reference through review and payload', () => {
  const form = { ...therapyToForm(savedTherapy()), drugPackageRef: '987654321' };
  const row = therapyFormToDischargeRow(form, baseImport);
  const draft = JSON.parse(JSON.stringify({ manual: [form], imported: [row] }));
  assert.equal(therapyFormToInput(draft.manual[0]).drugPackageRef, form.drugPackageRef);
  const restored = dischargeRowToTherapyForm(draft.imported[0]);
  assert.equal(restored.drugPackageRef, form.drugPackageRef);
  const input = dischargeRowToTherapyInput(draft.imported[0]);
  assert.equal(input.drugPackageRef, form.drugPackageRef);
  assert.equal(input.note, form.note);
  assert.deepEqual(input.schedules, form.schedules);
});

test('free text removes a stale AIC in every payload and does not invent an identity', () => {
  const form = therapyToForm(savedTherapy());
  const free = applyTherapyFormChange(form, freeTextDrug('Preparato sintetico'));
  assert.equal(free.drugPackageRef, null);
  assert.equal(formToPayload(free, 'synthetic-patient', '').drugPackageRef, null);
  assert.equal(therapyFormToInput(free).drugPackageRef, null);
  assert.deepEqual(free.schedules, form.schedules);
  const imported = dischargeRowToTherapyForm({
    ...baseImport,
    farmacoNome: selected.denominazione,
  });
  assert.equal(imported.drugPackageRef, null, 'a name never reconstructs an AIC');
  const galenic = applyTherapyFormChange(emptyTherapyForm(), freeTextDrug('Galenico sintetico'));
  assert.equal(needsCommercialStrengthReview(galenic), false, 'no new strength obligation');
});

test('manually changing formulation detaches the incompatible AIC and tells the operator', () => {
  const form = therapyToForm(savedTherapy());
  const changed = applyTherapyFormChange(form, { pharmaceuticalForm: 'sciroppo' });
  assert.equal(changed.drugPackageRef, null);
  assert.equal(changed.drugPackageDetached, true);
  assert.deepEqual(
    changed.schedules.map((s) => [s.time, s.quantityNumerator, s.quantityDenominator]),
    form.schedules.map((s) => [s.time, s.quantityNumerator, s.quantityDenominator]),
  );
  const markup = renderToStaticMarkup(
    createElement(TherapyFormFields, { value: changed, onChange() {} }),
  );
  assert.match(markup, /Confezione AIFA scollegata/);
  assert.doesNotMatch(markup, /Confezione selezionata/);
  const unchanged = applyTherapyFormChange(form, { pharmaceuticalForm: 'compressa' });
  assert.equal(unchanged.drugPackageRef, selected.aic);
});

test('selected package renders description, exact formulation and AIC; reload shows saved identity before lookup', () => {
  const markup = renderToStaticMarkup(
    createElement(SelectedDrugPackage, { aic: selected.aic, selected }),
  );
  assert.match(markup, /1000 MG 20 COMPRESSE/);
  assert.match(markup, /Formulazione: Compressa/);
  assert.match(markup, /AIC 123456789/);
  assert.match(markup, /distinto dalla quantità da somministrare/);
  const reopened = renderToStaticMarkup(
    createElement(CampoFarmaco, {
      valore: selected.denominazione,
      forma: 'compressa',
      drugPackageRef: selected.aic,
      onCambia() {},
    }),
  );
  assert.match(reopened, /AIC 123456789/);
  assert.doesNotMatch(reopened, /Nome già presente in terapia/);
});
