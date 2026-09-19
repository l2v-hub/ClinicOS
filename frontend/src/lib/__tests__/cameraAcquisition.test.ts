import assert from 'node:assert/strict';
import test from 'node:test';
import { acquireDocumentCamera } from '../cameraAcquisition';

test('camera retries incompatible constraints without requesting audio', async () => {
  const calls: MediaStreamConstraints[] = [];
  const stream = {} as MediaStream;
  const result = await acquireDocumentCamera(
    {
      getUserMedia: async (constraints) => {
        calls.push(constraints!);
        if (calls.length === 1) throw new DOMException('', 'OverconstrainedError');
        return stream;
      },
    },
    () => false,
  );
  assert.equal(result, stream);
  assert.equal(calls.length, 2);
  assert.equal(
    calls.every((call) => call.audio === false),
    true,
  );
  assert.deepEqual(calls[1].video, { facingMode: { ideal: 'environment' } });
});

test('camera respects permission denial and cancellation, with no extra device request', async () => {
  for (const [name, cancelled] of [
    ['NotAllowedError', false],
    ['SecurityError', false],
    ['NotFoundError', false],
    ['NotReadableError', true],
  ] as const) {
    let calls = 0;
    await assert.rejects(
      acquireDocumentCamera(
        {
          getUserMedia: async () => {
            calls++;
            throw new DOMException('', name);
          },
        },
        () => cancelled,
      ),
      { name },
    );
    assert.equal(calls, 1);
  }
});

test('a second device failure reaches the recovery UI without a retry loop', async () => {
  let calls = 0;
  await assert.rejects(
    acquireDocumentCamera(
      {
        getUserMedia: async () => {
          calls++;
          throw new DOMException('', 'NotReadableError');
        },
      },
      () => false,
    ),
  );
  assert.equal(calls, 2);
});
