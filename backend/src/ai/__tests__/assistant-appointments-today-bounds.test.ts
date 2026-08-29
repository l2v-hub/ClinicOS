import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  boundTodayAppointments,
  MAX_TODAY_APPOINTMENTS,
  todayAppointmentLimit,
} from '../assistant/appointments-today-window.js';

test('today appointment limit follows the assistant result budget within a hard cap', () => {
  assert.equal(todayAppointmentLimit(50), 50);
  assert.equal(todayAppointmentLimit(500), MAX_TODAY_APPOINTMENTS);
  assert.equal(todayAppointmentLimit(0), 1);
  assert.equal(todayAppointmentLimit(Number.NaN), 1);
});

test('today appointment window distinguishes exact results from look-ahead overflow', () => {
  const exact = Array.from({ length: 50 }, (_, id) => ({ id }));
  assert.deepEqual(boundTodayAppointments(exact, 50), { data: exact, truncated: false });

  const overflow = Array.from({ length: 51 }, (_, id) => ({ id }));
  const result = boundTodayAppointments(overflow, 50);
  assert.equal(result.data.length, 50);
  assert.equal(result.data.at(-1)?.id, 49);
  assert.equal(result.truncated, true);
});

test('today appointments push ACL into a minimal bounded query and snapshot uses exact count', () => {
  const service = readFileSync(new URL('../assistant/service.ts', import.meta.url), 'utf8');
  const listBlock = service
    .split('async function appointmentsToday(')[1]
    ?.split('async function appointmentsTodayCount')[0];
  const countBlock = service
    .split('async function appointmentsTodayCount')[1]
    ?.split('/** issue #239')[0];
  const snapshotBlock = service
    .split('async function facilitySnapshot')[1]
    ?.split('async function operatorQueue')[0];
  assert.ok(listBlock);
  assert.ok(countBlock);
  assert.ok(snapshotBlock);

  assert.ok(listBlock.indexOf('permittedPatientIds?.length === 0') < listBlock.indexOf('findMany'));
  assert.match(listBlock, /where:\s*appointmentsTodayWhere\(ctx, now\)/);
  assert.match(listBlock, /take:\s*limit \+ 1/);
  assert.match(listBlock, /orderBy:\s*\[\{ scheduledAt: 'asc' \}, \{ id: 'asc' \}\]/);
  assert.match(listBlock, /truncated:\s*result\.truncated/);
  assert.doesNotMatch(listBlock, /\.filter\(/);
  assert.doesNotMatch(listBlock, /operatorId|createdByUserId|notes|completedAt|cancelledAt/);

  assert.match(countBlock, /permittedPatientIds\?\.length === 0\) return 0/);
  assert.match(countBlock, /appointment\.count\(\{ where: appointmentsTodayWhere\(ctx, now\) \}\)/);
  assert.match(snapshotBlock, /appointmentsTodayTotal = await appointmentsTodayCount\(ctx, now\)/);
  assert.match(snapshotBlock, /appointmentsTodayCount:\s*appointmentsTodayTotal/);
  assert.doesNotMatch(snapshotBlock, /appointmentsToday\(ctx/);
});

test('today appointment scope is constructed before either database operation', () => {
  const service = readFileSync(new URL('../assistant/service.ts', import.meta.url), 'utf8');
  const whereBlock = service
    .split('function appointmentsTodayWhere')[1]
    ?.split('async function appointmentsToday')[0];
  assert.ok(whereBlock);
  assert.match(whereBlock, /scheduledAt:\s*\{ gte: from, lte: to \}/);
  assert.match(whereBlock, /patientId:\s*\{ in: ctx\.permittedPatientIds \}/);
});
