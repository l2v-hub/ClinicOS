import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { resolve } from 'node:path';
import express from 'express';
import { startPo05Postgres } from '../fixtures/po05-postgres.mjs';
import {
  fixtureActors,
  selectLocalParameterDatabase,
  closeParameterPrisma,
} from '../fixtures/parameter-database.mjs';
import { seedPo06Identity } from '../fixtures/po06-identity.mjs';

let database: Awaited<ReturnType<typeof startPo05Postgres>>,
  prisma: any,
  server: any,
  base: string,
  today: string;
const headers = {
  'X-Operator-Id': fixtureActors.operator.id,
  'X-Operator-Role': 'operatore',
  'Content-Type': 'application/json',
};
async function get(path: string, actorHeaders = headers) {
  const response = await fetch(`${base}${path}`, { headers: actorHeaders });
  assert.equal(response.status, 200, `${path}: ${response.status}`);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  return response.json();
}
before(async () => {
  database = await startPo05Postgres({
    artifactRoot: resolve('artifacts/task-validation/po-06-identita-posto-letto/scratch'),
  });
  selectLocalParameterDatabase(database.url);
  ({ prisma } = await import('../../backend/src/lib/prisma.js'));
  const { facilityToday } = await import('../../backend/src/patients/parameter-reading-input.js');
  today = facilityToday();
  await seedPo06Identity(prisma, database.db, today);
  const [{ default: patients }, { default: therapy }, { default: handovers }] = await Promise.all([
    import('../../backend/src/routes/patients.js'),
    import('../../backend/src/routes/therapy.js'),
    import('../../backend/src/routes/consegne.js'),
  ]);
  const app = express();
  app.use(express.json());
  app.use('/patients', patients);
  app.use('/therapy-slots', therapy);
  app.use('/consegne', handovers);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((ok) => server.once('listening', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server?.closeAllConnections();
  if (server) await new Promise((ok) => server.close(ok));
  if (prisma) await closeParameterPrisma(prisma);
  await database?.close();
});

test('four operational HTTP readers preserve the same authoritative identity and location', async () => {
  const [patients, parameters, therapies, handovers] = await Promise.all([
    get('/patients/page?limit=50'),
    get(`/patients/parameters/page?limit=25&view=entry&date=${today}`),
    get(`/therapy-slots/page?limit=100&date=${today}`),
    get('/consegne?limit=20'),
  ]);
  const patient = patients.items.find((p: any) => p.id === 'po06-alba-1');
  const parameter = parameters.items.find((p: any) => p.patient.id === patient.id);
  const therapy = therapies.slots
    .find((s: any) => s.fascia === 'mattina')
    .patients.find((p: any) => p.patientId === patient.id);
  const handover = handovers.items.find((h: any) => h.pazienteId === patient.id).identity;
  assert.deepEqual(patient.location, {
    status: 'assigned',
    source: 'assignment',
    room: '12',
    bed: 'A',
    asOf: today,
  });
  for (const row of [parameter.patient, therapy, handover]) {
    assert.equal(row.codiceFiscale, patient.codiceFiscale);
    assert.equal(row.dateOfBirth.slice(0, 10), patient.dateOfBirth.slice(0, 10));
    assert.deepEqual(row.location, patient.location);
  }
  assert.equal(parameter.cartella.cameraNumero, '12');
  assert.equal(therapy.room, '12');
});
test('assigned handover does not grant chart identity or direct patient access', async () => {
  const handovers = await get('/consegne?limit=20');
  const row = handovers.items.find((h: any) => h.id === 'po06-restricted');
  assert.equal(row.pazienteNome, 'Nome già visibile');
  assert.equal(row.identity, null);
  assert.equal((await fetch(`${base}/patients/vitals-qa-other`, { headers })).status, 404);
  const patients = await get('/patients/page?limit=50');
  assert.ok(!patients.items.some((p: any) => p.id === 'vitals-qa-other'));
});
test('ended and inconsistent assignments cannot resurface stale legacy location', async () => {
  const page = await get('/patients/page?limit=50');
  for (const [id, status] of [
    ['po06-ended', 'unassigned'],
    ['po06-conflict', 'unavailable'],
  ]) {
    const row = page.items.find((p: any) => p.id === id);
    assert.equal(row.location.status, status);
    assert.equal(row.location.room, null);
    assert.equal(row.location.bed, null);
  }
  assert.deepEqual(page.items.find((p: any) => p.id === 'po06-long').location, {
    status: 'assigned',
    source: 'cartella',
    room: '99',
    bed: 'Z',
    asOf: today,
  });
  assert.equal(page.items.find((p: any) => p.id === 'po06-empty').location.status, 'unassigned');
});
test('historical parameter request does not imply legacy position existed then', async () => {
  const historical = await get('/patients/parameters/page?limit=25&view=entry&date=2020-01-01');
  const legacy = historical.items.find((p: any) => p.patient.id === 'po06-long');
  assert.equal(legacy.patient.location.status, 'unavailable');
  assert.equal(legacy.patient.location.asOf, '2020-01-01');
  const ended = historical.items.find((p: any) => p.patient.id === 'po06-ended');
  assert.equal(ended.patient.location.room, '12');
  assert.equal(ended.patient.location.bed, 'A');
});
test('room search returns authoritative room and excludes superseded legacy value', async () => {
  const current = await get(`/patients/parameters/page?limit=25&view=entry&date=${today}&q=12`);
  assert.ok(current.items.some((p: any) => p.patient.id === 'po06-alba-1'));
  const stale = await get(`/patients/parameters/page?limit=25&view=entry&date=${today}&q=99`);
  assert.ok(!stale.items.some((p: any) => p.patient.id === 'po06-alba-1'));
  assert.ok(stale.items.some((p: any) => p.patient.id === 'po06-long'));
});
test('homonyms retain distinct patient identifiers and missing demographic values', async () => {
  const response = await fetch(`${base}/patients/page/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ q: 'Bianchi', limit: '25' }),
  });
  assert.equal(response.status, 200);
  const page = await response.json();
  assert.equal(page.items.length, 2);
  assert.notEqual(page.items[0].id, page.items[1].id);
  assert.equal(page.items.find((p: any) => p.id === 'po06-alba-2').codiceFiscale, null);
  assert.notEqual(page.items[0].location.room, page.items[1].location.room);
});
test('operator plus explicit IDs intersects therapy details and exact totals', async () => {
  await prisma.patientTherapy.create({
    data: {
      id: 'po06-foreign-therapy',
      patientId: 'vitals-qa-other',
      farmacoNome: 'Farmaco fuori perimetro',
      dosaggio: '1',
      dataInizio: today,
      fasceMattina: true,
    },
  });
  const { buildTherapySlotPage } = await import('../../backend/src/therapies/therapy-slots.js');
  const page = await buildTherapySlotPage(
    today,
    { patientIds: ['po06-alba-1', 'vitals-qa-other'], registeredById: fixtureActors.operator.id },
    { limit: 100 },
  );
  const morning = page.slots.find((s: any) => s.fascia === 'mattina');
  assert.equal(morning?.summary.total, 8);
  assert.deepEqual(
    morning?.patients.map((p: any) => p.patientId),
    ['po06-alba-1'],
  );
});
