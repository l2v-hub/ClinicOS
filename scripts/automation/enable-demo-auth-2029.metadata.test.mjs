import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as api from './enable-demo-auth-2029.mjs';
import { DEMO_TARGET } from '../../agent-team/src/bug-pipeline/demo-deployment.mjs';

const selector = { subjectId: 'standalone-pr-525', operationNonce: '11111111-1111-4111-8111-111111111111', reviewedSha: 'a'.repeat(40) };
const activeId = 'a93cffdf-fd91-4a75-bc0d-a97154e0d888', activeSha = 'c'.repeat(40);
const failedId = 'f04e215c-2105-45ca-9b9f-766eabbff925', failedSha = 'd2a08b4850dd954bb790e35f2ed350d5eeacd1c4';
const expiry = '2026-10-31T23:59:59Z', now = () => Date.parse('2026-11-03T18:00:00Z');
const failureQuery = 'query($id:String!){deployment(id:$id){id status projectId environmentId serviceId meta}}';
function fixture() {
  const target = { projectToken: { project: { id: DEMO_TARGET.projectId }, environment: { id: DEMO_TARGET.environmentId, name: 'demo' } },
    deploymentTriggers: { pageInfo: { hasNextPage: false }, edges: [] }, deployments: { pageInfo: { hasNextPage: false }, edges: [] },
    serviceInstance: { serviceId: DEMO_TARGET.serviceId, environmentId: DEMO_TARGET.environmentId, source: { repo: 'l2v-hub/ClinicOS' },
      domains: { serviceDomains: [{ domain: DEMO_TARGET.domain }], customDomains: [] },
      activeDeployments: [{ id: activeId, status: 'SUCCESS', meta: { commitHash: activeSha, arbitraryPrivateField: 'must-not-appear' } }],
      latestDeployment: { id: failedId, status: 'FAILED' } } };
  const failure = { deployment: { id: failedId, status: 'FAILED', projectId: DEMO_TARGET.projectId,
    environmentId: DEMO_TARGET.environmentId, serviceId: DEMO_TARGET.serviceId, meta: { commitHash: failedSha, privateField: 'must-not-appear' } } };
  const status = { mode: 'disabled', simulator: false, temporaryDemo: false, syntheticOnly: true, expiresAt: expiry };
  const ready = { status: 'ready', tier: 'demo', deploymentId: activeId, checks: { database: 'ok', policy: 'ok' } };
  const calls = [], checkpoints = [];
  return { target, failure, status, ready, calls, checkpoints, options: { selector, now,
    assertFreshMain: async () => { checkpoints.push('main'); },
    client: async (query, variables) => { assert.ok(query.startsWith('query')); calls.push({ query, variables });
      if (calls.length === 1) { assert.deepEqual(variables, DEMO_TARGET); return target; }
      assert.equal(calls.length, 2); assert.equal(query, failureQuery); assert.deepEqual(variables, { id: failedId }); return failure; },
    readPublic: async url => { assert.ok([`https://${DEMO_TARGET.domain}/auth/status`, `https://${DEMO_TARGET.domain}/ready`].includes(url));
      checkpoints.push(url); return url.endsWith('/ready') ? ready : status; } } };
}
const read = options => { assert.equal(typeof api.readDemo2029Metadata, 'function'); return api.readDemo2029Metadata(options); };
const rejects = async (f, options = f.options) => {
  await assert.rejects(read(options), e => { assert.equal(e.message, 'DEMO2029_METADATA_REJECTED'); return true; });
  assert.ok(f.calls.every(c => c.query.startsWith('query')));
};

test('fixed read-only metadata derives actual active SHA without registration, state, claims or writes', async () => {
  const f = fixture(); const r = await read(f.options);
  assert.equal(r.status, 'metadata-readonly-verified'); assert.equal(r.code, 'DEMO2029_METADATA');
  assert.equal(r.activeDeploymentId, activeId); assert.equal(r.activeSourceSha, activeSha);
  assert.equal(r.failedDeploymentId, failedId); assert.equal(r.failedSourceSha, failedSha);
  assert.equal(r.previousExpiry, expiry); assert.equal(r.mutationAttempted, false); assert.equal(r.deploymentTriggered, false);
  assert.equal(f.calls.length, 2); assert.equal(f.checkpoints.filter(x => x === 'main').length, 8);
  const text = api.serializeDemo2029Receipt(r); assert.ok(Buffer.byteLength(text) <= 8192);
  assert.doesNotMatch(text, /must-not-appear|privateField|arbitraryPrivateField|authorization|newExpiry/);
});
test('metadata dispatcher never accesses controller or stage dependencies', async () => {
  const f = fixture(), options = { ...f.options, mode: 'metadata' };
  for (const name of ['controller', 'inspect', 'onProgress']) Object.defineProperty(options, name, { enumerable: true, get() { throw Error('state-side-effect'); } });
  const r = await api.runDemo2029Operation(options); assert.equal(r.activeSourceSha, activeSha);
});
test('only exact old expiry and its canonical milliseconds spelling are accepted', async () => {
  const f = fixture(); f.status.expiresAt = '2026-10-31T23:59:59.000Z'; assert.equal((await read(f.options)).previousExpiry, expiry);
});
const invalidTarget = {
  'wrong project': f => f.target.projectToken.project.id = activeId,
  'wrong token environment': f => f.target.projectToken.environment.id = activeId,
  'production token environment': f => f.target.projectToken.environment.name = 'production',
  'wrong service': f => f.target.serviceInstance.serviceId = activeId,
  'wrong environment': f => f.target.serviceInstance.environmentId = activeId,
  'wrong repo': f => f.target.serviceInstance.source.repo = 'other/repo',
  'wrong domain': f => f.target.serviceInstance.domains.serviceDomains[0].domain = 'elsewhere.invalid',
  'unpaged inventory': f => f.target.deployments.pageInfo.hasNextPage = true,
  'inflight inventory': f => f.target.deployments.edges.push({ node: { id: activeId, status: 'BUILDING' } }),
  'no active': f => f.target.serviceInstance.activeDeployments = [],
  'two active': f => f.target.serviceInstance.activeDeployments.push(structuredClone(f.target.serviceInstance.activeDeployments[0])),
  'not success': f => f.target.serviceInstance.activeDeployments[0].status = 'BUILDING',
  'bad active id': f => f.target.serviceInstance.activeDeployments[0].id = 'private-field',
  'missing active hash': f => delete f.target.serviceInstance.activeDeployments[0].meta.commitHash,
  'nonstring active hash': f => f.target.serviceInstance.activeDeployments[0].meta.commitHash = [],
  'invalid active hash': f => f.target.serviceInstance.activeDeployments[0].meta.commitHash = 'c'.repeat(40) + '\n',
  'main is already active': f => f.target.serviceInstance.activeDeployments[0].meta.commitHash = selector.reviewedSha,
  'failed source is active': f => f.target.serviceInstance.activeDeployments[0].meta.commitHash = failedSha,
  'failed id is active': f => f.target.serviceInstance.activeDeployments[0].id = failedId,
  'missing latest': f => delete f.target.serviceInstance.latestDeployment,
  'wrong latest': f => f.target.serviceInstance.latestDeployment.id = activeId,
  'latest building': f => f.target.serviceInstance.latestDeployment.status = 'BUILDING',
  'wrong failure id': f => f.failure.deployment.id = activeId,
  'failure not failed': f => f.failure.deployment.status = 'SUCCESS',
  'wrong failed project': f => f.failure.deployment.projectId = activeId,
  'wrong failed environment': f => f.failure.deployment.environmentId = activeId,
  'wrong failed service': f => f.failure.deployment.serviceId = activeId,
  'wrong failed source': f => f.failure.deployment.meta.commitHash = activeSha,
};
for (const [name, mutate] of Object.entries(invalidTarget)) test(`metadata rejects ${name}`, async () => { const f = fixture(); mutate(f); await rejects(f); });
const invalidPublic = {
  'non-demo ready': f => f.ready.tier = 'production', 'wrong ready ID': f => f.ready.deploymentId = failedId,
  'not ready': f => f.ready.status = 'starting', 'database failing': f => f.ready.checks.database = 'failed',
  'policy failing': f => f.ready.checks.policy = 'failed', 'non-synthetic': f => f.status.syntheticOnly = false,
  'already enabled': f => f.status.mode = 'demo', 'simulator enabled': f => f.status.simulator = true,
  'temporary enabled': f => f.status.temporaryDemo = true, 'permanent enabled': f => f.status.permanentDemo = true,
  'null expiry': f => f.status.expiresAt = null, 'other expiry': f => f.status.expiresAt = '2026-11-09T18:00:00Z',
  'unexpired clock': f => f.options.now = () => Date.parse('2026-10-01T00:00:00Z'),
};
for (const [name, mutate] of Object.entries(invalidPublic)) test(`metadata rejects ${name}`, async () => { const f = fixture(); mutate(f); await rejects(f); });
for (let checkpoint = 1; checkpoint <= 8; checkpoint++) test(`metadata fresh-main fence ${checkpoint} fails closed`, async () => {
  const f = fixture(); let seen = 0; f.options.assertFreshMain = async () => { if (++seen === checkpoint) throw Error('provider-secret-body'); };
  await rejects(f); assert.equal(seen, checkpoint);
});
test('metadata rejects missing or foreign selector before provider access', async () => {
  for (const value of [undefined, { ...selector, subjectId: 'standalone-pr-523' }, { ...selector, target: DEMO_TARGET }]) {
    const f = fixture(); f.options.selector = value; await rejects(f); assert.equal(f.calls.length, 0);
  }
});
test('untrusted provider bodies and errors are not reflected', async () => {
  const f = fixture(); f.options.client = async () => { throw Error('private-provider-payload'); }; await rejects(f);
  const g = fixture(); g.target.serviceInstance.activeDeployments[0].meta.commitHash = 'private-provider-payload'; await rejects(g);
});
test('receipt rejects credential reflection, unknown fields, spoofed metadata writes and bad failed SHA', async () => {
  const r = await read(fixture().options); assert.throws(() => api.serializeDemo2029Receipt(r, [activeSha]));
  assert.throws(() => api.serializeDemo2029Receipt(r, ['\r\n' + activeSha + '\t']));
  for (const extra of [{ rawMeta: {} }, { failedSourceSha: activeSha }, { mutationAttempted: true }, { deploymentTriggered: true }])
    assert.throws(() => api.serializeDemo2029Receipt({ ...r, ...extra }));
});
test('protected workflow metadata choice preserves default inspect, guards and both test selectors', async () => {
  const yaml = await readFile(new URL('../../.github/workflows/enable-demo-auth-2029.yml', import.meta.url), 'utf8');
  assert.match(yaml, /options: \[inspect, stage, metadata\]/); assert.match(yaml, /default: inspect/);
  assert.match(yaml, /github\.run_attempt == 1/); assert.match(yaml, /github\.sha == github\.workflow_sha/);
  assert.match(yaml, /sparse-checkout: \|\r?\n\s+agent-team\r?\n\s+scripts\r?\n\s+\.github\r?\n\s+sparse-checkout-cone-mode: true/);
  assert.match(yaml, /ref: \$\{\{ github\.sha \}\}/); assert.match(yaml, /persist-credentials: false/);
  assert.match(yaml, /timeout-minutes: 10/);
  assert.match(yaml, /glistening-friendship \/ demo/); assert.match(yaml, /group: railway-demo/);
  assert.doesNotMatch(yaml, /secrets\.RAILWAY_TOKEN|pull_request_target|workflow_call/);
  const command = 'node --test scripts/automation/enable-demo-auth-2029.test.mjs scripts/automation/enable-demo-auth-2029.metadata.test.mjs';
  assert.ok(yaml.includes(command)); assert.ok(yaml.indexOf(command) < yaml.indexOf('secrets.RAILWAY_DEMO_TOKEN'));
  const ci = await readFile(new URL('../../.github/workflows/bug-pipeline-tests.yml', import.meta.url), 'utf8');
  assert.ok(ci.includes('scripts/automation/enable-demo-auth-2029.test.mjs scripts/automation/enable-demo-auth-2029.metadata.test.mjs'));
});
test('CLI metadata branches before constructing GitHub/controller state clients', async () => {
  const source = await readFile(new URL('./enable-demo-auth-2029.mjs', import.meta.url), 'utf8');
  assert.ok(source.indexOf("mode === 'metadata'", source.indexOf('async function main()')) < source.indexOf('const github = createGitHub', source.indexOf('async function main()')));
});
