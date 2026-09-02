import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { toFacilityOccupancy } from '../occupancy-model.js';

test('facility occupancy converts aggregate counts and handles maintenance overlap correctly', () => {
  assert.deepEqual(
    toFacilityOccupancy({
      totalRooms: 3n,
      totalBeds: 10n,
      occupiedBeds: 4n,
      freeBeds: 4n,
      maintenanceBeds: 3n,
    }),
    {
      totalRooms: 3,
      totalBeds: 10,
      occupiedBeds: 4,
      freeBeds: 4,
      maintenanceBeds: 3,
      occupancyPct: 40,
    },
  );
  assert.equal(
    toFacilityOccupancy({
      totalRooms: '0',
      totalBeds: '0',
      occupiedBeds: '0',
      freeBeds: '0',
      maintenanceBeds: '0',
    }).occupancyPct,
    0,
  );
});

test('facility occupancy rejects unsafe aggregate values', () => {
  assert.throws(
    () =>
      toFacilityOccupancy({
        totalRooms: 1,
        totalBeds: Number.MAX_SAFE_INTEGER + 1,
        occupiedBeds: 0,
        freeBeds: 0,
        maintenanceBeds: 0,
      }),
    /Conteggio occupazione non valido/,
  );
});

test('admin and assistant share one aggregate-only occupancy query', () => {
  const service = readFileSync(new URL('../occupancy-service.ts', import.meta.url), 'utf8');
  const admin = readFileSync(new URL('../../routes/admin-rooms.ts', import.meta.url), 'utf8');
  const assistant = readFileSync(new URL('../../ai/assistant/service.ts', import.meta.url), 'utf8');

  assert.match(service, /SELECT COUNT\(\*\) FROM "Room"/);
  assert.match(service, /EXISTS \(/);
  assert.match(service, /SELECT 1[\s\S]+?FROM "PatientRoomAssignment"/);
  assert.match(service, /assignment\."startDate" <= \$\{today\}/);
  assert.match(service, /COUNT\(\*\) FILTER \(WHERE occupied\)/);
  assert.match(service, /WHERE NOT occupied AND "stato" IS DISTINCT FROM 'manutenzione'/);
  assert.doesNotMatch(service, /patientId|createdById|note/);

  assert.match(admin, /json\(await getFacilityOccupancy\(\)\)/);
  assert.match(assistant, /const occupancy = await getFacilityOccupancy\(\)/);
  const block = assistant.split('async function roomsOccupancy')[1]?.split('/** Fase 1b')[0];
  assert.ok(block);
  assert.ok(block.indexOf('canFacilityRead(env)') < block.indexOf('getFacilityOccupancy()'));
  assert.doesNotMatch(block, /room\.findMany|assignments/);
});
