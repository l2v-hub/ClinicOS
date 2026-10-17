// Ownership-denial cases pin the supported restricted scope.
process.env.RESIDENT_SCOPE_CONFIG ??= JSON.stringify({ fallback: 'registered_by_me' });
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import type { Server } from 'node:http';
import { prisma } from '../../lib/prisma.js';
import therapyRouter from '../therapy.js';
import { buildTherapySlotPage } from '../../therapies/therapy-slots.js';
import { findTherapiesDue } from '../../therapies/due-therapy-query.js';
import { dayKey } from '../../ai/assistant/facility-signals.js';

let server: Server;
let base = '';
let patientId = '';
let therapyId = '';
let glucoseScaleTherapyId = '';
let ownerUserId = '';
const ownerOperatorId = `verified-op-${Date.now()}`;
const date = '2033-04-05';

before(async () => {
  const ownerUser = await prisma.user.create({
    data: {
      email: `therapy-owner-${Date.now()}@example.test`,
      passwordHash: 'not-used-by-route-test',
      fullName: 'Verified Owner',
      operator: { create: { id: ownerOperatorId, ruolo: 'operatore' } },
    },
  });
  ownerUserId = ownerUser.id;
  const patient = await prisma.patient.create({
    data: {
      medicalRecordNumber: `MRN-THERAPY-AUTH-${Date.now()}`,
      firstName: 'Ada',
      lastName: 'Test',
      dateOfBirth: new Date('1970-01-01'),
      sex: 'F',
      registeredById: ownerOperatorId,
    },
  });
  patientId = patient.id;
  const therapy = await prisma.patientTherapy.create({
    data: {
      patientId,
      farmacoNome: 'Farmaco prescritto',
      dosaggio: '10 mg',
      viaSomministrazione: 'orale',
      tipo: 'periodica',
      stato: 'attiva',
      dataInizio: '2033-01-01',
      fasceMattina: true,
    },
  });
  therapyId = therapy.id;
  const glucoseScaleTherapy = await prisma.patientTherapy.create({
    data: {
      patientId,
      farmacoNome: 'Insulina test',
      dosaggio: 'Dose secondo schema glicemico',
      viaSomministrazione: 'sottocute',
      tipo: 'periodica',
      stato: 'attiva',
      dataInizio: '2033-01-01',
      fascePranzo: true,
      doseMode: 'glucose_scale',
      doseProtocol: {
        kind: 'blood_glucose',
        measurementUnit: 'mg/dL',
        doseUnit: 'unità',
        rules: [
          { minMgDl: 200, maxMgDl: 250, units: 4 },
          { minMgDl: 251, maxMgDl: 300, units: 6 },
          { minMgDl: 350, maxMgDl: 450, units: 8 },
        ],
      },
    },
  });
  glucoseScaleTherapyId = glucoseScaleTherapy.id;
  const app = express();
  app.use(express.json());
  app.use('/therapy-slots', therapyRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
      resolve();
    });
  });
});

test('nighttime assistant queue uses the clinical day and Rome clock for future and due doses', async () => {
  const now = new Date('2026-10-12T22:30:00Z'),
    clinicalDate = '2026-10-13';
  const rows = [];
  try {
    for (const time of ['08:00', '00:45'])
      rows.push(
        await prisma.patientTherapy.create({
          data: {
            patientId,
            farmacoNome: 'Synthetic night ' + time,
            dosaggio: '1 compressa',
            tipo: 'una_tantum',
            dataInizio: clinicalDate,
            dataSomministrazione: clinicalDate,
            orarioSomministrazione: time,
            fasceMattina: false,
          },
        }),
      );
    const read = (instant: Date) =>
      findTherapiesDue(dayKey(instant), { patientIds: [patientId] }, instant, 15, 10);
    const before = await read(now);
    assert.equal(before.overdueCount, 0);
    assert.equal(before.dueSoonCount, 1);
    assert.equal(before.dueSoon[0].scheduledTime, '00:45');
    assert.equal(before.dueSoon[0].minutesUntil, 15);
    const later = await read(new Date('2026-10-12T22:46:00Z'));
    assert.equal(later.overdueCount, 1);
    assert.equal(later.overdue[0].scheduledTime, '00:45');
    assert.equal(later.overdue[0].minutesLate, 1);
    assert.equal(later.dueSoonCount, 0);
  } finally {
    await prisma.patientTherapy.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } });
  }
});

test('scheduled request receipts replay each first outcome without changing clinical records', async () => {
  for (const notAdministered of [false, true]) {
    const therapy = await prisma.patientTherapy.create({
      data: {
        patientId,
        farmacoNome: 'Synthetic replay',
        dosaggio: '10 mg',
        dataInizio: date,
        fasceMattina: true,
      },
    });
    const endpoint = notAdministered ? 'not-administered' : 'confirm';
    const body = {
      patientId,
      therapyId: therapy.id,
      date,
      fascia: 'mattina',
      scheduledTime: '08:00',
      requestId: randomUUID(),
      expectedStato: 'da_erogare',
      ...(notAdministered ? { motivo: 'rifiuto', note: 'Test sintetico' } : {}),
    };
    const post = (patch = {}) =>
      fetch(`${base}/therapy-slots/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Operator-Id': ownerOperatorId,
          'X-Operator-Role': 'operatore',
        },
        body: JSON.stringify({ ...body, ...patch }),
      });
    try {
      const first = await post();
      assert.equal(first.status, 200, await first.clone().text());
      const initial = await first.json();
      const before = await prisma.medicationAdministration.findUniqueOrThrow({
        where: { id: initial.id },
      });
      const second = await post();
      assert.equal(second.status, 200);
      assert.equal(second.headers.get('Idempotent-Replayed'), 'true');
      assert.deepEqual(await second.json(), initial);
      assert.deepEqual(
        await prisma.medicationAdministration.findUniqueOrThrow({ where: { id: initial.id } }),
        before,
      );
      assert.equal((await post({ note: 'Richiesta modificata' })).status, 409);
      assert.equal((await post({ requestId: 'bad' })).status, 400);
      assert.equal((await post({ expectedStato: 'erogata' })).status, 400);
      assert.equal(
        await prisma.medicationAdministration.count({ where: { therapyId: therapy.id } }),
        1,
      );
      assert.equal(
        await prisma.therapyAdministrationReceipt.count({
          where: { actorId: ownerOperatorId, requestId: body.requestId },
        }),
        1,
      );
      await prisma.patient.update({ where: { id: patientId }, data: { registeredById: null } });
      try {
        assert.equal((await post()).status, 404, 'Replay must recheck current resident access');
      } finally {
        await prisma.patient.update({
          where: { id: patientId },
          data: { registeredById: ownerOperatorId },
        });
      }
    } finally {
      await prisma.therapyAdministrationReceipt.deleteMany({
        where: { actorId: ownerOperatorId, requestId: body.requestId },
      });
      await prisma.medicationAdministration.deleteMany({ where: { therapyId: therapy.id } });
      await prisma.patientTherapy.delete({ where: { id: therapy.id } });
    }
  }
});

test('concurrent retries of a scheduled request both return the same single record', async () => {
  const therapy = await prisma.patientTherapy.create({
    data: {
      patientId,
      farmacoNome: 'Synthetic concurrent retry',
      dosaggio: '10 mg',
      dataInizio: date,
      fasceMattina: true,
    },
  });
  const body = {
    patientId,
    therapyId: therapy.id,
    date,
    fascia: 'mattina',
    scheduledTime: '08:00',
    requestId: randomUUID(),
    expectedStato: 'da_erogare',
  };
  const post = () =>
    fetch(`${base}/therapy-slots/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Operator-Id': ownerOperatorId,
        'X-Operator-Role': 'operatore',
      },
      body: JSON.stringify(body),
    });
  try {
    const responses = await Promise.all([post(), post()]);
    assert.deepEqual(
      responses.map((r) => r.status),
      [200, 200],
    );
    assert.equal(
      responses.filter((r) => r.headers.get('Idempotent-Replayed') === 'true').length,
      1,
    );
    const records = await Promise.all(responses.map((r) => r.json()));
    assert.deepEqual(records[0], records[1]);
    assert.equal(
      await prisma.medicationAdministration.count({ where: { therapyId: therapy.id } }),
      1,
    );
    assert.equal(
      await prisma.therapyAdministrationReceipt.count({
        where: { actorId: ownerOperatorId, requestId: body.requestId },
      }),
      1,
    );
  } finally {
    await prisma.therapyAdministrationReceipt.deleteMany({
      where: { actorId: ownerOperatorId, requestId: body.requestId },
    });
    await prisma.medicationAdministration.deleteMany({ where: { therapyId: therapy.id } });
    await prisma.patientTherapy.delete({ where: { id: therapy.id } });
  }
});

test('a pending-only request cannot overwrite refusal; replay preserves its original snapshot', async () => {
  const therapy = await prisma.patientTherapy.create({
    data: {
      patientId,
      farmacoNome: 'Synthetic refused dose',
      dosaggio: '10 mg',
      dataInizio: date,
      fasceMattina: true,
    },
  });
  const body = {
    patientId,
    therapyId: therapy.id,
    date,
    fascia: 'mattina',
    scheduledTime: '08:00',
    requestId: randomUUID(),
    expectedStato: 'da_erogare',
    motivo: 'rifiuto',
  };
  const post = (endpoint: string, data: unknown) =>
    fetch(`${base}/therapy-slots/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Operator-Id': ownerOperatorId,
        'X-Operator-Role': 'operatore',
      },
      body: JSON.stringify(data),
    });
  try {
    const refused = await post('not-administered', body);
    assert.equal(refused.status, 200);
    const initial = await refused.json();
    const pending = await post('confirm', { ...body, requestId: randomUUID(), motivo: undefined });
    assert.equal(pending.status, 409);
    assert.match((await pending.json()).error, /non è più da erogare/);
    assert.equal(
      (await prisma.medicationAdministration.findUniqueOrThrow({ where: { id: initial.id } }))
        .stato,
      'non_erogata',
    );
    // Existing explicit callers remain compatible; an old receipt must still replay its first reply.
    const corrected = await post('confirm', {
      patientId,
      therapyId: therapy.id,
      date,
      fascia: 'mattina',
      scheduledTime: '08:00',
    });
    assert.equal(corrected.status, 200);
    const before = await prisma.medicationAdministration.findUniqueOrThrow({
      where: { id: initial.id },
    });
    const replay = await post('not-administered', body);
    assert.equal(replay.status, 200);
    assert.equal(replay.headers.get('Idempotent-Replayed'), 'true');
    assert.deepEqual(await replay.json(), initial);
    assert.deepEqual(
      await prisma.medicationAdministration.findUniqueOrThrow({ where: { id: initial.id } }),
      before,
    );
    assert.equal(before.stato, 'erogata');
    assert.equal(
      await prisma.medicationAdministration.count({ where: { therapyId: therapy.id } }),
      1,
    );
  } finally {
    await prisma.therapyAdministrationReceipt.deleteMany({
      where: { actorId: ownerOperatorId, requestId: body.requestId },
    });
    await prisma.medicationAdministration.deleteMany({ where: { therapyId: therapy.id } });
    await prisma.patientTherapy.delete({ where: { id: therapy.id } });
  }
});

test('one-off explicit clocks survive empty flags across feed, summary, assistant and writes', async () => {
  const clocks = ['00:15', '08:45', '11:30', '14:20', '18:10'];
  const rows = [];
  const actor = { id: ownerOperatorId, role: 'operatore' as const, name: 'Verified Owner' };
  const read = () => buildTherapySlotPage(date, { patientIds: [patientId] }, { limit: 100 }, actor);
  const due = () =>
    findTherapiesDue(date, { patientIds: [patientId] }, new Date(`${date}T23:59:00+02:00`), 15, 50);
  const create = (time: string | null) =>
    prisma.patientTherapy.create({
      data: {
        patientId,
        farmacoNome: 'Synthetic one-off ' + time,
        dosaggio: 'Dose sintetica prescritta',
        tipo: 'una_tantum',
        stato: 'attiva',
        dataInizio: date,
        dataSomministrazione: date,
        orarioSomministrazione: time,
        fasceMattina: false,
        fascePranzo: false,
        fascePomeriggio: false,
        fasceSera: false,
        fasceNotte: false,
      },
    });
  try {
    for (const time of [...clocks, '99:00', null]) rows.push(await create(time));
    const conflict = await create('11:30');
    rows.push(conflict);
    await prisma.therapySchedule.create({
      data: {
        therapyId: conflict.id,
        time: '12:30',
        fascia: 'pranzo',
        quantityNumerator: 2,
        quantityDenominator: 1,
        administrationUnit: 'compressa',
      },
    });
    const ids = new Set(rows.map((row) => row.id));
    const feed = (await read()).slots
      .flatMap((s) => s.patients.flatMap((p) => p.administrations))
      .filter((a) => ids.has(a.therapyId));
    assert.deepEqual(feed.map((a) => a.scheduledTime).sort(), [...clocks].sort());
    assert.ok(
      feed.every((a) => a.dosage === 'Dose sintetica prescritta' && a.quantityLabel === null),
    );
    const pending = (await due()).overdue.filter((a) => ids.has(a.therapyId));
    assert.deepEqual(pending.map((a) => a.scheduledTime).sort(), [...clocks].sort());
    const therapy = rows[2];
    const body = {
      patientId,
      therapyId: therapy.id,
      date,
      fascia: 'pranzo',
      scheduledTime: '11:30',
      farmacoDose: '999 invented units',
    };
    const write = (patch = {}) =>
      fetch(`${base}/therapy-slots/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Operator-Id': ownerOperatorId,
          'X-Operator-Role': 'operatore',
        },
        body: JSON.stringify({ ...body, ...patch }),
      });
    assert.equal((await write({ scheduledTime: '12:00' })).status, 409);
    assert.equal((await write({ fascia: 'mattina' })).status, 409);
    assert.equal((await write({ date: '2033-04-06' })).status, 404);
    assert.equal(
      await prisma.medicationAdministration.count({ where: { therapyId: therapy.id } }),
      0,
    );
    const before = (await read()).slots.find((s) => s.fascia === 'pranzo')!.summary;
    assert.equal((await write()).status, 200);
    const record = await prisma.medicationAdministration.findFirstOrThrow({
      where: { therapyId: therapy.id },
    });
    assert.equal(record.ora, '11:30');
    assert.equal(record.farmacoDose, 'Dose sintetica prescritta');
    assert.equal(record.operatoreId, ownerOperatorId);
    assert.equal(record.operatoreNome, ownerOperatorId);
    assert.equal((await write()).status, 409);
    const after = (await read()).slots.find((s) => s.fascia === 'pranzo')!.summary;
    assert.equal(after.total, before.total);
    assert.equal(after.pending, before.pending - 1);
    assert.equal(after.administered, before.administered + 1);
    // A one-off dose stays given even if its edited time crosses into a different band.
    await prisma.patientTherapy.update({
      where: { id: therapy.id },
      data: { orarioSomministrazione: '18:10' },
    });
    assert.equal((await write({ fascia: 'sera', scheduledTime: '18:10' })).status, 409);
    const moved = (await read()).slots.find((s) => s.fascia === 'sera')!;
    assert.equal(
      moved.patients.flatMap((p) => p.administrations).find((a) => a.therapyId === therapy.id)
        ?.status,
      'administered',
    );
    assert.equal(moved.summary.administered, 1);
    assert.deepEqual(
      await prisma.medicationAdministration.findFirstOrThrow({ where: { therapyId: therapy.id } }),
      record,
    );
    const refused = rows[1];
    const refusal = await fetch(`${base}/therapy-slots/not-administered`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Operator-Id': ownerOperatorId,
        'X-Operator-Role': 'operatore',
      },
      body: JSON.stringify({
        patientId,
        therapyId: refused.id,
        date,
        fascia: 'mattina',
        scheduledTime: '08:45',
        motivo: 'rifiuto',
        requestId: randomUUID(),
        expectedStato: 'da_erogare',
      }),
    });
    assert.equal(refusal.status, 200);
    const refusedRecord = await prisma.medicationAdministration.findFirstOrThrow({
      where: { therapyId: refused.id },
    });
    await prisma.patientTherapy.update({
      where: { id: refused.id },
      data: { orarioSomministrazione: '18:20' },
    });
    assert.equal(
      (
        await write({
          therapyId: refused.id,
          fascia: 'sera',
          scheduledTime: '18:20',
          requestId: randomUUID(),
          expectedStato: 'da_erogare',
        })
      ).status,
      409,
    );
    const refusedSlot = (await read()).slots.find((s) => s.fascia === 'sera')!;
    assert.equal(
      refusedSlot.patients.flatMap((p) => p.administrations).find((a) => a.therapyId === refused.id)
        ?.status,
      'not_administered',
    );
    assert.equal(refusedSlot.summary.notAdministered, 1);
    assert.deepEqual(
      await prisma.medicationAdministration.findFirstOrThrow({
        where: { therapyId: refused.id },
      }),
      refusedRecord,
    );
    assert.equal(
      (await due()).overdue.some((a) => a.therapyId === therapy.id),
      false,
    );
    assert.equal(
      await prisma.medicationAdministration.count({ where: { therapyId: therapy.id } }),
      1,
    );
  } finally {
    await prisma.medicationAdministration.deleteMany({
      where: { therapyId: { in: rows.map((row) => row.id) } },
    });
    await prisma.patientTherapy.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } });
  }
});

test('distinct same-band doses retain quantity, independent writes and exact summaries', async () => {
  const multi = await prisma.patientTherapy.create({
    data: {
      patientId,
      farmacoNome: 'Synthetic two-dose prescription',
      dosaggio: '',
      tipo: 'periodica',
      stato: 'attiva',
      dataInizio: '2033-01-01',
      fasceMattina: true,
      viaSomministrazione: 'orale',
      schedules: {
        create: [
          {
            time: '08:00',
            fascia: 'mattina',
            quantityNumerator: 1,
            quantityDenominator: 1,
            administrationUnit: 'compressa',
          },
          {
            time: '10:00',
            fascia: 'mattina',
            quantityNumerator: 2,
            quantityDenominator: 1,
            administrationUnit: 'compressa',
          },
        ],
      },
    },
  });
  const actor = { id: ownerOperatorId, role: 'operatore' as const, name: 'Verified Owner' };
  const read = () => buildTherapySlotPage(date, { patientIds: [patientId] }, { limit: 100 }, actor);
  const doses = async () =>
    (await read()).slots
      .flatMap((s) => s.patients)
      .flatMap((p) => p.administrations)
      .filter((a) => a.therapyId === multi.id);
  const write = (scheduledTime?: string, endpoint = 'confirm') =>
    fetch(`${base}/therapy-slots/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Operator-Id': ownerOperatorId,
        'X-Operator-Role': 'operatore',
      },
      body: JSON.stringify({
        patientId,
        therapyId: multi.id,
        date,
        fascia: 'mattina',
        scheduledTime,
        farmacoDose: '999 invented units',
        ...(endpoint === 'not-administered' ? { motivo: 'rifiuto' } : {}),
      }),
    });
  try {
    const initial = await doses();
    assert.deepEqual(
      initial.map((a) => a.scheduledTime),
      ['08:00', '10:00'],
    );
    assert.deepEqual(
      initial.map((a) => a.quantityLabel),
      ['1 compressa', '2 compressa'],
    );
    assert.equal(
      (await write()).status,
      400,
      'An ambiguous band must require explicit dose selection',
    );
    assert.equal((await write('09:00')).status, 409);
    const due = () =>
      findTherapiesDue(date, { patientIds: [patientId] }, new Date(`${date}T11:00:00Z`), 15, 50);
    assert.deepEqual(
      (await due()).overdue.filter((a) => a.therapyId === multi.id).map((a) => a.scheduledTime),
      ['08:00', '10:00'],
    );
    const before = (await read()).slots.find((s) => s.fascia === 'mattina')!.summary;
    assert.equal((await write('08:00')).status, 200);
    const afterFirst = await doses();
    assert.deepEqual(
      afterFirst.map((a) => a.status),
      ['administered', 'pending'],
    );
    const firstSummary = (await read()).slots.find((s) => s.fascia === 'mattina')!.summary;
    assert.equal(firstSummary.pending, before.pending - 1);
    assert.equal(firstSummary.administered, before.administered + 1);
    assert.deepEqual(
      (await due()).overdue.filter((a) => a.therapyId === multi.id).map((a) => a.scheduledTime),
      ['10:00'],
    );
    const responses = await Promise.all([write('10:00'), write('10:00')]);
    assert.ok(responses.some((response) => response.status === 200));
    for (const response of responses)
      assert.ok([200, 409].includes(response.status), await response.text());
    assert.equal(
      (await write('10:00')).status,
      409,
      'Retry must preserve the already recorded dose',
    );
    const records = await prisma.medicationAdministration.findMany({
      where: { therapyId: multi.id },
      orderBy: { ora: 'asc' },
    });
    assert.equal(records.length, 2);
    assert.deepEqual(
      records.map((r) => r.ora),
      ['08:00', '10:00'],
    );
    assert.deepEqual(
      records.map((r) => r.farmacoDose),
      ['1 compressa', '2 compressa'],
    );
    assert.notEqual(records[0].id, records[1].id);
    assert.equal((await write('08:00', 'not-administered')).status, 409);
    assert.deepEqual(
      (await doses()).map((a) => a.status),
      ['administered', 'administered'],
    );
  } finally {
    await prisma.patientTherapy.delete({ where: { id: multi.id } });
  }
});

test('a given single dose stays given after its time moves within the band (no double dose)', async () => {
  const single = await prisma.patientTherapy.create({
    data: {
      patientId,
      farmacoNome: 'Synthetic single-dose prescription',
      dosaggio: '',
      tipo: 'periodica',
      stato: 'attiva',
      dataInizio: '2033-01-01',
      fasceMattina: true,
      viaSomministrazione: 'orale',
      schedules: {
        create: [
          {
            time: '08:00',
            fascia: 'mattina',
            quantityNumerator: 1,
            quantityDenominator: 1,
            administrationUnit: 'compressa',
          },
        ],
      },
    },
  });
  const actor = { id: ownerOperatorId, role: 'operatore' as const, name: 'Verified Owner' };
  const read = () => buildTherapySlotPage(date, { patientIds: [patientId] }, { limit: 100 }, actor);
  const doses = async () =>
    (await read()).slots
      .flatMap((s) => s.patients)
      .flatMap((p) => p.administrations)
      .filter((a) => a.therapyId === single.id);
  const write = (scheduledTime: string, endpoint = 'confirm') =>
    fetch(`${base}/therapy-slots/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Operator-Id': ownerOperatorId,
        'X-Operator-Role': 'operatore',
      },
      body: JSON.stringify({
        patientId,
        therapyId: single.id,
        date,
        fascia: 'mattina',
        scheduledTime,
        ...(endpoint === 'not-administered' ? { motivo: 'rifiuto' } : {}),
      }),
    });
  const due = async () =>
    (
      await findTherapiesDue(
        date,
        { patientIds: [patientId] },
        new Date(`${date}T11:00:00Z`),
        15,
        50,
      )
    ).overdue.filter((a) => a.therapyId === single.id);
  try {
    assert.equal((await write('08:00')).status, 200);
    const summaryBefore = (await read()).slots.find((s) => s.fascia === 'mattina')!.summary;
    // The prescriber moves the same dose to 09:00 on the same day.
    await prisma.therapySchedule.updateMany({
      where: { therapyId: single.id },
      data: { time: '09:00' },
    });
    const moved = await doses();
    assert.deepEqual(
      moved.map((a) => [a.scheduledTime, a.status]),
      [['09:00', 'administered']],
    );
    assert.deepEqual(await due(), [], 'A given dose must not come back as overdue');
    const summaryAfter = (await read()).slots.find((s) => s.fascia === 'mattina')!.summary;
    assert.deepEqual(summaryAfter, summaryBefore);
    assert.equal((await write('09:00')).status, 409, 'A second confirmation is a double dose');
    assert.equal((await write('09:00', 'not-administered')).status, 409);
    const records = await prisma.medicationAdministration.findMany({
      where: { therapyId: single.id },
    });
    assert.equal(records.length, 1);
    assert.deepEqual([records[0].ora, records[0].stato], ['08:00', 'erogata']);
  } finally {
    await prisma.patientTherapy.delete({ where: { id: single.id } });
  }
});

test('a single dose recorded as not given and then moved is updated in place, not duplicated', async () => {
  const single = await prisma.patientTherapy.create({
    data: {
      patientId,
      farmacoNome: 'Synthetic refused dose',
      dosaggio: '5 mg',
      tipo: 'periodica',
      stato: 'attiva',
      dataInizio: '2033-01-01',
      fasceSera: true,
      viaSomministrazione: 'orale',
      schedules: {
        create: [
          {
            time: '20:00',
            fascia: 'sera',
            quantityNumerator: 1,
            quantityDenominator: 1,
            administrationUnit: 'compressa',
          },
        ],
      },
    },
  });
  const write = (scheduledTime: string, endpoint = 'confirm') =>
    fetch(`${base}/therapy-slots/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Operator-Id': ownerOperatorId,
        'X-Operator-Role': 'operatore',
      },
      body: JSON.stringify({
        patientId,
        therapyId: single.id,
        date,
        fascia: 'sera',
        scheduledTime,
        ...(endpoint === 'not-administered' ? { motivo: 'rifiuto' } : {}),
      }),
    });
  try {
    assert.equal((await write('20:00', 'not-administered')).status, 200);
    await prisma.therapySchedule.updateMany({
      where: { therapyId: single.id },
      data: { time: '21:00' },
    });
    assert.equal((await write('21:00')).status, 200);
    const records = await prisma.medicationAdministration.findMany({
      where: { therapyId: single.id },
    });
    assert.equal(records.length, 1);
    assert.deepEqual([records[0].ora, records[0].stato], ['21:00', 'erogata']);
  } finally {
    await prisma.patientTherapy.delete({ where: { id: single.id } });
  }
});

test('conditional insulin requires a measured glucose and stores the server-resolved dose', async () => {
  const headers = {
    'Content-Type': 'application/json',
    'X-Operator-Id': ownerOperatorId,
    'X-Operator-Role': 'operatore',
  };
  const request = (body: Record<string, unknown>) =>
    fetch(`${base}/therapy-slots/confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        patientId,
        therapyId: glucoseScaleTherapyId,
        fascia: 'pranzo',
        ...body,
      }),
    });

  const missing = await request({ date: '2033-04-07' });
  assert.equal(missing.status, 400, await missing.text());

  const uncovered = await request({ date: '2033-04-08', measuredGlucose: 325 });
  assert.equal(uncovered.status, 409, await uncovered.text());

  const covered = await request({
    date: '2033-04-09',
    measuredGlucose: 280,
    farmacoDose: '999 unità',
  });
  assert.equal(covered.status, 200, await covered.text());
  const stored = await prisma.medicationAdministration.findUniqueOrThrow({
    where: {
      therapyId_date_fascia_ora: {
        therapyId: glucoseScaleTherapyId,
        date: '2033-04-09',
        fascia: 'pranzo',
        ora: '12:00',
      },
    },
  });
  assert.equal(stored.farmacoDose, '6 unità (glicemia 280 mg/dL)');
  assert.deepEqual(stored.doseContext, {
    kind: 'blood_glucose',
    glucoseMgDl: 280,
    doseUnits: 6,
    doseUnit: 'unità',
  });
});

test('conditional insulin rejects coercible non-number glucose values', async () => {
  for (const [index, measuredGlucose] of [null, true, [280]].entries()) {
    const response = await fetch(`${base}/therapy-slots/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Operator-Id': ownerOperatorId,
        'X-Operator-Role': 'operatore',
      },
      body: JSON.stringify({
        patientId,
        therapyId: glucoseScaleTherapyId,
        date: `2033-04-${10 + index}`,
        fascia: 'pranzo',
        measuredGlucose,
      }),
    });
    assert.equal(response.status, 400, await response.text());
  }
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.patient.delete({ where: { id: patientId } }).catch(() => {});
  await prisma.user.delete({ where: { id: ownerUserId } }).catch(() => {});
});

test('therapy confirm persists prescription fields, not spoofed client drug data', async () => {
  const response = await fetch(`${base}/therapy-slots/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Operator-Id': ownerOperatorId,
      'X-Operator-Role': 'operatore',
      'X-Operator-Name': 'Verified Name',
    },
    body: JSON.stringify({
      patientId,
      therapyId,
      date,
      fascia: 'mattina',
      farmacoNome: 'Farmaco falsificato',
      farmacoDose: '9999 mg',
      farmacoVia: 'ignota',
      operatoreId: 'spoofed-op',
      operatoreNome: 'Spoofed Name',
    }),
  });
  assert.equal(response.status, 200, await response.text());
  const stored = await prisma.medicationAdministration.findUniqueOrThrow({
    where: { therapyId_date_fascia_ora: { therapyId, date, fascia: 'mattina', ora: '08:00' } },
  });
  assert.equal(stored.patientId, patientId);
  assert.equal(stored.farmacoDose, '10 mg');
  assert.equal(stored.farmacoVia, 'orale');
  assert.equal(stored.operatoreId, ownerOperatorId);
  assert.notEqual(stored.farmacoNome, 'Farmaco falsificato');
});

test('therapy confirm rejects a mismatched therapy/patient pair', async () => {
  const other = await prisma.patient.create({
    data: {
      medicalRecordNumber: `MRN-THERAPY-OTHER-${Date.now()}`,
      firstName: 'Other',
      lastName: 'Patient',
      dateOfBirth: new Date('1970-01-01'),
      sex: 'F',
    },
  });
  try {
    const response = await fetch(`${base}/therapy-slots/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Operator-Id': ownerOperatorId,
        'X-Operator-Role': 'operatore',
      },
      body: JSON.stringify({
        patientId: other.id,
        therapyId,
        date,
        fascia: 'mattina',
        ora: '08:00',
      }),
    });
    assert.equal(response.status, 404);
  } finally {
    await prisma.patient.delete({ where: { id: other.id } }).catch(() => {});
  }
});

test('two same-name prescriptions keep independent administration records', async () => {
  const second = await prisma.patientTherapy.create({
    data: {
      patientId,
      farmacoNome: 'Farmaco prescritto',
      dosaggio: '20 mg',
      viaSomministrazione: 'orale',
      tipo: 'periodica',
      stato: 'attiva',
      dataInizio: '2033-01-01',
      fasceMattina: true,
    },
  });
  const response = await fetch(`${base}/therapy-slots/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Operator-Id': ownerOperatorId,
      'X-Operator-Role': 'operatore',
    },
    body: JSON.stringify({
      patientId,
      therapyId: second.id,
      date,
      fascia: 'mattina',
      ora: '08:00',
    }),
  });
  assert.equal(response.status, 200, await response.text());
  const rows = await prisma.medicationAdministration.findMany({
    where: { patientId, date, fascia: 'mattina', farmacoNome: 'Farmaco prescritto' },
    orderBy: { farmacoDose: 'asc' },
  });
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row) => row.therapyId).sort(), [therapyId, second.id].sort());
  assert.deepEqual(
    rows.map((row) => row.farmacoDose),
    ['10 mg', '20 mg'],
  );
});

test('ordinary operators cannot read or mutate another owner patient; managers retain global scope', async () => {
  const suffix = Date.now();
  const otherOperatorId = `other-op-${suffix}`;
  const otherUser = await prisma.user.create({
    data: {
      email: `therapy-other-${suffix}@example.test`,
      passwordHash: 'not-used-by-route-test',
      fullName: 'Other Owner',
      operator: { create: { id: otherOperatorId, ruolo: 'operatore' } },
    },
  });
  const otherPatient = await prisma.patient.create({
    data: {
      medicalRecordNumber: `MRN-THERAPY-CROSS-${suffix}`,
      firstName: 'Scoped',
      lastName: 'Patient',
      dateOfBirth: new Date('1970-01-01'),
      sex: 'F',
      registeredById: otherOperatorId,
      therapies: {
        create: {
          farmacoNome: 'Scoped drug',
          dosaggio: '5 mg',
          viaSomministrazione: 'orale',
          tipo: 'periodica',
          stato: 'attiva',
          dataInizio: '2033-01-01',
          fasceMattina: true,
        },
      },
    },
    include: { therapies: true },
  });
  const otherTherapyId = otherPatient.therapies[0]!.id;
  const crossDate = '2033-04-06';
  try {
    const operatorHeaders = {
      'X-Operator-Id': ownerOperatorId,
      'X-Operator-Role': 'operatore',
    };
    const operatorRead = await fetch(`${base}/therapy-slots?date=${crossDate}`, {
      headers: operatorHeaders,
    });
    assert.equal(operatorRead.status, 200);
    const operatorSlots = (await operatorRead.json()) as Array<{
      patients: Array<{ patientId: string }>;
    }>;
    assert.equal(
      operatorSlots.some((slot) =>
        slot.patients.some((patient) => patient.patientId === otherPatient.id),
      ),
      false,
    );

    const deniedWrite = await fetch(`${base}/therapy-slots/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...operatorHeaders },
      body: JSON.stringify({
        patientId: otherPatient.id,
        therapyId: otherTherapyId,
        date: crossDate,
        fascia: 'mattina',
      }),
    });
    assert.equal(deniedWrite.status, 404);
    assert.equal(
      await prisma.medicationAdministration.count({
        where: { therapyId: otherTherapyId, date: crossDate, fascia: 'mattina', ora: '08:00' },
      }),
      0,
    );

    const managerHeaders = {
      'X-Operator-Id': 'verified-manager',
      'X-Operator-Role': 'manager',
    };
    const managerRead = await fetch(`${base}/therapy-slots?date=${crossDate}`, {
      headers: managerHeaders,
    });
    assert.equal(managerRead.status, 200);
    const managerSlots = (await managerRead.json()) as Array<{
      patients: Array<{ patientId: string }>;
    }>;
    assert.equal(
      managerSlots.some((slot) =>
        slot.patients.some((patient) => patient.patientId === otherPatient.id),
      ),
      true,
    );
    const managerWrite = await fetch(`${base}/therapy-slots/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...managerHeaders },
      body: JSON.stringify({
        patientId: otherPatient.id,
        therapyId: otherTherapyId,
        date: crossDate,
        fascia: 'mattina',
      }),
    });
    assert.equal(managerWrite.status, 200, await managerWrite.text());
  } finally {
    await prisma.patient.delete({ where: { id: otherPatient.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: otherUser.id } }).catch(() => {});
  }
});
