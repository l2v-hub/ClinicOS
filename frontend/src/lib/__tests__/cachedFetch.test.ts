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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function jsonResponse(data: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(data) };
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

test('clearCachedGet: una richiesta della sessione precedente non ripopola la cache', async () => {
  const operatorA = deferred<ReturnType<typeof jsonResponse>>();
  const operatorB = deferred<ReturnType<typeof jsonResponse>>();
  let calls = 0;
  globalThis.fetch = (() => {
    calls += 1;
    return calls === 1 ? operatorA.promise : operatorB.promise;
  }) as unknown as typeof fetch;

  const requestA = cachedGetJson<{ v: string }>('/api/therapy-slots');
  clearCachedGet();
  const requestB = cachedGetJson<{ v: string }>('/api/therapy-slots');

  operatorA.resolve(jsonResponse({ v: 'operatore A' }));
  assert.deepEqual(await requestA, { v: 'operatore A' });

  // The old finally must not delete B's in-flight slot and trigger a third network request.
  const requestBShared = cachedGetJson<{ v: string }>('/api/therapy-slots');
  assert.equal(calls, 2);
  operatorB.resolve(jsonResponse({ v: 'operatore B' }));
  assert.deepEqual(await requestB, { v: 'operatore B' });
  assert.deepEqual(await requestBShared, { v: 'operatore B' });

  assert.deepEqual(await cachedGetJson('/api/therapy-slots'), { v: 'operatore B' });
  assert.equal(calls, 2);
});

test('clearCachedGet: una risposta vecchia tardiva non sovrascrive la nuova sessione', async () => {
  const operatorA = deferred<ReturnType<typeof jsonResponse>>();
  let calls = 0;
  globalThis.fetch = (() => {
    calls += 1;
    return calls === 1 ? operatorA.promise : Promise.resolve(jsonResponse({ v: 'operatore B' }));
  }) as unknown as typeof fetch;

  const requestA = cachedGetJson<{ v: string }>('/api/pazienti');
  clearCachedGet();
  assert.deepEqual(await cachedGetJson('/api/pazienti'), { v: 'operatore B' });

  operatorA.resolve(jsonResponse({ v: 'operatore A' }));
  assert.deepEqual(await requestA, { v: 'operatore A' });
  assert.deepEqual(await cachedGetJson('/api/pazienti'), { v: 'operatore B' });
  assert.equal(calls, 2);
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

test('invalidateCachedGet: una GET precedente alla mutazione non puo ripristinare dati obsoleti', async () => {
  const beforeMutation = deferred<ReturnType<typeof jsonResponse>>();
  let calls = 0;
  globalThis.fetch = (() => {
    calls += 1;
    return calls === 1
      ? beforeMutation.promise
      : Promise.resolve(jsonResponse({ v: 'dopo mutazione' }));
  }) as unknown as typeof fetch;

  const staleRequest = cachedGetJson<{ v: string }>('/api/pazienti/1');
  invalidateCachedGet('/api/pazienti');
  assert.deepEqual(await cachedGetJson('/api/pazienti/1'), { v: 'dopo mutazione' });

  beforeMutation.resolve(jsonResponse({ v: 'prima mutazione' }));
  assert.deepEqual(await staleRequest, { v: 'prima mutazione' });
  assert.deepEqual(await cachedGetJson('/api/pazienti/1'), { v: 'dopo mutazione' });
  assert.equal(calls, 2);
});

test('invalidateCachedGet: una GET non correlata conserva in-flight e cache', async () => {
  const notes = deferred<ReturnType<typeof jsonResponse>>();
  let calls = 0;
  globalThis.fetch = (() => {
    calls += 1;
    return notes.promise;
  }) as unknown as typeof fetch;

  const notesRequest = cachedGetJson<{ v: string }>('/api/note');
  invalidateCachedGet('/api/pazienti');
  const sharedNotesRequest = cachedGetJson<{ v: string }>('/api/note');
  assert.equal(calls, 1);

  notes.resolve(jsonResponse({ v: 'nota corrente' }));
  assert.deepEqual(await notesRequest, { v: 'nota corrente' });
  assert.deepEqual(await sharedNotesRequest, { v: 'nota corrente' });
  assert.deepEqual(await cachedGetJson('/api/note'), { v: 'nota corrente' });
  assert.equal(calls, 1);
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
