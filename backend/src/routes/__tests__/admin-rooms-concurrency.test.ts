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
import { patientAssignmentRouter } from '../admin-rooms.js';

let server: Server;
let base = '';
const AUTH_HEADERS = { 'X-Operator-Id': 'test-manager', 'X-Operator-Role': 'manager' };

before(async () => {
  const app = express();
  app.use(express.json());
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
