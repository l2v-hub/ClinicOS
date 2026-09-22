import assert from 'node:assert/strict';
import { test } from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PatientRoster } from '../PatientRoster';
import { AIImportStatus } from '../../shared/AIImportStatus';
import type { Paziente, ClinicalSummaryEntry } from '../../../types';

// The Node test runner uses classic JSX for imported TSX; the browser build uses automatic JSX.
Object.assign(globalThis, { React });

const patient: Paziente = {
  id: 'synthetic',
  firstName: 'Esempio',
  lastName: 'Collaudo',
  dateOfBirth: '1980-01-01',
  medicalRecordNumber: 'QA',
  codiceFiscale: null,
  sex: 'F',
  email: null,
  phone: null,
};
const emptyAnomalies = {
  perPaziente: new Map(),
  pazienti: [],
  inCorso: false,
  fallito: false,
  verificaIncompleta: false,
};
function roster(summaryLoading: boolean, summary?: ClinicalSummaryEntry, anomalyPending = false) {
  return renderToStaticMarkup(
    createElement(PatientRoster, {
      patients: [patient],
      sort: { field: 'patient', direction: 'asc' },
      onSortChange: () => {},
      hasMore: false,
      loading: false,
      summaryLoading,
      summaryMap: new Map(summary ? [['synthetic', summary]] : []),
      consegneAperteMap: new Map(),
      anomalie: { ...emptyAnomalies, inCorso: anomalyPending },
      deleteEnabled: false,
      deletingId: null,
      onSelect: () => {},
      onDelete: () => {},
    }),
  );
}

test('import action is present at first render while status is unknown; no dialog is mounted', () => {
  const html = renderToStaticMarkup(createElement(AIImportStatus));
  assert.match(html, /<button[^>]*aria-busy="true"/);
  assert.match(html, /disabled=""/);
  assert.match(html, /Importa dimissione/);
  assert.doesNotMatch(html, /role="dialog"|Servizio AI…/);
});

test('pending summaries do not prevent patient selection or imply zero clinical signals', () => {
  const html = roster(true);
  assert.match(html, /Apri cartella di Esempio Collaudo/);
  assert.match(html, /Verifica in corso/);
  assert.doesNotMatch(html, /Nessuna segnalazione/);
});

test('failed or absent summary is explicitly unavailable rather than no signals', () => {
  const html = roster(false);
  assert.match(html, /Segnalazioni non disponibili/);
  assert.doesNotMatch(html, /Nessuna segnalazione/);
});

test('no signals requires both clinical summary and completed medication verification', () => {
  const summary = {
    patientId: 'synthetic',
    statoRicovero: 'ricoverato',
    hasCriticalVitals: false,
    hasHighRisk: false,
    allergieCount: 0,
    consegneAperte: 0,
  } as ClinicalSummaryEntry;
  assert.doesNotMatch(roster(false, summary, true), /Nessuna segnalazione/);
  assert.match(roster(false, summary), /Nessuna segnalazione/);
  assert.match(roster(false, { ...summary, hasCriticalVitals: true }), /Critico/);
});
