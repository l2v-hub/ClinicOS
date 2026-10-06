// Giro terapia: conteggi e fascia iniziale dai totali del server; righe con le azioni del dialogo.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TherapyGiroRows } from '../TherapyGiroRows';
import { TherapyRoundsPage } from '../TherapyRoundsPage';
import { identityTherapySlot } from './operationalIdentity.fixtures';
import {
  administeredTime,
  giroTimes,
  initialGiroTime,
  initialSlotId,
  motivoLabel,
  slotDone,
  sortedSlots,
} from '../../../lib/therapyGiro';
import type { TherapySlot } from '../../../types';

Object.assign(globalThis, { React });
const render = (element: React.ReactElement) => renderToStaticMarkup(element);

function slot(id: string, ora: string, s: Partial<TherapySlot['summary']>): TherapySlot {
  const summary = { total: 0, administered: 0, notAdministered: 0, pending: 0, ...s };
  return { id, fascia: 'mattina', label: id, ora, summary, patients: [] };
}

test('done counts administered and not administered from exact server totals', () => {
  assert.equal(slotDone(slot('a', '08:00', { total: 7, administered: 1, notAdministered: 2 })), 3);
});

test('initial slot is the first by time with pending work, else the first of the day', () => {
  const slots = [
    slot('sera', '20:00', { total: 2, pending: 2 }),
    slot('mattina', '08:00', { total: 3, administered: 3 }),
    slot('pranzo', '12:00', { total: 3, pending: 1, administered: 2 }),
  ];
  assert.deepEqual(
    sortedSlots(slots).map((s) => s.ora),
    ['08:00', '12:00', '20:00'],
  );
  assert.equal(initialSlotId(slots), 'pranzo');
  assert.equal(initialSlotId([slot('x', '18:00', { total: 1, administered: 1 })]), 'x');
  assert.equal(initialSlotId([]), null);
});

test('reason labels map known codes and keep free text; time is facility time', () => {
  assert.equal(motivoLabel('paziente_assente'), 'Paziente assente');
  assert.equal(motivoLabel('testo libero'), 'testo libero');
  assert.equal(motivoLabel(null), null);
  assert.equal(administeredTime('2026-01-15T07:12:00Z'), '08:12');
  assert.equal(administeredTime('non-una-data'), null);
});

test('rows name patient, identifier and drug on every action; never the stale room fields', () => {
  const html = render(
    React.createElement(TherapyGiroRows, {
      time: giroTimes([identityTherapySlot])[0],
      date: '2026-09-23',
      filtro: 'tutte',
    }),
  );
  assert.doesNotMatch(html, /role="dialog"/);
  assert.match(html, />Somministra</);
  assert.match(html, />Non somm\.</);
  assert.match(
    html,
    /aria-label="Erogata: Rossi, Mario · CF RSSMRA80A01H501U · Farmaco sintetico · 1 mg"/,
  );
  assert.match(
    html,
    /aria-label="Non erogata: Rossi, Mario · Nato\/a il 15\/06\/1975 · CF da completare · Farmaco sintetico · 1 mg"/,
  );
  // l'ora è quella della fascia selezionata: il nome sulla prima riga, dose e via una volta sola
  // sulla seconda (UX 2026-10-03: niente dose duplicata), non l'ora
  assert.match(html, /class="giro-drug__name">Farmaco sintetico</);
  assert.match(html, /class="giro-drug__cap">1 mg · orale</);
  assert.doesNotMatch(html, /STALE-ROOM|STALE-BED|MRN-NEVER-RENDER/);
});

test('read-only rows offer no signing; done rows show time, operator and reason', () => {
  const readonly = render(
    React.createElement(TherapyGiroRows, {
      time: giroTimes([identityTherapySlot])[0],
      date: '2026-09-23',
      filtro: 'tutte',
      readOnly: true,
    }),
  );
  // giorno passato senza registrazione: lo stato lo dice in parole (UX 2026-10-03)
  assert.match(readonly, /Non registrata/);
  assert.doesNotMatch(readonly, /aria-label="(?:Erogata|Non erogata|Conferma non erogata):/);

  const [first, second] = identityTherapySlot.patients;
  const done: TherapySlot = {
    ...identityTherapySlot,
    patients: [
      {
        ...first,
        administrations: [
          {
            ...first.administrations[0],
            status: 'administered',
            administeredAt: '2026-09-23T06:12:00Z',
            administeredBy: 'L. Conti',
          },
        ],
      },
      {
        ...second,
        administrations: [
          {
            ...second.administrations[0],
            status: 'not_administered',
            notAdministeredReason: 'rifiutata_paziente',
          },
        ],
      },
    ],
  };
  const html = render(
    React.createElement(TherapyGiroRows, {
      time: giroTimes([done])[0],
      date: '2026-09-23',
      filtro: 'tutte',
    }),
  );
  assert.match(html, /08:12 · L\. Conti/);
  assert.match(html, /Non somm\. · Rifiutata dal paziente/);
  assert.doesNotMatch(html, />Somministra</);

  const onlyPending = render(
    React.createElement(TherapyGiroRows, {
      time: giroTimes([done])[0],
      date: '2026-09-23',
      filtro: 'pending',
    }),
  );
  assert.match(onlyPending, /Nessuna somministrazione con questo stato/);
});

test('page shows the round by real time: only hours with administrations, counts from them', () => {
  const html = render(
    React.createElement(TherapyRoundsPage, {
      slots: [
        {
          ...identityTherapySlot,
          summary: { total: 7, administered: 1, notAdministered: 0, pending: 6 },
        },
        slot('pranzo', '12:00', { total: 3, pending: 3 }),
      ],
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
      onLoad() {},
      onLoadMore() {},
      onConfirm() {},
      onNotAdministered() {},
      calendarState: {
        mode: 'giro',
        date: '2026-09-23',
        weekOf: '2026-09-23',
        open: null,
        scrollTop: 0,
      },
    }),
  );
  assert.match(html, /Giro terapia/);
  // 09:00 ha due somministrazioni caricate (da erogare); le 12:00 non hanno farmaci: non compaiono
  assert.match(html, /09:00 · 0\/2/);
  assert.doesNotMatch(html, /12:00 ·/);
  assert.match(html, /aria-valuenow="0"/);
  assert.match(html, /class="giro-patient"/);
  assert.match(html, /aria-label="Erogata: Rossi, Mario/);
});

test('calendar is the main view; directed dose requests retain loading and retry feedback', () => {
  const props = {
    slots: [],
    loading: true,
    error: null,
    pageInfo: {
      hasMore: false,
      nextCursor: null,
      loadedTherapies: 0,
      completeness: 'complete' as const,
      summaryExact: true,
    },
    loadingMore: false,
    loadMoreError: null,
    onLoad() {},
    onLoadMore() {},
    onConfirm() {},
    onNotAdministered() {},
  };
  const calendar = render(React.createElement(TherapyRoundsPage, props));
  assert.match(calendar, /Calendario terapie/);
  assert.match(calendar, /aria-label="Calendario della settimana"/);
  assert.doesNotMatch(calendar, /class="giro-bar"/);
  const directed = { ...props, entry: { requestId: 1, time: '08:00', date: '2026-10-06' } };
  assert.match(render(React.createElement(TherapyRoundsPage, directed)), /Caricamento terapie/);
  const failed = render(
    React.createElement(TherapyRoundsPage, {
      ...directed,
      loading: false,
      error: 'Lettura non disponibile',
    }),
  );
  assert.match(failed, /role="alert".*Lettura non disponibile.*Riprova/s);
  assert.doesNotMatch(failed, /aria-label="Calendario della settimana"/);
});

const adm = (
  therapyId: string,
  scheduledTime: string,
  status: 'pending' | 'administered' = 'pending',
) => ({
  administrationId: null,
  therapyId,
  drugName: `Farmaco ${therapyId}`,
  dosage: '1 mg',
  route: 'orale',
  scheduledTime,
  status,
  administeredAt: null,
  administeredBy: null,
  notAdministeredReason: null,
});

test('the round is by real prescription time and by patient, whatever the server band', () => {
  const [p1, p2] = identityTherapySlot.patients;
  const mattina: TherapySlot = {
    ...slot('mattina', '07:00', { total: 3 }),
    fascia: 'mattina',
    patients: [
      { ...p1, administrations: [adm('a', '07:00'), adm('b', '08:00', 'administered')] },
      { ...p2, administrations: [adm('c', '07:00')] },
    ],
  };
  const sera: TherapySlot = {
    ...slot('sera', '18:00', { total: 2 }),
    fascia: 'sera',
    patients: [{ ...p1, administrations: [adm('d', '18:00'), adm('e', '20:00')] }],
  };
  const times = giroTimes([sera, mattina]);
  assert.deepEqual(
    times.map((t) => t.ora),
    ['07:00', '08:00', '18:00', '20:00'],
  );
  // 07:00: due pazienti, nell'ordine del giro; ogni farmaco porta la fascia del server
  assert.deepEqual(
    times[0].patients.map((g) => [
      g.patient.patientId,
      g.items.map((i) => [i.a.therapyId, i.fascia]),
    ]),
    [
      [p1.patientId, [['a', 'mattina']]],
      [p2.patientId, [['c', 'mattina']]],
    ],
  );
  assert.equal(times[2].patients[0].items[0].fascia, 'sera');
  assert.deepEqual([times[1].total, times[1].administered, times[1].pending], [1, 1, 0]);
  // ora iniziale: la prima con farmaci da fare
  assert.equal(initialGiroTime(times), '07:00');
  assert.equal(initialGiroTime([times[1]]), '08:00');
  assert.equal(initialGiroTime([]), null);
});

test('one group per patient with all its drugs of that hour; the action sends the server band', () => {
  const [p1] = identityTherapySlot.patients;
  const mattina: TherapySlot = {
    ...slot('mattina', '08:00', { total: 2 }),
    patients: [{ ...p1, administrations: [adm('a', '08:00'), adm('b', '08:00')] }],
  };
  const html = render(
    React.createElement(TherapyGiroRows, {
      time: giroTimes([mattina])[0],
      date: '2026-09-23',
      filtro: 'tutte',
    }),
  );
  assert.equal(html.match(/class="giro-patient"/g)?.length, 1);
  assert.equal(html.match(/class="giro-drug"/g)?.length, 2);
  assert.match(html, /Farmaco a 1 mg/);
  assert.match(html, /Farmaco b 1 mg/);
});
