import assert from 'node:assert/strict';
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, before, mock, test } from 'node:test';

let runJob: typeof import('../upload/job-service.js').runJob;
let prisma: typeof import('../../lib/prisma.js').prisma;
let originalJobDelegate: typeof prisma.importJob;
let originalAuditDelegate: typeof prisma.importAudit;
const originalTimeout = globalThis.setTimeout;
before(async () => {
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/ocr_test';
  process.env.AI_RUNTIME_URL = 'https://runtime.test';
  process.env.AI_RUNTIME_SERVICE_TOKEN = 'synthetic-runtime-token';
  process.env.AI_OCR_TRANSCRIPTION = 'true';
  process.env.AI_SECTIONS_PASS = 'false';
  process.env.AI_CLINICAL_LISTS_PASS = 'false';
  ({ runJob } = await import('../upload/job-service.js'));
  ({ prisma } = await import('../../lib/prisma.js'));
  originalJobDelegate = prisma.importJob;
  originalAuditDelegate = prisma.importAudit;
});
afterEach(() => {
  Object.assign(prisma, { importJob: originalJobDelegate, importAudit: originalAuditDelegate });
  mock.restoreAll();
});

async function exercise(terminal: string, error?: unknown) {
  const dir = await mkdtemp(join(tmpdir(), 'clinicos-ocr-state-'));
  const file = join(dir, 'synthetic.png');
  await writeFile(file, 'synthetic document');
  const updates: Record<string, any>[] = [];
  let created = 0;
  // Prisma delegates are dynamic proxies; replace the delegate in this isolated
  // test process instead of inspecting method descriptors with mock.method.
  Object.assign(prisma, {
    importJob: {
      findUnique: async () =>
        ({
          id: 'test-job',
          status: 'waiting_for_model',
          documents: [
            {
              id: 'doc',
              filename: 'synthetic.png',
              mimeType: 'image/png',
              status: 'uploaded',
              storagePath: file,
            },
          ],
        }) as any,
      update: async ({ data }: any) => {
        updates.push(structuredClone(data));
        return { id: 'test-job', ...data };
      },
    },
    importAudit: { create: async () => ({}) },
  });
  mock.method(globalThis, 'setTimeout', ((
    fn: (...args: unknown[]) => void,
    delay?: number,
    ...args: unknown[]
  ) => originalTimeout(fn, delay === 3000 ? 0 : delay, ...args)) as typeof setTimeout);
  mock.method(globalThis, 'fetch', async (input, options) => {
    const url = String(input);
    if (url.endsWith('/run')) return Response.json({}, { status: 202 });
    if (options?.method === 'POST') return Response.json({ job_id: `runtime-${++created}` });
    if (url.includes('runtime-1'))
      return Response.json(
        url.endsWith('/result')
          ? { data: { rawText: 'TESTO SINTETICO OCR' } }
          : { status: 'review_ready' },
      );
    if (url.endsWith('/result')) return Response.json({ data: { anagrafica: {}, cartella: {} } });
    return Response.json({ status: terminal, error });
  });
  try {
    await runJob('test-job');
  } finally {
    await unlink(file);
    await rmdir(dir);
  }
  return updates;
}

test('review_ready is published only with the complete review result', async () => {
  const updates = await exercise('review_ready');
  const terminal = updates.filter((u) =>
    ['review_ready', 'failed', 'retryable_error'].includes(u.status),
  );
  assert.equal(terminal.length, 1);
  assert.equal(terminal[0].status, 'review_ready');
  assert.equal(terminal[0].resultData.rawText, 'TESTO SINTETICO OCR');
  assert.ok(terminal[0].resultData._narrative);
  assert.equal(terminal[0].stage, 'completed');
});

test('terminal provider failures are published once with safe diagnostics and corrected retryability', async () => {
  const updates = await exercise('retryable_error', {
    kind: 'provider_error',
    message: 'HTTP 401 private-provider-body',
  });
  const terminal = updates.filter((u) =>
    ['review_ready', 'failed', 'retryable_error'].includes(u.status),
  );
  assert.equal(terminal.length, 1);
  assert.equal(terminal[0].status, 'failed');
  assert.equal(terminal[0].stage, 'error');
  assert.match(terminal[0].error, /AI_AUTH/);
  assert.doesNotMatch(terminal[0].error, /private-provider-body/);
});
