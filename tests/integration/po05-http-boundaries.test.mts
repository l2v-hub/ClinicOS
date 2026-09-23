import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { before, after, test } from 'node:test';
import { startPo05Postgres } from '../fixtures/po05-postgres.mjs';
import { fixtureActors, seedParameterDatabase, selectLocalParameterDatabase, closeParameterPrisma } from '../fixtures/parameter-database.mjs';

const candidateRoot = resolve(process.env.PO05_CANDIDATE_ROOT || '.');
const candidateModule = (path: string) => import(pathToFileURL(resolve(candidateRoot, path)).href);
const require = createRequire(resolve(candidateRoot, 'backend/package.json'));
const { PDFDocument, StandardFonts } = require('pdf-lib');
let database: Awaited<ReturnType<typeof startPo05Postgres>>;
let prisma: typeof import('../../backend/src/lib/prisma.js').prisma;
let server: import('node:http').Server;
let base: string;
const actor = fixtureActors.operator;
const headers = { 'X-Operator-Id': actor.id, 'X-Operator-Role': actor.role };

before(async () => {
  database = await startPo05Postgres({ repositoryRoot: candidateRoot });
  selectLocalParameterDatabase(database.url);
  await seedParameterDatabase(database.db);
  process.env.AI_PROVIDER = 'mock';
  process.env.AI_RUNTIME_URL = 'http://127.0.0.1:1';
  process.env.AI_RUNTIME_SERVICE_TOKEN = 'synthetic-unused';
  process.env.AI_RATE_LIMIT_PER_MIN = '2000';
  await mkdir(resolve('artifacts/task-validation/po-05-scansioni-lunghe/scratch'), { recursive: true });
  process.env.AI_UPLOAD_DIR = await mkdtemp(resolve('artifacts/task-validation/po-05-scansioni-lunghe/scratch/http-'));
  ({ prisma } = await candidateModule('backend/src/lib/prisma.ts'));
  const [{ default: express }, { default: jobs }] = await Promise.all([import('express'), candidateModule('backend/src/routes/ai-jobs.ts')]);
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use('/jobs', jobs);
  server = await new Promise(resolveServer => { const s = app.listen(0, '127.0.0.1', () => resolveServer(s)); });
  base = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}/jobs`;
}, { timeout: 60000 });

after(async () => {
  if (server) { server.closeAllConnections(); await new Promise<void>(ok => server.close(() => ok())); }
  if (prisma) await closeParameterPrisma(prisma);
  await database?.close();
});

async function json(path: string, body?: unknown, method = 'POST', extra: Record<string, string> = {}) {
  const r = await fetch(base + path, { method, headers: { ...headers, 'Content-Type': 'application/json', ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: r.status, body: await r.json() as any };
}
async function create() {
  const r = await json('', { sessionVersion: 1 }, 'POST', { 'Idempotency-Key': randomUUID() });
  assert.equal(r.status, 201);
  assert.equal(r.body.job.capabilities?.sessionVersion, 1, 'V1 contract must be explicitly enabled');
  let job = r.body.job;
  if (!job.manifest.groups.length) {
    const next = await json(`/${job.id}/manifest`, { requestId: randomUUID(), expectedRevision: job.manifest.revision, groups: [{ id: randomUUID(), label: 'Lettera sintetica', sortOrder: 0 }], pages: [] }, 'PUT');
    assert.equal(next.status, 200);
    job = next.body;
  }
  return job;
}
async function pdf(count = 1, label = randomUUID()) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= count; i++) doc.addPage([595, 842]).drawText(`SYNTHETIC ${label} PAGE ${i}`, { x: 30, y: 780, size: 10, font });
  return Buffer.from(await doc.save());
}
async function upload(job: any, bytes: Buffer, requestId = randomUUID(), path = `/${job.id}/files`, clientFileId = randomUUID()) {
  const form = new FormData();
  const replace = path.includes('/replace');
  form.append('metadata', JSON.stringify({ requestId, expectedRevision: job.manifest.revision, ...(replace ? { clientFileId } : { groupId: job.manifest.groups[0].id, items: [{ clientFileId }] }) }));
  form.append('files', new Blob([bytes], { type: 'application/pdf' }), 'source.pdf');
  const r = await fetch(base + path, { method: 'POST', headers, body: form });
  return { status: r.status, body: await r.json() as any };
}

test('thirty-page PDF is counted; page replacement at the cap is atomic and replay-safe', async () => {
  const initial = await create();
  assert.ok(initial.limits.maxPages >= 30);
  const over = await upload(initial, await pdf(31));
  assert.ok(over.status === 400 || over.status === 422 || over.body.outcomes?.[0]?.status === 'rejected');
  const stillEmpty = await json(`/${initial.id}`, undefined, 'GET');
  assert.equal(stillEmpty.body.manifest.pages.length, 0);
  const original = await pdf(30);
  const added = await upload(stillEmpty.body, original);
  assert.equal(added.status, 200);
  assert.equal(added.body.outcomes[0].status, 'accepted');
  const loaded = added.body.job;
  assert.equal(loaded.manifest.pages.length, 30);
  assert.equal(loaded.documents.length, 1);
  assert.equal(loaded.documents[0].pageCount, 30);
  const page = loaded.manifest.pages[16];
  const replacement = await pdf(1, 'REPLACED-PAGE-17');
  const requestId = randomUUID();
  const clientFileId = randomUUID();
  const path = `/${loaded.id}/pages/${page.id}/replace`;
  const swapped = await upload(loaded, replacement, requestId, path, clientFileId);
  assert.equal(swapped.status, 200);
  const edited = swapped.body.job;
  assert.equal(edited.manifest.pages.length, 30);
  assert.equal(edited.manifest.pages[16].id, page.id);
  assert.equal(edited.manifest.pages[16].groupId, page.groupId);
  assert.notEqual(edited.manifest.pages[16].documentId, page.documentId);
  assert.equal(edited.totalBytes, original.length + replacement.length, 'Shared PDF still referenced; its full size remains charged');
  const replay = await upload(loaded, replacement, requestId, path, clientFileId);
  assert.equal(replay.status, 200, 'Receipt is checked before stale revision CAS');
  assert.deepEqual(replay.body.outcomes, swapped.body.outcomes);
  assert.equal(replay.body.job.manifest.revision, edited.manifest.revision);
  const conflictingReplay = await upload(loaded, await pdf(1, 'DIFFERENT'), requestId, path, clientFileId);
  assert.equal(conflictingReplay.status, 409);
  assert.equal(conflictingReplay.body.code, 'idempotency_conflict');
});

test('simultaneous uploads use revision CAS on real PostgreSQL; retry does not overwrite the winner', async () => {
  const job = await create();
  const [a, b] = await Promise.all([upload(job, await pdf(1, 'A')), upload(job, await pdf(1, 'B'))]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  const current = await json(`/${job.id}`, undefined, 'GET');
  assert.equal(current.body.manifest.pages.length, 1);
  const retry = await upload(current.body, await pdf(1, 'C'));
  assert.equal(retry.status, 200);
  assert.equal(retry.body.job.manifest.pages.length, 2);
});

test('page omission cannot delete a source; foreign operator cannot read metadata or bytes', async () => {
  const added = await upload(await create(), await pdf(2));
  const job = added.body.job;
  const omitted = await json(`/${job.id}/manifest`, { requestId: randomUUID(), expectedRevision: job.manifest.revision, groups: job.manifest.groups.map(({ id, label, sortOrder }: any) => ({ id, label, sortOrder })), pages: [] }, 'PUT');
  assert.ok([400, 409, 422].includes(omitted.status));
  const current = await json(`/${job.id}`, undefined, 'GET');
  assert.equal(current.body.manifest.pages.length, 2);
  assert.doesNotMatch(JSON.stringify(current.body), /dataBase64|storagePath|runToken|runtimeJobId|content_base64/);
  const foreign = { 'X-Operator-Id': fixtureActors.outsider.id, 'X-Operator-Role': fixtureActors.outsider.role };
  assert.equal((await json(`/${job.id}`, undefined, 'GET', foreign)).status, 404);
  const bytes = await fetch(`${base}/${job.id}/files/${job.documents[0].id}/content`, { headers: foreign });
  assert.equal(bytes.status, 404);
  const original = await fetch(`${base}/${job.id}/files/${job.documents[0].id}/content`, { headers });
  assert.equal(original.status, 200);
  assert.match(original.headers.get('content-type') || '', /application\/pdf/);
  assert.match(original.headers.get('cache-control') || '', /no-store/);
  assert.equal((await PDFDocument.load(await original.arrayBuffer())).getPageCount(), 2);
});

test('chunked multipart is bounded by aggregate request bytes before any source is stored', async () => {
  const job = await create();
  const boundary = `PO05-${randomUUID()}`;
  const metadata = { requestId: randomUUID(), expectedRevision: job.manifest.revision,
    groupId: job.manifest.groups[0].id, items: [{ clientFileId: randomUUID() }, { clientFileId: randomUUID() }] };
  const half = Math.floor(job.limits.maxRequestBytes / 2) + 65536;
  assert.ok(half < job.limits.maxFileBytes, 'Each file fits; only the aggregate exceeds the request limit');
  async function* chunks() {
    yield Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n${JSON.stringify(metadata)}\r\n`);
    for (let i = 0; i < 2; i++) {
      yield Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="large-${i}.pdf"\r\nContent-Type: application/pdf\r\n\r\n`);
      yield Buffer.from('%PDF-1.4\n');
      for (let bytes = 9; bytes < half; bytes += 65536) yield Buffer.alloc(Math.min(65536, half - bytes), 32);
      yield Buffer.from('\r\n');
    }
    yield Buffer.from(`--${boundary}--\r\n`);
  }
  const response = await fetch(`${base}/${job.id}/files`, {
    method: 'POST', headers: { ...headers, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: chunks(), duplex: 'half', signal: AbortSignal.timeout(30000),
  } as any);
  assert.equal(response.status, 413);
  const current = await json(`/${job.id}`, undefined, 'GET');
  assert.equal(current.body.manifest.pages.length, 0);
  assert.equal(current.body.totalBytes, 0);
});
