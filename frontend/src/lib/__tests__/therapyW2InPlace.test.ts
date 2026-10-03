// UX cycle 2026-10-03 — W2 therapy: information without clicks + administration in place + PRN +
// supervisor confirmation. Pure helpers, request bodies, static render and source contracts.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { afterEach, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PatientTherapyAPI, TherapySlot } from '../../types';
import { doseStatus, lateMinutes, slotDoses } from '../therapyDoseStatus';
import {
  administrationBody,
  prnBody,
  recordPrnAdministration,
} from '../therapyAdministrationWrite';
import {
  buildPatientTherapyDay,
  calendarDoseStates,
  formatEndDate,
} from '../patientTherapyCalendar';
import { giroTimes, patientDrugTimes } from '../therapyGiro';
import { requiresConfirmation } from '../capabilities';
import { TherapyGiroRows } from '../../components/operator/TherapyGiroRows';
import { TherapyDoseList } from '../../components/shared/TherapyDoseList';

Object.assign(globalThis, { React });
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const src = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

// 2026-10-03 10:30 in Rome (CEST, UTC+2) = 08:30Z
const NOW = new Date('2026-10-03T08:30:00Z');
const TODAY = '2026-10-03';

function admin(patch: Record<string, unknown> = {}) {
  return {
    administrationId: null,
    therapyId: 't1',
    drugName: 'Metformina',
    dosage: '1 compressa — 500 mg',
    quantityLabel: '1 compressa — 500 mg',
    route: 'orale',
    scheduledTime: '08:00',
    status: 'pending' as const,
    administeredAt: null,
    administeredBy: null,
    notAdministeredReason: null,
    ...patch,
  };
}

const slot = (patients: TherapySlot['patients'], fascia: TherapySlot['fascia'] = 'mattina') =>
  ({
    id: `ts-${fascia}`,
    fascia,
    label: 'Terapia Mattina',
    ora: '08:00',
    summary: { total: 0, administered: 0, notAdministered: 0, pending: 0 },
    patients,
  }) as TherapySlot;

const patient = (patientId: string, lastName: string, administrations: unknown[]) =>
  ({
    patientId,
    firstName: 'Anna',
    lastName,
    codiceFiscale: null,
    dateOfBirth: null,
    location: { status: 'assigned', room: '12', bed: 'A' },
    room: '12',
    bed: 'A',
    administrations,
  }) as unknown as TherapySlot['patients'][number];

test('dose status in words: pending, late N min (facility time), administered, not given', () => {
  assert.equal(lateMinutes(TODAY, '08:00', NOW), 150);
  assert.equal(lateMinutes(TODAY, '20:00', NOW), null);
  assert.equal(lateMinutes('2026-10-04', '08:00', NOW), null);
  assert.deepEqual(doseStatus(admin(), TODAY, NOW), {
    tone: 'late',
    text: 'In ritardo di 150 min',
    lateMinutes: 150,
  });
  assert.equal(doseStatus(admin({ scheduledTime: '20:00' }), TODAY, NOW).text, 'Da somministrare');
  assert.equal(doseStatus(admin(), '2026-10-04', NOW).tone, 'future');
  assert.equal(doseStatus(admin(), '2026-10-01', NOW).text, 'Non registrata');
  const done = doseStatus(
    admin({
      status: 'administered',
      administeredAt: '2026-10-03T06:12:00Z',
      administeredBy: 'Rossi',
    }),
    TODAY,
    NOW,
  );
  assert.equal(done.text, 'Somministrata 08:12 da Rossi');
  assert.equal(done.tone, 'done');
  assert.equal(
    doseStatus(
      admin({ status: 'not_administered', notAdministeredReason: 'rifiutata_paziente' }),
      TODAY,
      NOW,
    ).text,
    'Non somministrata · Rifiutata dal paziente',
  );
});

test('ward cell lists every dose (patient · drug · dose · status), late first, no "+N"', () => {
  const doses = slotDoses(
    slot([
      patient('p1', 'Bianchi', [
        admin({ therapyId: 'a', drugName: 'Ramipril', status: 'administered' }),
        admin({ therapyId: 'b', drugName: 'Furosemide', scheduledTime: '20:00' }),
      ]),
      patient('p2', 'Nanni', [admin({ therapyId: 'c', drugName: 'Metformina' })]),
    ]),
    TODAY,
    NOW,
  );
  assert.deepEqual(
    doses.map((d) => `${d.patientName}|${d.drugName}|${d.status.text}`),
    [
      'Nanni, Anna|Metformina|In ritardo di 150 min',
      'Bianchi, Anna|Furosemide|Da somministrare',
      'Bianchi, Anna|Ramipril|Somministrata',
    ],
  );
  const html = renderToStaticMarkup(React.createElement(TherapyDoseList, { doses }));
  assert.match(html, /Nanni, Anna/);
  assert.match(html, /Metformina · 1 compressa — 500 mg/);
  assert.match(html, /In ritardo di 150 min/);
  assert.doesNotMatch(html, /\+\d/);
});

test('write bodies carry only the slot key / PRN key — never a client dose, drug or time', () => {
  const body = administrationBody(
    { patientId: 'p', therapyId: 't', date: TODAY, fascia: 'mattina' },
    { kind: 'not_administered', motivo: 'altro', note: 'vomito' },
    { confirmed: true },
  );
  assert.deepEqual(body, {
    patientId: 'p',
    therapyId: 't',
    date: TODAY,
    fascia: 'mattina',
    motivo: 'altro',
    note: 'vomito',
    confirmed: true,
  });
  const plain = administrationBody(
    { patientId: 'p', therapyId: 't', date: TODAY, fascia: 'sera' },
    { kind: 'administered' },
  );
  assert.deepEqual(Object.keys(plain).sort(), ['date', 'fascia', 'patientId', 'therapyId']);
  const prn = prnBody({
    patientId: 'p',
    therapyId: 't',
    indicazione: 'Dolore 6/10',
    note: ' ',
    requestId: 'req-12345678',
  });
  assert.deepEqual(prn, {
    patientId: 'p',
    therapyId: 't',
    indicazione: 'Dolore 6/10',
    requestId: 'req-12345678',
  });
});

test('PRN write shows the server message on refusal', async () => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        error:
          'Il tuo ruolo richiede una conferma esplicita prima di registrare la somministrazione',
        code: 'confirmation_required',
      }),
      { status: 428 },
    )) as typeof fetch;
  const result = await recordPrnAdministration({
    patientId: 'p',
    therapyId: 't',
    indicazione: 'Febbre',
    requestId: 'req-12345678',
  });
  assert.deepEqual(result, {
    ok: false,
    message: 'Il tuo ruolo richiede una conferma esplicita prima di registrare la somministrazione',
  });
});

test('supervisor confirmation is read from the capability map', () => {
  const caps = {
    'administration.confirm': {
      effect: 'ALLOWED_WITH_CONFIRMATION' as const,
      allowed: true,
      requiresConfirmation: true,
    },
  };
  assert.equal(requiresConfirmation(caps, 'administration.confirm'), true);
  assert.equal(requiresConfirmation(caps, 'therapy.update'), false);
  assert.equal(requiresConfirmation(null, 'administration.confirm'), false);
});

function therapy(patch: Partial<PatientTherapyAPI> = {}): PatientTherapyAPI {
  return {
    id: 't1',
    patientId: 'p1',
    farmacoNome: 'Metformina',
    dosaggio: '500 mg compressa',
    viaSomministrazione: 'orale',
    tipo: 'periodica',
    stato: 'attiva',
    dataInizio: '2026-01-01',
    dataFine: '2026-10-10',
    fasceMattina: true,
    fascePranzo: false,
    fascePomeriggio: false,
    fasceSera: false,
    fasceNotte: false,
    orarioSpecifico: null,
    prescrittore: 'Dr. Verdi',
    operatoreInseritore: null,
    note: 'Dopo colazione',
    dataSomministrazione: null,
    orarioSomministrazione: null,
    commercialStrengthValue: 500,
    commercialStrengthUnit: 'mg',
    schedules: [
      {
        id: 's1',
        therapyId: 't1',
        time: '08:00',
        fascia: 'mattina',
        quantityNumerator: 1,
        quantityDenominator: 1,
        administrationUnit: 'compressa',
      },
    ],
    ...patch,
  } as PatientTherapyAPI;
}

test('patient calendar event carries strength, prescriber, note, end date and its status', () => {
  const day = buildPatientTherapyDay([therapy()], 'p1', TODAY);
  const [event] = day.events;
  assert.equal(event.dose, '1 compressa');
  assert.equal(event.strength, '500 mg');
  assert.equal(event.prescriber, 'Dr. Verdi');
  assert.equal(event.note, 'Dopo colazione');
  assert.equal(formatEndDate(event.endDate), 'fino al 10/10');
  const states = calendarDoseStates(
    [slot([patient('p1', 'Nanni', [admin()]), patient('p2', 'Altro', [admin()])])],
    'p1',
  );
  const state = states.get(event.therapyId, event.time);
  assert.equal(state?.fascia, 'mattina');
  assert.equal(doseStatus(state!.administration, TODAY, NOW).text, 'In ritardo di 150 min');
  assert.equal(states.get('missing', '08:00'), null);
});

test('drug panel takes every dose of one drug of one patient, by real time', () => {
  const slots = [
    slot([
      patient('p1', 'Nanni', [admin(), admin({ therapyId: 't2', drugName: 'Ramipril' })]),
      patient('p2', 'Altro', [admin()]),
    ]),
    slot([patient('p1', 'Nanni', [admin({ scheduledTime: '20:00' })])], 'sera'),
  ];
  const times = patientDrugTimes(slots, 'p1', 't1');
  assert.deepEqual(
    times.map((t) => [t.ora, t.patients.length, t.patients[0].items.map((i) => i.a.therapyId)]),
    [
      ['08:00', 1, ['t1']],
      ['20:00', 1, ['t1']],
    ],
  );
  assert.equal(times[1].patients[0].items[0].fascia, 'sera');
});

test('giro rows: late pending dose shows «In ritardo di N min» next to the actions', () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  // A dose two hours ago today (facility time) — skip around midnight where it would be yesterday.
  const local = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const part = (t: string) => Number(local.find((p) => p.type === t)?.value);
  if (part('hour') < 3) return;
  const today = `${part('year')}-${pad(part('month'))}-${pad(part('day'))}`;
  const time = `${pad(part('hour') - 2)}:${pad(part('minute'))}`;
  const html = renderToStaticMarkup(
    React.createElement(TherapyGiroRows, {
      time: giroTimes([slot([patient('p1', 'Nanni', [admin({ scheduledTime: time })])])])[0],
      date: today,
      filtro: 'tutte',
      hidePatientHead: true,
      requiresConfirmation: true,
    }),
  );
  assert.match(html, /giro-badge--late">In ritardo di 12\d min</);
  assert.match(html, />Somministra</);
  assert.doesNotMatch(html, /giro-patient__head/, 'patient head hidden inside the chart');
  assert.doesNotMatch(html, /role="alertdialog"/, 'the confirmation opens only on tap');
});

test('therapy tab: role-based actions, drug tap panel, direct-access prop (source contract)', async () => {
  const tab = await src('../../components/operator/cartella/TerapiaFarmacologicaTab.tsx');
  assert.match(tab, /therapyTarget\?: TherapyTarget & \{ requestId: number \}/);
  assert.match(tab, /useCan\('therapy\.update'\)/);
  assert.match(tab, /useCan\('therapy\.delete'\)/);
  assert.match(tab, /\{canUpdateTherapy && \(\s*<button[\s\S]{0,120}title="Modifica"/);
  assert.match(tab, /\{canDeleteTherapy && \(\s*<button[\s\S]{0,140}title="Elimina"/);
  assert.match(tab, /canUpdateTherapy && \(\s*<button[\s\S]{0,80}title="Riattiva"/);
  assert.match(tab, /renderExpandedRow=\{renderDrugPanel\}/);
  assert.match(tab, /Somministra ora/);
  const panel = await src('../../components/operator/cartella/TherapyDrugDosePanel.tsx');
  assert.match(panel, /Somministra al bisogno/);
  assert.match(panel, /useRequiresConfirmation\('administration\.confirm'\)/);
  assert.match(panel, /<ConfirmDialog/);
  assert.match(panel, /createSubmissionKey/);
  const rounds = await src('../../components/operator/TherapyRoundsPage.tsx');
  assert.match(rounds, /recordAdministration\(info, outcome, \{ confirmed: true \}\)/);
});

test('direct access: therapyTarget selects the sub-view and the day on the first render', async () => {
  globalThis.fetch = (async () => new Response('{}', { status: 503 })) as typeof fetch;
  const { TerapiaFarmacologicaTab } =
    await import('../../components/operator/cartella/TerapiaFarmacologicaTab');
  const paziente = { id: 'p1', nome: 'Anna', cognome: 'Nanni' } as never;
  const daily = renderToStaticMarkup(
    React.createElement(TerapiaFarmacologicaTab, {
      paziente,
      operatoreNome: 'Infermiere 1',
      therapyTarget: { subView: 'giornaliere', date: '2026-10-01', requestId: 1 },
    }),
  );
  assert.match(daily, /value="2026-10-01"/);
  assert.match(daily, /Vai al calendario/);
  const calendar = renderToStaticMarkup(
    React.createElement(TerapiaFarmacologicaTab, {
      paziente,
      operatoreNome: 'Infermiere 1',
      therapyTarget: { subView: 'calendario', date: '2026-10-02', fascia: 'sera', requestId: 2 },
    }),
  );
  assert.match(calendar, /Calendario terapie del paziente/);
  assert.match(calendar, /value="2026-10-02"/);
});

test('ward giro entry: opens the requested hour/band with filter and focused patient', async () => {
  const { TherapyRoundsPage } = await import('../../components/operator/TherapyRoundsPage');
  const slots = [
    slot([patient('p1', 'Nanni', [admin()]), patient('p2', 'Bianchi', [admin()])]),
    slot([patient('p2', 'Bianchi', [admin({ scheduledTime: '20:00' })])], 'sera'),
  ];
  const html = renderToStaticMarkup(
    React.createElement(TherapyRoundsPage, {
      date: '2026-10-03',
      slots,
      loading: false,
      error: null,
      pageInfo: { hasMore: false, nextCursor: null, loadedTherapies: 3 } as never,
      loadingMore: false,
      loadMoreError: null,
      onLoad: () => {},
      onLoadMore: () => {},
      onConfirm: () => {},
      onNotAdministered: () => {},
      entry: { requestId: 1, time: 'sera', filter: 'pending', patientId: 'p2' },
    }),
  );
  assert.match(html, /aria-pressed="true" aria-label="Ore 20:00/);
  assert.match(html, /data-therapy-focus=""/);
  assert.match(html, /class="giro-patient therapy-list-row--focus"/);
});
