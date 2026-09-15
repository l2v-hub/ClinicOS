import assert from 'node:assert/strict';
import { afterEach, before, mock, test } from 'node:test';

const originalFetch = globalThis.fetch;
const originalTimeout = globalThis.setTimeout;
let transcribe: typeof import('../upload/job-service.js').runtimeTranscribe;
before(async () => {
  // Never connect to a real database or runtime. Prisma construction is lazy.
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/ocr_test';
  process.env.AI_RUNTIME_URL = 'https://runtime.test';
  process.env.AI_RUNTIME_SERVICE_TOKEN = 'synthetic-runtime-token';
  transcribe = (await import('../upload/job-service.js')).runtimeTranscribe;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restoreAll();
});
const documents = [
  { id: 'test-file', filename: 'synthetic.png', mimeType: 'image/png', data: Buffer.from('test') },
];

function transport(status: unknown, result: unknown = { rawText: 'TESTO SINTETICO' }) {
  const calls: { url: string; options?: RequestInit }[] = [];
  mock.method(globalThis, 'setTimeout', ((
    fn: (...args: unknown[]) => void,
    delay?: number,
    ...args: unknown[]
  ) => originalTimeout(fn, delay === 3000 ? 0 : delay, ...args)) as typeof setTimeout);
  globalThis.fetch = (async (input, options) => {
    const url = String(input);
    calls.push({ url, options });
    if (url.endsWith('/run')) return Response.json({}, { status: 202 });
    if (url.endsWith('/result')) return Response.json({ data: result });
    if (options?.method === 'POST') return Response.json({ job_id: 'ocr-test' });
    return Response.json(status);
  }) as typeof fetch;
  return calls;
}

test('successful OCR retains exact text and sends files using OCR mode', async () => {
  const calls = transport({ status: 'review_ready' });
  assert.equal(await transcribe('test-job', documents), 'TESTO SINTETICO');
  assert.equal(JSON.parse(calls[0].options!.body as string).files.length, 1);
  assert.deepEqual(JSON.parse(calls[1].options!.body as string), { mode: 'ocr' });
  assert.equal(calls.length, 4);
});

test('legacy provider authentication failures stop OCR instead of returning empty text', async () => {
  const calls = transport({
    status: 'retryable_error',
    error: { kind: 'provider_error', message: 'Document Intelligence: HTTP 401 private-value' },
  });
  await assert.rejects(transcribe('test-job', documents), (error: any) => {
    assert.equal(error.kind, 'config');
    assert.match(error.message, /AI_AUTH/);
    assert.doesNotMatch(error.message, /private-value/);
    return true;
  });
  assert.equal(calls.length, 3);
  assert.equal(
    calls.some((call) => call.url.endsWith('/result')),
    false,
  );
});

test('empty successful OCR payload fails explicitly rather than reaching extraction', async () => {
  transport({ status: 'review_ready' }, { rawText: '' });
  await assert.rejects(transcribe('test-job', documents), /AI_EMPTY/);
});

test('runtime HTTP authentication errors discard response payloads', async () => {
  globalThis.fetch = (async () =>
    Response.json({ error: 'private-value' }, { status: 401 })) as typeof fetch;
  await assert.rejects(transcribe('test-job', documents), (error: any) => {
    assert.match(error.message, /AI_AUTH/);
    assert.doesNotMatch(error.message, /private-value/);
    return true;
  });
});
