import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const form = readFileSync(
  new URL('../../components/operator/ConsegnaCreateForm.tsx', import.meta.url),
  'utf8',
);
const combobox = readFileSync(
  new URL('../../components/shared/PatientCombobox.tsx', import.meta.url),
  'utf8',
);
const formStyles = readFileSync(
  new URL('../../components/operator/ConsegnaCreateForm.css', import.meta.url),
  'utf8',
);
const comboboxStyles = readFileSync(
  new URL('../../components/shared/PatientCombobox.css', import.meta.url),
  'utf8',
);
const appointmentForm = readFileSync(
  new URL('../../components/shared/AppointmentForm.tsx', import.meta.url),
  'utf8',
);
const notesPage = readFileSync(
  new URL('../../components/shared/NotesPage.tsx', import.meta.url),
  'utf8',
);

test('new handover uses the shared semantic form and exposes explicit identity fields', () => {
  assert.match(form, /<form[\s\S]*id="nuova-consegna-panel"/);
  assert.match(form, /onSubmit=\{submit\}/);
  assert.match(form, /<PatientCombobox/);
  assert.match(form, /id="handover-date"/);
  assert.match(form, /id="handover-time"/);
  assert.match(form, /maxLength=\{4000\}/);
  assert.match(form, /type="submit"/);
  assert.match(form, /disabled=\{!canSubmit\}/);
});

test('patient picker is an accessible listbox with fiscal code always visible', () => {
  assert.match(combobox, /role="combobox"/);
  assert.match(combobox, /aria-autocomplete="list"/);
  assert.match(combobox, /aria-activedescendant=\{activeOptionId\}/);
  assert.match(combobox, /role="listbox"/);
  assert.match(combobox, /role="option"/);
  assert.match(combobox, /CF \{patientFiscalCode\(patient\)\}/);
  assert.match(combobox, /Nessun paziente trovato/);
  assert.match(combobox, /Digita almeno 2 caratteri/);
  assert.doesNotMatch(combobox, /search-dropdown/);
  assert.match(appointmentForm, /<PatientCombobox/);
  assert.match(notesPage, /<PatientCombobox/);
  assert.doesNotMatch(appointmentForm, /search-dropdown/);
  assert.doesNotMatch(notesPage, /search-dropdown/);
});

test('handover form and result menu have explicit tablet/mobile constraints', () => {
  assert.match(formStyles, /grid-template-columns:\s*repeat\(12,/);
  assert.match(formStyles, /@media \(max-width: 900px\)/);
  assert.match(formStyles, /grid-template-columns:\s*repeat\(2,/);
  assert.match(formStyles, /@media \(max-width: 639px\)/);
  assert.match(formStyles, /grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.doesNotMatch(formStyles, /overflow-x:\s*(?:auto|scroll)/);
  assert.match(comboboxStyles, /max-height:\s*min\(320px, 40vh\)/);
  assert.match(comboboxStyles, /overflow-y:\s*auto/);
});
