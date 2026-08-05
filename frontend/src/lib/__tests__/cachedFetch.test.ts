import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { cachedGetJson, invalidateCachedGet, clearCachedGet } from '../cachedFetch';
import { setCurrentOperator } from '../operatorSession';

// Ogni test parte da cache vuota: i Map di cachedFetch vivono a livello di modulo e
// il modulo e' condiviso da tutti i test di questo file.
beforeEach(() => {
  clearCachedGet();
  setCurrentOperator(null);
});

function stubFetch(payload: unknown) {
  const calls: string[] = [];
  globalThis.fetch = ((url: string) => {
    calls.push(url);
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(payload) });
  }) as unknown as typeof fetch;
  return calls;
}

test('cachedGetJson: una seconda GET sulla stessa URL entro il TTL non rifa la fetch', async () => {
  const calls = stubFetch({ v: 1 });
  assert.deepEqual(await cachedGetJson('/api/pazienti'), { v: 1 });
  assert.deepEqual(await cachedGetJson('/api/pazienti'), { v: 1 });
  assert.equal(calls.length, 1);
});

test('clearCachedGet: dopo il logout la stessa URL torna a fare una fetch reale', async () => {
  const calls = stubFetch({ v: 'operatore A' });
  assert.deepEqual(await cachedGetJson('/api/pazienti'), { v: 'operatore A' });
  assert.equal(calls.length, 1);

  clearCachedGet();

  const callsB = stubFetch({ v: 'operatore B' });
  assert.deepEqual(await cachedGetJson('/api/pazienti'), { v: 'operatore B' });
  assert.equal(callsB.length, 1);
});

test('invalidateCachedGet: svuota solo le voci col prefisso indicato', async () => {
  const calls = stubFetch({ v: 1 });
  await cachedGetJson('/api/pazienti');
  await cachedGetJson('/api/note');
  assert.equal(calls.length, 2);

  invalidateCachedGet('/api/pazienti');
  await cachedGetJson('/api/pazienti');
  await cachedGetJson('/api/note');
  assert.equal(calls.length, 3);
});

test('cachedGetJson: allega gli header operatore quando c-e- una sessione', async () => {
  const seen: (HeadersInit | undefined)[] = [];
  globalThis.fetch = ((_url: string, init?: RequestInit) => {
    seen.push(init?.headers);
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
  }) as unknown as typeof fetch;

  setCurrentOperator({ id: 'op-1', role: 'infermiere' });
  await cachedGetJson('/api/pazienti');
  assert.deepEqual(seen[0], { 'X-Operator-Id': 'op-1', 'X-Operator-Role': 'infermiere' });
});
