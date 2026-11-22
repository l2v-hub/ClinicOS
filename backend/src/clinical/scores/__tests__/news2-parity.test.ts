// NEWS2 lato server e lato cartella devono dare lo stesso punteggio: Milo, le sentinelle e
// l'operatore guardano lo stesso numero. Stessi casi su entrambe le implementazioni, inclusi
// confini di fascia, valori illeggibili e parametri mancanti.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { news2 as serverNews2, NEWS2_SOURCE } from '../news2.js';
import { news2 as chartNews2 } from '../../../../../frontend/src/lib/news2.ts';

const normal = {
  fr: '16',
  spo2: '97',
  o2: 'no',
  pa: '130/80',
  fc: '72',
  coscienza: 'A',
  temperatura: '36,8',
};
type Values = Record<string, string>;
const variants: Values[] = [normal];
const bands: Record<string, string[]> = {
  fr: ['5', '8', '9', '11', '12', '20', '21', '24', '25', '40', 'x', ''],
  spo2: ['85', '91', '92', '93', '94', '95', '96', '100', '101'],
  o2: ['si', 'no', ''],
  pa: [
    '85/50',
    '90/60',
    '91/60',
    '100/60',
    '101/60',
    '110/70',
    '111/70',
    '219/100',
    '220/110',
    '130',
    '',
  ],
  fc: ['35', '40', '41', '50', '51', '90', '91', '110', '111', '130', '131', '0x1F'],
  coscienza: ['A', 'C', 'V', 'P', 'U', ''],
  temperatura: ['34,9', '35', '35,1', '36', '36,1', '38', '38,1', '39', '39,1', '368', ''],
};
for (const [key, values] of Object.entries(bands))
  for (const value of values) variants.push({ ...normal, [key]: value });
// Combinazioni che fanno salire il rischio.
variants.push(
  { ...normal, fr: '22', spo2: '93', fc: '115' },
  {
    ...normal,
    fr: '26',
    spo2: '90',
    o2: 'si',
    pa: '88/50',
    fc: '135',
    coscienza: 'V',
    temperatura: '39,5',
  },
  { ...normal, coscienza: 'C' },
  {},
);

test('the server NEWS2 equals the chart NEWS2 on every case', () => {
  for (const values of variants)
    assert.deepEqual(serverNews2(values), chartNews2(values), JSON.stringify(values));
  assert.ok(variants.length >= 69, `${variants.length}`);
});

test('risk bands and the cited source', () => {
  assert.equal(serverNews2(normal).risk, 'nessuno');
  assert.equal(serverNews2({ ...normal, coscienza: 'C' }).risk, 'basso-singolo');
  assert.equal(serverNews2({ ...normal, fr: '22', spo2: '93', fc: '115' }).risk, 'medio');
  assert.equal(serverNews2(variants[variants.length - 3]).risk, 'alto');
  assert.equal(serverNews2(variants[variants.length - 3]).total, 19);
  assert.equal(serverNews2({}).complete, false);
  assert.match(NEWS2_SOURCE.reference, /Royal College of Physicians/);
});
