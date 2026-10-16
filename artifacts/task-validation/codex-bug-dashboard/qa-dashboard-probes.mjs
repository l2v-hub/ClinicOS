import test from 'node:test';
import assert from 'node:assert/strict';
import { createDashboardServer } from '../../../agent-team/src/bug-pipeline/dashboard-server.mjs';

async function serve(t, load) {
  const server = createDashboardServer({ load });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('default cache deduplicates overlapping upstream reads and repeated manual refreshes', async t => {
  let calls = 0;
  let release;
  const deferred = new Promise(resolve => { release = resolve; });
  const url = await serve(t, async () => { calls++; await deferred; return { counter: calls }; });
  const requests = Array.from({ length: 20 }, () => fetch(url + '/api/status').then(response => response.json()));
  await new Promise(resolve => setTimeout(resolve, 50));
  release();
  const results = await Promise.all(requests);
  assert.equal(calls, 1);
  assert.ok(results.every(result => result.ok && result.snapshot.counter === 1));
  assert.equal((await (await fetch(url + '/api/status')).json()).snapshot.counter, 1);
  assert.equal(calls, 1);
});

test('initial upstream failure is visible without inventing an empty successful snapshot', async t => {
  const url = await serve(t, async () => { throw new Error('PRIVATE_PROVIDER_DIAGNOSTIC'); });
  const response = await fetch(url + '/api/status');
  assert.equal(response.status, 200);
  const value = await response.json();
  assert.equal(value.ok, false);
  assert.equal(value.snapshot, null);
  assert.match(value.error, /non confermato/);
  assert.ok(!JSON.stringify(value).includes('PRIVATE_PROVIDER_DIAGNOSTIC'));
});
