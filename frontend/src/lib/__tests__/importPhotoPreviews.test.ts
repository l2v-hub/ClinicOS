import assert from 'node:assert/strict';
import test from 'node:test';
import {
  finishPhotoReplacement,
  ImportPreviewSession,
  type UploadedDocument,
} from '../importPhotoPreviews';

const file = (content: string) => new File([content], 'foto.png', { type: 'image/png' });
const doc = (id: string): UploadedDocument => ({ id, filename: 'foto.png', mimeType: 'image/png' });
const accepted = (documentId: string) => ({ filename: 'foto.png', status: 'accepted', documentId });

test('same-name files keep their own bytes and IDs across reordering and rejected inputs', async () => {
  const session = new ImportPreviewSession();
  try {
    session.accept(
      [file('first'), file('duplicate'), file('rejected'), file('last')],
      [
        accepted('a'),
        { filename: 'foto.png', status: 'duplicate' },
        { filename: 'foto.png', status: 'rejected' },
        accepted('b'),
      ],
      [doc('b'), doc('a')],
    );
    assert.equal(session.documents.length, 2);
    assert.equal(
      await (await fetch(session.documents.find((p) => p.id === 'a')!.url)).text(),
      'first',
    );
    assert.equal(
      await (await fetch(session.documents.find((p) => p.id === 'b')!.url)).text(),
      'last',
    );
    session.accept([file('new')], [accepted('c')], [doc('c'), doc('b'), doc('a')]);
    assert.equal(
      await (await fetch(session.documents.find((p) => p.id === 'c')!.url)).text(),
      'new',
    );
  } finally {
    session.clear();
  }
});

test('missing/misaligned outcomes and unknown IDs do not guess an image by filename', () => {
  const session = new ImportPreviewSession();
  assert.deepEqual(session.accept([file('a')], [], [doc('a')]), []);
  assert.deepEqual(session.accept([file('a')], [accepted('wrong')], [doc('a')]), []);
  assert.deepEqual(session.documents, []);
});

test('duplicate accepted IDs cannot replace a previously linked image', async () => {
  const session = new ImportPreviewSession();
  try {
    session.accept([file('original')], [accepted('a')], [doc('a')]);
    session.accept([file('wrong')], [accepted('a')], [doc('a')]);
    assert.equal(session.documents.length, 1);
    assert.equal(await (await fetch(session.documents[0].url)).text(), 'original');
  } finally {
    session.clear();
  }
});

test('removal revokes only the selected blob; clear revokes remaining blobs and invalidates requests', async () => {
  const session = new ImportPreviewSession();
  session.accept([file('a'), file('b')], [accepted('a'), accepted('b')], [doc('a'), doc('b')]);
  const [a, b] = session.documents;
  session.remove('a');
  await assert.rejects(fetch(a.url));
  assert.equal(await (await fetch(b.url)).text(), 'b');
  const generation = session.generation;
  session.clear();
  assert.notEqual(session.generation, generation);
  await assert.rejects(fetch(b.url));
  assert.deepEqual(session.documents, []);
});

const replacementJob = {
  documents: [doc('before'), { ...doc('old'), logicalDoc: 'group-test' }, doc('after'), doc('new')],
};
test('replacement preserves logical grouping and position before removing the old document', async () => {
  const calls: { url: string; options: RequestInit }[] = [];
  let updates = 0;
  const result = await finishPhotoReplacement(
    '/job',
    replacementJob,
    'old',
    'new',
    async (url, options) => {
      calls.push({ url, options });
      return Response.json(replacementJob);
    },
    () => updates++,
    () => true,
  );
  assert.equal(result, true);
  assert.deepEqual(
    calls.map((c) => [c.url, c.options.method]),
    [
      ['/job/files/new/logical', 'POST'],
      ['/job/reorder', 'POST'],
      ['/job/files/old', 'DELETE'],
    ],
  );
  assert.deepEqual(JSON.parse(calls[0].options.body as string), { logicalDoc: 'group-test' });
  assert.deepEqual(JSON.parse(calls[1].options.body as string), {
    order: ['before', 'new', 'old', 'after'],
  });
  assert.equal(updates, 3);
});

test('replacement failure before final deletion keeps the original and stops further writes', async () => {
  const methods: string[] = [];
  await assert.rejects(
    finishPhotoReplacement(
      '/job',
      replacementJob,
      'old',
      'new',
      async (_url, options) => {
        methods.push(options.method!);
        return Response.json({}, { status: 503 });
      },
      () => assert.fail('Failed response must not update the UI'),
      () => true,
    ),
  );
  assert.deepEqual(methods, ['POST']);
});

test('unaccepted replacement and a closed import session cannot remove the original', async () => {
  let calls = 0;
  const request = async () => {
    calls++;
    return Response.json(replacementJob);
  };
  assert.equal(
    await finishPhotoReplacement(
      '/job',
      replacementJob,
      'old',
      'missing',
      request,
      () => {},
      () => true,
    ),
    false,
  );
  await assert.rejects(
    finishPhotoReplacement(
      '/job',
      replacementJob,
      'old',
      'new',
      request,
      () => {},
      () => false,
    ),
  );
  assert.equal(calls, 0);
  let active = true;
  await assert.rejects(
    finishPhotoReplacement(
      '/job',
      replacementJob,
      'old',
      'new',
      async () => {
        calls++;
        active = false;
        return Response.json(replacementJob);
      },
      () => assert.fail('Closed session cannot be updated'),
      () => active,
    ),
  );
  assert.equal(calls, 1);
});
