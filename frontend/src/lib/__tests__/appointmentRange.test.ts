import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { buildAppointmentRangeUrl, localIsoDate } from '../appointmentRange';

test('appointment range URL always carries an explicit bounded interval', () => {
  assert.equal(
    buildAppointmentRangeUrl('/api', {
      from: '2026-08-25',
      to: '2026-08-31',
      operatorId: 'operator-1',
    }),
    '/api/appointments?from=2026-08-25&to=2026-08-31&limit=1000&operatorId=operator-1',
  );
});

test('appointment calendar dates use local components instead of UTC conversion', () => {
  assert.equal(localIsoDate(new Date(2030, 1, 3, 0, 5)), '2030-02-03');
});

test('App appointment reads use only the bounded range builder', () => {
  const source = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /const qs = date/);
  assert.match(source, /buildAppointmentRangeUrl\(API_URL, requestedRange\)/);
  assert.match(source, /appointmentRequestSequenceRef/);
  assert.match(source, /setAppointmentLoadError\(message\)/);
  assert.match(source, /loadAppuntamenti\(appointmentRangeRef\.current\)/);
  assert.doesNotMatch(source, /createMockTherapySlots/);
  assert.match(source, /therapyRequestSequenceRef/);
  assert.match(source, /setTherapyLoadError\(message\)/);
});
