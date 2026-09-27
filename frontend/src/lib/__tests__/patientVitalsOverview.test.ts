// Tessere della Panoramica: valori reali, andamento, colore per parametro e NEWS2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { news2Tile, vitalTiles } from '../patientVitalsOverview';
import type { PatientParameterReading } from '../patientParameterReadings';

const now = new Date('2026-09-27T08:30:00Z');
const r = (
  id: string,
  measuredAt: string,
  values: Record<string, string>,
): PatientParameterReading => ({
  id,
  requestId: id,
  patientId: 'p1',
  measuredAt,
  values,
  authorOperatorId: 'op1',
  authorName: 'Inf',
  createdAt: measuredAt,
});
const full = {
  fr: '20',
  spo2: '94',
  o2: 'no',
  pa: '142/80',
  fc: '92',
  coscienza: 'A',
  temperatura: '37,4',
};

test('tiles show the latest value, the unit and the trend against the previous value', () => {
  const tiles = vitalTiles(
    [
      r('a', '2026-09-27T05:00:00.000Z', full),
      r('b', '2026-09-27T06:05:00.000Z', {
        ...full,
        fr: '24',
        spo2: '92',
        pa: '148/86',
        fc: '108',
        temperatura: '38,2',
      }),
    ],
    now,
  );
  const by = Object.fromEntries(tiles.map((t) => [t.key, t]));
  assert.equal(by.fr.value, '24');
  assert.equal(by.fr.trend, 'era 20');
  assert.equal(by.fr.direction, 'up');
  assert.equal(by.spo2.unit, '% aria');
  assert.equal(by.spo2.direction, 'down');
  assert.equal(by.pa.value, '148/86');
  assert.equal(by.pa.trend, 'era 142/80');
  assert.equal(by.temperatura.value, '38,2');
  assert.equal(by.fr.at, '08:05');
  // colore dal punteggio NEWS2 del parametro: FR 24 → 2 (ambra), SpO₂ 92 → 2, FC 108 → 1, T 38,2 → 1
  assert.equal(by.fr.tone, 'warn');
  assert.equal(by.spo2.tone, 'warn');
  assert.equal(by.pa.tone, 'none');
});

test('a parameter never measured says so; a single value has no trend', () => {
  const tiles = vitalTiles([r('a', '2026-09-27T06:00:00.000Z', { pa: '120/80' })], now);
  const by = Object.fromEntries(tiles.map((t) => [t.key, t]));
  assert.equal(by.fr.value, null);
  assert.equal(by.pa.value, '120/80');
  assert.equal(by.pa.trend, null);
});

test('NEWS2 tile: score of the latest complete reading (prototype example = 6)', () => {
  const tile = news2Tile(
    [
      r('b', '2026-09-27T06:05:00.000Z', {
        ...full,
        fr: '24',
        spo2: '92',
        pa: '148/86',
        fc: '108',
        temperatura: '38,2',
      }),
    ],
    now,
  );
  assert.equal(tile.score, 6);
  assert.equal(tile.at, '08:05');
  assert.equal(tile.tone, 'medium');
  assert.ok(tile.response);
});

test('NEWS2 tile: not computable says which parameters are missing', () => {
  const tile = news2Tile(
    [
      r('a', '2026-09-27T06:00:00.000Z', {
        pa: '120/80',
        fc: '80',
        spo2: '96',
        temperatura: '36,5',
      }),
    ],
    now,
  );
  assert.equal(tile.score, null);
  assert.deepEqual(tile.missing, ['FR', 'O₂', 'Coscienza']);
  assert.equal(news2Tile([], now).missing.length, 0);
  assert.equal(news2Tile([], now).at, null);
});
