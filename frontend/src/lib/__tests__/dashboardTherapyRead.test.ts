import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { cachedGetJson, clearCachedGet, invalidateCachedGet } from '../cachedFetch';
import { readDashboardTherapyDay } from '../dashboardTherapyRead';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  clearCachedGet();
});
function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test('a timed-out therapy day is retryable and late data cannot repopulate its cache', async () => {
  clearCachedGet();
  const old = deferredResponse();
  let calls = 0;
  globalThis.fetch = (() =>
    ++calls === 1 ? old.promise : Promise.resolve(Response.json([]))) as typeof fetch;
  await assert.rejects(readDashboardTherapyDay('/therapy-slots?date=2026-09-14', 15), /timed out/);
  assert.deepEqual(await readDashboardTherapyDay('/therapy-slots?date=2026-09-14'), []);
  old.resolve(Response.json([{ stale: true }]));
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(await cachedGetJson('/therapy-slots?date=2026-09-14'), []);
  assert.equal(calls, 2);
});

test('an old timeout cannot evict a newer in-flight read after mutation invalidation', async () => {
  clearCachedGet();
  const old = deferredResponse();
  const fresh = deferredResponse();
  let calls = 0;
  globalThis.fetch = (() => (++calls === 1 ? old.promise : fresh.promise)) as typeof fetch;
  const staleRead = readDashboardTherapyDay('/therapy-slots?date=2026-09-14', 15);
  invalidateCachedGet('/therapy-slots');
  const freshRead = readDashboardTherapyDay('/therapy-slots?date=2026-09-14', 1000);
  await assert.rejects(staleRead, /timed out/);
  const sharedRead = readDashboardTherapyDay('/therapy-slots?date=2026-09-14', 1000);
  assert.equal(calls, 2);
  fresh.resolve(Response.json([]));
  assert.deepEqual(await freshRead, []);
  assert.deepEqual(await sharedRead, []);
  old.resolve(Response.json([{ stale: true }]));
});

test('malformed payloads and HTTP failure remain failures, while an empty day succeeds', async () => {
  clearCachedGet();
  globalThis.fetch = (async () => Response.json({ error: 'bad shape' })) as typeof fetch;
  await assert.rejects(readDashboardTherapyDay('/malformed'), /invalid therapy slots/);
  globalThis.fetch = (async () => Response.json({}, { status: 503 })) as typeof fetch;
  await assert.rejects(readDashboardTherapyDay('/failed'), /503/);
  globalThis.fetch = (async () => Response.json([])) as typeof fetch;
  assert.deepEqual(await readDashboardTherapyDay('/empty'), []);
});
