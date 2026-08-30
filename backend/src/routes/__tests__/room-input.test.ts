import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assignmentLockKeys,
  assignmentOverlapFilter,
  bedWriteLockKeys,
  isIsoDate,
  MAX_ROOM_NOTE_LENGTH,
  parseAssignmentCreate,
  parseAssignmentUpdate,
  parseBedCreate,
  parseRoomCreate,
  previousIsoDate,
  roomWriteLockKeys,
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
  assert.deepEqual(assignmentLockKeys('patient-z', 'bed-a', 'room-x'), [
    'room:room-x',
    'bed:bed-a',
    'patient:patient-z',
  ]);
  assert.deepEqual(bedWriteLockKeys('room-x', 'bed-a'), ['room:room-x', 'bed:bed-a']);
  assert.deepEqual(roomWriteLockKeys('room-x', ['bed-z', 'bed-a', 'bed-z']), [
    'room:room-x',
    'bed:bed-a',
    'bed:bed-z',
  ]);
  assert.equal(previousIsoDate('2026-03-01'), '2026-02-28');
  assert.equal(previousIsoDate('2028-03-01'), '2028-02-29');
});

function filterMatches(
  existing: { startDate: string; endDate: string | null },
  filter: ReturnType<typeof assignmentOverlapFilter>,
): boolean {
  if ('startDate' in filter && filter.startDate && existing.startDate > filter.startDate.lte) {
    return false;
  }
  const minimumEnd = filter.OR[1].endDate?.gte;
  return existing.endDate === null || (!!minimumEnd && existing.endDate >= minimumEnd);
}

test('database overlap filter is equivalent for finite and open intervals', () => {
  const starts = ['2026-01-01', '2026-01-05', '2026-01-10'];
  const ends: Array<string | null> = ['2026-01-05', '2026-01-10', '2026-01-15', null];

  for (const existingStart of starts) {
    for (const existingEnd of ends) {
      if (existingEnd !== null && existingEnd < existingStart) continue;
      for (const candidateStart of starts) {
        for (const candidateEnd of ends) {
          if (candidateEnd !== null && candidateEnd < candidateStart) continue;
          const expected =
            (candidateEnd === null || existingStart <= candidateEnd) &&
            (existingEnd === null || candidateStart <= existingEnd);
          assert.equal(
            filterMatches(
              { startDate: existingStart, endDate: existingEnd },
              assignmentOverlapFilter(candidateStart, candidateEnd),
            ),
            expected,
            `${existingStart}/${existingEnd} vs ${candidateStart}/${candidateEnd}`,
          );
        }
      }
    }
  }
});
