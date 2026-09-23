import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { startPo05Postgres } from '../../../tests/fixtures/po05-postgres.mjs';
import { fixtureActors, seedParameterDatabase, selectLocalParameterDatabase, closeParameterPrisma } from '../../../tests/fixtures/parameter-database.mjs';

const folder = resolve('artifacts/task-validation/po-05-scansioni-lunghe');
const candidateRoot = resolve(process.env.PO05_CANDIDATE_ROOT || '.');
const candidateModule = (path: string) => import(pathToFileURL(resolve(candidateRoot, path)).href);
const { startPo05ImportApi, startPo05Runtime } = await candidateModule('tests/fixtures/po05-runtime-api.mjs');
const database = await startPo05Postgres({ repositoryRoot: candidateRoot });
selectLocalParameterDatabase(database.url);
await seedParameterDatabase(database.db);
const runtime = await startPo05Runtime();
process.env.AI_PROVIDER = 'mock';
process.env.AI_RUNTIME_URL = runtime.url;
process.env.AI_RUNTIME_SERVICE_TOKEN = runtime.token;
process.env.AI_RATE_LIMIT_PER_MIN = '2000';
await mkdir(resolve(folder, 'scratch'), { recursive: true });
process.env.AI_UPLOAD_DIR = await mkdtemp(resolve(folder, 'scratch/benchmark-'));
const api = await startPo05ImportApi();
const { runNextPageJob } = await candidateModule('backend/src/ai/upload/pages/worker.ts');
const actor = fixtureActors.operator;
const headers = { 'X-Operator-Id': actor.id, 'X-Operator-Role': actor.role };
const base = `${api.url}/ai/extraction/jobs`;
async function request(path: string, body?: unknown, method = 'POST', extra = {}) {
  const response = await fetch(base + path, { method, headers: { ...headers, 'Content-Type': 'application/json', ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json() as any;
  assert.ok(response.ok, `${response.status}: ${JSON.stringify(data)}`);
  return data;
}
const measurements: unknown[] = [];
try {
  for (const scenario of ['30-jpeg', 'pdf-30-pages', '3-letters-10-pages']) {
    const startRss = process.memoryUsage().rss;
    let peakRss = startRss;
    const sample = setInterval(() => { peakRss = Math.max(peakRss, process.memoryUsage().rss); }, 10);
    const started = performance.now();
    let job = (await request('', { sessionVersion: 1 }, 'POST', { 'Idempotency-Key': randomUUID() })).job;
    const groupCount = scenario === '3-letters-10-pages' ? 3 : 1;
    const groups = Array.from({ length: groupCount }, (_, index) => ({ id: randomUUID(), label: `Lettera sintetica ${index + 1}`, sortOrder: index }));
    job = await request(`/${job.id}/manifest`, { requestId: randomUUID(), expectedRevision: job.manifest.revision, groups, pages: [] }, 'PUT');
    const filenames = scenario === '30-jpeg' ? Array.from({ length: 30 }, (_, i) => `pagina-${String(i + 1).padStart(2, '0')}.jpg`) : scenario === 'pdf-30-pages' ? ['trenta-pagine.pdf'] : ['lettera-1.pdf', 'lettera-2.pdf', 'lettera-3.pdf'];
    let inputBytes = 0;
    const sources = [];
    for (const [index, name] of filenames.entries()) {
      const bytes = await readFile(resolve(folder, 'fixtures/scanned', name));
      inputBytes += bytes.length;
      sources.push({ name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
      const form = new FormData();
      form.append('metadata', JSON.stringify({ requestId: randomUUID(), expectedRevision: job.manifest.revision, groupId: groups[groupCount === 1 ? 0 : index].id, items: [{ clientFileId: randomUUID() }] }));
      form.append('files', new Blob([bytes], { type: name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg' }), name);
      const response = await fetch(`${base}/${job.id}/files`, { method: 'POST', headers, body: form });
      const data = await response.json() as any;
      assert.equal(response.status, 200, JSON.stringify(data));
      assert.equal(data.outcomes[0].status, 'accepted', JSON.stringify(data.outcomes));
      job = data.job;
    }
    const uploadMs = performance.now() - started;
    assert.equal(job.manifest.pages.length, 30);
    assert.equal(job.totalBytes, inputBytes);
    const startsBefore = runtime.events.filter(event => event.action === 'start').length;
    await request(`/${job.id}/process`, { expectedRevision: job.manifest.revision });
    const processStart = performance.now();
    await runNextPageJob({ pollMs: 1 });
    const processMs = performance.now() - processStart;
    const metadataStart = performance.now();
    job = await request(`/${job.id}`, undefined, 'GET');
    const metadataMs = performance.now() - metadataStart;
    assert.equal(job.status, 'review_ready', JSON.stringify(job));
    assert.equal(job.progress.completedPages, 30);
    assert.equal(job.progress.completedGroups, groupCount);
    const startedUnits = runtime.events.filter(event => event.action === 'start').length - startsBefore;
    assert.equal(startedUnits, 30 + groupCount);
    clearInterval(sample);
    measurements.push({ scenario, inputBytes, sources, pages: 30, originals: filenames.length, groups: groupCount,
      uploadMs, processMs, metadataMs, metadataBytes: Buffer.byteLength(JSON.stringify(job)), startedUnits,
      processStartRss: startRss, processPeakRss: peakRss, rssIncrease: peakRss - startRss });
    console.log(`${scenario}: ${(inputBytes / 1048576).toFixed(2)} MiB, upload ${uploadMs.toFixed(0)} ms, local processing ${processMs.toFixed(0)} ms, RSS ${(peakRss / 1048576).toFixed(1)} MiB`);
  }
  await writeFile(resolve(folder, process.env.PO05_BENCHMARK_OUTPUT || 'benchmark.json'), JSON.stringify({ at: new Date().toISOString(), candidateRoot,
    environment: 'Windows, real loopback PostgreSQL; API and synthetic runtime in same Node process',
    caveat: 'No real provider latency or device capture measured. RSS excludes native PostgreSQL; includes all Node fixture/runtime allocations. Shared process retains previous scenario allocations.',
    measurements }, null, 2));
} finally {
  await api.close(); await runtime.close(); await closeParameterPrisma(api.prisma); await database.close();
}
