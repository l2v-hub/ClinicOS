import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PatientRoster } from '../../components/operator/PatientRoster';
import type { Paziente } from '../../types';
Object.assign(globalThis, { React });
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
import { cartellaWriteData } from '../cartellaWriteQueue';


test('patient list exposes the canonical fiscal identity and never shows MRN', () => {
  assert.match(list, /Cerca per nome o codice fiscale…/);
  assert.match(list, /aria-label="Cerca paziente per nome o codice fiscale"/);
  assert.doesNotMatch(list, /MRN|medicalRecordNumber/);
  // HMI 1: il codice fiscale è sotto il nome ("N anni · Letto · CF"); si ordina ancora dal
  // selettore dell'ordinamento (opzione fiscalCode di PATIENT_SORT_LABELS).
  assert.match(
    roster,
    /\{rosterAge\(patient\)\}[\s\S]*?<PatientIdentifier patient=\{patient\} \/>/,
  );
  assert.match(roster, /Object\.entries\(PATIENT_SORT_LABELS\)/);
  assert.match(roster, /<PatientIdentity patient=\{patient\}/);
  assert.match(roster, /<PatientIdentifier patient=\{patient\}/);
  assert.doesNotMatch(roster, /MRN|medicalRecordNumber/);
});

test('452 roster leads with bed and preserves native accessible actions while optional empty columns disappear', () => {
  const patient = {
    id: 'qa-452',
    firstName: 'Synthetic',
    lastName: 'Identità',
    medicalRecordNumber: 'QA-NOT-VISIBLE',
    codiceFiscale: 'RSSMRA80A01H501U',
    dateOfBirth: '1980-01-01',
    location: {
      status: 'assigned',
      source: 'assignment',
      room: 'QA44',
      bed: '7',
      asOf: '2026-10-17',
    },
  } as Paziente;
  const props = {
    patients: [patient],
    sort: { field: 'patient' as const, direction: 'asc' as const },
    onSortChange: () => {},
    hasMore: false,
    loading: false,
    summaryMap: new Map(),
    consegneAperteMap: new Map(),
    anomalie: {
      perPaziente: new Map(),
      pazienti: [],
      inCorso: false,
      fallito: false,
      verificaIncompleta: false,
    },
    deleteEnabled: false,
    deletingId: null,
    onSelect: () => {},
    onDelete: () => {},
  };
  const html = renderToStaticMarkup(React.createElement(PatientRoster, props));
  assert.match(html, /<th scope="col"[^>]*>Letto<\/th>/);
  assert.ok(html.indexOf('Letto') < html.indexOf('Ordina per paziente'));
  assert.match(html, /QA44 · 7/);
  assert.match(html, /RSSMRA80A01H501U/);
  assert.doesNotMatch(html, /QA-NOT-VISIBLE/);
  assert.doesNotMatch(html, /Ordina per regime/);
  assert.match(
    html,
    /<th[^>]*>NEWS2<\/th>/,
    'Unknown NEWS2 remains visible until the history is verified',
  );
  assert.match(html, /Verifica NEWS2 in corso/);
  assert.equal((html.match(/<th scope="col"/g) ?? []).length, 5);
  // HMI 1: colonna NEWS2 al posto della colonna codice fiscale (che va sotto il nome).
  for (const heading of ['Paziente', 'Regime', 'Segnalazioni', 'Azione']) {
    assert.match(roster, new RegExp(heading));
  }
  assert.match(roster, /<th scope="col">NEWS2<\/th>/);
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
  const clinical = {
    pazienteId: 'test',
    codiceFiscale: 'MANUAL',
    codiceFiscaleOrigine: 'manual',
    parametriMensili: [],
  };
  assert.deepEqual(cartellaWriteData(clinical), {
    codiceFiscaleOrigine: 'manual',
    parametriMensili: [],
  });
});

test('new-patient wizard keeps required identity visible and progressively discloses optional data', () => {
  assert.match(step, /npm-grid npm-grid--identity/);
  assert.match(step, /npm-grid npm-grid--contacts/);
  assert.match(step, /<details/);
  assert.match(step, /npm-card--collapsible/);
  assert.match(step, /open=\{expanded\}/);
  assert.match(step, /onToggle=/);
  assert.match(step, /4 necessar[i] all’ingresso/);
  assert.match(step, /path="anagrafica.dateOfBirth"\s+required/);
  assert.match(step, /path="anagrafica.codiceFiscale"\s+required/);
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
