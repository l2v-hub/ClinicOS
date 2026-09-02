import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const seed = readFileSync(new URL('../../seed.ts', import.meta.url), 'utf8');
const migration = readFileSync(
  new URL(
    '../../../../prisma/migrations/20260902193000_seed_demo_room_occupancy/migration.sql',
    import.meta.url,
  ),
  'utf8',
);

test('demo seed creates explicit rooms, beds and one normalized placement per patient', () => {
  assert.match(seed, /const roomsData = \[/);
  assert.match(seed, /const bedsData = roomsData\.flatMap/);
  assert.match(seed, /const placementsData = patientsData\.map/);
  assert.match(seed, /patientRoomAssignment\.upsert/);
  assert.doesNotMatch(seed, /therapiesData[\s\S]+?patientRoomAssignment\.create/);
});

test('demo migration never infers occupancy from therapy and preserves existing placements', () => {
  assert.match(migration, /JOIN "Patient" patient ON patient\."medicalRecordNumber" = seed\."mrn"/);
  assert.match(migration, /JOIN "Bed" bed ON bed\."id" = seed\."bedId"/);
  assert.match(migration, /WHERE NOT EXISTS \([\s\S]+?existing\."patientId" = patient\."id"/);
  assert.match(migration, /existing\."bedId" = seed\."bedId"/);
  assert.doesNotMatch(migration, /PatientTherapy/);
});
