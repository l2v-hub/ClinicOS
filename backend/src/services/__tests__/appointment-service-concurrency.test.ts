// Race-condition regression test for the advisory-lock fix in appointment-service.ts
// (createAppointment/updateAppointment). Two callers hit the exact same operator+slot at the
// same instant via Promise.all: WITHOUT the pg_advisory_xact_lock both could pass the
// findConflict check before either commits and both would be created. WITH the lock, the second
// transaction waits, re-reads post-commit state, and correctly rejects with SlotConflictError.
//
// Needs a reachable Postgres (same node:test + prisma pattern as appointment-service.test.ts).
// Not executable in this sandbox without DATABASE_URL pointing at a real database — see the
// backend agent's report for what was verified without a DB (tsc --noEmit only).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma.js';
import { createAppointment, updateAppointment, SlotConflictError } from '../appointment-service.js';

async function makePatient(tag: string) {
  return prisma.patient.create({
    data: {
      medicalRecordNumber: `MRN-APPT-CC-${tag}-${Date.now()}`,
      firstName: 'Test',
      lastName: `Concorrenza${tag}`,
      dateOfBirth: new Date('1970-01-01'),
      sex: 'M',
    },
  });
}

async function cleanupOperators(...ids: string[]) {
  for (const id of ids) {
    await prisma.operator.delete({ where: { id } }).catch(() => {});
    await prisma.user.delete({ where: { email: `${id}@clinicos.local` } }).catch(() => {});
  }
}

test('appointment-service: due createAppointment concorrenti sullo stesso operatore+slot → una sola vince', async () => {
  const patientA = await makePatient('A');
  const patientB = await makePatient('B');
  const opId = `test-op-cc-${Date.now()}`;
  try {
    const input = {
      operatorId: opId,
      operatorName: 'Op Concorrenza Test',
      data: '2031-02-20',
      ora: '09:00',
      tipologia: 'visita',
    };

    const results = await Promise.allSettled([
      createAppointment({ ...input, patientId: patientA.id }),
      createAppointment({ ...input, patientId: patientB.id }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Esattamente una richiesta va a buon fine, l'altra riceve SlotConflictError (409 lato route).
    assert.equal(fulfilled.length, 1, 'esattamente una createAppointment deve avere successo');
    assert.equal(
      rejected.length,
      1,
      'esattamente una createAppointment deve fallire per conflitto',
    );
    const rejection = rejected[0] as PromiseRejectedResult;
    assert.ok(
      rejection.reason instanceof SlotConflictError,
      `atteso SlotConflictError, ricevuto: ${String(rejection.reason)}`,
    );

    // Nessuna doppia occupazione: una sola riga persistita per quello slot/operatore.
    const rows = await prisma.appointment.findMany({
      where: { operatorId: opId, scheduledAt: new Date('2031-02-20T09:00:00') },
    });
    assert.equal(rows.length, 1, 'deve esistere una sola riga per lo slot conteso');
  } finally {
    await prisma.patient.delete({ where: { id: patientA.id } }).catch(() => {});
    await prisma.patient.delete({ where: { id: patientB.id } }).catch(() => {});
    await cleanupOperators(opId);
  }
});

test('appointment-service: due updateAppointment concorrenti verso lo stesso slot destinazione → una sola vince', async () => {
  const patient = await makePatient('C');
  const opId = `test-op-cc-upd-${Date.now()}`;
  try {
    // Tre appuntamenti dello stesso operatore: due verranno spostati in concorrenza sullo stesso
    // slot libero (12:00), il terzo resta fermo lì e non c'entra nella corsa.
    const apt1 = await createAppointment({
      patientId: patient.id,
      operatorId: opId,
      data: '2031-02-21',
      ora: '10:00',
      tipologia: 'controllo',
    });
    const apt2 = await createAppointment({
      patientId: patient.id,
      operatorId: opId,
      data: '2031-02-21',
      ora: '11:00',
      tipologia: 'controllo',
    });

    const results = await Promise.allSettled([
      updateAppointment(apt1.id, { ora: '12:00' }),
      updateAppointment(apt2.id, { ora: '12:00' }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.equal(fulfilled.length, 1, 'esattamente una updateAppointment deve avere successo');
    assert.equal(
      rejected.length,
      1,
      'esattamente una updateAppointment deve fallire per conflitto',
    );
    const rejection = rejected[0] as PromiseRejectedResult;
    assert.ok(
      rejection.reason instanceof SlotConflictError,
      `atteso SlotConflictError, ricevuto: ${String(rejection.reason)}`,
    );

    const rows = await prisma.appointment.findMany({
      where: { operatorId: opId, scheduledAt: new Date('2031-02-21T12:00:00') },
    });
    assert.equal(rows.length, 1, 'deve esistere una sola riga sullo slot 12:00 conteso');
  } finally {
    await prisma.patient.delete({ where: { id: patient.id } }).catch(() => {});
    await cleanupOperators(opId);
  }
});
