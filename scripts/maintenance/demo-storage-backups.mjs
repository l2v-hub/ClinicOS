// Exact-demo temporary source and native snapshot maintenance. No rows/credentials are emitted.
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { posix, join } from 'node:path';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { TARGET, verifyDemoBinding } from './demo-patient-inventory.mjs';
const check = (value, code) => {
  if (!value) throw new Error(code);
};
const uuid = (value) =>
  typeof value === 'string' && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);

export async function purgeTemporarySources({
  env = process.env,
  erase = false,
  expectedDirectory,
} = {}) {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const os = await import('node:os');
  const fail = (code) => {
    throw new Error(code);
  };
  if (
    env.RAILWAY_PROJECT_ID !== TARGET.projectId ||
    env.RAILWAY_ENVIRONMENT_ID !== TARGET.environmentId ||
    env.RAILWAY_ENVIRONMENT_NAME !== 'demo' ||
    env.RAILWAY_SERVICE_ID !== TARGET.backendServiceId
  )
    fail('SOURCE_RUNTIME_TARGET_MISMATCH');
  const root = expectedDirectory ?? '/tmp/clinicos-imports';
  if (
    path.resolve(env.AI_UPLOAD_DIR?.trim() || path.resolve(os.tmpdir(), 'clinicos-imports')) !==
    root
  )
    fail('UNEXPECTED_SOURCE_DIRECTORY');
  async function inventory() {
    let top;
    try {
      top = await fs.lstat(root);
    } catch (error) {
      if (error.code === 'ENOENT') return { files: 0, directories: 0, bytes: 0 };
      throw error;
    }
    if (!top.isDirectory() || top.isSymbolicLink() || (await fs.realpath(root)) !== root)
      fail('SOURCE_DIRECTORY_UNSAFE');
    let files = 0,
      directories = 0,
      bytes = 0,
      entries = 0;
    async function walk(directory, depth) {
      if (depth > 10) fail('SOURCE_TREE_LIMIT');
      for (const name of await fs.readdir(directory)) {
        if (++entries > 20000) fail('SOURCE_TREE_LIMIT');
        const entry = path.join(directory, name),
          stat = await fs.lstat(entry);
        if (stat.isSymbolicLink()) fail('SOURCE_SYMLINK_REFUSED');
        if (stat.isDirectory()) {
          directories++;
          await walk(entry, depth + 1);
        } else if (stat.isFile()) {
          files++;
          bytes += stat.size;
        } else fail('SOURCE_SPECIAL_FILE_REFUSED');
      }
    }
    await walk(root, 0);
    return { files, directories, bytes };
  }
  const before = await inventory();
  if (erase) await fs.rm(root, { recursive: true, force: true });
  const after = await inventory();
  return {
    sourceDirectoryVerified: true,
    eraseRequested: erase,
    before,
    after,
    empty: after.files === 0 && after.directories === 0,
  };
}
function railway(args, { json = false, timeout = 30000 } = {}) {
  const result = spawnSync('railway', args, {
    encoding: 'utf8',
    timeout,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const diagnostic = String(result.stderr) + ' ' + String(result.stdout);
    const code =
      /project tokens?.*(not supported|unsupported)|not supported.*project tokens?/i.test(
        diagnostic,
      )
        ? 'RAILWAY_PROJECT_TOKEN_SERVICE_ACCESS_UNSUPPORTED'
        : /not authorized|unauthorized|forbidden|permission denied/i.test(diagnostic)
          ? 'RAILWAY_SERVICE_ACCESS_NOT_AUTHORIZED'
          : /no.*ssh.*key|ssh.*key.*(missing|not found|unavailable)/i.test(diagnostic)
            ? 'RAILWAY_SSH_KEY_UNAVAILABLE'
            : 'RAILWAY_STORAGE_ACCESS_REJECTED';
    throw new Error(code);
  }
  if (!json) return result.stdout;
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error('RAILWAY_STORAGE_RESULT_INVALID');
  }
}
async function api(query, variables, { timeout = 30000 } = {}) {
  const response = await fetch('https://backboard.railway.app/graphql/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Project-Access-Token': process.env.RAILWAY_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(timeout),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('STORAGE_API_RESULT_INVALID');
  }
  if (!response.ok || data.errors || !data.data) {
    const diagnostic = Array.isArray(data.errors)
      ? data.errors.map((e) => String(e.message ?? '')).join(' ')
      : '';
    if (
      [401, 403].includes(response.status) ||
      /not authorized|unauthorized|forbidden/i.test(diagnostic)
    )
      throw new Error('STORAGE_API_NOT_AUTHORIZED');
    if (/unknown.*(field|argument)|not supported|unsupported/i.test(diagnostic))
      throw new Error('STORAGE_API_UNSUPPORTED_OPERATION');
    throw new Error('STORAGE_API_REJECTED');
  }
  return data.data;
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
export async function eraseVerifiedSnapshots(
  binding,
  native,
  { erase = false, wait = (ms) => new Promise((r) => setTimeout(r, ms)) } = {},
) {
  const volume = binding.volume;
  check(
    uuid(volume?.id) && uuid(volume.volumeId) && volume.environmentId === TARGET.environmentId,
    'SNAPSHOT_VOLUME_IDENTITY_MISMATCH',
  );
  const list = async () => {
    const data = await native(
      'query($id:String!){volumeInstanceBackupList(volumeInstanceId:$id){id}}',
      { id: volume.id },
    );
    check(
      Array.isArray(data.volumeInstanceBackupList) &&
        data.volumeInstanceBackupList.every((s) => uuid(s.id)),
      'SNAPSHOT_LIST_INVALID',
    );
    return data.volumeInstanceBackupList;
  };
  const before = await list();
  if (erase)
    for (const snapshot of before) {
      const result = await native(
        'mutation($backupId:String!,$instanceId:String!){volumeInstanceBackupDelete(volumeInstanceBackupId:$backupId,volumeInstanceId:$instanceId){workflowId}}',
        { backupId: snapshot.id, instanceId: volume.id },
      );
      check(
        typeof result.volumeInstanceBackupDelete?.workflowId === 'string' &&
          result.volumeInstanceBackupDelete.workflowId.length > 0,
        'SNAPSHOT_DELETE_REJECTED',
      );
    }
  let after = await list();
  for (let i = 0; erase && after.length && i < 20; i++) {
    await wait(1000);
    after = await list();
  }
  if (erase) check(after.length === 0, 'DEMO_SNAPSHOTS_REMAIN');
  return {
    volumeId: volume.volumeId,
    volumeInstanceId: volume.id,
    before: before.length,
    removed: erase ? before.length : 0,
    after: after.length,
    empty: after.length === 0,
  };
}
export async function runStorageMaintenance({
  env = process.env,
  call = railway,
  native = api,
  erase = false,
  now = () => performance.now(),
  wait = (ms) => new Promise((r) => setTimeout(r, ms)),
  fetchImpl = fetch,
  runtimeProbe,
  onRedeploy = () => {},
} = {}) {
  check(
    env.GITHUB_REF_NAME === 'codex/demo-470-completion' && env.RAILWAY_TOKEN,
    'STORAGE_MAINTENANCE_CONTEXT_REQUIRED',
  );
  const deadline = now() + 8 * 60 * 1000;
  const timeout = (requested) => {
    const left = Math.floor(deadline - now());
    check(left > 0, 'STORAGE_DEADLINE_EXCEEDED');
    return Math.min(left, requested);
  };
  const boundedCall = (args, options = {}) =>
    call(args, { ...options, timeout: timeout(options.timeout ?? 30000) });
  const boundedApi = (query, variables) => native(query, variables, { timeout: timeout(30000) });
  const binding = await inspectStorageBinding(boundedCall, boundedApi);
  const report = {
    environmentId: TARGET.environmentId,
    databaseVolumeId: binding.volume.volumeId,
    backupsVerified: false,
    sourceStorageVerified: false,
  };
  try {
    report.nativeSnapshots = await eraseVerifiedSnapshots(binding, boundedApi, {
      erase,
      wait: async (ms) => wait(Math.min(ms, timeout(ms))),
    });
    report.backupsVerified = report.nativeSnapshots.empty;
  } catch (error) {
    report.backupsBlocked = true;
    report.backupBlocker = [
      'SNAPSHOT_DELETE_REJECTED',
      'DEMO_SNAPSHOTS_REMAIN',
      'STORAGE_API_REJECTED',
      'STORAGE_API_NOT_AUTHORIZED',
      'STORAGE_API_UNSUPPORTED_OPERATION',
      'STORAGE_DEADLINE_EXCEEDED',
    ].includes(error.message)
      ? error.message
      : 'DEMO_NATIVE_SNAPSHOT_ACCESS_UNVERIFIED';
  }
  try {
    if (erase) {
      report.sourceStoragePhase = 'native-existing-deployment-replacement';
      report.replacement = await replaceEphemeralServices(binding, {
        call: boundedCall,
        native: boundedApi,
        fetchImpl: (url, options = {}) =>
          fetchImpl(url, { ...options, signal: AbortSignal.timeout(timeout(15000)) }),
        wait: async (ms) => wait(Math.min(ms, timeout(ms))),
        probeRuntime:
          runtimeProbe ??
          ((next) =>
            next.runtimePrivate
              ? probePrivateRuntime(next, { env, call, native, now, operationMs: timeout(120000) })
              : fetchRuntimeHealth(next.runtimeOrigin, fetchImpl, timeout(15000))),
        onRedeploy,
      });
      report.sourceStorageVerified = report.replacement.verified === true;
    }
  } catch (error) {
    report.sourceStorageBlocked = true;
    report.sourceStorageBlocker = SAFE_REPLACEMENT_ERRORS.has(error.message)
      ? error.message
      : 'DEMO_REPLACEMENT_UNVERIFIED';
  }

  return report;
}
const TERMINAL = new Set(['CRASHED', 'EXITED', 'REMOVED', 'SKIPPED', 'STOPPED']);
const SAFE_REPLACEMENT_ERRORS = new Set([
  'STORAGE_API_NOT_AUTHORIZED',
  'STORAGE_API_UNSUPPORTED_OPERATION',
  'STORAGE_API_REJECTED',
  'STORAGE_DEADLINE_EXCEEDED',
  'DEPLOYMENT_TARGET_MISMATCH',
  'DEPLOYMENT_SOURCE_CONFIG_CHANGED',
  'REDEPLOY_UNVERIFIED',
  'REPLACEMENT_NOT_CONVERGED',
  'BACKEND_HEALTH_INVALID',
  'RUNTIME_HEALTH_INVALID',
  'PRIVATE_HEALTH_PROBE_FAILED',
]);
const ROLE_NAMES = ['ocr', 'vision', 'command_parser', 'reasoning', 'summary', 'fast'];
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
function serviceConfiguration(instance) {
  check(
    instance.source && (instance.source.repo || instance.source.image),
    'DEPLOYMENT_SOURCE_CONFIG_CHANGED',
  );
  return Object.fromEntries(
    [
      'serviceId',
      'source',
      'rootDirectory',
      'buildCommand',
      'startCommand',
      'builder',
      'healthcheckPath',
      'restartPolicyType',
      'restartPolicyMaxRetries',
      'numReplicas',
    ].map((key) => [key, instance[key]]),
  );
}
function knownDeploymentMetadata(meta) {
  check(
    meta && typeof meta === 'object' && !Array.isArray(meta),
    'DEPLOYMENT_SOURCE_CONFIG_CHANGED',
  );
  const keys = [
    'commitHash',
    'repo',
    'branch',
    'image',
    'rootDirectory',
    'builder',
    'buildCommand',
    'startCommand',
    'healthcheckPath',
    'serviceManifest',
    'nixpacksConfig',
  ];
  return Object.fromEntries(
    keys.filter((key) => Object.hasOwn(meta, key)).map((key) => [key, meta[key]]),
  );
}
async function readDeployment(native, id, serviceId) {
  const response = await native(
    'query($id:String!){deployment(id:$id){id projectId environmentId serviceId deploymentStopped status instances{id status} meta}}',
    { id },
  );
  const d = response.deployment;
  check(
    d?.id === id &&
      d.projectId === TARGET.projectId &&
      d.environmentId === TARGET.environmentId &&
      d.serviceId === serviceId &&
      Array.isArray(d.instances) &&
      typeof d.deploymentStopped === 'boolean',
    'DEPLOYMENT_TARGET_MISMATCH',
  );
  return d;
}
export function validateBackendHealth(body) {
  check(
    body?.status === 'ready' &&
      body.authMode === 'demo' &&
      body.tier === 'demo' &&
      body.checks?.database === 'ok' &&
      body.checks.policy === 'ok',
    'BACKEND_HEALTH_INVALID',
  );
  return {
    status: 'ready',
    authMode: 'demo',
    tier: 'demo',
    checks: { database: 'ok', policy: 'ok' },
  };
}
export function validateRuntimeHealth(body) {
  if (!(
    body?.available === true &&
    Array.isArray(body.errors) &&
    body.errors.length === 0 &&
    body.roles &&
    typeof body.roles === 'object' &&
    !Array.isArray(body.roles)
  ))
    throw new Error('RUNTIME_HEALTH_INVALID');
  const required = ['ocr', 'vision', 'command_parser', 'reasoning', 'summary', 'fast'];
  if (
    !required.every(
      (name) =>
        body.roles[name]?.credentials_present === true &&
        typeof body.roles[name]?.model === 'string' &&
        body.roles[name].model.length > 0,
    )
  )
    throw new Error('RUNTIME_HEALTH_INVALID');
  if (
    !Object.values(body.roles).every(
      (role) =>
        role?.credentials_present === true &&
        typeof role.model === 'string' &&
        role.model.length > 0,
    )
  )
    throw new Error('RUNTIME_HEALTH_INVALID');
  return { available: true, errorCount: 0, roles: Object.keys(body.roles).sort() };
}
async function fetchRuntimeHealth(origin, fetchImpl, timeout) {
  const response = await fetchImpl(origin + '/v1/runtime/health', {
    signal: AbortSignal.timeout(timeout),
  });
  check(response.status === 200, 'RUNTIME_HEALTH_INVALID');
  return validateRuntimeHealth(await response.json());
}
function oldInstancesStopped(old, frozen) {
  return (
    old.deploymentStopped &&
    old.instances.every((i) => TERMINAL.has(i.status)) &&
    frozen.oldInstanceIds.every((id) =>
      old.instances.some((i) => i.id === id && TERMINAL.has(i.status)),
    )
  );
}
export async function replaceEphemeralServices(
  binding,
  {
    call,
    native,
    fetchImpl = fetch,
    wait,
    probeRuntime,
    onRedeploy = () => {},
    maxPolls = 60,
  } = {},
) {
  const oldInstances = [binding.backendInstance, binding.runtimeInstance];
  const frozen = [];
  for (const instance of oldInstances) {
    const deployment = await readDeployment(
      native,
      instance.latestDeployment.id,
      instance.serviceId,
    );
    check(
      !deployment.deploymentStopped &&
        deployment.instances.filter((i) => i.status === 'RUNNING').length === 1 &&
        deployment.instances.every((i) => i.status === 'RUNNING' || TERMINAL.has(i.status)),
      'REPLACEMENT_NOT_CONVERGED',
    );
    frozen.push({
      serviceId: instance.serviceId,
      oldId: deployment.id,
      oldInstanceIds: deployment.instances.map((i) => i.id),
      metadata: knownDeploymentMetadata(deployment.meta),
      serviceHash: hash(serviceConfiguration(instance)),
    });
  }
  // Recheck exact source/config/persistence immediately before the first mutation.
  const before = await inspectStorageBinding(call, native);
  for (const f of frozen) {
    const instance = [before.backendInstance, before.runtimeInstance].find(
      (i) => i.serviceId === f.serviceId,
    );
    check(
      instance.latestDeployment.id === f.oldId &&
        hash(serviceConfiguration(instance)) === f.serviceHash,
      'DEPLOYMENT_SOURCE_CONFIG_CHANGED',
    );
  }
  check(
    before.backendConfigHash === binding.backendConfigHash &&
      before.runtimeConfigHash === binding.runtimeConfigHash &&
      before.volume.id === binding.volume.id,
    'DEPLOYMENT_SOURCE_CONFIG_CHANGED',
  );
  for (const f of frozen) {
    const response = await native(
      'mutation($id:String!,$reuse:Boolean){deploymentRedeploy(id:$id,usePreviousImageTag:$reuse){id projectId environmentId serviceId}}',
      { id: f.oldId, reuse: true },
    );
    const next = response.deploymentRedeploy;
    check(
      uuid(next?.id) &&
        next.id !== f.oldId &&
        next.projectId === TARGET.projectId &&
        next.environmentId === TARGET.environmentId &&
        next.serviceId === f.serviceId,
      'REDEPLOY_UNVERIFIED',
    );
    f.newId = next.id;
    onRedeploy({
      serviceId: f.serviceId,
      oldDeploymentId: f.oldId,
      newDeploymentId: f.newId,
      environmentId: TARGET.environmentId,
    });
  }
  let converged;
  for (let i = 0; i < maxPolls; i++) {
    await wait(1000);
    let current;
    try {
      current = await inspectStorageBinding(call, native);
    } catch (error) {
      if (
        [
          'AMBIGUOUS_ACTIVE_DEPLOYMENT',
          'MULTIPLE_OR_TRANSITIONAL_SERVICE_INSTANCES',
          'RUNTIME_DEPLOYMENT_UNVERIFIED',
        ].includes(error.message)
      )
        continue;
      throw error;
    }
    let complete = true;
    for (const f of frozen) {
      const instance = [current.backendInstance, current.runtimeInstance].find(
        (s) => s.serviceId === f.serviceId,
      );
      check(
        instance.latestDeployment.id === f.newId &&
          hash(serviceConfiguration(instance)) === f.serviceHash,
        'DEPLOYMENT_SOURCE_CONFIG_CHANGED',
      );
      const old = await readDeployment(native, f.oldId, f.serviceId),
        next = await readDeployment(native, f.newId, f.serviceId);
      check(
        canonical(knownDeploymentMetadata(next.meta)) === canonical(f.metadata),
        'DEPLOYMENT_SOURCE_CONFIG_CHANGED',
      );
      if (
        !oldInstancesStopped(old, f) ||
        f.oldInstanceIds.some((id) => next.instances.some((v) => v.id === id)) ||
        next.deploymentStopped ||
        next.status !== 'SUCCESS' ||
        next.instances.filter((v) => v.status === 'RUNNING').length !== 1 ||
        !next.instances.every((v) => v.status === 'RUNNING' || TERMINAL.has(v.status))
      )
        complete = false;
    }
    check(
      current.volume.id === binding.volume.id &&
        current.backendConfigHash === binding.backendConfigHash &&
        current.runtimeConfigHash === binding.runtimeConfigHash,
      'DEPLOYMENT_SOURCE_CONFIG_CHANGED',
    );
    if (complete) {
      converged = current;
      break;
    }
  }
  check(converged, 'REPLACEMENT_NOT_CONVERGED');
  const response = await fetchImpl('https://' + TARGET.domain + '/ready', {
    signal: AbortSignal.timeout(15000),
  });
  check(response.status === 200, 'BACKEND_HEALTH_INVALID');
  const backendHealth = validateBackendHealth(await response.json());
  const runtimeHealth = await probeRuntime(converged);
  check(
    runtimeHealth?.available === true &&
      runtimeHealth.errorCount === 0 &&
      ROLE_NAMES.every((role) => runtimeHealth.roles?.includes(role)),
    'RUNTIME_HEALTH_INVALID',
  );
  // Health from an old process cannot pass: identity and persistence are checked again afterwards.
  const after = await inspectStorageBinding(call, native);
  for (const f of frozen) {
    const instance = [after.backendInstance, after.runtimeInstance].find(
      (v) => v.serviceId === f.serviceId,
    );
    const old = await readDeployment(native, f.oldId, f.serviceId);
    check(
      instance.latestDeployment.id === f.newId &&
        instance.verifiedInstanceId ===
          [converged.backendInstance, converged.runtimeInstance].find(
            (v) => v.serviceId === f.serviceId,
          ).verifiedInstanceId &&
        hash(serviceConfiguration(instance)) === f.serviceHash &&
        oldInstancesStopped(old, f),
      'REPLACEMENT_NOT_CONVERGED',
    );
  }
  check(
    after.volume.id === binding.volume.id &&
      after.backendConfigHash === binding.backendConfigHash &&
      after.runtimeConfigHash === binding.runtimeConfigHash,
    'DEPLOYMENT_SOURCE_CONFIG_CHANGED',
  );
  return {
    verified: true,
    method: 'railway-native-clone-of-exact-existing-deployment',
    providerAttestation: 'same-existing-code-build-deploy-config',
    immutableImageDigestClaimed: false,
    volumeFreeApplicationServices: true,
    oldInstancesTerminated: true,
    replacements: frozen.map((f) => ({
      serviceId: f.serviceId,
      oldDeploymentId: f.oldId,
      newDeploymentId: f.newId,
      knownSourceConfigHash: hash({ metadata: f.metadata, serviceHash: f.serviceHash }),
    })),
    backendHealth,
    runtimeHealth,
  };
}
export async function probePrivateRuntime(
  binding,
  {
    env,
    call,
    native,
    now = () => performance.now(),
    operationMs = 120000,
    wait = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = {},
) {
  check(
    /^\d+$/.test(env.GITHUB_RUN_ID ?? '') && binding.runtimePrivate,
    'PRIVATE_HEALTH_PROBE_FAILED',
  );
  const endpoint = new URL(binding.runtimeOrigin + '/v1/runtime/health');
  check(
    endpoint.hostname.endsWith('.railway.internal') &&
      !endpoint.username &&
      !endpoint.password &&
      ['http:', 'https:'].includes(endpoint.protocol),
    'PRIVATE_HEALTH_PROBE_FAILED',
  );
  const deadline = now() + Math.min(operationMs, 120000);
  const left = (ms) => {
    const n = Math.floor(deadline - now());
    check(n > 0, 'PRIVATE_HEALTH_PROBE_FAILED');
    return Math.min(n, ms);
  };
  const opApi = (q, v) => native(q, v, { timeout: left(30000) });
  const opCall = (args, options = {}) =>
    call(args, { ...options, timeout: left(options.timeout ?? 30000) });
  const runtimeConfig = opCall(
    [
      'variables',
      '--service',
      binding.runtimeInstance.serviceId,
      '--environment',
      TARGET.environmentId,
      '--json',
    ],
    { json: true },
  );
  check(
    runtimeConfig.RAILWAY_PROJECT_ID === TARGET.projectId &&
      runtimeConfig.RAILWAY_ENVIRONMENT_ID === TARGET.environmentId &&
      runtimeConfig.RAILWAY_PRIVATE_DOMAIN === endpoint.hostname,
    'PRIVATE_HEALTH_PROBE_FAILED',
  );
  const services = opCall(
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
  const name = 'clinicos-demo-health-' + env.GITHUB_RUN_ID;
  check(
    Array.isArray(services) && !services.some((s) => s.name === name),
    'PRIVATE_HEALTH_PROBE_FAILED',
  );
  let id, directory;
  try {
    const created = await opApi(
      'mutation($input:ServiceCreateInput!){serviceCreate(input:$input){id name}}',
      { input: { projectId: TARGET.projectId, environmentId: TARGET.environmentId, name } },
    );
    check(
      uuid(created.serviceCreate?.id) &&
        created.serviceCreate.name === name &&
        !services.some((s) => s.id === created.serviceCreate.id),
      'PRIVATE_HEALTH_PROBE_FAILED',
    );
    id = created.serviceCreate.id;
    console.log(
      JSON.stringify({ ownedPrivateHealthServiceId: id, environmentId: TARGET.environmentId }),
    );
    directory = mkdtempSync(join(tmpdir(), 'clinicos-private-health-'));
    const program = `const expected=${JSON.stringify({ project: TARGET.projectId, environment: TARGET.environmentId, service: id, url: endpoint.href })};\nconst validate=${validateRuntimeHealth.toString()};\ntry{if(process.env.RAILWAY_PROJECT_ID!==expected.project||process.env.RAILWAY_ENVIRONMENT_ID!==expected.environment||process.env.RAILWAY_SERVICE_ID!==expected.service)throw Error();const response=await fetch(expected.url,{signal:AbortSignal.timeout(15000)});if(response.status!==200)throw Error();console.log('CLINICOS_PRIVATE_HEALTH '+JSON.stringify(validate(await response.json())));}catch{console.log('CLINICOS_PRIVATE_HEALTH '+JSON.stringify({available:false}));process.exitCode=1;}`;
    writeFileSync(join(directory, 'probe.mjs'), program);
    writeFileSync(
      join(directory, 'Dockerfile'),
      'FROM node:22-alpine\nWORKDIR /probe\nCOPY probe.mjs ./\nUSER node\nCMD ["node","probe.mjs"]\n',
    );
    writeFileSync(
      join(directory, 'railway.json'),
      JSON.stringify({
        build: { builder: 'DOCKERFILE', dockerfilePath: 'Dockerfile' },
        deploy: { restartPolicyType: 'NEVER' },
      }),
    );
    opCall(
      [
        'up',
        directory,
        '--path-as-root',
        '--service',
        id,
        '--environment',
        TARGET.environmentId,
        '--project',
        TARGET.projectId,
        '--detach',
        '--yes',
        '--json',
      ],
      { timeout: 60000 },
    );
    for (let i = 0; i < 40; i++) {
      await wait(left(1000));
      let raw;
      try {
        raw = opCall(
          [
            'logs',
            '--service',
            id,
            '--environment',
            TARGET.environmentId,
            '--json',
            '--lines',
            '50',
          ],
          { timeout: 5000 },
        );
      } catch {
        continue;
      }
      for (const line of raw.split('\n')) {
        let message;
        try {
          message = JSON.parse(line).message;
        } catch {
          continue;
        }
        if (typeof message !== 'string' || !message.startsWith('CLINICOS_PRIVATE_HEALTH '))
          continue;
        const result = JSON.parse(message.slice('CLINICOS_PRIVATE_HEALTH '.length));
        check(
          result.available === true &&
            result.errorCount === 0 &&
            Array.isArray(result.roles) &&
            ROLE_NAMES.every((role) => result.roles.includes(role)) &&
            result.roles.every((role) => typeof role === 'string' && /^[a-z_]+$/.test(role)),
          'PRIVATE_HEALTH_PROBE_FAILED',
        );
        return { available: true, errorCount: 0, roles: result.roles };
      }
    }
    throw new Error('PRIVATE_HEALTH_PROBE_FAILED');
  } finally {
    if (directory) rmSync(directory, { recursive: true, force: true });
    if (id) {
      const cleanupDeadline = now() + 90000;
      const budget = () => {
        const n = Math.floor(cleanupDeadline - now());
        check(n > 0, 'PRIVATE_HEALTH_PROBE_FAILED');
        return Math.min(n, 30000);
      };
      const removed = await native(
        'mutation($id:String!,$environmentId:String!){serviceDelete(id:$id,environmentId:$environmentId)}',
        { id, environmentId: TARGET.environmentId },
        { timeout: budget() },
      );
      check(removed.serviceDelete === true, 'PRIVATE_HEALTH_PROBE_FAILED');
      const after = call(
        [
          'service',
          'list',
          '--project',
          TARGET.projectId,
          '--environment',
          TARGET.environmentId,
          '--json',
        ],
        { json: true, timeout: budget() },
      );
      check(Array.isArray(after) && !after.some((s) => s.id === id), 'PRIVATE_HEALTH_PROBE_FAILED');
    }
  }
}

async function main() {
  try {
    check(
      process.argv.length === 3 && ['--inspect', '--erase'].includes(process.argv[2]),
      'UNSUPPORTED_STORAGE_OPERATION',
    );
    const report = await runStorageMaintenance({
      erase: process.argv[2] === '--erase',
      onRedeploy: (metadata) => console.log(JSON.stringify({ demoRedeployOwnership: metadata })),
    });
    console.log(JSON.stringify({ demoStorageMaintenance: report }));
    if (!report.backupsVerified || !report.sourceStorageVerified) process.exitCode = 1;
  } catch {
    console.error(
      JSON.stringify({
        demoStorageMaintenanceFailed: true,
        code: 'DEMO_STORAGE_MAINTENANCE_FAILED',
      }),
    );
    process.exitCode = 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
