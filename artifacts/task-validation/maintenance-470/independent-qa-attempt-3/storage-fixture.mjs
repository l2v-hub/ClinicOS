import { TARGET } from '../../../../scripts/maintenance/demo-patient-inventory.mjs';
const uuid='50000000-0000-4000-8000-000000000470', backupId='50000000-0000-4000-8000-000000000471';
function storageFixture({
  publicRuntime = false,
  extraVolume = false,
  wrongDatabase = false,
  wrongRuntime = false,
  customDirectory = false,
  externalPersistence = false,
} = {}) {
  const dbId = '50000000-0000-4000-8000-000000000472',
    runtimeId = '50000000-0000-4000-8000-000000000473';
  const common = {
    RAILWAY_PROJECT_ID: TARGET.projectId,
    RAILWAY_ENVIRONMENT_ID: TARGET.environmentId,
    RAILWAY_ENVIRONMENT_NAME: 'demo',
  };
  const backend = {
    ...common,
    RAILWAY_SERVICE_ID: TARGET.backendServiceId,
    RAILWAY_SERVICE_NAME: TARGET.backendServiceName,
    DATABASE_URL: 'postgresql://synthetic:local@postgres.railway.internal/railway',
    AI_RUNTIME_URL: wrongRuntime
      ? 'http://unrelated.railway.internal:8000'
      : publicRuntime
        ? 'https://synthetic-runtime-demo.up.railway.app'
        : 'http://ai.railway.internal:8000',
    ...(customDirectory ? { AI_UPLOAD_DIR: '/unsafe' } : {}),
  };
  const services = [
    { id: TARGET.backendServiceId, name: TARGET.backendServiceName },
    { id: dbId, name: 'Postgres' },
    { id: runtimeId, name: 'clinicos-ai-runtime' },
  ];
  const call = (args) =>
    args[0] === 'service'
      ? services
      : args.includes(TARGET.backendServiceId)
        ? backend
        : args.includes(dbId)
          ? {
              ...common,
              RAILWAY_PRIVATE_DOMAIN: TARGET.databaseHost,
              DATABASE_URL: wrongDatabase
                ? backend.DATABASE_URL.replace('local@', 'different@')
                : backend.DATABASE_URL,
            }
          : {
              ...common,
              RAILWAY_PRIVATE_DOMAIN: 'ai.railway.internal',
              ...(externalPersistence ? { DATABASE_URL: backend.DATABASE_URL } : {}),
            };
  const native = async (query) =>
    query.includes('serviceInstance(environmentId:')
      ? {
          serviceInstance: {
            domains: { serviceDomains: [{ domain: TARGET.domain }], customDomains: [] },
          },
        }
      : {
          environment: {
            id: TARGET.environmentId,
            projectId: TARGET.projectId,
            volumeInstances: {
              pageInfo: { hasNextPage: false },
              edges: [
                {
                  node: {
                    id: uuid,
                    volumeId: uuid,
                    serviceId: dbId,
                    environmentId: TARGET.environmentId,
                    mountPath: '/var/lib/postgresql/data',
                  },
                },
                ...(extraVolume
                  ? [
                      {
                        node: {
                          id: backupId,
                          volumeId: backupId,
                          serviceId: TARGET.backendServiceId,
                          environmentId: TARGET.environmentId,
                          mountPath: '/uploads',
                        },
                      },
                    ]
                  : []),
              ],
            },
            serviceInstances: {
              pageInfo: { hasNextPage: false },
              edges: services
                .filter((s) => s.id !== dbId)
                .map((s) => ({
                  node: {
                    serviceId: s.id,
                    serviceName: s.name,
                    environmentId: TARGET.environmentId,
                    domains: {
                      serviceDomains: [{ domain: 'synthetic-runtime-demo.up.railway.app' }],
                      customDomains: [],
                    },
                    activeDeployments: [{ id: uuid }],
                    latestDeployment: { id: uuid, instances: [{ id: uuid, status: 'RUNNING' }] },
                  },
                })),
            },
          },
        };
  return { call, native };
}

export {storageFixture};
