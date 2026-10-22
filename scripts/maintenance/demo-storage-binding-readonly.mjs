// Pure binding checks extracted from reviewed maintenance 92931e60. No live transports or cleanup entrypoints.
import { posix } from 'node:path';
import { createHash } from 'node:crypto';
export const TARGET = Object.freeze({
  projectId: 'bddf5d1b-ee83-4362-8238-a79721f795e5',
  environmentId: '8021987e-8eaa-4bc8-a102-20566db5e6b4',
  environmentName: 'demo',
  backendServiceId: 'c000f011-0349-4ea9-9b56-13c625b5767b',
  backendServiceName: 'clinicos-backend',
  domain: 'clinicos-backend-demo.up.railway.app',
  databaseHost: 'postgres.railway.internal',
  database: 'railway',
});
const check = (value, code) => {
  if (!value) throw new Error(code);
};
const uuid = (value) =>
  typeof value === 'string' && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);

function verifyDatabaseUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('DEMO_DATABASE_BINDING_INVALID');
  }
  check(
    ['postgres:', 'postgresql:'].includes(url.protocol) &&
      url.hostname === TARGET.databaseHost &&
      url.pathname === '/' + TARGET.database &&
      Boolean(url.username) &&
      Boolean(url.password),
    'DEMO_DATABASE_BINDING_MISMATCH',
  );
}

export async function verifyDemoBinding(call, api) {
  const config = call(['variables', '--service', TARGET.backendServiceId, '--json'], {
    json: true,
  });
  check(
    config.RAILWAY_PROJECT_ID === TARGET.projectId &&
      config.RAILWAY_ENVIRONMENT_ID === TARGET.environmentId &&
      config.RAILWAY_ENVIRONMENT_NAME === TARGET.environmentName &&
      config.RAILWAY_SERVICE_ID === TARGET.backendServiceId &&
      config.RAILWAY_SERVICE_NAME === TARGET.backendServiceName,
    'DEMO_BINDING_IDENTITY_MISMATCH',
  );
  verifyDatabaseUrl(config.DATABASE_URL);
  const data = await api(
    'query($environmentId:String!,$serviceId:String!){serviceInstance(environmentId:$environmentId,serviceId:$serviceId){domains{serviceDomains{domain} customDomains{domain}}}}',
    { environmentId: TARGET.environmentId, serviceId: TARGET.backendServiceId },
  );
  const domains = data.serviceInstance?.domains;
  check(
    Array.isArray(domains?.serviceDomains) && Array.isArray(domains?.customDomains),
    'DEMO_DOMAIN_RESULT_INVALID',
  );
  check(
    [...domains.serviceDomains, ...domains.customDomains].some((d) => d.domain === TARGET.domain),
    'DEMO_BACKEND_DOMAIN_MISMATCH',
  );
}

function matchingDatabase(left, right) {
  try {
    const a = new URL(left),
      b = new URL(right);
    return (
      ['postgres:', 'postgresql:'].includes(b.protocol) &&
      a.hostname === b.hostname &&
      a.pathname === b.pathname &&
      a.username === b.username &&
      a.password === b.password &&
      (a.port || '5432') === (b.port || '5432')
    );
  } catch {
    return false;
  }
}
export async function inspectStorageBinding(call, native) {
  await verifyDemoBinding(call, native);
  const backend = call(
    [
      'variables',
      '--service',
      TARGET.backendServiceId,
      '--environment',
      TARGET.environmentId,
      '--json',
    ],
    { json: true },
  );
  check(
    !backend.AI_UPLOAD_DIR || backend.AI_UPLOAD_DIR === '/tmp/clinicos-imports',
    'CUSTOM_SOURCE_DIRECTORY_REQUIRES_REVIEW',
  );
  const services = call(
    [
      'service',
      'list',
      '--project',
      TARGET.projectId,
      '--environment',
      TARGET.environmentId,
      '--json',
    ],
    { json: true },
  );
  check(
    Array.isArray(services) && services.length > 0 && services.length <= 20,
    'SERVICE_CATALOG_INVALID',
  );
  const databases = [];
  let databaseConfig;
  for (const service of services.filter((s) => /^postgres(?:ql)?$/i.test(s.name))) {
    const config = call(
      ['variables', '--service', service.id, '--environment', TARGET.environmentId, '--json'],
      { json: true },
    );
    if (
      config.RAILWAY_PROJECT_ID === TARGET.projectId &&
      config.RAILWAY_ENVIRONMENT_ID === TARGET.environmentId &&
      config.RAILWAY_PRIVATE_DOMAIN === TARGET.databaseHost &&
      matchingDatabase(backend.DATABASE_URL, config.DATABASE_URL)
    ) {
      databases.push(service.id);
      databaseConfig = config;
    }
  }
  check(databases.length === 1, 'SOURCE_DATABASE_SERVICE_AMBIGUOUS');
  const data = await native(
    'query($id:String!){environment(id:$id){id projectId volumeInstances(first:100){pageInfo{hasNextPage} edges{node{id volumeId serviceId environmentId mountPath state}}} serviceInstances(first:100){pageInfo{hasNextPage} edges{node{id serviceId serviceName environmentId source{repo image} rootDirectory buildCommand startCommand builder healthcheckPath restartPolicyType restartPolicyMaxRetries numReplicas activeDeployments{id} latestDeployment{id instances{id status}} domains{serviceDomains{domain} customDomains{domain}}}}}}}',
    { id: TARGET.environmentId },
  );
  const environment = data.environment;
  check(
    environment?.id === TARGET.environmentId &&
      environment.projectId === TARGET.projectId &&
      environment.volumeInstances?.pageInfo?.hasNextPage === false &&
      environment.serviceInstances?.pageInfo?.hasNextPage === false &&
      Array.isArray(environment.volumeInstances?.edges) &&
      Array.isArray(environment.serviceInstances?.edges),
    'STORAGE_ENVIRONMENT_UNVERIFIED',
  );
  const volumes = environment.volumeInstances.edges.map((e) => e.node);
  check(
    volumes.every(
      (v) => v.environmentId === TARGET.environmentId && uuid(v.id) && uuid(v.volumeId),
    ),
    'VOLUME_ENVIRONMENT_MISMATCH',
  );
  const databaseVolumes = volumes.filter((v) => v.serviceId === databases[0]);
  // Do not erase unclassified backup/application volumes or claim them empty.
  check(volumes.length === 1 && databaseVolumes.length === 1, 'UNCLASSIFIED_DEMO_VOLUMES');
  verifyDatabaseMount(databaseVolumes[0], databaseConfig);
  const instances = environment.serviceInstances.edges.map((e) => e.node);
  check(
    instances.every((s) => s.environmentId === TARGET.environmentId),
    'SERVICE_ENVIRONMENT_MISMATCH',
  );
  const backendInstance = instances.find((s) => s.serviceId === TARGET.backendServiceId);
  check(backendInstance?.source?.repo === 'l2v-hub/ClinicOS', 'BACKEND_SOURCE_UNVERIFIED');
  const runtime = instances.filter((s) => s.serviceName === 'clinicos-ai-runtime');
  check(
    backendInstance?.latestDeployment?.id &&
      runtime.length === 1 &&
      runtime[0].latestDeployment?.id,
    'RUNTIME_DEPLOYMENT_UNVERIFIED',
  );
  for (const instance of [backendInstance, runtime[0]]) {
    check(
      Array.isArray(instance.activeDeployments) &&
        instance.activeDeployments.length === 1 &&
        instance.activeDeployments[0].id === instance.latestDeployment.id &&
        Array.isArray(instance.latestDeployment.instances),
      'AMBIGUOUS_ACTIVE_DEPLOYMENT',
    );
    const running = instance.latestDeployment.instances.filter((i) => i.status === 'RUNNING');
    check(
      running.length === 1 &&
        typeof running[0].id === 'string' &&
        running[0].id.length > 0 &&
        instance.latestDeployment.instances.every(
          (i) => i.status === 'RUNNING' || TERMINAL.has(i.status),
        ),
      'MULTIPLE_OR_TRANSITIONAL_SERVICE_INSTANCES',
    );
    instance.verifiedInstanceId = running[0].id;
  }
  const runtimeConfig = call(
    [
      'variables',
      '--service',
      runtime[0].serviceId,
      '--environment',
      TARGET.environmentId,
      '--json',
    ],
    { json: true },
  );
  let runtimeOrigin;
  try {
    runtimeOrigin = new URL(backend.AI_RUNTIME_URL);
  } catch {
    throw new Error('RUNTIME_ORIGIN_UNVERIFIED');
  }
  const runtimeDomains = runtime[0].domains;
  const publicRuntimeHost =
    Array.isArray(runtimeDomains?.serviceDomains) &&
    Array.isArray(runtimeDomains?.customDomains) &&
    [...runtimeDomains.serviceDomains, ...runtimeDomains.customDomains].some(
      (d) => d.domain === runtimeOrigin.hostname,
    );
  check(
    runtimeConfig.RAILWAY_PROJECT_ID === TARGET.projectId &&
      runtimeConfig.RAILWAY_ENVIRONMENT_ID === TARGET.environmentId &&
      !runtimeOrigin.username &&
      !runtimeOrigin.password &&
      ((runtimeOrigin.hostname === runtimeConfig.RAILWAY_PRIVATE_DOMAIN &&
        ['http:', 'https:'].includes(runtimeOrigin.protocol)) ||
        (publicRuntimeHost && runtimeOrigin.protocol === 'https:')),
    'RUNTIME_BINDING_MISMATCH',
  );
  check(
    !runtimeConfig.DATABASE_URL && !runtimeConfig.AGNO_DB_URL && !runtimeConfig.STORAGE_URL,
    'EXTERNAL_RUNTIME_PERSISTENCE_REQUIRES_REVIEW',
  );
  return {
    volume: databaseVolumes[0],
    backendInstance,
    runtimeInstance: runtime[0],
    runtimeOrigin: runtimeOrigin.origin,
    runtimePrivate: runtimeOrigin.hostname === runtimeConfig.RAILWAY_PRIVATE_DOMAIN,
    backendConfigHash: configurationHash(backend),
    runtimeConfigHash: configurationHash(runtimeConfig),
  };
}
const TERMINAL = new Set(['CRASHED', 'EXITED', 'REMOVED', 'SKIPPED', 'STOPPED']);
const canonical = (value) =>
  JSON.stringify(value, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((k) => [k, item[k]]),
        )
      : item,
  );
const hash = (value) => createHash('sha256').update(canonical(value)).digest('hex');
function configurationHash(config) {
  return hash(
    Object.fromEntries(Object.entries(config).filter(([key]) => !key.startsWith('RAILWAY_'))),
  );
}
function canonicalAbsolute(value) {
  check(
    typeof value === 'string' && value.startsWith('/') && value !== '/' && !/[\\\x00$]/.test(value),
    'DATABASE_MOUNT_UNVERIFIED',
  );
  const clean = value.replace(/\/$/, '');
  check(
    posix.normalize(clean) === clean && !clean.split('/').includes('..'),
    'DATABASE_MOUNT_UNVERIFIED',
  );
  return clean;
}
export function verifyDatabaseMount(volume, config) {
  const mount = canonicalAbsolute(volume?.mountPath),
    data = canonicalAbsolute(config?.PGDATA),
    injected = canonicalAbsolute(config?.RAILWAY_VOLUME_MOUNT_PATH);
  check(
    volume.state === 'READY' &&
      injected === mount &&
      (data === mount || data.startsWith(mount + '/')),
    'DATABASE_MOUNT_UNVERIFIED',
  );
  return { mountPath: mount, dataDirectory: data };
}
