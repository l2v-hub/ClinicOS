// Dimissione: stato della cartella e posto letto cambiano insieme, e solo per chi ha il permesso
// `patients.discharge`. App reale via HTTP, sessioni del simulatore, Postgres reale.
import assert from 'node:assert/strict';
import { after, afterEach, before, test } from 'node:test';
import { prisma } from '../../lib/prisma.js';
import { facilityDate } from '../../lib/facility-time.js';
import { previousIsoDate } from '../../routes/room-input.js';
import {
  call,
  createPatientOwnedBy,
  login,
  runTag,
  startApp,
  type Session,
} from '../../authz/__tests__/harness-support.js';

let base: string, close: () => Promise<void>;
const sessions: Record<string, Session> = {};
const patients: string[] = [];
let roomId: string;
const beds: string[] = [];
const today = facilityDate();
const yesterday = previousIsoDate(today);
const lastWeek = [...Array(7)].reduce<string>((day) => previousIsoDate(day), today);
const tomorrow = (() => {
  const date = new Date(`${today}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
})();

before(async () => {
  delete process.env.RESIDENT_SCOPE_CONFIG;
  ({ base, close } = await startApp());
  for (const id of ['SIM-ADMIN', 'SIM-SUPERVISOR-1', 'SIM-DOCTOR-1', 'SIM-NURSE-1', 'SIM-OSS-1'])
    sessions[id] = await login(base, id);
  const room = await prisma.room.create({
    data: {
      numero: `D-${runTag}`,
      beds: { create: ['A', 'B', 'C', 'D'].map((label) => ({ label })) },
    },
    include: { beds: { orderBy: { label: 'asc' } } },
  });
  roomId = room.id;
  beds.push(...room.beds.map((bed) => bed.id));
});
afterEach(() => {
  delete process.env.RESIDENT_SCOPE_CONFIG;
});
after(async () => {
  await prisma.patient.deleteMany({ where: { id: { in: patients } } });
  await prisma.room.deleteMany({ where: { id: roomId } });
  await close();
});

async function admitted(
  label: string,
  bed: number | null,
  startDate = lastWeek,
  owner = 'SIM-NURSE-1',
) {
  const patient = await createPatientOwnedBy(owner, label);
  patients.push(patient.id);
  await prisma.cartella.create({
    data: {
      patientId: patient.id,
      data: {
        statoRicovero: 'ricoverato',
        cameraNumero: `D-${runTag}`,
        lettoNumero: 'A',
        diagnosiIngresso: 'Scompenso cardiaco',
        allergie: ['penicillina'],
      },
    },
  });
  if (bed !== null)
    await prisma.patientRoomAssignment.create({
      data: { patientId: patient.id, roomId, bedId: beds[bed], startDate },
    });
  return patient.id;
}
const chart = async (patientId: string) =>
  (await prisma.cartella.findUnique({ where: { patientId } }))?.data as Record<string, any>;
const assignments = (patientId: string) =>
  prisma.patientRoomAssignment.findMany({ where: { patientId }, orderBy: { startDate: 'asc' } });

test('an operator with the permission discharges: status saved and bed free from today, in one call', async () => {
  for (const [identity, bed] of [
    ['SIM-NURSE-1', 0],
    ['SIM-DOCTOR-1', 1],
  ] as const) {
    const patientId = await admitted(`ok-${identity}`, bed);
    const result = await call(
      base,
      sessions[identity],
      'POST',
      `/patients/${patientId}/discharge`,
      { confirmed: true },
    );
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.discharge.alreadyDischarged, false);
    assert.deepEqual(result.body.discharge.freedBeds, [
      { room: `D-${runTag}`, bed: bed === 0 ? 'A' : 'B' },
    ]);

    const data = await chart(patientId);
    assert.equal(data.statoRicovero, 'dimesso');
    assert.equal('cameraNumero' in data, false);
    assert.equal('lettoNumero' in data, false);
    // The rest of the chart is untouched.
    assert.equal(data.diagnosiIngresso, 'Scompenso cardiaco');
    assert.deepEqual(data.allergie, ['penicillina']);
    assert.equal(data.dimissioneRegistrata.data, today);
    assert.equal(data.dimissioneRegistrata.operatoreId, identity);
    assert.deepEqual(result.body.data, data);

    const [stay] = await assignments(patientId);
    assert.equal(stay.endDate, yesterday);
    // The bed is assignable again today.
    const active = await prisma.patientRoomAssignment.count({
      where: {
        bedId: beds[bed],
        startDate: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
    });
    assert.equal(active, 0);
  }
});

test('coordinator, administrator and OSS are refused and nothing changes', async () => {
  const patientId = await admitted('denied', 2);
  for (const identity of ['SIM-SUPERVISOR-1', 'SIM-ADMIN', 'SIM-OSS-1']) {
    const result = await call(
      base,
      sessions[identity],
      'POST',
      `/patients/${patientId}/discharge`,
      { confirmed: true },
    );
    assert.equal(result.status, 403, `${identity}: ${JSON.stringify(result.body)}`);
    assert.equal(result.body.code, 'capability_denied');
  }
  assert.equal((await chart(patientId)).statoRicovero, 'ricoverato');
  assert.equal((await assignments(patientId))[0].endDate, null);
  const anonymous = await call(base, null, 'POST', `/patients/${patientId}/discharge`, {
    confirmed: true,
  });
  assert.equal(anonymous.status, 401);
  // Without the explicit confirmation even an allowed role changes nothing.
  for (const body of [undefined, {}, { confirmed: 'true' }]) {
    const unconfirmed = await call(
      base,
      sessions['SIM-NURSE-1'],
      'POST',
      `/patients/${patientId}/discharge`,
      body,
    );
    assert.equal(unconfirmed.status, 400);
    assert.equal(unconfirmed.body.code, 'confirmation_required');
  }
  assert.equal((await chart(patientId)).statoRicovero, 'ricoverato');
  await prisma.patientRoomAssignment.deleteMany({ where: { patientId } });
});

test('a bed taken today or booked for later is released by removing the assignment', async () => {
  const patientId = await admitted('same-day', 2, today);
  await prisma.patientRoomAssignment.create({
    data: { patientId, roomId, bedId: beds[3], startDate: tomorrow },
  });
  const result = await call(
    base,
    sessions['SIM-NURSE-1'],
    'POST',
    `/patients/${patientId}/discharge`,
    { confirmed: true },
  );
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.deepEqual(
    result.body.discharge.freedBeds.map((bed: { bed: string }) => bed.bed),
    ['C', 'D'],
  );
  assert.deepEqual(await assignments(patientId), []);
  // The trace of the bed stays in the chart.
  assert.equal((await chart(patientId)).dimissioneRegistrata.posti.length, 2);
});

test('repeating the discharge changes nothing; a chart already «dimesso» still releases a held bed', async () => {
  const patientId = await admitted('repeat', 2);
  const first = await call(
    base,
    sessions['SIM-NURSE-1'],
    'POST',
    `/patients/${patientId}/discharge`,
    { confirmed: true },
  );
  assert.equal(first.status, 200);
  const stored = await prisma.cartella.findUnique({ where: { patientId } });
  const again = await call(
    base,
    sessions['SIM-DOCTOR-1'],
    'POST',
    `/patients/${patientId}/discharge`,
    { confirmed: true },
  );
  assert.equal(again.status, 200);
  assert.equal(again.body.discharge.alreadyDischarged, true);
  assert.deepEqual(again.body.discharge.freedBeds, []);
  const after = await prisma.cartella.findUnique({ where: { patientId } });
  assert.equal(after!.updatedAt.getTime(), stored!.updatedAt.getTime());
  assert.equal(after!.data && (after!.data as any).dimissioneRegistrata.operatoreId, 'SIM-NURSE-1');

  // Status set by a plain chart save (as before this operation existed): the bed is still held.
  const stale = await admitted('stale', 3);
  await prisma.cartella.update({
    where: { patientId: stale },
    data: { data: { statoRicovero: 'dimesso' } },
  });
  const fixed = await call(base, sessions['SIM-NURSE-1'], 'POST', `/patients/${stale}/discharge`, {
    confirmed: true,
  });
  assert.equal(fixed.status, 200);
  assert.equal(fixed.body.discharge.alreadyDischarged, false);
  assert.equal((await assignments(stale))[0].endDate, yesterday);
});

test('a patient without a bed or without a chart is discharged; unknown and out-of-scope are not found', async () => {
  const noBed = await admitted('no-bed', null);
  const result = await call(
    base,
    sessions['SIM-DOCTOR-1'],
    'POST',
    `/patients/${noBed}/discharge`,
    { confirmed: true },
  );
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.discharge.freedBeds, []);
  assert.equal((await chart(noBed)).statoRicovero, 'dimesso');

  const bare = await createPatientOwnedBy('SIM-NURSE-1', 'no-chart');
  patients.push(bare.id);
  const created = await call(
    base,
    sessions['SIM-NURSE-1'],
    'POST',
    `/patients/${bare.id}/discharge`,
    { confirmed: true },
  );
  assert.equal(created.status, 200);
  assert.equal((await chart(bare.id)).statoRicovero, 'dimesso');

  const missing = await call(
    base,
    sessions['SIM-NURSE-1'],
    'POST',
    `/patients/nope-${runTag}/discharge`,
    { confirmed: true },
  );
  assert.equal(missing.status, 404);

  const foreign = await admitted('foreign', null, lastWeek, 'SIM-DOCTOR-1');
  process.env.RESIDENT_SCOPE_CONFIG = JSON.stringify({ fallback: 'registered_by_me' });
  const hidden = await call(
    base,
    sessions['SIM-NURSE-1'],
    'POST',
    `/patients/${foreign}/discharge`,
    { confirmed: true },
  );
  assert.equal(hidden.status, 404);
  assert.equal((await chart(foreign)).statoRicovero, 'ricoverato');
});

test('a plain chart save can neither undo a discharge nor discharge; the rest of the save goes through', async () => {
  const patientId = await admitted('guard', 2);
  const before = await call(
    base,
    sessions['SIM-NURSE-1'],
    'GET',
    `/patients/${patientId}/cartella`,
  );
  const stale = before.body.data as Record<string, unknown>;

  // Marking «dimesso» through a save is ignored: the bed would stay taken.
  const shortcut = await call(
    base,
    sessions['SIM-NURSE-1'],
    'PUT',
    `/patients/${patientId}/cartella`,
    {
      data: { ...stale, statoRicovero: 'dimesso', dimissioneRegistrata: { data: '2020-01-01' } },
    },
  );
  assert.equal(shortcut.status, 200);
  assert.equal(shortcut.body.data.statoRicovero, 'ricoverato');
  assert.equal('dimissioneRegistrata' in shortcut.body.data, false);

  const discharged = await call(
    base,
    sessions['SIM-NURSE-1'],
    'POST',
    `/patients/${patientId}/discharge`,
    {
      confirmed: true,
    },
  );
  assert.equal(discharged.status, 200);
  const trace = (await chart(patientId)).dimissioneRegistrata;

  // Another workstation saves a copy read before the discharge (doctor: another section).
  const late = await call(
    base,
    sessions['SIM-DOCTOR-1'],
    'PUT',
    `/patients/${patientId}/cartella`,
    {
      data: { ...stale, noteGenerali: 'Nota scritta dopo' },
    },
  );
  assert.equal(late.status, 200, JSON.stringify(late.body));
  const data = await chart(patientId);
  assert.equal(data.statoRicovero, 'dimesso');
  assert.equal('cameraNumero' in data, false);
  assert.equal('lettoNumero' in data, false);
  assert.deepEqual(data.dimissioneRegistrata, trace);
  assert.equal(data.noteGenerali, 'Nota scritta dopo');
  assert.deepEqual(late.body.data, data);
  assert.equal((await assignments(patientId))[0].endDate, yesterday);
});

test('«Annulla dimissione» goes back to the previous regime, keeps the trace and does not reassign the bed', async () => {
  const patientId = await admitted('undo', 3);
  await prisma.cartella.update({
    where: { patientId },
    data: { data: { statoRicovero: 'day_hospital', diagnosiIngresso: 'Controllo' } },
  });
  for (const identity of ['SIM-SUPERVISOR-1', 'SIM-ADMIN', 'SIM-OSS-1']) {
    const refused = await call(
      base,
      sessions[identity],
      'POST',
      `/patients/${patientId}/discharge/undo`,
      {
        confirmed: true,
      },
    );
    assert.equal(refused.status, 403, identity);
  }
  // Nothing to undo yet.
  const early = await call(
    base,
    sessions['SIM-NURSE-1'],
    'POST',
    `/patients/${patientId}/discharge/undo`,
    {
      confirmed: true,
    },
  );
  assert.equal(early.status, 200);
  assert.deepEqual(early.body.undo, { alreadyPresent: true, status: 'day_hospital' });

  await call(base, sessions['SIM-NURSE-1'], 'POST', `/patients/${patientId}/discharge`, {
    confirmed: true,
  });
  const unconfirmed = await call(
    base,
    sessions['SIM-NURSE-1'],
    'POST',
    `/patients/${patientId}/discharge/undo`,
    {},
  );
  assert.equal(unconfirmed.status, 400);
  assert.equal((await chart(patientId)).statoRicovero, 'dimesso');

  const undone = await call(
    base,
    sessions['SIM-DOCTOR-1'],
    'POST',
    `/patients/${patientId}/discharge/undo`,
    {
      confirmed: true,
    },
  );
  assert.equal(undone.status, 200, JSON.stringify(undone.body));
  assert.deepEqual(undone.body.undo, { alreadyPresent: false, status: 'day_hospital' });
  const data = await chart(patientId);
  assert.equal(data.statoRicovero, 'day_hospital');
  assert.equal(data.diagnosiIngresso, 'Controllo');
  assert.equal(data.dimissioneRegistrata.operatoreId, 'SIM-NURSE-1');
  assert.equal(data.dimissioneRegistrata.annullataDaId, 'SIM-DOCTOR-1');
  assert.equal((await assignments(patientId))[0].endDate, yesterday);
  // Present again: an ordinary save works as before.
  const save = await call(base, sessions['SIM-NURSE-1'], 'PUT', `/patients/${patientId}/cartella`, {
    data: { ...data, statoRicovero: 'ricoverato' },
  });
  assert.equal(save.body.data.statoRicovero, 'ricoverato');
});

test('the discharge keeps the temporary-exit register and the assessment history of the chart', async () => {
  const patientId = await admitted('keep', null);
  const liberatoria = {
    usciteLog: [{ id: 'u1', data: '2026-11-01', ora: '10:00', operatore: 'Infermiere 1' }],
  };
  const valutazioniNRS = [{ id: 'n1', punteggio: 3 }];
  await prisma.cartella.update({
    where: { patientId },
    data: { data: { statoRicovero: 'ricoverato', liberatoria, valutazioniNRS } },
  });
  const result = await call(
    base,
    sessions['SIM-NURSE-1'],
    'POST',
    `/patients/${patientId}/discharge`,
    {
      confirmed: true,
    },
  );
  assert.equal(result.status, 200);
  const data = await chart(patientId);
  assert.deepEqual(data.liberatoria, liberatoria);
  assert.deepEqual(data.valutazioniNRS, valutazioniNRS);
});
