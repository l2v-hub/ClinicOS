import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PatientIdentity } from '../../shared/PatientIdentity';
import { PatientRoster } from '../PatientRoster';
import type { Paziente } from '../../../types';
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
