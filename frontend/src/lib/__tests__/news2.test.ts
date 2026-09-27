// Soglie NEWS2 (RCP 2017, scala SpO₂ 1): un caso per ogni fascia e per i confini.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { news2, news2Parts } from '../news2';

const normal = {
  fr: '16',
  spo2: '97',
  o2: 'no',
  pa: '130/80',
  fc: '72',
  coscienza: 'A',
  temperatura: '36,8',
};

test('a normal set scores 0 and is complete', () => {
  const r = news2(normal);
  assert.equal(r.complete, true);
  assert.equal(r.total, 0);
  assert.equal(r.risk, 'nessuno');
});

test('respiratory rate bands', () => {
  const s = (fr: string) => news2Parts({ ...normal, fr }).fr;
  assert.deepEqual(['8', '9', '11', '12', '20', '21', '24', '25'].map(s), [3, 1, 1, 0, 0, 2, 2, 3]);
});

test('SpO₂ scale 1 bands', () => {
  const s = (spo2: string) => news2Parts({ ...normal, spo2 }).spo2;
  assert.deepEqual(['91', '92', '93', '94', '95', '96'].map(s), [3, 2, 2, 1, 1, 0]);
});

test('supplemental oxygen scores 2', () => {
  assert.equal(news2Parts({ ...normal, o2: 'si' }).o2, 2);
  assert.equal(news2Parts({ ...normal, o2: 'no' }).o2, 0);
});

test('systolic pressure bands use the first number of PA', () => {
  const s = (pa: string) => news2Parts({ ...normal, pa }).pa;
  assert.deepEqual(
    ['90/60', '91/60', '100/60', '101/60', '110/70', '111/70', '219/90', '220/100'].map(s),
    [3, 2, 2, 1, 1, 0, 0, 3],
  );
});

test('heart rate bands', () => {
  const s = (fc: string) => news2Parts({ ...normal, fc }).fc;
  assert.deepEqual(
    ['40', '41', '50', '51', '90', '91', '110', '111', '130', '131'].map(s),
    [3, 1, 1, 0, 0, 1, 1, 2, 2, 3],
  );
});

test('consciousness: only A scores 0', () => {
  for (const c of ['C', 'V', 'P', 'U'])
    assert.equal(news2Parts({ ...normal, coscienza: c }).coscienza, 3);
  assert.equal(news2Parts(normal).coscienza, 0);
});

test('temperature bands accept the decimal comma', () => {
  const s = (temperatura: string) => news2Parts({ ...normal, temperatura }).temperatura;
  assert.deepEqual(
    ['35,0', '35,1', '36,0', '36,1', '38,0', '38,1', '39,0', '39,1'].map(s),
    [3, 1, 1, 0, 0, 1, 1, 2],
  );
});

test('risk levels: single 3, medium 5–6, high ≥ 7', () => {
  assert.equal(news2({ ...normal, coscienza: 'V' }).risk, 'basso-singolo');
  assert.equal(news2({ ...normal, fc: '95' }).risk, 'basso');
  const medio = news2({
    ...normal,
    fr: '24',
    spo2: '92',
    fc: '108',
    temperatura: '38,2',
  });
  assert.equal(medio.total, 6);
  assert.equal(medio.risk, 'medio');
  assert.equal(news2({ ...normal, fr: '26', spo2: '90', o2: 'si' }).risk, 'alto');
});

test('an incomplete set is never presented as a NEWS2', () => {
  const r = news2({ spo2: '90', fc: '120', pa: '95/60', temperatura: '39,5' });
  assert.equal(r.complete, false);
  assert.deepEqual(r.missing, ['fr', 'o2', 'coscienza']);
  assert.equal(r.risk, null);
  assert.equal(r.response, null);
});

test('unparseable or implausible values never produce a score', () => {
  for (const bad of [
    { fr: '0x1F' },
    { fr: '1e1' },
    { fr: '-5' },
    { temperatura: '368' },
    { spo2: '150' },
    { pa: '120' },
    { pa: 'abc' },
    { fc: '' },
  ]) {
    const r = news2({ ...normal, ...bad });
    assert.equal(r.complete, false, JSON.stringify(bad));
    assert.equal(r.risk, null, JSON.stringify(bad));
  }
});
