// Dedicated diagnostic. All provider access passes finite read-only allowlists.
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { inspectStorageBinding } from './demo-storage-backups.mjs';
import { TARGET } from './demo-patient-inventory.mjs';

export const BRANCH = 'codex/demo-470-completion';
export const REPOSITORY = 'l2v-hub/ClinicOS';
export const ENDPOINT = 'https://backboard.railway.app/graphql/v2';
export const HEAD_ENDPOINT = `https://api.github.com/repos/${REPOSITORY}/git/ref/heads/${BRANCH}`;
export const QUERIES = Object.freeze({
  identity: 'query{projectToken{project{id} environment{id name}}}',
  domain: 'query($environmentId:String!,$serviceId:String!){serviceInstance(environmentId:$environmentId,serviceId:$serviceId){domains{serviceDomains{domain} customDomains{domain}}}}',
  environment: 'query($id:String!){environment(id:$id){id projectId volumeInstances(first:100){pageInfo{hasNextPage} edges{node{id volumeId serviceId environmentId mountPath state}}} serviceInstances(first:100){pageInfo{hasNextPage} edges{node{id serviceId serviceName environmentId source{repo image} rootDirectory buildCommand startCommand builder healthcheckPath restartPolicyType restartPolicyMaxRetries numReplicas activeDeployments{id} latestDeployment{id instances{id status}} domains{serviceDomains{domain} customDomains{domain}}}}}}}',
  snapshots: 'query($id:String!){volumeInstanceBackupList(volumeInstanceId:$id){id}}',
});
const HELPER_CODES = new Set([
  'DEMO_BINDING_IDENTITY_MISMATCH', 'DEMO_DATABASE_BINDING_INVALID',
  'DEMO_DATABASE_BINDING_MISMATCH', 'DEMO_DOMAIN_RESULT_INVALID',
  'DEMO_BACKEND_DOMAIN_MISMATCH', 'CUSTOM_SOURCE_DIRECTORY_REQUIRES_REVIEW',
  'SERVICE_CATALOG_INVALID', 'SOURCE_DATABASE_SERVICE_AMBIGUOUS',
  'STORAGE_ENVIRONMENT_UNVERIFIED', 'VOLUME_ENVIRONMENT_MISMATCH',
  'UNCLASSIFIED_DEMO_VOLUMES', 'DATABASE_MOUNT_UNVERIFIED',
  'SERVICE_ENVIRONMENT_MISMATCH', 'RUNTIME_DEPLOYMENT_UNVERIFIED',
  'AMBIGUOUS_ACTIVE_DEPLOYMENT', 'MULTIPLE_OR_TRANSITIONAL_SERVICE_INSTANCES',
  'RUNTIME_ORIGIN_UNVERIFIED', 'RUNTIME_BINDING_MISMATCH',
  'EXTERNAL_RUNTIME_PERSISTENCE_REQUIRES_REVIEW',
]);
const PHASES = new Set([
  'CONTEXT', 'BRANCH_BEFORE', 'TOKEN_IDENTITY', 'BACKEND_IDENTITY', 'BACKEND_DOMAIN',
  'BACKEND_CONFIG', 'SERVICE_CATALOG', 'DATABASE_CONFIG', 'ENVIRONMENT_METADATA',
  'RUNTIME_CONFIG', 'BINDING', 'BINDING_COMPARE', 'SNAPSHOTS_BEFORE', 'SNAPSHOTS_AFTER', 'BRANCH_AFTER',
  'RECEIPT',
]);
const UUID = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}(?![\s\S])/i;
const SHA = /^[a-f\d]{40}(?![\s\S])/;
const POSITIVE = /^[1-9][0-9]{0,19}(?![\s\S])/;
const SECRET = /(?:gh[pousr]_|github_pat_|sk-(?:ant-|proj-)|eyJ[A-Za-z0-9_-]{10,}\.)/;
const MAX_BYTES = 4 * 1024 * 1024;
const TERMINAL = new Set(['CRASHED', 'EXITED', 'REMOVED', 'SKIPPED', 'STOPPED']);
const receipts = new WeakMap();
const contexts = new WeakSet();
const plain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const uuid = (v) => typeof v === 'string' && UUID.test(v);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const exactVariables = (actual, expected) => plain(actual) &&
  Object.keys(actual).length === Object.keys(expected).length &&
  Object.entries(expected).every(([key, value]) => actual[key] === value);
const canonical = (value) => JSON.stringify(value, (_key, item) => plain(item)
  ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]])) : item);

class ReadError extends Error {
  constructor(code) { super(code); this.code = code; }
}
const requireRead = (condition, code) => { if (!condition) throw new ReadError(code); };
const freeze = (v) => {
  if (v && typeof v === 'object') {
    for (const child of Object.values(v)) freeze(child);
    Object.freeze(v);
  }
  return v;
};

export function validateContext(env, args = []) {
  requireRead(args.length === 0 && env.GITHUB_EVENT_NAME === 'workflow_dispatch' &&
    env.GITHUB_REPOSITORY === REPOSITORY && env.GITHUB_REF === `refs/heads/${BRANCH}` &&
    env.GITHUB_REF_NAME === BRANCH && env.DEMO_STORAGE_OPERATION === 'demo-storage-inspect' &&
    SHA.test(env.GITHUB_SHA ?? '') && env.DEMO_STORAGE_REVIEWED_SHA === env.GITHUB_SHA &&
    POSITIVE.test(env.GITHUB_RUN_ID ?? '') && POSITIVE.test(env.GITHUB_RUN_ATTEMPT ?? ''),
  'READONLY_CONTEXT_REQUIRED');
  requireRead(typeof env.RAILWAY_TOKEN === 'string' && Boolean(env.RAILWAY_TOKEN.trim()) &&
    typeof env.GITHUB_TOKEN === 'string' && Boolean(env.GITHUB_TOKEN.trim()), 'READONLY_BINDING_MISSING');
  const context = freeze({ repository: REPOSITORY, branch: BRANCH, reviewedSha: env.GITHUB_SHA,
    runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT });
  contexts.add(context);
  return context;
}

async function boundedJson(response, endpoint, budget) {
  requireRead(response && response.redirected !== true &&
    (!response.url || response.url === endpoint), 'READONLY_REDIRECT_REFUSED');
  if (response.ok !== true) {
    const status = response.status;
    throw new ReadError([400, 401, 403, 404, 429].includes(status)
      ? `READONLY_HTTP_${status}` : Number.isInteger(status) && status >= 500 && status <= 599
        ? 'READONLY_HTTP_5XX' : 'READONLY_HTTP_OTHER');
  }
  requireRead(response.body && typeof response.body[Symbol.asyncIterator] === 'function',
    'READONLY_RESPONSE_INVALID');
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    budget();
    bytes += chunk.byteLength;
    requireRead(bytes <= MAX_BYTES, 'READONLY_RESPONSE_TOO_LARGE');
    chunks.push(Buffer.from(chunk));
  }
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ReadError('READONLY_JSON_INVALID'); }
  requireRead(plain(body), 'READONLY_RESPONSE_INVALID');
  return body;
}

// The only live transports. No mutation-capable helper transport is imported.
export function createReadOnlyAccess({ env, context, fetchImpl = fetch, spawnImpl = spawnSync,
  now = () => performance.now() }) {
  requireRead(contexts.has(context) && context.reviewedSha === env.GITHUB_SHA,
    'READONLY_CONTEXT_REQUIRED');
  const deadline = now() + 8 * 60 * 1000;
  const state = { phase: 'CONTEXT', cliReads: 0, nativeReads: 0, githubReads: 0,
    bindingVerified: false, observations: {} };
  let step = 0, databaseCandidates = [], candidateIndex = 0, runtimeId, runtimeRead = false,
    verifiedVolume, bindingPass = 0, privateReads = {}, firstBinding;
  const budget = () => {
    const remaining = Math.floor(deadline - now());
    requireRead(remaining > 0, 'READONLY_DEADLINE_EXCEEDED');
    return Math.min(remaining, 30000);
  };
  const start = (phase, kind) => {
    state.phase = phase;
    budget();
    requireRead(state.cliReads + state.nativeReads + state.githubReads < 100,
      'READONLY_REQUEST_LIMIT');
    state[kind]++;
  };
  const request = async (url, options) => {
    try {
      const response = await fetchImpl(url, { ...options, redirect: 'error',
        signal: AbortSignal.timeout(budget()) });
      return await boundedJson(response, url, budget);
    } catch (error) {
      if (error instanceof ReadError) throw error;
      throw new ReadError(['TimeoutError', 'AbortError'].includes(error?.name)
        ? 'READONLY_REQUEST_TIMEOUT' : 'READONLY_NETWORK_FAILED');
    }
  };
  const assertBranch = async (after = false) => {
    requireRead(after ? step === 9 && bindingPass === 2 && state.observations.bindingStable === true
      : step === 0, 'READONLY_SEQUENCE_REJECTED');
    start(after ? 'BRANCH_AFTER' : 'BRANCH_BEFORE', 'githubReads');
    const body = await request(HEAD_ENDPOINT, { method: 'GET', cache: 'no-store', headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28', 'Cache-Control': 'no-cache',
      'User-Agent': 'ClinicOS-readonly-storage-inspection',
    } });
    requireRead(body.ref === `refs/heads/${BRANCH}` && body.object?.type === 'commit' &&
      SHA.test(body.object.sha ?? ''), 'READONLY_BRANCH_RESULT_INVALID');
    requireRead(body.object.sha === context.reviewedSha, 'READONLY_BRANCH_DRIFT');
    if (!after) step = 1;
    else step = 10;
  };
  const observeEnvironment = (data) => {
    const e = data.environment;
    if (e?.id !== TARGET.environmentId || e.projectId !== TARGET.projectId) return;
    const volumes = e.volumeInstances?.edges, instances = e.serviceInstances?.edges;
    if (Array.isArray(volumes) && volumes.length <= 100 &&
      volumes.every((edge) => edge?.node?.environmentId === TARGET.environmentId &&
        uuid(edge.node.id) && uuid(edge.node.volumeId) &&
        (edge.node.serviceId === null || uuid(edge.node.serviceId)))) {
      state.observations.volumeCount = volumes.length;
      state.observations.volumesObserved = volumes.map(({ node: v }) =>
        ({ volumeInstanceId: v.id, volumeId: v.volumeId, serviceId: v.serviceId }));
    }
    if (!Array.isArray(instances) || instances.length > 100) return;
    if (!instances.every((edge) => edge?.node?.environmentId === TARGET.environmentId &&
      uuid(edge.node.serviceId)) || new Set(instances.map(({ node }) => node.serviceId)).size !== instances.length)
      return;
    state.observations.serviceInstanceCount = instances.length;
    const runtimes = instances.filter(({ node }) => node.serviceName === 'clinicos-ai-runtime');
    if (runtimes.length === 1) runtimeId = runtimes[0].node.serviceId;
    for (const [key, instance] of [
      ['backend', instances.find(({ node }) => node.serviceId === TARGET.backendServiceId)?.node],
      ['runtime', runtimes.length === 1 ? runtimes[0].node : undefined],
    ]) {
      const running = instance?.latestDeployment?.instances;
      if (!Array.isArray(instance?.activeDeployments) || instance.activeDeployments.length > 100 ||
        !Array.isArray(running) || running.length > 100 ||
        !running.every((i) => i && (i.status === 'RUNNING' || TERMINAL.has(i.status)))) continue;
      state.observations[`${key}Instances`] = { serviceId: instance.serviceId,
        activeDeployments: instance.activeDeployments.length, running: running.filter((i) =>
          i.status === 'RUNNING').length, terminal: running.filter((i) => TERMINAL.has(i.status)).length };
    }
  };
  const native = async (query, variables) => {
    let phase;
    if (query === QUERIES.identity && exactVariables(variables, {}) && step === 1)
      phase = 'TOKEN_IDENTITY';
    else if (query === QUERIES.domain && step === 3 && exactVariables(variables,
      { environmentId: TARGET.environmentId, serviceId: TARGET.backendServiceId }))
      phase = 'BACKEND_DOMAIN';
    else if (query === QUERIES.environment && step === 6 && candidateIndex === databaseCandidates.length &&
      exactVariables(variables, { id: TARGET.environmentId })) phase = 'ENVIRONMENT_METADATA';
    else if (query === QUERIES.snapshots && state.bindingVerified && verifiedVolume &&
      (step === 7 || step === 8) && exactVariables(variables, { id: verifiedVolume.id }))
      phase = step === 7 ? 'SNAPSHOTS_BEFORE' : 'SNAPSHOTS_AFTER';
    requireRead(Boolean(phase), 'READONLY_QUERY_REJECTED');
    start(phase, 'nativeReads');
    const body = await request(ENDPOINT, { method: 'POST', headers: {
      'Content-Type': 'application/json', 'Project-Access-Token': env.RAILWAY_TOKEN,
    }, body: JSON.stringify({ query, variables }) });
    requireRead(!Object.hasOwn(body, 'errors'), 'READONLY_GRAPHQL_REJECTED');
    requireRead(plain(body.data), 'READONLY_DATA_INVALID');
    if (phase === 'TOKEN_IDENTITY') {
      const token = body.data.projectToken;
      requireRead(token?.project?.id === TARGET.projectId &&
        token?.environment?.id === TARGET.environmentId && token.environment.name === 'demo',
      'READONLY_TOKEN_TARGET_MISMATCH');
      step = 2;
    } else if (phase === 'BACKEND_DOMAIN') {
      privateReads.domain = canonical(body.data);
      step = 4;
    }
    else if (phase === 'ENVIRONMENT_METADATA') {
      for (const connection of [body.data.environment?.volumeInstances,
        body.data.environment?.serviceInstances]) {
        if (Array.isArray(connection?.edges)) requireRead(connection.edges.length <= 100 &&
          connection.edges.every((edge) => plain(edge) && plain(edge.node)), 'READONLY_DATA_INVALID');
      }
      privateReads.environment = canonical(body.data);
      observeEnvironment(body.data);
      step = 7;
    } else if (phase === 'SNAPSHOTS_BEFORE') step = 8;
    else if (phase === 'SNAPSHOTS_AFTER') step = 9;
    return body.data;
  };
  const call = (args, options = {}) => {
    requireRead(Array.isArray(args) && options.json === true &&
      Object.keys(options).every((key) => key === 'json'), 'READONLY_COMMAND_REJECTED');
    let phase;
    if (step === 2 && equal(args, ['variables', '--service', TARGET.backendServiceId, '--json']))
      phase = 'BACKEND_IDENTITY';
    else if (step === 4 && equal(args, ['variables', '--service', TARGET.backendServiceId,
      '--environment', TARGET.environmentId, '--json'])) phase = 'BACKEND_CONFIG';
    else if (step === 5 && equal(args, ['service', 'list', '--project', TARGET.projectId,
      '--environment', TARGET.environmentId, '--json'])) phase = 'SERVICE_CATALOG';
    else if (step === 6 && candidateIndex < databaseCandidates.length && equal(args,
      ['variables', '--service', databaseCandidates[candidateIndex], '--environment', TARGET.environmentId,
        '--json'])) phase = 'DATABASE_CONFIG';
    else if (step === 7 && runtimeId && !state.bindingVerified && equal(args,
      ['variables', '--service', runtimeId, '--environment', TARGET.environmentId, '--json']))
      phase = 'RUNTIME_CONFIG';
    requireRead(Boolean(phase), 'READONLY_COMMAND_REJECTED');
    start(phase, 'cliReads');
    const childEnv = { RAILWAY_TOKEN: env.RAILWAY_TOKEN, CI: 'true', NO_COLOR: '1' };
    for (const key of ['PATH', 'HOME', 'HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY',
      'SSL_CERT_FILE', 'SSL_CERT_DIR', 'NODE_EXTRA_CA_CERTS']) {
      if (typeof env[key] === 'string') childEnv[key] = env[key];
    }
    let result;
    try { result = spawnImpl('railway', args, { shell: false, encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'], timeout: budget(), maxBuffer: MAX_BYTES, env: childEnv }); }
    catch (error) {
      throw new ReadError(error?.code === 'ETIMEDOUT' ? 'READONLY_CLI_TIMEOUT' : 'READONLY_CLI_SPAWN_FAILED');
    }
    budget();
    if (result?.error) throw new ReadError(result.error.code === 'ETIMEDOUT' ? 'READONLY_CLI_TIMEOUT'
      : result.error.code === 'ENOBUFS' ? 'READONLY_CLI_RESPONSE_TOO_LARGE' : 'READONLY_CLI_SPAWN_FAILED');
    requireRead(!result?.signal, 'READONLY_CLI_INTERRUPTED');
    requireRead(result && !result.error && !result.signal && result.status === 0,
      'READONLY_CLI_FAILED');
    requireRead(typeof result.stdout === 'string' && Buffer.byteLength(result.stdout) <= MAX_BYTES &&
      (typeof result.stderr !== 'string' || Buffer.byteLength(result.stderr) <= MAX_BYTES),
    'READONLY_CLI_RESPONSE_TOO_LARGE');
    let data;
    try { data = JSON.parse(result.stdout); }
    catch { throw new ReadError('READONLY_CLI_JSON_INVALID'); }
    requireRead(phase === 'SERVICE_CATALOG' ? (plain(data) || Array.isArray(data)) : plain(data),
      'READONLY_CLI_RESULT_INVALID');
    // Config and mount/DB credentials remain private and are compared, never emitted.
    privateReads[`${phase}:${args[2]}`] = canonical(data);
    if (phase === 'BACKEND_IDENTITY') step = 3;
    else if (phase === 'BACKEND_CONFIG') step = 5;
    else if (phase === 'SERVICE_CATALOG') {
      if (Array.isArray(data) && data.length <= 20) {
        state.observations.serviceCatalogCount = data.length;
        requireRead(data.every((s) => plain(s) && uuid(s.id) && typeof s.name === 'string' &&
          s.name.length <= 200) && new Set(data.map((s) => s.id)).size === data.length,
        'READONLY_SERVICE_CATALOG_INVALID');
        databaseCandidates = data.filter((s) => /^postgres(?:ql)?$/i.test(s.name)).map((s) => s.id);
        state.observations.databaseCandidateCount = databaseCandidates.length;
      }
      step = 6;
    } else if (phase === 'DATABASE_CONFIG') candidateIndex++;
    else if (phase === 'RUNTIME_CONFIG') { runtimeId = undefined; runtimeRead = true; }
    return data;
  };
  const inspectBinding = async () => {
    requireRead((step === 2 && bindingPass === 0) || (step === 9 && bindingPass === 1),
      'READONLY_SEQUENCE_REJECTED');
    if (bindingPass === 1) {
      step = 2; databaseCandidates = []; candidateIndex = 0; runtimeId = undefined;
      runtimeRead = false; privateReads = {}; state.bindingVerified = false;
    }
    const binding = await inspectStorageBinding(call, native);
    state.phase = 'BINDING';
    requireRead(step === 7 && runtimeRead && !runtimeId && uuid(binding?.volume?.id) &&
      uuid(binding.volume.volumeId) && uuid(binding.volume.serviceId) &&
      databaseCandidates.includes(binding.volume.serviceId) &&
      binding.volume.environmentId === TARGET.environmentId &&
      binding.backendInstance?.serviceId === TARGET.backendServiceId &&
      uuid(binding.runtimeInstance?.serviceId), 'READONLY_BINDING_RESULT_INVALID');
    privateReads.binding = canonical(binding);
    const observation = canonical(privateReads);
    if (bindingPass === 0) firstBinding = observation;
    else {
      state.phase = 'BINDING_COMPARE';
      requireRead(observation === firstBinding, 'READONLY_BINDING_DRIFT');
      state.observations.bindingStable = true;
      step = 9;
    }
    bindingPass++;
    state.observations.bindingObservations = bindingPass;
    verifiedVolume = { id: binding.volume.id };
    state.bindingVerified = true;
    state.observations.verifiedBinding = { databaseServiceId: binding.volume.serviceId,
      volumeId: binding.volume.volumeId, volumeInstanceId: binding.volume.id,
      runtimeServiceId: binding.runtimeInstance.serviceId, mountVerified: true };
  };
  const readSnapshots = async () => {
    requireRead(state.bindingVerified && verifiedVolume, 'READONLY_BINDING_REQUIRED');
    const lists = [];
    for (let i = 0; i < 2; i++) {
      const data = await native(QUERIES.snapshots, { id: verifiedVolume.id });
      const values = data.volumeInstanceBackupList;
      requireRead(Array.isArray(values) && values.length <= 1000 &&
        values.every((s) => uuid(s?.id)) && new Set(values.map((s) => s.id)).size === values.length,
      'READONLY_SNAPSHOT_LIST_INVALID');
      lists.push(values.map((s) => s.id).sort());
    }
    requireRead(equal(lists[0], lists[1]), 'READONLY_SNAPSHOT_DRIFT');
    state.observations.snapshots = { before: lists[0].length, after: lists[1].length, stable: true };
  };
  return { getState: () => structuredClone(state), assertBranch, native, call,
    inspectBinding, readSnapshots };
}

export async function inspectDemoStorage({ env = process.env, args = [], fetchImpl, spawnImpl, now,
  capturedAt = () => new Date().toISOString() } = {}) {
  let context, access;
  let phase = 'CONTEXT', code = null, outcome = 'blocked';
  try {
    context = validateContext(env, args);
    access = createReadOnlyAccess({ env, context, fetchImpl, spawnImpl, now });
    await access.assertBranch();
    await access.native(QUERIES.identity, {});
    await access.inspectBinding();
    await access.readSnapshots();
    await access.inspectBinding();
    await access.assertBranch(true);
    outcome = 'inspected';
  } catch (error) {
    phase = access?.getState().phase ?? phase;
    code = error instanceof ReadError ? error.code : HELPER_CODES.has(error?.message)
      ? error.message : 'READONLY_INSPECT_UNEXPECTED_FAILURE';
  }
  const state = access?.getState();
  const receipt = {
    schemaVersion: 1, repository: REPOSITORY, branch: BRANCH,
    reviewedSha: context?.reviewedSha ?? null, runId: context?.runId ?? null,
    runAttempt: context?.runAttempt ?? null, capturedAt: capturedAt(),
    projectId: TARGET.projectId, environmentId: TARGET.environmentId,
    backendServiceId: TARGET.backendServiceId, operation: 'demo-storage-inspect',
    outcome, phase: outcome === 'inspected' ? 'BRANCH_AFTER' : phase, code,
    bindingVerified: state?.bindingVerified === true,
    readRequests: { cli: state?.cliReads ?? 0, native: state?.nativeReads ?? 0,
      github: state?.githubReads ?? 0 }, observations: state?.observations ?? {},
    sourceStorageVerified: false, cleanupPerformed: false, deletionPerformed: false,
    redeployPerformed: false, projectWideVisibility: 'unproven',
  };
  // No provider object or config is retained, only the explicit projection above.
  const secrets = [env.RAILWAY_TOKEN, env.GITHUB_TOKEN].filter((v) => typeof v === 'string' && v);
  const json = JSON.stringify(receipt);
  if (SECRET.test(json) || secrets.some((value) => json.includes(value))) {
    receipt.outcome = 'blocked'; receipt.phase = 'RECEIPT'; receipt.code = 'READONLY_RECEIPT_UNSAFE';
    receipt.observations = {}; receipt.bindingVerified = false;
  }
  freeze(receipt);
  receipts.set(receipt, secrets);
  return receipt;
}

export function serializeReceipt(receipt) {
  requireRead(receipts.has(receipt) && Object.isFrozen(receipt) && PHASES.has(receipt.phase) &&
    typeof receipt.capturedAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z(?![\s\S])/.test(receipt.capturedAt),
  'READONLY_RECEIPT_INVALID');
  const json = JSON.stringify(receipt);
  requireRead(Buffer.byteLength(json) <= 131072 && !SECRET.test(json) &&
    !receipts.get(receipt).some((secret) => json.includes(secret)), 'READONLY_RECEIPT_UNSAFE');
  return json;
}

export async function main({ env = process.env, args = process.argv.slice(2),
  output = (line) => console.log(line), ...options } = {}) {
  try {
    const receipt = await inspectDemoStorage({ env, args, ...options });
    const json = serializeReceipt(receipt);
    if (receipt.outcome === 'blocked')
      output(`::error title=Demo storage inspection::${receipt.phase}:${receipt.code}`);
    output(`CLINICOS_DEMO_STORAGE_INSPECT ${json}`);
    return receipt.outcome === 'inspected' ? 0 : 1;
  } catch {
    output('::error title=Demo storage inspection::RECEIPT:READONLY_RECEIPT_INVALID');
    return 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  process.exitCode = await main();
