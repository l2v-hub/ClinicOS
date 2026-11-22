// Milo fase 4: pannello del giro — dettare non scrive nulla; la conferma di un paziente invia una
// sola rilevazione alla rotta della pagina Parametri; un errore lascia la bozza con lo stesso id.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { applyDictation, startRound, type RoundPatient } from '../../../lib/wardRound';
import { ParameterReadingSaveError } from '../../../lib/patientParameterReadings';

(globalThis as { React?: typeof React }).React = React;
const panel = await import('./WardRound');

const roster: RoundPatient[] = [
  { id: 'p-ferrari', lastName: 'Ferrari', firstName: 'Paolo', room: '16', bed: '10' },
  { id: 'p-bianchi', lastName: 'Bianchi', firstName: 'Luisa', room: '14', bed: '4' },
];
const at = new Date('2026-11-22T08:00:00.000Z');

test('dictating fills drafts on screen and writes nothing', () => {
  const calls: unknown[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (...args: unknown[]) => {
    calls.push(args);
    throw new Error('no network in tests');
  }) as typeof fetch;
  try {
    panel.setWardRoundState(
      applyDictation(
        startRound(at),
        'Ferrari pressione 150/90 saturazione 94 vigile. Bianchi temperatura 38 e 2',
        roster,
        at,
      ),
    );
    const html = renderToStaticMarkup(
      createElement(panel.WardRound, { onClose: () => {}, initialRoster: roster }),
    );
    assert.match(html, /Ferrari Paolo — stanza 16 · letto 10/);
    assert.match(html, /value="150\/90"/);
    assert.match(html, /value="38,2"/);
    assert.equal((html.match(/Conferma e registra/g) ?? []).length, 2);
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = realFetch;
    panel.setWardRoundState(null);
  }
});

test('confirming one patient sends only that reading; an error keeps the draft and its id', async () => {
  panel.setWardRoundState(
    applyDictation(startRound(at), 'Ferrari pressione 150/90. Bianchi saturazione 97', roster, at),
  );
  const [ferrari, bianchi] = panel.getWardRoundState()!.drafts;
  const sent: Array<{ patientId: string; body: unknown }> = [];
  let fail = true;
  const save = (async (_api: string, patientId: string, request: unknown) => {
    sent.push({ patientId, body: request });
    if (fail) throw new ParameterReadingSaveError('Servizio non raggiungibile.', true);
    return {} as never;
  }) as never;
  await panel.confirmWardRoundDraft(ferrari.key, save);
  let state = panel.getWardRoundState()!;
  assert.equal(state.drafts[0].status, 'errore');
  assert.equal(state.drafts[0].error, 'Servizio non raggiungibile.');
  assert.equal(state.drafts[1].status, 'bozza');
  fail = false;
  await panel.confirmWardRoundDraft(ferrari.key, save);
  state = panel.getWardRoundState()!;
  assert.equal(state.drafts[0].status, 'registrato');
  assert.deepEqual(
    sent.map((s) => s.patientId),
    ['p-ferrari', 'p-ferrari'],
  );
  assert.deepEqual(sent[0].body, sent[1].body); // stesso requestId, stessi valori
  assert.deepEqual((sent[1].body as { values: unknown }).values, { pa: '150/90' });
  // Già registrato: una nuova conferma non invia nulla.
  await panel.confirmWardRoundDraft(ferrari.key, save);
  assert.equal(sent.length, 2);
  assert.equal(bianchi.status, 'bozza');
  panel.setWardRoundState(null);
});
