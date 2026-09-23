import assert from 'node:assert/strict';
import test from 'node:test';
import { ImportSessionMemory } from '../importSessionMemory';
import { canStartNewImport, ImportApiError, ImportSessionApi } from '../importSessionApi';
import { manifestEdit, movePage } from '../importSessionTypes';
import { job, json } from './fixtures';

const actor = { operatorId: 'operator-a', operatorRole: 'nurse' };
function storage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}
test('single-flight creation, close/reopen and a new module instance use only opaque IDs/keys', async () => {
  const disk = storage();
  const memory = new ImportSessionMemory(
    () => disk,
    () => 'creation-key',
  );
  let creates = 0;
  let reads = 0;
  const api = {
    create: async () => {
      creates++;
      return job();
    },
    get: async (id: string) => {
      reads++;
      assert.equal(id, 'job-one');
      return job(2);
    },
  };
  const [one, two] = await Promise.all([memory.open(actor, api), memory.open(actor, api)]);
  assert.equal(one.id, two.id);
  assert.equal(creates, 1);
  await memory.open(actor, api);
  await new ImportSessionMemory(
    () => disk,
    () => 'unused',
  ).open(actor, api);
  assert.equal(reads, 2);
  assert.deepEqual([...disk.values.values()].sort(), ['creation-key', 'job-one']);
  memory.clear(actor);
  assert.equal(disk.values.size, 0);
});
test('lost creation response reuses its key across reload; failed resume never creates a job', async () => {
  const disk = storage();
  const keys: string[] = [];
  const api = {
    create: async (key: string) => {
      keys.push(key);
      if (keys.length === 1) throw new Error('lost response');
      return job();
    },
    get: async () => {
      throw new Error('offline');
    },
  };
  await assert.rejects(
    new ImportSessionMemory(
      () => disk,
      () => 'stable-key',
    ).open(actor, api),
    /lost response/,
  );
  await new ImportSessionMemory(
    () => disk,
    () => 'wrong',
  ).open(actor, api);
  await assert.rejects(
    new ImportSessionMemory(
      () => disk,
      () => 'wrong',
    ).open(actor, api),
    /offline/,
  );
  assert.deepEqual(keys, ['stable-key', 'stable-key']);
});
test('operator scope and storage failure never reuse another actor session', async () => {
  const disk = storage();
  const memory = new ImportSessionMemory(
    () => disk,
    () => 'new-key',
  );
  const created: string[] = [];
  const api = {
    create: async (key: string) => {
      created.push(key);
      return { ...job(), id: `job-${created.length}` };
    },
    get: async () => job(),
  };
  await memory.open(actor, api);
  await memory.open({ operatorId: 'operator-b', operatorRole: 'nurse' }, api);
  assert.equal(created.length, 2);
  assert.equal(disk.values.size, 4);
  assert.throws(() => memory.open({}, api), /Accedi/);
  const unavailable = new ImportSessionMemory(
    () => {
      throw new Error('denied');
    },
    () => 'volatile',
  );
  await unavailable.open(actor, api);
  await unavailable.open(actor, api);
  assert.equal(created.length, 3);
});
test('30 pages in three letters move without changing source identity and with contiguous order', () => {
  const original = job().manifest;
  original.groups = ['a', 'b', 'c'].map((id, sortOrder) => ({
    ...original.groups[0],
    id,
    sortOrder,
    pageCount: 10,
  }));
  original.pages = Array.from({ length: 30 }, (_, index) => ({
    id: `page-${index}`,
    documentId: 'multipage-original',
    sourcePageNumber: index + 1,
    groupId: ['a', 'b', 'c'][Math.floor(index / 10)],
    sortOrder: index % 10,
    status: 'pending' as const,
    canRetry: false,
    errorCode: null,
    error: null,
  }));
  const snapshot = structuredClone(original);
  const edit = movePage(original, 'page-5', 'c', 4);
  assert.deepEqual(original, snapshot);
  assert.equal(edit.pages.length, 30);
  assert.equal(new Set(edit.pages.map((page) => page.id)).size, 30);
  for (const id of ['a', 'b', 'c']) {
    const pages = edit.pages
      .filter((page) => page.groupId === id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    assert.deepEqual(
      pages.map((page) => page.sortOrder),
      pages.map((_, index) => index),
    );
  }
  assert.equal(edit.pages.find((page) => page.id === 'page-5')?.sortOrder, 4);
  assert.ok(edit.pages.every((page) => !('documentId' in page) && !('sourcePageNumber' in page)));
});
test('manifest retry preserves request identity and stale revision response supplies authoritative job', async () => {
  const bodies: unknown[] = [];
  const api = new ImportSessionApi(async (_, init) => {
    bodies.push(JSON.parse(init!.body as string));
    return json({ error: 'changed', code: 'revision_conflict', job: job(8) }, 409);
  }, '/jobs');
  const mutation = api.manifestMutation(job(2), manifestEdit(job(2).manifest));
  for (let i = 0; i < 2; i++)
    await assert.rejects(
      mutation(),
      (error: { code: string; job: { manifest: { revision: number } } }) =>
        error.code === 'revision_conflict' && error.job.manifest.revision === 8,
    );
  assert.deepEqual(bodies[0], bodies[1]);
});
test('stale session retains its ID until explicit new import; terminal, denied and network failures are distinct', async () => {
  const disk = storage();
  let createCount = 0;
  const memory = new ImportSessionMemory(
    () => disk,
    () => `new-key-${createCount}`,
  );
  const api = {
    create: async () => {
      createCount++;
      return job();
    },
    get: async () => {
      throw new ImportApiError('missing', 404);
    },
  };
  await memory.open(actor, api);
  await assert.rejects(memory.open(actor, api), (error) => canStartNewImport(error));
  assert.ok([...disk.values.values()].includes('job-one'));
  assert.equal(createCount, 1);
  memory.clear(actor);
  await memory.open(actor, api);
  assert.equal(createCount, 2);
  for (const status of ['expired', 'cancelled', 'confirmed']) {
    const terminal = new ImportSessionApi(async () => json({ ...job(), status }), '/jobs');
    await assert.rejects(terminal.get('job-one'), (error) => canStartNewImport(error));
  }
  for (const error of [
    new TypeError('offline'),
    new ImportApiError('denied', 403),
    new ImportApiError('unavailable', 503),
  ])
    assert.equal(canStartNewImport(error), false);
});
