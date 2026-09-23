import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { prisma } from '../../lib/prisma.js';
import { loadPatientIdentityPage } from '../../patients/identity-page.js';
import { loadPatientParametersPage } from '../../patients/parameters-page.js';
import { buildTherapySlotPage } from '../../therapies/therapy-slots.js';
import { loadOperationalIdentities } from '../../patients/operational-identity.js';
import { withRosterSnapshot } from '../snapshot.js';
import { RosterError } from '../order-contract.js';
import {
  actor,
  other,
  rows,
  id,
  today,
  expectedIds,
  seedRoster,
  cleanRoster,
} from './roster-fixture.js';

before(seedRoster);
after(cleanRoster);
const stale = (error: unknown) =>
  error instanceof RosterError && error.status === 409 && error.code === 'roster_changed';

for (const sort of ['name', 'location'] as const)
  for (const direction of ['asc', 'desc'] as const) {
    test(`${sort}/${direction}: patients and parameters sort globally before limit with stable boundaries`, async () => {
      for (const parameters of [false, true]) {
        const loaded: string[] = [];
        let cursor: string | undefined;
        do {
          const query = {
            sort,
            direction,
            cursor,
            limit: '17',
            date: today,
            asOf: today,
            view: 'entry',
          };
          const page = parameters
            ? await loadPatientParametersPage(query, actor)
            : await loadPatientIdentityPage(query, actor);
          loaded.push(...page.items.map((row) => ('patient' in row ? row.patient.id : row.id)));
          assert.deepEqual(page.roster.order, { criterion: sort, direction });
          assert.equal(page.roster.asOf, today);
          cursor = page.nextCursor ?? undefined;
        } while (cursor);
        assert.equal(loaded.length, 84);
        assert.equal(new Set(loaded).size, 84);
        assert.deepEqual(loaded, expectedIds(sort, direction));
      }
    });
    test(`${sort}/${direction}: therapy candidates preserve patient order and partial-patient continuation`, async () => {
      const loaded: string[] = [];
      const patientOrder: string[] = [];
      let cursor: string | undefined;
      do {
        const page = await buildTherapySlotPage(
          today,
          { registeredById: actor.id },
          { sort, direction, cursor, limit: 17 },
          actor,
        );
        if (!cursor) assert.equal(page.slots[0].summary.total, 168);
        for (const patient of page.slots[0].patients) {
          if (patientOrder.at(-1) !== patient.patientId) patientOrder.push(patient.patientId);
          loaded.push(...patient.administrations.map((row) => row.therapyId));
        }
        cursor = page.pageInfo.nextCursor ?? undefined;
      } while (cursor);
      assert.equal(loaded.length, 168);
      assert.equal(new Set(loaded).size, 168);
      assert.deepEqual(patientOrder, expectedIds(sort, direction));
    });
  }

test('cursors bind view, day, order and authenticated scope, with no external anchor disclosure', async () => {
  const first = await loadPatientIdentityPage({ limit: '3' }, actor);
  for (const [query, currentActor] of [
    [{ cursor: first.nextCursor!, sort: 'location', direction: 'asc' }, actor],
    [{ cursor: first.nextCursor!, asOf: '2000-01-01' }, actor],
    [{ cursor: first.nextCursor! }, other],
  ] as const)
    await assert.rejects(loadPatientIdentityPage(query, currentActor), stale);
  await assert.rejects(loadPatientParametersPage({ cursor: first.nextCursor! }, actor), stale);
  const payload = JSON.parse(Buffer.from(first.nextCursor!, 'base64url').toString());
  payload.anchor.patientId = id('foreign');
  await assert.rejects(
    loadPatientIdentityPage(
      { cursor: Buffer.from(JSON.stringify(payload)).toString('base64url') },
      actor,
    ),
    stale,
  );
  assert.doesNotMatch(
    Buffer.from(first.nextCursor!, 'base64url').toString(),
    /lastName|firstName|private-clinical/,
  );
});

test('identity, ownership, assignment, room, bed and legacy changes invalidate subsequent pages', async () => {
  const mutations = [
    () => prisma.patient.update({ where: { id: rows[0].id }, data: { sex: 'M' } }),
    () =>
      prisma.patient.update({
        where: { id: rows[0].id },
        data: { medicalRecordNumber: id('changed-MRN') },
      }),
    () => prisma.patient.update({ where: { id: rows[0].id }, data: { firstName: 'Changed' } }),
    () => prisma.patient.update({ where: { id: rows[0].id }, data: { registeredById: other.id } }),
    () =>
      prisma.patientRoomAssignment.update({
        where: { id: id('assignment-1') },
        data: { endDate: '2020-01-02' },
      }),
    () => prisma.room.update({ where: { id: id('room-1A') }, data: { numero: id('1A-changed') } }),
    () => prisma.bed.update({ where: { id: id('bed-1B-B') }, data: { label: 'C' } }),
    () =>
      prisma.cartella.update({
        where: { patientId: rows[6].id },
        data: { data: { cameraNumero: 'LEGACY-2' } },
      }),
  ];
  for (const mutate of mutations) {
    const page = await loadPatientIdentityPage(
      { limit: '3', sort: 'location', direction: 'asc' },
      actor,
    );
    await mutate();
    await assert.rejects(
      loadPatientIdentityPage(
        { limit: '3', sort: 'location', direction: 'asc', cursor: page.nextCursor! },
        actor,
      ),
      stale,
    );
  }
});

test('clinical notes/administration do not invalidate roster; therapy and schedule do', async () => {
  const before = await prisma.rosterEpoch.findUniqueOrThrow({ where: { id: 1 } });
  await prisma.cartella.update({
    where: { patientId: rows[2].id },
    data: { data: { cameraNumero: 'STALE-999', lettoNumero: null, note: 'changed note' } },
  });
  await prisma.medicationAdministration.create({
    data: {
      patientId: rows[2].id,
      therapyId: `${rows[2].id}-therapy-0`,
      farmacoNome: 'Synthetic medicine',
      farmacoDose: '1',
      farmacoVia: 'orale',
      date: today,
      fascia: 'mattina',
      ora: '08:00',
      stato: 'erogata',
      operatoreId: actor.id,
      operatoreNome: 'Synthetic',
    },
  });
  assert.deepEqual(await prisma.rosterEpoch.findUniqueOrThrow({ where: { id: 1 } }), before);
  for (const mutate of [
    () =>
      prisma.patientTherapy.update({
        where: { id: `${rows[2].id}-therapy-0` },
        data: { dosaggio: '2' },
      }),
    () =>
      prisma.therapySchedule.create({
        data: { therapyId: `${rows[2].id}-therapy-0`, time: '08:30', fascia: 'mattina' },
      }),
  ]) {
    const first = await buildTherapySlotPage(
      today,
      { registeredById: actor.id },
      { limit: 3 },
      actor,
    );
    await mutate();
    await assert.rejects(
      buildTherapySlotPage(
        today,
        { registeredById: actor.id },
        { limit: 3, cursor: first.pageInfo.nextCursor! },
        actor,
      ),
      stale,
    );
  }
});

test('rollback leaves epoch unchanged and RepeatableRead keeps epoch and enrichment coherent', async () => {
  const before = await prisma.rosterEpoch.findUniqueOrThrow({ where: { id: 1 } });
  await assert.rejects(
    prisma.$transaction(async (tx) => {
      await tx.patient.update({ where: { id: rows[3].id }, data: { lastName: 'Rolled back' } });
      throw new Error('rollback');
    }),
    /rollback/,
  );
  assert.deepEqual(await prisma.rosterEpoch.findUniqueOrThrow({ where: { id: 1 } }), before);
  await withRosterSnapshot(
    actor,
    { registeredById: actor.id },
    'patients',
    {},
    {},
    today,
    async (tx, snapshot) => {
      const old = await loadOperationalIdentities(
        [rows[3].id],
        { registeredById: actor.id },
        today,
        tx,
      );
      await prisma.patient.update({
        where: { id: rows[3].id },
        data: { lastName: 'Committed concurrently' },
      });
      const sameSnapshot = await loadOperationalIdentities(
        [rows[3].id],
        { registeredById: actor.id },
        today,
        tx,
      );
      assert.equal(sameSnapshot.get(rows[3].id)!.lastName, old.get(rows[3].id)!.lastName);
      assert.equal(
        (await tx.rosterEpoch.findUniqueOrThrow({ where: { id: 1 } })).roster.toString(),
        snapshot.roster.epoch.roster,
      );
    },
  );
  assert.equal(
    (await prisma.patient.findUniqueOrThrow({ where: { id: rows[3].id } })).lastName,
    'Committed concurrently',
  );
});
