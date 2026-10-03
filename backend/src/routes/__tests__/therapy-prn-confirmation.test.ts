// UX cycle 2026-10-03 (W2 therapy), owner decisions:
// - PRN («al bisogno») doses are recordable: POST /therapy-slots/prn (capability
//   administration.confirm), append-only, idempotent on requestId, dose/time from the server.
// - Supervisor administration is ALLOWED_WITH_CONFIRMATION: the server refuses it (428) without an
//   explicit `confirmed: true`; the nurse flow is unchanged.
// Real app over HTTP (requireOperator → policy → route gate → audit), real Postgres.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma.js';
import { facilityToday } from '../../patients/parameter-reading-input.js';
import {
  call,
  createPatientOwnedBy,
  login,
  runTag,
  startApp,
  waitForAudit,
  type Session,
} from '../../authz/__tests__/harness-support.js';

let base = '';
let close: () => Promise<void> = async () => {};
let nurse: Session;
let supervisor: Session;
let doctor: Session;
let oss: Session;
const patientIds: string[] = [];
let nursePatient = '';
let supervisorPatient = '';
let nursePrn = '';
let nurseScheduled = '';
let supervisorPrn = '';
let supervisorScheduled = '';
let periodicNotPrn = '';
const today = facilityToday();

async function therapy(patientId: string, data: Record<string, unknown>) {
  const row = await prisma.patientTherapy.create({
    data: {
      patientId,
      farmacoNome: 'Paracetamolo',
      dosaggio: '1000 mg',
      viaSomministrazione: 'orale',
      tipo: 'al_bisogno',
      stato: 'attiva',
      dataInizio: '2020-01-01',
      ...data,
    },
  });
  return row.id;
}

before(async () => {
  ({ base, close } = await startApp());
  [nurse, supervisor, doctor, oss] = await Promise.all(
    ['SIM-NURSE-1', 'SIM-SUPERVISOR-1', 'SIM-DOCTOR-1', 'SIM-OSS-1'].map((id) => login(base, id)),
  );
  nursePatient = (await createPatientOwnedBy('SIM-NURSE-1', 'prn-nurse')).id;
  supervisorPatient = (await createPatientOwnedBy('SIM-SUPERVISOR-1', 'prn-sup')).id;
  patientIds.push(nursePatient, supervisorPatient);
  nursePrn = await therapy(nursePatient, {
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
    commercialStrengthValue: 1000,
    commercialStrengthUnit: 'mg',
  });
  nurseScheduled = await therapy(nursePatient, {
    farmacoNome: 'Ramipril',
    dosaggio: '5 mg',
    tipo: 'periodica',
    fasceMattina: true,
  });
  periodicNotPrn = nurseScheduled;
  supervisorPrn = await therapy(supervisorPatient, {});
  supervisorScheduled = await therapy(supervisorPatient, {
    farmacoNome: 'Metformina',
    dosaggio: '500 mg',
    tipo: 'periodica',
    fasceSera: true,
  });
});

after(async () => {
  // Clinical rows go with their patients (cascade); the append-only audit stays untouched.
  await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
  await close();
});

const prnBody = (patientId: string, therapyId: string, requestId: string, extra = {}) => ({
  patientId,
  therapyId,
  indicazione: 'Dolore 6/10 al ginocchio destro',
  requestId,
  ...extra,
});

test('nurse records a PRN dose: dose from the prescription, server time, audited', async () => {
  const requestId = `${runTag}-prn-a`;
  const before = Date.now();
  const res = await call(base, nurse, 'POST', '/therapy-slots/prn', {
    ...prnBody(nursePatient, nursePrn, requestId),
    note: 'Rivalutare tra 1 ora',
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.drugName, 'Paracetamolo');
  assert.equal(res.body.dosage, '1 compressa — 1000 mg');
  assert.equal(res.body.route, 'orale');
  assert.equal(res.body.date, today);
  assert.equal(res.body.indication, 'Dolore 6/10 al ginocchio destro');
  assert.equal(res.body.administeredBy, 'Infermiere 1');
  const at = Date.parse(res.body.administeredAt);
  assert.ok(at >= before - 1000 && at <= Date.now() + 1000, 'time is the server time');
  const row = await prisma.prnAdministration.findUniqueOrThrow({ where: { id: res.body.id } });
  assert.equal(row.operatoreId, 'SIM-NURSE-1');
  assert.equal(row.note, 'Rivalutare tra 1 ora');
  const audit = await waitForAudit({
    actionType: 'administration.confirm',
    operatorId: 'SIM-NURSE-1',
    patientId: nursePatient,
    outcome: 'ok',
  });
  assert.ok(audit, 'PRN write audited like the scheduled administrations');
});

test('PRN is idempotent per requestId and allows a second dose the same day', async () => {
  const requestId = `${runTag}-prn-b`;
  const first = await call(
    base,
    nurse,
    'POST',
    '/therapy-slots/prn',
    prnBody(nursePatient, nursePrn, requestId),
  );
  assert.equal(first.status, 201, JSON.stringify(first.body));
  const replay = await call(
    base,
    nurse,
    'POST',
    '/therapy-slots/prn',
    prnBody(nursePatient, nursePrn, requestId),
  );
  assert.equal(replay.status, 200);
  assert.equal(replay.body.id, first.body.id, 'a retried tap replays, never a second dose');
  const conflict = await call(base, nurse, 'POST', '/therapy-slots/prn', {
    ...prnBody(nursePatient, nursePrn, requestId),
    indicazione: 'Altra indicazione',
  });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.code, 'idempotency_conflict');

  const second = await call(
    base,
    nurse,
    'POST',
    '/therapy-slots/prn',
    prnBody(nursePatient, nursePrn, `${runTag}-prn-c`),
  );
  assert.equal(second.status, 201);
  assert.notEqual(second.body.id, first.body.id);
  const list = await call(
    base,
    nurse,
    'GET',
    `/therapy-slots/prn?patientId=${nursePatient}&date=${today}`,
  );
  assert.equal(list.status, 200);
  const ids = (list.body.items as { id: string }[]).map((item) => item.id);
  assert.ok(ids.includes(first.body.id) && ids.includes(second.body.id));
  assert.equal(
    await prisma.prnAdministration.count({ where: { patientId: nursePatient, requestId } }),
    1,
  );
});

test('PRN input: indication mandatory, no client dose/time, only al_bisogno therapies', async () => {
  const missing = await call(base, nurse, 'POST', '/therapy-slots/prn', {
    ...prnBody(nursePatient, nursePrn, `${runTag}-prn-d`),
    indicazione: '   ',
  });
  assert.equal(missing.status, 400);
  const spoof = await call(base, nurse, 'POST', '/therapy-slots/prn', {
    ...prnBody(nursePatient, nursePrn, `${runTag}-prn-e`),
    farmacoDose: '5000 mg',
  });
  assert.equal(spoof.status, 400);
  assert.match(spoof.body.error, /Campo non supportato/);
  const scheduled = await call(
    base,
    nurse,
    'POST',
    '/therapy-slots/prn',
    prnBody(nursePatient, periodicNotPrn, `${runTag}-prn-f`),
  );
  assert.equal(scheduled.status, 409, 'a scheduled therapy is never recorded as PRN');
  const noKey = await call(base, nurse, 'POST', '/therapy-slots/prn', {
    patientId: nursePatient,
    therapyId: nursePrn,
    indicazione: 'Febbre',
  });
  assert.equal(noKey.status, 400);
});

test('doctor and OSS cannot record PRN (403 capability_denied, nothing written)', async () => {
  for (const [session, label] of [
    [doctor, 'doctor'],
    [oss, 'oss'],
  ] as const) {
    const before = await prisma.prnAdministration.count({ where: { patientId: nursePatient } });
    const res = await call(
      base,
      session,
      'POST',
      '/therapy-slots/prn',
      prnBody(nursePatient, nursePrn, `${runTag}-prn-${label}`),
    );
    assert.equal(res.status, 403, label);
    assert.equal(res.body.capability, 'administration.confirm');
    assert.equal(
      await prisma.prnAdministration.count({ where: { patientId: nursePatient } }),
      before,
    );
  }
});

test('supervisor: rejected without explicit confirmation (scheduled, not-given, PRN), accepted with', async () => {
  const slot = { patientId: supervisorPatient, therapyId: supervisorScheduled, date: today };
  const unconfirmed = await call(base, supervisor, 'POST', '/therapy-slots/confirm', {
    ...slot,
    fascia: 'sera',
  });
  assert.equal(unconfirmed.status, 428, JSON.stringify(unconfirmed.body));
  assert.equal(unconfirmed.body.code, 'confirmation_required');
  const notGiven = await call(base, supervisor, 'POST', '/therapy-slots/not-administered', {
    ...slot,
    fascia: 'sera',
    motivo: 'rifiutata_paziente',
  });
  assert.equal(notGiven.status, 428);
  const prn = await call(
    base,
    supervisor,
    'POST',
    '/therapy-slots/prn',
    prnBody(supervisorPatient, supervisorPrn, `${runTag}-prn-sup-a`),
  );
  assert.equal(prn.status, 428);
  assert.equal(
    await prisma.medicationAdministration.count({ where: { therapyId: supervisorScheduled } }),
    0,
    'nothing written without confirmation',
  );
  assert.equal(
    await prisma.prnAdministration.count({ where: { patientId: supervisorPatient } }),
    0,
  );
  const badFlag = await call(base, supervisor, 'POST', '/therapy-slots/confirm', {
    ...slot,
    fascia: 'sera',
    confirmed: 'yes',
  });
  assert.equal(badFlag.status, 400);

  const confirmed = await call(base, supervisor, 'POST', '/therapy-slots/confirm', {
    ...slot,
    fascia: 'sera',
    confirmed: true,
  });
  assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
  assert.equal(confirmed.body.stato, 'erogata');
  assert.equal(confirmed.body.operatoreId, 'SIM-SUPERVISOR-1');
  const prnOk = await call(base, supervisor, 'POST', '/therapy-slots/prn', {
    ...prnBody(supervisorPatient, supervisorPrn, `${runTag}-prn-sup-b`),
    confirmed: true,
  });
  assert.equal(prnOk.status, 201, JSON.stringify(prnOk.body));
});

test('nurse scheduled flow unchanged: no confirmation flag needed, one dose per band', async () => {
  const slot = {
    patientId: nursePatient,
    therapyId: nurseScheduled,
    date: today,
    fascia: 'mattina',
  };
  const res = await call(base, nurse, 'POST', '/therapy-slots/confirm', slot);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.stato, 'erogata');
  const again = await call(base, nurse, 'POST', '/therapy-slots/confirm', {
    ...slot,
    confirmed: true,
  });
  assert.equal(again.status, 409, 'scheduled one-dose-per-band invariant kept');
  assert.equal(
    await prisma.medicationAdministration.count({ where: { therapyId: nurseScheduled } }),
    1,
  );
});
