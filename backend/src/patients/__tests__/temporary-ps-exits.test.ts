import test from 'node:test';
import assert from 'node:assert/strict';
import { isConcurrentWriteConflict } from '../../therapies/administration-record.js';
import {
  parseTemporaryPsExitCommand,
  currentTemporaryPsExit,
  preserveTemporaryPsExits,
} from '../temporary-ps-exits.js';

const active = { exitId: 'exit-1', decision: 'pause', departedAt: '2026-10-17T10:00:00.000Z' };
const row = {
  id: 'exit-1',
  data: '2026-10-17',
  ora: '12:00',
  operatore: 'QA',
  psExit: {
    decision: 'pause',
    departedAt: active.departedAt,
    actorId: 'QA',
    requestId: 'request-1',
    requestHash: 'hash',
  },
};
const current = {
  liberatoria: { temporaryPsExit: active, usciteLog: [row], firmaPatient: 'originale' },
};

test('raw PostgreSQL serialization conflicts retry narrowly while unrelated query errors remain errors', () => {
  assert.equal(isConcurrentWriteConflict({ code: 'P2034' }), true);
  const raw = {
    code: 'P2010',
    meta: {
      driverAdapterError: { cause: { originalCode: '40001', kind: 'TransactionWriteConflict' } },
    },
  };
  assert.equal(isConcurrentWriteConflict(raw), true);
  assert.equal(
    isConcurrentWriteConflict({
      ...raw,
      meta: { driverAdapterError: { cause: { originalCode: '42601', kind: 'SyntaxError' } } },
    }),
    false,
  );
  assert.equal(isConcurrentWriteConflict({ code: 'P2010' }), false);
  assert.equal(isConcurrentWriteConflict(new Error('could not serialize access')), false);
});
test('exit decisions are explicit, confirmed and never accept client actor/time or mixed commands', () => {
  const command = {
    action: 'depart',
    decision: 'pause',
    reason: 'Motivo reale',
    requestId: 'request-1',
    confirmed: true,
  };
  assert.deepEqual(parseTemporaryPsExitCommand(command), command);
  for (const invalid of [
    null,
    [],
    {},
    { ...command, decision: undefined },
    { ...command, confirmed: false },
    { ...command, reason: ' ' },
    { ...command, actorId: 'spoof' },
    { ...command, departedAt: active.departedAt },
    { ...command, exitId: 'mixed' },
    { ...command, requestId: 'short' },
  ])
    assert.throws(() => parseTemporaryPsExitCommand(invalid));
  assert.deepEqual(
    parseTemporaryPsExitCommand({
      action: 'return',
      exitId: 'exit-1',
      requestId: 'request-2',
      confirmed: true,
    }),
    { action: 'return', exitId: 'exit-1', requestId: 'request-2', confirmed: true },
  );
});
test('managed hold requires matching immutable history; unknown/corrupt context is never permission to dose', () => {
  assert.deepEqual(currentTemporaryPsExit(current), active);
  assert.equal(currentTemporaryPsExit({}), null);
  for (const data of [
    { liberatoria: { temporaryPsExit: active, usciteLog: [] } },
    { liberatoria: { temporaryPsExit: { ...active, decision: 'unknown' }, usciteLog: [row] } },
    {
      liberatoria: {
        temporaryPsExit: active,
        usciteLog: [{ ...row, psExit: { ...row.psExit, returnedAt: active.departedAt } }],
      },
    },
  ])
    assert.throws(() => currentTemporaryPsExit(data));
});
test('ordinary writes retain managed history and active hold; explicit forge/erase/change is rejected', () => {
  const preserved = preserveTemporaryPsExits(current, {
    ordinary: 'saved',
    liberatoria: { firmaPatient: 'actual' },
  });
  assert.deepEqual(currentTemporaryPsExit(preserved), active);
  assert.deepEqual((preserved.liberatoria as any).usciteLog, [row]);
  assert.equal((preserved.liberatoria as any).firmaPatient, 'actual');
  for (const incoming of [
    { liberatoria: { temporaryPsExit: null } },
    { liberatoria: { temporaryPsExit: { ...active, decision: 'continue' } } },
    { liberatoria: { usciteLog: [{ ...row, psExit: undefined }] } },
    { liberatoria: { usciteLog: [{ ...row, id: 'forged' }] } },
  ])
    assert.throws(() => preserveTemporaryPsExits(current, incoming));
  assert.throws(() =>
    preserveTemporaryPsExits({}, { liberatoria: { temporaryPsExit: active, usciteLog: [row] } }),
  );
});
