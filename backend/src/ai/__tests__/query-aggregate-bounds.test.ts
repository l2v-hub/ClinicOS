import assert from 'node:assert/strict';
import test from 'node:test';

// Prisma construction requires a syntactically valid URL, but these contract tests never connect.
process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:9/clinicos_contract';

const {
  MAX_AGGREGATE_GROUPS,
  boundAggregateGroups,
  boundedAggregateGroupArgs,
  boundedDistinctCountArgs,
  runQueryPlan,
} = await import('../gateway/query/engine.js');
const { validateQueryPlan } = await import('../gateway/query/validate.js');
const { prisma } = await import('../../lib/prisma.js');

const CTX = {
  userId: 'operator-1',
  tenantId: 'clinicos',
  roles: ['operatore'],
  permittedPatientIds: null,
  requestId: 'aggregate-bounds',
};
const ENV = { AI_FACILITY_QUERIES_ENABLED: 'true', AI_DEFAULT_TENANT: 'clinicos' };

test('query_data groupBy fetches one bounded sentinel page with stable ordering and intact ACL', () => {
  const where = { patientId: 'patient-1', operatorId: 'operator-1' };
  assert.deepEqual(boundedAggregateGroupArgs(['status', 'operatorId'], where, 5000), {
    by: ['status', 'operatorId'],
    where,
    _count: true,
    orderBy: [{ status: 'asc' }, { operatorId: 'asc' }],
    take: MAX_AGGREGATE_GROUPS + 1,
  });
  assert.equal(boundedAggregateGroupArgs(['status'], where, 25).take, 26);
  assert.deepEqual(boundedDistinctCountArgs('patientId', where), {
    by: ['patientId'],
    where,
    orderBy: { patientId: 'asc' },
    take: MAX_AGGREGATE_GROUPS + 1,
  });
});

test('query_data groupBy returns at most 200 groups and declares a partial result', () => {
  const groups = Array.from({ length: MAX_AGGREGATE_GROUPS + 1 }, (_, index) => ({ index }));
  const bounded = boundAggregateGroups(groups, 5000);
  assert.equal(bounded.rows.length, MAX_AGGREGATE_GROUPS);
  assert.deepEqual(bounded.rows.at(-1), { index: MAX_AGGREGATE_GROUPS - 1 });
  assert.equal(bounded.truncated, true);

  const exact = boundAggregateGroups(groups.slice(0, MAX_AGGREGATE_GROUPS), 5000);
  assert.equal(exact.rows.length, MAX_AGGREGATE_GROUPS);
  assert.equal(exact.truncated, false);
});

test('query_data engine applies the sentinel query and exact distinct count without a database', async () => {
  interface StubDelegate {
    groupBy(input: unknown): Promise<unknown[]>;
  }
  const delegate = prisma.appointment as unknown as StubDelegate;
  const originalGroupBy = delegate.groupBy;
  const groupByCalls: unknown[] = [];
  delegate.groupBy = async (input) => {
    groupByCalls.push(input);
    const by = (input as { by?: string[] }).by;
    return by?.[0] === 'patientId'
      ? [{ patientId: 'patient-1' }, { patientId: 'patient-2' }]
      : [{ status: 'A' }, { status: 'B' }, { status: 'C' }];
  };

  try {
    const groupedPlan = validateQueryPlan({
      steps: [
        {
          id: 'groups',
          from: 'appointment',
          filter: [{ field: 'reason', op: 'eq', value: 'visita' }],
          aggregate: { op: 'count', groupBy: ['status'] },
          limit: 2,
        },
      ],
    });
    assert.ok(groupedPlan);
    const grouped = await runQueryPlan(groupedPlan, CTX, ENV);
    assert.deepEqual(grouped.rows, [{ status: 'A' }, { status: 'B' }]);
    assert.equal(grouped.truncated, true);
    assert.deepEqual(groupByCalls[0], {
      by: ['status'],
      where: { reason: 'visita' },
      _count: true,
      orderBy: [{ status: 'asc' }],
      take: 3,
    });

    const distinctPlan = validateQueryPlan({
      steps: [
        {
          id: 'distinct',
          from: 'appointment',
          aggregate: { op: 'countDistinct', field: 'patientId' },
        },
      ],
    });
    assert.ok(distinctPlan);
    const distinct = await runQueryPlan(distinctPlan, CTX, ENV);
    assert.deepEqual(distinct.rows, [{ value: 2 }]);
    assert.deepEqual(groupByCalls[1], {
      by: ['patientId'],
      where: {},
      orderBy: { patientId: 'asc' },
      take: MAX_AGGREGATE_GROUPS + 1,
    });

    delegate.groupBy = async () =>
      Array.from({ length: MAX_AGGREGATE_GROUPS + 1 }, (_, index) => ({ patientId: `${index}` }));
    await assert.rejects(
      () => runQueryPlan(distinctPlan, CTX, ENV),
      /conteggio distinto troppo ampio|restringere/i,
    );
  } finally {
    delegate.groupBy = originalGroupBy;
  }
});

test('query_data validation permits two unique scalar grouping keys and rejects wider plans', () => {
  const plan = (groupBy: string[]) => ({
    steps: [
      {
        id: 'groups',
        from: 'appointment',
        aggregate: { op: 'count', groupBy },
      },
    ],
  });
  assert.ok(validateQueryPlan(plan(['status', 'patientId'])));
  assert.equal(validateQueryPlan(plan(['status', 'patientId', 'scheduledAt'])), null);
  assert.equal(validateQueryPlan(plan(['status', 'status'])), null);
  assert.equal(
    validateQueryPlan({
      steps: [{ id: 'groups', from: 'appointment', aggregate: { op: 'count', groupBy: {} } }],
    }),
    null,
  );
  for (const field of [{}, 3, ['status']]) {
    assert.equal(
      validateQueryPlan({
        steps: [
          {
            id: 'distinct',
            from: 'appointment',
            aggregate: { op: 'countDistinct', field },
          },
        ],
      }),
      null,
    );
  }
  assert.equal(
    validateQueryPlan({
      steps: [{ id: 'groups', from: 'appointment', aggregate: { op: 'count', groupBy: [3] } }],
    }),
    null,
  );
  assert.equal(
    validateQueryPlan({
      steps: [
        {
          id: 'groups',
          from: 'appointment',
          aggregate: { op: 'min', field: 'scheduledAt', groupBy: ['status'] },
        },
      ],
    }),
    null,
  );
});
