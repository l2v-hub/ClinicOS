import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import {
  closeParameterPrisma,
  fixtureActors,
  fixturePatientIds,
  seedParameterDatabase,
  selectLocalParameterDatabase,
  startParameterApi,
  startParameterDatabase,
} from '../fixtures/parameter-database.mjs';

let database: Awaited<ReturnType<typeof startParameterDatabase>>;
let api: Awaited<ReturnType<typeof startParameterApi>>;
let prisma: typeof import('../../backend/src/lib/prisma.js').prisma;
let loadPatientDiary: typeof import('../../backend/src/patients/diary-read-service.js').loadPatientDiary;
let createParameterReading: typeof import('../../backend/src/patients/parameter-readings.js').createParameterReading;
let createConsegna: typeof import('../../backend/src/services/consegna-service.js').createConsegna;
let diaryServer: import('node:http').Server;
let diaryUrl: string;
const actor = fixtureActors.operator;
const [patientId, secondPatient, outsidePatient] = fixturePatientIds;
const headers = { 'X-Operator-Id': actor.id, 'X-Operator-Role': actor.role };

before(
  async () => {
    database = await startParameterDatabase();
    await seedParameterDatabase(database.db);
    selectLocalParameterDatabase(database.url);
    ({ prisma } = await import('../../backend/src/lib/prisma.js'));
    ({ loadPatientDiary } = await import('../../backend/src/patients/diary-read-service.js'));
    ({ createParameterReading } = await import('../../backend/src/patients/parameter-readings.js'));
    ({ createConsegna } = await import('../../backend/src/services/consegna-service.js'));
    await prisma.operator.update({ where: { id: actor.id }, data: { ruolo: 'Infermiere' } });
    await prisma.patientDiaryEntry.createMany({
      data: Array.from({ length: 3 }, (_, i) => ({
        id: `native-${i}`,
        patientId,
        authorType: 'infermiere',
        authorName: 'Operatrice QA',
        content: `Diario sintetico ${i}`,
        entryDateTime: '2026-09-20T10:15',
      })),
    });
    await prisma.consegna.createMany({
      data: Array.from({ length: 5 }, (_, i) => ({
        id: `handover-${i}`,
        pazienteId: patientId,
        pazienteNome: 'Anna Alfa',
        creatoDaId: actor.id,
        creatoDA: 'Nome precedente',
        operatoreAssegnatoId: actor.id,
        operatoreAssegnato: 'Operatrice QA',
        note: `Testo consegna ${i}`,
        tipo: 'Monitoraggio',
        priorita: 'alta',
        scadenza: '2026-09-21',
        createdAt: new Date('2026-09-20T08:15:00.000Z'),
      })),
    });
    await prisma.consegna.createMany({
      data: [
        {
          id: 'invisible-handover',
          pazienteId: patientId,
          pazienteNome: 'Anna Alfa',
          creatoDaId: fixtureActors.outsider.id,
          creatoDA: 'Operatore esterno',
          operatoreAssegnato: '',
          note: 'Non autorizzato',
          scadenza: '2026-09-21',
        },
        {
          id: 'outside-handover',
          pazienteId: outsidePatient,
          pazienteNome: 'Altro paziente',
          creatoDaId: actor.id,
          creatoDA: 'Operatrice QA',
          operatoreAssegnato: '',
          note: 'Altro paziente',
          scadenza: '2026-09-21',
        },
      ],
    });
    const [{ default: express }, { default: router }] = await Promise.all([
      import('express'),
      import('../../backend/src/routes/patient-diary.js'),
    ]);
    const app = express();
    app.use(express.json());
    app.use('/patients', router);
    await new Promise<void>((resolve) => {
      diaryServer = app.listen(0, '127.0.0.1', resolve);
    });
    diaryUrl = `http://127.0.0.1:${(diaryServer.address() as import('node:net').AddressInfo).port}`;
    api = await startParameterApi();
  },
  { timeout: 60000 },
);

after(async () => {
  await api?.close();
  if (diaryServer) {
    diaryServer.closeAllConnections();
    await new Promise<void>((resolve) => diaryServer.close(() => resolve()));
  }
  if (prisma) await closeParameterPrisma(prisma);
  await database?.close();
});

test('existing handovers appear exactly once with nurse author/date/text and no mirrored diary writes', async () => {
  const result = await loadPatientDiary(patientId, {}, actor);
  assert.equal(result?.entries.length, 8);
  const handovers = result!.entries.filter((row) => row.sourceType === 'consegna');
  assert.equal(handovers.length, 5);
  assert.equal(new Set(handovers.map((row) => row.sourceId)).size, 5);
  assert.ok(
    handovers.every((row) => row.authorName === 'Operatrice QA' && row.authorType === 'infermiere'),
  );
  assert.ok(
    handovers.every(
      (row) => row.entryDateTime === '2026-09-20T10:15' && row.priority === 'importante',
    ),
  );
  assert.equal(handovers.find((row) => row.sourceId === 'handover-1')?.content, 'Testo consegna 1');
  assert.equal(await prisma.patientDiaryEntry.count({ where: { patientId } }), 3);
  assert.equal(
    (await loadPatientDiary(patientId, { authorType: 'operatore' }, actor))?.entries.length,
    0,
  );
});

test('union keyset spans both sources with ties, stays bounded and excludes other patients/hidden handovers', async () => {
  let result = await loadPatientDiary(patientId, { limit: '3', authorType: 'infermiere' }, actor);
  const ids = result!.entries.map((row) => row.id);
  assert.equal(ids.length, 3);
  while (result?.nextCursor) {
    result = await loadPatientDiary(
      patientId,
      { limit: '3', authorType: 'infermiere', cursor: result.nextCursor },
      actor,
    );
    ids.push(...result!.entries.map((row) => row.id));
  }
  assert.equal(ids.length, 8);
  assert.equal(new Set(ids).size, 8);
  assert.ok(
    !ids.includes('consegna:invisible-handover') && !ids.includes('consegna:outside-handover'),
  );
  assert.equal(await loadPatientDiary(outsidePatient, {}, actor), null);
  assert.equal((await loadPatientDiary(patientId, {}, fixtureActors.manager))?.entries.length, 9);
  const offset = await loadPatientDiary(
    patientId,
    { offset: '3', limit: '3', authorType: 'infermiere' },
    actor,
  );
  assert.deepEqual(
    offset!.entries.map((row) => row.id),
    ids.slice(3, 6),
  );
});

test('real diary HTTP is no-store/scoped and handover references cannot be edited as diary entries', async () => {
  const endpoint = `${diaryUrl}/patients/${patientId}/diary`;
  assert.equal((await fetch(endpoint)).status, 401);
  const response = await fetch(endpoint, { headers });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal((await response.json()).entries.length, 8);
  assert.equal(
    (await fetch(`${diaryUrl}/patients/${outsidePatient}/diary`, { headers })).status,
    404,
  );
  assert.equal(
    (await fetch(`${endpoint}/consegna:handover-1`, { method: 'DELETE', headers })).status,
    404,
  );
  assert.ok(await prisma.consegna.findUnique({ where: { id: 'handover-1' } }));
});

test('newly saved handover and later edits appear on reload without creating duplicate records', async () => {
  const handover = await createConsegna(
    {
      pazienteId: secondPatient,
      priorita: 'normale',
      tipo: 'Monitoraggio',
      note: 'Nuova consegna sintetica',
      scadenza: '2026-09-20',
      oraScadenza: null,
      operatoreAssegnatoId: null,
    },
    actor,
  );
  const endpoint = `${diaryUrl}/patients/${secondPatient}/diary`;
  let response = await (await fetch(endpoint, { headers })).json();
  assert.equal(response.entries.length, 1);
  assert.equal(response.entries[0].content, 'Nuova consegna sintetica');
  await prisma.consegna.update({
    where: { id: handover.id },
    data: { note: 'Consegna aggiornata', stato: 'completata' },
  });
  response = await (await fetch(endpoint, { headers })).json();
  assert.equal(response.entries.length, 1);
  assert.equal(response.entries[0].content, 'Consegna aggiornata');
  assert.equal(response.entries[0].status, 'completata');
  assert.equal(await prisma.patientDiaryEntry.count({ where: { patientId: secondPatient } }), 0);
});

test('month filter includes every reading with its own time across pages and exact Rome month boundaries', async () => {
  const instants = [
    '2026-08-31T21:59:59.999Z',
    '2026-08-31T22:00:00.000Z',
    '2026-09-03T07:15:00.000Z',
    '2026-09-20T06:00:00.000Z',
    '2026-09-20T14:30:00.000Z',
    '2026-09-30T21:59:59.999Z',
    '2026-09-30T22:00:00.000Z',
  ];
  for (const measuredAt of instants)
    await createParameterReading(
      patientId,
      { requestId: randomUUID(), measuredAt, values: { spo2: '98' } },
      actor,
    );
  const endpoint = `${api.url}/api/patients/${patientId}/parameter-readings`;
  let response = await (await fetch(`${endpoint}?month=2026-09&limit=2`, { headers })).json();
  const readings = [...response.readings];
  assert.equal(response.hasMore, true);
  const firstCursor = response.nextCursor;
  while (response.nextCursor) {
    response = await (
      await fetch(`${endpoint}?month=2026-09&limit=2&cursor=${response.nextCursor}`, { headers })
    ).json();
    readings.push(...response.readings);
  }
  assert.deepEqual(
    readings.map((row) => row.measuredAt),
    instants.slice(1, -1).reverse(),
  );
  assert.equal(readings.filter((row) => row.measuredAt.startsWith('2026-09-20')).length, 2);
  assert.equal(readings.filter((row) => row.measuredAt.startsWith('2026-09-03')).length, 1);
  assert.equal(
    (await fetch(`${endpoint}?month=2026-10&cursor=${firstCursor}`, { headers })).status,
    400,
  );
  const reloaded = await (await fetch(`${endpoint}?month=2026-09`, { headers })).json();
  assert.deepEqual(
    reloaded.readings.map((row: { id: string }) => row.id),
    readings.map((row) => row.id),
  );
});
