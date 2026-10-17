import test from 'node:test';
import assert from 'node:assert/strict';
import { TARGET } from '../demo-patient-inventory.mjs';
import {
  runStorageMaintenance,
  inspectStorageBinding,
  verifyDatabaseMount,
  validateBackendHealth,
  validateRuntimeHealth,
  probePrivateRuntime,
} from '../demo-storage-backups.mjs';
const id = (n) => '50000000-0000-4000-8000-' + String(n).padStart(12, '0');
const runtimeId = id(20),
  dbId = id(30),
  backendOld = id(101),
  runtimeOld = id(102),
  backendNew = id(201),
  runtimeNew = id(202);
const roleNames = ['ocr', 'vision', 'command_parser', 'reasoning', 'summary', 'fast'];
const runtimeHealthy = () => ({
  available: true,
  errors: [],
  roles: Object.fromEntries(
    roleNames.map((role) => [role, { model: 'synthetic:model', credentials_present: true }]),
  ),
});
const backendHealthy = () => ({
  status: 'ready',
  authMode: 'demo',
  tier: 'demo',
  checks: { database: 'ok', policy: 'ok' },
});
const env = {
  RAILWAY_TOKEN: 'synthetic-only',
  GITHUB_REF_NAME: 'codex/demo-470-completion',
  GITHUB_RUN_ID: '470',
};
function fixture(mode = 'good') {
  const cloned = new Set(),
    mutations = [],
    http = [];
  const common = {
    RAILWAY_PROJECT_ID: TARGET.projectId,
    RAILWAY_ENVIRONMENT_ID: TARGET.environmentId,
    RAILWAY_ENVIRONMENT_NAME: 'demo',
  };
  const database = 'postgresql://synthetic:local@postgres.railway.internal/railway';
  const config = {
    ...common,
    RAILWAY_SERVICE_ID: TARGET.backendServiceId,
    RAILWAY_SERVICE_NAME: TARGET.backendServiceName,
    DATABASE_URL: database,
    AI_RUNTIME_URL: 'http://ai.railway.internal:8000',
  };
  const runtimeConfig = {
    ...common,
    RAILWAY_SERVICE_ID: runtimeId,
    RAILWAY_PRIVATE_DOMAIN: 'ai.railway.internal',
  };
  const databaseConfig = {
    ...common,
    RAILWAY_SERVICE_ID: dbId,
    RAILWAY_PRIVATE_DOMAIN: TARGET.databaseHost,
    DATABASE_URL: database,
    PGDATA: '/var/lib/postgresql/data/pgdata',
    RAILWAY_VOLUME_MOUNT_PATH: '/var/lib/postgresql/data',
  };
  const services = [
    { id: TARGET.backendServiceId, name: TARGET.backendServiceName },
    { id: runtimeId, name: 'clinicos-ai-runtime' },
    { id: dbId, name: 'Postgres' },
  ];
  const isNew = (service) => cloned.has(service) && mode !== 'old-200';
  const deployment = (service, newer = false) => ({
    id: service === runtimeId ? (newer ? runtimeNew : runtimeOld) : newer ? backendNew : backendOld,
    projectId: TARGET.projectId,
    environmentId: TARGET.environmentId,
    serviceId: service,
    status: 'SUCCESS',
    deploymentStopped:
      !newer && cloned.has(service) && !['old-200', 'old-not-stopped'].includes(mode),
    instances: [
      {
        id: service === runtimeId ? (newer ? id(402) : id(302)) : newer ? id(401) : id(301),
        status:
          !newer && cloned.has(service) && mode !== 'old-instance-running' && mode !== 'old-200'
            ? 'STOPPED'
            : 'RUNNING',
      },
    ],
    meta: {
      commitHash: newer && mode === 'changed-revision' ? 'b'.repeat(40) : 'a'.repeat(40),
      serviceManifest: {
        build: { builder: 'DOCKERFILE' },
        deploy: { restartPolicyType: 'ON_FAILURE' },
      },
    },
  });
  const instance = (service) => {
    const next = deployment(service, isNew(service));
    if (isNew(service) && mode === 'replica-transition')
      next.instances.push({ id: id(999), status: 'INITIALIZING' });
    return {
      id: service,
      serviceId: service,
      serviceName: service === runtimeId ? 'clinicos-ai-runtime' : TARGET.backendServiceName,
      environmentId: TARGET.environmentId,
      source: { repo: 'synthetic/ClinicOS', image: null },
      rootDirectory: service === runtimeId ? 'clinicos-ai-runtime' : '/',
      buildCommand: null,
      startCommand: service === runtimeId ? 'python app.py' : 'node backend/dist/server.js',
      builder: 'DOCKERFILE',
      healthcheckPath: '/health',
      restartPolicyType: 'ON_FAILURE',
      restartPolicyMaxRetries: 3,
      numReplicas: 1,
      activeDeployments: [{ id: next.id }],
      latestDeployment: next,
      domains: { serviceDomains: [], customDomains: [] },
    };
  };
  const call = (args, options) => {
    if (args[0] === 'service') return services;
    if (args[0] === 'variables')
      return args.includes(TARGET.backendServiceId)
        ? {
            ...config,
            ...(cloned.size && mode === 'changed-config' ? { NEW_CONFIG: 'changed' } : {}),
          }
        : args.includes(dbId)
          ? databaseConfig
          : runtimeConfig;
    throw Error('UNEXPECTED_COMMAND');
  };
  const native = async (query, variables) => {
    if (query.includes('deploymentRedeploy')) {
      assert.equal(variables.reuse, true);
      const service = variables.id === backendOld ? TARGET.backendServiceId : runtimeId;
      assert.ok([backendOld, runtimeOld].includes(variables.id));
      cloned.add(service);
      mutations.push({ query, variables });
      return { deploymentRedeploy: deployment(service, true) };
    }
    if (query.includes('deployment(id:')) {
      const service = [runtimeOld, runtimeNew].includes(variables.id)
        ? runtimeId
        : TARGET.backendServiceId;
      return { deployment: deployment(service, [backendNew, runtimeNew].includes(variables.id)) };
    }
    if (query.includes('volumeInstanceBackupList')) return { volumeInstanceBackupList: [] };
    if (query.includes('serviceInstance(environmentId:'))
      return {
        serviceInstance: {
          domains: { serviceDomains: [{ domain: TARGET.domain }], customDomains: [] },
        },
      };
    if (query.includes('environment(id:'))
      return {
        environment: {
          id: TARGET.environmentId,
          projectId: TARGET.projectId,
          volumeInstances: {
            pageInfo: { hasNextPage: false },
            edges: [
              {
                node: {
                  id: id(61),
                  volumeId: id(60),
                  serviceId: dbId,
                  environmentId: TARGET.environmentId,
                  mountPath: '/var/lib/postgresql/data',
                  state: 'READY',
                },
              },
            ],
          },
          serviceInstances: {
            pageInfo: { hasNextPage: false },
            edges: [{ node: instance(TARGET.backendServiceId) }, { node: instance(runtimeId) }],
          },
        },
      };
    throw Error('UNEXPECTED_NATIVE_QUERY');
  };
  const fetchImpl = async (url) => {
    http.push(url);
    return {
      status: 200,
      json: async () =>
        mode === 'invalid-backend'
          ? { status: 'ready', checks: { database: 'fail', policy: 'ok' } }
          : backendHealthy(),
    };
  };
  const runtimeProbe = async () =>
    validateRuntimeHealth(
      mode === 'invalid-runtime' ? { ...runtimeHealthy(), available: false } : runtimeHealthy(),
    );
  return {
    call,
    native,
    fetchImpl,
    runtimeProbe,
    mutations,
    http,
    options: {
      env,
      erase: true,
      call,
      native,
      fetchImpl,
      runtimeProbe,
      now: () => 0,
      wait: async () => {},
    },
  };
}
test('native clone verifies exact existing source/config, both fresh instances, old teardown and real payloads', async () => {
  const f = fixture();
  const result = await runStorageMaintenance(f.options);
  assert.equal(result.sourceStorageVerified, true);
  assert.equal(result.backupsVerified, true);
  assert.equal(f.mutations.length, 2);
  assert.equal(result.replacement.oldInstancesTerminated, true);
  assert.equal(result.replacement.immutableImageDigestClaimed, false);
  assert.equal(result.replacement.method, 'railway-native-clone-of-exact-existing-deployment');
  assert.equal(result.replacement.backendHealth.authMode, 'demo');
  assert.equal(result.replacement.runtimeHealth.available, true);
  assert.ok(f.http.length > 0);
  assert.equal(JSON.stringify(result).includes('synthetic:local@'), false);
});
test('old200, old-not-stopped, surviving old instance, replica transitions and changed source/config cannot pass', async () => {
  for (const mode of [
    'old-200',
    'old-not-stopped',
    'old-instance-running',
    'replica-transition',
    'changed-revision',
    'changed-config',
  ]) {
    const f = fixture(mode),
      result = await runStorageMaintenance(f.options);
    assert.equal(result.sourceStorageVerified, false, mode);
    assert.equal(result.sourceStorageBlocked, true, mode);
    assert.equal(f.http.length, 0, mode + ' cannot use stale health');
  }
});
test('real backend and runtime payload validation rejects stale or degraded success status', async () => {
  for (const mode of ['invalid-backend', 'invalid-runtime']) {
    const f = fixture(mode);
    assert.equal((await runStorageMaintenance(f.options)).sourceStorageVerified, false, mode);
  }
  assert.throws(() => validateBackendHealth({ status: 200 }), /BACKEND_HEALTH_INVALID/);
  for (const body of [
    { available: true, errors: [], roles: {} },
    { ...runtimeHealthy(), errors: ['degraded'] },
    {
      ...runtimeHealthy(),
      roles: { ...runtimeHealthy().roles, ocr: { model: 'model', credentials_present: false } },
    },
  ])
    assert.throws(() => validateRuntimeHealth(body), /RUNTIME_HEALTH_INVALID/);
});
test('database backup mount must be canonical, active and contain actual PGDATA', () => {
  const v = { state: 'READY', mountPath: '/var/lib/postgresql/data' },
    c = {
      PGDATA: '/var/lib/postgresql/data/pgdata',
      RAILWAY_VOLUME_MOUNT_PATH: '/var/lib/postgresql/data',
    };
  assert.equal(verifyDatabaseMount(v, c).dataDirectory, c.PGDATA);
  for (const [volume, config] of [
    [{ ...v, state: 'RESTORING' }, c],
    [{ ...v, mountPath: '/unrelated' }, c],
    [v, { ...c, PGDATA: '/var/lib/postgresql/data/../outside' }],
    [v, { ...c, PGDATA: '/var/lib/postgresql/data-evil' }],
    [v, { ...c, PGDATA: '/var//lib/postgresql/data' }],
    [v, { ...c, RAILWAY_VOLUME_MOUNT_PATH: '/wrong' }],
    [v, { ...c, PGDATA: undefined }],
  ])
    assert.throws(() => verifyDatabaseMount(volume, config), /DATABASE_MOUNT_UNVERIFIED/);
});
test('private health worker is target-bound, secret-free, and always removes owned service after invalid health', async () => {
  for (const valid of [true, false]) {
    let removed = false,
      created = false;
    const calls = [];
    const call = (args, options) => {
      calls.push(args);
      if (args[0] === 'variables')
        return {
          RAILWAY_PROJECT_ID: TARGET.projectId,
          RAILWAY_ENVIRONMENT_ID: TARGET.environmentId,
          RAILWAY_PRIVATE_DOMAIN: 'ai.railway.internal',
        };
      if (args[0] === 'service') return [];
      if (args[0] === 'up') return '';
      if (args[0] === 'logs')
        return JSON.stringify({
          message:
            'CLINICOS_PRIVATE_HEALTH ' +
            JSON.stringify(
              valid ? { available: true, errorCount: 0, roles: roleNames } : { available: false },
            ),
        });
      throw Error('UNEXPECTED_COMMAND');
    };
    const native = async (query, variables, options) => {
      if (query.includes('serviceCreate')) {
        created = true;
        assert.equal(Object.hasOwn(variables.input, 'variables'), false);
        return { serviceCreate: { id: id(900), name: 'clinicos-demo-health-470' } };
      }
      if (query.includes('serviceDelete')) {
        removed = true;
        assert.deepEqual(variables, { id: id(900), environmentId: TARGET.environmentId });
        return { serviceDelete: true };
      }
      throw Error('UNEXPECTED_NATIVE');
    };
    const invoke = () =>
      probePrivateRuntime(
        {
          runtimeOrigin: 'http://ai.railway.internal:8000',
          runtimePrivate: true,
          runtimeInstance: { serviceId: runtimeId },
        },
        { env, call, native, now: () => 0, wait: async () => {} },
      );
    if (valid) assert.equal((await invoke()).available, true);
    else await assert.rejects(invoke(), /PRIVATE_HEALTH_PROBE_FAILED/);
    assert.equal(created, true);
    assert.equal(removed, true);
    assert.equal(
      calls.some((args) => args.includes('production')),
      false,
    );
  }
});

test('unrelated or inactive database mount aborts before any snapshot or redeploy operation', async () => {
  for (const change of [
    (v) => {
      v.mountPath = '/unrelated';
    },
    (v) => {
      v.state = 'RESTORING';
    },
  ]) {
    const f = fixture();
    let sensitiveCalls = 0;
    const native = async (query, variables, options) => {
      if (query.startsWith('mutation') || query.includes('volumeInstanceBackupList'))
        sensitiveCalls++;
      const data = await f.native(query, variables, options);
      if (data.environment) change(data.environment.volumeInstances.edges[0].node);
      return data;
    };
    await assert.rejects(
      runStorageMaintenance({ ...f.options, native }),
      /DATABASE_MOUNT_UNVERIFIED/,
    );
    assert.equal(sensitiveCalls, 0);
  }
});
test('native access failures preserve diagnostic category without exposing raw sensitive errors', async () => {
  for (const message of [
    'STORAGE_API_NOT_AUTHORIZED',
    'STORAGE_API_UNSUPPORTED_OPERATION',
    'SYNTHETIC_SENSITIVE_TOKEN_MUST_NOT_LEAK',
  ]) {
    const f = fixture();
    const native = async (query, ...args) => {
      if (query.includes('deploymentRedeploy')) throw Error(message);
      return f.native(query, ...args);
    };
    const report = await runStorageMaintenance({ ...f.options, native });
    assert.equal(report.sourceStorageVerified, false);
    assert.equal(
      report.sourceStorageBlocker,
      message.startsWith('STORAGE_') ? message : 'DEMO_REPLACEMENT_UNVERIFIED',
    );
    assert.equal(JSON.stringify(report).includes('SENSITIVE_TOKEN'), false);
  }
});

test('missing old instance records cannot substitute for explicit terminal evidence', async () => {
  const f = fixture();
  let redeploys = 0;
  const native = async (query, variables, options) => {
    if (query.includes('deploymentRedeploy')) redeploys++;
    const result = await f.native(query, variables, options);
    if (
      redeploys === 2 &&
      query.includes('deployment(id:') &&
      [backendOld, runtimeOld].includes(variables.id)
    )
      result.deployment.instances = [];
    return result;
  };
  const result = await runStorageMaintenance({ ...f.options, native });
  assert.equal(result.sourceStorageVerified, false);
  assert.equal(f.http.length, 0);
});
