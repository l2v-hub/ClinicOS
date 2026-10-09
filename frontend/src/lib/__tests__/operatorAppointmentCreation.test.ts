import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  canOpenOperatorAppointment as eligible,
  firstOperatorAppointmentSlot as first,
} from '../operatorAppointmentCreation';
import { localIsoDate } from '../appointmentRange';
const now = new Date(2026, 9, 9, 10, 15, 50);
const today = localIsoDate(now);
test('authorization, occupancy and existing local minute policy apply together', () => {
  assert.equal(eligible(true, today, '10:30', false, now), true);
  assert.equal(eligible(false, today, '10:30', false, now), false);
  assert.equal(eligible(true, today, '10:30', true, now), false);
  assert.equal(eligible(true, today, '10:00', false, now), false);
  assert.equal(eligible(true, today, '10:15', false, now), true);
  assert.equal(eligible(true, '2026-10-08', '18:00', false, now), false);
  assert.equal(eligible(true, '2026-10-10', '08:00', false, now), true);
});
test('first slot skips occupied starts even if a status filter hides them', () => {
  assert.equal(
    first(true, today, ['08:00', '10:00', '10:30', '11:00'], new Set(['10:30']), now),
    '11:00',
  );
  assert.equal(first(false, today, ['11:00'], new Set(), now), null);
  assert.equal(first(true, today, ['08:00'], new Set(), now), null);
  assert.equal(first(true, '2026-10-10', ['08:00'], new Set(['08:00']), now), null);
});
test('minute boundary is rechecked without introducing a seconds policy', () => {
  assert.equal(eligible(true, today, '18:30', false, new Date(2026, 9, 9, 18, 30, 59)), true);
  assert.equal(eligible(true, today, '18:30', false, new Date(2026, 9, 9, 18, 31)), false);
  for (const time of ['24:00', '08:60', 'bad', '8:00'])
    assert.equal(eligible(true, today, time, false, now), false);
});
test('operator entrypoints use one checked opener and denied drafts are discarded', () => {
  const source = readFileSync(
    new URL('../../components/operator/OperatorAgenda.tsx', import.meta.url),
    'utf8',
  );
  assert.equal((source.match(/setAptForm\(\{ data, ora \}\)/g) || []).length, 1);
  assert.match(
    source,
    /function openCreation[\s\S]*?canOpenOperatorAppointment[\s\S]*?new Date\(\)/,
  );
  assert.match(source, /if \(!canCreateAppointment\) setAptForm\(null\)/);
  assert.match(source, /aria-describedby="operator-appointment-creation-help"/);
  assert.match(source, /todayApts.length === 0/);
  assert.match(source, /role=\{canCreateCell \? 'button'/);
  assert.match(source, /useRecencyClock\(\)/);
});
