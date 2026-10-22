import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TARGET } from './demo-storage-binding-readonly.mjs';
import { BRANCH, REPOSITORY, WORKFLOW_REF, PROTECTED_ENVIRONMENT, ENDPOINT, HEAD_ENDPOINT, QUERIES, verifiedRailwayPath, validateContext,
  createReadOnlyAccess, inspectDemoStorage, serializeReceipt, main } from './demo-storage-inspect.mjs';

const IDS = Object.freeze({ db: '50000000-0000-4000-8000-000000000472',
  runtime: '50000000-0000-4000-8000-000000000473',
  volume: '50000000-0000-4000-8000-000000000474',
  volumeInstance: '50000000-0000-4000-8000-000000000475',
  backup: '50000000-0000-4000-8000-000000000476',
  other: '50000000-0000-4000-8000-000000000477' });
const TOKEN = 'synthetic-railway-credential-do-not-print';
const GH_TOKEN = 'synthetic-github-credential-do-not-print';
const ENV = Object.freeze({ GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REPOSITORY: REPOSITORY,
  GITHUB_WORKFLOW_REF: WORKFLOW_REF, GITHUB_WORKFLOW_SHA: 'a'.repeat(40),
  GITHUB_ACTOR: 'l2v-hub', GITHUB_TRIGGERING_ACTOR: 'l2v-hub',
  DEMO_STORAGE_ENVIRONMENT: PROTECTED_ENVIRONMENT, DEMO_STORAGE_AUTH_MODE: 'project-token',
  GITHUB_REF: `refs/heads/${BRANCH}`, GITHUB_REF_NAME: BRANCH, GITHUB_SHA: 'a'.repeat(40),
  DEMO_STORAGE_REVIEWED_SHA: 'a'.repeat(40), DEMO_STORAGE_OPERATION: 'demo-storage-inspect',
  RUNNER_TEMP: '/tmp/clinicos500-fixture-runtime', GITHUB_RUN_ID: '39020438022', GITHUB_RUN_ATTEMPT: '1', RAILWAY_TOKEN: TOKEN, GITHUB_TOKEN: GH_TOKEN });
const STAMP = '2026-10-18T20:30:00.000Z';
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });
const clone = (v) => structuredClone(v);
const errorCode = (code) => (error) => error?.message === code;
const digest = (v) => createHash('sha256').update(v).digest('hex');

function fixture(change = () => {}) {
  const common = { RAILWAY_PROJECT_ID: TARGET.projectId, RAILWAY_ENVIRONMENT_ID: TARGET.environmentId,
    RAILWAY_ENVIRONMENT_NAME: 'demo' };
  const backend = { ...common, RAILWAY_SERVICE_ID: TARGET.backendServiceId,
    RAILWAY_SERVICE_NAME: TARGET.backendServiceName,
    DATABASE_URL: 'postgresql://synthetic:private-password@postgres.railway.internal/railway',
    AI_RUNTIME_URL: 'http://ai.railway.internal:8000' };
  const db = { ...common, RAILWAY_PRIVATE_DOMAIN: TARGET.databaseHost,
    DATABASE_URL: backend.DATABASE_URL, PGDATA: '/var/lib/postgresql/data/pgdata',
    RAILWAY_VOLUME_MOUNT_PATH: '/var/lib/postgresql/data' };
  const runtime = { ...common, RAILWAY_PRIVATE_DOMAIN: 'ai.railway.internal' };
  const catalog = [{ id: TARGET.backendServiceId, name: TARGET.backendServiceName },
    { id: IDS.db, name: 'Postgres' }, { id: IDS.runtime, name: 'clinicos-ai-runtime' }];
  const instance = (id, name) => ({ id: IDS.other, serviceId: id, serviceName: name,
    environmentId: TARGET.environmentId, source: { repo: 'l2v-hub/ClinicOS', image: null },
    rootDirectory: 'private-directory-do-not-print', buildCommand: 'private-build-do-not-print',
    startCommand: 'private-start-do-not-print', builder: 'RAILPACK', healthcheckPath: '/health',
    restartPolicyType: 'ON_FAILURE', restartPolicyMaxRetries: 3, numReplicas: 1,
    activeDeployments: [{ id: IDS.other }], latestDeployment: { id: IDS.other,
      instances: [{ id: 'private-container-do-not-print', status: 'RUNNING' }] },
    domains: { serviceDomains: [], customDomains: [] } });
  const environment = { id: TARGET.environmentId, projectId: TARGET.projectId,
    volumeInstances: { pageInfo: { hasNextPage: false }, edges: [{ node: {
      id: IDS.volumeInstance, volumeId: IDS.volume, serviceId: IDS.db,
      environmentId: TARGET.environmentId, mountPath: '/var/lib/postgresql/data', state: 'READY' } }] },
    serviceInstances: { pageInfo: { hasNextPage: false }, edges: [
      { node: instance(TARGET.backendServiceId, TARGET.backendServiceName) },
      { node: instance(IDS.runtime, 'clinicos-ai-runtime') },
    ] } };
  const data = { backend, db, runtime, catalog, environment,
    identity: { project: { id: TARGET.projectId }, environment: { id: TARGET.environmentId, name: 'demo' } },
    domains: { serviceDomains: [{ domain: TARGET.domain }], customDomains: [] }, snapshots: [[], []] };
  change(data);
  const calls = [], requests = [];
  let snapshotRead = 0;
  const spawnImpl = (binary, args, options) => {
    calls.push({ binary, args: clone(args), options });
    const value = args[0] === 'service' ? data.catalog : args[2] === TARGET.backendServiceId
      ? data.backend : args[2] === IDS.runtime ? data.runtime : data.db;
    return { status: 0, signal: null, stdout: JSON.stringify(value), stderr: '' };
  };
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    if (url === HEAD_ENDPOINT)
      return json({ ref: `refs/heads/${BRANCH}`, object: { type: 'commit', sha: ENV.GITHUB_SHA } });
    assert.equal(url, ENDPOINT);
    const { query } = JSON.parse(options.body);
    const body = query === QUERIES.accountIdentity ? { me: data.accountIdentity ?? {id:'synthetic-user-never-publish'} }
      : query === QUERIES.accountAccess ? (data.accountAccess ?? {project:{id:TARGET.projectId},environment:{id:TARGET.environmentId,projectId:TARGET.projectId,name:'demo',canAccess:true}})
      : query === QUERIES.identity ? { projectToken: data.identity }
      : query === QUERIES.domain ? { serviceInstance: { domains: data.domains } }
        : query === QUERIES.environment ? { environment: data.environment }
          : query === QUERIES.snapshots
            ? { volumeInstanceBackupList: data.snapshots[snapshotRead++] } : assert.fail('unknown query');
    return json({ data: body });
  };
  return { data, calls, requests, spawnImpl, fetchImpl };
}

test('public storage inspection sends scoped project and account requests only to the official API host', async () => {
  const official = 'https://backboard.railway.com/graphql/v2';
  for (const [mode, env, tokenHeader] of [
    ['project-token', ENV, { 'Project-Access-Token': TOKEN }],
    ['account-bearer', ACCOUNT_ENV, { Authorization: `Bearer ${TOKEN}` }],
  ]) {
    const f = fixture();
    const receipt = await run(f, { env });
    assert.equal(receipt.outcome, 'inspected');
    const graphql = f.requests.filter(({ url }) => url !== HEAD_ENDPOINT);
    assert.ok(graphql.length > 0);
    assert.ok(graphql.every(({ url }) => url === official));
    assert.equal(f.requests.some(({ url }) => url === 'https://backboard.railway.app/graphql/v2'), false);
    assert.ok(graphql.every(({ options }) => options.method === 'POST' && options.redirect === 'error'));
    assert.ok(graphql.every(({ options }) => JSON.stringify(options.headers) === JSON.stringify({
      'Content-Type': 'application/json', ...tokenHeader,
    })));
    const firstQuery = JSON.parse(graphql[0].options.body).query;
    assert.equal(firstQuery, mode === 'project-token' ? QUERIES.identity : QUERIES.accountIdentity);
    if (mode === 'account-bearer')
      assert.equal(JSON.parse(graphql[1].options.body).query, QUERIES.accountAccess);
  }
});
const run = (f = fixture(), options = {}) => inspectDemoStorage({ env: ENV, fetchImpl: f.fetchImpl,
  spawnImpl: f.spawnImpl, capturedAt: () => STAMP, ...options });
const safe = (receipt) => {
  const text = serializeReceipt(receipt);
  for (const secret of [TOKEN, GH_TOKEN, 'private-password', 'postgresql://', 'ai.railway.internal',
    'private-directory', 'private-build', 'private-start', 'private-container'])
    assert.equal(text.includes(secret), false, secret);
  assert.equal(receipt.cleanupPerformed, false);
  assert.equal(receipt.sourceStorageVerified, false);
  assert.equal(receipt.deletionPerformed, false);
  assert.equal(receipt.redeployPerformed, false);
  assert.equal(receipt.projectWideVisibility, 'unproven');
  return text;
};

test('ported pure binding is exercised and only bounded reads return a safe receipt', async () => {
  const f = fixture();
  const receipt = await run(f);
  assert.equal(receipt.outcome, 'inspected');
  assert.equal(receipt.bindingVerified, true);
  assert.deepEqual(receipt.readRequests, { cli: 10, native: 7, github: 2 });
  assert.equal(receipt.observations.bindingObservations, 2);
  assert.equal(receipt.observations.bindingStable, true);
  assert.deepEqual(receipt.observations.verifiedBinding, { databaseServiceId: IDS.db,
    volumeId: IDS.volume, volumeInstanceId: IDS.volumeInstance,
    runtimeServiceId: IDS.runtime, mountVerified: true });
  assert.deepEqual(receipt.observations.snapshots, { before: 0, after: 0, stable: true });
  assert.equal(receipt.observations.databaseCandidateCount, 1);
  assert.equal(receipt.observations.volumeCount, 1);
  assert.equal(receipt.observations.backendInstances.running, 1);
  for (const call of f.calls) {
    assert.equal(call.binary, verifiedRailwayPath(ENV.RUNNER_TEMP));
    assert.equal(call.options.shell, false);
    assert.deepEqual(call.options.stdio, ['ignore', 'pipe', 'pipe']);
    assert.ok(call.options.timeout <= 30000 && call.options.timeout > 0);
    assert.equal(call.options.maxBuffer, 4194304);
    assert.equal(call.options.env.RAILWAY_TOKEN, TOKEN);
    assert.equal(call.options.env.GITHUB_TOKEN, undefined);
    assert.equal(call.options.env.RAILWAY_API_TOKEN, undefined);
  }
  for (const { url, options } of f.requests) {
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    if (url === ENDPOINT) {
      assert.equal(options.method, 'POST');
      assert.deepEqual(options.headers, { 'Content-Type': 'application/json', 'Project-Access-Token': TOKEN });
      assert.ok(Object.values(QUERIES).includes(JSON.parse(options.body).query));
    } else {
      assert.equal(options.headers.Authorization, `Bearer ${GH_TOKEN}`);
      assert.equal(options.headers['Project-Access-Token'], undefined);
    }
  }
  safe(receipt);
  assert.ok(Object.isFrozen(receipt.observations.verifiedBinding));
});

function threeVolumeFixture(change = () => {}) {
  return fixture((data) => {
    const otherService = { ...clone(data.environment.serviceInstances.edges[1].node),
      id: '50000000-0000-4000-8000-000000000480', serviceId: IDS.other,
      serviceName: 'unrelated-service' };
    data.catalog.push({ id: IDS.other, name: 'unrelated-service' });
    data.environment.serviceInstances.edges.push({ node: otherService });
    data.environment.volumeInstances.edges.push(
      { node: { id: '50000000-0000-4000-8000-000000000481',
        volumeId: '50000000-0000-4000-8000-000000000482', serviceId: IDS.other,
        environmentId: TARGET.environmentId, mountPath: '/private/other', state: 'READY' } },
      { node: { id: '50000000-0000-4000-8000-000000000483',
        volumeId: '50000000-0000-4000-8000-000000000484', serviceId: null,
        environmentId: TARGET.environmentId, mountPath: '/private/unattached', state: 'READY' } },
    );
    change(data);
  });
}

test('three-volume read-only classification identifies only the credential-matched DB mount', async () => {
  const f = threeVolumeFixture();
  const receipt = await run(f);
  assert.equal(receipt.outcome, 'blocked');
  assert.equal(receipt.phase, 'ENVIRONMENT_METADATA');
  assert.equal(receipt.code, 'UNCLASSIFIED_DEMO_VOLUMES');
  assert.equal(receipt.bindingVerified, false);
  const classification = receipt.observations.volumeClassification;
  assert.equal(classification.stable, true);
  assert.equal(classification.configuredDatabaseServiceId, IDS.db);
  assert.equal(classification.configuredDatabaseVolumeInstanceId, IDS.volumeInstance);
  assert.equal(classification.observedVolumeCount, 3);
  assert.equal(classification.mountVerifiedVolumeCount, 1);
  assert.equal(classification.unknownVolumeCount, 2);
  assert.equal(classification.databaseSnapshotScope, 'unobserved');
  assert.equal(classification.otherSnapshotScope, 'unobserved');
  assert.deepEqual(classification.volumes.map((row) => row.role), [
    'database-bound', 'other-attached-service', 'unattached-unknown' ]);
  assert.deepEqual(f.requests.filter(({ options }) => options.body?.includes('volumeInstanceBackupList')), []);
  assert.equal(f.calls.length, 8);
  assert.deepEqual(receipt.readRequests, { cli: 8, native: 5, github: 2 });
  const text = safe(receipt);
  for (const secret of ['unrelated-service', '/private/other', '/private/unattached',
    '/var/lib/postgresql/data', 'private-password']) assert.equal(text.includes(secret), false, secret);
});

test('classification refuses ambiguous database attachments and preserves the original helper stop', async () => {
  const f = fixture((d) => { d.environment.volumeInstances.edges.push({ node: {
    ...d.environment.volumeInstances.edges[0].node, id: IDS.other, volumeId: '50000000-0000-4000-8000-000000000485' } }); });
  const receipt = await run(f);
  assert.equal(receipt.code, 'UNCLASSIFIED_DEMO_VOLUMES');
  assert.equal(receipt.observations.volumeClassification, undefined);
  assert.equal(receipt.bindingVerified, false);
  safe(receipt);
});

test('classification mount failures remain blocked without a verified projection', async () => {
  const f = threeVolumeFixture((d) => { d.db.PGDATA = '/unrelated'; });
  const receipt = await run(f);
  assert.equal(receipt.code, 'DATABASE_MOUNT_UNVERIFIED');
  assert.equal(receipt.observations.volumeClassification, undefined);
  assert.equal(receipt.bindingVerified, false);
  safe(receipt);
});

test('classification compares fresh metadata and removes stable claim on drift', async () => {
  const f = threeVolumeFixture();
  let environments = 0;
  const receipt = await run(f, { fetchImpl: async (url, options) => {
    const response = await f.fetchImpl(url, options);
    if (url === ENDPOINT && JSON.parse(options.body).query === QUERIES.environment && ++environments === 1)
      f.data.environment.volumeInstances.edges[1].node.serviceId = null;
    return response;
  } });
  assert.equal(receipt.code, 'READONLY_CLASSIFICATION_DRIFT');
  assert.equal(receipt.phase, 'BINDING_COMPARE');
  assert.equal(receipt.bindingVerified, false);
  assert.equal(receipt.observations.volumeClassification, undefined);
  safe(receipt);
});

test('classification refuses aliased provider UUIDs', async () => {
  const f = threeVolumeFixture((d) => {
    d.environment.volumeInstances.edges[1].node.volumeId = d.environment.volumeInstances.edges[1].node.id;
  });
  const receipt = await run(f);
  assert.equal(receipt.code, 'UNCLASSIFIED_DEMO_VOLUMES');
  assert.equal(receipt.observations.volumeClassification, undefined);
  assert.equal(receipt.bindingVerified, false);
  safe(receipt);
});

test('classification stable claim is removed if final source branch check drifts', async () => {
  const f = threeVolumeFixture();
  let heads = 0;
  const receipt = await run(f, { fetchImpl: (url, options) => {
    if (url === HEAD_ENDPOINT && ++heads === 2)
      return json({ ref: `refs/heads/${BRANCH}`, object: { type: 'commit', sha: 'b'.repeat(40) } });
    return f.fetchImpl(url, options);
  } });
  assert.equal(receipt.code, 'READONLY_BRANCH_DRIFT');
  assert.equal(receipt.phase, 'BRANCH_AFTER');
  assert.equal(receipt.observations.volumeClassification.stable, false);
  assert.equal(receipt.bindingVerified, false);
  safe(receipt);
});

test('classification projection is cleared when a public UUID reflects a credential', async () => {
  const f = threeVolumeFixture();
  const receipt = await run(f, { env: { ...ENV, RAILWAY_TOKEN: IDS.db } });
  assert.equal(receipt.code, 'READONLY_RECEIPT_UNSAFE');
  assert.deepEqual(receipt.observations, {});
  assert.equal(safe(receipt).includes(IDS.db), false);
});

const guards = [
  ['DEMO_BINDING_IDENTITY_MISMATCH', (d) => { d.backend.RAILWAY_ENVIRONMENT_ID = IDS.other; }],
  ['DEMO_DATABASE_BINDING_INVALID', (d) => { d.backend.DATABASE_URL = 'invalid'; }],
  ['DEMO_DATABASE_BINDING_MISMATCH', (d) => { d.backend.DATABASE_URL = 'postgres://u:p@foreign/db'; }],
  ['DEMO_DOMAIN_RESULT_INVALID', (d) => { d.domains.customDomains = null; }],
  ['DEMO_BACKEND_DOMAIN_MISMATCH', (d) => { d.domains.serviceDomains = []; }],
  ['CUSTOM_SOURCE_DIRECTORY_REQUIRES_REVIEW', (d) => { d.backend.AI_UPLOAD_DIR = '/private'; }],
  ['SERVICE_CATALOG_INVALID', (d) => { d.catalog = []; }],
  ['SOURCE_DATABASE_SERVICE_AMBIGUOUS', (d) => { d.db.DATABASE_URL = d.db.DATABASE_URL.replace('private-password', 'other'); }],
  ['STORAGE_ENVIRONMENT_UNVERIFIED', (d) => { d.environment.projectId = IDS.other; }],
  ['VOLUME_ENVIRONMENT_MISMATCH', (d) => { d.environment.volumeInstances.edges[0].node.environmentId = IDS.other; }],
  ['UNCLASSIFIED_DEMO_VOLUMES', (d) => { d.environment.volumeInstances.edges.push({ node: {
    ...d.environment.volumeInstances.edges[0].node, id: IDS.other, volumeId: IDS.other } }); }],
  ['DATABASE_MOUNT_UNVERIFIED', (d) => { d.db.PGDATA = '/unrelated'; }],
  ['SERVICE_ENVIRONMENT_MISMATCH', (d) => { d.environment.serviceInstances.edges[0].node.environmentId = IDS.other; }],
  ['RUNTIME_DEPLOYMENT_UNVERIFIED', (d) => { d.environment.serviceInstances.edges[1].node.latestDeployment = null; }],
  ['AMBIGUOUS_ACTIVE_DEPLOYMENT', (d) => { d.environment.serviceInstances.edges[0].node.activeDeployments.push({ id: IDS.other }); }],
  ['MULTIPLE_OR_TRANSITIONAL_SERVICE_INSTANCES', (d) => { d.environment.serviceInstances.edges[0].node.latestDeployment.instances.push({ id: 'other', status: 'STARTING' }); }],
  ['RUNTIME_ORIGIN_UNVERIFIED', (d) => { d.backend.AI_RUNTIME_URL = 'invalid'; }],
  ['RUNTIME_BINDING_MISMATCH', (d) => { d.runtime.RAILWAY_PROJECT_ID = IDS.other; }],
  ['EXTERNAL_RUNTIME_PERSISTENCE_REQUIRES_REVIEW', (d) => { d.runtime.STORAGE_URL = 'private-storage-value'; }],
];
for (const [code, change] of guards) {
  test(`actual helper guard ${code} remains observable and blocks snapshot access`, async () => {
    const f = fixture(change);
    const receipt = await run(f);
    assert.equal(receipt.code, code);
    assert.equal(receipt.outcome, 'blocked');
    assert.equal(receipt.bindingVerified, false);
    assert.equal(f.requests.some(({ options }) => options.body?.includes('volumeInstanceBackupList')), false);
    safe(receipt);
  });
}

for (const [key, value] of Object.entries({ GITHUB_EVENT_NAME: 'push', GITHUB_REPOSITORY: 'other/repo',
  GITHUB_REF: 'refs/heads/codex/demo-470-completion', GITHUB_REF_NAME: 'codex/demo-470-completion', GITHUB_SHA: 'invalid',
  DEMO_STORAGE_REVIEWED_SHA: 'b'.repeat(40), DEMO_STORAGE_OPERATION: 'demo-cleanup',
  GITHUB_RUN_ID: '0', GITHUB_RUN_ATTEMPT: '0' })) {
  test(`context ${key} rejects before either transport`, async () => {
    const f = fixture();
    const receipt = await run(f, { env: { ...ENV, [key]: value } });
    assert.equal(receipt.code, 'READONLY_CONTEXT_REQUIRED');
    assert.equal(f.calls.length + f.requests.length, 0);
    safe(receipt);
  });
}
for (const key of ['RAILWAY_TOKEN', 'GITHUB_TOKEN']) {
  test(`missing ${key} blocks all requests`, async () => {
    const f = fixture();
    assert.equal((await run(f, { env: { ...ENV, [key]: '' } })).code, 'READONLY_BINDING_MISSING');
    assert.equal(f.calls.length + f.requests.length, 0);
  });
}
test('extra arguments cannot select erase or another mode', async () => {
  const f = fixture();
  assert.equal((await run(f, { args: ['--erase'] })).code, 'READONLY_CONTEXT_REQUIRED');
  assert.equal(f.calls.length + f.requests.length, 0);
});
test('forged contexts and forged receipts cannot cross provenance boundaries', async () => {
  assert.throws(() => createReadOnlyAccess({ env: ENV, context: { repository: REPOSITORY,
    branch: BRANCH, reviewedSha: ENV.GITHUB_SHA } }), errorCode('READONLY_CONTEXT_REQUIRED'));
  const receipt = await run();
  assert.throws(() => serializeReceipt(clone(receipt)), errorCode('READONLY_RECEIPT_INVALID'));
  assert.throws(() => { receipt.bindingVerified = false; }, TypeError);
});

async function accessAtIdentity(f = fixture()) {
  const access = createReadOnlyAccess({ env: ENV, context: validateContext(ENV),
    fetchImpl: f.fetchImpl, spawnImpl: f.spawnImpl });
  await access.assertBranch();
  await access.native(QUERIES.identity, {});
  return { access, f };
}
test('snapshot access requires actual full binding and offers no forged binding setter', async () => {
  const { access, f } = await accessAtIdentity();
  assert.equal(access.finishBinding, undefined);
  await assert.rejects(access.readSnapshots(), errorCode('READONLY_BINDING_REQUIRED'));
  await assert.rejects(access.native(QUERIES.snapshots, { id: IDS.volumeInstance }),
    errorCode('READONLY_QUERY_REJECTED'));
  assert.equal(f.requests.length, 2);
  const state = access.getState();
  state.bindingVerified = true;
  await assert.rejects(access.readSnapshots(), errorCode('READONLY_BINDING_REQUIRED'));
});

const forbiddenCommands = [ ['up', '/tmp', '--yes'], ['ssh', '--service', TARGET.backendServiceId],
  ['logs', '--json'], ['run', 'env'], ['deployment', 'restart'], ['service', 'delete', IDS.db],
  ['variables', 'set', 'KEY=value'], ['variables', '--service', TARGET.backendServiceId],
  ['variables', '--service', IDS.other, '--json'],
  ['variables', '--service', TARGET.backendServiceId, '--json', '--environment', IDS.other],
  ['variables', '--service', TARGET.backendServiceId + ';echo secret', '--json'],
  ['variables', '--service', TARGET.backendServiceId, '--json', '--set', 'X=Y'] ];
for (const args of forbiddenCommands) {
  test(`CLI rejects nonliteral command ${JSON.stringify(args)} before spawn`, async () => {
    const { access, f } = await accessAtIdentity();
    assert.throws(() => access.call(args, { json: true }), errorCode('READONLY_COMMAND_REJECTED'));
    assert.equal(f.calls.length, 0);
  });
}
test('CLI cannot inherit extra options or access candidate variables before catalog provenance', async () => {
  const { access, f } = await accessAtIdentity();
  const args = ['variables', '--service', TARGET.backendServiceId, '--json'];
  assert.throws(() => access.call(args, { json: true, timeout: 30000 }), errorCode('READONLY_COMMAND_REJECTED'));
  assert.throws(() => access.call(['variables', '--service', IDS.db, '--environment', TARGET.environmentId,
    '--json'], { json: true }), errorCode('READONLY_COMMAND_REJECTED'));
  assert.equal(f.calls.length, 0);
});

for (const [query, variables] of [
  ['mutation{serviceDelete(id:"foreign")}', {}],
  [QUERIES.domain + ' ', { environmentId: TARGET.environmentId, serviceId: TARGET.backendServiceId }],
  [QUERIES.identity, { extra: true }],
  [QUERIES.environment, { id: IDS.other }],
  [QUERIES.snapshots, { id: IDS.other }],
  ['query{alias:projectToken{project{id}}}', {}],
]) {
  test(`GraphQL rejects nonliteral query/variables ${query.slice(0, 28)}`, async () => {
    const f = fixture();
    const access = createReadOnlyAccess({ env: ENV, context: validateContext(ENV),
      fetchImpl: f.fetchImpl, spawnImpl: f.spawnImpl });
    await access.assertBranch();
    await assert.rejects(access.native(query, variables), errorCode('READONLY_QUERY_REJECTED'));
    assert.equal(f.requests.length, 1);
  });
}

for (const [label, change, code] of [
  ['token belongs to production', (d) => { d.identity.environment.id = IDS.other; }, 'READONLY_TOKEN_TARGET_MISMATCH'],
  ['malformed candidate ID', (d) => { d.catalog[1].id = '$(secret)'; }, 'READONLY_SERVICE_CATALOG_INVALID'],
  ['duplicate catalog IDs', (d) => { d.catalog[1].id = d.catalog[0].id; }, 'READONLY_SERVICE_CATALOG_INVALID'],
  ['invalid config response', (d) => { d.backend = []; }, 'READONLY_CLI_RESULT_INVALID'],
  ['malformed metadata edge', (d) => { d.environment.volumeInstances.edges = [null]; }, 'READONLY_DATA_INVALID'],
]) {
  test(label, async () => {
    const f = fixture(change);
    const receipt = await run(f);
    assert.equal(receipt.code, code);
    assert.equal(receipt.bindingVerified, false);
    if (code === 'READONLY_TOKEN_TARGET_MISMATCH') assert.equal(f.calls.length, 0);
    safe(receipt);
  });
}

test('multiple matching database candidates are refused by actual helper', async () => {
  const receipt = await run(fixture((d) => { d.catalog.push({ id: IDS.other, name: 'PostgreSQL' }); }));
  assert.equal(receipt.code, 'SOURCE_DATABASE_SERVICE_AMBIGUOUS');
});
test('foreign variables and commands are rejected at their otherwise valid stages', async () => {
  const { access, f } = await accessAtIdentity();
  access.call(['variables', '--service', TARGET.backendServiceId, '--json'], { json: true });
  const before = f.requests.length;
  for (const variables of [
    { environmentId: IDS.other, serviceId: TARGET.backendServiceId },
    { environmentId: TARGET.environmentId, serviceId: IDS.other },
    { environmentId: TARGET.environmentId, serviceId: TARGET.backendServiceId, extra: 'value' },
  ]) await assert.rejects(access.native(QUERIES.domain, variables), errorCode('READONLY_QUERY_REJECTED'));
  assert.equal(f.requests.length, before);
  await access.native(QUERIES.domain, { environmentId: TARGET.environmentId,
    serviceId: TARGET.backendServiceId });
  access.call(['variables', '--service', TARGET.backendServiceId, '--environment', TARGET.environmentId,
    '--json'], { json: true });
  assert.throws(() => access.call(['service', 'list', '--project', IDS.other,
    '--environment', TARGET.environmentId, '--json'], { json: true }), errorCode('READONLY_COMMAND_REJECTED'));
  access.call(['service', 'list', '--project', TARGET.projectId, '--environment', TARGET.environmentId,
    '--json'], { json: true });
  assert.throws(() => access.call(['variables', '--service', IDS.other, '--environment', TARGET.environmentId,
    '--json'], { json: true }), errorCode('READONLY_COMMAND_REJECTED'));
  access.call(['variables', '--service', IDS.db, '--environment', TARGET.environmentId, '--json'], { json: true });
  await assert.rejects(access.native(QUERIES.environment, { id: IDS.other }), errorCode('READONLY_QUERY_REJECTED'));
  await access.native(QUERIES.environment, { id: TARGET.environmentId });
  assert.throws(() => access.call(['variables', '--service', IDS.other, '--environment', TARGET.environmentId,
    '--json'], { json: true }), errorCode('READONLY_COMMAND_REJECTED'));
});
test('foreign snapshot identity rejects even after actual complete binding', async () => {
  const { access, f } = await accessAtIdentity();
  await access.inspectBinding();
  const before = f.requests.length;
  await assert.rejects(access.native(QUERIES.snapshots, { id: IDS.other }), errorCode('READONLY_QUERY_REJECTED'));
  assert.equal(f.requests.length, before);
});
test('context and candidate UUID validation reject trailing newlines', async () => {
  for (const key of ['GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) {
    const f = fixture();
    const env = { ...ENV, [key]: ENV[key] + '\n' };
    if (key === 'GITHUB_SHA') env.DEMO_STORAGE_REVIEWED_SHA = env.GITHUB_SHA;
    assert.equal((await run(f, { env })).code, 'READONLY_CONTEXT_REQUIRED');
    assert.equal(f.requests.length + f.calls.length, 0);
  }
  const receipt = await run(fixture((d) => { d.catalog[1].id += '\n'; }));
  assert.equal(receipt.code, 'READONLY_SERVICE_CATALOG_INVALID');
  safe(receipt);
});
test('secret reflection in dynamic UUIDs blocks public projection', async () => {
  const f = fixture();
  const receipt = await run(f, { env: { ...ENV, RAILWAY_TOKEN: IDS.volume } });
  assert.equal(receipt.code, 'READONLY_RECEIPT_UNSAFE');
  assert.deepEqual(receipt.observations, {});
  assert.equal(serializeReceipt(receipt).includes(IDS.volume), false);
});

for (const [label, result, code] of [
  ['nonzero exit', { status: 1, stdout: TOKEN, stderr: TOKEN }, 'READONLY_CLI_FAILED'],
  ['timeout', { status: null, error: { code: 'ETIMEDOUT', message: TOKEN } }, 'READONLY_CLI_TIMEOUT'],
  ['buffer overflow', { status: null, error: { code: 'ENOBUFS', message: TOKEN } }, 'READONLY_CLI_RESPONSE_TOO_LARGE'],
  ['missing binary', { status: null, error: { code: 'ENOENT', message: TOKEN } }, 'READONLY_CLI_SPAWN_FAILED'],
  ['signal', { status: 0, signal: 'SIGTERM', stdout: TOKEN }, 'READONLY_CLI_INTERRUPTED'],
  ['invalid JSON', { status: 0, stdout: TOKEN, stderr: '' }, 'READONLY_CLI_JSON_INVALID'],
  ['oversize stdout', { status: 0, stdout: 'x'.repeat(4194305), stderr: '' }, 'READONLY_CLI_RESPONSE_TOO_LARGE'],
]) {
  test(`captured CLI ${label} has a constant cause without child output`, async () => {
    const f = fixture();
    const receipt = await run(f, { spawnImpl: () => result });
    assert.equal(receipt.code, code);
    assert.equal(receipt.phase, 'BACKEND_IDENTITY');
    safe(receipt);
  });
}
test('thrown CLI errors do not disclose exception messages', async () => {
  const receipt = await run(fixture(), { spawnImpl: () => { throw new Error(TOKEN); } });
  assert.equal(receipt.code, 'READONLY_CLI_SPAWN_FAILED');
  safe(receipt);
});
test('unknown internal errors use a constant without reflecting even uppercase messages', async () => {
  const receipt = await run(fixture(), { now: () => { throw new Error('PRIVATE_UPPERCASE_SECRET'); } });
  assert.equal(receipt.code, 'READONLY_INSPECT_UNEXPECTED_FAILURE');
  assert.equal(safe(receipt).includes('PRIVATE_UPPERCASE_SECRET'), false);
});

for (const status of [400, 401, 403, 404, 429, 500, 503, 418]) {
  test(`HTTP ${status} is distinct from GraphQL/network/timeout`, async () => {
    const f = fixture();
    const receipt = await run(f, { fetchImpl: (url, options) => url === ENDPOINT
      ? json({ message: TOKEN }, status) : f.fetchImpl(url, options) });
    assert.equal(receipt.code, status >= 500 ? 'READONLY_HTTP_5XX'
      : status === 418 ? 'READONLY_HTTP_OTHER' : `READONLY_HTTP_${status}`);
    assert.equal(receipt.phase, 'TOKEN_IDENTITY');
    assert.equal(f.calls.length, 0);
    safe(receipt);
  });
}
for (const [label, response, code] of [
  ['GraphQL error with partial data', () => json({ data: { projectToken: {} }, errors: [{ message: TOKEN }] }), 'READONLY_GRAPHQL_REJECTED'],
  ['missing data', () => json({ unexpected: TOKEN }), 'READONLY_DATA_INVALID'],
  ['malformed JSON', () => new Response(TOKEN), 'READONLY_JSON_INVALID'],
  ['non-object JSON', () => json([]), 'READONLY_RESPONSE_INVALID'],
  ['oversize body', () => new Response('x'.repeat(4194305)), 'READONLY_RESPONSE_TOO_LARGE'],
  ['redirected response', () => ({ redirected: true }), 'READONLY_REDIRECT_REFUSED'],
  ['foreign response URL', () => ({ url: 'https://foreign.invalid', ok: true }), 'READONLY_REDIRECT_REFUSED'],
  ['missing body', () => ({ ok: true }), 'READONLY_RESPONSE_INVALID'],
]) {
  test(`native ${label} has a constant phase and no raw response`, async () => {
    const f = fixture();
    const receipt = await run(f, { fetchImpl: (url, options) => url === ENDPOINT
      ? response() : f.fetchImpl(url, options) });
    assert.equal(receipt.code, code);
    assert.equal(receipt.phase, 'TOKEN_IDENTITY');
    safe(receipt);
  });
}
for (const [name, code] of [['TimeoutError', 'READONLY_REQUEST_TIMEOUT'], ['AbortError', 'READONLY_REQUEST_TIMEOUT'],
  ['TypeError', 'READONLY_NETWORK_FAILED'], ['UnknownSecretCause', 'READONLY_NETWORK_FAILED']]) {
  test(`native thrown ${name} maps to safe cause`, async () => {
    const receipt = await run(fixture(), { fetchImpl: () => { throw Object.assign(new Error(TOKEN), { name }); } });
    assert.equal(receipt.code, code);
    safe(receipt);
  });
}
test('total deadline expires before additional CLI or native calls', async () => {
  const f = fixture();
  let clock = 0;
  const receipt = await run(f, { now: () => clock, fetchImpl: async (url, options) => {
    const r = await f.fetchImpl(url, options);
    if (url === ENDPOINT) clock = 480001;
    return r;
  } });
  assert.equal(receipt.code, 'READONLY_DEADLINE_EXCEEDED');
  assert.equal(f.calls.length, 0);
  safe(receipt);
});

for (const after of [false, true]) {
  test(`branch drift ${after ? 'after' : 'before'} inspection prevents success`, async () => {
    const f = fixture();
    let github = 0;
    const receipt = await run(f, { fetchImpl: (url, options) => {
      if (url === HEAD_ENDPOINT && (++github === (after ? 2 : 1)))
        return json({ ref: `refs/heads/${BRANCH}`, object: { type: 'commit', sha: 'b'.repeat(40) } });
      return f.fetchImpl(url, options);
    } });
    assert.equal(receipt.code, 'READONLY_BRANCH_DRIFT');
    assert.equal(receipt.phase, after ? 'BRANCH_AFTER' : 'BRANCH_BEFORE');
    if (!after) assert.equal(f.calls.length, 0);
    safe(receipt);
  });
}

test('stable nonzero native snapshots are counted without deletion or backup identifiers', async () => {
  const receipt = await run(fixture((d) => { d.snapshots = [[{ id: IDS.backup }], [{ id: IDS.backup }]]; }));
  assert.equal(receipt.outcome, 'inspected');
  assert.deepEqual(receipt.observations.snapshots, { before: 1, after: 1, stable: true });
  assert.equal(safe(receipt).includes(IDS.backup), false);
});
for (const [label, change] of [
  ['backend config', (d) => { d.backend.PRIVATE_SETTING = TOKEN; }],
  ['credential equality preserved but credential changed', (d) => {
    d.backend.DATABASE_URL = d.backend.DATABASE_URL.replace('private-password', 'another-private-password');
    d.db.DATABASE_URL = d.backend.DATABASE_URL;
  }],
  ['PGDATA remains within mount but changed', (d) => { d.db.PGDATA += '/changed'; }],
  ['volume identity', (d) => { d.environment.volumeInstances.edges[0].node.volumeId = IDS.other; }],
  ['volume instance identity', (d) => { d.environment.volumeInstances.edges[0].node.id = IDS.other; }],
  ['deployment identity', (d) => {
    d.environment.serviceInstances.edges[0].node.activeDeployments = [{ id: IDS.volume }];
    d.environment.serviceInstances.edges[0].node.latestDeployment.id = IDS.volume;
  }],
  ['runtime container identity', (d) => {
    d.environment.serviceInstances.edges[1].node.latestDeployment.instances[0].id = 'different-private-container';
  }],
  ['observed build config', (d) => { d.environment.serviceInstances.edges[0].node.buildCommand = TOKEN; }],
  ['runtime effective config', (d) => { d.runtime.PRIVATE_SETTING = TOKEN; }],
  ['service catalog', (d) => { d.catalog.push({ id: IDS.other, name: 'unrelated' }); }],
]) {
  test(`two complete observations block private binding drift: ${label}`, async () => {
    const f = fixture();
    let snapshots = 0;
    const receipt = await run(f, { fetchImpl: async (url, options) => {
      const response = await f.fetchImpl(url, options);
      if (url === ENDPOINT && JSON.parse(options.body).query === QUERIES.snapshots && ++snapshots === 2)
        change(f.data);
      return response;
    } });
    assert.equal(receipt.code, 'READONLY_BINDING_DRIFT');
    assert.equal(receipt.phase, 'BINDING_COMPARE');
    assert.equal(receipt.bindingVerified, false);
    assert.equal(receipt.observations.bindingObservations, 1);
    safe(receipt);
  });
}
test('second complete binding observation retains the actual failing guard', async () => {
  const f = fixture();
  let snapshots = 0;
  const receipt = await run(f, { fetchImpl: async (url, options) => {
    const response = await f.fetchImpl(url, options);
    if (url === ENDPOINT && JSON.parse(options.body).query === QUERIES.snapshots && ++snapshots === 2)
      f.data.db.PGDATA = '/unrelated';
    return response;
  } });
  assert.equal(receipt.code, 'DATABASE_MOUNT_UNVERIFIED');
  assert.equal(receipt.phase, 'ENVIRONMENT_METADATA');
  assert.equal(receipt.bindingVerified, false);
  safe(receipt);
});
for (const [label, snapshots, code] of [
  ['snapshot drift', [[{ id: IDS.backup }], []], 'READONLY_SNAPSHOT_DRIFT'],
  ['duplicate snapshots', [[{ id: IDS.backup }, { id: IDS.backup }], []], 'READONLY_SNAPSHOT_LIST_INVALID'],
  ['malformed snapshot', [[{ id: TOKEN }], []], 'READONLY_SNAPSHOT_LIST_INVALID'],
  ['oversize snapshot list', [Array.from({ length: 1001 }, () => ({ id: IDS.backup })), []], 'READONLY_SNAPSHOT_LIST_INVALID'],
]) {
  test(label, async () => {
    const receipt = await run(fixture((d) => { d.snapshots = snapshots; }));
    assert.equal(receipt.code, code);
    assert.equal(receipt.bindingVerified, true);
    safe(receipt);
  });
}
test('console receipt and annotation expose exact safe original guard only', async () => {
  const f = fixture((d) => { d.db.PGDATA = '/unrelated'; });
  const lines = [];
  const status = await main({ env: ENV, args: [], fetchImpl: f.fetchImpl, spawnImpl: f.spawnImpl,
    capturedAt: () => STAMP, output: (line) => lines.push(line) });
  assert.equal(status, 1);
  assert.equal(lines[0], '::error title=Demo storage inspection::ENVIRONMENT_METADATA:DATABASE_MOUNT_UNVERIFIED');
  assert.match(lines[1], /^CLINICOS_DEMO_STORAGE_INSPECT /);
  const parsed = JSON.parse(lines[1].slice('CLINICOS_DEMO_STORAGE_INSPECT '.length));
  assert.equal(parsed.code, 'DATABASE_MOUNT_UNVERIFIED');
  assert.equal(lines.join('\n').includes(TOKEN), false);
});
test('actual CLI rejects untrusted context offline without stack trace', () => {
  const child = spawnSync(process.execPath, [fileURLToPath(new URL('./demo-storage-inspect.mjs', import.meta.url))],
    { encoding: 'utf8', timeout: 5000, env: { PATH: process.env.PATH } });
  assert.equal(child.status, 1);
  assert.equal(child.stderr, '');
  assert.match(child.stdout, /CONTEXT:READONLY_CONTEXT_REQUIRED/);
  assert.equal(JSON.parse(child.stdout.split('CLINICOS_DEMO_STORAGE_INSPECT ')[1]).outcome, 'blocked');
});


const ACCOUNT_ENV = Object.freeze({...ENV, DEMO_STORAGE_AUTH_MODE:'account-bearer',
  RAILWAY_TOKEN:undefined,RAILWAY_API_TOKEN:TOKEN});
test('account bearer uses actual me/access then full identical binding and descriptive snapshots',async()=>{
 const f=fixture();const receipt=await run(f,{env:ACCOUNT_ENV});assert.equal(receipt.outcome,'inspected');
 assert.equal(receipt.credentialKind,'account-bearer');assert.equal(receipt.projectTokenVerified,false);assert.equal(receipt.targetReadAccess,true);assert.equal(receipt.bindingVerified,true);
 assert.deepEqual(receipt.readRequests,{cli:10,native:8,github:2});assert(!safe(receipt).includes('synthetic-user-never-publish'));
 for(const c of f.calls){assert.equal(c.binary,verifiedRailwayPath(ACCOUNT_ENV.RUNNER_TEMP));assert.equal(c.args[c.args.indexOf('--project')+1],TARGET.projectId);assert.equal(c.args[c.args.indexOf('--environment')+1],TARGET.environmentId);assert(c.args.includes('--project')&&c.args.includes('--environment'));assert.equal(c.options.env.RAILWAY_API_TOKEN,TOKEN);assert.equal(c.options.env.RAILWAY_TOKEN,undefined);assert.equal(c.options.env.GITHUB_TOKEN,undefined);}
 for(const r of f.requests.filter(r=>r.url===ENDPOINT)){assert.equal(r.options.headers.Authorization,`Bearer ${TOKEN}`);assert.equal(r.options.headers['Project-Access-Token'],undefined);assert.notEqual(JSON.parse(r.options.body).query,QUERIES.identity);}
 assert.deepEqual(f.requests.filter(r=>r.url===ENDPOINT).slice(0,2).map(r=>JSON.parse(r.options.body).query),[QUERIES.accountIdentity,QUERIES.accountAccess]);
});
for(const [key,value] of Object.entries({GITHUB_WORKFLOW_REF:'other',GITHUB_WORKFLOW_SHA:'b'.repeat(40),GITHUB_ACTOR:'other',GITHUB_TRIGGERING_ACTOR:'other',DEMO_STORAGE_ENVIRONMENT:'production',DEMO_STORAGE_AUTH_MODE:'auto'}))
 test(`new trusted context ${key} rejects before any provider call`,async()=>{const f=fixture();const r=await run(f,{env:{...ENV,[key]:value}});assert.equal(r.code,'READONLY_CONTEXT_REQUIRED');assert.equal(f.calls.length+f.requests.length,0)});
for(const env of [{...ENV,RAILWAY_API_TOKEN:TOKEN},{...ACCOUNT_ENV,RAILWAY_TOKEN:TOKEN},{...ACCOUNT_ENV,RAILWAY_API_TOKEN:undefined},{...ENV,RAILWAY_TOKEN:'token\nvalue'}])
 test('mixed/missing/invalid mode credentials reject before transport',async()=>{const f=fixture();const r=await run(f,{env});assert.equal(r.code,'READONLY_BINDING_MISSING');assert.equal(f.calls.length+f.requests.length,0)});
test('minted context cannot be reused with injected auth mode or mixed credentials',()=>{
 const context=validateContext(ENV);assert.throws(()=>createReadOnlyAccess({env:ACCOUNT_ENV,context}),errorCode('READONLY_CONTEXT_REQUIRED'));
 assert.throws(()=>createReadOnlyAccess({env:{...ENV,RAILWAY_API_TOKEN:TOKEN},context}),errorCode('READONLY_BINDING_MISSING'));
});
for(const [label,change] of [
 ['me missing',d=>d.accountIdentity={}],['wrongproject',d=>d.accountAccess={project:{id:IDS.other},environment:{id:TARGET.environmentId,projectId:TARGET.projectId,name:'demo',canAccess:true}}],
 ['wrongenv',d=>d.accountAccess={project:{id:TARGET.projectId},environment:{id:IDS.other,projectId:TARGET.projectId,name:'demo',canAccess:true}}],
 ['wronglink',d=>d.accountAccess={project:{id:TARGET.projectId},environment:{id:TARGET.environmentId,projectId:IDS.other,name:'demo',canAccess:true}}],
 ['production',d=>d.accountAccess={project:{id:TARGET.projectId},environment:{id:TARGET.environmentId,projectId:TARGET.projectId,name:'production',canAccess:true}}],
 ['accessfalse',d=>d.accountAccess={project:{id:TARGET.projectId},environment:{id:TARGET.environmentId,projectId:TARGET.projectId,name:'demo',canAccess:false}}],
 ['source',d=>d.environment.serviceInstances.edges[0].node.source.repo='other/repo'],['domain',d=>d.domains.serviceDomains=[]],
 ['privatedb',d=>d.db.DATABASE_URL='postgresql://other:password@postgres.railway.internal/railway'],['mount',d=>d.db.PGDATA='/other'],
 ]) test(`account ${label} fails closed with zero writes and no scope attestation`,async()=>{const f=fixture(change);const r=await run(f,{env:ACCOUNT_ENV});assert.equal(r.outcome,'blocked');assert.equal(r.projectTokenVerified,false);assert.equal(r.targetReadAccess,false);assert.equal(r.bindingVerified,false);assert(!f.requests.some(x=>JSON.parse(x.options.body??'{}').query===QUERIES.snapshots));safe(r)});
test('account denial is a typed STOP without project auth fallback or CLI',async()=>{
 const f=fixture();const fetchImpl=async(url,options)=>{if(url===ENDPOINT){f.requests.push({url,options});return json({errors:[{message:TOKEN+' rawprivate error'}]});}return f.fetchImpl(url,options)};
 const r=await run(f,{env:ACCOUNT_ENV,fetchImpl});assert.equal(r.phase,'ACCOUNT_IDENTITY');assert.equal(r.code,'READONLY_GRAPHQL_REJECTED');assert.equal(f.calls.length,0);assert.equal(f.requests.filter(r=>r.url===ENDPOINT).length,1);safe(r);
});
test('account capabilities refuse project identity, access-before-me and arbitrary variables',async()=>{
 const f=fixture();const a=createReadOnlyAccess({env:ACCOUNT_ENV,context:validateContext(ACCOUNT_ENV),fetchImpl:f.fetchImpl,spawnImpl:f.spawnImpl});await a.assertBranch();
 for(const [query,vars] of [[QUERIES.identity,{}],[QUERIES.accountAccess,{projectId:TARGET.projectId,environmentId:TARGET.environmentId}],[QUERIES.accountIdentity,{extra:'value'}]])await assert.rejects(a.native(query,vars),errorCode('READONLY_QUERY_REJECTED'));
 assert.equal(f.requests.length,1);await a.native(QUERIES.accountIdentity,{});
 await assert.rejects(a.native(QUERIES.accountAccess,{projectId:IDS.other,environmentId:TARGET.environmentId}),errorCode('READONLY_QUERY_REJECTED'));assert.equal(f.requests.length,2);
});
test('project source repository mismatch fails without snapshot reads',async()=>{const f=fixture(d=>d.environment.serviceInstances.edges[0].node.source.repo='other/repo');const r=await run(f);assert.equal(r.code,'BACKEND_SOURCE_UNVERIFIED');assert.equal(r.bindingVerified,false);safe(r)});
test('account unknown detached volumes remain unknown with unobserved snapshot scopes',async()=>{
 const f=threeVolumeFixture();const r=await run(f,{env:ACCOUNT_ENV});assert.equal(r.outcome,'blocked');assert.equal(r.code,'UNCLASSIFIED_DEMO_VOLUMES');assert.equal(r.targetReadAccess,false);assert.equal(r.observations.volumeClassification.databaseSnapshotScope,'unobserved');assert.equal(r.observations.volumeClassification.otherSnapshotScope,'unobserved');assert(r.observations.volumeClassification.volumes.some(v=>v.role==='unattached-unknown'));assert(!f.requests.some(x=>JSON.parse(x.options.body??'{}').query===QUERIES.snapshots));safe(r);
});
test('account nonzero snapshots are descriptive, me identity is discarded even if credential-like',async()=>{
 const f=fixture(d=>{d.accountIdentity={id:TOKEN};d.snapshots=[[{id:IDS.backup}],[{id:IDS.backup}]]});const r=await run(f,{env:ACCOUNT_ENV});assert.equal(r.outcome,'inspected');assert.deepEqual(r.observations.snapshots,{before:1,after:1,stable:true});assert.equal(r.projectTokenVerified,false);assert.equal(r.projectWideVisibility,'unproven');safe(r);
});
test('project stage cannot invoke bearer identity or access queries',async()=>{
 const f=fixture();const a=createReadOnlyAccess({env:ENV,context:validateContext(ENV),fetchImpl:f.fetchImpl,spawnImpl:f.spawnImpl});await a.assertBranch();for(const [q,v] of [[QUERIES.accountIdentity,{}],[QUERIES.accountAccess,{projectId:TARGET.projectId,environmentId:TARGET.environmentId}]])await assert.rejects(a.native(q,v),errorCode('READONLY_QUERY_REJECTED'));assert.equal(f.requests.length,1);
});

test('fixed verified executable path rejects unsafe runtime roots and ignores PATH override',async()=>{
 assert.equal(verifiedRailwayPath('/home/runner/work/_temp'),'/home/runner/work/_temp/clinicos-railway-5.66.0/railway');
 for(const path of [undefined,'','/','relative','/tmp/../other','/tmp/./other','/tmp//other','/tmp/trailing/','/tmp/with space','/tmp/$(command)','/tmp/x\nother'])assert.throws(()=>verifiedRailwayPath(path),errorCode('READONLY_RUNTIME_TEMP_INVALID'));
 const f=fixture();const r=await run(f,{env:{...ENV,PATH:'/untrusted/bin',RAILWAY_CLI_PATH:'/untrusted/railway'}});assert.equal(r.outcome,'inspected');assert(f.calls.every(c=>c.binary===verifiedRailwayPath(ENV.RUNNER_TEMP)));
});
test('account public decoder refuses unscoped and partially scoped variables after real auth stages',async()=>{
 const f=fixture(),a=createReadOnlyAccess({env:ACCOUNT_ENV,context:validateContext(ACCOUNT_ENV),fetchImpl:f.fetchImpl,spawnImpl:f.spawnImpl});await a.assertBranch();await a.native(QUERIES.accountIdentity,{});await a.native(QUERIES.accountAccess,{projectId:TARGET.projectId,environmentId:TARGET.environmentId});
 for(const args of [
  ['variables','--service',TARGET.backendServiceId,'--json'],
  ['variables','--service',TARGET.backendServiceId,'--environment',TARGET.environmentId,'--json'],
  ['variables','--service',TARGET.backendServiceId,'--project',TARGET.projectId,'--json'],
  ['variables','--service',TARGET.backendServiceId,'--project',IDS.other,'--environment',TARGET.environmentId,'--json'],
 ])assert.throws(()=>a.call(args,{json:true}),errorCode('READONLY_COMMAND_REJECTED'));
 assert.equal(f.calls.length,0);a.call(['variables','--service',TARGET.backendServiceId,'--project',TARGET.projectId,'--environment',TARGET.environmentId,'--json'],{json:true});assert.equal(f.calls.length,1);
});
test('runtime-root drift after a minted context cannot select another executable',()=>{
 const context=validateContext(ENV);assert.throws(()=>createReadOnlyAccess({env:{...ENV,RUNNER_TEMP:'/tmp/other'},context}),errorCode('READONLY_CONTEXT_REQUIRED'));
});

for (const [label, payload, shape, category] of [
  ['null errors', null, 'null', 'no-details'],
  ['empty errors', [], 'empty-array', 'no-details'],
  ['recognized token message', [{ message: 'Project token not found' }], 'nonempty-array', 'project-token-not-found'],
  ['recognized authorization code', [{ message: 'private authorization detail', extensions: { code: 'FORBIDDEN', workspaceName: TOKEN } }], 'nonempty-array', 'not-authorized'],
  ['schema validation', [{ message: 'Cannot query field privateField on type PrivateType' }], 'nonempty-array', 'schema-validation'],
  ['rate limit code', [{ message: 'private limit detail', extensions: { code: 'RATE_LIMITED' } }], 'nonempty-array', 'rate-limited'],
  ['unknown message', [{ message: 'private error sentinel' }], 'nonempty-array', 'unknown'],
  ['mixed categories', [{ message: 'not authorized' }, { message: 'Project token not found' }], 'nonempty-array', 'mixed'],
  ['malformed container', 'private malformed sentinel', 'malformed', 'unknown'],
  ['malformed member', [{ message: 'not authorized' }, 'private malformed member'], 'malformed', 'unknown'],
  ['oversized message', [{ message: 'private-oversize-' + 'x'.repeat(600) }], 'malformed', 'unknown'],
  ['too many entries', Array.from({ length: 21 }, () => ({ message: 'not authorized' })), 'malformed', 'unknown'],
  ['malformed extension', [{ message: 'not authorized', extensions: 'private extension' }], 'malformed', 'unknown'],
  ['unknown code', [{ message: 'not authorized', extensions: { code: 'PRIVATE_CODE' } }], 'nonempty-array', 'unknown'],
]) {
  for (const [mode, env] of [['project-token', ENV], ['account-bearer', ACCOUNT_ENV]]) {
    test(`GraphQL failure projection ${label} in ${mode} mode stays blocked and read-bounded`, async () => {
      const f = fixture();
      const fetchImpl = async (url, options) => {
        if (url === ENDPOINT) {
          f.requests.push({ url, options });
          return json({ errors: payload });
        }
        return f.fetchImpl(url, options);
      };
      const receipt = await run(f, { env, fetchImpl });
      assert.equal(receipt.outcome, 'blocked');
      assert.equal(receipt.phase, mode === 'project-token' ? 'TOKEN_IDENTITY' : 'ACCOUNT_IDENTITY');
      assert.equal(receipt.code, 'READONLY_GRAPHQL_REJECTED');
      assert.deepEqual(receipt.observations.graphqlFailure, { errorsShape: shape, category });
      assert.deepEqual(receipt.readRequests, { cli: 0, native: 1, github: 1 });
      assert.equal(f.calls.length, 0);
      assert.equal(f.requests.filter((r) => r.url === ENDPOINT).length, 1);
      assert.equal(f.requests.some((r) => r.options.body?.includes('volumeInstanceBackupList')), false);
      const text = safe(receipt);
      for (const sentinel of [TOKEN, 'private malformed sentinel', 'private authorization detail',
        'private error sentinel', 'private malformed member', 'private extension', 'PRIVATE_CODE'])
        assert.equal(text.includes(sentinel), false, sentinel);
      assert.deepEqual(Object.keys(receipt.observations.graphqlFailure).sort(), ['category', 'errorsShape']);
    });
  }
}
