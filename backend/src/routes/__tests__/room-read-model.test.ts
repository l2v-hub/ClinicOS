import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  authoritativeAssignmentActor,
  boundPatientAssignmentResult,
  MAX_ACTIVE_ASSIGNMENTS_PER_BED,
  MAX_PATIENT_ACTIVE_ASSIGNMENTS,
  MAX_PATIENT_ASSIGNMENT_HISTORY,
  PATIENT_ROOM_ASSIGNMENT_READ_SELECT,
  ROOM_ASSIGNMENT_OCCUPANT_SELECT,
  ROOM_LOCATION_SELECT,
  ROOM_PATIENT_SELECT,
} from '../room-read-model.js';

const routeSource = readFileSync(
  fileURLToPath(new URL('../admin-rooms.ts', import.meta.url)),
  'utf8',
);

test('facility occupancy exposes only the minimum patient identity', () => {
  assert.deepEqual(Object.keys(ROOM_PATIENT_SELECT).sort(), ['firstName', 'id', 'lastName']);
  assert.deepEqual(
    Object.keys(ROOM_ASSIGNMENT_OCCUPANT_SELECT).sort(),
    ['endDate', 'id', 'patient', 'patientId', 'startDate'].sort(),
  );

  for (const forbidden of [
    'medicalRecordNumber',
    'dateOfBirth',
    'codiceFiscale',
    'email',
    'phone',
    'address',
    'emergencyContactName',
    'emergencyContactPhone',
  ]) {
    assert.equal(forbidden in ROOM_PATIENT_SELECT, false, `${forbidden} must not leave the API`);
  }
});

test('room and patient-assignment projections omit notes and audit metadata', () => {
  assert.deepEqual(
    Object.keys(ROOM_LOCATION_SELECT).sort(),
    ['id', 'numero', 'piano', 'reparto', 'stato', 'tipo'].sort(),
  );
  assert.deepEqual(
    Object.keys(PATIENT_ROOM_ASSIGNMENT_READ_SELECT).sort(),
    ['bed', 'bedId', 'endDate', 'id', 'patientId', 'roomId', 'startDate'].sort(),
  );

  for (const forbidden of ['note', 'createdById', 'createdAt', 'updatedAt', 'patient']) {
    assert.equal(
      forbidden in PATIENT_ROOM_ASSIGNMENT_READ_SELECT,
      false,
      `${forbidden} must not leave the patient assignment read API`,
    );
  }
});

test('facility read bounds and write attribution are server authoritative', () => {
  assert.equal(MAX_ACTIVE_ASSIGNMENTS_PER_BED, 8);
  assert.equal(MAX_PATIENT_ACTIVE_ASSIGNMENTS, 8);
  assert.equal(MAX_PATIENT_ASSIGNMENT_HISTORY, 100);
  assert.equal(authoritativeAssignmentActor({ id: 'verified-operator' }), 'verified-operator');
  assert.match(routeSource, /take:\s*MAX_ACTIVE_ASSIGNMENTS_PER_BED/);
  assert.match(routeSource, /createdById:\s*authoritativeAssignmentActor\(req\.operator!\)/);
  assert.doesNotMatch(routeSource, /body\.createdById/);
});

test('patient assignment windows never expose more than their documented bounds', () => {
  const rows = Array.from({ length: 101 }, (_, index) => ({ id: `assignment-${index}` }));

  const active = boundPatientAssignmentResult(rows, true);
  assert.equal(active.items.length, MAX_PATIENT_ACTIVE_ASSIGNMENTS);
  assert.equal(active.truncated, false);

  const history = boundPatientAssignmentResult(rows, false);
  assert.equal(history.items.length, MAX_PATIENT_ASSIGNMENT_HISTORY);
  assert.equal(history.truncated, true);

  const shortHistory = boundPatientAssignmentResult(rows.slice(0, 3), false);
  assert.equal(shortHistory.items.length, 3);
  assert.equal(shortHistory.truncated, false);
});
