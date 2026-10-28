import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../../lib/prisma.js';
import { assessmentReadTransaction } from '../../assessments/access.js';
import { toToolErrorShape } from '../../tools/errors.js';
import { setAuditPersistence, type AiAuditEventInput } from '../../ai/audit-store.js';
import {
  executeTemporaryPsExit,
  preserveTemporaryPsExits,
  temporaryPsExitReadState,
} from '../temporary-ps-exits.js';

const active = { exitId: 'exit-1', decision: 'pause', departedAt: '2026-10-21T12:00:00.000Z' };
const chart = {
  liberatoria: {
    temporaryPsExit: active,
    usciteLog: [
      { id: 'ordinary', note: 'Testo originale integrale' },
      {
        id: 'exit-1',
        note: 'Motivo originale integrale',
        psExit: { decision: 'pause', departedAt: active.departedAt },
      },
    ],
  },
};
const conflict = {
  code: 'P2010',
  meta: {
    driverAdapterError: { cause: { kind: 'TransactionWriteConflict', originalCode: '40001' } },
  },
};

test('multi-patient read isolates a dangling pointer without constructing a valid exit', () => {
  assert.deepEqual(
    temporaryPsExitReadState({ liberatoria: { temporaryPsExit: active, usciteLog: [] } }),
    { temporaryPsExit: null, temporaryPsExitUnverified: true },
  );
  assert.deepEqual(temporaryPsExitReadState(chart), { temporaryPsExit: active });
  assert.deepEqual(temporaryPsExitReadState({}), { temporaryPsExit: null });
});
test('partial chart writes preserve ordinary exit text and managed history when omitted', () => {
  const partial = preserveTemporaryPsExits(chart, { liberatoria: { firma: 'nuova' } });
  assert.deepEqual((partial.liberatoria as any).usciteLog, chart.liberatoria.usciteLog);
  assert.deepEqual(
    (preserveTemporaryPsExits(chart, { note: 'nuova' }).liberatoria as any).usciteLog,
    chart.liberatoria.usciteLog,
  );
  assert.throws(() =>
    preserveTemporaryPsExits(
      {},
      { liberatoria: { usciteLog: [{ id: 'forged', psExit: { decision: 'continue' } }] } },
    ),
  );
  const interspersed = {
    liberatoria: { ...chart.liberatoria, usciteLog: [...chart.liberatoria.usciteLog].reverse() },
  };
  assert.deepEqual(
    (preserveTemporaryPsExits(interspersed, { note: 'partial' }).liberatoria as any).usciteLog,
    interspersed.liberatoria.usciteLog,
  );
  assert.throws(() => preserveTemporaryPsExits(chart, { liberatoria: { temporaryPsExit: null } }));
});
test('assistant translates declared raw serialization errors only into a content-free conflict', () => {
  assert.deepEqual(toToolErrorShape({ ...conflict, message: 'private clinical payload' }), {
    code: 'conflict',
    status: 409,
    message: 'Conflitto con lo stato corrente',
    domainCode: 'P2010',
  });
  assert.equal(
    toToolErrorShape({
      code: 'P2010',
      meta: { driverAdapterError: { cause: { originalCode: '42601' } } },
    }).status,
    500,
  );
});
test('read-only retry restarts complete snapshots, stops at three, and never retries unrelated errors', async () => {
  const original = prisma.$transaction;
  let calls = 0,
    reads = 0;
  try {
    (prisma as any).$transaction = async (action: any, options: any) => {
      calls++;
      assert.equal(options.isolationLevel, 'RepeatableRead');
      return action({ $executeRaw: async () => {}, attempt: calls });
    };
    assert.equal(
      await assessmentReadTransaction(async (tx: any) => {
        reads++;
        if (tx.attempt < 3) throw conflict;
        return tx.attempt;
      }),
      3,
    );
    assert.equal(reads, 3);
    calls = 0;
    await assert.rejects(
      assessmentReadTransaction(async () => {
        throw conflict;
      }),
    );
    assert.equal(calls, 3);
    calls = 0;
    await assert.rejects(
      assessmentReadTransaction(async () => {
        throw new Error('syntax');
      }),
    );
    assert.equal(calls, 1);
  } finally {
    prisma.$transaction = original;
  }
});
test('depart and return audit actor/role and decision only; discharged/legacy archived reject before writes', async () => {
  const original = prisma.$transaction;
  const audits: AiAuditEventInput[] = [];
  let saved: any = { statoRicovero: 'ricoverato', privateText: 'must not reach audit' },
    writes = 0;
  setAuditPersistence(async (e) => {
    audits.push(e);
  });
  try {
    (prisma as any).$transaction = async (action: any) =>
      action({
        $queryRaw: async (q: any) =>
          (Array.isArray(q) ? q.join('') : q.strings.join('')).includes('SELECT data')
            ? [{ data: structuredClone(saved) }]
            : [{ id: 'patient' }],
        cartella: {
          upsert: async ({ update }: any) => {
            writes++;
            saved = update.data;
            return { data: saved };
          },
        },
      });
    const actor = { id: 'operator', role: 'operatore', name: 'Private Name' };
    const depart = {
      action: 'depart',
      decision: 'pause',
      reason: 'Private reason',
      requestId: 'request-depart',
      confirmed: true,
    };
    await executeTemporaryPsExit('patient', depart, actor);
    const exitId = saved.liberatoria.temporaryPsExit.exitId;
    await executeTemporaryPsExit(
      'patient',
      { action: 'return', exitId, requestId: 'request-return', confirmed: true },
      actor,
    );
    assert.deepEqual(
      audits.map((e) => e.actionType),
      ['temporary_ps_exit.depart', 'temporary_ps_exit.return'],
    );
    assert.ok(audits.every((e) => e.operatorId === actor.id && e.operatorRole === actor.role));
    assert.match(JSON.stringify(audits), /decision:pause/);
    assert.doesNotMatch(JSON.stringify(audits), /Private|must not reach audit/);
    for (const status of ['dimesso', 'archiviato']) {
      saved = { statoRicovero: status };
      const prior = writes;
      await assert.rejects(
        executeTemporaryPsExit('patient', depart, actor),
        (e: any) => e.status === 409 && e.code === 'temporary_ps_exit_patient_discharged',
      );
      assert.equal(writes, prior);
      assert.equal(audits.length, 2);
    }
  } finally {
    prisma.$transaction = original;
    setAuditPersistence(null);
  }
});
