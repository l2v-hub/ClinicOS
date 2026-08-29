import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  boundGatewayPatientFeed,
  GATEWAY_PATIENT_FEED_LOOKAHEAD,
  MAX_GATEWAY_APPOINTMENT_NOTES,
  MAX_GATEWAY_DIARY_CONTENT,
  MAX_GATEWAY_PATIENT_FEED_ROWS,
  MAX_GATEWAY_SOURCE_EXCERPT,
  parseGatewayAppointmentRange,
} from '../gateway/patient-feed-window.js';
import { GatewayError } from '../gateway/types.js';

test('patient gateway feeds distinguish exact, row-overflow and field-excerpt truncation', () => {
  assert.equal(MAX_GATEWAY_PATIENT_FEED_ROWS, 100);
  assert.equal(GATEWAY_PATIENT_FEED_LOOKAHEAD, 101);
  assert.equal(MAX_GATEWAY_DIARY_CONTENT, 4_000);
  assert.equal(MAX_GATEWAY_APPOINTMENT_NOTES, 1_000);
  assert.equal(MAX_GATEWAY_SOURCE_EXCERPT, 240);

  const exact = Array.from({ length: 100 }, (_, id) => ({ id }));
  assert.equal(boundGatewayPatientFeed(exact).truncated, false);
  const overflow = boundGatewayPatientFeed([...exact, { id: 100 }]);
  assert.equal(overflow.data.length, 100);
  assert.equal(overflow.truncated, true);
  assert.equal(boundGatewayPatientFeed([{ contentTruncated: true }]).truncated, true);
  assert.equal(boundGatewayPatientFeed([{ notesTruncated: true }]).truncated, true);
});

test('appointment gateway ranges reject malformed or inverted runtime input', () => {
  assert.deepEqual(parseGatewayAppointmentRange({}), { from: undefined, to: undefined });
  assert.equal(
    parseGatewayAppointmentRange({ from: '2026-08-30', to: '2026-08-31' }).from?.toISOString(),
    '2026-08-30T00:00:00.000Z',
  );
  for (const input of [
    null,
    [],
    { from: ['2026-08-30'] },
    { from: 'not-a-date' },
    { from: '2026-09-01', to: '2026-08-30' },
  ]) {
    assert.throws(
      () => parseGatewayAppointmentRange(input),
      (error: unknown) => error instanceof GatewayError && error.kind === 'bad_request',
    );
  }
});

test('diary and appointment gateway SQL is filtered, projected and bounded before materialization', () => {
  const source = readFileSync(new URL('../gateway/services.ts', import.meta.url), 'utf8');
  const diary = source
    .split('export async function getPatientDiary')[1]
    ?.split('export async function getPatientDocumentsG')[0];
  const appointments = source
    .split('export async function getPatientAppointments')[1]
    ?.split('export async function getPatientTimeline')[0];
  assert.ok(diary);
  assert.ok(appointments);
  for (const block of [diary, appointments]) {
    assert.match(block, /LIMIT \$\{GATEWAY_PATIENT_FEED_LOOKAHEAD\}/);
    assert.match(block, /boundGatewayPatientFeed\(rows\)/);
    assert.match(block, /truncated: result\.truncated/);
    assert.doesNotMatch(block, /\.filter\(/);
    assert.doesNotMatch(block, /findMany/);
  }
  assert.match(diary, /Prisma\.join\(predicates, ' AND '\)/);
  assert.match(diary, /LEFT\(diary\."content", \$\{MAX_GATEWAY_DIARY_CONTENT\}\)/);
  assert.match(diary, /MAX_GATEWAY_SOURCE_EXCERPT/);
  assert.match(appointments, /LEFT\(appointment\."notes", \$\{MAX_GATEWAY_APPOINTMENT_NOTES\}\)/);
  assert.doesNotMatch(appointments, /operatorId|createdByUserId/);
});
