import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { prisma } from '../../lib/prisma.js';
import { ensureSimulatedIdentity, SIMULATED_IDENTITIES } from '../../authz/simulator.js';
import { facilityClock } from '../../lib/facility-time.js';
import { createTherapyInTx } from '../../therapies/therapy-create.js';
import { recordTherapyAdministrationResult } from '../../therapies/administration-record.js';
import { recordPrnAdministration } from '../../therapies/prn-administration.js';
import { executeTemporaryPsExit, currentTemporaryPsExit } from '../temporary-ps-exits.js';
import { saveCartella } from '../cartella-update.js';

process.env.RESIDENT_SCOPE_CONFIG ??= JSON.stringify({ fallback: 'registered_by_me' });
const actor = { id: 'SIM-NURSE-1', role: 'operatore', name: 'Infermiere QA PS' };
const prefix = `ps-exit-${randomUUID()}`;
const ids: string[] = [];
const today = facilityClock(new Date()).date;
const leave = (decision: 'pause' | 'continue' = 'pause') => ({
  action: 'depart',
  decision,
  reason: 'Trasferimento sintetico PS',
  requestId: randomUUID(),
  confirmed: true,
});
async function fixture(chart = false) {
  const id = `${prefix}-${ids.length}`;
  ids.push(id);
  await prisma.patient.create({
    data: {
      id,
      medicalRecordNumber: id,
      firstName: 'QA',
      lastName: 'Uscita',
      registeredById: actor.id,
    },
  });
  if (chart)
    await prisma.cartella.create({ data: { patientId: id, data: { note: 'preservare' } } });
  const make = (tipo: string) =>
    prisma.$transaction((tx) =>
      createTherapyInTx(tx, id, {
        farmacoNome: `QA PS ${tipo}`,
        tipo,
        dataInizio: today,
        stato: 'attiva',
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
  return { id, scheduled: await make('periodica'), prn: await make('al_bisogno') };
}
const scheduledBody = (f: Awaited<ReturnType<typeof fixture>>) => ({
  patientId: f.id,
  therapyId: f.scheduled.id,
  date: today,
  fascia: 'mattina',
  scheduledTime: '08:00',
  requestId: randomUUID(),
  expectedStato: 'da_erogare',
});
const prnBody = (f: Awaited<ReturnType<typeof fixture>>) => ({
  patientId: f.id,
  therapyId: f.prn.id,
  indicazione: 'Indicazione sintetica',
  requestId: randomUUID(),
});
before(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  assert(['127.0.0.1', 'localhost'].includes(url.hostname));
  assert.match(url.pathname, /^\/clinicos_(?:qa_[a-z0-9_]+|test)$/i);
  await ensureSimulatedIdentity(SIMULATED_IDENTITIES.find((identity) => identity.id === actor.id)!);
});
after(async () => {
  await prisma.patient.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

test('pause/continue and return persist; retries preserve exact history and valid dose receipts', async () => {
  const f = await fixture(true),
    prior = prnBody(f),
    first = scheduledBody(f);
  const priorPrn = await recordPrnAdministration(prior, actor);
  const firstDose = await recordTherapyAdministrationResult(first, actor, {
    notAdministered: false,
  });
  const command = leave();
  const parallel = await Promise.all([
    executeTemporaryPsExit(f.id, command, actor),
    executeTemporaryPsExit(f.id, command, actor),
  ]);
  assert.deepEqual(parallel.map((result) => result.replayed).sort(), [false, true]);
  const result = parallel[0];
  const active = currentTemporaryPsExit(result.data)!;
  assert.equal((await executeTemporaryPsExit(f.id, command, actor)).replayed, true);
  assert.equal((result.data as any).liberatoria.usciteLog.length, 1);
  assert.equal(
    (result.data as any).liberatoria.compilatoAt,
    undefined,
    'exit is not legal consent',
  );
  assert.equal((await recordPrnAdministration(prior, actor)).record.id, priorPrn.record.id);
  assert.equal(
    (await recordTherapyAdministrationResult(first, actor, { notAdministered: false })).record.id,
    firstDose.record.id,
  );
  await assert.rejects(recordPrnAdministration(prnBody(f), actor), (e: any) => e.status === 409);
  await assert.rejects(
    executeTemporaryPsExit(f.id, { ...command, decision: 'continue' }, actor),
    (e: any) => e.status === 409,
  );
  const ordinary = await saveCartella(f.id, { note: 'unrelated' }, actor);
  assert.equal(currentTemporaryPsExit(ordinary.data)?.exitId, active.exitId);
  await assert.rejects(
    saveCartella(f.id, { liberatoria: { temporaryPsExit: null } }, actor),
    (e: any) => e.status === 409,
  );
  const back = {
    action: 'return',
    exitId: active.exitId,
    requestId: randomUUID(),
    confirmed: true,
  };
  const returned = await executeTemporaryPsExit(f.id, back, actor);
  assert.equal(currentTemporaryPsExit(returned.data), null);
  assert.equal((await executeTemporaryPsExit(f.id, back, actor)).replayed, true);
  assert.ok((returned.data as any).liberatoria.usciteLog[0].psExit.returnedAt);
  assert.equal((await recordPrnAdministration(prnBody(f), actor)).replayed, false);
  const continued = await executeTemporaryPsExit(f.id, leave('continue'), actor);
  assert.equal(currentTemporaryPsExit(continued.data)?.decision, 'continue');
  await recordPrnAdministration(prnBody(f), actor);
});

test('real row-lock interleaving prevents scheduled/PRN dose after committed pause, with absent and present charts', async () => {
  for (const chart of [false, true])
    for (const kind of ['scheduled', 'prn']) {
      const f = await fixture(chart),
        barrier = new Client({ connectionString: process.env.DATABASE_URL });
      await barrier.connect();
      let departure: Promise<any> | undefined, dose: Promise<any> | undefined;
      const waiters = async (minimum: number) => {
        for (let n = 0; n < 200; n++) {
          const rows = await prisma.$queryRaw<
            Array<{ count: bigint }>
          >`SELECT count(*) FROM pg_stat_activity
          WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%UPDATE "Patient" p SET "updatedAt"%'`;
          if (Number(rows[0].count) >= minimum) return;
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        assert.fail('Actual conflicting writers must be observed waiting before releasing lock');
      };
      try {
        await barrier.query('BEGIN');
        await barrier.query('UPDATE "Patient" SET "updatedAt"="updatedAt" WHERE id=$1', [f.id]);
        departure = executeTemporaryPsExit(f.id, leave(), actor);
        await waiters(1);
        const operation =
          kind === 'scheduled'
            ? recordTherapyAdministrationResult(scheduledBody(f), actor, { notAdministered: false })
            : recordPrnAdministration(prnBody(f), actor);
        dose = operation.then(
          () => ({ succeeded: true }),
          (error) => ({ error }),
        );
        await waiters(2);
        await barrier.query('COMMIT');
        assert.equal(currentTemporaryPsExit((await departure).data)?.decision, 'pause');
        const outcome = await dose;
        assert.ok(outcome.error, 'A stale transaction must never administer after the pause');
        assert.equal(
          await prisma.medicationAdministration.count({ where: { patientId: f.id } }),
          0,
        );
        assert(
          outcome.error.status === 409 || outcome.error.code === 'P2034',
          JSON.stringify({
            kind,
            chart,
            name: outcome.error.name,
            status: outcome.error.status,
            code: outcome.error.code,
            message: outcome.error.message,
            meta: outcome.error.meta,
          }),
        );
        assert.equal(await prisma.prnAdministration.count({ where: { patientId: f.id } }), 0);
        await assert.rejects(
          recordPrnAdministration(prnBody(f), actor),
          (e: any) => e.status === 409,
        );
        const noDose = { ...scheduledBody(f), motivo: 'paziente_assente' };
        assert.equal(
          (await recordTherapyAdministrationResult(noDose, actor, { notAdministered: true })).record
            .stato,
          'non_erogata',
        );
        console.log(
          'PS_INTERLEAVING',
          JSON.stringify({
            kind,
            initialChart: chart,
            observedWaitingWriters: 2,
            scheduledDosesAfterPause: 0,
            prnDosesAfterPause: 0,
            explicitAbsenceRecord: 'non_erogata',
            result: 'passed',
          }),
        );
      } finally {
        await barrier.query('ROLLBACK');
        await barrier.end();
        await Promise.allSettled([departure, dose].filter(Boolean));
      }
    }
});
