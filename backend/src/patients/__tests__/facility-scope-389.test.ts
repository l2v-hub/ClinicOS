// #389 — facility-wide resident reach on the REAL app (Express + Postgres), with the DEFAULT scope
// configuration (no RESIDENT_SCOPE_CONFIG pin). Residents registered by different operators are
// visible to every clinical profile; WHAT each profile may do stays decided by the role policy.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import {
  call,
  createPatientOwnedBy,
  login,
  runTag,
  startApp,
  type Session,
} from '../../authz/__tests__/harness-support.js';
import { hasGlobalPatientScope } from '../patient-scope.js';

delete process.env.RESIDENT_SCOPE_CONFIG;

let base = '';
let close: () => Promise<void> = async () => {};
const sessions: Record<string, Session> = {};
const ids: string[] = [];
const LABEL = `fac389-${runTag}`;

before(async () => {
  ({ base, close } = await startApp());
  for (const id of ['SIM-SUPERVISOR-1', 'SIM-DOCTOR-1', 'SIM-NURSE-1', 'SIM-OSS-1'])
    sessions[id] = await login(base, id);
  for (const [owner, tag] of [
    ['SIM-DOCTOR-1', 'doc'],
    ['SIM-NURSE-1', 'nurse'],
    ['SIM-OSS-1', 'oss'],
  ] as const)
    ids.push((await createPatientOwnedBy(owner, `${LABEL}-${tag}`)).id);
});

after(async () => {
  await prisma.patientParameterReading.deleteMany({ where: { patientId: { in: ids } } });
  await prisma.patient.deleteMany({ where: { id: { in: ids } } });
  await close();
});

test('#389 every clinical profile sees the same residents, whoever registered them', async () => {
  for (const [identity, session] of Object.entries(sessions)) {
    const page = await call(base, session, 'POST', '/patients/page/search', {
      q: LABEL,
    });
    assert.equal(page.status, 200, `${identity}: ${JSON.stringify(page.body)}`);
    const found = (page.body.items as { id: string }[])
      .map((p) => p.id)
      .filter((id) => ids.includes(id));
    assert.deepEqual(found.sort(), [...ids].sort(), `${identity} roster`);
    for (const id of ids) {
      const detail = await call(base, session, 'GET', `/patients/${id}`);
      assert.equal(detail.status, 200, `${identity} detail ${id}`);
    }
  }
});

test('#389 writes follow the role, not the registrant: nurse records vitals on a doctor-registered resident', async () => {
  const doctorResident = ids[0];
  const reading = await call(
    base,
    sessions['SIM-NURSE-1'],
    'POST',
    `/patients/${doctorResident}/parameter-readings`,
    { requestId: randomUUID(), measuredAt: new Date().toISOString(), values: { fc: '72' } },
  );
  assert.ok([200, 201].includes(reading.status), JSON.stringify(reading.body));
  assert.equal(
    await prisma.patientParameterReading.count({ where: { patientId: doctorResident } }),
    1,
  );
});

test('#389 RBAC is unchanged: nurse cannot prescribe, OSS cannot read therapy', async () => {
  const resident = ids[2];
  const prescribe = await call(
    base,
    sessions['SIM-NURSE-1'],
    'POST',
    `/patients/${resident}/therapies`,
    {
      farmacoNome: 'Paracetamolo',
      dataInizio: '2033-01-01',
    },
  );
  assert.equal(prescribe.status, 403);
  const therapy = await call(
    base,
    sessions['SIM-OSS-1'],
    'GET',
    `/patients/${resident}/therapies/page`,
  );
  assert.equal(therapy.status, 403);
  assert.equal(await prisma.patientTherapy.count({ where: { patientId: resident } }), 0);
});

test('#389 a missing resident stays 404 and management privileges are not widened', async () => {
  const missing = await call(base, sessions['SIM-NURSE-1'], 'GET', '/patients/does-not-exist-389');
  assert.equal(missing.status, 404);
  assert.equal(hasGlobalPatientScope('operatore'), false);
  assert.equal(hasGlobalPatientScope('manager'), true);
});

test('#389 the AI assistant context (Agnos, /ai/actions, Tool Layer assistant.query) shares the facility reach', async () => {
  const { ctxFromOperator } = await import('../../routes/ai-assistant-public.js');
  const req = { operator: { id: 'SIM-NURSE-1', role: 'operatore' }, header: () => undefined };
  const ctx = await ctxFromOperator(req as never);
  assert.ok(Array.isArray(ctx.permittedPatientIds), 'explicit list, never the management null');
  for (const id of ids) assert.ok(ctx.permittedPatientIds!.includes(id), `AI reaches ${id}`);
});

test('#389 PRN («al bisogno») follows the facility reach: nurse records it on a doctor-registered resident', async () => {
  const { createTherapyInTx } = await import('../../therapies/therapy-create.js');
  const doctorResident = ids[0];
  const therapy = await prisma.$transaction((tx) =>
    createTherapyInTx(tx, doctorResident, {
      farmacoNome: 'Paracetamolo 389',
      dataInizio: new Date().toISOString().slice(0, 10),
      commercialStrengthValue: 500,
      commercialStrengthUnit: 'mg',
      pharmaceuticalForm: 'compressa',
      viaSomministrazione: 'orale',
      tipo: 'al_bisogno',
      operatoreInseritore: 'Test 389',
    }),
  );
  const nurse = sessions['SIM-NURSE-1'];
  const prn = await call(base, nurse, 'POST', '/therapy-slots/prn', {
    patientId: doctorResident,
    therapyId: therapy.id,
    indicazione: 'Febbre 38,2',
    requestId: randomUUID(),
  });
  assert.ok([200, 201].includes(prn.status), JSON.stringify(prn.body));
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date());
  const list = await call(
    base,
    nurse,
    'GET',
    `/therapy-slots/prn?patientId=${doctorResident}&date=${date}`,
  );
  assert.equal(list.status, 200, JSON.stringify(list.body));
  const items = (list.body.items ?? list.body) as unknown[];
  assert.equal(items.length, 1);
  // Append-only: the dose cannot be edited; deleting the prescription only detaches it.
  await assert.rejects(() =>
    prisma.prnAdministration.updateMany({
      where: { patientId: doctorResident },
      data: { indicazione: 'modificata' },
    }),
  );
  await prisma.patientTherapy.delete({ where: { id: therapy.id } });
  const detached = await prisma.prnAdministration.findFirst({
    where: { patientId: doctorResident },
  });
  assert.equal(detached?.therapyId, null);
  assert.equal(detached?.indicazione, 'Febbre 38,2');
});
