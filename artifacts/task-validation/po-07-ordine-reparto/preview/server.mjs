import express from 'express';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startPo05Postgres } from '../../../../tests/fixtures/po05-postgres.mjs';
import { fixtureActors, selectLocalParameterDatabase, closeParameterPrisma } from '../../../../tests/fixtures/parameter-database.mjs';
import { seedPo07Roster } from '../../../../tests/fixtures/po07-roster.mjs';

const root = process.cwd(), port = 4188;
const folder = resolve(root, 'artifacts/task-validation/po-07-ordine-reparto/preview');
const database = await startPo05Postgres({ repositoryRoot: root, artifactRoot: resolve(folder, '../scratch') });
selectLocalParameterDatabase(database.url);
process.env.VITE_API_URL = `http://127.0.0.1:${port}/api`;
const { prisma } = await import('../../../../backend/src/lib/prisma.js');
const today = (await import('../../../../backend/src/patients/parameter-reading-input.js')).facilityToday();
await seedPo07Roster(prisma, database.db, today);
const [{ default: patients }, { default: therapy }, roster] = await Promise.all([
  import('../../../../backend/src/routes/patients.js'), import('../../../../backend/src/routes/therapy.js'),
  import('../../../../backend/src/routes/roster-order.js'),
]);
const app = express(), requests = [], events = [];
let fault = null, preferenceMode = 'normal';
app.use(express.json());
app.get('/fixture/info', (_req, res) => res.json({ actors: fixtureActors, today }));
app.post('/fixture/event', (req, res) => { events.push(req.body); res.json({ ok: true }); });
app.post('/fixture/fault', (req, res) => { fault = req.body.mode; res.json({ fault }); });
app.post('/fixture/preference', (req, res) => { preferenceMode = req.body.mode; res.json({ preferenceMode }); });
app.post('/fixture/change-roster', async (_req, res) => {
  await prisma.cartella.update({ where: { patientId: 'po07-patient-001' }, data: { data: { cameraNumero: '20', lettoNumero: 'D', parametriMensili: [] } } });
  res.json({ ok: true });
});
const exportState = async () => {
  const state = { today, requests, events, readings: await prisma.patientParameterReading.findMany(),
    preferences: JSON.parse(JSON.stringify(await prisma.operatorRosterPreference.findMany(), (_key, value) => typeof value === 'bigint' ? value.toString() : value)) };
  await writeFile(resolve(folder, 'synthetic-state.json'), JSON.stringify(state, null, 2)); return state;
};
app.post('/fixture/export', async (_req, res) => res.json(await exportState()));
app.use('/api', async (req, res, next) => {
  const record = { method: req.method, path: req.originalUrl, at: new Date().toISOString(),
    ...(req.path.endsWith('/parameter-readings') ? { requestId: req.body.requestId, values: req.body.values } : {}), status: null };
  requests.push(record); res.on('finish', () => { record.status = res.statusCode; });
  if (req.path === '/me/roster-order') {
    if (preferenceMode === 'error') return res.status(503).json({ error: 'Preferenza sintetica indisponibile' });
    if (preferenceMode === 'slow') await new Promise(ok => setTimeout(ok, 8000));
  }
  if (req.method === 'POST' && req.path.endsWith('/parameter-readings')) {
    const selected = fault; fault = null;
    if (selected === 'after-commit') {
      const original = res.json.bind(res);
      res.json = body => res.statusCode < 300 ? original.call(res.status(503), { error: 'Risposta persa dopo il salvataggio sintetico' }) : original(body);
    }
  }
  next();
});
app.get('/api/ai/extraction/status', (_req, res) => res.json({ available: false, provider: 'synthetic', model: '', errors: ['OCR non esercitato da questa fixture'] }));
app.use('/api/patients', patients); app.use('/api/therapy-slots', therapy);
app.use('/api/me', roster.meRosterOrderRouter); app.use('/api/admin', roster.adminRosterOrderRouter);
const vite = await createServer({ root, configFile: false, envFile: false, plugins: [react()], cacheDir: resolve(folder, 'cache'),
  server: { middlewareMode: true, hmr: false, fs: { allow: [root] } }, appType: 'custom' });
app.use(vite.middlewares);
app.get('/', async (_req, res) => res.type('html').send(await vite.transformIndexHtml('/', await readFile(resolve(folder, 'index.html'), 'utf8'))));
const server = app.listen(port, '127.0.0.1', () => console.log(`PO07 synthetic browser http://127.0.0.1:${port}`));
let closing = false;
async function close() {
  if (closing) return; closing = true;
  await exportState(); server.closeAllConnections(); server.close(); await vite.close(); await closeParameterPrisma(prisma); await database.close(); process.exit(0);
}
process.on('SIGINT', close); process.on('SIGTERM', close);
