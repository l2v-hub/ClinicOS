import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { writeFileSync, mkdirSync } from 'node:fs';
import express from 'express';
import { startPo05Postgres } from '../../../tests/fixtures/po05-postgres.mjs';

const out = resolve(process.env.QA406_OUTPUT || 'artifacts/task-validation/406-therapy-route-regime/root');
mkdirSync(out, { recursive: true });
const pg = await startPo05Postgres({ artifactRoot: resolve(tmpdir(), 'clinicos-bug406-synthetic'), repositoryRoot: process.cwd() });
process.env.DATABASE_URL = pg.url;
process.env.NODE_ENV = 'test';
process.env.AUTH_MODE = 'demo';
process.env.RESIDENT_SCOPE_CONFIG = JSON.stringify({ fallback: 'registered_by_me' });
let prisma, server;
const results = [];
const check = async (name, fn) => { await fn(); results.push({ name, pass: true }); console.log(`PASS ${name}`); };
try {
  ({ prisma } = await import('../../../backend/src/lib/prisma.ts'));
  const { default: router } = await import('../../../backend/src/routes/patient-therapies.ts');
  const app = express(); app.use(express.json()); app.use('/patients', router);
  server = await new Promise(ok => { const s = app.listen(0, '127.0.0.1', () => ok(s)); });
  const base = `http://127.0.0.1:${server.address().port}/patients`;
  const user = await prisma.user.create({ data: { email: 'bug406@example.test', passwordHash: 'synthetic-only', fullName: 'Medico Sintetico', operator: { create: { ruolo: 'medico' } } }, include: { operator: true } });
  const patient = await prisma.patient.create({ data: { medicalRecordNumber: 'BUG406-SYNTHETIC', firstName: 'Persona', lastName: 'Sintetica', dateOfBirth: new Date('1970-01-01'), registeredById: user.operator.id } });
  const headers = { 'Content-Type': 'application/json', 'X-Operator-Id': user.operator.id, 'X-Operator-Role': 'operatore' };
  const endpoint = `${base}/${patient.id}/therapies`;
  const request = (body, method = 'POST', url = endpoint, auth = headers) => fetch(url, { method, headers: auth, body: JSON.stringify(body) });
  const readRows = () => prisma.patientTherapy.findMany({ where: { patientId: patient.id }, include: { schedules: true }, orderBy: { id: 'asc' } });
  await check('real PostgreSQL: every regimen route/type rejected and zero rows created', async () => {
    for (const viaSomministrazione of ['al bisogno', 'AL_BISOGNO', 'PRN', 'p.r.n.', 'periodica', 'una tantum']) for (const tipo of ['periodica', 'al_bisogno', 'una_tantum']) {
      const response = await request({ farmacoNome: 'Farmaco sintetico', dataInizio: '2026-10-09', viaSomministrazione, tipo });
      assert.equal(response.status, 400, await response.text());
    }
    assert.equal((await readRows()).length, 0);
  });
  const legacy = await prisma.patientTherapy.create({ data: { patientId: patient.id, farmacoNome: 'Legacy sintetico', dosaggio: 'Schema originale', viaSomministrazione: 'al bisogno', tipo: 'periodica', dataInizio: '2026-10-09', doseMode: 'glucose_scale', doseProtocol: { untouched: 'legacy' } } });
  const legacyUrl = `${endpoint}/${legacy.id}`;
  await check('real PostgreSQL: partial edits/reactivation rejected and original persisted state unchanged', async () => {
    const before = await readRows();
    for (const body of [{}, { note: 'nota' }, { schedules: [] }, { tipo: 'al_bisogno' }, { viaSomministrazione: 'SC' }, { stato: 'attiva' }, { stato: 'sospesa', note: '' }, { viaSomministrazione: 'PRN', tipo: 'periodica' }]) {
      const response = await request(body, 'PUT', legacyUrl);
      assert.equal(response.status, 400, await response.text());
    }
    assert.deepEqual(await readRows(), before);
  });
  await check('real PostgreSQL: suspension/conclusion change ONLY status, not route/type/dose/protocol', async () => {
    for (const stato of ['sospesa', 'conclusa']) {
      const before = await prisma.patientTherapy.findUniqueOrThrow({ where: { id: legacy.id } });
      const response = await request({ stato }, 'PUT', legacyUrl);
      assert.equal(response.status, 200, await response.text());
      const after = await prisma.patientTherapy.findUniqueOrThrow({ where: { id: legacy.id } });
      assert.deepEqual({ ...after, updatedAt: before.updatedAt }, { ...before, stato });
    }
  });
  await check('real PostgreSQL: explicit clinician repair of fixed-dose legacy record persists actual route and PRN', async () => {
    const fixed = await prisma.patientTherapy.create({ data: { patientId: patient.id, farmacoNome: 'Legacy fisso sintetico', dosaggio: 'Originale', viaSomministrazione: 'PRN', tipo: 'periodica', dataInizio: '2026-10-09' } });
    const response = await request({ viaSomministrazione: 'SC', tipo: 'al_bisogno', schedules: [] }, 'PUT', `${endpoint}/${fixed.id}`);
    assert.equal(response.status, 200, await response.text());
    const row = await prisma.patientTherapy.findUniqueOrThrow({ where: { id: fixed.id }, include: { schedules: true } });
    assert.equal(row.viaSomministrazione, 'SC'); assert.equal(row.tipo, 'al_bisogno'); assert.deepEqual(row.schedules, []);
  });
  await check('real PostgreSQL: actual route aliases survive all valid therapy types and reload', async () => {
    for (const viaSomministrazione of ['orale', 'SC', 'EV', 'INAL', 'per os']) for (const tipo of ['periodica', 'al_bisogno', 'una_tantum']) {
      const response = await request({ farmacoNome: 'Nuovo sintetico', dataInizio: '2026-10-09', viaSomministrazione, tipo, schedules: tipo === 'periodica' ? [{ time: '08:00', quantityNumerator: 1, quantityDenominator: 1, administrationUnit: 'compressa' }] : [] });
      assert.equal(response.status, 201, await response.clone().text());
      const saved = await response.json();
      const row = await prisma.patientTherapy.findUniqueOrThrow({ where: { id: saved.id }, include: { schedules: true } });
      assert.equal(row.viaSomministrazione, viaSomministrazione); assert.equal(row.tipo, tipo);
      if (tipo === 'al_bisogno') assert.deepEqual(row.schedules, []);
    }
  });
  await check('real PostgreSQL: unauthorized/out-of-scope attempts preserve database', async () => {
    const before = await readRows();
    assert.equal((await request({ stato: 'sospesa' }, 'PUT', legacyUrl, { 'Content-Type': 'application/json' })).status, 401);
    assert.equal((await request({ stato: 'sospesa' }, 'PUT', legacyUrl, { ...headers, 'X-Operator-Role': 'ospite' })).status, 403);
    const other = await prisma.patient.create({ data: { medicalRecordNumber: 'BUG406-OUTSIDE', firstName: 'Altro', lastName: 'Sintetico', dateOfBirth: new Date('1970-01-01') } });
    assert.equal((await request({ stato: 'sospesa' }, 'PUT', `${base}/${other.id}/therapies/${legacy.id}`)).status, 404);
    assert.deepEqual(await readRows(), before);
  });
  const version = (await pg.db.query('select version()')).rows[0].version;
  writeFileSync(resolve(out, 'db-results.json'), JSON.stringify({ kind: 'real isolated PostgreSQL; no inherited database URL', version, migrationCount: pg.applied.length, migrations: pg.applied, results, total: results.length, pass: results.length }, null, 2));
} finally {
  if (server) { server.closeAllConnections(); await new Promise(ok => server.close(ok)); }
  if (prisma) await prisma.$disconnect();
  // lib/prisma owns an external pg.Pool: let its default 10s idle timeout drain first.
  await new Promise(ok => setTimeout(ok, 11000));
  await pg.close();
}
