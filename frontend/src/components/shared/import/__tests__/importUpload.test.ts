import assert from 'node:assert/strict';
import test from 'node:test';
import { ImportSessionApi } from '../importSessionApi';
import { ImportUploadQueue, prepareUploadGroup } from '../importUploadQueue';
import { job, json } from './fixtures';

const file = (value: string) => new File([value], 'same-name.pdf', { type: 'application/pdf' });
test('uncertain upload retry uses identical metadata, bytes and revision; replay duplicate is accepted', async () => {
  let current = job();
  const seen: { path: string; metadata: Record<string, unknown>; text: string }[] = [];
  const api = new ImportSessionApi(async (path, init) => {
    const body = init!.body as FormData;
    const metadata = JSON.parse(body.get('metadata') as string);
    seen.push({ path, metadata, text: await (body.get('files') as File).text() });
    if (seen.length === 1) throw new TypeError('connection lost after commit');
    return json({
      job: job(seen.length + 2),
      outcomes: [
        {
          clientFileId: metadata.items[0].clientFileId,
          status: seen.length === 2 ? 'duplicate' : 'accepted',
          documentId: 'source',
          pageIds: ['page'],
          filename: 'same-name.pdf',
        },
      ],
    });
  }, '/jobs');
  const queue = new ImportUploadQueue(
    api,
    () => current,
    (next) => {
      if (next) current = next;
    },
  );
  queue.add([file('first'), file('second')], 'letter-a');
  await assert.rejects(queue.run(), /connection lost/);
  current = job(3);
  await queue.run();
  assert.equal(queue.items.length, 0);
  assert.equal(seen.length, 3);
  assert.deepEqual(seen[0], seen[1]);
  assert.equal(seen[2].metadata.expectedRevision, 4);
  assert.notEqual(
    (seen[1].metadata.items as { clientFileId: string }[])[0].clientFileId,
    (seen[2].metadata.items as { clientFileId: string }[])[0].clientFileId,
  );
});
test('atomic retake at capacity calls replacement only and preserves old page on rejection', async () => {
  const current = job();
  current.totalBytes = current.limits.maxTotalBytes;
  current.manifest.pages = Array.from({ length: 30 }, (_, i) => ({
    id: `p${i}`,
    groupId: 'letter-a',
    documentId: 'original',
    sourcePageNumber: i + 1,
    sortOrder: i,
    status: 'pending',
    canRetry: false,
    errorCode: null,
    error: null,
  }));
  const snapshot = structuredClone(current);
  const paths: string[] = [];
  const api = new ImportSessionApi(async (path, init) => {
    paths.push(path);
    const metadata = JSON.parse((init!.body as FormData).get('metadata') as string);
    assert.equal(metadata.expectedRevision, 1);
    assert.equal(typeof metadata.clientFileId, 'string');
    assert.equal(metadata.items, undefined);
    return json({ error: 'replacement too large' }, 413);
  }, '/jobs');
  const queue = new ImportUploadQueue(
    api,
    () => current,
    () => {},
  );
  queue.add([file('replacement')], 'letter-a', 'p29');
  await assert.rejects(queue.run(), /replacement too large/);
  assert.deepEqual(current, snapshot);
  assert.deepEqual(paths, ['/jobs/job-one/pages/p29/replace']);
  assert.equal(queue.items.length, 1);
  queue.discard();
  assert.equal(queue.items.length, 0);
});
test('revision conflict updates manifest but upload retries only after explicit run with a fresh key', async () => {
  let current = job();
  const seen: Record<string, unknown>[] = [];
  const api = new ImportSessionApi(async (_, init) => {
    const metadata = JSON.parse((init!.body as FormData).get('metadata') as string);
    seen.push(metadata);
    if (seen.length === 1)
      return json({ code: 'revision_conflict', error: 'changed', job: job(9) }, 409);
    return json({
      job: job(10),
      outcomes: [
        {
          clientFileId: metadata.items[0].clientFileId,
          status: 'accepted',
          pageIds: ['p'],
          filename: 'same-name.pdf',
        },
      ],
    });
  }, '/jobs');
  const queue = new ImportUploadQueue(
    api,
    () => current,
    (next) => {
      if (next) current = next;
    },
  );
  queue.add([file('bytes')], 'letter-a');
  await assert.rejects(queue.run(), /changed/);
  assert.equal(seen.length, 1);
  assert.equal(current.manifest.revision, 9);
  await queue.run();
  assert.equal(seen[1].expectedRevision, 9);
  assert.notEqual(seen[0].requestId, seen[1].requestId);
});
test('double submit shares the running queue and one pending camera File identity', async () => {
  let requests = 0;
  let finish: (() => void) | undefined;
  const api = new ImportSessionApi(async (_, init) => {
    requests++;
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
    const metadata = JSON.parse((init!.body as FormData).get('metadata') as string);
    return json({
      job: job(2),
      outcomes: [
        {
          clientFileId: metadata.items[0].clientFileId,
          status: 'accepted',
          pageIds: ['p'],
          filename: 'same-name.pdf',
        },
      ],
    });
  }, '/jobs');
  const queue = new ImportUploadQueue(
    api,
    () => job(),
    () => {},
  );
  const capture = file('capture');
  queue.add([capture], 'letter-a');
  queue.add([capture], 'letter-a');
  const first = queue.run();
  const second = queue.run();
  assert.equal(first, second);
  assert.equal(requests, 1);
  finish!();
  await first;
  assert.equal(queue.items.length, 0);
});

test('first capture sends the revision returned by group creation before any render effect', async () => {
  let current = job();
  current.manifest.groups = [];
  const methods: string[] = [];
  const api = new ImportSessionApi(async (_, init) => {
    methods.push(init!.method!);
    if (init?.method === 'PUT') {
      const body = JSON.parse(init.body as string);
      const next = job(2);
      next.manifest.groups = body.groups;
      return json(next);
    }
    const metadata = JSON.parse((init!.body as FormData).get('metadata') as string);
    assert.equal(metadata.expectedRevision, 2);
    return json({
      job: job(3),
      outcomes: [
        {
          clientFileId: metadata.items[0].clientFileId,
          status: 'accepted',
          pageIds: ['p'],
          filename: 'capture.pdf',
        },
      ],
    });
  }, '/jobs');
  const group = await prepareUploadGroup(
    api,
    current,
    undefined,
    async (action) => {
      await action();
      return true;
    },
    (value) => {
      current = value;
    },
  );
  const queue = new ImportUploadQueue(
    api,
    () => current,
    () => {},
  );
  queue.add([file('first capture')], group);
  await queue.run();
  assert.deepEqual(methods, ['PUT', 'POST']);
});
