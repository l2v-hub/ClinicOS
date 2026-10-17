import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  TARGET,
  verifyRuntime,
  verifyDemoBinding,
  inventoryDatabase,
  parseInventoryLog,
  runInventory,
} from '../demo-patient-inventory.mjs';
const privateUrl = 'postgresql://synthetic:local-only@postgres.railway.internal:5432/railway';
const serviceId = '50000000-0000-4000-8000-000000000470';
const env = {
  RAILWAY_PROJECT_ID: TARGET.projectId,
  RAILWAY_ENVIRONMENT_ID: TARGET.environmentId,
  RAILWAY_ENVIRONMENT_NAME: TARGET.environmentName,
  RAILWAY_SERVICE_ID: serviceId,
  EXPECTED_INVENTORY_SERVICE_ID: serviceId,
  DATABASE_URL: privateUrl,
};
const config = {
  ...env,
  RAILWAY_SERVICE_ID: TARGET.backendServiceId,
  RAILWAY_SERVICE_NAME: TARGET.backendServiceName,
};
const parentEnv = {
  RAILWAY_TOKEN: 'synthetic-not-a-token',
  GITHUB_REF_NAME: 'codex/demo-470-completion',
  GITHUB_RUN_ID: '470',
};
const requiredTables = [
  'AiAuditEvent',
  'Nota',
  'NotaRecipientState',
  'Operator',
  'Patient',
  'User',
];
const makeResult = () => ({
  mode: 'read-only',
  targetVerified: true,
  catalogTables: [...requiredTables].sort(),
  catalogTableCount: requiredTables.length,
  catalogSha256: createHash('sha256')
    .update(JSON.stringify([...requiredTables].sort()))
    .digest('hex'),
  counts: requiredTables.map((table) => ({
    table,
    rows: '0',
    kind:
      table === 'Patient'
        ? 'patient'
        : ['Operator', 'User'].includes(table)
          ? 'preserved'
          : 'mixed',
  })),
  foreignKeys: [],
  linkedCounts: { patientAudits: '0', patientNotes: '0', orphanNoteStates: '0' },
  unclassifiedTables: [],
  patientDataEmpty: true,
  backupsVerified: false,
  deletionPerformed: false,
});
function db({
  tables = requiredTables,
  counts = {},
  linked = {},
  failAt,
  readonly = 'on',
  database = 'railway',
} = {}) {
  const queries = [];
  let ended = false;
  return {
    queries,
    get ended() {
      return ended;
    },
    async connect() {},
    async end() {
      ended = true;
    },
    async query(sql) {
      queries.push(sql);
      if (failAt && sql.includes(failAt))
        throw new Error('synthetic secret database URL must never appear');
      if (sql.startsWith('SELECT current_database')) return { rows: [{ database, readonly }] };
      if (sql.startsWith('SELECT tablename'))
        return { rows: tables.map((tablename) => ({ tablename })) };
      if (sql.startsWith('SELECT source.relname')) return { rows: [] };
      if (sql.includes('WHERE "patientId"')) return { rows: [{ n: linked.audits ?? '0' }] };
      if (sql.includes('coalesce("pazienteId"')) return { rows: [{ n: linked.notes ?? '0' }] };
      if (sql.includes('WHERE NOT EXISTS')) return { rows: [{ n: linked.orphans ?? '0' }] };
      if (sql.startsWith('SELECT count(*)')) {
        const table = sql.match(/public\."([^"]+)"/)?.[1];
        return { rows: [{ n: counts[table] ?? '0' }] };
      }
      return { rows: [] };
    },
  };
}
function controller({
  overrideConfig = {},
  domains = [TARGET.domain],
  failDeploy = false,
  malformedLog = false,
  missingLog = false,
  cleanupPresent = false,
  cleanupRejected = false,
} = {}) {
  const mutations = [];
  let removed = false;
  const call = (args) => {
    if (args[0] === 'variables') return { ...config, ...overrideConfig };
    if (args[0] === 'service') {
      assert.deepEqual(args, [
        'service',
        'list',
        '--environment',
        TARGET.environmentId,
        '--project',
        TARGET.projectId,
        '--json',
      ]);
      return removed && cleanupPresent
        ? [{ id: serviceId, name: 'clinicos-demo-readonly-470' }]
        : [];
    }
    if (args[0] === 'logs')
      return missingLog
        ? ''
        : JSON.stringify({
            message:
              'CLINICOS_DEMO_INVENTORY ' +
              (malformedLog ? '{invalid' : JSON.stringify(makeResult())),
          });
    throw new Error('UNEXPECTED_TEST_COMMAND');
  };
  const api = async (query, variables) => {
    if (query.startsWith('query'))
      return {
        serviceInstance: {
          domains: { serviceDomains: domains.map((domain) => ({ domain })), customDomains: [] },
        },
      };
    mutations.push({ query, variables });
    if (query.includes('serviceCreate'))
      return { serviceCreate: { id: serviceId, name: 'clinicos-demo-readonly-470' } };
    if (query.includes('serviceDelete')) {
      removed = true;
      return { serviceDelete: !cleanupRejected };
    }
    return {};
  };
  const deploy = async () => {
    if (failDeploy) throw new Error('SYNTHETIC_DEPLOY_FAILURE');
  };
  return {
    mutations,
    options: { env: parentEnv, call, api, deploy, wait: async () => {}, maxPolls: 1 },
  };
}
test('runtime refuses every wrong identity before DB connect', async () => {
  for (const override of [
    { RAILWAY_PROJECT_ID: 'wrong' },
    { RAILWAY_ENVIRONMENT_ID: '235fd681-2b0a-4c09-a0c4-04d862a99b38' },
    { RAILWAY_ENVIRONMENT_NAME: 'production' },
    { RAILWAY_SERVICE_ID: TARGET.backendServiceId },
    { DATABASE_URL: privateUrl.replace('postgres.railway.internal', 'public.example') },
    { DATABASE_URL: 'postgresql://u:p@postgres.railway.internal/other' },
  ]) {
    let touched = false;
    await assert.rejects(
      inventoryDatabase(
        {
          connect: async () => {
            touched = true;
          },
        },
        { ...env, ...override },
      ),
    );
    assert.equal(touched, false);
  }
  assert.doesNotThrow(() => verifyRuntime(env));
});
test('private inventory reads aggregate counts and always rolls back/closes', async () => {
  const client = db();
  const result = await inventoryDatabase(client, env);
  assert.equal(result.patientDataEmpty, true);
  assert.equal(result.deletionPerformed, false);
  assert.equal(result.backupsVerified, false);
  assert.equal(client.queries[0], 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  assert.equal(client.queries.at(-1), 'ROLLBACK');
  assert.ok(client.queries.every((q) => /^(BEGIN|SET LOCAL|SELECT|ROLLBACK)/.test(q)));
  assert.ok(
    client.queries
      .filter((q) => q.startsWith('SELECT') && q.includes('public."'))
      .every((q) => q.startsWith('SELECT count(*)::text')),
  );
  assert.equal(client.ended, true);
});
test('non-FK import/draft data, linked notes/audits or orphan states prevent completion', async () => {
  for (const options of [
    { tables: [...requiredTables, 'ImportJob'], counts: { ImportJob: '2' } },
    { tables: [...requiredTables, 'PatientIntakeDraft'], counts: { PatientIntakeDraft: '1' } },
    { counts: { Nota: '1' } },
    { counts: { AiAuditEvent: '1' } },
    { counts: { NotaRecipientState: '1' } },
    { linked: { notes: '1' } },
    { linked: { audits: '1' } },
    { linked: { orphans: '1' } },
    { tables: [...requiredTables, 'UnknownRecord'] },
  ])
    assert.equal((await inventoryDatabase(db(options), env)).patientDataEmpty, false);
});
test('bad DB identity, missing required table or query failure rolls back/closes', async () => {
  for (const options of [
    { readonly: 'off' },
    { database: 'wrong' },
    { tables: ['Patient'] },
    { failAt: 'FROM pg_catalog.pg_tables' },
  ]) {
    const client = db(options);
    await assert.rejects(inventoryDatabase(client, env));
    assert.equal(client.queries.at(-1), 'ROLLBACK');
    assert.equal(client.ended, true);
  }
});
test('parent refuses wrong branch/secret/target/domain without service mutations', async () => {
  for (const options of [
    { overrideConfig: { RAILWAY_ENVIRONMENT_NAME: 'production' } },
    { overrideConfig: { RAILWAY_ENVIRONMENT_ID: 'wrong' } },
    { overrideConfig: { DATABASE_URL: privateUrl.replace('/railway', '/other') } },
    { domains: ['clinicos-backend-production-df88.up.railway.app'] },
  ]) {
    const fixture = controller(options);
    await assert.rejects(runInventory(fixture.options));
    assert.equal(fixture.mutations.length, 0);
  }
  for (const override of [
    { RAILWAY_TOKEN: '' },
    { GITHUB_REF_NAME: 'main' },
    { GITHUB_RUN_ID: '../inject' },
  ]) {
    const fixture = controller();
    await assert.rejects(runInventory({ ...fixture.options, env: { ...parentEnv, ...override } }));
    assert.equal(fixture.mutations.length, 0);
  }
});
test('controller passes a private reference, emits counts only and removes exact temporary service', async () => {
  const fixture = controller();
  const result = await runInventory(fixture.options);
  assert.equal(result.patientDataEmpty, true);
  const created = fixture.mutations.find((m) => m.query.includes('serviceCreate'));
  assert.deepEqual(created.variables.input.variables, {
    DATABASE_URL: '${{clinicos-backend.DATABASE_URL}}',
  });
  assert.equal(created.variables.input.environmentId, TARGET.environmentId);
  const deleted = fixture.mutations.find((m) => m.query.includes('serviceDelete'));
  assert.deepEqual(deleted.variables, { id: serviceId, environmentId: TARGET.environmentId });
  assert.equal(JSON.stringify(result).includes('postgresql:'), false);
});
test('deploy, log-format and timeout failures still remove newly created service', async () => {
  for (const options of [{ failDeploy: true }, { malformedLog: true }, { missingLog: true }]) {
    const fixture = controller(options);
    await assert.rejects(runInventory(fixture.options));
    assert.equal(fixture.mutations.filter((m) => m.query.includes('serviceDelete')).length, 1);
  }
  const fixture = controller({ cleanupPresent: true });
  await assert.rejects(runInventory(fixture.options), /TEMPORARY_SERVICE_CLEANUP_FAILED/);
  const rejected = controller({ cleanupRejected: true });
  await assert.rejects(runInventory(rejected.options), /TEMPORARY_SERVICE_CLEANUP_REJECTED/);
});
test('log projection excludes unexpected rows/credentials and refuses malformed count payloads', () => {
  const data = {
    ...makeResult(),
    DATABASE_URL: 'must-not-be-forwarded',
    rows: [{ patient: 'must-not-be-forwarded' }],
  };
  const result = parseInventoryLog(
    JSON.stringify({ message: 'CLINICOS_DEMO_INVENTORY ' + JSON.stringify(data) }),
  );
  assert.equal(JSON.stringify(result).includes('must-not-be-forwarded'), false);
  data.counts[0].rows = 'secret';
  assert.throws(
    () =>
      parseInventoryLog(
        JSON.stringify({ message: 'CLINICOS_DEMO_INVENTORY ' + JSON.stringify(data) }),
      ),
    /INVENTORY_RESULT_INVALID/,
  );
  assert.equal(parseInventoryLog(JSON.stringify({ message: 'some-unrelated-log' })), null);
});
test('workflow isolates new inventory operation and preserves every existing production guard', () => {
  const yaml = readFileSync(
    new URL('../../../.github/workflows/deploy-backend.yml', import.meta.url),
    'utf8',
  );
  assert.match(
    yaml,
    /demo-inventory:\n    if: github\.ref_name == 'codex\/demo-470-completion' && inputs\.operation == 'demo-inventory'/,
  );
  assert.match(yaml, /RAILWAY_TOKEN: \$\{\{ secrets\.RAILWAY_DEMO_TOKEN \}\}/);
  const demoJob = yaml.split('  demo-inventory:\n')[1].split(/\n  [a-z][a-z-]+:\n/)[0];
  assert.equal((demoJob.match(/timeout-minutes: 1\n/g) ?? []).length, 3);
  assert.match(demoJob, /timeout-minutes: 15\n/);
  assert.ok(
    3 * 60 + 8 * 60 + 90 < 15 * 60,
    'Bounded setup + operation + cleanup must fit job budget',
  );
  for (const job of ['backup-cleanup', 'online-cleanup', 'native-snapshots', 'inspect-worker']) {
    const section = yaml.split('  ' + job + ':\n')[1];
    assert.ok(section);
    assert.match(section.split('\n  ')[0], /codex\/production-inventory-2026-10-13/);
  }
});

test('log validation refuses duplicates, omitted required tables and false empty claims', () => {
  for (const mutate of [
    (r) => r.counts.push(r.counts[0]),
    (r) => r.counts.splice(0, 1),
    (r) => {
      r.counts.find((t) => t.table === 'Nota').rows = '1';
    },
    (r) => {
      r.counts.find((t) => t.table === 'Patient').kind = 'preserved';
    },
    (r) => r.counts.push({ table: 'UnknownData', rows: '0', kind: 'unclassified' }),
  ]) {
    const result = makeResult();
    mutate(result);
    assert.throws(() =>
      parseInventoryLog(
        JSON.stringify({ message: 'CLINICOS_DEMO_INVENTORY ' + JSON.stringify(result) }),
      ),
    );
  }
});

test('worker freezes actual catalog metadata before counting, with deterministic table manifest', async () => {
  const tables = [...requiredTables, 'ImportJob', 'PatientIntakeDraft'].reverse();
  const client = db({ tables });
  const result = await inventoryDatabase(client, env);
  const expectedCatalog = [...tables].sort();
  assert.deepEqual(result.catalogTables, expectedCatalog);
  assert.equal(result.catalogTableCount, expectedCatalog.length);
  assert.equal(
    result.catalogSha256,
    createHash('sha256').update(JSON.stringify(expectedCatalog)).digest('hex'),
  );
  const catalogQuery = client.queries.findIndex((q) =>
    q.startsWith('SELECT tablename FROM pg_catalog.pg_tables'),
  );
  const firstCountQuery = client.queries.findIndex((q) => q.startsWith('SELECT count(*)'));
  assert.ok(catalogQuery >= 0 && catalogQuery < firstCountQuery);
  assert.deepEqual(
    result.counts.map((t) => t.table),
    expectedCatalog,
  );
});

test('parent rejects omitted ImportJob counts while preserving the actual original catalog header', async () => {
  const original = await inventoryDatabase(
    db({ tables: [...requiredTables, 'ImportJob'], counts: { ImportJob: '2' } }),
    env,
  );
  const omitted = structuredClone(original);
  omitted.counts = omitted.counts.filter((t) => t.table !== 'ImportJob');
  omitted.patientDataEmpty = true;
  assert.deepEqual(omitted.catalogTables, original.catalogTables);
  assert.equal(omitted.catalogTableCount, original.catalogTableCount);
  assert.equal(omitted.catalogSha256, original.catalogSha256);
  assert.throws(
    () =>
      parseInventoryLog(
        JSON.stringify({ message: 'CLINICOS_DEMO_INVENTORY ' + JSON.stringify(omitted) }),
      ),
    /INVENTORY_RESULT_TABLES_INVALID/,
  );
});

test('parent rejects inconsistent catalog counts/digests, duplicate headers and extra count tables', () => {
  for (const mutate of [
    (result) => {
      result.catalogTableCount++;
    },
    (result) => {
      result.catalogSha256 = '0'.repeat(64);
    },
    (result) => {
      result.catalogTables.reverse();
    },
    (result) => {
      result.catalogTables.push(result.catalogTables[0]);
      result.catalogTables.sort();
      result.catalogTableCount = result.catalogTables.length;
      result.catalogSha256 = createHash('sha256')
        .update(JSON.stringify(result.catalogTables))
        .digest('hex');
    },
    (result) => {
      result.counts.push({ table: 'ImportJob', rows: '0', kind: 'patient' });
    },
  ]) {
    const result = makeResult();
    mutate(result);
    assert.throws(() =>
      parseInventoryLog(
        JSON.stringify({ message: 'CLINICOS_DEMO_INVENTORY ' + JSON.stringify(result) }),
      ),
    );
  }
});

test('unknown actual tables stay unclassified and prevent empty claim even with consistent manifest/counts', async () => {
  const result = await inventoryDatabase(
    db({ tables: [...requiredTables, 'UnknownClinicalRecord'] }),
    env,
  );
  assert.equal(result.patientDataEmpty, false);
  const valid = parseInventoryLog(
    JSON.stringify({ message: 'CLINICOS_DEMO_INVENTORY ' + JSON.stringify(result) }),
  );
  assert.equal(valid.patientDataEmpty, false);
  assert.deepEqual(valid.unclassifiedTables, ['UnknownClinicalRecord']);
  const falseEmpty = structuredClone(result);
  falseEmpty.patientDataEmpty = true;
  assert.throws(
    () =>
      parseInventoryLog(
        JSON.stringify({ message: 'CLINICOS_DEMO_INVENTORY ' + JSON.stringify(falseEmpty) }),
      ),
    /INVENTORY_RESULT_EMPTY_CLAIM_INVALID/,
  );
  const misclassified = structuredClone(result);
  misclassified.counts.find((t) => t.table === 'UnknownClinicalRecord').kind = 'preserved';
  assert.throws(
    () =>
      parseInventoryLog(
        JSON.stringify({ message: 'CLINICOS_DEMO_INVENTORY ' + JSON.stringify(misclassified) }),
      ),
    /INVENTORY_RESULT_CLASSIFICATION_INVALID/,
  );
});

test('global monotonic deadline includes deploy and slow/failing logs, preserving bounded cleanup', async () => {
  for (const failLogs of [false, true]) {
    const fixture = controller({ missingLog: true });
    let clock = 0;
    let logCalls = 0;
    let deploymentIncluded = false;
    let cleanupCalledAfterDeadline = false;
    const owned = [];
    const api = async (query, variables, options) => {
      assert.ok(options.timeout > 0 && options.timeout <= 30000);
      if (query.includes('serviceDelete')) cleanupCalledAfterDeadline = clock >= 480000;
      clock += 1000;
      return fixture.options.api(query, variables);
    };
    const call = (args, options) => {
      if (args[0] === 'up') {
        assert.ok(options.timeout > 0 && options.timeout <= 120000);
        clock += options.timeout;
        deploymentIncluded = true;
        return '';
      }
      if (args[0] === 'logs') {
        logCalls++;
        assert.ok(options.timeout > 0 && options.timeout <= 5000);
        clock += options.timeout;
        if (failLogs) throw new Error('SYNTHETIC_LOG_TIMEOUT');
      }
      return fixture.options.call(args, options);
    };
    await assert.rejects(
      runInventory({
        ...fixture.options,
        api,
        call,
        maxPolls: 60,
        now: () => clock,
        deploy: async ({ call }) => {
          call(['up'], { timeout: 120000 });
        },
        wait: async (ms) => {
          clock += ms;
        },
        onOwnedService: (metadata) => owned.push(metadata),
      }),
      /INVENTORY_OPERATION_DEADLINE_EXCEEDED/,
    );
    assert.equal(deploymentIncluded, true);
    assert.ok(logCalls > 0 && logCalls < 60);
    assert.equal(cleanupCalledAfterDeadline, true);
    assert.ok(clock <= 480000 + 90000);
    assert.deepEqual(owned, [{ serviceId, environmentId: TARGET.environmentId }]);
    assert.equal(fixture.mutations.filter((m) => m.query.includes('serviceDelete')).length, 1);
  }
});

test('API timeout is capped by remaining operation time and cleanup gets its own budget', async () => {
  const fixture = controller();
  let clock = 0;
  let deployCalled = false;
  const api = async (query, variables, options) => {
    if (query.includes('serviceCreate')) clock = 479990;
    if (query.includes('variableCollectionUpsert')) {
      assert.equal(options.timeout, 10);
      clock += 10;
    }
    if (query.includes('serviceDelete')) assert.equal(options.timeout, 30000);
    return fixture.options.api(query, variables);
  };
  await assert.rejects(
    runInventory({
      ...fixture.options,
      api,
      now: () => clock,
      deploy: async () => {
        deployCalled = true;
      },
    }),
    /INVENTORY_OPERATION_DEADLINE_EXCEEDED/,
  );
  assert.equal(deployCalled, false);
  assert.equal(fixture.mutations.filter((m) => m.query.includes('serviceDelete')).length, 1);
});

test('deploy overrun triggers exact-service cleanup before polling', async () => {
  const fixture = controller();
  let clock = 0;
  let logCalls = 0;
  await assert.rejects(
    runInventory({
      ...fixture.options,
      now: () => clock,
      deploy: async () => {
        clock += 480001;
      },
      call: (args, options) => {
        if (args[0] === 'logs') logCalls++;
        return fixture.options.call(args, options);
      },
    }),
    /INVENTORY_OPERATION_DEADLINE_EXCEEDED/,
  );
  assert.equal(logCalls, 0);
  assert.equal(fixture.mutations.filter((m) => m.query.includes('serviceDelete')).length, 1);
});
