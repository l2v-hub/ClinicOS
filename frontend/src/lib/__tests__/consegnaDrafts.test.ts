import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createConsegnaDraftStore, submitConsegna } from '../consegnaDrafts';
import { canAdvanceConsegna, type ConsegnaAdvanceToken } from '../consegnaAdvance';
import { input, saved } from './consegnaGiro.fixtures';
import { deferred } from './rosterOrder.fixtures';
import type { ConsegnaCreateResult } from '../consegnaCreation';
const prepared = () => {
  const store = createConsegnaDraftStore();
  store.update(input.pazienteId, input);
  return store;
};

test('workspace fields and local revisions remain patient-specific across unsubscribe/remount', () => {
  const store = prepared();
  const initial = store.get(input.pazienteId);
  let calls = 0;
  const unsubscribe = store.subscribe(() => {
    calls++;
  });
  store.update('patient-b', { note: 'Bozza B', priorita: 'urgente' });
  unsubscribe();
  assert.equal(store.get(input.pazienteId), initial);
  assert.equal(store.get('patient-b').fields.note, 'Bozza B');
  assert.equal(calls, 1);
  assert.equal(store.hasUnsaved(), true);
  assert.equal(initial.fields.operatoreAssegnatoId, input.operatoreAssegnatoId);
});

test('synchronous lock prevents a second save and exact pending request survives uncertain outcome', async () => {
  const store = prepared();
  const token = store.begin(input.pazienteId)!;
  assert.equal(store.begin(input.pazienteId), null);
  store.discard(input.pazienteId);
  assert.equal(store.get(input.pazienteId).saving, true);
  await submitConsegna(store, token, async () => {
    throw new Error('response lost');
  });
  store.update(input.pazienteId, { note: 'Must not replace uncertain payload' });
  const retry = store.begin(input.pazienteId)!;
  assert.equal(retry.request, token.request);
  assert.equal(retry.request.note, input.note);
  assert.equal(
    await submitConsegna(store, retry, async (request) => ({ ...saved(request), replayed: true })),
    true,
  );
  assert.equal(store.get(input.pazienteId).fields.note, '');
  assert.equal(store.get(input.pazienteId).receipt?.requestId, token.request.requestId);
});

test('concurrent patients cannot clear one another and a refreshed receipt is independent of summary failures', async () => {
  const store = prepared();
  store.update('patient-b', { note: 'Bozza B' });
  const first = store.begin(input.pazienteId)!;
  const second = store.begin('patient-b')!;
  assert.equal(await submitConsegna(store, first, async (request) => saved(request)), true);
  assert.equal(store.get('patient-b').saving, true);
  assert.equal(store.get('patient-b').fields.note, 'Bozza B');
  store.finish(second, {
    kind: 'failed',
    uncertain: false,
    code: 'validation',
    message: 'Nota non valida',
  });
  assert.equal(store.get(input.pazienteId).receipt?.record.id, 'synthetic-consegna');
});

test('410, conflict and denied outcomes keep their draft/request and never start a silent replacement', async () => {
  for (const code of [
    'consegna_creation_deleted',
    'consegna_request_conflict',
    'patient_not_found',
  ]) {
    const store = prepared();
    const token = store.begin(input.pazienteId)!;
    assert.equal(
      await submitConsegna(store, token, async () => ({
        kind: 'failed',
        uncertain: false,
        code,
        message: 'Dati conservati',
      })),
      false,
    );
    assert.equal(store.get(input.pazienteId).pending, token.request);
    assert.equal(store.get(input.pazienteId).fields.note, input.note);
    assert.equal(store.begin(input.pazienteId), null);
  }
});

test('a definitive validation failure allows correction and creates a new immutable request', () => {
  const store = prepared();
  const token = store.begin(input.pazienteId)!;
  store.finish(token, {
    kind: 'failed',
    uncertain: false,
    code: 'validation',
    message: 'Correggi',
  });
  store.update(input.pazienteId, { note: 'Correzione' });
  const next = store.begin(input.pazienteId)!;
  assert.notEqual(next.request.requestId, token.request.requestId);
  assert.equal(next.request.note, 'Correzione');
});

test('logout generation rejects a late receipt, and wrong patient receipt cannot clear a draft', async () => {
  const store = prepared();
  const token = store.begin(input.pazienteId)!;
  const pending = deferred<ConsegnaCreateResult>();
  const work = submitConsegna(store, token, () => pending.promise);
  store.clear();
  pending.resolve(saved(token.request));
  assert.equal(await work, false);
  assert.equal(store.get(input.pazienteId).receipt, null);
  const other = prepared();
  const current = other.begin(input.pazienteId)!;
  const wrong = saved(current.request);
  wrong.record.pazienteId = 'other';
  assert.equal(other.finish(current, wrong), false);
  assert.equal(other.get(input.pazienteId).fields.note, input.note);
});

test('advance is fenced by successful receipt, selection including away/back, roster and request identity', () => {
  const token: ConsegnaAdvanceToken = {
    patientId: 'a',
    successorId: 'b',
    selection: 2,
    roster: 3,
    requestKey: 'q-room-order-context-epoch',
  };
  assert.equal(canAdvanceConsegna(token, token, true), true);
  assert.equal(canAdvanceConsegna(token, token, false), false);
  for (const change of [
    { patientId: 'other' },
    { selection: 4 },
    { roster: 4 },
    { requestKey: 'changed-room' },
  ])
    assert.equal(canAdvanceConsegna(token, { ...token, ...change }, true), false);
  assert.equal(token.successorId, 'b');
});

test('delayed next page cannot advance after a new draft, discard or second save', async () => {
  for (const change of ['edit', 'discard', 'saving', 'saved'] as const) {
    const store = prepared();
    const token = store.begin(input.pazienteId)!;
    const page = deferred<string>();
    await submitConsegna(store, token, async (request) => saved(request));
    assert.equal(store.hasCurrentReceipt(token), true);
    const advance = page.promise.then(() => store.hasCurrentReceipt(token));
    if (change === 'discard') store.discard(input.pazienteId);
    else {
      store.update(input.pazienteId, { note: 'Nuova consegna in corso' });
      if (change !== 'edit') {
        const newer = store.begin(input.pazienteId)!;
        if (change === 'saved')
          await submitConsegna(store, newer, async (request) => saved(request));
      }
    }
    page.resolve('patient-b');
    assert.equal(await advance, false, change);
    if (change === 'edit' || change === 'saving')
      assert.equal(store.get(input.pazienteId).fields.note, 'Nuova consegna in corso');
  }
});
