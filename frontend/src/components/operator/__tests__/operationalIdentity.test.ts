import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PatientIdentity } from '../../shared/PatientIdentity';
import { PatientCombobox } from '../../shared/PatientCombobox';
import { ParameterEntryRow } from '../ParameterEntryRow';
import { TherapySlotModal } from '../TherapySlotModal';
import { ConsegnePage } from '../ConsegnePage';
import {
  identityPatient,
  identityHomonym,
  identityHandover,
  identityTherapySlot,
} from './operationalIdentity.fixtures';
import type { Consegna } from '../../../types';
import { facilityLocalMinute } from '../../../lib/facilityTime';

Object.assign(globalThis, { React });
const render = (element: React.ReactElement) => renderToStaticMarkup(element);

test('shared identity distinguishes homonyms, wraps untrusted text, and omits internal identifiers', () => {
  const html = render(
    React.createElement(
      'div',
      {},
      React.createElement(PatientIdentity, { patient: identityPatient }),
      React.createElement(PatientIdentity, { patient: identityHomonym }),
      React.createElement(PatientIdentity, {
        patient: { ...identityPatient, firstName: '<script>alert(1)</script>'.repeat(5) },
      }),
    ),
  );
  assert.match(html, /RSSMRA80A01H501U/);
  assert.match(html, /15\/06\/1975/);
  assert.match(html, /Dalla cartella/);
  assert.match(html, /Letto non indicato/);
  assert.match(html, /CF da completare/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|MRN-NEVER-RENDER|Scheda|undefined|NaN/);
});

test('location shows its date only outside today in Rome while retaining legacy provenance', () => {
  const today = facilityLocalMinute().slice(0, 10);
  const current = render(
    React.createElement(PatientIdentity, {
      patient: { ...identityHomonym, location: { ...identityHomonym.location!, asOf: today } },
    }),
  );
  assert.match(current, /Dalla cartella/);
  assert.doesNotMatch(current, /<time/);
  const historical = render(
    React.createElement(PatientIdentity, {
      patient: {
        ...identityPatient,
        location: { ...identityPatient.location!, asOf: '2020-01-15' },
      },
    }),
  );
  assert.match(historical, /<time dateTime="2020-01-15">15\/01\/2020<\/time>/);
});

test('loading and unavailable never display retained location labels', () => {
  const loading = render(
    React.createElement(PatientIdentity, { patient: identityPatient, locationLoading: true }),
  );
  assert.match(loading, /Caricamento posto letto/);
  assert.doesNotMatch(loading, /Camera 201|Letto B|dateTime=/);
  const unavailable = render(
    React.createElement(PatientIdentity, {
      patient: {
        ...identityPatient,
        location: { ...identityPatient.location!, status: 'unavailable' },
      },
    }),
  );
  assert.match(unavailable, /Posto letto non disponibile/);
  assert.doesNotMatch(unavailable, /Camera 201|Letto B|non assegnato/);
});

test('parameter identity is available while clinical summary counts remain pending', () => {
  const html = render(
    React.createElement(ParameterEntryRow, {
      patient: identityPatient,
      summaryPending: true,
      onOpenHistory() {},
      async onSave() {
        throw new Error('render must not save');
      },
    }),
  );
  assert.match(html, /RSSMRA80A01H501U/);
  assert.match(html, /Camera 201/);
  assert.match(html, /Verifica note in corso/);
  assert.doesNotMatch(html, /Caricamento camera|MRN-NEVER-RENDER/);
});

function handover(identity: Consegna['identity']) {
  return render(
    React.createElement(ConsegnePage, {
      consegne: [{ ...identityHandover, identity }],
      summary: { open: 1, urgentOpen: 0, total: 1, inProgress: 0, completed: 0 },
      operatori: [],
      operatoreId: 'unrelated',
      isAdmin: false,
      onAdd: async () => ({ kind: 'failed', code: 'synthetic', uncertain: false, message: 'Non salvata' }),
      onUpdate() {},
      onUpdateStato() {},
      onDelete() {},
      loading: false,
      loadError: null,
      hasMore: false,
      onQueryChange() {},
      onLoadMore() {},
      onRetry() {},
      onSelectPaziente() {
        throw new Error('render must not open chart');
      },
    }),
  );
}
test('handover null, missing, malformed or mismatched identity has no chart-opening action', () => {
  for (const identity of [
    null,
    undefined,
    { ...identityPatient, id: 'other-id' },
    { ...identityPatient, location: null },
  ]) {
    const html = handover(identity);
    assert.match(html, /Mario Rossi/);
    assert.doesNotMatch(html, /Apri cartella|RSSMRA80A01H501U|Camera 201|Anagrafica da completare/);
  }
  const html = handover(identityPatient);
  assert.match(html, /aria-label="Apri cartella di Rossi, Mario"/);
  assert.match(html, /RSSMRA80A01H501U/);
});

test('therapy action names identify both homonyms and drug while readOnly offers no signing', () => {
  const html = render(
    React.createElement(TherapySlotModal, {
      slot: identityTherapySlot,
      date: '2026-09-23',
      onClose() {},
    }),
  );
  assert.match(html, /role="dialog"/);
  assert.match(
    html,
    /aria-label="Erogata: Rossi, Mario · CF RSSMRA80A01H501U · Farmaco sintetico · 1 mg"/,
  );
  assert.match(
    html,
    /aria-label="Non erogata: Rossi, Mario · Nato\/a il 15\/06\/1975 · CF da completare · Farmaco sintetico · 1 mg"/,
  );
  assert.doesNotMatch(html, /STALE-ROOM|STALE-BED|MRN-NEVER-RENDER/);
  const readonly = render(
    React.createElement(TherapySlotModal, {
      slot: identityTherapySlot,
      date: '2026-09-23',
      onClose() {},
      readOnly: true,
    }),
  );
  assert.match(readonly, /Da erogare/);
  assert.doesNotMatch(readonly, /aria-label="(?:Erogata|Non erogata|Conferma non erogata):/);
});

test('combobox selected patient uses shared identity without internal record number', () => {
  const html = render(
    React.createElement(PatientCombobox, {
      inputId: 'synthetic-picker',
      label: 'Paziente',
      selected: identityHomonym,
      onChange() {},
    }),
  );
  assert.match(html, /role="combobox"/);
  assert.match(html, /15\/06\/1975/);
  assert.match(html, /Letto non indicato/);
  assert.doesNotMatch(html, /MRN-NEVER-RENDER|Scheda/);
});

test('identity presentation adds no fetch and parameter drafts retain stable patient keys', () => {
  const shared = readFileSync(new URL('../../shared/PatientIdentity.tsx', import.meta.url), 'utf8');
  const row = readFileSync(new URL('../ParameterEntryRow.tsx', import.meta.url), 'utf8');
  const workspace = readFileSync(new URL('../MultiPatientParametri.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(shared, /\bfetch\(|useEffect\(|localStorage|sessionStorage/);
  assert.doesNotMatch(row, /\bfetch\(|useEffect\(|room\?|bed\?|summaryUnavailable/);
  assert.match(workspace, /key=\{item.patient.id\}/);
});
