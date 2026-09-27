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
      slot: identityTherapySlot,
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
  assert.match(html, /orale · 09:00/);
  assert.doesNotMatch(html, /STALE-ROOM|STALE-BED|MRN-NEVER-RENDER/);
});

test('read-only rows offer no signing; done rows show time, operator and reason', () => {
  const readonly = render(
    React.createElement(TherapyGiroRows, {
      slot: identityTherapySlot,
      date: '2026-09-23',
      filtro: 'tutte',
      readOnly: true,
    }),
  );
  assert.match(readonly, /Da erogare/);
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
    React.createElement(TherapyGiroRows, { slot: done, date: '2026-09-23', filtro: 'tutte' }),
  );
  assert.match(html, /08:12 · L\. Conti/);
  assert.match(html, /Non somm\. · Rifiutata dal paziente/);
  assert.doesNotMatch(html, />Somministra</);

  const onlyPending = render(
    React.createElement(TherapyGiroRows, { slot: done, date: '2026-09-23', filtro: 'pending' }),
  );
  assert.match(onlyPending, /Nessuna somministrazione con questo stato/);
});

test('page shows the round inline with slot chips and exact progress', () => {
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
    }),
  );
  assert.match(html, /Giro terapia/);
  assert.match(html, /09:00 · 1\/7/);
  assert.match(html, /12:00 · 0\/3/);
  assert.match(html, /aria-valuenow="1"/);
  assert.match(html, /aria-label="Erogata: Rossi, Mario/);
});
