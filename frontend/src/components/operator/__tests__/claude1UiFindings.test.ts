import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TherapyGiroRows } from '../TherapyGiroRows';
import { TherapyAllergyDocumentation } from '../TherapyPatientAllergies';
import { PatientIdentity } from '../../shared/PatientIdentity';
import { completeAllergyReadForSave } from '../cartella/TerapiaFarmacologicaTab';
import { parseTherapySlots } from '../../../lib/therapySlotPage';
import { giroTimes } from '../../../lib/therapyGiro';
import type { TherapySlotPatient } from '../../../types';

Object.assign(globalThis, { React });

function therapyPatient(patch: Partial<TherapySlotPatient>): TherapySlotPatient {
  return {
    patientId: 'synthetic-patient',
    firstName: 'Ada',
    lastName: 'Rossi',
    codiceFiscale: null,
    dateOfBirth: null,
    location: null,
    room: '',
    bed: '',
    administrations: [
      {
        administrationId: null,
        therapyId: 'synthetic-therapy',
        drugName: 'Farmaco di prova',
        dosage: '1 compressa',
        route: 'orale',
        scheduledTime: '08:00',
        status: 'pending',
        administeredAt: null,
        administeredBy: null,
        notAdministeredReason: null,
      },
    ],
    ...patch,
  };
}

function giro(patients: TherapySlotPatient[]) {
  return {
    ora: '08:00',
    patients: patients.map((patient) => ({
      patient,
      items: patient.administrations.map((a) => ({ a, fascia: 'mattina' as const })),
    })),
    total: patients.length,
    administered: 0,
    notAdministered: 0,
    pending: patients.length,
  };
}

test('giro medication heads visibly distinguish same-name patients without CF or bed and format DOB', () => {
  const html = renderToStaticMarkup(
    React.createElement(TherapyGiroRows, {
      time: giro([
        therapyPatient({ patientId: 'p-1', dateOfBirth: '1970-03-04' }),
        therapyPatient({ patientId: 'p-2', dateOfBirth: '1981-11-26' }),
      ]),
      date: '2026-10-21',
      filtro: 'tutte',
    }),
  );
  const visibleCaps = [...html.matchAll(/<span class="giro-row__cap">([^<]*(?:<[^>]+>[^<]*)*)<\/span>/g)]
    .map((match) => match[1].replace(/<[^>]*>/g, ''))
    .filter((value) => value.includes('Nato/a il'));
  assert.ok(visibleCaps.some((value) => value.includes('Nato/a il 04/03/1970')));
  assert.ok(visibleCaps.some((value) => value.includes('Nato/a il 26/11/1981')));
  assert.notEqual(visibleCaps[0], visibleCaps[1]);
  assert.doesNotMatch(html, /Nato\/a il 1970-03-04|Nato\/a il 1981-11-26/);
});

test('compact roster identity shows a visible formatted DOB or stable record identifier', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      'div',
      {},
      React.createElement(PatientIdentity, {
        compact: true,
        patient: { id: 'stable-1', firstName: 'Ada', lastName: 'Rossi', dateOfBirth: '1970-03-04' },
      }),
      React.createElement(PatientIdentity, {
        compact: true,
        patient: { id: 'stable-2', firstName: 'Ada', lastName: 'Rossi' },
      }),
    ),
  );
  assert.match(html, /Nato\/a il 04\/03\/1970/);
  assert.match(html, /Identificativo stable-2/);
  assert.doesNotMatch(html, /class="ds-sr-only">Nato\/a il/);
});

test('paused administration action has an accessible pause label matching visible text', () => {
  const paused = therapyPatient({
    temporaryPsExit: { decision: 'pause' } as never,
  });
  const html = renderToStaticMarkup(
    React.createElement(TherapyGiroRows, {
      time: giro([paused]),
      date: '2026-10-21',
      filtro: 'tutte',
    }),
  );
  assert.match(html, /<button[^>]*disabled=""[^>]*aria-label="Somministrazione in pausa per uscita PS:/);
  assert.match(html, /In pausa per uscita PS/);
  assert.doesNotMatch(html, /<button[^>]*disabled=""[^>]*aria-label="Erogata:/);
});

test('malformed PS-exit metadata is isolated to its patient and never enables their scheduled actions', () => {
  const administration = (therapyId: string) => ({
    administrationId: null,
    therapyId,
    drugName: 'Farmaco di prova',
    dosage: '1 compressa',
    route: 'orale',
    scheduledTime: '08:00',
    status: 'pending',
    administeredAt: null,
    administeredBy: null,
    notAdministeredReason: null,
  });
  const [slot] = parseTherapySlots([
    {
      id: 'slot-ps-check',
      fascia: 'mattina',
      label: 'Terapia mattina',
      ora: '08:00',
      summary: { total: 2, administered: 0, notAdministered: 0, pending: 2 },
      patients: [
        {
          patientId: 'ps-unverified',
          firstName: 'Ada',
          lastName: 'NonVerificata',
          administrations: [administration('therapy-unverified')],
          temporaryPsExit: null,
          temporaryPsExitUnverified: true,
        },
        {
          patientId: 'ps-verified',
          firstName: 'Ada',
          lastName: 'Verificata',
          administrations: [administration('therapy-verified')],
          temporaryPsExit: null,
        },
      ],
    },
  ]);
  assert.equal(slot.kind, undefined);
  const parsedPatients = slot.patients;
  assert.equal(parsedPatients[0].temporaryPsExit, null);
  assert.equal(parsedPatients[0].temporaryPsExitUnverified, true);
  assert.equal(parsedPatients[1].temporaryPsExitUnverified, undefined);
  const html = renderToStaticMarkup(
    React.createElement(TherapyGiroRows, {
      time: giroTimes([slot])[0],
      date: '2026-10-21',
      filtro: 'tutte',
    }),
  );
  assert.match(html, /Stato uscita PS da verificare/);
  assert.match(html, /aria-label="Stato uscita PS da verificare: NonVerificata, Ada/);
  assert.match(html, /aria-label="Stato uscita PS da verificare\. Non erogata: NonVerificata, Ada[^\"]*"[^>]*disabled/);
  assert.match(html, /aria-label="Non erogata: Verificata, Ada[^\"]*" aria-expanded/);
  assert.match(html, /aria-label="Erogata: Verificata, Ada[^\"]*"/);
  assert.doesNotMatch(html, /aria-label="Erogata: NonVerificata, Ada/);
});

test('PS-exit verification marker must be boolean and cannot carry an asserted exit decision', () => {
  const base = {
    patientId: 'strict-ps-state',
    firstName: 'Synthetic',
    lastName: 'Patient',
    administrations: [],
  };
  const rawSlot = (patient: object) => ({
    id: 'strict-slot', fascia: 'mattina', label: 'Mattina', ora: '08:00',
    summary: { total: 0, administered: 0, notAdministered: 0, pending: 0 }, patients: [patient],
  });
  assert.throws(
    () => parseTherapySlots([rawSlot({ ...base, temporaryPsExitUnverified: 'true' })]),
    /verification state/,
  );
  assert.throws(
    () => parseTherapySlots([rawSlot({
      ...base,
      temporaryPsExitUnverified: true,
      temporaryPsExit: { exitId: 'not-asserted', decision: 'pause', departedAt: '2026-10-21T08:00:00Z' },
    })]),
    /must not carry a decision/,
  );
});

test('allergy documentation rows name each allergen once', () => {
  const html = renderToStaticMarkup(
    React.createElement(TherapyAllergyDocumentation, {
      items: [
        { allergene: 'Penicillina', documentato: '2026-10-01', documentatoDa: 'Medico A', note: 'Rash', reazione: 'Rash' },
        { allergene: 'Lattice', documentato: '2026-10-02', documentatoDa: 'Medico B', note: 'Edema', reazione: 'Edema' },
      ],
    }),
  );
  assert.equal((html.match(/Penicillina/g) ?? []).length, 1);
  assert.equal((html.match(/Lattice/g) ?? []).length, 1);
  assert.doesNotMatch(html, /Voce [12]/);
});

test('allergy refresh during pre-save read returns a visible supersession message and blocks POST', async () => {
  let sequence = 7;
  let message = '';
  let posts = 0;
  let resolveRead!: () => void;
  const pendingRead = new Promise<void>((resolve) => { resolveRead = resolve; });
  const save = completeAllergyReadForSave(
    pendingRead,
    () => sequence === 7,
    (error) => { message = error; },
    () => { posts++; },
  );
  sequence++; // focus refresh supersedes the in-flight allergy read
  resolveRead();
  assert.equal(await save, false);
  const html = renderToStaticMarkup(React.createElement('p', { role: 'alert' }, message));
  assert.match(html, /aggiornata durante il salvataggio/);
  assert.equal(posts, 0);
});

test('all changed design rules use existing tokens instead of invalid vars or new hex colors', () => {
  const admin = readFileSync(new URL('../../admin/AdminAttentionList.css', import.meta.url), 'utf8');
  const record = readFileSync(new URL('../PatientRecordData.css', import.meta.url), 'utf8');
  const parameter = readFileSync(new URL('../ParameterReadingForm.css', import.meta.url), 'utf8');
  const tab = readFileSync(new URL('../cartella/TerapiaFarmacologicaTab.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(admin, /var\(--medical-blue|var\(--bg-subtle|var\(--blue-bg/);
  assert.match(admin, /border-left-color: var\(--blue\)/);
  assert.match(record, /\.patient-topbar-title \.cr-alert-strip \{[^}]*background: var\(--amber-bg\);[^}]*color: var\(--amber\);/s);
  assert.match(record, /\.patient-topbar-title \.cr-alert-strip--severe \{[^}]*background: var\(--red-bg\);[^}]*color: var\(--red\);/s);
  assert.match(parameter, /\.parameter-reading-form__input--attention \{[^}]*border-color: var\(--amber\);[^}]*box-shadow: 0 0 0 1px var\(--amber\);/s);
  assert.match(parameter, /\.parameter-oxygen-choices button\[aria-pressed='true'\] \{[^}]*background: var\(--blue-dim\);[^}]*border-color: var\(--blue\);/s);
  assert.match(tab, /borderLeft: '3px solid var\(--amber\)'/);
  assert.doesNotMatch(tab, /borderLeft: '3px solid var\(--amber, #/);
  assert.match(record, /\.patient-record-view \.diario-card\.diario-card--urgent \{[^}]*border-left: 4px solid var\(--red\);[^}]*background: var\(--red-bg\);/s);
  assert.match(record, /\.patient-record-view \.diario-card\.diario-card--taken \{[^}]*border-left: 4px solid var\(--text-muted\);/s);
  assert.match(record, /\.patient-record-view \.cr-alert-strip--allergie \{[^}]*color: var\(--amber\);[^}]*background: var\(--amber-bg\);[^}]*border: 1px solid var\(--border\);/s);
  assert.match(record, /\.patient-record-view \.cr-alert-strip--allergie\.cr-alert-strip--severe \{[^}]*color: var\(--red\);[^}]*background: var\(--red-bg\);/s);
  assert.match(record, /\.patient-record-view \.patient-allergy-strip \{[^}]*background: var\(--amber-bg\);[^}]*border-color: var\(--border\);[^}]*color: var\(--amber\);/s);
  assert.match(record, /\.patient-today__vitals \{[^}]*background: var\(--bg\);/s);
  assert.doesNotMatch(record, /#(?:b42335|fffafb|8291a6|8f5500|fdf3e2|ead0a7|fae9cc|fdecee|efc3cb|fbe0e5)|var\(--bg-subtle/);
});
