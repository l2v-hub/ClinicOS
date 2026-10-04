import assert from 'node:assert/strict';
import test from 'node:test';
import { patientSectionForWardNav } from '../../components/operator/tabGroups';

const all = () => true;

test('P10: inside a chart, ward Terapia/Parametri/Consegne open that patient section', () => {
  assert.equal(patientSectionForWardNav('terapie', true, all), undefined);
  assert.equal(patientSectionForWardNav('parametri-multipaziente', true, all), 'parametri');
  assert.equal(patientSectionForWardNav('consegne', true, all), 'consegne');
});

test('P10: outside a chart or for other entries the ward page is kept', () => {
  assert.equal(patientSectionForWardNav('terapie', false, all), undefined);
  assert.equal(patientSectionForWardNav('agenda-operatore', true, all), undefined);
  assert.equal(patientSectionForWardNav('note', true, all), undefined);
});

test('P10: a section the role cannot read is never targeted', () => {
  const noTherapy = (c: string) => c !== 'therapy.list';
  assert.equal(patientSectionForWardNav('terapie', true, noTherapy), undefined);
  assert.equal(patientSectionForWardNav('parametri-multipaziente', true, noTherapy), 'parametri');
});
