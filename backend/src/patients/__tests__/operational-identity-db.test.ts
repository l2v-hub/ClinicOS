import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { prisma } from '../../lib/prisma.js';
import { loadConsegnaFeed, loadConsegnaOverview } from '../../consegne/read-service.js';
import { buildTherapySlotPage } from '../../therapies/therapy-slots.js';
import { loadOperationalIdentities, patientLocationJoin } from '../operational-identity.js';
import { loadPatientIdentityPage } from '../identity-page.js';
import { loadPatientParametersPage } from '../parameters-page.js';
import { facilityToday } from '../parameter-reading-input.js';

const marker = `po06-${Date.now()}`;
const id = (key: string) => `${marker}-${key}`;
const today = facilityToday();
const actor = { id: id('owner'), role: 'operatore' };
const keys = [
  'active',
  'ended',
  'future',
  'duplicate',
  'conflict',
  'mismatch',
  'invalid-day',
  'invalid-format',
  'inverted',
  'legacy',
  'partial',
  'invalid-scalar',
  'blank',
  'empty',
  'foreign',
];
const fillerKeys = Array.from({ length: 60 }, (_, index) => `filler-${index}`);
const allKeys = [...keys, ...fillerKeys];

before(async () => {
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, '127.0.0.1', 'synthetic loopback only');
  for (const key of ['owner', 'other']) {
    await prisma.user.create({
      data: {
        id: id(`${key}-user`),
        email: `${id(key)}@example.test`,
        passwordHash: 'synthetic-only',
        fullName: key,
        operator: { create: { id: id(key) } },
      },
    });
  }
  await prisma.patient.createMany({
    data: allKeys.map((key) => ({
      id: id(key),
      medicalRecordNumber: id(`mrn-${key}`),
      firstName: marker,
      lastName: key === 'active' ? 'ZzzVisibleAfterSixty' : `A-${key}`,
      codiceFiscale: key === 'active' ? 'RSSMRA80A01H501U' : null,
      dateOfBirth: new Date('1980-01-01T00:00:00.000Z'),
      registeredById: key === 'foreign' ? id('other') : actor.id,
    })),
  });
  await prisma.room.createMany({
    data: [
      { id: id('room'), numero: id('AUTH-42'), note: 'admin-room-private' },
      { id: id('room2'), numero: id('AUTH-43') },
    ],
  });
  await prisma.bed.createMany({
    data: [
      { id: id('bed'), roomId: id('room'), label: 'A' },
      { id: id('bed2'), roomId: id('room2'), label: 'B' },
    ],
  });
  await prisma.cartella.createMany({
    data: keys
      .filter((key) => key !== 'empty')
      .map((key) => ({
        patientId: id(key),
        data: {
          cameraNumero:
            key === 'blank' ? ' ' : key === 'invalid-scalar' ? { private: 'object' } : 'LEGACY-99',
          lettoNumero: ['partial', 'blank'].includes(key) ? null : 'L',
          anamnesi: 'clinical-private-value',
        },
      })),
  });
  const assignment = (key: string, extra = {}) => ({
    id: id(`assignment-${key}`),
    patientId: id(key),
    roomId: id('room'),
    bedId: id('bed'),
    startDate: '2020-01-01',
    ...extra,
  });
  await prisma.patientRoomAssignment.createMany({
    data: [
      assignment('active'),
      assignment('duplicate'),
      assignment('duplicate', { id: id('duplicate-2') }),
      assignment('conflict'),
      assignment('conflict', { id: id('conflict-2'), roomId: id('room2'), bedId: id('bed2') }),
      assignment('mismatch', { roomId: id('room2') }),
      assignment('ended', { startDate: '2000-01-01', endDate: '2001-01-01' }),
      assignment('future', { startDate: '2099-01-01' }),
      assignment('invalid-day', { startDate: '2025-02-29' }),
      assignment('invalid-format', { startDate: 'not-a-date' }),
      assignment('inverted', { endDate: '2019-12-31' }),
    ],
  });
});

after(async () => {
  await prisma.consegna.deleteMany({ where: { pazienteId: { in: allKeys.map(id) } } });
  await prisma.patient.deleteMany({ where: { id: { in: allKeys.map(id) } } });
  await prisma.room.deleteMany({ where: { id: { in: [id('room'), id('room2')] } } });
  await prisma.user.deleteMany({ where: { id: { in: [id('owner-user'), id('other-user')] } } });
  await prisma.$disconnect();
});

test('authoritative location handles active/history/conflicts/legacy without mixed labels or private data', async () => {
  const result = await loadOperationalIdentities(keys.map(id), { registeredById: actor.id }, today);
  assert.equal(result.has(id('foreign')), false);
  const location = (key: string) => result.get(id(key))!.location;
  for (const key of ['active', 'duplicate'])
    assert.deepEqual(location(key), {
      status: 'assigned',
      source: 'assignment',
      room: id('AUTH-42'),
      bed: 'A',
      asOf: today,
    });
  for (const key of ['ended', 'future'])
    assert.deepEqual(location(key), {
      status: 'unassigned',
      source: 'assignment',
      room: null,
      bed: null,
      asOf: today,
    });
  for (const key of ['conflict', 'mismatch', 'invalid-day', 'invalid-format', 'inverted']) {
    assert.deepEqual(
      location(key),
      {
        status: 'unavailable',
        source: 'assignment',
        room: null,
        bed: null,
        asOf: today,
      },
      key,
    );
  }
  assert.deepEqual(location('legacy'), {
    status: 'assigned',
    source: 'cartella',
    room: 'LEGACY-99',
    bed: 'L',
    asOf: today,
  });
  assert.deepEqual(location('partial'), {
    status: 'assigned',
    source: 'cartella',
    room: 'LEGACY-99',
    bed: null,
    asOf: today,
  });
  assert.deepEqual(location('invalid-scalar'), {
    status: 'unavailable',
    source: 'cartella',
    room: null,
    bed: null,
    asOf: today,
  });
  for (const key of ['blank', 'empty']) assert.equal(location(key).status, 'unassigned');
  assert.equal(result.get(id('active'))!.dateOfBirth, '1980-01-01');
  assert.equal(result.get(id('active'))!.codiceFiscale, 'RSSMRA80A01H501U');
  assert.doesNotMatch(
    JSON.stringify([...result.values()]),
    /clinical-private|admin-room-private|medicalRecordNumber/,
  );
});

test('historical lookup ignores legacy, preserves inclusive intervals and validates calendar dates', async () => {
  const historical = await loadOperationalIdentities([id('ended'), id('legacy')], {}, '2001-01-01');
  assert.equal(historical.get(id('ended'))!.location.status, 'assigned');
  assert.deepEqual(historical.get(id('legacy'))!.location, {
    status: 'unavailable',
    source: null,
    room: null,
    bed: null,
    asOf: '2001-01-01',
  });
  const afterEnd = await loadOperationalIdentities([id('ended')], {}, '2001-01-02');
  assert.equal(afterEnd.get(id('ended'))!.location.status, 'unassigned');
  for (const invalid of ['2025-02-29', '2026-04-31', '2026-1-01', '2026-01-01Z', 'bad']) {
    await assert.rejects(loadOperationalIdentities([], {}, invalid), /Data non valida/);
  }
  assert.doesNotThrow(() => patientLocationJoin('2024-02-29'));
  assert.doesNotThrow(() => patientLocationJoin('1999-12-31'));
  assert.equal(facilityToday(new Date('2026-09-22T22:30:00Z')), '2026-09-23');
  assert.equal(facilityToday(new Date('2026-01-22T23:30:00Z')), '2026-01-23');
});

test('batch IDs are deduplicated and both scope restrictions apply to identity', async () => {
  const result = await loadOperationalIdentities([id('active'), id('active'), id('foreign')], {
    patientIds: [id('active'), id('foreign')],
    registeredById: actor.id,
  });
  assert.deepEqual([...result.keys()], [id('active')]);
  assert.equal((await loadOperationalIdentities([id('active')], { patientIds: [] })).size, 0);
  assert.equal((await loadOperationalIdentities([], {})).size, 0);
});

test('repeated IDs use one minimal batch and database errors never become unassigned', async () => {
  const original = prisma.$queryRaw;
  const calls: Array<{ values: unknown[]; text: string }> = [];
  prisma.$queryRaw = ((sql: { values: unknown[]; text: string }) => {
    calls.push(sql);
    return original.call(prisma, sql as any);
  }) as typeof prisma.$queryRaw;
  try {
    await loadOperationalIdentities([id('active'), id('active'), id('legacy')], {
      registeredById: actor.id,
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].values.filter((value) => value === id('active')).length, 1);
    assert.doesNotMatch(calls[0].text, /SELECT\s+(?:\*|legacy\.data)|anamnesi|passwordHash/);
    prisma.$queryRaw = (() => {
      throw new Error('synthetic database failure');
    }) as typeof prisma.$queryRaw;
    await assert.rejects(
      loadOperationalIdentities([id('active')], {}),
      /synthetic database failure/,
    );
  } finally {
    prisma.$queryRaw = original;
  }
});

test('non-string legacy scalars are unavailable and a roomless valid bed remains explicit', async () => {
  for (const cameraNumero of [42, true, ['room'], { number: 42 }]) {
    await prisma.cartella.update({
      where: { patientId: id('invalid-scalar') },
      data: {
        data: { cameraNumero, lettoNumero: 'A' },
      },
    });
    const result = await loadOperationalIdentities([id('invalid-scalar')], {});
    assert.equal(result.get(id('invalid-scalar'))!.location.status, 'unavailable');
    assert.equal(result.get(id('invalid-scalar'))!.location.bed, null);
  }
  await prisma.cartella.update({
    where: { patientId: id('invalid-scalar') },
    data: {
      data: { cameraNumero: null, lettoNumero: ' B ' },
    },
  });
  const result = await loadOperationalIdentities([id('invalid-scalar')], {});
  assert.deepEqual(result.get(id('invalid-scalar'))!.location, {
    status: 'assigned',
    source: 'cartella',
    room: null,
    bed: 'B',
    asOf: today,
  });
});

test('parameter room search is authoritative before limit+1 and identity page keeps its cursor', async () => {
  const first = await loadPatientIdentityPage({ limit: '50' }, actor);
  assert.equal(first.items.length, 50);
  assert.ok(first.nextCursor);
  assert.equal(
    first.items.some((row) => row.id === id('active')),
    false,
  );
  const room = await loadPatientParametersPage(
    { q: id('AUTH-42'), limit: '25', view: 'entry' },
    actor,
  );
  assert.ok(room.items.some((row) => row.patient.id === id('active')));
  assert.deepEqual(
    new Set(room.items.map((row) => row.patient.id)),
    new Set([id('active'), id('duplicate')]),
  );
  const active = room.items.find((row) => row.patient.id === id('active'))!;
  assert.equal(active.patient.codiceFiscale, 'RSSMRA80A01H501U');
  assert.equal(active.patient.location.room, active.cartella.cameraNumero);
  assert.deepEqual(active.cartella.parametriMensili, []);
  assert.equal(active.cartella.readingCount, 0);
  const legacy = await loadPatientParametersPage({ q: 'LEGACY-99', view: 'entry' }, actor);
  assert.deepEqual(
    new Set(legacy.items.map((row) => row.patient.id)),
    new Set([id('legacy'), id('partial')]),
  );
  const historical = await loadPatientParametersPage({ q: 'LEGACY-99', date: '2015-01-01' }, actor);
  assert.deepEqual(historical.items, []);
});

test('visible handover does not grant patient identity access, including overview previews', async () => {
  await prisma.consegna.createMany({
    data: ['active', 'foreign'].map((key) => ({
      id: id(`handover-${key}`),
      pazienteId: id(key),
      pazienteNome: `Existing ${key}`,
      note: 'synthetic note',
      scadenza: today,
      operatoreAssegnato: 'Owner',
      operatoreAssegnatoId: actor.id,
      creatoDA: 'Other',
      creatoDaId: id('other'),
      priorita: 'urgente',
    })),
  });
  const feed = await loadConsegnaFeed(actor, { limit: 20 });
  assert.equal(feed.summary.total, 2);
  assert.equal(
    feed.items.find((row) => row.pazienteId === id('active'))!.identity!.codiceFiscale,
    'RSSMRA80A01H501U',
  );
  const foreign = feed.items.find((row) => row.pazienteId === id('foreign'))!;
  assert.equal(foreign.pazienteNome, 'Existing foreign');
  assert.equal(foreign.identity, null);
  const overview = await loadConsegnaOverview(actor);
  for (const preview of [overview.urgentPreview, overview.openPreview]) {
    assert.equal(preview.find((row) => row.pazienteId === id('foreign'))!.identity, null);
    assert.equal(
      preview.find((row) => row.pazienteId === id('active'))!.identity!.location.source,
      'assignment',
    );
  }
});

test('therapy detail, location and exact totals intersect requested IDs with patient ownership', async () => {
  await prisma.patientTherapy.createMany({
    data: ['active', 'foreign'].map((key) => ({
      id: id(`therapy-${key}`),
      patientId: id(key),
      farmacoNome: 'Synthetic medicine',
      dosaggio: '1',
      dataInizio: '2020-01-01',
      fasceMattina: true,
    })),
  });
  const page = await buildTherapySlotPage(
    today,
    {
      patientIds: [id('active'), id('foreign')],
      registeredById: actor.id,
    },
    { limit: 100 },
  );
  assert.equal(page.pageInfo.loadedTherapies, 1);
  assert.equal(page.slots.length, 1);
  assert.equal(page.slots[0].summary.total, 1);
  assert.equal(page.slots[0].patients.length, 1);
  const patient = page.slots[0].patients[0];
  assert.equal(patient.patientId, id('active'));
  assert.equal(patient.codiceFiscale, 'RSSMRA80A01H501U');
  assert.equal(patient.room, id('AUTH-42'));
  assert.equal(patient.bed, 'A');
  assert.deepEqual(patient.location, {
    status: 'assigned',
    source: 'assignment',
    room: id('AUTH-42'),
    bed: 'A',
    asOf: today,
  });
});
