import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { resolve } from 'node:path';
import express from 'express';
import { startPo05Postgres } from '../fixtures/po05-postgres.mjs';
import { fixtureActors, selectLocalParameterDatabase, closeParameterPrisma } from '../fixtures/parameter-database.mjs';
import { seedPo08Consegne } from '../fixtures/po08-consegne.mjs';

let database: any, prisma: any, server: any, base: string, today: string;
const actorHeaders = (actor = fixtureActors.operator) => ({
  'X-Operator-Id': actor.id, 'X-Operator-Role': actor.role, 'Content-Type': 'application/json',
});
async function request(path: string, body?: unknown, actor = fixtureActors.operator, method = body === undefined ? 'GET' : 'POST') {
  const response = await fetch(`${base}${path}`, { method, headers: actorHeaders(actor),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  assert.equal(response.headers.get('cache-control'), 'private, no-store', path);
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}
const payload = (key: string, patientId = 'po07-patient-010') => ({
  requestId: `po08-root-${key}`, pazienteId: patientId, priorita: 'normale', tipo: 'Monitoraggio',
  note: `Nota sintetica ${key}`, scadenza: today, operatoreAssegnatoId: fixtureActors.outsider.id,
});
before(async () => {
  database = await startPo05Postgres({ artifactRoot: resolve('artifacts/task-validation/po-08-consegne-giro/scratch') });
  selectLocalParameterDatabase(database.url);
  ({ prisma } = await import('../../backend/src/lib/prisma.js'));
  today = (await import('../../backend/src/patients/parameter-reading-input.js')).facilityToday();
  await seedPo08Consegne(prisma, database.db, today);
  const [{ default: patients }, { default: consegne }, roster] = await Promise.all([
    import('../../backend/src/routes/patients.js'), import('../../backend/src/routes/consegne.js'),
    import('../../backend/src/routes/roster-order.js'),
  ]);
  const app = express(); app.use(express.json());
  app.use('/patients', patients); app.use('/consegne', consegne); app.use('/me', roster.meRosterOrderRouter);
  server = app.listen(0, '127.0.0.1'); await new Promise<void>(ok => server.once('listening', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server?.closeAllConnections(); if (server) await new Promise(ok => server.close(ok));
  if (prisma) await closeParameterPrisma(prisma); await database?.close();
});

test('summary distinguishes zero, history, visible urgent and unavailable patient without leaking a hidden handover', async () => {
  const patientIds = ['po07-patient-000', 'po07-patient-001', 'po07-patient-002', 'vitals-qa-other'];
  const result = await request('/consegne/patient-summary', { patientIds });
  assert.equal(result.status, 200, JSON.stringify(result));
  const byId = new Map<string, any>(result.body.items.map((row: any) => [row.patientId, row]));
  assert.equal(byId.size, 3); assert.ok(!byId.has('vitals-qa-other'));
  assert.deepEqual([byId.get(patientIds[0]).total, byId.get(patientIds[0]).open, byId.get(patientIds[0]).urgentOpen], [2, 2, 1]);
  assert.deepEqual([byId.get(patientIds[1]).total, byId.get(patientIds[1]).open], [1, 0]);
  assert.deepEqual([byId.get(patientIds[2]).total, byId.get(patientIds[2]).open, byId.get(patientIds[2]).statoRicovero], [0, 0, 'dimesso']);
  const manager = await request('/consegne/patient-summary', { patientIds }, fixtureActors.manager);
  assert.equal(manager.body.items.find((row: any) => row.patientId === patientIds[0]).total, 3);
  assert.equal((await request('/consegne/patient-summary', { patientIds: Array.from({length: 51}, (_, i) => `over-${i}`) })).status, 400);
});

test('camera filter selects the whole authorized roster before keyset paging and fences a different filter', async () => {
  const output: any[] = []; let cursor: string | undefined;
  do {
    const params = new URLSearchParams({ limit: '3', sort: 'location', direction: 'desc', room: '1A', ...(cursor ? {cursor} : {}) });
    const response = await request(`/patients/page?${params}`);
    assert.equal(response.status, 200, JSON.stringify(response));
    output.push(...response.body.items); cursor = response.body.nextCursor || undefined;
    if (cursor && output.length === 3) {
      assert.equal((await request(`/patients/page?${new URLSearchParams({limit:'3',sort:'location',direction:'desc',room:'2A',cursor})}`)).status, 409);
    }
  } while (cursor);
  assert.ok(output.length > 3); assert.equal(new Set(output.map(row => row.id)).size, output.length);
  assert.ok(output.every(row => row.location.room?.toLowerCase().includes('1a')));
  const unfiltered = await request('/patients/page?limit=100');
  assert.deepEqual(new Set(output.map(row => row.id)), new Set(unfiltered.body.items.filter((row: any) => row.location.room?.toLowerCase().includes('1a')).map((row:any) => row.id)));
  const escaped = await request('/patients/page?room=%25');
  assert.equal(escaped.status, 200); assert.equal(escaped.body.items.length, 0);
  const searched = await request('/patients/page/search', {q:'Bianchi',room:'1A',limit:'100'});
  assert.equal(searched.status, 200); assert.ok(searched.body.items.every((row:any) => row.lastName === 'Bianchi' && row.location.room === '1A'));
});

test('concurrent submissions, changed body, retry after edit and delete retain one authoritative creation', async () => {
  const body = payload('concurrent');
  const responses = await Promise.all(Array.from({length: 4}, () => request('/consegne', body)));
  for (const response of responses) assert.ok([200,201].includes(response.status), JSON.stringify(response));
  assert.equal(new Set(responses.map(response => response.body.id)).size, 1);
  const id = responses[0].body.id;
  assert.equal(await prisma.consegna.count({where:{id}}), 1);
  assert.equal((await request('/consegne', {...body,note:'Nota differente'})).status, 409);
  assert.equal((await request(`/consegne/${id}`, {note:'Correzione successiva',stato:'completata'}, fixtureActors.operator, 'PUT')).status, 200);
  const replay = await request('/consegne', body);
  assert.equal(replay.body.id, id); assert.equal(replay.body.replayed, true); assert.equal(replay.body.note, 'Correzione successiva');
  assert.equal(replay.body.stato, 'completata');
  assert.equal((await request(`/consegne/${id}`, undefined, fixtureActors.operator, 'DELETE')).status, 204);
  const tombstone = await request('/consegne', body);
  assert.equal(tombstone.status, 410); assert.equal(tombstone.body.code, 'consegna_creation_deleted');
  assert.equal(tombstone.body.consegnaId, id); assert.equal(await prisma.consegna.count({where:{id}}), 0);
});

test('five patient round saves to stable IDs, remains open and updates the visible summaries', async () => {
  const roster = await request('/patients/page?sort=name&direction=asc&limit=5');
  assert.equal(roster.status, 200);
  const ids: string[] = roster.body.items.map((row:any) => row.id);
  for (const [index, id] of ids.entries()) {
    const body = payload(`round-${index}`, id);
    const saved = await request('/consegne', body); assert.equal(saved.status, 201, JSON.stringify(saved));
    assert.equal(saved.body.pazienteId, id); assert.equal(saved.body.requestId, body.requestId); assert.equal(saved.body.stato, 'aperta');
    const retried = await request('/consegne', body); assert.equal(retried.body.id, saved.body.id);
    assert.equal(await prisma.consegna.count({where:{id:saved.body.id}}), 1);
  }
  const summaries = await request('/consegne/patient-summary', {patientIds:ids});
  assert.equal(summaries.body.items.length, 5); assert.ok(summaries.body.items.every((row:any) => row.open > 0));
});

test('replay checks patient scope even when the operator can still see the assigned handover in the feed', async () => {
  const body = payload('scope', 'po07-patient-040');
  const saved = await request('/consegne', body); assert.equal(saved.status, 201);
  await prisma.patient.update({where:{id:body.pazienteId},data:{registeredById:fixtureActors.outsider.id}});
  assert.equal((await request('/consegne', body)).status, 404);
  const summary = await request('/consegne/patient-summary', {patientIds:[body.pazienteId]});
  assert.equal(summary.body.items.length, 0);
  const feed = await request(`/consegne?patientId=${body.pazienteId}`);
  assert.equal(feed.status, 200); assert.ok(feed.body.items.some((row:any) => row.id === saved.body.id));
  assert.equal(await prisma.consegna.count({where:{id:saved.body.id}}), 1);
});
