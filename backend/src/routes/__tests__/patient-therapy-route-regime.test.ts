import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { after, before, beforeEach, test } from 'node:test';
import express from 'express';

// No real DB: all delegates replaced; unreachable URL ensures accidental calls fail closed.
let prisma: typeof import('../../lib/prisma.js').prisma;
let server: Server;
let base = '';
let originals: Record<string, unknown>;
let saved: Record<string, any>;
let writes: Array<Record<string, unknown>>;
const actor = 'synthetic-route-review';
const headers = {
  'Content-Type': 'application/json',
  'X-Operator-Id': actor,
  'X-Operator-Role': 'operatore',
};

before(async () => {
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/route_test';
  process.env.NODE_ENV = 'test';
  process.env.AUTH_MODE = 'demo';
  process.env.RESIDENT_SCOPE_CONFIG = JSON.stringify({ fallback: 'registered_by_me' });
  ({ prisma } = await import('../../lib/prisma.js'));
  const { default: router } = await import('../patient-therapies.js');
  originals = Object.fromEntries(
    ['patient', 'patientTherapy', 'therapySchedule', '$transaction'].map((key) => [
      key,
      (prisma as any)[key],
    ]),
  );
  const app = express();
  app.use(express.json());
  app.use('/patients', router);
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      assert.ok(address && typeof address === 'object');
      base = `http://127.0.0.1:${address.port}/patients/synthetic-patient/therapies`;
      resolve();
    });
  });
});

beforeEach(() => {
  writes = [];
  saved = {
    id: 'legacy',
    patientId: 'synthetic-patient',
    farmacoNome: 'Sintetico',
    viaSomministrazione: 'al bisogno',
    tipo: 'periodica',
    stato: 'attiva',
    dataInizio: '2026-10-09',
    doseMode: 'glucose_scale',
    doseProtocol: { untouched: 'legacy' },
    dosaggio: 'Dose originale',
    _count: { schedules: 0 },
  };
  const delegates = {
    patient: {
      findFirst: async ({ where }: any) =>
        where.id === 'synthetic-patient' && where.registeredById === actor
          ? { id: where.id }
          : null,
    },
    patientTherapy: {
      findFirst: async ({ where }: any) =>
        where.id === saved.id && where.patientId === saved.patientId
          ? structuredClone(saved)
          : null,
      update: async ({ data }: any) => {
        writes.push(data);
        Object.assign(saved, data);
        return saved;
      },
      create: async ({ data }: any) => {
        writes.push(data);
        return { ...data, id: 'created', schedules: data.schedules?.create ?? [] };
      },
    },
    therapySchedule: {
      deleteMany: async () => {
        writes.push({ deletedSchedules: true });
        return { count: 0 };
      },
      createMany: async () => {
        writes.push({ createdSchedules: true });
        return { count: 0 };
      },
    },
  };
  Object.assign(prisma, delegates, {
    $transaction: async (fn: (tx: unknown) => unknown) => fn(delegates),
  });
});

after(async () => {
  Object.assign(prisma, originals);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.$disconnect();
});

const request = (
  body: Record<string, unknown>,
  method = 'PUT',
  auth = headers,
  url = `${base}/legacy`,
) => fetch(url, { method, headers: auth, body: JSON.stringify(body) });

test('HTTP POST and PUT reject regimen-as-route before any persistence for every type', async () => {
  for (const viaSomministrazione of [
    'al bisogno',
    'AL_BISOGNO',
    'PRN',
    'p.r.n.',
    'periodica',
    'una tantum',
  ]) {
    for (const tipo of ['periodica', 'al_bisogno', 'una_tantum']) {
      for (const method of ['POST', 'PUT']) {
        const response = await request(
          { farmacoNome: 'Sintetico', dataInizio: '2026-10-09', viaSomministrazione, tipo },
          method,
          headers,
          method === 'POST' ? base : `${base}/legacy`,
        );
        assert.equal(response.status, 400, `${method} ${viaSomministrazione}/${tipo}`);
        assert.match(((await response.json()) as { error: string }).error, /regime/);
      }
    }
  }
  assert.deepEqual(writes, []);
});

test('HTTP partial legacy updates and reactivation are blocked without changing data', async () => {
  const before = structuredClone(saved);
  for (const body of [
    { note: 'nota' },
    { schedules: [] },
    { tipo: 'al_bisogno' },
    { viaSomministrazione: 'SC' },
    { stato: 'attiva' },
    { stato: 'sospesa', note: '' },
  ]) {
    assert.equal((await request(body)).status, 400, JSON.stringify(body));
  }
  assert.deepEqual(saved, before);
  assert.deepEqual(writes, []);
});

test('safe status-only legacy actions persist only stato, preserving invalid legacy protocol and dose', async () => {
  const before = structuredClone(saved);
  for (const stato of ['sospesa', 'conclusa']) {
    assert.equal((await request({ stato })).status, 200);
    assert.deepEqual(writes.at(-1), { stato });
    assert.deepEqual(saved, { ...before, stato });
  }
});

test('explicitly reviewed route/type repair and valid PRN creation preserve actual route', async () => {
  // Fixed-dose fixture: unrelated malformed historical glucose schema is not silently repaired.
  saved.doseMode = 'fixed';
  saved.doseProtocol = null;
  const repaired = await request({ viaSomministrazione: 'SC', tipo: 'al_bisogno', schedules: [] });
  assert.equal(repaired.status, 200);
  assert.equal(saved.viaSomministrazione, 'SC');
  assert.equal(saved.tipo, 'al_bisogno');
  const created = await request(
    {
      farmacoNome: 'Sintetico',
      dataInizio: '2026-10-09',
      viaSomministrazione: 'orale',
      tipo: 'al_bisogno',
      schedules: [],
    },
    'POST',
    headers,
    base,
  );
  assert.equal(created.status, 201);
  const data = (await created.json()) as {
    viaSomministrazione: string;
    tipo: string;
    schedules: unknown[];
  };
  assert.equal(data.viaSomministrazione, 'orale');
  assert.equal(data.tipo, 'al_bisogno');
  assert.deepEqual(data.schedules, []);
});

test('auth and patient/therapy scope still deny writes before validation or persistence', async () => {
  assert.equal(
    (
      await request({ stato: 'sospesa' }, 'PUT', {
        'Content-Type': 'application/json',
      } as typeof headers)
    ).status,
    401,
  );
  assert.equal(
    (await request({ stato: 'sospesa' }, 'PUT', { ...headers, 'X-Operator-Role': 'ospite' }))
      .status,
    403,
  );
  assert.equal(
    (
      await request(
        { stato: 'sospesa' },
        'PUT',
        headers,
        base.replace('synthetic-patient', 'outside') + '/legacy',
      )
    ).status,
    404,
  );
  assert.equal(
    (await request({ stato: 'sospesa' }, 'PUT', headers, `${base}/missing`)).status,
    404,
  );
  assert.deepEqual(writes, []);
});
