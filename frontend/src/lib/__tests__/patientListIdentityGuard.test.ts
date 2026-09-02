import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const list = readFileSync(
  new URL('../../components/operator/PatientList.tsx', import.meta.url),
  'utf8',
);
const roster = readFileSync(
  new URL('../../components/operator/PatientRoster.tsx', import.meta.url),
  'utf8',
);
const styles = readFileSync(
  new URL('../../components/operator/PatientList.css', import.meta.url),
  'utf8',
);
const step = readFileSync(
  new URL('../../components/shared/intake/StepAnagrafica.tsx', import.meta.url),
  'utf8',
);
const intakeStyles = readFileSync(new URL('../../app-additions.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');

test('patient list exposes the canonical fiscal identity and never shows MRN', () => {
  assert.match(list, /Cerca per nome o codice fiscale…/);
  assert.match(list, /aria-label="Cerca paziente per nome o codice fiscale"/);
  assert.doesNotMatch(list, /MRN|medicalRecordNumber/);
  assert.match(roster, /<th scope="col">Codice fiscale<\/th>/);
  assert.match(roster, /patient\.codiceFiscale/);
  assert.match(roster, /Codice fiscale non disponibile/);
  assert.doesNotMatch(roster, /MRN|medicalRecordNumber/);
});

test('roster has five operational columns and native accessible actions', () => {
  assert.equal((roster.match(/<th scope="col"/g) ?? []).length, 5);
  for (const heading of ['Paziente', 'Codice fiscale', 'Ricovero', 'Segnalazioni', 'Azione']) {
    assert.match(roster, new RegExp(heading));
  }
  assert.match(roster, /<caption className="sr-only">Elenco pazienti caricati<\/caption>/);
  assert.match(roster, /aria-label={`Apri cartella di \$\{patient\.firstName\}/);
  assert.match(roster, /type="button"/);
  assert.match(roster, /aria-busy=\{loading\}/);
  assert.match(roster, /role="status" aria-live="polite"/);
  assert.match(roster, /<div className="patient-roster__identity">/);
  assert.doesNotMatch(roster, /className="patient-roster__identity"\s+onClick/);
});

test('tablet and mobile use a compact two-to-one-column card grid', () => {
  assert.match(styles, /@media \(max-width: 1023px\)[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 680px\)[\s\S]*?grid-template-columns: 1fr/);
  assert.match(styles, /min-height: 44px/);
  assert.match(styles, /outline: 2px solid var\(--blue\)/);
});

test('new-patient wizard auto-fills CF without assuming a sex or overwriting provenance', () => {
  assert.match(step, /deriveAutoCFUpdate/);
  assert.match(step, /codiceFiscaleOrigine = 'auto'/);
  assert.match(step, /codiceFiscaleOrigine: codiceFiscale\.trim\(\) \? 'manual'/);
  assert.match(step, /value=\{value\.sex \?\? ''\}/);
  assert.match(step, /<option value="">— Seleziona —<\/option>/);
  assert.match(step, /htmlFor=\{inputId\}/);
  assert.match(step, /'aria-invalid': error \? true : undefined/);
  assert.match(step, /role="alert"/);
  assert.doesNotMatch(step, />Calcola<\/button>/);
  assert.match(app, /key !== 'pazienteId' && key !== 'codiceFiscale'/);
});

test('new-patient wizard keeps required identity visible and progressively discloses optional data', () => {
  assert.match(step, /npm-grid npm-grid--identity/);
  assert.match(step, /npm-grid npm-grid--contacts/);
  assert.match(step, /<details/);
  assert.match(step, /npm-card--collapsible/);
  assert.match(step, /open=\{expanded\}/);
  assert.match(step, /onToggle=/);
  assert.match(step, /4 obbligatori/);
  assert.match(step, /Facoltativo/);
});

test('patient intake uses a compact responsive layout without reducing touch targets', () => {
  assert.match(intakeStyles, /\.import-modal--intake \{[\s\S]*?max-width: 1180px/);
  assert.match(
    intakeStyles,
    /\.import-modal--intake \.npm-grid--identity,[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)/,
  );
  assert.match(intakeStyles, /\.import-modal--intake \.npm-input \{[\s\S]*?min-height: 44px/);
  assert.match(intakeStyles, /\.import-modal--intake \.npm-card__status--complete/);
  assert.match(intakeStyles, /@media \(max-width: 640px\)[\s\S]*?grid-template-columns: 1fr/);
});
