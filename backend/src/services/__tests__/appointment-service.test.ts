// SPEC-015 T027 (US4): integration tests for the shared appointment-service against the local
// Postgres (same node:test + prisma pattern as therapies/__tests__/therapy-create.test.ts).
// Covers: create, 30-min slot conflict (create AND update), findConflict reuse, list by date,
// update move, UI-only delete.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma.js';
import {
  createAppointment,
  updateAppointment,
  listAppointments,
  findConflict,
  findAppointmentAt,
  uiOnlyDeleteAppointment,
  SlotConflictError,
  AppointmentNotFoundError,
  AppointmentForbiddenError,
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
  const actor = { operatorId: opId, role: 'admin', name: 'Op Agenda Test' };
  try {
    const created = await createAppointment({
      patientId: patient.id,
      operatorId: opId,
      data: '2030-01-15',
      ora: '10:30',
      tipologia: 'fisioterapia',
      note: 'test',
      actor,
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
      () =>
        createAppointment({
          patientId: patient.id,
          operatorId: opId,
          data: '2030-01-15',
          ora: '10:30',
          tipologia: 'visita',
          actor,
        }),
      (e: unknown) => e instanceof SlotConflictError,
    );

    // operatore diverso, stesso orario → nessun conflitto
    const other = await createAppointment({
      patientId: patient.id,
      operatorId: `${opId}-b`,
      data: '2030-01-15',
      ora: '10:30',
      tipologia: 'visita',
      actor,
    });
    assert.notEqual(other.id, created.id);

    // list per data include entrambi
    const listed = await listAppointments({ date: '2030-01-15', actor });
    assert.ok(listed.some((a) => a.id === created.id));
    assert.ok(listed.some((a) => a.id === other.id));
    const mineOnly = await listAppointments({ date: '2030-01-15', operatorId: opId, actor });
    assert.ok(mineOnly.every((a) => a.operatorId === opId));
  } finally {
    await prisma.patient.delete({ where: { id: patient.id } }).catch(() => {});
    await cleanupOperators(opId, `${opId}-b`);
  }
});

test('appointment-service: update sposta lo slot, rifiuta slot occupato, delete è solo UI', async () => {
  const patient = await makePatient('B');
  const opId = `test-op-upd-${Date.now()}`;
  const actor = { operatorId: opId, role: 'operatore', name: 'Operatore test' };
  try {
    const apt15 = await createAppointment({
      patientId: patient.id,
      operatorId: opId,
      data: '2030-01-16',
      ora: '15:00',
      tipologia: 'controllo',
      actor,
    });
    const apt16 = await createAppointment({
      patientId: patient.id,
      operatorId: opId,
      data: '2030-01-16',
      ora: '16:00',
      tipologia: 'visita',
      actor,
    });

    // findAppointmentAt (grounding AI "l'appuntamento delle 15")
    const found = await findAppointmentAt(patient.id, '2030-01-16', '15:00');
    assert.equal(found?.id, apt15.id);

    // spostare le 15 sulle 16 (occupato) → conflitto
    await assert.rejects(
      () => updateAppointment(apt15.id, { ora: '16:00' }, actor),
      (e: unknown) => e instanceof SlotConflictError,
    );

    // spostare le 15 alle 17 → ok
    const moved = await updateAppointment(apt15.id, { ora: '17:00' }, actor);
    assert.equal(moved.ora, '17:00');
    assert.equal(moved.data, '2030-01-16');

    // id inesistente → AppointmentNotFoundError
    await assert.rejects(
      () => updateAppointment('missing-id', { ora: '18:00' }, actor),
      (e: unknown) => e instanceof AppointmentNotFoundError,
    );

    // delete UI-only: rimuove la riga (FR-010, percorso del pulsante UI)
    assert.equal(await uiOnlyDeleteAppointment(apt16.id, actor), true);
    assert.equal(await uiOnlyDeleteAppointment(apt16.id, actor), false); // già rimosso → 404 lato route
    assert.equal(await findConflict(opId, '2030-01-16', '16:00'), null);
  } finally {
    await prisma.patient.delete({ where: { id: patient.id } }).catch(() => {});
    await cleanupOperators(opId);
  }
});

test('appointment-service: un operatore gestisce solo i propri appuntamenti', async () => {
  const patient = await makePatient('AUTH');
  const ownerId = `test-op-owner-${Date.now()}`;
  const intruderId = `${ownerId}-intruder`;
  const owner = { operatorId: ownerId, role: 'operatore', name: 'Owner' };
  const intruder = { operatorId: intruderId, role: 'operatore', name: 'Intruder' };
  try {
    const appointment = await createAppointment({
      patientId: patient.id,
      operatorId: ownerId,
      data: '2032-01-10',
      ora: '09:00',
      tipologia: 'controllo',
      actor: owner,
    });
    await assert.rejects(
      () => updateAppointment(appointment.id, { note: 'spoof' }, intruder),
      AppointmentForbiddenError,
    );
    await assert.rejects(
      () => uiOnlyDeleteAppointment(appointment.id, intruder),
      AppointmentForbiddenError,
    );
    await assert.rejects(
      () =>
        createAppointment({
          patientId: patient.id,
          operatorId: ownerId,
          data: '2032-01-10',
          ora: '10:00',
          tipologia: 'spoof',
          actor: intruder,
        }),
      AppointmentForbiddenError,
    );
    const managed = await updateAppointment(
      appointment.id,
      { note: 'admin update' },
      { operatorId: 'admin-test', role: 'admin', name: 'Admin' },
    );
    assert.equal(managed.note, 'admin update');
    const ownerVisible = await listAppointments({
      date: '2032-01-10',
      operatorId: intruderId,
      actor: owner,
    });
    assert.deepEqual(
      ownerVisible.map((row) => row.id),
      [appointment.id],
    );
    const intruderVisible = await listAppointments({ date: '2032-01-10', actor: intruder });
    assert.deepEqual(intruderVisible, []);
    const adminVisible = await listAppointments({
      date: '2032-01-10',
      actor: { operatorId: 'admin-test', role: 'admin' },
    });
    assert.ok(adminVisible.some((row) => row.id === appointment.id));
  } finally {
    await prisma.patient.delete({ where: { id: patient.id } }).catch(() => {});
    await cleanupOperators(ownerId, intruderId);
  }
});
