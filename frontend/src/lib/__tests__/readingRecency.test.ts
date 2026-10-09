import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readingRecency } from '../readingRecency';

const now = new Date('2026-10-09T10:00:00Z');
test('recency keeps full facility date/year/time and descriptive minutes, days and weeks', () => {
  assert.deepEqual(readingRecency('2026-10-09T09:52:00Z', now), {
    absolute: '09/10/2026 11:52', elapsed: '8 minuti fa', valid: true,
  });
  assert.equal(readingRecency('2026-10-06T10:00:00Z', now).elapsed, '3 giorni fa');
  assert.equal(readingRecency('2026-09-25T10:00:00Z', now).elapsed, '2 settimane fa');
});
test('neutral elapsed boundaries never label a historical measure as current', () => {
  for (const [seconds, text] of [[0, 'meno di un minuto fa'], [59, 'meno di un minuto fa'],
    [60, '1 minuto fa'], [3600, '1 ora fa'], [86400, '1 giorno fa'], [604800, '1 settimana fa']] as const)
    assert.equal(readingRecency(new Date(now.getTime() - seconds * 1000).toISOString(), now).elapsed, text);
});
test('invalid, unzoned and impossible calendar instants are explicit, not empty or now', () => {
  for (const value of ['', 'bad', '2026-10-09T10:00:00', '2026-02-30T10:00:00Z'])
    assert.deepEqual(readingRecency(value, now), { absolute: 'Data/ora non verificabile', elapsed: '', valid: false });
  assert.equal(readingRecency('2026-10-09T11:00:00Z', now).elapsed, 'data/ora futura — da verificare');
  assert.equal(readingRecency('2026-10-09T09:00:00Z', new Date(NaN)).elapsed, 'recenza non verificabile');
});
test('DST, timezone offsets, Rome midnight and year rollover use real elapsed time', () => {
  assert.deepEqual(readingRecency('2026-03-29T01:30:00+01:00', new Date('2026-03-29T01:30:00Z')),
    {absolute: '29/03/2026 01:30', elapsed: '1 ora fa', valid: true});
  assert.equal(readingRecency('2026-10-25T02:30:00+02:00', new Date('2026-10-25T02:30:00+01:00')).elapsed, '1 ora fa');
  assert.equal(readingRecency('2025-12-31T22:55:00Z', new Date('2025-12-31T23:05:00Z')).absolute, '31/12/2025 23:55');
  assert.equal(readingRecency('2026-10-09T11:52:00+02:00', now).elapsed, '8 minuti fa');
});
