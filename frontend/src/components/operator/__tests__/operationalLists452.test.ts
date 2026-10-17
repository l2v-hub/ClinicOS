import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PatientIdentity } from '../../shared/PatientIdentity';
import { PatientRoster } from '../PatientRoster';
import { OperatorAgenda } from '../OperatorAgenda';
import type { Paziente, TherapySlot } from '../../../types';
import { setSessionCapabilities } from '../../../lib/capabilities';
Object.assign(globalThis, { React });
const patient = {
  id: 'QA1',
  medicalRecordNumber: 'QA1',
  firstName: 'Synthetic',
  lastName: 'Identity',
  dateOfBirth: null,
  codiceFiscale: null,
  location: { status: 'unassigned', source: null, room: null, bed: null, asOf: '2026-10-17' },
} as Paziente;
test('compact identity hides repeated missing prose but preserves accessible disambiguation', () => {
  const html = renderToStaticMarkup(
    React.createElement(PatientIdentity, { patient, compact: true }),
  );
  assert.doesNotMatch(html, /patient-identity__incomplete|patient-identity__location/);
  assert.match(html, /class="ds-sr-only"/);
  assert.match(html, /Identity, Synthetic/);
});
test('patient roster leads with bed, hides globally empty optional columns and aggregates incomplete identity once', () => {
  setSessionCapabilities({});
  const html = renderToStaticMarkup(
    React.createElement(PatientRoster, {
      patients: [patient],
      sort: { field: 'patient', direction: 'asc' },
      onSortChange: () => {},
      hasMore: false,
      loading: false,
      summaryMap: new Map(),
      consegneAperteMap: new Map(),
      anomalie: {
        inCorso: false,
        fallito: false,
        verificaIncompleta: false,
        pazienti: [],
        perPaziente: new Map(),
      } as never,
      deleteEnabled: false,
      deletingId: null,
      onSelect: () => {},
      onDelete: () => {},
    }),
  );
  assert.match(html, /<th scope="col"[^>]*>Letto<\/th>/);
  assert.doesNotMatch(html, /<th[^>]*>NEWS2<\/th>|>Regime<\/button>/);
  assert.equal((html.match(/pazienti hanno l’anagrafica incompleta/g) ?? []).length, 1);
  setSessionCapabilities(null);
});

test('roster keeps the NEWS2 column and a single loading status until absence has been verified', () => {
  setSessionCapabilities(null);
  const html = renderToStaticMarkup(
    React.createElement(PatientRoster, {
      patients: [patient],
      sort: { field: 'patient', direction: 'asc' },
      onSortChange: () => {},
      hasMore: false,
      loading: false,
      summaryMap: new Map(),
      consegneAperteMap: new Map(),
      anomalie: {
        inCorso: false,
        fallito: false,
        verificaIncompleta: false,
        pazienti: [],
        perPaziente: new Map(),
      } as never,
      deleteEnabled: false,
      deletingId: null,
      onSelect: () => {},
      onDelete: () => {},
    }),
  );
  assert.match(html, /<th scope="col">NEWS2<\/th>/);
  assert.equal((html.match(/Verifica NEWS2 in corso/g) ?? []).length, 1);
  assert.doesNotMatch(html, /NEWS2 non calcolabile/);
});

test('agenda without appointments retains morning and evening pending therapy doses while omitting empty half-hour slots', () => {
  setSessionCapabilities({});
  const therapySlot = (ora: string, fascia: 'mattina' | 'sera'): TherapySlot => ({
    id: fascia,
    ora,
    fascia,
    label: `Terapia ${fascia}`,
    summary: { total: 1, pending: 1, administered: 0, notAdministered: 0 },
    patients: [
      {
        patientId: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        room: '1',
        bed: 'A',
        administrations: [
          {
            administrationId: null,
            therapyId: `therapy-${fascia}`,
            drugName: `Farmaco ${fascia}`,
            dosage: '1 mg',
            route: 'orale',
            scheduledTime: ora,
            status: 'pending',
            administeredAt: null,
            administeredBy: null,
            notAdministeredReason: null,
          },
        ],
      },
    ],
  });
  try {
    const html = renderToStaticMarkup(
      React.createElement(OperatorAgenda, {
        operatoreId: 'op1',
        nomeOperatore: 'Operatore QA',
        operatori: [],
        appuntamenti: [],
        onAddAppuntamento: async () => null,
        therapySlots: [therapySlot('08:00', 'mattina'), therapySlot('20:00', 'sera')],
      }),
    );
    assert.match(html, /Farmaco mattina/);
    assert.match(html, /Farmaco sera/);
    assert.match(html, /ore 08:00, 1 da erogare/);
    assert.match(html, /ore 20:00, 1 da erogare/);
    assert.equal((html.match(/data-testid="therapy-dose-list"/g) ?? []).length, 2);
    assert.doesNotMatch(html, /class="agt-slot(?: |")|agt-free-slot|Crea appuntamento alle/);
    assert.match(html, /Nessun appuntamento in questa giornata/);
  } finally {
    setSessionCapabilities(null);
  }
});
