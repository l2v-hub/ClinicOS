import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRosterOrderController } from '../rosterOrderController';
import {
  rosterPreference,
  rosterMetadata,
  missingRosterProfile,
  deferred,
} from './rosterOrder.fixtures';

test('a pending preference does not block server page identity/order, and never claims persistence', async () => {
  const pending = deferred<Response>();
  const controller = createRosterOrderController('/api', {
    headers: () => ({}),
    fetcher: (() => pending.promise) as typeof fetch,
  });
  controller.activate();
  const request = controller.refresh();
  assert.equal(controller.getSnapshot().explicit, false);
  controller.accept(rosterMetadata);
  assert.equal(controller.getSnapshot().ready, true);
  assert.equal(controller.getSnapshot().loading, true);
  assert.equal(controller.getSnapshot().temporary, true);
  assert.deepEqual(controller.getSnapshot().order, rosterMetadata.order);
  pending.resolve(new Response(JSON.stringify(rosterPreference)));
  await request;
  assert.equal(controller.getSnapshot().temporary, false);
  assert.equal(controller.getSnapshot().explicit, false);
  assert.equal(controller.getSnapshot().restart, 0);
});

test('personal choice sends only context, override and CAS version; reset retains server revision', async () => {
  const calls: RequestInit[] = [];
  const controller = createRosterOrderController('/api', {
    headers: () => ({ Authorization: 'synthetic' }),
    fetcher: (async (_url, init) => {
      calls.push(init!);
      if (init?.method === 'GET') return new Response(JSON.stringify(rosterPreference));
      const body = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          ...rosterPreference,
          override: body.override,
          effective: body.override ?? rosterPreference.default,
          revision: String(calls.length),
          source: body.override ? 'personal' : 'department',
        }),
      );
    }) as typeof fetch,
  });
  controller.activate();
  await controller.refresh();
  await controller.choose({ criterion: 'name', direction: 'desc' });
  assert.deepEqual(JSON.parse(String(calls[1].body)), {
    contextId: rosterPreference.context!.id,
    override: { criterion: 'name', direction: 'desc' },
    expectedVersion: '0',
  });
  assert.equal(calls[1].cache, 'no-store');
  assert.equal(new Headers(calls[1].headers).get('Authorization'), 'synthetic');
  assert.equal(controller.getSnapshot().temporary, false);
  await controller.choose(null);
  assert.deepEqual(JSON.parse(String(calls[2].body)), {
    contextId: rosterPreference.context!.id,
    override: null,
    expectedVersion: '2',
  });
  assert.equal(controller.getSnapshot().preference?.revision, '3');
});

test('a preference changed during the initial parallel page read restarts once instead of relabelling old rows as saved', async () => {
  const controller = createRosterOrderController('/api', {
    headers: () => ({}),
    fetcher: (async () =>
      new Response(
        JSON.stringify({
          ...rosterPreference,
          effective: { criterion: 'name', direction: 'desc' },
        }),
      )) as typeof fetch,
  });
  controller.activate();
  controller.accept(rosterMetadata);
  await controller.refresh();
  assert.equal(controller.getSnapshot().restart, 1);
  assert.equal(controller.getSnapshot().temporary, true);
  assert.equal(controller.getSnapshot().metadata, null);
  controller.accept({ ...rosterMetadata, order: { criterion: 'name', direction: 'desc' } });
  assert.equal(controller.getSnapshot().temporary, false);
  assert.equal(controller.getSnapshot().restart, 1);
});

test('an explicit temporary choice cancels a pending preference and ignores its late result', async () => {
  const pending = deferred<Response>();
  let signal: AbortSignal | null | undefined;
  const controller = createRosterOrderController('/api', {
    headers: () => ({}),
    fetcher: ((_url, init) => {
      signal = init?.signal;
      return pending.promise;
    }) as typeof fetch,
  });
  controller.activate();
  const request = controller.refresh();
  controller.accept(rosterMetadata);
  await controller.choose({ criterion: 'name', direction: 'desc' });
  assert.equal(signal?.aborted, true);
  pending.resolve(new Response(JSON.stringify(rosterPreference)));
  await request;
  assert.deepEqual(controller.getSnapshot().order, { criterion: 'name', direction: 'desc' });
  assert.equal(controller.getSnapshot().preference, null);
  assert.equal(controller.getSnapshot().temporary, true);
});

test('missing profile allows only temporary order and never writes or creates a profile', async () => {
  let count = 0;
  const controller = createRosterOrderController('/api', {
    headers: () => ({}),
    fetcher: (async () => {
      count++;
      return new Response(JSON.stringify(missingRosterProfile));
    }) as typeof fetch,
  });
  controller.activate();
  await controller.refresh();
  await controller.choose({ criterion: 'location', direction: 'desc' });
  assert.equal(count, 1);
  assert.equal(controller.getSnapshot().temporary, true);
  assert.equal(controller.getSnapshot().preference?.canEdit, false);
  assert.deepEqual(controller.getSnapshot().order, { criterion: 'location', direction: 'desc' });
});

test('CAS conflict refetches without automatically overwriting another operator session', async () => {
  const methods: string[] = [];
  const controller = createRosterOrderController('/api', {
    headers: () => ({}),
    fetcher: (async (_url, init) => {
      methods.push(init!.method!);
      return init?.method === 'PATCH'
        ? new Response(JSON.stringify({ code: 'roster_preference_conflict' }), { status: 409 })
        : new Response(
            JSON.stringify({ ...rosterPreference, revision: methods.length === 1 ? '0' : '8' }),
          );
    }) as typeof fetch,
  });
  controller.activate();
  await controller.refresh();
  await controller.choose({ criterion: 'name', direction: 'desc' });
  assert.deepEqual(methods, ['GET', 'PATCH', 'GET']);
  assert.equal(controller.getSnapshot().preference?.revision, '8');
  assert.match(controller.getSnapshot().error, /scegli di nuovo/);
});

test('network failure keeps a truthful temporary choice, and roster recovery is bounded until a page succeeds', async () => {
  let offline = true;
  const controller = createRosterOrderController('/api', {
    headers: () => ({}),
    fetcher: (async () => {
      if (offline) throw new Error('synthetic offline');
      return new Response(JSON.stringify(rosterPreference));
    }) as typeof fetch,
  });
  controller.activate();
  await controller.refresh();
  controller.accept(rosterMetadata);
  assert.equal(controller.getSnapshot().temporary, true);
  await controller.choose({ criterion: 'name', direction: 'desc' });
  assert.equal(controller.getSnapshot().order.direction, 'desc');
  offline = false;
  assert.equal(await controller.recover(), true);
  assert.equal(await controller.recover(), false);
  assert.equal(controller.getSnapshot().restart, 1);
  controller.accept(rosterMetadata);
  assert.equal(await controller.recover(), true);
  assert.equal(controller.getSnapshot().restart, 2);
});

test('late preference and mutation results cannot cross the disposed session boundary', async () => {
  const pending = deferred<Response>();
  const controller = createRosterOrderController('/api', {
    headers: () => ({}),
    fetcher: (() => pending.promise) as typeof fetch,
  });
  controller.activate();
  const request = controller.refresh();
  controller.dispose();
  pending.resolve(new Response(JSON.stringify(rosterPreference)));
  await request;
  assert.equal(controller.getSnapshot().preference, null);
  const other = createRosterOrderController('/api', { headers: () => ({}) });
  assert.equal(other.getSnapshot().preference, null);
  assert.deepEqual(other.getSnapshot().order, { criterion: 'name', direction: 'asc' });
});
