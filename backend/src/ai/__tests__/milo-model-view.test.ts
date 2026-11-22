// Milo: al modello gli istanti in ora della struttura; nella prosa le fonti come [n].
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgresql://unit:unit@127.0.0.1:1/unit_no_db';
const { localizeInstants, numberSourceIds } = await import('../assistant/model-view.js');

test('ISO instants become facility time for the model; other strings and the original stay', () => {
  const original = {
    readings: [{ id: 'r1', measuredAt: '2026-11-22T18:33:06.000Z', values: { pa: '150/90' } }],
    day: '2026-11-22',
    note: 'misurata alle 2026-11-22T18:33:06.000Z',
  };
  const view = localizeInstants(original);
  assert.equal(view.readings[0].measuredAt, '22/11/2026 19:33');
  assert.equal(view.day, '2026-11-22'); // un giorno di calendario non è un istante
  assert.equal(view.note, original.note); // testo libero non toccato
  assert.equal(original.readings[0].measuredAt, '2026-11-22T18:33:06.000Z'); // copia
  assert.equal(localizeInstants('2026-07-15T06:30:00Z'), '15/07/2026 08:30'); // ora legale
});

test('raw source ids in the prose become numbered references in source order', () => {
  const sources = [
    {
      sourceType: 'VITAL_SIGN',
      patientId: 'p',
      recordId: 'c3743db8-21d7-4175-8830-7c724632eb01',
      label: 'x',
    },
    {
      sourceType: 'VITAL_SIGN',
      patientId: 'p',
      recordId: 'b2222222-0000-4000-8000-000000000002',
      label: 'y',
    },
  ];
  assert.equal(
    numberSourceIds(
      'Il NEWS2 è 6 (fonte: c3743db8-21d7-4175-8830-7c724632eb01). La PA era 125/80 [b2222222-0000-4000-8000-000000000002].',
      sources as never,
    ),
    'Il NEWS2 è 6 [1]. La PA era 125/80 [2].',
  );
  assert.equal(numberSourceIds('Nessun id qui.', sources as never), 'Nessun id qui.');
  // Forme viste sulla demo: nessuna parentesi spuria («[ [1]»).
  const id1 = 'c3743db8-21d7-4175-8830-7c724632eb01';
  for (const form of [
    `[${id1}]`,
    `[fonte: ${id1}]`,
    `(fonte: ${id1})`,
    `fonte: ${id1}`,
    `(${id1})`,
  ]) {
    assert.equal(
      numberSourceIds(`Coscienza: A. ${form}`, sources as never),
      'Coscienza: A. [1]',
      form,
    );
  }
});
