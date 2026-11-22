// Milo fase 5 — regole della sentinella NEWS2 (RCP 2017) e configurazione per struttura.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { news2Sentinel, sentinelConfig } from '../sentinels.js';

const base = {
  pa: '125/80',
  fc: '72',
  spo2: '97',
  fr: '16',
  temperatura: '36,6',
  o2: 'no',
  coscienza: 'A',
};

test('protocol thresholds: ≥7 urgent, 5–6 high, a single 3 high, otherwise nothing', () => {
  assert.equal(news2Sentinel(base), null);
  const medium = news2Sentinel({ ...base, fc: '115', spo2: '93', fr: '22' });
  assert.equal(medium?.total, 6);
  assert.equal(medium?.priority, 'alta');
  assert.equal(medium?.why, 'FR 2 · SpO₂ 2 · FC 2');
  assert.equal(medium?.response, 'Valutazione medica urgente');
  const high = news2Sentinel({ ...base, fc: '115', spo2: '91', fr: '25' });
  assert.equal(high?.priority, 'urgente');
  assert.equal(high?.response, 'Risposta di emergenza');
  const single = news2Sentinel({ ...base, coscienza: 'V' });
  assert.equal(single?.total, 3);
  assert.equal(single?.priority, 'alta');
  assert.equal(single?.why, 'Coscienza 3');
});

test('incomplete readings never trigger (a partial NEWS2 is not a NEWS2)', () => {
  const partial: Record<string, string> = { ...base, fc: '130', spo2: '88' };
  delete partial.fr;
  assert.equal(news2Sentinel(partial), null);
  assert.equal(news2Sentinel(null), null);
});

test('facility config: can only bring the alert earlier (3–4), never later; can be switched off', () => {
  assert.deepEqual(sentinelConfig({}), { news2Enabled: true, news2AlertFrom: 5 });
  assert.equal(sentinelConfig({ SENTINEL_NEWS2_ALERT_FROM: '9' }).news2AlertFrom, 5);
  assert.equal(sentinelConfig({ SENTINEL_NEWS2_ALERT_FROM: '2' }).news2AlertFrom, 5);
  const early = sentinelConfig({ SENTINEL_NEWS2_ALERT_FROM: '3' });
  const four = { ...base, fc: '115', fr: '22' }; // FC 2 + FR 2 = 4
  assert.equal(news2Sentinel(four), null);
  assert.equal(news2Sentinel(four, early)?.priority, 'alta');
  const off = sentinelConfig({ SENTINEL_NEWS2_ENABLED: 'false' });
  assert.equal(news2Sentinel({ ...base, fc: '115', spo2: '91', fr: '25' }, off), null);
});
