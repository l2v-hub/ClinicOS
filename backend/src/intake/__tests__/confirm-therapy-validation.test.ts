import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import type { Server } from 'node:http';
import express from 'express';

// Synthetic, unreachable DB URL; every delegate is stubbed before any request.
let prisma: typeof import('../../lib/prisma.js').prisma;
let server: Server;
let base: string;
let originals: Record<string, unknown>;
let state: any;
let calls: { transactions: number; patientWrites: number; therapyWrites: number };
let failTherapy = false;
const actor = { id: 'synthetic-confirm-operator', role: 'operatore' };
const headers = {
  'Content-Type': 'application/json',
  'X-Operator-Id': actor.id,
  'X-Operator-Role': actor.role,
};
const patient = {
  firstName: 'Persona',
  lastName: 'Sintetica',
  dateOfBirth: '1970-01-01',
  codiceFiscale: 'NTKSNT70A01H501G',
  phone: '+39 333 000 0000',
};
const therapy = {
  farmacoNome: 'Farmaco sintetico',
  dataInizio: '2026-09-15',
  dataFine: '2026-10-20',
  viaSomministrazione: 'orale',
  tipo: 'periodica',
  stato: 'attiva',
  giorniSettimana: '1,3',
  commercialStrengthValue: 20,
  commercialStrengthUnit: 'mg',
  pharmaceuticalForm: 'compressa',
  allowedFractions: '1,1/2,1/4',
  operatoreInseritore: 'spoofed',
  schedules: [
    {
      time: '08:00',
      quantityNumerator: 1,
      quantityDenominator: 2,
      administrationUnit: 'compressa',
    },
    {
      time: '20:00',
      quantityNumerator: 3,
      quantityDenominator: 4,
      administrationUnit: 'compressa',
    },
  ],
};

before(async () => {
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/intake_test';
  process.env.AUTH_MODE = 'demo';
  process.env.NODE_ENV = 'test';
  ({ prisma } = await import('../../lib/prisma.js'));
  const { default: router } = await import('../../routes/intake-drafts.js');
  originals = Object.fromEntries(
    [
      'patient',
      'patientIntakeDraft',
      'patientTherapy',
      'operator',
      'cartella',
      'importJob',
      'importAudit',
      'importDocument',
      '$transaction',
    ].map((k) => [k, (prisma as any)[k]]),
  );
  const app = express();
  app.use(express.json());
  app.use('/intake/drafts', router);
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      assert.ok(address && typeof address === 'object');
      base = `http://127.0.0.1:${address.port}/intake/drafts/synthetic-draft`;
      resolve();
    });
  });
});

beforeEach(() => {
  failTherapy = false;
  state = {
    draft: {
      id: 'synthetic-draft',
      status: 'draft',
      createdById: actor.id,
      importJobId: 'synthetic-job',
      data: {},
    },
    patient: null,
    therapies: [],
    cartella: null,
    audits: [],
  };
  calls = { transactions: 0, patientWrites: 0, therapyWrites: 0 };
  const delegates = {
    patient: {
      findUnique: async ({ where }: any) =>
        state.patient &&
        (where.id === state.patient.id || where.codiceFiscale === state.patient.codiceFiscale)
          ? state.patient
          : null,
      findMany: async () => [],
      create: async ({ data }: any) => {
        calls.patientWrites++;
        return (state.patient = { id: 'synthetic-created', ...data });
      },
      updateMany: async () => ({ count: 0 }),
    },
    patientIntakeDraft: {
      findUnique: async () => state.draft,
      findUniqueOrThrow: async () => state.draft,
      update: async ({ data }: any) => Object.assign(state.draft, data),
    },
    patientTherapy: {
      create: async ({ data }: any) => {
        calls.therapyWrites++;
        if (failTherapy) throw new Error('Private database detail must not escape');
        const saved = {
          id: `synthetic-therapy-${state.therapies.length}`,
          ...data,
          schedules: data.schedules?.create ?? [],
        };
        state.therapies.push(saved);
        return saved;
      },
    },
    operator: { findMany: async () => [{ id: actor.id }] },
    cartella: { create: async ({ data }: any) => (state.cartella = data) },
    importJob: {
      findUnique: async () => ({ id: 'synthetic-job', createdById: actor.id, resultData: null }),
    },
    importAudit: {
      create: async ({ data }: any) => {
        state.audits.push(data);
        return data;
      },
    },
    importDocument: { findMany: async () => [] },
  };
  Object.assign(prisma, delegates, {
    $transaction: async (fn: (tx: unknown) => unknown) => {
      calls.transactions++;
      const snapshot = structuredClone(state);
      try {
        return await fn(delegates);
      } catch (error) {
        state = snapshot;
        throw error;
      }
    },
  });
});

after(async () => {
  Object.assign(prisma, originals);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.$disconnect();
});

async function confirm(therapies: unknown = [therapy], auth = headers) {
  return fetch(`${base}/confirm`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ patient, therapies }),
  });
}

test('invalid therapy returns indexed 400 before any transaction or patient write', async () => {
  for (const bad of [
    { ...therapy, farmacoNome: '' },
    { ...therapy, dataInizio: '2026-02-30' },
    { ...therapy, dataFine: '2025-01-01' },
    { ...therapy, schedules: [] },
    { ...therapy, schedules: [{ ...therapy.schedules[0], administrationUnit: '' }] },
    { ...therapy, schedules: [{ time: '08:00' }] },
    { ...therapy, schedules: [{ ...therapy.schedules[0], time: '25:99' }] },
    { ...therapy, schedules: [therapy.schedules[0], therapy.schedules[0]] },
    { ...therapy, giorniSettimana: 'unknown' },
    null,
  ]) {
    const response = await confirm([therapy, bad]);
    assert.equal(response.status, 400);
    const result: any = await response.json();
    assert.match(result.error, /^Terapia 2:/);
    assert.match(result.error, /Clinica/);
    assert.doesNotMatch(result.error, /Farmaco sintetico/);
  }
  assert.deepEqual(calls, { transactions: 0, patientWrites: 0, therapyWrites: 0 });
  assert.equal(state.draft.status, 'draft');
});

test('corrected retry persists precise schedules, actor and weekdays; replay is idempotent', async () => {
  assert.equal((await confirm([{ ...therapy, schedules: [] }])).status, 400);
  const response = await confirm();
  assert.equal(response.status, 201);
  assert.equal(state.draft.status, 'confirmed');
  assert.equal(state.therapies.length, 1);
  const saved = state.therapies[0];
  assert.equal(saved.giorniSettimana, '1,3');
  assert.equal(saved.commercialStrengthValue, 20);
  assert.equal(saved.dataFine, '2026-10-20');
  assert.equal(saved.operatoreInseritore, actor.id);
  assert.deepEqual(
    saved.schedules.map(({ fascia: _, ...schedule }: any) => schedule),
    therapy.schedules,
  );
  const replay = await confirm([{ farmacoNome: '' }]);
  assert.equal(replay.status, 200);
  assert.equal(((await replay.json()) as any).status, 'idempotent');
  assert.equal(calls.patientWrites, 1);
  assert.equal(calls.therapyWrites, 1);
});

test('persistence failure rolls back all writes, sanitizes audit, and permits retry', async () => {
  failTherapy = true;
  const response = await confirm();
  assert.equal(response.status, 503);
  assert.doesNotMatch(JSON.stringify(await response.json()), /Private database/);
  assert.equal(state.patient, null);
  assert.equal(state.cartella, null);
  assert.deepEqual(state.therapies, []);
  assert.equal(state.draft.status, 'draft');
  assert.doesNotMatch(JSON.stringify(state.audits), /Private database/);
  assert.match(JSON.stringify(state.audits), /transaction_failed/);
  failTherapy = false;
  assert.equal((await confirm()).status, 201);
  assert.equal(state.therapies.length, 1);
});

test('confirmation remains operator-gated and owner-scoped', async () => {
  assert.equal(
    (await confirm([], { 'Content-Type': 'application/json' } as typeof headers)).status,
    401,
  );
  state.draft.createdById = 'another-operator';
  assert.equal((await confirm()).status, 404);
  assert.equal(calls.patientWrites, 0);
});

test('one imported and three manual therapies persist in order including whole patches', async () => {
  const therapies = [
    'Importata sintetica',
    'Alfa sintetico',
    'Beta sintetico',
    'Gamma sintetico',
  ].map((farmacoNome) => ({ ...therapy, farmacoNome }));
  therapies[2] = {
    ...therapies[2],
    pharmaceuticalForm: 'cerotto',
    viaSomministrazione: 'transdermica',
    allowedFractions: '1',
    schedules: [
      {
        time: '09:15',
        quantityNumerator: 1,
        quantityDenominator: 1,
        administrationUnit: 'cerotto',
      },
    ],
  };
  assert.equal((await confirm(JSON.parse(JSON.stringify(therapies)))).status, 201);
  assert.deepEqual(
    state.therapies.map((t: any) => t.farmacoNome),
    therapies.map((t) => t.farmacoNome),
  );
  assert.equal(state.therapies[2].schedules[0].administrationUnit, 'cerotto');
  assert.equal(state.therapies[2].schedules[0].time, '09:15');
  assert.equal(state.therapies[2].allowedFractions, '1');
  assert.equal(calls.patientWrites, 1);
  assert.equal(calls.therapyWrites, 4);
});

test('a divided patch in the final row rejects the entire confirmation before writes', async () => {
  const dividedPatch = {
    ...therapy,
    pharmaceuticalForm: 'cerotto',
    viaSomministrazione: 'transdermica',
    schedules: [{ ...therapy.schedules[0], administrationUnit: 'cerotto' }],
  };
  const response = await confirm([therapy, therapy, therapy, dividedPatch]);
  assert.equal(response.status, 400);
  assert.match(((await response.json()) as { error: string }).error, /^Terapia 4:.*cerotti/);
  assert.deepEqual(calls, { transactions: 0, patientWrites: 0, therapyWrites: 0 });
  assert.deepEqual(state.therapies, []);
  assert.equal(state.draft.status, 'draft');
});
