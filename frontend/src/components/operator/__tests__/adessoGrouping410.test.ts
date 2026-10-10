import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { groupAdessoQueue, type AdessoItem } from '../../../lib/adessoQueue';
import { AdessoQueue } from '../AdessoQueue';

const item = (key: string, extra: Partial<AdessoItem> = {}): AdessoItem => ({
  key,
  kind: 'terapia-ritardo',
  patientId: 'P1',
  nome: 'Persona sintetica',
  dettaglio: `Farmaco ${key} · 1 cp · orale`,
  tempo: 'In ritardo di 30 min',
  ora: '08:00',
  luogo: 'Camera 1',
  inRitardo: true,
  urgenza: 30,
  landing: {
    tab: 'terapia-farmacologica',
    therapy: { date: '2026-10-10', fascia: 'mattina', therapyId: key },
  },
  ...extra,
});
const render = (items: AdessoItem[], extra = {}) =>
  renderToStaticMarkup(
    React.createElement(AdessoQueue, {
      items,
      terapie: 'ready',
      consegne: 'ready',
      anomalie: 'ready',
      onSelectPaziente: () => {},
      onOpenTherapy: () => {},
      onOpenConsegne: () => {},
      ...extra,
    }),
  );

test('410 groups repeated doses without changing their order, details or exact destinations', () => {
  const input = [item('a'), item('b'), item('c', { patientId: 'P2' }), item('d')];
  const original = JSON.stringify(input);
  const groups = groupAdessoQueue(input);
  assert.deepEqual(
    groups.map((group) => group.items.map((row) => row.key)),
    [['a', 'b', 'd'], ['c']],
  );
  assert.equal(
    groups.reduce((sum, group) => sum + group.items.length, 0),
    input.length,
  );
  assert.equal(groups[0].items[1], input[1]);
  assert.equal(groups[0].items[1].landing.therapy?.therapyId, 'b');
  assert.equal(JSON.stringify(input), original);
});
test('410 never merges different patients, days, bands, states or uncertain grouping identities', () => {
  const input = [
    item('a'),
    item('b', { patientId: 'P2' }),
    item('c', { landing: { therapy: { date: '2026-10-11', fascia: 'mattina' } } }),
    item('d', { landing: { therapy: { date: '2026-10-10', fascia: 'sera' } } }),
    item('e', { kind: 'terapia-imminente', inRitardo: false }),
    item('f', { landing: {} }),
    item('g', { landing: {} }),
    item('h', { patientId: '' }),
    item('i', { patientId: '' }),
    item('j', { kind: 'consegna-scaduta' }),
    item('k', { kind: 'consegna-scaduta' }),
  ];
  assert.equal(groupAdessoQueue(input).length, input.length);
});
test('410 dense overdue queue retains exact counts and a new urgent handover in its own visible section', () => {
  const late = Array.from({ length: 12 }, (_, index) => item(`dose-${index}`));
  const anomalies = Array.from({ length: 9 }, (_, index) =>
    item(`check-${index}`, {
      patientId: `check-${index}`,
      kind: 'anomalia-farmaci',
      inRitardo: false,
      landing: {},
    }),
  );
  const urgent = item('new-urgency', {
    kind: 'consegna-urgente',
    inRitardo: false,
    dettaglio: 'Nuova consegna urgente',
    landing: { tab: 'consegne', consegnaId: 'new-urgency' },
  });
  const html = render([...late, ...anomalies, urgent]);
  assert.match(html, /Scadute · 12 attività/);
  assert.match(html, /12 dosi/);
  assert.equal((html.match(/data-adesso-kind="terapia-ritardo"/g) ?? []).length, 12);
  for (const row of late) assert.ok(html.includes(row.dettaglio));
  assert.match(html, /Consegne urgenti · 1 attività/);
  assert.match(html, /Nuova consegna urgente/);
  assert.match(html, /Mostra altri 3 gruppi/);
  assert.match(html, /<details><summary>/);
  assert.match(html, /non una priorità clinica/);
});
test('410 empty and incomplete queues remain distinct and all source errors remain visible', () => {
  assert.match(render([]), /Niente in sospeso adesso/);
  const html = render([], { terapie: 'error', consegne: 'loading', anomalie: 'error' });
  assert.doesNotMatch(html, /Niente in sospeso adesso/);
  assert.match(html, /Scadenze terapia non disponibili/);
  assert.match(html, /Consegne urgenti in caricamento/);
  assert.match(html, /Verifica farmaci non riuscita/);
});

test('410 overdue and imminent urgent handovers stay visible outside a large therapy backlog', () => {
  const late = Array.from({ length: 15 }, (_, index) => item(`late-${index}`, { patientId: `P${index}` }));
  const handovers = [item('overdue-handover', { kind: 'consegna-scaduta' }),
    item('imminent-handover', { kind: 'consegna-imminente', inRitardo: false })];
  const html = render([...late, ...handovers]);
  assert.match(html, /Consegne urgenti · 2 attività/);
  for (const handover of handovers) assert.ok(html.includes(handover.dettaglio));
  assert.match(html, /Scadute · 15 attività/);
});
