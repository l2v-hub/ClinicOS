import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_TARGET } from '../../agent-team/src/bug-pipeline/demo-deployment.mjs';
import { FAILED_DEPLOYMENT } from './demo-no-expiry-controller.mjs';
import { inspectNoExpiryTarget } from './enable-demo-auth-no-expiry.mjs';

const active = 'a93cffdf-fd91-4a75-bc0d-a97154e0d888',
  source = 'c'.repeat(40);
const request = { activeDeploymentId: active, activeSourceSha: source,
  failedDeploymentId: FAILED_DEPLOYMENT.id, failedSourceSha: FAILED_DEPLOYMENT.sourceSha,
  reviewedSha: 'a'.repeat(40) };
function fixture() {
  const target = {
    projectToken: {
      project: { id: DEMO_TARGET.projectId },
      environment: { id: DEMO_TARGET.environmentId, name: 'demo' },
    },
    deploymentTriggers: { pageInfo: { hasNextPage: false }, edges: [] },
    deployments: { pageInfo: { hasNextPage: false }, edges: [] },
    serviceInstance: {
      serviceId: DEMO_TARGET.serviceId,
      environmentId: DEMO_TARGET.environmentId,
      source: { repo: 'l2v-hub/ClinicOS' },
      domains: { serviceDomains: [{ domain: DEMO_TARGET.domain }], customDomains: [] },
      activeDeployments: [{ id: active, status: 'SUCCESS', meta: { commitHash: source } }],
      latestDeployment: { id: FAILED_DEPLOYMENT.id, status: 'FAILED' },
    },
  };
  const failure = {
    id: FAILED_DEPLOYMENT.id,
    status: 'FAILED',
    projectId: DEMO_TARGET.projectId,
    environmentId: DEMO_TARGET.environmentId,
    serviceId: DEMO_TARGET.serviceId,
    meta: { commitHash: FAILED_DEPLOYMENT.sourceSha },
  };
  const variables = {
    NODE_ENV: 'production',
    AUTH_MODE: 'demo',
    DEMO_DATASET_ID: 'synthetic-v1',
    ALLOW_PRODUCTION_DEMO_AUTH: 'true',
    ROLE_SIMULATOR_ENABLED: 'true',
    ROLE_SIMULATOR_ALLOW_PRODUCTION: 'true',
    ROLE_SIMULATOR_SECRET: 'fixture-secret-do-not-reflect-xxxxxxxx',
  };
  const client = async (query) =>
    query.includes('variables(')
      ? { variables }
      : query.includes('deployment(id:')
        ? { deployment: failure }
        : target;
  const readPublic = async (path) =>
    path === '/ready'
      ? {
          status: 'ready',
          tier: 'demo',
          deploymentId: active,
          checks: { database: 'ok', policy: 'ok' },
        }
      : { mode: 'disabled', simulator: false, syntheticOnly: true, temporaryDemo: false };
  return { target, failure, variables, client, readPublic, assertFreshMain: async () => {} };
}
test('known failed latest plus healthy active source is accepted, secrets erased', async () => {
  const f = fixture(),
    r = await inspectNoExpiryTarget(f);
  assert.equal(r.activeDeploymentId, active);
  assert.equal(r.activeSourceSha, source);
  assert.equal(r.failedDeploymentId, FAILED_DEPLOYMENT.id);
  assert.equal(r.failedSourceSha, FAILED_DEPLOYMENT.sourceSha);
  assert.deepEqual(f.variables, {});
  assert.ok(!JSON.stringify(r).includes('fixture-secret'));
});
test('bound request matches all deployment coordinates', async () => {
  const f = fixture();
  assert.equal((await inspectNoExpiryTarget({ ...f, request })).activeSourceSha, source);
  assert.deepEqual(f.variables, {});
});
for (const field of ['activeDeploymentId', 'activeSourceSha', 'failedDeploymentId', 'failedSourceSha', 'reviewedSha'])
  test(`bound request ${field} drift rejects and erases variables`, async () => {
    const f = fixture();
    const value = field === 'reviewedSha' ? source : field.endsWith('Id')
      ? '99999999-9999-4999-8999-999999999999' : '9'.repeat(40);
    await assert.rejects(inspectNoExpiryTarget({ ...f, request: { ...request, [field]: value } }));
    assert.deepEqual(f.variables, {});
  });
for (const bad of [null, {}, { ...request, reviewedSha: 'not-a-sha' }])
  test(`malformed bound request rejects and erases variables: ${JSON.stringify(bad)}`, async () => {
    const f = fixture();
    await assert.rejects(inspectNoExpiryTarget({ ...f, request: bad }));
    assert.deepEqual(f.variables, {});
  });
for (const failedPath of ['/ready', '/auth/status'])
  test(`variable map erased if ${failedPath} rejects`, async () => {
    const f = fixture(),
      read = f.readPublic;
    f.readPublic = async (path) => {
      if (path === failedPath) throw Error('synthetic failure');
      return read(path);
    };
    await assert.rejects(inspectNoExpiryTarget(f));
    assert.deepEqual(f.variables, {});
  });
for (const field of ['id', 'status', 'projectId', 'environmentId', 'serviceId', 'source'])
  test(`failed deployment ${field} drift rejected`, async () => {
    const f = fixture();
    if (field === 'source') f.failure.meta.commitHash = '0'.repeat(40);
    else f.failure[field] = 'foreign';
    await assert.rejects(inspectNoExpiryTarget(f));
  });
