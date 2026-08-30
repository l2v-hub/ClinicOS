// Race-condition regression test for the advisory-lock fix in admin-rooms.ts
// (POST /patients/:patientId/room-assignments). Two callers request the SAME bed for
// overlapping periods at the same instant via Promise.all: WITHOUT the pg_advisory_xact_lock
// both could pass the overlap check (findMany + rangesOverlap) before either commits, double-
// booking the bed. WITH the lock, the second transaction waits, re-reads the post-commit
// assignment, and correctly rejects with 409.
//
// Same express-app-in-process pattern as routes/__tests__/patients-auth.test.ts. Needs a
// reachable Postgres — not executable in this sandbox without DATABASE_URL pointing at a real
// database (see the backend agent's report for what was verified without a DB).

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import { prisma } from '../../lib/prisma.js';
import { adminRouter, patientAssignmentRouter } from '../admin-rooms.js';

let server: Server;
let base = '';
const AUTH_HEADERS = { 'X-Operator-Id': 'test-manager', 'X-Operator-Role': 'manager' };

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/admin', adminRouter);
  app.use('/patients', patientAssignmentRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const info = server.address();
      const porta = typeof info === 'object' && info ? info.port : 0;
      base = `http://127.0.0.1:${porta}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function makePatient(tag: string) {
  return prisma.patient.create({
    data: {
      medicalRecordNumber: `MRN-BED-CC-${tag}-${Date.now()}`,
      firstName: 'Test',
      lastName: `Concorrenza${tag}`,
      dateOfBirth: new Date('1970-01-01'),
      sex: 'M',
    },
  });
}

test('admin-rooms: due assegnazioni letto concorrenti sullo stesso bed/periodo → una sola 201, l’altra 409', async () => {
  const room = await prisma.room.create({
    data: { numero: `TEST-CC-${Date.now()}`, tipo: 'singola' },
  });
  const bed = await prisma.bed.create({ data: { roomId: room.id, label: 'A' } });
  const patientA = await makePatient('A');
  const patientB = await makePatient('B');

  try {
    const body = (patientId: string) =>
      JSON.stringify({ bedId: bed.id, startDate: '2031-03-01', endDate: null, patientId });

    const [resA, resB] = await Promise.all([
      fetch(`${base}/patients/${patientA.id}/room-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
        body: body(patientA.id),
      }),
      fetch(`${base}/patients/${patientB.id}/room-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
        body: body(patientB.id),
      }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    assert.deepEqual(
      statuses,
      [201, 409],
      `atteso esattamente un 201 e un 409, ricevuto: ${resA.status}, ${resB.status}`,
    );

    // Nessuna doppia occupazione: una sola assegnazione persistita per quel letto/periodo.
    const assignments = await prisma.patientRoomAssignment.findMany({ where: { bedId: bed.id } });
    assert.equal(assignments.length, 1, 'deve esistere una sola assegnazione per il letto conteso');
  } finally {
    await prisma.patientRoomAssignment.deleteMany({ where: { bedId: bed.id } }).catch(() => {});
    await prisma.patient.delete({ where: { id: patientA.id } }).catch(() => {});
    await prisma.patient.delete({ where: { id: patientB.id } }).catch(() => {});
    await prisma.bed.delete({ where: { id: bed.id } }).catch(() => {});
    await prisma.room.delete({ where: { id: room.id } }).catch(() => {});
  }
});

test('admin-rooms: lo stesso paziente su due letti concorrenti ottiene una sola assegnazione aperta', async () => {
  const room = await prisma.room.create({
    data: { numero: `TEST-PAT-CC-${Date.now()}`, tipo: 'doppia' },
  });
  const [bedA, bedB] = await Promise.all([
    prisma.bed.create({ data: { roomId: room.id, label: 'A' } }),
    prisma.bed.create({ data: { roomId: room.id, label: 'B' } }),
  ]);
  const patient = await makePatient('SAME');

  try {
    const request = (bedId: string) =>
      fetch(`${base}/patients/${patient.id}/room-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
        body: JSON.stringify({ bedId, startDate: '2031-03-01' }),
      });

    const responses = await Promise.all([request(bedA.id), request(bedB.id)]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);

    const openAssignments = await prisma.patientRoomAssignment.findMany({
      where: { patientId: patient.id, endDate: null },
    });
    assert.equal(openAssignments.length, 1, 'il paziente deve avere un solo letto aperto');
  } finally {
    await prisma.patientRoomAssignment
      .deleteMany({ where: { patientId: patient.id } })
      .catch(() => {});
    await prisma.patient.delete({ where: { id: patient.id } }).catch(() => {});
    await prisma.bed.deleteMany({ where: { roomId: room.id } }).catch(() => {});
    await prisma.room.delete({ where: { id: room.id } }).catch(() => {});
  }
});

test('admin-rooms: intervalli finiti concorrenti dello stesso paziente non si sovrappongono', async () => {
  const room = await prisma.room.create({
    data: { numero: `TEST-PAT-FIN-${Date.now()}`, tipo: 'doppia' },
  });
  const [bedA, bedB] = await Promise.all([
    prisma.bed.create({ data: { roomId: room.id, label: 'A' } }),
    prisma.bed.create({ data: { roomId: room.id, label: 'B' } }),
  ]);
  const patient = await makePatient('FINITE');

  try {
    const request = (bedId: string) =>
      fetch(`${base}/patients/${patient.id}/room-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
        body: JSON.stringify({ bedId, startDate: '2031-03-01', endDate: '2031-03-10' }),
      });

    const responses = await Promise.all([request(bedA.id), request(bedB.id)]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
    assert.equal(await prisma.patientRoomAssignment.count({ where: { patientId: patient.id } }), 1);
  } finally {
    await prisma.patientRoomAssignment
      .deleteMany({ where: { patientId: patient.id } })
      .catch(() => {});
    await prisma.patient.delete({ where: { id: patient.id } }).catch(() => {});
    await prisma.bed.deleteMany({ where: { roomId: room.id } }).catch(() => {});
    await prisma.room.delete({ where: { id: room.id } }).catch(() => {});
  }
});

test('admin-rooms: PUT non può estendere un soggiorno sopra un altro letto del paziente', async () => {
  const room = await prisma.room.create({
    data: { numero: `TEST-PUT-SEQ-${Date.now()}`, tipo: 'doppia' },
  });
  const [bedA, bedB] = await Promise.all([
    prisma.bed.create({ data: { roomId: room.id, label: 'A' } }),
    prisma.bed.create({ data: { roomId: room.id, label: 'B' } }),
  ]);
  const patient = await makePatient('PUT-SEQ');
  const first = await prisma.patientRoomAssignment.create({
    data: {
      patientId: patient.id,
      roomId: room.id,
      bedId: bedA.id,
      startDate: '2031-03-01',
      endDate: '2031-03-05',
    },
  });
  await prisma.patientRoomAssignment.create({
    data: {
      patientId: patient.id,
      roomId: room.id,
      bedId: bedB.id,
      startDate: '2031-03-10',
      endDate: '2031-03-15',
    },
  });

  try {
    const response = await fetch(`${base}/patients/${patient.id}/room-assignments/${first.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
      body: JSON.stringify({ endDate: '2031-03-12' }),
    });
    assert.equal(response.status, 409);
    assert.equal(
      (await prisma.patientRoomAssignment.findUniqueOrThrow({ where: { id: first.id } })).endDate,
      '2031-03-05',
    );
  } finally {
    await prisma.patientRoomAssignment
      .deleteMany({ where: { patientId: patient.id } })
      .catch(() => {});
    await prisma.patient.delete({ where: { id: patient.id } }).catch(() => {});
    await prisma.bed.deleteMany({ where: { roomId: room.id } }).catch(() => {});
    await prisma.room.delete({ where: { id: room.id } }).catch(() => {});
  }
});

test('admin-rooms: POST e PUT concorrenti non possono lasciare due soggiorni aperti', async () => {
  const room = await prisma.room.create({
    data: { numero: `TEST-PUT-CC-${Date.now()}`, tipo: 'doppia' },
  });
  const [bedA, bedB] = await Promise.all([
    prisma.bed.create({ data: { roomId: room.id, label: 'A' } }),
    prisma.bed.create({ data: { roomId: room.id, label: 'B' } }),
  ]);
  const patient = await makePatient('PUT-CC');
  const first = await prisma.patientRoomAssignment.create({
    data: {
      patientId: patient.id,
      roomId: room.id,
      bedId: bedA.id,
      startDate: '2031-03-01',
      endDate: null,
    },
  });

  try {
    const [postResponse, putResponse] = await Promise.all([
      fetch(`${base}/patients/${patient.id}/room-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
        body: JSON.stringify({ bedId: bedB.id, startDate: '2031-03-10' }),
      }),
      fetch(`${base}/patients/${patient.id}/room-assignments/${first.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
        body: JSON.stringify({ endDate: null }),
      }),
    ]);
    assert.equal(postResponse.status, 201);
    assert.ok([200, 409].includes(putResponse.status), `PUT inatteso: ${putResponse.status}`);

    const assignments = await prisma.patientRoomAssignment.findMany({
      where: { patientId: patient.id },
    });
    for (let i = 0; i < assignments.length; i += 1) {
      for (let j = i + 1; j < assignments.length; j += 1) {
        const left = assignments[i];
        const right = assignments[j];
        const overlaps =
          (right.endDate === null || left.startDate <= right.endDate) &&
          (left.endDate === null || right.startDate <= left.endDate);
        assert.equal(overlaps, false, `intervalli sovrapposti: ${left.id}, ${right.id}`);
      }
    }
  } finally {
    await prisma.patientRoomAssignment
      .deleteMany({ where: { patientId: patient.id } })
      .catch(() => {});
    await prisma.patient.delete({ where: { id: patient.id } }).catch(() => {});
    await prisma.bed.deleteMany({ where: { roomId: room.id } }).catch(() => {});
    await prisma.room.delete({ where: { id: room.id } }).catch(() => {});
  }
});

test('admin-rooms: POST assegnazione e DELETE letto non possono perdere una scrittura 201', async () => {
  const room = await prisma.room.create({
    data: { numero: `TEST-DEL-BED-${Date.now()}`, tipo: 'singola' },
  });
  const bed = await prisma.bed.create({ data: { roomId: room.id, label: 'A' } });
  const patient = await makePatient('DEL-BED');

  try {
    const [postResponse, deleteResponse] = await Promise.all([
      fetch(`${base}/patients/${patient.id}/room-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
        body: JSON.stringify({ bedId: bed.id, startDate: '2031-04-01' }),
      }),
      fetch(`${base}/admin/beds/${bed.id}`, { method: 'DELETE', headers: AUTH_HEADERS }),
    ]);

    assert.notDeepEqual([postResponse.status, deleteResponse.status], [201, 204]);
    const assignment = await prisma.patientRoomAssignment.findFirst({
      where: { patientId: patient.id, bedId: bed.id },
    });
    if (postResponse.status === 201) {
      assert.equal(deleteResponse.status, 409);
      assert.ok(assignment, 'una POST 201 deve restare persistita');
    } else {
      assert.equal(deleteResponse.status, 204);
      assert.ok([404, 409].includes(postResponse.status), `POST inatteso: ${postResponse.status}`);
      assert.equal(assignment, null);
    }
  } finally {
    await prisma.patientRoomAssignment
      .deleteMany({ where: { patientId: patient.id } })
      .catch(() => {});
    await prisma.patient.delete({ where: { id: patient.id } }).catch(() => {});
    await prisma.bed.deleteMany({ where: { roomId: room.id } }).catch(() => {});
    await prisma.room.delete({ where: { id: room.id } }).catch(() => {});
  }
});

test('admin-rooms: POST assegnazione e DELETE stanza non possono perdere una scrittura 201', async () => {
  const room = await prisma.room.create({
    data: { numero: `TEST-DEL-ROOM-${Date.now()}`, tipo: 'singola' },
  });
  const bed = await prisma.bed.create({ data: { roomId: room.id, label: 'A' } });
  const patient = await makePatient('DEL-ROOM');

  try {
    const [postResponse, deleteResponse] = await Promise.all([
      fetch(`${base}/patients/${patient.id}/room-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
        body: JSON.stringify({ bedId: bed.id, startDate: '2031-04-01' }),
      }),
      fetch(`${base}/admin/rooms/${room.id}`, { method: 'DELETE', headers: AUTH_HEADERS }),
    ]);

    assert.notDeepEqual([postResponse.status, deleteResponse.status], [201, 204]);
    const assignment = await prisma.patientRoomAssignment.findFirst({
      where: { patientId: patient.id, bedId: bed.id },
    });
    if (postResponse.status === 201) {
      assert.equal(deleteResponse.status, 409);
      assert.ok(assignment, 'una POST 201 deve restare persistita');
    } else {
      assert.equal(deleteResponse.status, 204);
      assert.ok([404, 409].includes(postResponse.status), `POST inatteso: ${postResponse.status}`);
      assert.equal(assignment, null);
    }
  } finally {
    await prisma.patientRoomAssignment
      .deleteMany({ where: { patientId: patient.id } })
      .catch(() => {});
    await prisma.patient.delete({ where: { id: patient.id } }).catch(() => {});
    await prisma.bed.deleteMany({ where: { roomId: room.id } }).catch(() => {});
    await prisma.room.delete({ where: { id: room.id } }).catch(() => {});
  }
});

test('admin-rooms: riduzione stanza e POST assegnazione non possono cancellare un soggiorno 201', async () => {
  const room = await prisma.room.create({
    data: { numero: `TEST-SHRINK-${Date.now()}`, tipo: 'doppia' },
  });
  await prisma.bed.create({ data: { roomId: room.id, label: 'A' } });
  const bedB = await prisma.bed.create({ data: { roomId: room.id, label: 'B' } });
  const patient = await makePatient('SHRINK');

  try {
    const [postResponse, shrinkResponse] = await Promise.all([
      fetch(`${base}/patients/${patient.id}/room-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
        body: JSON.stringify({ bedId: bedB.id, startDate: '2031-04-01' }),
      }),
      fetch(`${base}/admin/rooms/${room.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
        body: JSON.stringify({ tipo: 'singola' }),
      }),
    ]);

    assert.notDeepEqual([postResponse.status, shrinkResponse.status], [201, 200]);
    const assignment = await prisma.patientRoomAssignment.findFirst({
      where: { patientId: patient.id, bedId: bedB.id },
    });
    if (postResponse.status === 201) {
      assert.equal(shrinkResponse.status, 409);
      assert.ok(assignment, 'una POST 201 deve restare persistita');
    } else {
      assert.equal(shrinkResponse.status, 200);
      assert.ok([404, 409].includes(postResponse.status), `POST inatteso: ${postResponse.status}`);
      assert.equal(assignment, null);
    }
  } finally {
    await prisma.patientRoomAssignment
      .deleteMany({ where: { patientId: patient.id } })
      .catch(() => {});
    await prisma.patient.delete({ where: { id: patient.id } }).catch(() => {});
    await prisma.bed.deleteMany({ where: { roomId: room.id } }).catch(() => {});
    await prisma.room.delete({ where: { id: room.id } }).catch(() => {});
  }
});

test('admin-rooms: aggiunta letto rispetta il limite complessivo sotto lock stanza', async () => {
  const room = await prisma.room.create({
    data: {
      numero: `TEST-BED-CAP-${Date.now()}`,
      tipo: 'altra',
      beds: { create: Array.from({ length: 8 }, (_, index) => ({ label: String(index + 1) })) },
    },
  });

  try {
    const response = await fetch(`${base}/admin/rooms/${room.id}/beds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
      body: JSON.stringify({ label: '9' }),
    });
    assert.equal(response.status, 409);
    assert.equal(await prisma.bed.count({ where: { roomId: room.id } }), 8);
  } finally {
    await prisma.bed.deleteMany({ where: { roomId: room.id } }).catch(() => {});
    await prisma.room.delete({ where: { id: room.id } }).catch(() => {});
  }
});

test('admin-rooms: doppia DELETE assegnazione concorrente produce 204 e 404, mai 500', async () => {
  const room = await prisma.room.create({
    data: { numero: `TEST-ASG-DEL-${Date.now()}`, tipo: 'singola' },
  });
  const bed = await prisma.bed.create({ data: { roomId: room.id, label: 'A' } });
  const patient = await makePatient('ASG-DEL');
  const assignment = await prisma.patientRoomAssignment.create({
    data: {
      patientId: patient.id,
      roomId: room.id,
      bedId: bed.id,
      startDate: '2019-05-01',
      endDate: '2019-05-02',
    },
  });

  try {
    const remove = () =>
      fetch(`${base}/patients/${patient.id}/room-assignments/${assignment.id}`, {
        method: 'DELETE',
        headers: AUTH_HEADERS,
      });
    const responses = await Promise.all([remove(), remove()]);

    assert.deepEqual(responses.map((response) => response.status).sort(), [204, 404]);
    assert.equal(await prisma.patientRoomAssignment.count({ where: { id: assignment.id } }), 0);
  } finally {
    await prisma.patientRoomAssignment
      .deleteMany({ where: { patientId: patient.id } })
      .catch(() => {});
    await prisma.patient.delete({ where: { id: patient.id } }).catch(() => {});
    await prisma.bed.deleteMany({ where: { roomId: room.id } }).catch(() => {});
    await prisma.room.delete({ where: { id: room.id } }).catch(() => {});
  }
});

test('admin-rooms: DELETE assegnazione concorrente con DELETE letto non produce 500', async () => {
  const room = await prisma.room.create({
    data: { numero: `TEST-ASG-BED-DEL-${Date.now()}`, tipo: 'singola' },
  });
  const bed = await prisma.bed.create({ data: { roomId: room.id, label: 'A' } });
  const patient = await makePatient('ASG-BED-DEL');
  const assignment = await prisma.patientRoomAssignment.create({
    data: {
      patientId: patient.id,
      roomId: room.id,
      bedId: bed.id,
      startDate: '2019-05-01',
      endDate: '2019-05-02',
    },
  });

  try {
    const [assignmentResponse, bedResponse] = await Promise.all([
      fetch(`${base}/patients/${patient.id}/room-assignments/${assignment.id}`, {
        method: 'DELETE',
        headers: AUTH_HEADERS,
      }),
      fetch(`${base}/admin/beds/${bed.id}`, { method: 'DELETE', headers: AUTH_HEADERS }),
    ]);

    assert.ok([204, 404].includes(assignmentResponse.status));
    assert.equal(bedResponse.status, 204);
    assert.notEqual(assignmentResponse.status, 500);
    assert.notEqual(bedResponse.status, 500);
  } finally {
    await prisma.patientRoomAssignment
      .deleteMany({ where: { patientId: patient.id } })
      .catch(() => {});
    await prisma.patient.delete({ where: { id: patient.id } }).catch(() => {});
    await prisma.bed.deleteMany({ where: { roomId: room.id } }).catch(() => {});
    await prisma.room.delete({ where: { id: room.id } }).catch(() => {});
  }
});

test("admin-rooms: DELETE con patientId diverso resta 404 e non rimuove l'assegnazione", async () => {
  const room = await prisma.room.create({
    data: { numero: `TEST-ASG-SCOPE-${Date.now()}`, tipo: 'singola' },
  });
  const bed = await prisma.bed.create({ data: { roomId: room.id, label: 'A' } });
  const patient = await makePatient('ASG-SCOPE-A');
  const otherPatient = await makePatient('ASG-SCOPE-B');
  const assignment = await prisma.patientRoomAssignment.create({
    data: {
      patientId: patient.id,
      roomId: room.id,
      bedId: bed.id,
      startDate: '2031-05-01',
    },
  });

  try {
    const response = await fetch(
      `${base}/patients/${otherPatient.id}/room-assignments/${assignment.id}`,
      { method: 'DELETE', headers: AUTH_HEADERS },
    );
    assert.equal(response.status, 404);
    assert.ok(await prisma.patientRoomAssignment.findUnique({ where: { id: assignment.id } }));
  } finally {
    await prisma.patientRoomAssignment.deleteMany({ where: { id: assignment.id } }).catch(() => {});
    await prisma.patient.delete({ where: { id: patient.id } }).catch(() => {});
    await prisma.patient.delete({ where: { id: otherPatient.id } }).catch(() => {});
    await prisma.bed.deleteMany({ where: { roomId: room.id } }).catch(() => {});
    await prisma.room.delete({ where: { id: room.id } }).catch(() => {});
  }
});
