import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assignmentLockKeys,
  isIsoDate,
  MAX_ROOM_NOTE_LENGTH,
  parseAssignmentCreate,
  parseAssignmentUpdate,
  parseBedCreate,
  parseRoomCreate,
  previousIsoDate,
  validateDateRange,
} from '../room-input.js';

test('ISO dates are strict and ranges cannot run backwards', () => {
  assert.equal(isIsoDate('2028-02-29'), true);
  for (const invalid of ['0000-01-01', '2027-02-29', '2026-13-01', '01/01/2026', '2026-1-01', '']) {
    assert.equal(isIsoDate(invalid), false, invalid);
  }
  assert.equal(validateDateRange('2026-08-30', '2026-08-29').ok, false);
  assert.equal(validateDateRange('2026-08-29', null).ok, true);
  assert.equal(validateDateRange('2026-08-29', '').ok, false);
});

test('room and bed inputs enforce bounds and enums', () => {
  assert.equal(parseRoomCreate(null).ok, false);
  assert.equal(parseRoomCreate([]).ok, false);
  for (const numBeds of [0, 9, 1.5, '4']) {
    assert.equal(parseRoomCreate({ numero: '1', tipo: 'altra', numBeds }).ok, false);
  }
  assert.equal(parseRoomCreate({ numero: '1', tipo: 'tripla' }).ok, false);
  assert.equal(parseRoomCreate({ numero: '1', stato: 'aperta' }).ok, false);
  assert.equal(parseBedCreate({ label: 'A', stato: 'occupato' }).ok, false);
  assert.equal(
    parseBedCreate({ label: 'A', note: 'x'.repeat(MAX_ROOM_NOTE_LENGTH + 1) }).ok,
    false,
  );
});

test('assignment inputs reject malformed dates, long notes and non-object bodies', () => {
  assert.equal(parseAssignmentCreate({ bedId: 'b1', startDate: '2026-02-30' }).ok, false);
  assert.equal(
    parseAssignmentCreate({
      bedId: 'b1',
      startDate: '2026-08-29',
      note: 'x'.repeat(MAX_ROOM_NOTE_LENGTH + 1),
    }).ok,
    false,
  );
  assert.equal(
    parseAssignmentCreate({ bedId: 'b1', startDate: '2026-08-29', endDate: '' }).ok,
    false,
  );
  assert.equal(parseAssignmentUpdate({ endDate: '29/08/2026' }).ok, false);
  assert.equal(parseAssignmentUpdate({ endDate: '' }).ok, false);
  assert.equal(parseAssignmentUpdate([]).ok, false);
});

test('assignment advisory locks are prefixed and deterministic', () => {
  assert.deepEqual(assignmentLockKeys('patient-z', 'bed-a'), ['bed:bed-a', 'patient:patient-z']);
  assert.deepEqual(assignmentLockKeys('a', 'z'), [...assignmentLockKeys('a', 'z')].sort());
  assert.equal(previousIsoDate('2026-03-01'), '2026-02-28');
  assert.equal(previousIsoDate('2028-03-01'), '2028-02-29');
});
