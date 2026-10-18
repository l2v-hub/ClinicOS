import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PatientIdentity } from '../../shared/PatientIdentity';
import { PatientRoster } from '../PatientRoster';
import { OperatorAgenda } from '../OperatorAgenda';
import { TherapySlotModal } from '../TherapySlotModal';
import type { Paziente, TherapySlot, TherapyVerificationGroup } from '../../../types';
import { localIsoDate } from '../../../lib/appointmentRange';
import type { AgendaTherapyVerificationFeed } from '../../shared/AgendaTherapyVerification';
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
      completionPatients: [patient],
      sort: { field: 'patient', direction: 'asc' },
      onSortChange: () => {},
      hasMore: true,
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
  assert.equal((html.match(/class="patient-list-incomplete"/g) ?? []).length, 1);
  assert.match(html, /<details class="patient-list-incomplete"><summary>1 pazienti/);
  assert.match(html, /tra 1 caricati, elenco parziale/);
  assert.match(html, /Completa anagrafica · Identity/);
  assert.ok(html.indexOf('patient-list-incomplete') > html.indexOf('patient-card-grid'));
  assert.doesNotMatch(html, /<details[^>]+open/);
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

test('agenda without appointments shows untimed prescriptions in read-only verification, never timed dose actions', () => {
  const date = localIsoDate(new Date());
  const scopeKey = 'synthetic-session:policy:roster';
  const verificationGroup: TherapyVerificationGroup = {
    kind: 'verification',
    id: 'therapy-verification',
    date,
    label: 'Da verificare',
    fascia: null,
    ora: null,
    summary: { total: 2, verification: 2 },
    patients: [
      {
        patientId: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        room: '',
        bed: '',
        items: ['Farmaco mattina', 'Farmaco sera'].map((drugName, index) => ({
          therapyId: `untimed-${index}`,
          drugName,
          status: 'to_verify' as const,
          reason: 'missing_time' as const,
          scheduledTime: null,
          quantityLabel: null,
          dosage: null,
          canAdminister: false as const,
        })),
      },
    ],
  };
  const accepted = { date, scopeKey };
  const feedFor = (
    patch: Partial<AgendaTherapyVerificationFeed> = {},
  ): AgendaTherapyVerificationFeed => ({
    groups: [verificationGroup],
    accepted,
    requested: accepted,
    scopeKey,
    allowed: true,
    loading: false,
    error: null,
    pageInfo: {
      hasMore: false,
      nextCursor: null,
      loadedTherapies: 2,
      completeness: 'complete',
      summaryExact: true,
    },
    loadingMore: false,
    loadMoreError: null,
    onLoad: async () => {},
    onLoadMore: () => {},
    ...patch,
  });

  setSessionCapabilities({ 'administration.list_slots': { allowed: true, effect: 'ALLOWED' } });
  try {
    const props = {
      operatoreId: 'op1',
      nomeOperatore: 'Operatore QA',
      operatori: [],
      appuntamenti: [],
      onAddAppuntamento: async () => null,
    };
    const html = renderToStaticMarkup(
      React.createElement(OperatorAgenda, { ...props, verificationFeed: feedFor() }),
    );
    const verification = html.match(
      /<section class="empty-state-card" aria-label="Terapie da verificare[^>]*>[\s\S]*?<\/section>/,
    )?.[0];
    assert.ok(verification, 'accepted untimed prescriptions have a named verification region');
    assert.match(html, /Nessun appuntamento in questa giornata/);
    assert.match(verification, /Da verificare · 2/);
    assert.match(verification, /Farmaco mattina/);
    assert.match(verification, /Farmaco sera/);
    assert.match(verification, /Nessuna nuova somministrazione disponibile/);
    assert.doesNotMatch(
      verification,
      /<button|Somministra|therapy-dose-list|ore 08:00|ore 20:00|Letto A|Stanza 1/,
    );
    assert.equal(verificationGroup.patients[0].room, '', 'unknown room stays unknown');
    assert.equal(verificationGroup.patients[0].bed, '', 'unknown bed stays unknown');
    assert.doesNotMatch(html, /class="agt-slot(?: |")|agt-free-slot|Crea appuntamento alle/);

    const staleDate = '2000-01-01';
    const stale = renderToStaticMarkup(
      React.createElement(OperatorAgenda, {
        ...props,
        verificationFeed: feedFor({
          accepted: { date: staleDate, scopeKey },
          requested: { date: staleDate, scopeKey },
        }),
      }),
    );
    assert.doesNotMatch(stale, /Farmaco mattina|Farmaco sera/);
    assert.match(stale, /Caricamento verifiche delle terapie/);

    const failed = renderToStaticMarkup(
      React.createElement(OperatorAgenda, {
        ...props,
        verificationFeed: feedFor({ error: 'Sorgente non disponibile' }),
      }),
    );
    assert.doesNotMatch(failed, /Farmaco mattina|Farmaco sera/);
    assert.match(failed, /Sorgente non disponibile|Riprova verifiche/);

    setSessionCapabilities({});
    const denied = renderToStaticMarkup(
      React.createElement(OperatorAgenda, {
        ...props,
        verificationFeed: feedFor({ allowed: false }),
      }),
    );
    assert.doesNotMatch(denied, /Farmaco mattina|Farmaco sera|Nessuna nuova somministrazione/);
    assert.match(denied, /Verifiche delle terapie non consultabili per il tuo ruolo/);
  } finally {
    setSessionCapabilities(null);
  }
});

test('slot modal retains pause, explicit absence, glucose protocol, completed history and other patients', () => {
  const dose = (name: string, extra = {}) => ({
    administrationId: null,
    therapyId: name,
    drugName: name,
    dosage: '1 mg',
    route: 'orale',
    scheduledTime: '08:00',
    status: 'pending',
    administeredAt: null,
    administeredBy: null,
    notAdministeredReason: null,
    ...extra,
  });
  const slot = {
    id: 'pause-test',
    ora: '08:00',
    fascia: 'mattina',
    label: 'Mattina',
    summary: { total: 4, pending: 3, administered: 1, notAdministered: 0 },
    patients: [
      {
        patientId: 'paused',
        firstName: 'Paused',
        lastName: 'Synthetic',
        temporaryPsExit: { exitId: 'exit1', decision: 'pause', departedAt: '2026-10-17T08:00:00Z' },
        administrations: [
          dose('Paused ordinary'),
          dose('Paused glucose', { doseMode: 'glucose_scale' }),
          dose('Recorded medicine', { status: 'administered', administeredBy: 'Actual nurse' }),
        ],
      },
      {
        patientId: 'other',
        firstName: 'Other',
        lastName: 'Synthetic',
        administrations: [dose('Other ordinary')],
      },
    ],
  } as TherapySlot;
  const html = renderToStaticMarkup(
    React.createElement(TherapySlotModal, {
      slot,
      date: '2026-10-17',
      onClose: () => {},
      onConfirm: () => {},
      onNotAdministered: () => {},
    }),
  );
  assert.match(html, /Somministrazioni in pausa per uscita PS/);
  assert.match(html, /<button[^>]+aria-label="Erogata:[^"]+Paused ordinary[^"]*"[^>]+disabled/);
  assert.match(html, /<fieldset disabled=""[^>]+aria-label="Somministrazione secondo glicemia:/);
  assert.match(html, /Visualizza schema prescritto/);
  assert.match(html, /<button[^>]+aria-label="Non erogata:[^"]+Paused ordinary[^"]*"[^>]*>/);
  assert.doesNotMatch(
    html,
    /<button[^>]+aria-label="Non erogata:[^"]+Paused ordinary[^"]*"[^>]+disabled/,
  );
  assert.doesNotMatch(
    html,
    /<button[^>]+aria-label="Erogata:[^"]+Other ordinary[^"]*"[^>]+disabled/,
  );
  assert.match(html, /Recorded medicine[\s\S]*Actual nurse/);
});
