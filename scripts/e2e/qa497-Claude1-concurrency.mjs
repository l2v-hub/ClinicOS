// UNRUN by author. Root QA: node --import tsx scripts/e2e/qa497-Claude1-concurrency.mjs
// Requires an already-running backend connected to the same root-owned disposable clinicos_qa_* DB.
// Does not start services or provision/drop databases. Synthetic fixtures remain for root inspection.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { Prisma } from '@prisma/client';
import { toToolErrorShape } from '../../backend/src/tools/errors.ts';
import { prisma } from '../../backend/src/lib/prisma.ts';
import {
  ensureSimulatedIdentity,
  SIMULATED_IDENTITIES,
} from '../../backend/src/authz/simulator.ts';
import { facilityClock } from '../../backend/src/lib/facility-time.ts';
import { createTherapyInTx } from '../../backend/src/therapies/therapy-create.ts';
import {
  confirmTherapyAdministration,
  recordTherapyAdministrationResult,
} from '../../backend/src/therapies/administration-record.ts';
import { recordPrnAdministration } from '../../backend/src/therapies/prn-administration.ts';
import { createAssessment, finalizeAssessment } from '../../backend/src/assessments/service.ts';
import { transfersInput } from '../../backend/src/assessments/__tests__/transfers-fixture.ts';
import {
  executeTemporaryPsExit,
  currentTemporaryPsExit,
} from '../../backend/src/patients/temporary-ps-exits.ts';
import { temporaryPsAdministrationAllowedSql } from '../../backend/src/patients/temporary-ps-query.ts';
import { savePatientParameterMonth } from '../../backend/src/patients/parameters-update.ts';
import { prismaVoiceWriter } from '../../backend/src/ai/voice/write-services.ts';
import { confirmJob } from '../../backend/src/ai/upload/confirm-service.ts';

const db = new URL(process.env.DATABASE_URL ?? '');
assert(['127.0.0.1', 'localhost'].includes(db.hostname));
assert.match(db.pathname, /^\/clinicos_qa_[a-z0-9_]+$/);
assert.equal(
  process.env.QA497_OWNED_DATABASE,
  db.pathname.slice(1),
  'root must explicitly identify its disposable DB',
);
const base = new URL(process.env.QA497_BASE_URL ?? '');
assert(['127.0.0.1', 'localhost'].includes(base.hostname));
const actor = { id: 'SIM-NURSE-1', role: 'operatore', name: 'QA Followup' };
const today = facilityClock(new Date()).date;
const prefix = `qa497c1-${randomUUID()}`;
const headers = {
  'Content-Type': 'application/json',
  'X-Operator-Id': actor.id,
  'X-Operator-Role': actor.role,
};
const events = [];
const request = async (path) => {
  const r = await fetch(new URL(path, base), { headers, signal: AbortSignal.timeout(15000) });
  return { status: r.status, body: await r.json() };
};
const leave = () => ({
  action: 'depart',
  decision: 'pause',
  reason: 'Synthetic reason retained in chart',
  requestId: randomUUID(),
  confirmed: true,
});
const chart = async (id) =>
  (await prisma.cartella.findUniqueOrThrow({ where: { patientId: id } })).data;
const makePatient = async (suffix) => {
  const id = `${prefix}-${suffix}`;
  await prisma.patient.create({
    data: {
      id,
      medicalRecordNumber: id,
      firstName: 'Synthetic',
      lastName: suffix,
      registeredById: actor.id,
    },
  });
  await prisma.cartella.create({
    data: {
      patientId: id,
      data: { statoRicovero: 'ricoverato', note: 'Untrusted clinical text preserved in full' },
    },
  });
  const create = (tipo) =>
    prisma.$transaction((tx) =>
      createTherapyInTx(tx, id, {
        farmacoNome: `Synthetic ${tipo}`,
        tipo,
        stato: 'attiva',
        dataInizio: today,
        dosaggio: '1 compressa',
        viaSomministrazione: 'orale',
        schedules: [
          {
            time: '08:00',
            quantityNumerator: 1,
            quantityDenominator: 1,
            administrationUnit: 'compressa',
          },
        ],
      }),
    );
  return { id, scheduled: await create('periodica'), prn: await create('al_bisogno') };
};
const dose = (f) => ({
  patientId: f.id,
  therapyId: f.scheduled.id,
  date: today,
  fascia: 'mattina',
  scheduledTime: '08:00',
  expectedStato: 'da_erogare',
});
async function waiting(minimum) {
  for (let i = 0; i < 250; i++) {
    const [r] =
      await prisma.$queryRaw`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%Patient%'`;
    if (r.n >= minimum) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  assert.fail(`Did not observe ${minimum} actual PostgreSQL lock waiters`);
}
async function parentBarrier(id, operations) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  let pending = [];
  try {
    await client.query('BEGIN');
    await client.query('UPDATE "Patient" SET "updatedAt"="updatedAt" WHERE id=$1', [id]);
    for (const operation of operations) {
      pending.push(operation());
      await waiting(pending.length);
    }
    await client.query('COMMIT');
    return await Promise.all(pending);
  } finally {
    await client.query('ROLLBACK');
    await client.end();
    await Promise.allSettled(pending);
  }
}
try {
  await ensureSimulatedIdentity(SIMULATED_IDENTITIES.find((i) => i.id === actor.id));
  const f = await makePatient('readers');
  const draft = (await createAssessment(f.id, transfersInput(), actor)).assessment;
  const final = (
    await finalizeAssessment(f.id, draft.id, { requestId: randomUUID(), expectedVersion: 1 }, actor)
  ).assessment;
  // The real dose has modified Patient but cannot commit until BOTH HTTP reads wait on that row.
  let entered, release;
  const held = new Promise((r) => (entered = r)),
    gate = new Promise((r) => (release = r));
  const doseTx = prisma.$transaction(
    async (tx) => {
      await confirmTherapyAdministration(dose(f), actor, tx);
      entered();
      await gate;
    },
    { timeout: 15000 },
  );
  await Promise.race([held, doseTx]);
  let reads;
  try {
    reads = [
      request(`/patients/${f.id}/assessments?type=postural_transfers`),
      request(`/patients/${f.id}/assessments/${final.id}/attestations`),
    ];
    await waiting(2);
  } finally {
    release();
  }
  await doseTx;
  assert.deepEqual(
    (await Promise.all(reads)).map((r) => r.status),
    [200, 200],
  );
  events.push('F10 actual dose/HTTP history+attestation interleaving: 200/200');
  // Induce a genuine raw PostgreSQL40001 in a stale snapshot, then use the Assistant's mapper.
  const versionWriter = new Client({ connectionString: process.env.DATABASE_URL });
  await versionWriter.connect();
  try {
    let serializationError;
    try {
      await prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Patient" WHERE id=${f.id}`;
          await versionWriter.query('UPDATE "Patient" SET "updatedAt"="updatedAt" WHERE id=$1', [
            f.id,
          ]);
          await tx.$queryRaw`SELECT id FROM "Patient" WHERE id=${f.id} FOR SHARE`;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      );
    } catch (error) {
      serializationError = error;
    }
    assert.ok(serializationError, 'must induce actual PostgreSQL serialization failure');
    assert.equal(toToolErrorShape(serializationError).status, 409);
    events.push('F10 actual PostgreSQL40001 maps to Assistant409');
  } finally {
    await versionWriter.end();
  }

  const p = await makePatient('parameters');
  const month = {
    id: randomUUID(),
    mese: 10,
    anno: 2026,
    giorni: [{ giorno: 21, note: 'Preserve full parameter text' }],
    createdAt: new Date().toISOString(),
  };
  await parentBarrier(p.id, [
    () => executeTemporaryPsExit(p.id, leave(), actor),
    () => savePatientParameterMonth(p.id, { month }, actor),
  ]);
  const departed = await chart(p.id);
  assert.equal(currentTemporaryPsExit(departed).decision, 'pause');
  assert.equal(departed.parametriMensili[0].giorni[0].note, month.giorni[0].note);
  const exitId = currentTemporaryPsExit(departed).exitId;
  await parentBarrier(p.id, [
    () =>
      executeTemporaryPsExit(
        p.id,
        { action: 'return', exitId, requestId: randomUUID(), confirmed: true },
        actor,
      ),
    () =>
      prismaVoiceWriter.createVitalSign(
        p.id,
        { etichetta: 'FC', valore: '80', unita: 'bpm' },
        {
          operatorId: actor.id,
          operatorRole: actor.role,
          operatorName: actor.name,
          nowISO: new Date().toISOString(),
        },
      ),
  ]);
  const returned = await chart(p.id);
  assert.equal(currentTemporaryPsExit(returned), null);
  assert.ok(returned.liberatoria.usciteLog[0].psExit.returnedAt);
  assert.equal(returned.parametriVitali.length, 1);
  events.push('F11 actual parameters/depart and voice/return interleavings preserve history');
  // Exercise the real import merge, not just the standalone JSON guard.
  for (const liberatoria of [
    {
      temporaryPsExit: {
        exitId: 'forged',
        decision: 'continue',
        departedAt: new Date().toISOString(),
      },
    },
    { usciteLog: [{ id: 'forged', psExit: { decision: 'continue' } }] },
  ]) {
    const job = await prisma.importJob.create({
      data: {
        createdById: actor.id,
        status: 'review_ready',
        maxFiles: 1,
        maxTotalBytes: 1000,
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    const before = await chart(p.id);
    await assert.rejects(
      confirmJob(
        job.id,
        {
          mode: 'existing',
          patientId: p.id,
          patient: { firstName: 'Synthetic', lastName: 'parameters' },
          cartella: { liberatoria },
        },
        actor,
      ),
      (e) => e.status === 409,
    );
    assert.deepEqual(await chart(p.id), before);
  }
  events.push('F11 real AI-import forgery rejected atomically');

  const bad = await makePatient('malformed'),
    good = await makePatient('valid');
  await prisma.cartella.update({
    where: { patientId: bad.id },
    data: {
      data: {
        liberatoria: {
          temporaryPsExit: {
            exitId: 'dangling',
            decision: 'continue',
            departedAt: new Date().toISOString(),
          },
          usciteLog: [],
        },
      },
    },
  });
  const page = await request(`/therapy-slots/page?date=${today}&limit=250`);
  assert.equal(page.status, 200);
  const patients = page.body.slots.flatMap((s) => s.patients);
  assert.ok(
    patients.some(
      (p) =>
        p.patientId === bad.id &&
        p.temporaryPsExit === null &&
        p.temporaryPsExitUnverified === true,
    ),
  );
  assert.ok(patients.some((p) => p.patientId === good.id && !p.temporaryPsExitUnverified));
  const prn = await request(`/therapy-slots/prn?patientId=${bad.id}&date=${today}`);
  assert.equal(prn.status, 409);
  assert.equal(prn.body.code, 'temporary_ps_exit_conflict');
  await assert.rejects(
    recordTherapyAdministrationResult({ ...dose(bad), requestId: randomUUID() }, actor, {
      notAdministered: false,
    }),
    (e) => e.status === 409,
  );
  await assert.rejects(
    recordPrnAdministration(
      {
        patientId: bad.id,
        therapyId: bad.prn.id,
        indicazione: 'Synthetic',
        requestId: randomUUID(),
      },
      actor,
    ),
    (e) => e.status === 409,
  );
  await recordTherapyAdministrationResult({ ...dose(good), requestId: randomUUID() }, actor, {
    notAdministered: false,
  });
  const continuedActive = {
    exitId: 'continued',
    decision: 'continue',
    departedAt: '2026-10-21T12:00:00.000Z',
  };
  const continuedRow = {
    id: 'continued',
    psExit: { decision: 'continue', departedAt: continuedActive.departedAt },
  };
  const continued = {
    liberatoria: { temporaryPsExit: continuedActive, usciteLog: [continuedRow] },
  };
  // Compare bounded attention's SQL policy with the strict reader over actual PostgreSQL JSON values.
  for (const data of [
    null,
    {},
    departed,
    continued,
    { liberatoria: { temporaryPsExit: continuedActive, usciteLog: 'malformed' } },
    {
      liberatoria: {
        temporaryPsExit: continuedActive,
        usciteLog: [
          {
            ...continuedRow,
            psExit: { ...continuedRow.psExit, returnedAt: '2026-10-21T13:00:00.000Z' },
          },
          continuedRow,
        ],
      },
    },
    returned,
    await chart(bad.id),
    {
      liberatoria: {
        temporaryPsExit: {
          exitId: 'invalid-date',
          decision: 'continue',
          departedAt: '2026-99-21T10:00:00Z',
        },
        usciteLog: [],
      },
    },
  ]) {
    let allowed;
    try {
      allowed = currentTemporaryPsExit(data)?.decision !== 'pause';
    } catch {
      allowed = false;
    }
    const [result] = await prisma.$queryRaw(
      Prisma.sql`SELECT COALESCE(${temporaryPsAdministrationAllowedSql(Prisma.sql`${JSON.stringify(data)}::jsonb`)},false) AS allowed`,
    );
    assert.equal(result.allowed, allowed);
  }
  events.push(
    'F12 mixed HTTP200, typed PRN409, per-patient administration denial and actual SQL parity',
  );

  const discharged = await makePatient('discharged');
  await prisma.cartella.update({
    where: { patientId: discharged.id },
    data: { data: { statoRicovero: 'dimesso' } },
  });
  const before = await chart(discharged.id);
  await assert.rejects(
    executeTemporaryPsExit(discharged.id, leave(), actor),
    (e) => e.status === 409,
  );
  assert.deepEqual(await chart(discharged.id), before);
  let audits = [];
  for (let i = 0; i < 100; i++) {
    audits = await prisma.aiAuditEvent.findMany({
      where: {
        patientId: p.id,
        actionType: { in: ['temporary_ps_exit.depart', 'temporary_ps_exit.return'] },
      },
    });
    if (audits.length >= 2) break;
    await new Promise((r) => setTimeout(r, 20));
  }
  assert.deepEqual(
    new Set(audits.map((a) => a.actionType)),
    new Set(['temporary_ps_exit.depart', 'temporary_ps_exit.return']),
  );
  assert.ok(audits.every((a) => a.operatorId === actor.id && a.operatorRole === actor.role));
  assert.doesNotMatch(
    JSON.stringify(audits.map(({ fields }) => fields)),
    /Synthetic reason|Untrusted clinical/,
  );
  events.push(
    'F17 distinct durable depart/return audit actor+role; discharged departure writes no chart',
  );
  console.log(JSON.stringify({ result: 'PASS', prefix, events }));
} finally {
  await prisma.$disconnect();
}
