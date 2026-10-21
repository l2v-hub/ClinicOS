// Actual authoritative writer with an in-memory transaction double; no DB, HTTP or browser.
process.env.RESIDENT_SCOPE_CONFIG = JSON.stringify({ fallback: 'registered_by_me' });
import { after, before, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { Prisma } from '@prisma/client';
import {
  confirmTherapyAdministration,
  recordTherapyNotAdministered,
  recordTherapyAdministrationResult,
  TherapyAlreadyAdministeredError,
} from '../administration-record.js';
import { TherapyWriteInputError, TherapyNotFoundError } from '../therapy-write.js';
import { prisma } from '../../lib/prisma.js';

before(() =>
  mock.method(net.Socket.prototype, 'connect', () => {
    throw new Error('Network forbidden in pure writer regression');
  }),
);
after(() => mock.restoreAll());
const actor = { id: 'synthetic-owner', role: 'operatore', name: 'Synthetic Owner' };
const therapy = {
  id: 'synthetic-therapy',
  patientId: 'synthetic-patient',
  farmacoNome: 'Synthetic one-off',
  tipo: 'una_tantum',
  orarioSomministrazione: '11:30' as string | null,
  dosaggio: '1 synthetic tablet',
  viaSomministrazione: 'orale',
  giorniSettimana: null,
  doseMode: 'fixed',
  doseProtocol: null,
  fasceMattina: true,
  fascePranzo: true,
  fascePomeriggio: false,
  fasceSera: false,
  fasceNotte: false,
  commercialStrengthValue: null,
  commercialStrengthUnit: null,
  schedules: [] as Array<Record<string, unknown>>,
};
const body = {
  therapyId: therapy.id,
  patientId: therapy.patientId,
  date: '2033-04-06',
  fascia: 'pranzo',
  scheduledTime: '11:30',
  expectedStato: 'da_erogare',
};
function record(patch: Record<string, unknown> = {}) {
  return {
    id: 'historical-row',
    therapyId: null as string | null,
    patientId: therapy.patientId,
    farmacoNome: therapy.farmacoNome,
    date: body.date,
    fascia: 'notte',
    ora: '00:15',
    stato: 'erogata',
    operatoreId: 'historical-actor',
    operatoreNome: 'Historical synthetic actor',
    farmacoDose: 'Historical synthetic dose',
    farmacoVia: 'orale',
    motivo: null,
    note: null,
    createdAt: new Date('2033-04-05T22:15:00Z'),
    updatedAt: new Date('2033-04-05T22:15:00Z'),
    confirmedAt: new Date('2033-04-05T22:15:00Z'),
    ...patch,
  };
}
type Row = ReturnType<typeof record>;
// Interpret Prisma equality/OR/in predicates only; never implement clinical outcome priority.
function matches(row: Record<string, unknown>, where: Record<string, any>): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'OR') return value.some((part: Record<string, any>) => matches(row, part));
    if (value && typeof value === 'object' && 'in' in value) return value.in.includes(row[key]);
    return row[key] === value;
  });
}
function fixture(rows: Row[], prescription = { ...therapy }) {
  const state = {
    rows: structuredClone(rows),
    receipts: [] as any[],
    queries: [] as any[],
    creates: 0,
    updates: [] as string[],
    access: true,
  };
  const tx = {
    patientTherapy: {
      findFirst: async ({ where }: any) => {
        assert.equal(where.id, therapy.id);
        assert.equal(where.patientId, therapy.patientId);
        assert.equal(where.patient.registeredById, actor.id);
        return state.access ? prescription : null;
      },
    },
    patient: { findFirst: async () => (state.access ? { id: therapy.patientId } : null) },
    medicationAdministration: {
      findMany: async ({ where }: any) => {
        state.queries.push(where);
        return state.rows.filter((row) => matches(row, where));
      },
      findUnique: async ({ where }: any) => {
        state.queries.push(where);
        return state.rows.find((row) => matches(row, where.therapyId_date_fascia_ora)) ?? null;
      },
      create: async ({ data }: any) => {
        state.creates++;
        const row = record({ ...data, id: 'new-row' });
        state.rows.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        state.updates.push(where.id);
        const row = state.rows.find((row) => row.id === where.id)!;
        Object.assign(row, data, data.doseContext === Prisma.DbNull ? { doseContext: null } : {});
        return row;
      },
    },
    therapyAdministrationReceipt: {
      findUnique: async ({ where }: any) =>
        state.receipts.find((receipt) => matches(receipt, where.actorId_requestId)) ?? null,
      create: async ({ data }: any) => {
        state.receipts.push(data);
        return data;
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { state, tx };
}
const endpoints = [confirmTherapyAdministration, recordTherapyNotAdministered];
async function denied(
  f: ReturnType<typeof fixture>,
  endpoint: (typeof endpoints)[number],
  patch: Record<string, unknown> = {},
  error: any = TherapyAlreadyAdministeredError,
) {
  const before = structuredClone(f.state.rows);
  await assert.rejects(
    endpoint({ ...body, motivo: 'rifiutata_paziente', ...patch }, actor, f.tx),
    error,
  );
  assert.deepEqual(f.state.rows, before);
  assert.equal(f.state.creates, 0);
  assert.deepEqual(f.state.updates, []);
  assert.equal(f.state.receipts.length, 0);
}

for (const modern of [false, true])
  test(`${modern ? 'modern' : 'legacy'} given blocks both endpoints for every expected state`, async () => {
    for (const endpoint of endpoints)
      for (const expectedStato of ['da_erogare', 'non_erogata', undefined])
        await denied(
          fixture([record({ therapyId: modern ? therapy.id : null })]),
          endpoint,
          { expectedStato },
          endpoint === recordTherapyNotAdministered && expectedStato === 'non_erogata'
            ? TherapyWriteInputError
            : TherapyAlreadyAdministeredError,
        );
  });

test('repairing an untimed prescription does not reopen a cross-band legacy outcome', async () => {
  for (const stato of ['erogata', 'non_erogata']) {
    const prescription = { ...therapy, orarioSomministrazione: null as string | null };
    const f = fixture([record({ stato })], prescription);
    await assert.rejects(confirmTherapyAdministration(body, actor, f.tx));
    assert.deepEqual(f.state.queries, []);
    prescription.orarioSomministrazione = '11:30';
    await denied(
      f,
      confirmTherapyAdministration,
      {},
      stato === 'erogata' ? TherapyAlreadyAdministeredError : TherapyWriteInputError,
    );
  }
});

test('legacy refusal rejects stale pending writes at both endpoints', async () => {
  for (const endpoint of endpoints)
    await denied(fixture([record({ stato: 'non_erogata' })]), endpoint, {}, TherapyWriteInputError);
});

test('explicit refusal correction updates the actual legacy row once and preserves identity', async () => {
  const f = fixture([record({ stato: 'non_erogata', confirmedAt: null })]);
  const corrected = await confirmTherapyAdministration(
    { ...body, expectedStato: 'non_erogata' },
    actor,
    f.tx,
  );
  assert.equal(corrected.id, 'historical-row');
  assert.equal(corrected.therapyId, null);
  assert.equal(corrected.stato, 'erogata');
  assert.equal(corrected.operatoreId, actor.id);
  assert.equal(corrected.operatoreNome, actor.name);
  assert.ok(corrected.confirmedAt);
  assert.equal(corrected.createdAt.toISOString(), '2033-04-05T22:15:00.000Z');
  assert.equal(f.state.rows.length, 1);
  assert.equal(f.state.creates, 0);
  assert.deepEqual(f.state.updates, ['historical-row']);
  const snapshot = structuredClone(f.state.rows);
  await assert.rejects(
    confirmTherapyAdministration({ ...body, expectedStato: 'non_erogata' }, actor, f.tx),
    TherapyAlreadyAdministeredError,
  );
  assert.deepEqual(f.state.rows, snapshot);
});

test('given wins across bands and modern/legacy contradictions irrespective of record order', async () => {
  for (const records of [
    [
      record({ id: 'a-modern-refused', therapyId: therapy.id, stato: 'non_erogata' }),
      record({ id: 'z-legacy-given' }),
    ],
    [
      record({ id: 'z-modern-given', therapyId: therapy.id }),
      record({ id: 'a-legacy-refused', stato: 'non_erogata' }),
    ],
  ])
    for (const endpoint of endpoints)
      for (const rows of [records, [...records].reverse()]) await denied(fixture(rows), endpoint);
});

test('correction chooses modern before legacy then stable id and changes only that row', async () => {
  for (const modern of [false, true]) {
    const rows = [
      record({ id: 'z', stato: 'non_erogata', therapyId: modern ? therapy.id : null }),
      record({ id: 'b', stato: 'non_erogata' }),
      record({ id: 'a', stato: 'non_erogata' }),
    ];
    const f = fixture(rows);
    const selected = modern ? 'z' : 'a';
    const before = structuredClone(f.state.rows);
    const result = await confirmTherapyAdministration(
      { ...body, expectedStato: 'non_erogata' },
      actor,
      f.tx,
    );
    assert.equal(result.id, selected);
    assert.deepEqual(f.state.updates, [selected]);
    assert.deepEqual(
      f.state.rows.filter((row) => row.id !== selected),
      before.filter((row) => row.id !== selected),
    );
    assert.equal(f.state.creates, 0);
  }
});

test('patient, date, exact drug, other non-null therapy and unknown states do not falsely match', async () => {
  for (const patch of [
    { patientId: 'other-patient' },
    { date: '2033-04-05' },
    { farmacoNome: therapy.farmacoNome + ' other' },
    { therapyId: 'other-therapy' },
    { stato: 'unknown' },
  ]) {
    const historical = record(patch);
    const f = fixture([historical]);
    const result = await confirmTherapyAdministration(body, actor, f.tx);
    assert.equal(result.id, 'new-row');
    assert.equal(f.state.creates, 1);
    assert.deepEqual(f.state.rows[0], historical);
  }
});

test('access, invalid clocks, conflicting schedules and required measured dose reject before record lookup', async () => {
  const cases = [
    { ...therapy, orarioSomministrazione: null },
    { ...therapy, orarioSomministrazione: '99:00' },
    { ...therapy, schedules: [{ fascia: 'sera', time: '20:00' }] },
    { ...therapy, doseMode: 'glucose_scale' },
  ];
  for (const prescription of cases) {
    const f = fixture([record()], prescription as typeof therapy);
    await assert.rejects(confirmTherapyAdministration(body, actor, f.tx));
    assert.deepEqual(f.state.queries, []);
    assert.equal(f.state.creates, 0);
  }
  const f = fixture([record()]);
  f.state.access = false;
  await denied(f, confirmTherapyAdministration, {}, TherapyNotFoundError);
  assert.deepEqual(f.state.queries, []);
});

test('single-band and multi-dose hourly guards retain their existing identity', async () => {
  const periodic = {
    ...therapy,
    tipo: 'periodica',
    schedules: [
      {
        time: '11:30',
        fascia: 'pranzo',
        quantityNumerator: 1,
        quantityDenominator: 1,
        administrationUnit: 'compressa',
      },
    ],
  };
  const f = fixture([record({ therapyId: therapy.id, fascia: 'pranzo', ora: '12:00' })], periodic);
  await denied(f, confirmTherapyAdministration);
  const schedules = ['11:30', '12:00'].map((time) => ({
    time,
    fascia: 'pranzo',
    quantityNumerator: 1,
    quantityDenominator: 1,
    administrationUnit: 'compressa',
  }));
  const otherHour = fixture([record({ therapyId: therapy.id, fascia: 'pranzo', ora: '12:00' })], {
    ...periodic,
    schedules,
  });
  assert.equal((await confirmTherapyAdministration(body, actor, otherHour.tx)).id, 'new-row');
  const exact = fixture([record({ therapyId: therapy.id, fascia: 'pranzo', ora: '11:30' })], {
    ...periodic,
    schedules,
  });
  await denied(exact, confirmTherapyAdministration);
});

test('actual keyed transaction saves one correction/receipt, replays immutably and rechecks access', async (t) => {
  const f = fixture([record({ stato: 'non_erogata', confirmedAt: null })]);
  const original = prisma.$transaction;
  t.after(() => {
    (prisma as any).$transaction = original;
  });
  (prisma as any).$transaction = async (
    write: (tx: Prisma.TransactionClient) => unknown,
    options: any,
  ) => {
    assert.equal(options.isolationLevel, 'Serializable');
    const before = structuredClone({ rows: f.state.rows, receipts: f.state.receipts });
    try {
      return await write(f.tx);
    } catch (error) {
      f.state.rows = before.rows;
      f.state.receipts = before.receipts;
      throw error;
    }
  };
  const request = {
    ...body,
    expectedStato: 'non_erogata',
    requestId: '1af3d2bf-d407-4352-9f8b-a0cc396eb16c',
  };
  const initial = await recordTherapyAdministrationResult(request, actor, {
    notAdministered: false,
  });
  const before = structuredClone(f.state.rows);
  const replay = await recordTherapyAdministrationResult(request, actor, {
    notAdministered: false,
  });
  assert.equal(initial.replayed, false);
  assert.equal(replay.replayed, true);
  assert.deepEqual(
    replay.record,
    JSON.parse(JSON.stringify(initial.record), (key, value) =>
      ['createdAt', 'updatedAt', 'confirmedAt'].includes(key) && value ? new Date(value) : value,
    ),
  );
  assert.deepEqual(f.state.rows, before);
  assert.deepEqual(f.state.updates, ['historical-row']);
  assert.equal(f.state.creates, 0);
  assert.equal(f.state.receipts.length, 1);
  await assert.rejects(
    recordTherapyAdministrationResult(
      { ...request, requestId: '3af3d2bf-d407-4352-9f8b-a0cc396eb16c' },
      actor,
      { notAdministered: false },
    ),
    TherapyAlreadyAdministeredError,
  );
  assert.equal(f.state.receipts.length, 1);
  f.state.access = false;
  await assert.rejects(
    recordTherapyAdministrationResult(request, actor, { notAdministered: false }),
    TherapyNotFoundError,
  );
  assert.deepEqual(f.state.rows, before);
  assert.equal(f.state.receipts.length, 1);
});

test('keyed stale legacy writes reject without saving clinical rows or receipts', async (t) => {
  const original = prisma.$transaction;
  t.after(() => {
    (prisma as any).$transaction = original;
  });
  for (const stato of ['erogata', 'non_erogata'])
    for (const notAdministered of [false, true]) {
      const f = fixture([record({ stato })]);
      (prisma as any).$transaction = async (write: (tx: Prisma.TransactionClient) => unknown) =>
        write(f.tx);
      const before = structuredClone(f.state.rows);
      await assert.rejects(
        recordTherapyAdministrationResult(
          { ...body, motivo: 'rifiutata_paziente', requestId: 'keyed-pending-synthetic' },
          actor,
          { notAdministered },
        ),
        stato === 'erogata' ? TherapyAlreadyAdministeredError : TherapyWriteInputError,
      );
      assert.deepEqual(f.state.rows, before);
      assert.equal(f.state.creates, 0);
      assert.deepEqual(f.state.updates, []);
      assert.deepEqual(f.state.receipts, []);
    }
});

test('one-off refusal with omitted expected state rejects without mutation', async () => {
  for (const modern of [false, true])
    await denied(
      fixture([record({ stato: 'non_erogata', therapyId: modern ? therapy.id : null })]),
      confirmTherapyAdministration,
      { expectedStato: undefined },
      TherapyWriteInputError,
    );
});

test('first pending and periodic refusal preserve omitted expected state compatibility', async () => {
  const first = fixture([]);
  assert.equal(
    (await confirmTherapyAdministration({ ...body, expectedStato: undefined }, actor, first.tx)).id,
    'new-row',
  );
  assert.equal(first.state.creates, 1);
  const periodic = fixture(
    [record({ therapyId: therapy.id, stato: 'non_erogata', fascia: 'pranzo', ora: '11:30' })],
    {
      ...therapy,
      tipo: 'periodica',
      schedules: [
        {
          time: '11:30',
          fascia: 'pranzo',
          quantityNumerator: 1,
          quantityDenominator: 1,
          administrationUnit: 'compressa',
        },
      ],
    },
  );
  const corrected = await confirmTherapyAdministration(
    { ...body, expectedStato: undefined },
    actor,
    periodic.tx,
  );
  assert.equal(corrected.id, 'historical-row');
  assert.equal(corrected.stato, 'erogata');
  assert.equal(periodic.state.creates, 0);
  assert.deepEqual(periodic.state.updates, ['historical-row']);
});

test('keyed one-off refusal with omitted expected state rejects without receipt', async (t) => {
  const original = prisma.$transaction;
  t.after(() => {
    (prisma as any).$transaction = original;
  });
  for (const modern of [false, true]) {
    const f = fixture([record({ stato: 'non_erogata', therapyId: modern ? therapy.id : null })]);
    (prisma as any).$transaction = async (write: (tx: Prisma.TransactionClient) => unknown) =>
      write(f.tx);
    const before = structuredClone(f.state.rows);
    await assert.rejects(
      recordTherapyAdministrationResult(
        { ...body, expectedStato: undefined, requestId: 'keyed-omitted-synthetic' },
        actor,
        { notAdministered: false },
      ),
      TherapyWriteInputError,
    );
    assert.deepEqual(f.state.rows, before);
    assert.equal(f.state.creates, 0);
    assert.deepEqual(f.state.updates, []);
    assert.deepEqual(f.state.receipts, []);
  }
});
