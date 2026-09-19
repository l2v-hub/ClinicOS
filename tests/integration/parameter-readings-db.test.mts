import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { closeParameterPrisma, fixtureActors, fixturePatientIds, repositoryRoot, seedParameterDatabase, selectLocalParameterDatabase,
  startParameterApi, startParameterDatabase } from '../fixtures/parameter-database.mjs';

let database: Awaited<ReturnType<typeof startParameterDatabase>>;
let api: Awaited<ReturnType<typeof startParameterApi>>;
let prisma: typeof import('../../backend/src/lib/prisma.js').prisma;
let createParameterReading: typeof import('../../backend/src/patients/parameter-readings.js').createParameterReading;
let listParameterReadings: typeof import('../../backend/src/patients/parameter-readings.js').listParameterReadings;
let loadPatientParametersPage: typeof import('../../backend/src/patients/parameters-page.js').loadPatientParametersPage;
let dataDir: string;
const [patientId, secondPatient, outsidePatient] = fixturePatientIds;
const actor = fixtureActors.operator;
const measuredAt = '2026-09-19T09:20:30.123Z';
const body = (at = measuredAt, values = { pa: '120/80', spo2: '98' }) => ({ requestId: randomUUID(), measuredAt: at, values });
const headers = (who = actor) => ({ 'Content-Type': 'application/json', 'X-Operator-Id': who.id, 'X-Operator-Role': who.role });
const statusIs = (status: number) => (error: unknown) => !!error && typeof error === 'object' && 'status' in error && error.status === status;

before(async () => {
  const base = resolve(repositoryRoot, 'artifacts/task-validation/registrazione-rapida-e-storico-parametri-vitali/db-runs');
  await mkdir(base, { recursive: true });
  dataDir = await mkdtemp(resolve(base, 'database-'));
  database = await startParameterDatabase({ dataDir });
  assert.ok(database.applied.includes('20260919110000_patient_parameter_readings'));
  await seedParameterDatabase(database.db);
  selectLocalParameterDatabase(database.url);
  ({ prisma } = await import('../../backend/src/lib/prisma.js'));
  ({ createParameterReading, listParameterReadings } = await import('../../backend/src/patients/parameter-readings.js'));
  ({ loadPatientParametersPage } = await import('../../backend/src/patients/parameters-page.js'));
  api = await startParameterApi({ faults: true });
}, { timeout: 60000 });

after(async () => {
  await api?.close();
  if (prisma) await closeParameterPrisma(prisma);
  await database?.close();
});

test('migration creates timestamped indexed archive; POST/GET enforce auth and private cache', async () => {
  const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string; data_type: string }>>(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'PatientParameterReading'`);
  assert.equal(columns.find(c => c.column_name === 'measuredAt')?.data_type, 'timestamp with time zone');
  const indexes = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(`SELECT indexname FROM pg_indexes WHERE tablename = 'PatientParameterReading'`);
  assert.ok(indexes.some(i => i.indexname === 'PatientParameterReading_patientId_requestId_key'));
  assert.ok(indexes.some(i => i.indexname === 'PatientParameterReading_patientId_measuredAt_id_idx'));
  for (const method of ['GET', 'POST']) {
    const response = await fetch(`${api.url}/api/patients/${patientId}/parameter-readings`, { method });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
});

test('immutable reading persists grouped values, millisecond instant and server author; retry is idempotent', async () => {
  const input = body();
  const first = await createParameterReading(patientId, input, actor);
  assert.equal(first.replayed, false);
  assert.deepEqual(first.summary, { date: '2026-09-19', count: 1, lastReadingAt: measuredAt });
  assert.equal(first.reading.authorName, 'Operatrice QA');
  assert.equal(first.reading.authorOperatorId, actor.id);
  assert.equal(first.reading.measuredAt, measuredAt);
  assert.deepEqual(first.reading.values, input.values);
  assert.ok(Math.abs(Date.now() - Date.parse(first.reading.createdAt)) < 10000, 'createdAt is a real UTC instant');
  const stored = await prisma.$queryRawUnsafe<Array<{ epoch: number }>>('SELECT (extract(epoch from "measuredAt") * 1000)::double precision AS epoch FROM "PatientParameterReading" WHERE "id" = $1', first.reading.id);
  assert.equal(stored[0].epoch, Date.parse(measuredAt), 'stored instant is independent of database session timezone');
  const retry = await createParameterReading(patientId, input, { ...actor, name: 'Spoofed client name' });
  assert.equal(retry.replayed, true);
  assert.deepEqual(retry.reading, first.reading);
  assert.deepEqual(retry.summary, first.summary, 'idempotent replay does not inflate daily count');
  await assert.rejects(createParameterReading(patientId, { ...input, values: { spo2: '97' } }, actor), statusIs(409));
  await assert.rejects(createParameterReading(patientId, { ...input, measuredAt: '2026-09-19T09:20:31.123Z' }, actor), statusIs(409));
  await assert.rejects(createParameterReading(patientId, input, fixtureActors.manager), statusIs(409));
  const next = await createParameterReading(patientId, { ...input, requestId: randomUUID() }, actor);
  assert.notEqual(next.reading.id, first.reading.id);
  assert.equal(next.summary.count, 2);
  const rows = await listParameterReadings(patientId, {}, actor);
  assert.equal(rows.readings.filter(row => row.requestId === input.requestId).length, 1);
});

test('HTTP endpoints return 201/200/400/404/409 and Rome-day authoritative summary', async () => {
  const endpoint = `${api.url}/api/patients/${secondPatient}/parameter-readings`;
  const input = body('2026-09-22T22:15:00.000Z');
  const send = (payload: unknown, target = endpoint, who = actor) => fetch(target, { method: 'POST', headers: headers(who), body: JSON.stringify(payload) });
  const created = await send(input);
  assert.equal(created.status, 201);
  assert.equal(created.headers.get('cache-control'), 'private, no-store');
  const record = await created.json();
  assert.deepEqual(record.summary, { date: '2026-09-23', count: 1, lastReadingAt: input.measuredAt });
  const replay = await send(input);
  assert.equal(replay.status, 200);
  assert.deepEqual((await replay.json()).summary, record.summary);
  assert.equal((await send({ ...input, values: { spo2: '96' } })).status, 409);
  assert.equal((await send({ ...input, authorName: 'Forged' })).status, 400);
  assert.equal((await send({ ...input, values: { note: 'alone' } })).status, 400);
  assert.equal((await send(input, `${api.url}/api/patients/${outsidePatient}/parameter-readings`)).status, 404);
  assert.equal((await fetch(`${endpoint}?limit=10000`, { headers: headers() })).status, 400);
  assert.equal((await fetch(`${api.url}/api/patients/parameters/page?date=2026-02-30`, { headers: headers() })).status, 400);
});

test('out-of-scope access hides existence and author is resolved from the database', async () => {
  await assert.rejects(createParameterReading(outsidePatient, body(), actor), statusIs(404));
  await assert.rejects(listParameterReadings(outsidePatient, {}, actor), statusIs(404));
  await assert.rejects(createParameterReading('absent-patient', body(), fixtureActors.manager), statusIs(404));
  await assert.rejects(createParameterReading(patientId, body(), { id: 'absent-operator', role: 'manager' }), statusIs(403));
  await assert.rejects(createParameterReading('../../patient', body(), actor), statusIs(400));
  const allowed = await createParameterReading(outsidePatient, body(), fixtureActors.manager);
  assert.equal(allowed.reading.authorName, 'Responsabile QA');
  assert.equal((await listParameterReadings(outsidePatient, {}, fixtureActors.outsider)).readings.length, 1);
});

test('concurrent identical requests converge on one row (PGlite multiplexed connections)', async () => {
  const input = body();
  const results = await Promise.all(Array.from({ length: 4 }, () => createParameterReading(patientId, input, actor)));
  assert.equal(new Set(results.map(result => result.reading.id)).size, 1);
  assert.equal(results.filter(result => !result.replayed).length, 1);
  const rows = await listParameterReadings(patientId, {}, actor);
  assert.equal(rows.readings.filter(row => row.requestId === input.requestId).length, 1);
});

test('concurrent conflicting payloads preserve one accepted observation', async () => {
  const input = body('2026-09-21T10:00:00.000Z');
  const results = await Promise.allSettled([
    createParameterReading(patientId, input, actor),
    createParameterReading(patientId, { ...input, values: { pa: '130/85', spo2: '97' } }, actor),
  ]);
  const successful = results.filter(result => result.status === 'fulfilled');
  const failed = results.filter(result => result.status === 'rejected');
  assert.equal(successful.length, 1);
  assert.equal(failed.length, 1);
  assert.equal(failed[0].reason.status, 409);
  assert.equal((await listParameterReadings(patientId, { date: '2026-09-21' }, actor)).readings.length, 1);
});

test('stable keyset handles identical instants and excludes new inserts before the cursor', async () => {
  const instant = '2026-09-20T12:00:00.000Z';
  const expected = [];
  for (let i = 0; i < 7; i++) expected.push((await createParameterReading(secondPatient, body(instant), actor)).reading);
  expected.sort((a, b) => b.id.localeCompare(a.id));
  let page = await listParameterReadings(secondPatient, { date: '2026-09-20', limit: '3' }, actor);
  assert.equal(page.hasMore, true);
  assert.equal(page.readings.length, 3);
  const collected = [...page.readings];
  await createParameterReading(secondPatient, body('2026-09-20T15:00:00.000Z'), actor);
  while (page.nextCursor) {
    page = await listParameterReadings(secondPatient, { date: '2026-09-20', limit: '3', cursor: page.nextCursor }, actor);
    collected.push(...page.readings);
  }
  assert.deepEqual(collected.map(row => row.id), expected.map(row => row.id));
  assert.equal(page.hasMore, false);
  assert.equal(page.nextCursor, null);
});

test('Rome daily history includes exact 23-hour and 25-hour DST boundaries', async () => {
  for (const [date, start, end, hours] of [
    ['2026-03-29', '2026-03-28T23:00:00.000Z', '2026-03-29T22:00:00.000Z', 23],
    ['2026-10-25', '2026-10-24T22:00:00.000Z', '2026-10-25T23:00:00.000Z', 25],
  ] as const) {
    assert.equal((Date.parse(end) - Date.parse(start)) / 3600000, hours);
    const instants = [new Date(Date.parse(start) - 1).toISOString(), start, new Date(Date.parse(end) - 1).toISOString(), end];
    for (const at of instants) await createParameterReading(secondPatient, body(at), actor);
    const history = await listParameterReadings(secondPatient, { date }, actor);
    assert.deepEqual(history.readings.map(row => row.measuredAt), [instants[2], instants[1]]);
    const summary = await loadPatientParametersPage({ q: 'Bruno Beta', date, month: date.slice(5, 7).replace(/^0/, ''), year: '2026' }, actor);
    assert.equal(summary.items[0].cartella.readingCount, 2);
    assert.equal(summary.items[0].cartella.lastReadingAt, instants[2]);
  }
});

test('daily page stays scoped/bounded and reports counts/latest instant without full archive', async () => {
  const history = await listParameterReadings(patientId, { date: '2026-09-19' }, actor);
  const page = await loadPatientParametersPage({ date: '2026-09-19', month: '9', year: '2026', limit: '100' }, actor);
  assert.equal(page.items.length, 2);
  assert.ok(page.items.every(item => item.patient.id !== outsidePatient));
  const cartella = page.items.find(item => item.patient.id === patientId)!.cartella;
  assert.equal(cartella.readingCount, history.readings.length);
  assert.equal(cartella.lastReadingAt, measuredAt);
  assert.equal('readings' in cartella, false);
  assert.equal('values' in cartella, false);
  assert.equal('allergie' in cartella, false);
  assert.equal(cartella.parametriMensili.length, 1);
  await assert.rejects(loadPatientParametersPage({ date: '2026-02-30' }, actor));
});

test('lost response can replay via real HTTP; whole-cartella PUT cannot erase the archive', async () => {
  const input = body();
  const endpoint = `${api.url}/api/patients/${patientId}/parameter-readings`;
  await fetch(`${api.url}/__fixture/fault`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'after-commit' }) });
  const lost = await fetch(endpoint, { method: 'POST', headers: headers(), body: JSON.stringify(input) });
  assert.equal(lost.status, 503);
  const replay = await fetch(endpoint, { method: 'POST', headers: headers(), body: JSON.stringify(input) });
  assert.equal(replay.status, 200);
  const saved = await replay.json();
  assert.equal(saved.replayed, true);
  const daily = await listParameterReadings(patientId, { date: '2026-09-19' }, actor);
  assert.equal(saved.summary.count, daily.readings.length, 'lost-response replay returns authoritative count');
  const before = await (await fetch(endpoint, { headers: headers() })).json();
  const stale = await fetch(`${api.url}/api/patients/${patientId}/cartella`, { method: 'PUT', headers: headers(), body: JSON.stringify({ data: { parametriVitali: [], parametriMensili: [] } }) });
  assert.equal(stale.status, 200);
  const after = await (await fetch(endpoint, { headers: headers() })).json();
  assert.deepEqual(after, before);
  assert.ok(after.readings.some((row: { id: string }) => row.id === saved.reading.id));
});

test('parameter page caps real result sets at 25 and continues without duplicates', async () => {
  await prisma.patient.createMany({ data: Array.from({ length: 27 }, (_, index) => ({
    id: `vitals-qa-bound-${index}`, medicalRecordNumber: `SYNTHETIC-BOUND-${index}`,
    firstName: `Paziente ${String(index).padStart(2, '0')}`, lastName: 'BoundCase',
    dateOfBirth: new Date('1950-01-01T00:00:00.000Z'), registeredById: actor.id,
  })) });
  const filters = { q: 'BoundCase', date: '2026-09-19', month: '9', year: '2026', limit: '100' };
  const first = await loadPatientParametersPage(filters, actor);
  assert.equal(first.items.length, 25);
  assert.equal(first.hasMore, true);
  assert.ok(first.nextCursor);
  const second = await loadPatientParametersPage({ ...filters, cursor: first.nextCursor }, actor);
  assert.equal(second.items.length, 2);
  assert.equal(second.hasMore, false);
  assert.equal(new Set([...first.items, ...second.items].map(item => item.patient.id)).size, 27);
  assert.ok([...first.items, ...second.items].every(item => item.cartella.readingCount === 0 && item.cartella.lastReadingAt === null));
});

test('archive survives database shutdown and disk reopen, then reload through production API', async () => {
  const endpoint = `${api.url}/api/patients/${patientId}/parameter-readings`;
  const before = await (await fetch(endpoint, { headers: headers() })).json();
  const oldPort = Number(new URL(database.url).port);
  await closeParameterPrisma(prisma);
  await database.close();
  database = await startParameterDatabase({ port: oldPort, dataDir });
  assert.equal(database.applied.length, 0);
  const response = await fetch(endpoint, { headers: headers() });
  assert.equal(response.status, 200);
  const reloaded = await response.json();
  assert.deepEqual(reloaded, before);
  assert.ok(reloaded.readings.length >= 4);
});
