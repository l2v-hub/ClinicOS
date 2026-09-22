import express from 'express';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fixtureActors, seedParameterDatabase, selectLocalParameterDatabase, startParameterDatabase } from '../../../../tests/fixtures/parameter-database.mjs';

const port = 4184;
const root = process.cwd();
const folder = 'artifacts/task-validation/po-02-correzione-orari/preview';
const database = await startParameterDatabase();
await seedParameterDatabase(database.db);
selectLocalParameterDatabase(database.url);
process.env.VITE_API_URL = `http://127.0.0.1:${port}/api`;
const { prisma } = await import('../../../../backend/src/lib/prisma.js');
const { default: patients } = await import('../../../../backend/src/routes/patients.js');
const { default: drafts } = await import('../../../../backend/src/routes/intake-drafts.js');
const actor = fixtureActors.operator;
const job = await prisma.importJob.create({ data: { createdById: actor.id, status: 'review_ready', maxFiles: 10, maxTotalBytes: 1000000, expiresAt: new Date(Date.now() + 86400000), resultData: {} } });
const bytes = Buffer.from('%PDF-1.4 synthetic document');
await prisma.importDocument.create({ data: { jobId: job.id, filename: 'dimissione-sintetica.pdf', mimeType: 'application/pdf', sizeBytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), storagePath: 'synthetic-only', dataBase64: bytes.toString('base64'), status: 'uploaded', sortOrder: 0 } });
const baseRow = { farmacoNome: 'Lasix sintetico', forma: 'cpr', dosaggio: '25 mg', viaSomministrazione: 'OS', quantita: '1', orari: ['16:00'], giorni: [], dataInizio: '2026-09-23', classe: '', note: '', originalText: 'Riga sintetica: 25 mg, 1 compressa ore 16:00', stato: 'da_verificare' };
const imported = await prisma.patientIntakeDraft.create({ data: { createdById: actor.id, source: 'import', importJobId: job.id, data: {
  anagrafica: { firstName: 'Importazione', lastName: 'Sintetica' },
  terapiaImport: [baseRow, { ...baseRow, farmacoNome: 'Da verificare', quantita: '', orari: [], stato: 'da_verificare', originalText: 'Fonte sintetica ambigua' }],
  _terapiaText: 'Fonte OCR sintetica conservata', _narrative: { boldTags: [], sourceReferences: [], therapyText: 'Fonte OCR sintetica conservata' },
} } });
const { default: therapy } = await import('../../../../backend/src/routes/therapy.js');
const multiImported = await prisma.patientIntakeDraft.create({ data: { createdById: actor.id, source: 'import', data: {
  anagrafica: { firstName: 'Doppio', lastName: 'Orario sintetico' },
  terapiaImport: [{ ...baseRow, orari: ['08:00', '16:00'], originalText: 'Fonte sintetica: 25 mg, 1 compressa ore 08:00 e 16:00' }],
  _accepted: { demographics: true, therapy: true },
} } });
const requests = [];
const app = express();
app.use(express.json());
app.use('/api/intake/drafts', async (req, res, next) => {
  if (['PATCH','POST'].includes(req.method)) {
    const request = { method: req.method, path: req.path, started: Date.now(), body: structuredClone(req.body), finished: null };
    requests.push(request);
    res.on('finish', () => { request.finished = Date.now(); });
    // Synthetic latency exercises a save still in progress during confirmation.
    if (req.method === 'PATCH' && req.path.includes(multiImported.id)) await new Promise(resolve => setTimeout(resolve, 1500));
  }
  next();
});
app.get('/fixture/info', (_req, res) => res.json({ actor, importDraftId: imported.id, multiDraftId: multiImported.id }));
app.get('/fixture/state', async (_req, res) => res.json({ patients: await prisma.patient.findMany({ where: { id: { not: { startsWith: 'PARAM-' } } }, include: { therapies: { include: { schedules: true } } } }), drafts: await prisma.patientIntakeDraft.findMany(), requests, documents: await prisma.patientDocument.findMany({ select: { id: true, patientId: true } }) }));
app.use('/api/patients', patients);
app.use('/api/intake/drafts', drafts);
app.use('/api/therapy-slots', therapy);
app.use('/api', (_req, res) => res.json([]));
const vite = await createServer({ root, configFile: false, envFile: false, plugins: [react()], cacheDir: resolve(root, folder, 'cache'), server: { middlewareMode: true, hmr: false, fs: { allow: [root] } }, appType: 'custom' });
app.use(vite.middlewares);
app.get('/', async (_req, res) => res.type('html').send(await vite.transformIndexHtml('/', await readFile(resolve(root, folder, 'index.html'), 'utf8'))));
const server = app.listen(port, '127.0.0.1', () => console.log(`Synthetic intake preview http://127.0.0.1:${port}`));
process.on('SIGINT', async () => { server.closeAllConnections(); server.close(); await vite.close(); await prisma.$disconnect(); await database.close(); process.exit(0); });
