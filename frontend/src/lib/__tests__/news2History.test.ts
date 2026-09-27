import { test } from 'node:test';
import assert from 'node:assert/strict';
import { latestCompleteNews2, news2Points, news2Tone } from '../news2History';
import type { PatientParameterReading } from '../patientParameterReadings';

const full = {
  fr: '16',
  spo2: '97',
  o2: 'no',
  pa: '130/80',
  fc: '72',
  coscienza: 'A',
  temperatura: '36,8',
};
const reading = (
  id: string,
  measuredAt: string,
  values: PatientParameterReading['values'],
): PatientParameterReading => ({
  id,
  requestId: id,
  patientId: 'p1',
  measuredAt,
  values,
  authorOperatorId: 'op1',
  authorName: 'Test',
  createdAt: measuredAt,
});

test('the chip uses the latest COMPLETE reading, not a newer partial one', () => {
  const points = news2Points([
    reading('old', '2026-09-26T08:00:00.000Z', {
      ...full,
      fr: '24',
      spo2: '92',
      fc: '108',
      temperatura: '38,2',
    }),
    reading('partial', '2026-09-27T06:00:00.000Z', { pa: '120/80', fc: '70' }),
    reading('mid', '2026-09-26T20:00:00.000Z', full),
  ]);
  assert.deepEqual(
    points.map((p) => p.reading.id),
    ['partial', 'mid', 'old'],
    'newest first',
  );
  const latest = latestCompleteNews2(points);
  assert.equal(latest?.reading.id, 'mid');
  assert.equal(latest?.result.total, 0);
  assert.equal(news2Tone(latest), 'ok');
  assert.equal(news2Tone(points[2]), 'medium');
});

test('no complete reading means no score', () => {
  const points = news2Points([reading('a', '2026-09-27T06:00:00.000Z', { spo2: '88', fc: '130' })]);
  assert.equal(latestCompleteNews2(points), null);
  assert.equal(news2Tone(null), 'none');
});

test('a reassuring score is stale when newer incomplete readings exist or it is older than 12 h', async () => {
  const { news2Staleness } = await import('../news2History');
  const now = Date.parse('2026-09-27T10:00:00.000Z');
  const points = news2Points([
    reading('ok', '2026-09-24T09:00:00.000Z', full),
    reading('newer', '2026-09-27T09:30:00.000Z', { spo2: '84', fc: '140' }),
  ]);
  const latest = latestCompleteNews2(points);
  const s = news2Staleness(points, latest, now);
  assert.equal(s.stale, true);
  assert.equal(s.newerIncomplete, 1);
  const fresh = news2Points([reading('f', '2026-09-27T08:00:00.000Z', full)]);
  assert.equal(news2Staleness(fresh, latestCompleteNews2(fresh), now).stale, false);
  const old = news2Points([reading('o', '2026-09-26T20:00:00.000Z', full)]);
  assert.equal(news2Staleness(old, latestCompleteNews2(old), now).stale, true, 'older than 12 h');
});

test('staleness follows the RCP monitoring frequency of each risk level', async () => {
  const { news2Staleness } = await import('../news2History');
  const now = Date.parse('2026-09-27T10:00:00.000Z');
  const at = (hAgo: number) => new Date(now - hAgo * 3600e3).toISOString();
  const low = news2Points([reading('l', at(8), { ...full, fc: '95' })]); // NEWS2 1, 8 h fa
  assert.equal(news2Staleness(low, latestCompleteNews2(low), now).stale, true, '1–4: oltre 6 h');
  const lowFresh = news2Points([reading('lf', at(5), { ...full, fc: '95' })]);
  assert.equal(news2Staleness(lowFresh, latestCompleteNews2(lowFresh), now).stale, false);
  const medium = news2Points([
    reading('m', at(2), { ...full, fr: '24', spo2: '92', fc: '108', temperatura: '38,2' }),
  ]);
  assert.equal(
    news2Staleness(medium, latestCompleteNews2(medium), now).stale,
    true,
    '5–6: oltre 1 h',
  );
});
