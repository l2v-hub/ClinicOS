import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import { prisma } from '../../lib/prisma.js';
import therapyRouter from '../therapy.js';

let server: Server;
let base = '';
let patientId = '';
let therapyId = '';
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
    where: { therapyId_date_fascia: { therapyId, date, fascia: 'mattina' } },
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
      body: JSON.stringify({ patientId: other.id, therapyId, date, fascia: 'mattina' }),
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
    body: JSON.stringify({ patientId, therapyId: second.id, date, fascia: 'mattina' }),
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
    assert.equal(operatorRead.status, 200, await operatorRead.text());
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
        where: { therapyId: otherTherapyId, date: crossDate, fascia: 'mattina' },
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
    assert.equal(managerRead.status, 200, await managerRead.text());
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
