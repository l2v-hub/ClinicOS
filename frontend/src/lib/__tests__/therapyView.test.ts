// UX cycle 2 — W5: the patient's Terapia section has three views (Calendario, Storico, Nuova
// terapia). Landing of new and cycle-1 targets, URL persistence of the view (QA F2), Storico filters.
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  doseTimeOf,
  filterHistory,
  historyDrugNames,
  periodDays,
  periodStart,
  therapyLanding,
  therapySubViewOf,
  type HistoryRow,
} from '../therapyView';
import {
  parsePatientTargetHash,
  patientTargetHash,
  rememberTherapyView,
} from '../patientTargetHash';

const originalWindow = (globalThis as { window?: unknown }).window;
afterEach(() => {
  (globalThis as { window?: unknown }).window = originalWindow;
});

test('cycle-1 sub-views land on the new views (backward-compatible links)', () => {
  assert.deepEqual(therapyLanding('attivi', { hasDrug: true }), {
    view: 'calendario',
    openDrug: true,
    openDose: false,
  });
  assert.equal(therapyLanding('programmazione', { hasDrug: true }).openDrug, true);
  assert.deepEqual(therapyLanding('giornaliere'), {
    view: 'calendario',
    openDrug: false,
    openDose: true,
  });
  assert.equal(therapyLanding('calendario').openDose, true);
  assert.deepEqual(therapyLanding('storico'), {
    view: 'storico',
    historyStatus: 'tutte',
    openDrug: false,
    openDose: false,
  });
  assert.equal(therapyLanding('sospese').historyStatus, 'sospese');
  // No sub-view: Calendario (the default), drug opened when one is named.
  assert.equal(therapyLanding(undefined).view, 'calendario');
  assert.equal(therapyLanding(undefined, { hasDrug: true }).openDrug, true);
});

test('an inactive drug lands in Storico › sospese; Nuova only with therapy.create', () => {
  for (const subView of ['attivi', 'giornaliere', 'calendario', undefined] as const) {
    const landing = therapyLanding(subView, { drugState: 'sospesa', hasDrug: true });
    assert.equal(landing.view, 'storico', String(subView));
    assert.equal(landing.historyStatus, 'sospese');
    assert.equal(landing.openDrug, true);
  }
  assert.equal(therapyLanding('nuova', { canCreate: true }).view, 'nuova');
  assert.equal(therapyLanding('nuova', { canCreate: false }).view, 'calendario');
});

test('the URL remembers the view; Storico on «sospese» keeps its filter', () => {
  assert.equal(therapySubViewOf('calendario'), 'calendario');
  assert.equal(therapySubViewOf('storico', 'tutte'), 'storico');
  assert.equal(therapySubViewOf('storico', 'sospese'), 'sospese');
  assert.equal(therapySubViewOf('nuova'), 'nuova');
  for (const subView of ['calendario', 'storico', 'nuova', 'sospese', 'giornaliere'] as const) {
    const target = { patientId: 'p1', tab: 'terapia-farmacologica' as const, therapy: { subView } };
    assert.deepEqual(parsePatientTargetHash(patientTargetHash(target)), target);
  }
});

test('rememberTherapyView replaces the current entry (hash + history.state) of this chart only', () => {
  const calls: { state: Record<string, unknown>; url: string }[] = [];
  const fakeWindow = {
    location: { hash: '#/dettaglio-paziente/p1/terapia-farmacologica' },
    history: {
      state: { navKey: 'dettaglio-paziente', pazienteId: 'p1', prevLabel: 'Turno' },
      replaceState(state: Record<string, unknown>, _title: string, url: string) {
        calls.push({ state, url });
        fakeWindow.location.hash = url;
        fakeWindow.history.state = state as never;
      },
    },
  };
  (globalThis as { window?: unknown }).window = fakeWindow;
  rememberTherapyView('p1', 'storico');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '#/dettaglio-paziente/p1/terapia-farmacologica?sv=storico');
  assert.deepEqual(calls[0].state, {
    navKey: 'dettaglio-paziente',
    pazienteId: 'p1',
    prevLabel: 'Turno',
    patientTab: 'terapia-farmacologica',
    patientTarget: { therapy: { subView: 'storico' } },
  });
  // Same view again: no new write. Another patient's chart: untouched.
  rememberTherapyView('p1', 'storico');
  rememberTherapyView('p2', 'calendario');
  assert.equal(calls.length, 1);
  // A deep link with drug/day is replaced by the plain view chosen by the operator.
  fakeWindow.location.hash =
    '#/dettaglio-paziente/p1/terapia-farmacologica?sv=calendario&t=t1&d=2026-10-03&f=mattina';
  rememberTherapyView('p1', 'sospese');
  assert.equal(calls.at(-1)?.url, '#/dettaglio-paziente/p1/terapia-farmacologica?sv=sospese');
});

test('band → real prescription time (07:00 stays 07:00), else the rounds time', () => {
  assert.equal(doseTimeOf('08:30'), '08:30');
  assert.equal(doseTimeOf('mattina', [{ fascia: 'mattina', time: '07:00' }]), '07:00');
  assert.equal(doseTimeOf('sera'), '20:00');
  assert.equal(doseTimeOf(undefined), undefined);
});

const row = (patch: Partial<HistoryRow>): HistoryRow => ({
  id: Math.random().toString(36),
  kind: 'scheduled',
  therapyId: 't1',
  date: '2026-10-03',
  time: '08:00',
  drugName: 'Metformina',
  dose: '1 compressa',
  route: 'orale',
  status: 'erogata',
  operator: 'Infermiere 1',
  detail: null,
  ...patch,
});

test('Storico filters: period, drug, status (given / not given / al bisogno), newest first', () => {
  const today = '2026-10-03';
  const rows = [
    row({ id: 'a', date: '2026-10-03', time: '08:00' }),
    row({ id: 'b', date: '2026-10-03', time: '20:00', status: 'non_erogata', detail: 'Rifiuto' }),
    row({ id: 'c', date: '2026-09-30', drugName: 'Ramipril' }),
    row({ id: 'd', date: '2026-09-01' }),
    row({ id: 'e', kind: 'prn', date: '2026-10-02', time: '15:12', status: 'al_bisogno' }),
  ];
  const ids = (list: HistoryRow[]) => list.map((r) => r.id);
  assert.deepEqual(ids(filterHistory(rows, { period: 'oggi', drug: '', status: 'tutte' }, today)), [
    'b',
    'a',
  ]);
  assert.deepEqual(ids(filterHistory(rows, { period: '7', drug: '', status: 'tutte' }, today)), [
    'b',
    'a',
    'e',
    'c',
  ]);
  assert.deepEqual(
    ids(filterHistory(rows, { period: 'tutto', drug: '', status: 'tutte' }, today)),
    ['b', 'a', 'e', 'c', 'd'],
  );
  assert.deepEqual(
    ids(filterHistory(rows, { period: 'tutto', drug: 'ramipril', status: 'tutte' }, today)),
    ['c'],
  );
  assert.deepEqual(
    ids(filterHistory(rows, { period: 'tutto', drug: '', status: 'non_erogata' }, today)),
    ['b'],
  );
  assert.deepEqual(ids(filterHistory(rows, { period: 'tutto', drug: '', status: 'prn' }, today)), [
    'e',
  ]);
  assert.deepEqual(historyDrugNames(['Ramipril', 'metformina', 'Metformina ', 'Aspirina']), [
    'Aspirina',
    'metformina',
    'Ramipril',
  ]);
});

test('PRN doses are read per day only for short periods (bounded reads)', () => {
  assert.equal(periodStart('7', '2026-10-03'), '2026-09-27');
  assert.equal(periodStart('tutto', '2026-10-03'), null);
  assert.deepEqual(periodDays('oggi', '2026-10-03'), ['2026-10-03']);
  assert.equal(periodDays('7', '2026-10-03')?.length, 7);
  assert.equal(periodDays('7', '2026-10-03')?.at(-1), '2026-09-27');
  assert.equal(periodDays('30', '2026-10-03'), null);
  assert.equal(periodDays('tutto', '2026-10-03'), null);
});
