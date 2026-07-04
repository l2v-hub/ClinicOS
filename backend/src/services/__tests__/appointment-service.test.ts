// SPEC-015 T027 (US4): integration tests for the shared appointment-service against the local
// Postgres (same node:test + prisma pattern as therapies/__tests__/therapy-create.test.ts).
// Covers: create, 30-min slot conflict (create AND update), findConflict reuse, list by date,
// update move, UI-only delete.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma.js';
import {
  createAppointment, updateAppointment, listAppointments, findConflict, findAppointmentAt,
  uiOnlyDeleteAppointment, SlotConflictError, AppointmentNotFoundError,
} from '../appointment-service.js';

async function makePatient(tag: string) {
  return prisma.patient.create({
    data: {
      medicalRecordNumber: `MRN-APPT-${tag}-${Date.now()}`,
      firstName: 'Test',
      lastName: `Agenda${tag}`,
      dateOfBirth: new Date('1970-01-01'),
      sex: 'M',
    },
  });
}

/** Remove the operators (+ backing users) auto-provisioned by the service during the test. */
async function cleanupOperators(...ids: string[]) {
  for (const id of ids) {
    await prisma.operator.delete({ where: { id } }).catch(() => {});
    await prisma.user.delete({ where: { email: `${id}@clinicos.local` } }).catch(() => {});
  }
}

test('appointment-service: create + conflitto stesso slot/operatore + findConflict riusabile', async () => {
  const patient = await makePatient('A');
  const opId = `test-op-${Date.now()}`;
  try {
    const created = await createAppointment({
      patientId: patient.id, operatorId: opId, operatorName: 'Op Agenda Test',
      data: '2030-01-15', ora: '10:30', tipologia: 'fisioterapia', note: 'test',
    });
    assert.equal(created.data, '2030-01-15');
    assert.equal(created.ora, '10:30');
    assert.equal(created.tipologia, 'fisioterapia');
    assert.equal(created.stato, 'programmato');
    assert.match(created.patientName ?? '', /AgendaA/);

    // findConflict (usato dalla preview AI) vede lo slot occupato
    const conflict = await findConflict(opId, '2030-01-15', '10:30');
    assert.equal(conflict?.id, created.id);
    assert.equal(await findConflict(opId, '2030-01-15', '11:00'), null);

    // stesso operatore, stessa data/ora → SlotConflictError
    await assert.rejects(
      () => createAppointment({
        patientId: patient.id, operatorId: opId,
        data: '2030-01-15', ora: '10:30', tipologia: 'visita',
      }),
      (e: unknown) => e instanceof SlotConflictError,
    );

    // operatore diverso, stesso orario → nessun conflitto
    const other = await createAppointment({
      patientId: patient.id, operatorId: `${opId}-b`, data: '2030-01-15', ora: '10:30', tipologia: 'visita',
    });
    assert.notEqual(other.id, created.id);

    // list per data include entrambi
    const listed = await listAppointments({ date: '2030-01-15' });
    assert.ok(listed.some((a) => a.id === created.id));
    assert.ok(listed.some((a) => a.id === other.id));
    const mineOnly = await listAppointments({ date: '2030-01-15', operatorId: opId });
    assert.ok(mineOnly.every((a) => a.operatorId === opId));
  } finally {
    await prisma.patient.delete({ where: { id: patient.id } }).catch(() => {});
    await cleanupOperators(opId, `${opId}-b`);
  }
});

test('appointment-service: update sposta lo slot, rifiuta slot occupato, delete è solo UI', async () => {
  const patient = await makePatient('B');
  const opId = `test-op-upd-${Date.now()}`;
  try {
    const apt15 = await createAppointment({
      patientId: patient.id, operatorId: opId, data: '2030-01-16', ora: '15:00', tipologia: 'controllo',
    });
    const apt16 = await createAppointment({
      patientId: patient.id, operatorId: opId, data: '2030-01-16', ora: '16:00', tipologia: 'visita',
    });

    // findAppointmentAt (grounding AI "l'appuntamento delle 15")
    const found = await findAppointmentAt(patient.id, '2030-01-16', '15:00');
    assert.equal(found?.id, apt15.id);

    // spostare le 15 sulle 16 (occupato) → conflitto
    await assert.rejects(
      () => updateAppointment(apt15.id, { ora: '16:00' }),
      (e: unknown) => e instanceof SlotConflictError,
    );

    // spostare le 15 alle 17 → ok
    const moved = await updateAppointment(apt15.id, { ora: '17:00' });
    assert.equal(moved.ora, '17:00');
    assert.equal(moved.data, '2030-01-16');

    // id inesistente → AppointmentNotFoundError
    await assert.rejects(
      () => updateAppointment('missing-id', { ora: '18:00' }),
      (e: unknown) => e instanceof AppointmentNotFoundError,
    );

    // delete UI-only: rimuove la riga (FR-010, percorso del pulsante UI)
    assert.equal(await uiOnlyDeleteAppointment(apt16.id), true);
    assert.equal(await uiOnlyDeleteAppointment(apt16.id), false); // già rimosso → 404 lato route
    assert.equal(await findConflict(opId, '2030-01-16', '16:00'), null);
  } finally {
    await prisma.patient.delete({ where: { id: patient.id } }).catch(() => {});
    await cleanupOperators(opId);
  }
});
