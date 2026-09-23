import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { prisma } from '../../lib/prisma.js';
import { facilityToday } from '../../patients/parameter-reading-input.js';
import { loadPatientIdentityPage } from '../../patients/identity-page.js';
import { loadPatientParametersPage } from '../../patients/parameters-page.js';
import { buildTherapySlotPage } from '../../therapies/therapy-slots.js';

const marker = `roster-edge-${Date.now()}`;
const id = (value: string) => `${marker}-${value}`;
const actor = { id: id('owner'), role: 'operatore' };
const today = facilityToday();
const cases = [
  { key: 'bed2', room: '1A', bed: '2', lastName: 'Zulu' },
  { key: 'bed10', room: '1A', bed: '10', lastName: 'Uniform' },
  { key: 'no-bed', room: '1A', bed: null, lastName: 'Bravo' },
  { key: 'room2', room: '2A', bed: 'A', lastName: 'Alpha' },
  { key: 'large29', room: '999999999999999999999999999999', bed: 'A', lastName: 'Alpha' },
  { key: 'large30', room: '1000000000000000000000000000000', bed: 'A', lastName: 'Alpha' },
  { key: 'leading-zero', room: '01A', bed: '02', lastName: 'Alpha' },
  { key: 'no-room', room: null, bed: 'A', lastName: 'Zulu' },
  { key: 'missing', room: null, bed: null, lastName: 'Zulu' },
  { key: 'inconsistent', room: '0', bed: '0', lastName: 'Alpha' },
];
const expected = {
  asc: [
    'leading-zero',
    'bed2',
    'bed10',
    'no-bed',
    'room2',
    'large29',
    'large30',
    'no-room',
    'inconsistent',
    'missing',
  ],
  desc: [
    'large30',
    'large29',
    'room2',
    'bed10',
    'leading-zero',
    'bed2',
    'no-bed',
    'no-room',
    'inconsistent',
    'missing',
  ],
};

before(async () => {
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, '127.0.0.1');
  await prisma.user.create({
    data: {
      id: id('user'),
      email: `${marker}@example.test`,
      passwordHash: 'synthetic-only',
      fullName: marker,
      operator: { create: { id: actor.id } },
    },
  });
  await prisma.patient.createMany({
    data: cases.map((row) => ({
      id: id(row.key),
      firstName: 'Test',
      lastName: row.lastName,
      medicalRecordNumber: id(`mrn-${row.key}`),
      registeredById: actor.id,
    })),
  });
  await prisma.cartella.createMany({
    data: cases.map((row) => ({
      patientId: id(row.key),
      data: { cameraNumero: row.room, lettoNumero: row.bed },
    })),
  });
  await prisma.patientTherapy.createMany({
    data: cases.map((row) => ({
      id: id(`therapy-${row.key}`),
      patientId: id(row.key),
      farmacoNome: 'Synthetic',
      dosaggio: '1',
      dataInizio: '2000-01-01',
      fasceMattina: true,
    })),
  });
  await prisma.room.createMany({
    data: [1, 2].map((index) => ({ id: id(`room-${index}`), numero: id(`room-${index}`) })),
  });
  await prisma.bed.create({ data: { id: id('bed'), roomId: id('room-1'), label: 'A' } });
  await prisma.patientRoomAssignment.create({
    data: {
      patientId: id('inconsistent'),
      roomId: id('room-2'),
      bedId: id('bed'),
      startDate: '2000-01-01',
    },
  });
});
after(async () => {
  await prisma.patient.deleteMany({ where: { registeredById: actor.id } });
  await prisma.room.deleteMany({ where: { id: { startsWith: marker } } });
  await prisma.user.delete({ where: { id: id('user') } });
  await prisma.$disconnect();
});

for (const direction of ['asc', 'desc'] as const) {
  test(`location/${direction} keeps missing keys last, canonical numeric ties stable and arbitrary-length numbers exact`, async () => {
    for (const view of ['patients', 'parameters', 'therapy']) {
      let cursor: string | undefined;
      const loaded: string[] = [];
      do {
        if (view === 'therapy') {
          const page = await buildTherapySlotPage(
            today,
            { registeredById: actor.id },
            {
              sort: 'location',
              direction,
              limit: 2,
              cursor,
            },
            actor,
          );
          loaded.push(...page.slots[0].patients.map((row) => row.patientId));
          cursor = page.pageInfo.nextCursor ?? undefined;
        } else {
          const query = {
            sort: 'location',
            direction,
            limit: '2',
            cursor,
            date: today,
            asOf: today,
          };
          const page =
            view === 'patients'
              ? await loadPatientIdentityPage(query, actor)
              : await loadPatientParametersPage(query, actor);
          loaded.push(...page.items.map((row) => ('patient' in row ? row.patient.id : row.id)));
          cursor = page.nextCursor ?? undefined;
        }
      } while (cursor);
      assert.deepEqual(loaded, expected[direction].map(id), view);
    }
  });
}

test('explicit identity asOf matches parameter bootstrap and excludes current-only legacy locations', async () => {
  const asOf = '2001-01-01';
  const identity = await loadPatientIdentityPage(
    { asOf, sort: 'location', direction: 'asc' },
    actor,
  );
  const parameters = await loadPatientParametersPage(
    { date: asOf, sort: 'location', direction: 'asc' },
    actor,
  );
  assert.equal(identity.roster.asOf, asOf);
  assert.equal(parameters.roster.asOf, asOf);
  assert.deepEqual(
    identity.items.map((row) => row.id),
    parameters.items.map((row) => row.patient.id),
  );
  for (const row of identity.items) {
    assert.equal(row.location.room, null);
    assert.equal(row.location.bed, null);
    assert.equal(row.location.asOf, asOf);
  }
  for (const invalid of ['2026-02-29', '0000-01-01', ['2026-01-01']])
    await assert.rejects(loadPatientIdentityPage({ asOf: invalid }, actor), /Data non valida/);
});
