import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  FACILITY_TIME_ZONE,
  facilityLocalMinute,
  formatFacilityLocalMinute,
} from '../facilityTime.js';

test('diary defaults use Europe/Rome wall-clock time in summer and winter', () => {
  assert.equal(FACILITY_TIME_ZONE, 'Europe/Rome');
  assert.equal(facilityLocalMinute(new Date('2026-08-30T09:15:00Z')), '2026-08-30T11:15');
  assert.equal(facilityLocalMinute(new Date('2026-01-30T09:15:00Z')), '2026-01-30T10:15');
});

test('facility diary time is independent from the browser process timezone', () => {
  assert.equal(facilityLocalMinute(new Date('2026-03-29T00:30:00Z')), '2026-03-29T01:30');
  assert.equal(facilityLocalMinute(new Date('2026-03-29T01:30:00Z')), '2026-03-29T03:30');
  assert.throws(() => facilityLocalMinute(new Date('invalid')), /Data non valida/);
});

test('the diary form defaults through the facility clock rather than UTC slicing', () => {
  const component = readFileSync(
    new URL('../../components/operator/cartella/DiarioPazienteTab.tsx', import.meta.url),
    'utf8',
  );
  assert.match(component, /entryDateTime: facilityLocalMinute\(\)/);
  assert.doesNotMatch(component, /toISOString\(\)\.slice\(0, 16\)/);
});

test('diary display treats canonical values as facility wall-clock rather than browser local', () => {
  assert.equal(formatFacilityLocalMinute('2026-08-30T11:15'), '30/08/2026 11:15');
  assert.equal(formatFacilityLocalMinute('2026-08-30T09:15:00Z'), '30/08/2026 11:15');
  assert.equal(formatFacilityLocalMinute(''), '—');
  assert.throws(() => formatFacilityLocalMinute('not-a-date'), /Data non valida/);
});
