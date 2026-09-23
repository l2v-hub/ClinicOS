import express from 'express';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { startPo05Postgres } from '../../../../tests/fixtures/po05-postgres.mjs';
import { fixtureActors, seedParameterDatabase, selectLocalParameterDatabase, closeParameterPrisma } from '../../../../tests/fixtures/parameter-database.mjs';

const port = 4186;
const root = process.cwd();
const backendRoot = resolve(process.env.PO05_BACKEND_ROOT || root);
const frontendRoot = resolve(process.env.PO05_FRONTEND_ROOT || root);
const backendModule = path => import(pathToFileURL(resolve(backendRoot, path)).href);
const { startPo05Runtime } = await backendModule('tests/fixtures/po05-runtime-api.mjs');
const folder = 'artifacts/task-validation/po-05-scansioni-lunghe/preview';
const database = await startPo05Postgres({ repositoryRoot: backendRoot });
selectLocalParameterDatabase(database.url);
await seedParameterDatabase(database.db);
process.env.VITE_API_URL = `http://127.0.0.1:${port}/api`;
process.env.AI_PROVIDER = 'mock';
process.env.AI_RATE_LIMIT_PER_MIN = '2000';
await mkdir(resolve(root, folder, 'scratch'), { recursive: true });
process.env.AI_UPLOAD_DIR = await mkdtemp(resolve(root, folder, 'scratch/uploads-'));
const { prisma } = await backendModule('backend/src/lib/prisma.ts');
let faultPage = null;
let conflicting = false;
let requestFault = null;
const runtime = await startPo05Runtime({ respond: async job => {
  const [, jobId, kind, unitId] = job.input.external_job_id.split(':');
  const source = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId }, select: { manifest: true } });
  const m = source.manifest;
  const groups = [...m.groups].sort((a, b) => a.sortOrder - b.sortOrder);
  const pages = groups.flatMap(group => m.pages.filter(p => p.groupId === group.id).sort((a, b) => a.sortOrder - b.sortOrder));
  const page = pages.find(p => p.id === unitId);
  const group = groups.find(g => g.id === (page?.groupId ?? unitId));
  const groupIndex = groups.indexOf(group);
  const time = conflicting && groupIndex > 0 ? '20:00' : '08:00';
  await new Promise(done => setTimeout(done, kind === 'ocr' ? 80 : 180));
  if (kind === 'ocr') {
    const ordinal = pages.indexOf(page) + 1;
    if (faultPage === ordinal) {
      faultPage = null;
      return { status: 'failed', data: null, error: { kind: 'provider_error' } };
    }
    return { data: { rawText: `# Lettera ${groupIndex + 1} · pagina ${page.sortOrder + 1}\n\n## DIAGNOSI\nOsservazione sintetica pagina ${ordinal}. Questo documento serve esclusivamente al collaudo locale della scansione e non contiene dati clinici reali.\n\n${page.sortOrder === 0 ? `## TERAPIA ALLA DIMISSIONE\nLASIX CPR 25 MG (OS) 1 Cpr ore ${time}; controllare PA alle 22:00 dal 23/09/2026 (Classe A)\n` : ''}` } };
  }
  return { data: {
    anagrafica: { nome: conflicting && groupIndex > 0 ? 'Alberta' : 'Alba', cognome: 'Sintetica', sesso: 'F' },
    cartella: { diagnosi: [{ descrizione: 'Osservazione sintetica', tipo: 'principale', stato: 'attiva' }],
      farmaci: [{ nome: 'LASIX', dose: '25 mg', frequenza: time, via: 'orale', stato: 'attivo' }] },
  } };
} });
process.env.AI_RUNTIME_URL = runtime.url;
process.env.AI_RUNTIME_SERVICE_TOKEN = runtime.token;
const [{ default: jobs }, { default: drafts }, { default: patients }, { default: drugs }, { runNextPageJob }] = await Promise.all([
  backendModule('backend/src/routes/ai-jobs.ts'),
  backendModule('backend/src/routes/intake-drafts.ts'),
  backendModule('backend/src/routes/patients.ts'),
  backendModule('backend/src/routes/farmaci.ts'),
  backendModule('backend/src/ai/upload/pages/worker.ts'),
]);
const requests = [];
const app = express();
app.use(express.json({ limit: '2mb' }));
app.get('/fixture/info', (_req, res) => res.json({ actor: fixtureActors.operator, synthetic: true }));
app.post('/fixture/control', (req, res) => {
  if (req.body.action === 'page17') faultPage = 17;
  if (req.body.action === 'conflicts') conflicting = req.body.enabled === true;
  if (req.body.action === 'upload-lost') requestFault = 'files';
  if (req.body.action === 'patch-lost') requestFault = 'draft';
  res.json({ faultPage, conflicting, requestFault });
});
app.get('/fixture/state', async (_req, res) => res.json({
  sessions: await prisma.importJob.findMany({ select: { id: true, status: true, manifest: true, manifestRevision: true } }),
  drafts: await prisma.patientIntakeDraft.findMany(),
  patients: await prisma.patient.findMany({ where: { id: { notIn: ['vitals-qa-anna', 'vitals-qa-bruno', 'vitals-qa-other'] } }, select: { id: true, firstName: true, lastName: true } }),
  documents: await prisma.patientDocument.findMany({ select: { id: true, patientId: true, originalName: true, sourceManifest: true } }),
  runtime: runtime.events, requests,
}));
app.use('/api', (req, res, next) => {
  const record = { path: req.path, method: req.method, at: Date.now() };
  requests.push(record);
  res.on('finish', () => { record.status = res.statusCode; });
  if ((requestFault === 'files' && req.method === 'POST' && req.path.endsWith('/files')) ||
      (requestFault === 'draft' && req.method === 'PATCH' && req.path.startsWith('/intake/drafts/'))) {
    requestFault = null;
    const json = res.json.bind(res);
    res.json = body => res.statusCode < 300 ? json.call(res.status(503), { error: 'Risposta sintetica persa dopo il salvataggio. Riprova.' }) : json(body);
  }
  next();
});
app.use('/api/ai/extraction/jobs', jobs);
app.use('/api/intake/drafts', drafts);
app.use('/api/patients', patients);
app.use('/api/farmaci', drugs);
const vite = await createServer({ root, configFile: false, envDir: false, plugins: [react()],
  optimizeDeps: { entries: [resolve(root, folder, 'main.tsx')] },
  resolve: { alias: [{ find: '../../../../frontend/src', replacement: resolve(frontendRoot, 'frontend/src') }] },
  cacheDir: resolve(root, folder, 'cache'), server: { middlewareMode: true, hmr: false, fs: { allow: [root, frontendRoot] } }, appType: 'custom' });
app.use(vite.middlewares);
app.get('/', async (_req, res) => res.type('html').send(await vite.transformIndexHtml('/', await readFile(resolve(root, folder, 'index.html'), 'utf8'))));
const server = app.listen(port, '127.0.0.1', () => console.log(`Synthetic scan preview http://127.0.0.1:${port}`));
let busy = false;
const timer = setInterval(() => { if (busy) return; busy = true; runNextPageJob({ pollMs: 30 }).catch(console.error).finally(() => { busy = false; }); }, 100);
timer.unref();
let closing = false;
async function close() {
  if (closing) return;
  closing = true; clearInterval(timer); server.closeAllConnections(); server.close();
  await writeFile(resolve(root, folder, 'requests.json'), JSON.stringify({ requests, runtime: runtime.events }, null, 2));
  while (busy) await new Promise(done => setTimeout(done, 100));
  await writeFile(resolve(root, folder, 'synthetic-state.json'), JSON.stringify({
    sessions: await prisma.importJob.findMany({ select: { id: true, status: true, manifest: true, manifestRevision: true } }),
    drafts: await prisma.patientIntakeDraft.findMany(),
    patients: await prisma.patient.findMany({ where: { id: { notIn: ['vitals-qa-anna', 'vitals-qa-bruno', 'vitals-qa-other'] } }, select: { id: true, firstName: true, lastName: true } }),
    documents: await prisma.patientDocument.findMany({ select: { id: true, patientId: true, originalName: true, mimeType: true, sizeBytes: true, sha256: true, sourceManifest: true } }),
    therapies: await prisma.patientTherapy.findMany({ include: { schedules: true } }),
  }, null, 2));
  await vite.close(); await runtime.close(); await closeParameterPrisma(prisma); await database.close(); process.exit(0);
}
process.on('SIGINT', close);
process.on('SIGTERM', close);
