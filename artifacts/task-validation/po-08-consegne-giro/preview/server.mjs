import express from 'express';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startPo05Postgres } from '../../../../tests/fixtures/po05-postgres.mjs';
import { fixtureActors, selectLocalParameterDatabase, closeParameterPrisma } from '../../../../tests/fixtures/parameter-database.mjs';
import { seedPo08Consegne } from '../../../../tests/fixtures/po08-consegne.mjs';

const root = process.cwd(), port = 4189;
const folder = resolve(root, 'artifacts/task-validation/po-08-consegne-giro/preview');
const database = await startPo05Postgres({ repositoryRoot: root, artifactRoot: resolve(folder, '../scratch') });
selectLocalParameterDatabase(database.url);
process.env.VITE_API_URL = `http://127.0.0.1:${port}/api`;
const { prisma } = await import('../../../../backend/src/lib/prisma.js');
const { facilityToday } = await import('../../../../backend/src/patients/parameter-reading-input.js');
const today = facilityToday();
await seedPo08Consegne(prisma, database.db, today);
const [{ default: patients }, { default: consegne }, roster] = await Promise.all([
  import('../../../../backend/src/routes/patients.js'), import('../../../../backend/src/routes/consegne.js'),
  import('../../../../backend/src/routes/roster-order.js'),
]);
const app = express(), requests = [], events = [];
let fault = null;
app.use(express.json());
app.get('/fixture/info', (_req, res) => res.json({ actors: fixtureActors, today }));
app.post('/fixture/event', (req, res) => { events.push(req.body); res.json({ ok: true }); });
app.post('/fixture/fault', (req, res) => { fault = req.body.mode; res.json({ fault }); });
app.post('/fixture/change-roster', async (_req, res) => {
  await prisma.cartella.update({ where: { patientId: 'po07-patient-001' },
    data: { data: { cameraNumero: '20', lettoNumero: 'D' } } });
  res.json({ ok: true });
});
const exportState = async () => {
  const state = { today, requests, events, consegne: await prisma.consegna.findMany(),
    receiptCount: prisma.consegnaCreationReceipt ? await prisma.consegnaCreationReceipt.count() : null };
  await writeFile(resolve(folder, 'synthetic-state.json'), JSON.stringify(state, null, 2)); return state;
};
app.post('/fixture/export', async (_req, res) => res.json(await exportState()));
app.use('/api', async (req, res, next) => {
  const record = { method: req.method, path: req.originalUrl, at: new Date().toISOString(),
    ...(req.method === 'POST' && req.path === '/consegne' ? { body: req.body } : {}), status: null };
  requests.push(record); res.on('finish', () => { record.status = res.statusCode; });
  if (req.method === 'POST' && req.path === '/consegne') {
    const selected = fault; fault = null;
    if (selected === 'delay') await new Promise(ok => setTimeout(ok, 6000));
    if (selected === 'before-commit') return res.status(503).json({ error: 'Errore sintetico prima del salvataggio' });
    if (selected === 'after-commit') {
      const original = res.json.bind(res);
      res.json = body => res.statusCode < 300 ? original.call(res.status(503), { error: 'Risposta persa dopo salvataggio sintetico' }) : original(body);
    }
  }
  if (req.path === '/consegne/patient-summary' && fault === 'summary') {
    fault = null; return res.status(503).json({ error: 'Riepilogo sintetico indisponibile' });
  }
  next();
});
app.use('/api/patients', patients); app.use('/api/consegne', consegne);
app.use('/api/me', roster.meRosterOrderRouter); app.use('/api/admin', roster.adminRosterOrderRouter);
const vite = await createServer({ root, configFile: false, envFile: false, plugins: [react()], cacheDir: resolve(folder, 'cache'),
  server: { middlewareMode: true, hmr: false, fs: { allow: [root] } }, appType: 'custom' });
app.use(vite.middlewares);
app.get('/', async (_req, res) => res.type('html').send(await vite.transformIndexHtml('/', await readFile(resolve(folder, 'index.html'), 'utf8'))));
const server = app.listen(port, '127.0.0.1', () => console.log(`PO08 synthetic browser http://127.0.0.1:${port}`));
let closing = false;
async function close() {
  if (closing) return; closing = true;
  await exportState(); server.closeAllConnections(); server.close(); await vite.close();
  await closeParameterPrisma(prisma); await database.close(); process.exit(0);
}
// HTTP fixture shutdown permits deterministic cleanup on Windows without killing a shell tree.
app.post('/fixture/close', (_req, res) => { res.json({ closing: true }); void close(); });
process.on('SIGINT', close); process.on('SIGTERM', close);
