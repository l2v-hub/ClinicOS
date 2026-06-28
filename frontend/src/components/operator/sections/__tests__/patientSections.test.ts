import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PATIENT_SECTIONS, intakeSections, getSection } from '../patientSections.js';

test('registry lists the core clinical sections', () => {
  const keys = PATIENT_SECTIONS.map(s => s.sectionKey);
  for (const k of ['allergie', 'diagnosi', 'terapia', 'parametri', 'dolore', 'anamnesi']) {
    assert.ok(keys.includes(k), `missing section ${k}`);
  }
});

test('intakeSections returns only intake-available sections', () => {
  assert.ok(intakeSections().every(s => s.availableDuringIntake));
});

test('getSection resolves by key', () => {
  assert.equal(getSection('allergie')?.sectionKey, 'allergie');
  assert.equal(getSection('nope'), undefined);
});
