import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CartellaWriteQueue, mergeCartellaPatch } from '../cartellaWriteQueue';
import type { CartellaPaziente, DocumentoConsegnato } from '../../types';

test('verified server command serializes with ordinary saves and preserves its authoritative state', async () => {
  const queue = new CartellaWriteQueue<{ notes: string; exit: string | null }>();
  const initial = { notes: 'original', exit: null };
  let release!: (snapshot: typeof initial) => void;
  const command = queue.enqueueMutation(
    'session:patient',
    initial,
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const save = queue.enqueue('session:patient', initial, { notes: 'updated' }, async (snapshot) => {
    assert.deepEqual(snapshot, { notes: 'updated', exit: 'verified-exit' });
    return true;
  });
  await Promise.resolve();
  release({ ...initial, exit: 'verified-exit' });
  assert.equal((await command).exit, 'verified-exit');
  assert.equal(await save, true);
});
test('failed command never contaminates queued snapshots or another session', async () => {
  const queue = new CartellaWriteQueue<{ exit: string | null; note: string }>();
  const initial = { exit: null, note: 'before' };
  const failed = queue.enqueueMutation('old:p', initial, async () => {
    throw new Error('unverified');
  });
  const save = queue.enqueue('old:p', initial, { note: 'after' }, async (snapshot) => {
    assert.equal(snapshot.exit, null);
    return true;
  });
  await assert.rejects(failed, /unverified/);
  assert.equal(await save, true);
  assert.deepEqual(await queue.enqueueMutation('new:p', initial, async () => initial), initial);
});

test('a later ordinary server receipt recovers an exit committed during an uncertain command', async () => {
  const queue = new CartellaWriteQueue<{ exit: string | null; note: string }>();
  const initial = { exit: null, note: 'before' };
  const uncertain = queue.enqueueMutation('s:p', initial, async () => {
    throw new Error('response lost after commit');
  });
  const recovery = queue.enqueue('s:p', initial, { note: 'after' }, async () => ({
    exit: 'actual-server-exit',
    note: 'after',
  }));
  const last = queue.enqueue('s:p', initial, { note: 'last' }, async (snapshot) => {
    assert.equal(snapshot.exit, 'actual-server-exit');
    return snapshot;
  });
  await assert.rejects(uncertain, /response lost/);
  assert.equal(await recovery, true);
  assert.equal(await last, true);
});

test('serializes full snapshots, retaining earlier successful edits regardless of section order', async () => {
  for (const reverse of [false, true]) {
    const queue = new CartellaWriteQueue<{ docs: number; notes: number }>();
    let release!: (ok: boolean) => void;
    const snapshots: object[] = [];
    const baseline = { docs: 0, notes: 0 };
    const first = queue.enqueue(
      'patient',
      baseline,
      reverse ? { notes: 1 } : { docs: 1 },
      async (next) => {
        snapshots.push(next);
        return new Promise((resolve) => {
          release = resolve;
        });
      },
    );
    const second = queue.enqueue(
      'patient',
      baseline,
      reverse ? { docs: 1 } : { notes: 1 },
      async (next) => {
        snapshots.push(next);
        return true;
      },
    );
    await Promise.resolve();
    assert.equal(snapshots.length, 1);
    release(true);
    await Promise.all([first, second]);
    assert.deepEqual(snapshots[1], { docs: 1, notes: 1 });
  }
});

test('failed edits are not carried into later saves; independent patients do not block', async () => {
  const queue = new CartellaWriteQueue<{ docs: number; notes: number }>();
  const baseline = { docs: 0, notes: 0 };
  let release!: (ok: boolean) => void;
  const first = queue.enqueue(
    'patient-a',
    baseline,
    { docs: 1 },
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const second = queue.enqueue('patient-a', baseline, { notes: 1 }, async (next) => {
    assert.deepEqual(next, { docs: 0, notes: 1 });
    return true;
  });
  assert.equal(await queue.enqueue('patient-b', baseline, { docs: 2 }, async () => true), true);
  release(false);
  assert.equal(await first, false);
  assert.equal(await second, true);
});

test('record deltas retain additions made while a document form was reopened', async () => {
  const queue = new CartellaWriteQueue<CartellaPaziente>();
  const doc = (id: string, note = '') => ({ id, note }) as DocumentoConsegnato;
  const baseline = {
    pazienteId: 'patient-a',
    documentiConsegnati: [doc('old')],
  } as CartellaPaziente;
  const a = queue.enqueue(
    'a',
    baseline,
    { documentiConsegnati: [doc('new-a'), doc('old')] },
    async () => true,
    mergeCartellaPatch,
  );
  const b = queue.enqueue(
    'a',
    baseline,
    { documentiConsegnati: [doc('new-b'), doc('old', 'updated')] },
    async (next) => {
      assert.deepEqual(next.documentiConsegnati.map((item) => item.id).sort(), [
        'new-a',
        'new-b',
        'old',
      ]);
      assert.equal(next.documentiConsegnati.find((item) => item.id === 'old')?.note, 'updated');
      return true;
    },
    mergeCartellaPatch,
  );
  await Promise.all([a, b]);
  const latest = { ...baseline, documentiConsegnati: [doc('old'), doc('concurrent')] };
  assert.deepEqual(
    mergeCartellaPatch(latest, baseline, { documentiConsegnati: [] }).documentiConsegnati.map(
      (item) => item.id,
    ),
    ['concurrent'],
  );
});

test('rejected requests release queue and a new session uses its own baseline', async () => {
  const queue = new CartellaWriteQueue<{ value: number }>();
  const a = queue.enqueue('old-session', { value: 0 }, { value: 1 }, async () => {
    throw new Error('offline');
  });
  const b = queue.enqueue(
    'old-session',
    { value: 0 },
    { value: 2 },
    async (next) => next.value === 2,
  );
  await assert.rejects(() => a, /offline/);
  assert.equal(await b, true);
  assert.equal(
    await queue.enqueue('new-session', { value: 3 }, {}, async (next) => next.value === 3),
    true,
  );
});
