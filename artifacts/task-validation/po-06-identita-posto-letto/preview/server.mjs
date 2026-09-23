import express from 'express';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startPo05Postgres } from '../../../../tests/fixtures/po05-postgres.mjs';
import { fixtureActors, selectLocalParameterDatabase, closeParameterPrisma } from '../../../../tests/fixtures/parameter-database.mjs';
import { seedPo06Identity } from '../../../../tests/fixtures/po06-identity.mjs';

const root = process.cwd(), port = 4187;
const folder = resolve(root, 'artifacts/task-validation/po-06-identita-posto-letto/preview');
const database = await startPo05Postgres({ repositoryRoot: root, artifactRoot: resolve(folder, '../scratch') });
selectLocalParameterDatabase(database.url);
process.env.VITE_API_URL = `http://127.0.0.1:${port}/api`;
const { prisma } = await import('../../../../backend/src/lib/prisma.js');
const { facilityToday } = await import('../../../../backend/src/patients/parameter-reading-input.js');
const today = facilityToday();
await seedPo06Identity(prisma, database.db, today);
const [{ default: patients }, { default: therapy }, { default: handovers }] = await Promise.all([
  import('../../../../backend/src/routes/patients.js'), import('../../../../backend/src/routes/therapy.js'), import('../../../../backend/src/routes/consegne.js'),
]);
const requests = [], events = [];
let summaryFailure = false;
const app = express();
app.use(express.json());
app.get('/fixture/info', (_req, res) => res.json({ actor: fixtureActors.operator, today }));
app.post('/fixture/failure', (req, res) => { summaryFailure = req.body.enabled === true; res.json({ summaryFailure }); });
app.post('/fixture/event', (req, res) => { events.push(req.body); res.json({ ok: true }); });
const exportState = async () => {
  const state = { today, requests, events, readings: await prisma.patientParameterReading.findMany(), administrations: await prisma.medicationAdministration.findMany() };
  await writeFile(resolve(folder, 'synthetic-state.json'), JSON.stringify(state, null, 2));
  return state;
};
app.post('/fixture/export', async (_req, res) => res.json(await exportState()));
app.use('/api', (req, res, next) => {
  requests.push({ method: req.method, path: req.originalUrl, at: new Date().toISOString() });
  if (req.path === '/patients/parameters/page') {
    if (summaryFailure) return res.status(503).json({ error: 'Riepilogo sintetico indisponibile' });
    setTimeout(next, 1200); return;
  }
  next();
});
app.use('/api/patients', patients);
app.use('/api/therapy-slots', therapy);
app.use('/api/consegne', handovers);
const vite = await createServer({ root, configFile: false, envFile: false, plugins: [react()], cacheDir: resolve(folder, 'cache'), server: { middlewareMode: true, hmr: false, fs: { allow: [root] } }, appType: 'custom' });
app.use(vite.middlewares);
app.get('/', async (_req, res) => res.type('html').send(await vite.transformIndexHtml('/', await readFile(resolve(folder, 'index.html'), 'utf8'))));
const server = app.listen(port, '127.0.0.1', () => console.log(`PO06 synthetic browser http://127.0.0.1:${port}`));
let closing = false;
async function close() {
  if (closing) return; closing = true;
  await exportState(); server.closeAllConnections(); server.close(); await vite.close(); await closeParameterPrisma(prisma); await database.close(); process.exit(0);
}
process.on('SIGINT', close); process.on('SIGTERM', close);
