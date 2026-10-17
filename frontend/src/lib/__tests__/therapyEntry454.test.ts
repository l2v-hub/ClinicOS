import test from 'node:test';
import assert from 'node:assert/strict';
import { initialCurrentGiroTime, type GiroTime } from '../therapyGiro';
const time = (ora: string, pending: number): GiroTime => ({
  ora,
  pending,
  total: 1,
  patients: [],
  administered: pending ? 0 : 1,
  notAdministered: 0,
});
test('nurse entry selects pending current hour then first pending rather than completed slot', () => {
  const times = [time('08:00', 1), time('12:00', 1), time('20:00', 1)];
  assert.equal(initialCurrentGiroTime(times, '12:35'), '12:00');
  assert.equal(initialCurrentGiroTime(times, '10:00'), '08:00');
  assert.equal(initialCurrentGiroTime([time('12:00', 0), time('20:00', 1)], '12:35'), '20:00');
  assert.equal(initialCurrentGiroTime([], '00:00'), null);
});

test('current clinical band wins over an older pending night dose and preserves exact hour', () => {
  const night = time('02:00', 1),
    morning = time('08:00', 1),
    ten = time('10:00', 1);
  morning.patients = [
    { items: [{ fascia: 'mattina', a: { status: 'pending' } }] },
  ] as GiroTime['patients'];
  ten.patients = [
    { items: [{ fascia: 'mattina', a: { status: 'pending' } }] },
  ] as GiroTime['patients'];
  assert.equal(initialCurrentGiroTime([night, morning, ten], '09:45'), '08:00');
  assert.equal(initialCurrentGiroTime([night, morning, ten], '10:10'), '10:00');
  assert.equal(initialCurrentGiroTime([night, morning, ten], 'invalid'), '02:00');
});
