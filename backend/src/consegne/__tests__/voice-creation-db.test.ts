import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { prisma } from '../../lib/prisma.js';
import { executeCommand } from '../../ai/actions/orchestrate.js';
import { voiceIdempotency, IdempotencyStore } from '../../ai/voice/idempotency.js';
import { createConsegna } from '../../services/consegna-service.js';
import {
  actor,
  other,
  patient,
  id,
  payload,
  headers,
  seed,
  clean,
  httpServer,
} from './po08-fixture.js';

let http: Awaited<ReturnType<typeof httpServer>>;
before(async () => {
  await seed();
  http = await httpServer();
});
after(async () => {
  await http.close();
  await clean();
});
const text = 'aggiungi una consegna: controllare la pressione';
const operatorCtx = {
  operatorId: actor.id,
  operatorName: 'Ada Autrice',
  gatewayCtx: {
    userId: actor.id,
    tenantId: 'default',
    roles: ['operatore'],
    permittedPatientIds: [patient],
    requestId: id('audit'),
  },
};

test('voice replay always reaches the durable service despite stale memory and concurrent confirmations', async () => {
  const key = id('voice-concurrent');
  voiceIdempotency.put(key, {
    ok: true,
    actionType: 'create_consegna',
    recordId: 'wrong-cached-id',
    message: 'cached',
    deduped: false,
  });
  const command = {
    text,
    channel: 'voce' as const,
    patientId: patient,
    idempotencyKey: key,
    confirmed: true,
    operatorCtx,
  };
  const results = await Promise.all(Array.from({ length: 4 }, () => executeCommand(command)));
  assert.equal(new Set(results.map((row) => row.recordId)).size, 1);
  assert.notEqual(results[0].recordId, 'wrong-cached-id');
  assert.equal(results.filter((row) => !row.deduped).length, 1);
  const restartedCache = await executeCommand(command, { store: new IdempotencyStore() });
  assert.equal(restartedCache.recordId, results[0].recordId);
  assert.equal(restartedCache.deduped, true);
  await assert.rejects(
    executeCommand({ ...command, text: 'aggiungi una consegna: nota differente' }),
    { code: 'consegna_request_conflict' },
  );
  await prisma.consegna.delete({ where: { id: results[0].recordId } });
  await assert.rejects(executeCommand(command), { code: 'consegna_creation_deleted', status: 410 });
});

test('a response lost with the first process is replayed from PostgreSQL by a new process', async () => {
  const input = payload(id('process-restart'));
  const code = `const {createConsegna}=await import(process.env.PO08_SERVICE_MODULE);
    const {prisma}=await import(process.env.PO08_PRISMA_MODULE);
    try { const row=await createConsegna(JSON.parse(process.env.PO08_INPUT),JSON.parse(process.env.PO08_ACTOR));
      console.log(JSON.stringify({id:row.id,replayed:row.replayed})); } finally { await prisma.$disconnect(); }`;
  const env = {
    ...process.env,
    PO08_SERVICE_MODULE: new URL('../../services/consegna-service.ts', import.meta.url).href,
    PO08_PRISMA_MODULE: new URL('../../lib/prisma.ts', import.meta.url).href,
    PO08_INPUT: JSON.stringify(input),
    PO08_ACTOR: JSON.stringify(actor),
  };
  const run = () => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', '--input-type=module', '--eval', code],
      { cwd: process.cwd(), env, windowsHide: true, encoding: 'utf8', timeout: 30_000 },
    );
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout.trim());
  };
  const first = run();
  const second = run();
  assert.equal(first.replayed, false);
  assert.equal(second.replayed, true);
  assert.equal(second.id, first.id);
});

test('REST, typed Agnos and voice share receipt semantics and preserve their error envelopes', async () => {
  const key = id('channels');
  const request = (channel: 'voice' | 'actions', body: unknown) =>
    fetch(`${http.base}/ai/${channel}/execute`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    });
  const voiceBody = { transcript: text, patientId: patient, idempotencyKey: key, confirmed: true };
  const voice = await request('voice', voiceBody);
  assert.equal(voice.status, 200);
  const result = await voice.json();
  const typed = await request('actions', {
    text,
    patientId: patient,
    idempotencyKey: key,
    confirmed: true,
  });
  assert.equal(typed.status, 200);
  assert.equal((await typed.json()).deduped, true);
  const rest = await createConsegna(payload(key, { note: 'controllare la pressione' }), actor);
  assert.equal(rest.id, result.recordId);
  assert.equal(rest.replayed, true);
  for (const channel of ['voice', 'actions'] as const) {
    const conflict = await request(channel, {
      ...voiceBody,
      transcript: 'aggiungi una consegna: cambiata',
      text: 'aggiungi una consegna: cambiata',
    });
    assert.equal(conflict.status, 409);
    assert.equal((await conflict.json()).code, 'consegna_request_conflict');
  }
  await prisma.consegna.delete({ where: { id: result.recordId } });
  for (const channel of ['voice', 'actions'] as const) {
    const deleted = await request(channel, { ...voiceBody, text });
    assert.equal(deleted.status, 410);
    assert.equal((await deleted.json()).consegnaId, result.recordId);
  }
});

test('voice still requires confirmation and current patient scope even for a previously saved key', async () => {
  const command = {
    text,
    channel: 'voce' as const,
    patientId: patient,
    idempotencyKey: id('voice-revoke'),
    confirmed: false,
    operatorCtx,
  };
  await assert.rejects(executeCommand(command), { kind: 'confirmation_required' });
  assert.equal(
    await prisma.consegnaCreationReceipt.count({ where: { requestId: command.idempotencyKey } }),
    0,
  );
  await executeCommand({ ...command, confirmed: true });
  await prisma.patient.update({ where: { id: patient }, data: { registeredById: other.id } });
  try {
    await assert.rejects(executeCommand({ ...command, confirmed: true }), /Paziente non trovato/);
  } finally {
    await prisma.patient.update({ where: { id: patient }, data: { registeredById: actor.id } });
  }
});
