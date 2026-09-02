import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import express from 'express';
import { prisma } from '../../lib/prisma.js';
import { controlChar } from '../../lib/codice-fiscale.js';
import actionsRouter from '../ai-actions.js';
import voiceRouter from '../ai-voice.js';
import narrativeRouter from '../narrative-sections.js';
import therapyRouter from '../patient-therapies.js';
import patientsRouter from '../patients.js';
import { patientAssignmentRouter } from '../admin-rooms.js';

const suffix = `clinical-scope-${Date.now()}`;
let server: Server;
let base = '';
let operatorAId = '';
let operatorBId = '';
let managerId = '';
let patientAId = '';
let patientBId = '';
let createdPatientId = '';
let therapyBId = '';
const originalAuthMode = process.env.AUTH_MODE;
const originalNodeEnv = process.env.NODE_ENV;

function headers(operatorId: string, role = 'operatore'): Record<string, string> {
  return { 'X-Operator-Id': operatorId, 'X-Operator-Role': role };
}

before(async () => {
  process.env.AUTH_MODE = 'demo';
  process.env.NODE_ENV = 'test';
  const [operatorA, operatorB, manager] = await Promise.all([
    prisma.user.create({
      data: {
        email: `${suffix}-a@example.test`,
        passwordHash: 'test-only',
        fullName: 'Alice Scope',
        operator: { create: { ruolo: 'infermiere' } },
      },
      include: { operator: true },
    }),
    prisma.user.create({
      data: {
        email: `${suffix}-b@example.test`,
        passwordHash: 'test-only',
        fullName: 'Bruno Scope',
        operator: { create: { ruolo: 'medico' } },
      },
      include: { operator: true },
    }),
    prisma.user.create({
      data: {
        email: `${suffix}-manager@example.test`,
        passwordHash: 'test-only',
        fullName: 'Marta Scope',
        role: 'MANAGER',
        operator: { create: { ruolo: 'manager' } },
      },
      include: { operator: true },
    }),
  ]);
  operatorAId = operatorA.operator!.id;
  operatorBId = operatorB.operator!.id;
  managerId = manager.operator!.id;

  const [patientA, patientB] = await Promise.all([
    prisma.patient.create({
      data: {
        medicalRecordNumber: `${suffix}-mrn-a`,
        firstName: 'Paziente',
        lastName: 'A',
        codiceFiscale: 'TSTPZA70A01H501A',
        dateOfBirth: new Date('1970-01-01'),
        registeredById: operatorAId,
      },
    }),
    prisma.patient.create({
      data: {
        medicalRecordNumber: `${suffix}-mrn-b`,
        firstName: 'Paziente',
        lastName: 'B',
        codiceFiscale: 'TSTPZB70A01H501B',
        dateOfBirth: new Date('1970-01-01'),
        registeredById: operatorBId,
      },
    }),
  ]);
  patientAId = patientA.id;
  patientBId = patientB.id;
  await prisma.cartella.create({
    data: {
      patientId: patientAId,
      data: {
        statoRicovero: 'ricoverato',
        parametriVitali: [{ stato: 'critico' }],
        indicatoriRischio: { malformed: true },
        allergie: [{ gravita: 'grave' }, { gravita: 'lieve' }],
        terapie: [{ stato: 'completata' }, { stato: 'attiva' }],
        largeUnusedNarrative: 'dato non necessario '.repeat(2_000),
      },
    },
  });
  const therapyB = await prisma.patientTherapy.create({
    data: {
      patientId: patientBId,
      farmacoNome: 'Terapia B',
      dosaggio: '10 mg',
      dataInizio: '2026-08-29',
    },
  });
  therapyBId = therapyB.id;

  const app = express();
  app.use(express.json());
  app.use('/patients', therapyRouter);
  app.use('/patients', narrativeRouter);
  app.use('/patients', patientAssignmentRouter);
  app.use('/patients', patientsRouter);
  app.use('/ai/actions', actionsRouter);
  app.use('/ai/voice', voiceRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.patient.deleteMany({
    where: { id: { in: [patientAId, patientBId, createdPatientId].filter(Boolean) } },
  });
  await prisma.user.deleteMany({ where: { email: { startsWith: suffix } } });
  if (originalAuthMode === undefined) delete process.env.AUTH_MODE;
  else process.env.AUTH_MODE = originalAuthMode;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});

test('patient search matches names and partial fiscal codes without escaping operator scope', async () => {
  async function search(query: string, operatorId: string, role = 'operatore') {
    const response = await fetch(`${base}/patients/page/search`, {
      method: 'POST',
      headers: {
        ...headers(operatorId, role),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, limit: '10' }),
    });
    assert.equal(response.status, 200);
    return (await response.json()) as { items: Array<{ id: string; codiceFiscale: string }> };
  }

  const ownByName = await search('Paziente A', operatorAId);
  assert.deepEqual(
    ownByName.items.map((patient) => patient.id),
    [patientAId],
  );

  const ownByPartialFiscalCode = await search('TSTPZA70', operatorAId);
  assert.deepEqual(
    ownByPartialFiscalCode.items.map((patient) => patient.id),
    [patientAId],
  );
  assert.equal(ownByPartialFiscalCode.items[0]?.codiceFiscale, 'TSTPZA70A01H501A');

  const foreignByName = await search('Paziente B', operatorAId);
  const foreignByFiscalCode = await search('TSTPZB70', operatorAId);
  assert.deepEqual(foreignByName.items, []);
  assert.deepEqual(foreignByFiscalCode.items, []);

  const managerResult = await search('TSTPZB70', managerId, 'manager');
  assert.deepEqual(
    managerResult.items.map((patient) => patient.id),
    [patientBId],
  );
});

test('ordinary operator cannot access another patient clinical resources', async () => {
  const attempts: Array<[string, RequestInit]> = [
    [`/${patientBId}/therapies`, {}],
    [`/${patientBId}/therapies`, { method: 'POST', body: JSON.stringify({}) }],
    [`/${patientBId}/therapies/${therapyBId}`, { method: 'PUT', body: JSON.stringify({}) }],
    [`/${patientBId}/therapies/${therapyBId}`, { method: 'DELETE' }],
    [`/${patientBId}/medication-administrations`, {}],
    [`/${patientBId}/narrative-sections`, {}],
    [`/${patientBId}/narrative-sections/ALLERGIES`, {}],
    [
      `/${patientBId}/narrative-sections/ALLERGIES`,
      { method: 'PUT', body: JSON.stringify({ reviewedText: 'Intrusione' }) },
    ],
    [
      `/${patientBId}/narrative-sections/ALLERGIES`,
      { method: 'PATCH', body: JSON.stringify({ reviewedText: 'Intrusione' }) },
    ],
  ];
  for (const [path, init] of attempts) {
    const response = await fetch(`${base}/patients${path}`, {
      ...init,
      headers: { ...headers(operatorAId), 'Content-Type': 'application/json' },
    });
    assert.equal(response.status, 404, `${init.method ?? 'GET'} ${path}`);
    assert.match(response.headers.get('cache-control') ?? '', /private, no-store/);
  }
  assert.equal(await prisma.patientNarrativeSection.count({ where: { patientId: patientBId } }), 0);
  assert.notEqual(await prisma.patientTherapy.findUnique({ where: { id: therapyBId } }), null);
});

test('own patient access works and client authorship is ignored', async () => {
  const create = await fetch(`${base}/patients/${patientAId}/therapies`, {
    method: 'POST',
    headers: { ...headers(operatorAId), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      farmacoNome: 'Terapia A',
      dosaggio: '5 mg',
      dataInizio: '2026-08-29',
      operatoreInseritore: 'Autore contraffatto',
      schedules: [{ time: '8:00', administrationUnit: 'compressa' }],
    }),
  });
  assert.equal(create.status, 201, await create.text());
  const createdTherapy = (await create.json()) as {
    id: string;
    operatoreInseritore: string;
    schedules: Array<{ time: string }>;
  };
  assert.equal(createdTherapy.operatoreInseritore, operatorAId);
  assert.equal(createdTherapy.schedules[0]?.time, '08:00');

  const invalidScheduleUpdate = await fetch(
    `${base}/patients/${patientAId}/therapies/${createdTherapy.id}`,
    {
      method: 'PUT',
      headers: { ...headers(operatorAId), 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedules: null }),
    },
  );
  assert.equal(invalidScheduleUpdate.status, 400, await invalidScheduleUpdate.text());
  assert.equal(await prisma.therapySchedule.count({ where: { therapyId: createdTherapy.id } }), 1);

  const explicitClear = await fetch(
    `${base}/patients/${patientAId}/therapies/${createdTherapy.id}`,
    {
      method: 'PUT',
      headers: { ...headers(operatorAId), 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedules: [] }),
    },
  );
  assert.equal(explicitClear.status, 200, await explicitClear.text());
  const clearedTherapy = await prisma.patientTherapy.findUniqueOrThrow({
    where: { id: createdTherapy.id },
  });
  assert.equal(await prisma.therapySchedule.count({ where: { therapyId: createdTherapy.id } }), 0);
  assert.deepEqual(
    [
      clearedTherapy.fasceMattina,
      clearedTherapy.fascePranzo,
      clearedTherapy.fascePomeriggio,
      clearedTherapy.fasceSera,
      clearedTherapy.fasceNotte,
    ],
    [false, false, false, false, false],
  );
  assert.equal(clearedTherapy.orarioSpecifico, null);

  const createWithoutSchedules = await fetch(`${base}/patients/${patientAId}/therapies`, {
    method: 'POST',
    headers: { ...headers(operatorAId), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      farmacoNome: 'Terapia senza orari',
      dataInizio: '2026-08-29',
      schedules: [],
    }),
  });
  assert.equal(createWithoutSchedules.status, 201, await createWithoutSchedules.text());
  const emptyScheduleTherapy = (await createWithoutSchedules.json()) as {
    fasceMattina: boolean;
    orarioSpecifico: string | null;
    schedules: unknown[];
  };
  assert.deepEqual(emptyScheduleTherapy.schedules, []);
  assert.equal(emptyScheduleTherapy.fasceMattina, false);
  assert.equal(emptyScheduleTherapy.orarioSpecifico, null);

  const invalidDateUpdate = await fetch(
    `${base}/patients/${patientAId}/therapies/${createdTherapy.id}`,
    {
      method: 'PUT',
      headers: { ...headers(operatorAId), 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataFine: '2026-08-28' }),
    },
  );
  assert.equal(invalidDateUpdate.status, 400, await invalidDateUpdate.text());

  await prisma.patientTherapy.update({
    where: { id: createdTherapy.id },
    data: { dataInizio: 'legacy-date' },
  });
  const legacyStatusUpdate = await fetch(
    `${base}/patients/${patientAId}/therapies/${createdTherapy.id}`,
    {
      method: 'PUT',
      headers: { ...headers(operatorAId), 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: 'sospesa' }),
    },
  );
  assert.equal(legacyStatusUpdate.status, 200, await legacyStatusUpdate.text());
  const legacyTherapy = await prisma.patientTherapy.findUniqueOrThrow({
    where: { id: createdTherapy.id },
  });
  assert.equal(legacyTherapy.stato, 'sospesa');
  assert.equal(legacyTherapy.dataInizio, 'legacy-date');

  const saveNarrative = await fetch(`${base}/patients/${patientAId}/narrative-sections/ALLERGIES`, {
    method: 'PUT',
    headers: { ...headers(operatorAId), 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviewedText: 'Nessuna', updatedBy: 'Autore contraffatto' }),
  });
  assert.equal(saveNarrative.status, 200, await saveNarrative.text());
  const stored = await prisma.patientNarrativeSection.findUniqueOrThrow({
    where: { patientId_sectionKey: { patientId: patientAId, sectionKey: 'ALLERGIES' } },
  });
  assert.equal(stored.updatedBy, operatorAId);
});

test('manager retains global access while missing and unauthorized patients share 404', async () => {
  const managerRead = await fetch(`${base}/patients/${patientBId}/therapies`, {
    headers: headers(managerId, 'manager'),
  });
  assert.equal(managerRead.status, 200, await managerRead.text());

  const unauthorized = await fetch(`${base}/patients/${patientBId}/therapies`, {
    headers: headers(operatorAId),
  });
  const missing = await fetch(`${base}/patients/missing-${suffix}/therapies`, {
    headers: headers(operatorAId),
  });
  assert.equal(unauthorized.status, 404);
  assert.equal(missing.status, 404);
  assert.deepEqual(await unauthorized.json(), await missing.json());
});

test('patient roster, summaries, detail and cartella never cross ordinary-operator ownership', async () => {
  const operatorHeaders = headers(operatorAId);
  const [pageResponse, parametersResponse, summaryResponse, overviewResponse] = await Promise.all([
    fetch(`${base}/patients/page?limit=100`, { headers: operatorHeaders }),
    fetch(`${base}/patients/parameters/page?limit=25`, { headers: operatorHeaders }),
    fetch(`${base}/patients/clinical-summary?patientIds=${patientAId},${patientBId}`, {
      headers: operatorHeaders,
    }),
    fetch(`${base}/patients/clinical-summary/overview`, { headers: operatorHeaders }),
  ]);
  assert.equal(pageResponse.status, 200, await pageResponse.clone().text());
  assert.equal(parametersResponse.status, 200, await parametersResponse.clone().text());
  assert.equal(summaryResponse.status, 200, await summaryResponse.clone().text());
  assert.equal(overviewResponse.status, 200, await overviewResponse.clone().text());

  const page = (await pageResponse.json()) as { items: Array<{ id: string }> };
  const parameters = (await parametersResponse.json()) as {
    items: Array<{ patient: { id: string } }>;
  };
  const summary = (await summaryResponse.json()) as Array<{
    patientId: string;
    statoRicovero: string | null;
    hasCriticalVitals: boolean;
    hasHighRisk: boolean;
    allergieCount: number;
    hasSevereAllergy: boolean;
    terapieTotali: number;
    terapieCompletate: number;
    consegneAperte: number;
  }>;
  const overview = (await overviewResponse.json()) as { totalPatients: number };
  assert.ok(page.items.some((patient) => patient.id === patientAId));
  assert.ok(page.items.every((patient) => patient.id !== patientBId));
  assert.ok(parameters.items.some((item) => item.patient.id === patientAId));
  assert.ok(parameters.items.every((item) => item.patient.id !== patientBId));
  assert.deepEqual(
    summary.map((item) => item.patientId),
    [patientAId],
  );
  assert.deepEqual(summary[0], {
    patientId: patientAId,
    statoRicovero: 'ricoverato',
    hasCriticalVitals: true,
    hasHighRisk: false,
    allergieCount: 2,
    hasSevereAllergy: true,
    terapieTotali: 2,
    terapieCompletate: 1,
    consegneAperte: 0,
  });
  assert.equal(overview.totalPatients, 1);

  const attempts: Array<[string, RequestInit]> = [
    [`/${patientBId}`, {}],
    [`/${patientBId}`, { method: 'PATCH', body: JSON.stringify({ phone: 'intrusione' }) }],
    [`/${patientBId}/cartella`, {}],
    [`/${patientBId}/room-assignments?scope=active`, {}],
    [
      `/${patientBId}/cartella`,
      { method: 'PUT', body: JSON.stringify({ data: { noteClinica: 'intrusione' } }) },
    ],
    [
      `/${patientBId}/parameters`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          month: {
            id: 'scope-month',
            mese: 8,
            anno: 2026,
            createdAt: '2026-08-29T00:00:00.000Z',
            giorni: [{ giorno: 29, note: 'intrusione' }],
          },
        }),
      },
    ],
  ];
  for (const [path, init] of attempts) {
    const response = await fetch(`${base}/patients${path}`, {
      ...init,
      headers: { ...operatorHeaders, 'Content-Type': 'application/json' },
    });
    assert.equal(response.status, 404, `${init.method ?? 'GET'} ${path}: ${await response.text()}`);
  }
  const patientB = await prisma.patient.findUniqueOrThrow({ where: { id: patientBId } });
  assert.equal(patientB.phone, null);
  assert.equal(await prisma.cartella.count({ where: { patientId: patientBId } }), 0);
});

test('manager reads globally and patient creation binds ownership to the authenticated actor', async () => {
  const managerRead = await fetch(`${base}/patients/${patientBId}`, {
    headers: headers(managerId, 'manager'),
  });
  assert.equal(managerRead.status, 200, await managerRead.text());
  const managerAssignments = await fetch(`${base}/patients/${patientBId}/room-assignments`, {
    headers: headers(managerId, 'manager'),
  });
  assert.equal(managerAssignments.status, 200, await managerAssignments.text());

  const cf15 = `TSTSCR${String(Date.now()).slice(-2)}A01H501`;
  const codiceFiscale = `${cf15}${controlChar(cf15)}`;
  const create = await fetch(`${base}/patients`, {
    method: 'POST',
    headers: { ...headers(operatorAId), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Nuovo',
      lastName: 'Scoped',
      dateOfBirth: '1980-01-01',
      codiceFiscale,
      registeredById: operatorBId,
    }),
  });
  assert.equal(create.status, 201, await create.clone().text());
  const created = (await create.json()) as { id: string };
  createdPatientId = created.id;
  const stored = await prisma.patient.findUniqueOrThrow({ where: { id: createdPatientId } });
  assert.equal(stored.registeredById, operatorAId);
});

test('text and voice assistant deny foreign-patient preview and execution', async () => {
  const planPayload = {
    text: 'registra pressione 130 su 80 alle 9',
    transcript: 'registra pressione 130 su 80 alle 9',
    currentPatientId: patientBId,
  };
  const textPlan = await fetch(`${base}/ai/actions/plan`, {
    method: 'POST',
    headers: { ...headers(operatorAId), 'Content-Type': 'application/json' },
    body: JSON.stringify(planPayload),
  });
  assert.equal(textPlan.status, 403, await textPlan.text());

  const voicePlan = await fetch(`${base}/ai/voice/plan`, {
    method: 'POST',
    headers: { ...headers(operatorAId), 'Content-Type': 'application/json' },
    body: JSON.stringify(planPayload),
  });
  assert.equal(voicePlan.status, 403, await voicePlan.text());

  const execute = await fetch(`${base}/ai/actions/execute`, {
    method: 'POST',
    headers: { ...headers(operatorAId), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'aggiungi una nota al diario con tentativo fuori scope',
      patientId: patientBId,
      idempotencyKey: `${suffix}-foreign`,
      confirmed: true,
    }),
  });
  assert.equal(execute.status, 403, await execute.text());
  assert.equal(await prisma.patientDiaryEntry.count({ where: { patientId: patientBId } }), 0);

  const unverifiedManagerPlan = await fetch(`${base}/ai/actions/plan`, {
    method: 'POST',
    headers: { ...headers(managerId, 'manager'), 'Content-Type': 'application/json' },
    body: JSON.stringify(planPayload),
  });
  assert.equal(unverifiedManagerPlan.status, 403, await unverifiedManagerPlan.text());
});
