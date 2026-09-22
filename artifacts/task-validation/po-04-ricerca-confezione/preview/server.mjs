import express from 'express';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fixtureActors, fixturePatientIds, seedParameterDatabase, selectLocalParameterDatabase, startParameterDatabase } from '../../../../tests/fixtures/parameter-database.mjs';
import { seedDrugCatalog } from '../../../../tests/fixtures/drug-catalog.mjs';

const port = 4185;
const root = process.cwd();
const folder = 'artifacts/task-validation/po-04-ricerca-confezione/preview';
const database = await startParameterDatabase();
await seedParameterDatabase(database.db);
selectLocalParameterDatabase(database.url);
process.env.VITE_API_URL = `http://127.0.0.1:${port}/api`;
const { prisma } = await import('../../../../backend/src/lib/prisma.js');
await seedDrugCatalog(prisma);
const [{ default: patients }, { default: medications }, { default: therapy }, { default: patientTherapies }] = await Promise.all([
  import('../../../../backend/src/routes/patients.js'),
  import('../../../../backend/src/routes/farmaci.js'),
  import('../../../../backend/src/routes/therapy.js'),
  import('../../../../backend/src/routes/patient-therapies.js'),
]);
const actor = fixtureActors.operator;
const patientId = fixturePatientIds[0];
const requests = [];
let failed = false;
const app = express();
app.use(express.json());
app.get('/fixture/info', async (_req, res) => res.json({ actor, patient: { id: patientId, nome: 'Anna', cognome: 'Alfa', codiceFiscale: '', stanza: '11', letto: 'A', stato: 'ricoverato' } }));
app.post('/fixture/failure', (req, res) => { failed = req.body.enabled === true; res.json({ failed }); });
app.get('/fixture/state', async (_req, res) => res.json({ therapies: await prisma.patientTherapy.findMany({ where: { patientId }, include: { schedules: true } }), requests }));
app.use('/api/farmaci', (req, res, next) => {
  if (req.path === '/cerca') {
    requests.push({ path: req.originalUrl, time: Date.now(), failure: failed });
    if (failed) { res.status(503).json({ error: 'Errore sintetico servizio catalogo' }); return; }
  }
  next();
});
app.use('/api/farmaci', medications);
app.use('/api/patients', patients);
app.use('/api/patients', patientTherapies);
app.use('/api/therapy-slots', therapy);
const vite = await createServer({ root, configFile: false, envFile: false, plugins: [react()], cacheDir: resolve(root, folder, 'cache'), server: { middlewareMode: true, hmr: false, fs: { allow: [root] } }, appType: 'custom' });
app.use(vite.middlewares);
app.get('/', async (_req, res) => res.type('html').send(await vite.transformIndexHtml('/', await readFile(resolve(root, folder, 'index.html'), 'utf8'))));
const server = app.listen(port, '127.0.0.1', () => console.log(`Synthetic medication preview http://127.0.0.1:${port}`));
process.on('SIGINT', async () => { server.closeAllConnections(); server.close(); await vite.close(); await prisma.$disconnect(); await database.close(); process.exit(0); });
