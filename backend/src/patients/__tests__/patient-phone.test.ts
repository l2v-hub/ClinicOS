import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import type { Server } from 'node:http';
import express from 'express';
import { validatePatientPhone } from '../../lib/patient-phone.js';

let prisma: typeof import('../../lib/prisma.js').prisma;
let confirmDraft: typeof import('../../ai/upload/confirm-service.js').confirmDraft;
let confirmJob: typeof import('../../ai/upload/confirm-service.js').confirmJob;
let writer: typeof import('../../ai/voice/write-services.js').prismaVoiceWriter;
let server: Server;
let base: string;
let original: Record<string, unknown>;
let state: Record<string, any>;
let calls: { reads: number; writes: number; transactions: number };

const actor = { id: 'phone-test-operator', role: 'operatore' };
const headers = {
  'Content-Type': 'application/json',
  'X-Operator-Id': actor.id,
  'X-Operator-Role': actor.role,
};
const identity = {
  firstName: 'Persona',
  lastName: 'Sintetica',
  dateOfBirth: '1970-01-01',
  codiceFiscale: 'NTKSNT70A01H501G',
};
const invalidPhones = [
  undefined,
  null,
  '',
  '   ',
  1234567,
  {},
  'nessuno',
  '1234',
  '1234567890123456',
  '12+34567',
  '12345\n67890',
  `12345${'.'.repeat(36)}`,
];

before(async () => {
  // Every delegate used below is replaced; the fallback URL cannot reach a database.
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/phone_test';
  process.env.AUTH_MODE = 'demo';
  process.env.NODE_ENV = 'test';
  ({ prisma } = await import('../../lib/prisma.js'));
  ({ confirmDraft, confirmJob } = await import('../../ai/upload/confirm-service.js'));
  ({ prismaVoiceWriter: writer } = await import('../../ai/voice/write-services.js'));
  const { default: router } = await import('../../routes/patients.js');
  original = Object.fromEntries(
    [
      'patient',
      'patientIntakeDraft',
      'importJob',
      'importAudit',
      'operator',
      'cartella',
      'importDocument',
      '$transaction',
    ].map((key) => [key, (prisma as any)[key]]),
  );
  const app = express();
  app.use(express.json());
  app.use('/patients', router);
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      assert.ok(address && typeof address === 'object');
      base = `http://127.0.0.1:${address.port}/patients`;
      resolve();
    });
  });
});

beforeEach(() => {
  state = {
    patient: { id: 'phone-patient', ...identity, phone: null, registeredById: actor.id },
    draft: {
      id: 'phone-draft',
      status: 'draft',
      createdById: actor.id,
      importJobId: null,
      data: {},
    },
    job: { id: 'phone-job', status: 'review_ready', createdById: actor.id, resultData: null },
  };
  calls = { reads: 0, writes: 0, transactions: 0 };
  const delegates = {
    patient: {
      findFirst: async ({ where }: any) => {
        calls.reads++;
        return where.id === state.patient.id &&
          (!where.registeredById || where.registeredById === actor.id)
          ? state.patient
          : null;
      },
      findUnique: async ({ where }: any) => {
        calls.reads++;
        return where.id === state.patient.id ? state.patient : null;
      },
      findMany: async () => [],
      create: async ({ data }: any) => {
        calls.writes++;
        state.patient = { id: 'created-phone-patient', ...data };
        return state.patient;
      },
      update: async ({ data }: any) => {
        calls.writes++;
        Object.assign(state.patient, data);
        return state.patient;
      },
      updateMany: async () => ({ count: 0 }),
    },
    patientIntakeDraft: {
      findUnique: async ({ where }: any) => (where.importJobId ? null : state.draft),
      findUniqueOrThrow: async () => state.draft,
      update: async ({ data }: any) => {
        Object.assign(state.draft, data);
        return state.draft;
      },
    },
    importJob: {
      findUnique: async () => state.job,
      update: async ({ data }: any) => {
        Object.assign(state.job, data);
        return state.job;
      },
    },
    importAudit: { create: async () => ({}) },
    operator: { findMany: async () => [{ id: actor.id }] },
    cartella: { create: async () => ({}), findUnique: async () => null, upsert: async () => ({}) },
    importDocument: { findMany: async () => [] },
    patientDocument: { findMany: async () => [] },
    $queryRaw: async () => [],
  };
  Object.assign(prisma, delegates, {
    $transaction: async (fn: (tx: unknown) => unknown) => {
      calls.transactions++;
      return fn(delegates);
    },
  });
});

after(async () => {
  Object.assign(prisma, original);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.$disconnect();
});

test('phone validation rejects absent/malformed inputs and preserves formatted numbers', () => {
  for (const value of invalidPhones) assert.equal(validatePatientPhone(value).ok, false);
  for (const phone of [
    '12345',
    '123456789012345',
    '+39 333 000 0000',
    '+44 (20) 1234-5678',
    '06/12345678',
    '0033.1.23.45.67.89',
  ]) {
    assert.deepEqual(validatePatientPhone(` ${phone} `), { ok: true, phone });
  }
});

test('POST rejects invalid phones before any patient database access', async () => {
  for (const phone of invalidPhones) {
    const response = await fetch(base, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...identity, phone }),
    });
    assert.equal(response.status, 400);
    assert.match(((await response.json()) as any).error, /telefono/i);
  }
  assert.deepEqual(calls, { reads: 0, writes: 0, transactions: 0 });
});

test('POST persists a trimmed phone with its leading zero and returns it', async () => {
  const response = await fetch(base, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...identity, phone: ' 020 1234 5678 ' }),
  });
  assert.equal(response.status, 201);
  assert.equal(((await response.json()) as any).phone, '020 1234 5678');
  assert.equal(state.patient.phone, '020 1234 5678');
  assert.equal(calls.writes, 1);
});

test('PATCH rejects malformed supplied phones without a transaction', async () => {
  for (const phone of invalidPhones.filter(
    (value) => value != null && value !== '' && value !== '   ',
  )) {
    const response = await fetch(`${base}/phone-patient`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ phone }),
    });
    assert.equal(response.status, 400);
  }
  assert.equal(calls.writes, 0);
  assert.equal(calls.transactions, 0);
});

test('PATCH updates phone, while unrelated updates remain possible for legacy patients', async () => {
  const update = (body: unknown) =>
    fetch(`${base}/phone-patient`, { method: 'PATCH', headers, body: JSON.stringify(body) });
  const legacy = await update({ email: 'synthetic@example.test' });
  assert.equal(legacy.status, 200);
  assert.equal(state.patient.phone, null);
  const response = await update({ phone: ' +39 333 000 0000 ' });
  assert.equal(response.status, 200);
  assert.equal(((await response.json()) as any).phone, '+39 333 000 0000');
  assert.equal(state.patient.phone, '+39 333 000 0000');
});

test('phone requirement preserves authentication and patient scope checks', async () => {
  const unauthenticated = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(identity),
  });
  assert.equal(unauthenticated.status, 401);
  const foreign = await fetch(`${base}/foreign-patient`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ phone: '' }),
  });
  assert.equal(foreign.status, 404);
  assert.equal(calls.writes, 0);
});

test('draft and import confirmation reject malformed supplied phone without patient writes', async () => {
  for (const confirm of [confirmDraft, confirmJob]) {
    for (const phone of invalidPhones.filter(
      (value) => value != null && value !== '' && value !== '   ',
    )) {
      await assert.rejects(
        () => confirm('synthetic-source', { patient: { ...identity, phone } } as any, actor),
        /telefono/i,
      );
    }
  }
  assert.equal(calls.writes, 0);
  assert.ok(calls.transactions > 0);
});

test('draft confirmation persists the phone and permits a legacy idempotent replay', async () => {
  const result = await confirmDraft(
    'phone-draft',
    { patient: { ...identity, phone: ' 0612345678 ' } },
    actor,
  );
  assert.equal(result.status, 'created');
  assert.equal(state.patient.phone, '0612345678');
  assert.equal(state.draft.status, 'confirmed');
  const replay = await confirmDraft('phone-draft', { patient: identity }, actor);
  assert.equal(replay.status, 'idempotent');
  assert.equal(calls.writes, 1);
});

test('import confirmation persists phone; existing-patient import leaves missing phone untouched', async () => {
  const existing = await confirmJob(
    'phone-job',
    { patient: identity, mode: 'existing', patientId: 'phone-patient' },
    actor,
  );
  assert.equal(existing.status, 'updated');
  assert.equal(state.patient.phone, null);
  assert.equal(calls.writes, 0);
  state.job.status = 'review_ready';
  state.job.createdPatientId = null;
  const created = await confirmJob(
    'phone-job',
    { patient: { ...identity, phone: ' +44 (20) 1234-5678 ' } },
    actor,
  );
  assert.equal(created.status, 'created');
  assert.equal(state.patient.phone, '+44 (20) 1234-5678');
});

test('voice writer rejects invalid phone as a client error and allows unrelated fields', async () => {
  const meta = {
    operatorId: actor.id,
    operatorName: 'Operatore sintetico',
    nowISO: '2026-09-15T08:00:00Z',
  };
  await assert.rejects(
    () => writer.updateDemographics('phone-patient', 'phone', ' ', meta),
    (error: any) => error.kind === 'not_executable' && /obbligatorio/.test(error.message),
  );
  assert.equal(calls.writes, 0);
  await writer.updateDemographics('phone-patient', 'address', 'Indirizzo sintetico', meta);
  assert.equal(state.patient.phone, null);
  await writer.updateDemographics('phone-patient', 'phone', ' 0612345678 ', meta);
  assert.equal(state.patient.phone, '0612345678');
});
