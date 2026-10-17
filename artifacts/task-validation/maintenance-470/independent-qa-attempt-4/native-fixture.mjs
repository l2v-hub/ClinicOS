// Synthetic native I/O fixture reused transparently from implementation tests; independent assertions are separate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TARGET } from '../../../../scripts/maintenance/demo-patient-inventory.mjs';
import {
  runStorageMaintenance,
  inspectStorageBinding,
  verifyDatabaseMount,
  validateBackendHealth,
  validateRuntimeHealth,
  probePrivateRuntime,
} from '../../../../scripts/maintenance/demo-storage-backups.mjs';
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

export {fixture,env,id,runtimeId,dbId,backendOld,runtimeOld,backendNew,runtimeNew,roleNames,runtimeHealthy};
