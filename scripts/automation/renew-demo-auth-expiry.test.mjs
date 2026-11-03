import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  KEY, MAX_RENEWAL_MS, RENEW_MUTATION, validateRenewalRequest,
  createRenewalController, inspectRenewalTarget, stageRenewal,
  serializeRenewalReceipt, validateRenewalContext, runRenewalOperation,
} from './renew-demo-auth-expiry.mjs';
import { DEMO_TARGET } from '../../agent-team/src/bug-pipeline/demo-deployment.mjs';
const clone = v => structuredClone(v);
const now = Date.parse('2026-11-02T18:00:00Z');
const reviewedSha = 'a'.repeat(40);
const selector = { subjectId: 'auth-expiry-fixture', operationNonce: '11111111-1111-4111-8111-111111111111', reviewedSha };
const request = { ...selector, previousExpiry: '2026-10-31T23:59:59Z', newExpiry: '2026-11-09T18:00:00Z',
  owner: 'root-fixture', ownerNonce: '22222222-2222-4222-8222-222222222222' };
const env = { GITHUB_REPOSITORY: 'l2v-hub/ClinicOS', GITHUB_REF: 'refs/heads/main',
  GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_SHA: reviewedSha, GITHUB_RUN_ID: '12345', GITHUB_RUN_ATTEMPT: '1',
  GITHUB_WORKFLOW_REF: 'l2v-hub/ClinicOS/.github/workflows/renew-demo-auth-expiry.yml@refs/heads/main',
  RENEW_REVIEWED_SHA: reviewedSha };
function fixture() {
  let remote = { repository: 'l2v-hub/ClinicOS', batches: [], standaloneReviews: [], manualBatches: [{
    id: selector.subjectId, issues: [900], reviewIssue: 900, pr: { number: 901 }, sha: 'b'.repeat(40),
    implementation: [], reviews: [], recoveryHistory: [], release: { status: 'merged', mergeSha: reviewedSha },
    operatorCoordination: { active: true, owner: request.owner, nonce: request.ownerNonce },
    demoAuthExpiryRenewals: [clone(request)],
  }] };
  let mutates = 0, revoked = false, loaded = false, loadedRevision, permissionHook = () => {}, clock = now, authorizationNonce = 'nonce-fixture';
  const store = { load: async () => { loaded = true; loadedRevision = mutates; return clone(remote); }, observe: async () => clone(remote),
    save: async (state, options) => { assert.equal(loaded, true, 'load before optimistic save');
      const expected = loadedRevision; await options.guard(); assert.equal(mutates, expected, 'state-cas-conflict');
      remote = clone(state); mutates++; loadedRevision = mutates; } };
  const github = { createStateStore: () => store, authorizedMaintainer: async () => { permissionHook(remote); return !revoked; } };
  const verifier = async ({ binding, consume }) => {
    assert.equal(consume, true);
    return { provenance: 'user-session', grantId: 'actual-human-fixture', consumptionNonce: authorizationNonce,
      sourceRef: 'user-session:fixture', binding };
  };
  const controller = createRenewalController({ github, authorizationVerifier: verifier, now: () => clock,
    nonce: () => '33333333-3333-4333-8333-333333333333' });
  return { controller, github, verifier, state: () => remote, record: () => remote.manualBatches[0].demoAuthExpiryRenewals[0],
    mutate: cb => cb(remote), onPermission: cb => { permissionHook = cb; }, revoke: () => { revoked = true; }, writes: () => mutates,
    setClock: value => { clock = value; }, setAuthorizationNonce: value => { authorizationNonce = value; } };
}
const fingerprint = 'c'.repeat(64);
const fresh = async () => ({ fingerprint });
async function authorized(x) { return x.controller.authorize(selector, { actor: 'human-fixture', reference: 'user-session:fixture' }); }
async function claimed(x) { await authorized(x); return x.controller.claim(selector,
  { actor: 'worker-fixture', runId: '12345', expectedFingerprint: fingerprint, fresh }); }
test('only one fixed demo expiry key; bounded strict request accepts seven-day maximum', () => {
  assert.equal(KEY, 'DEMO_AUTH_EXPIRES_AT'); assert.equal(MAX_RENEWAL_MS, 7 * 24 * 60 * 60 * 1000);
  assert.equal(validateRenewalRequest(request, now).newExpiry, request.newExpiry);
  assert.match(RENEW_MUTATION, /variableUpsert/); assert.doesNotMatch(RENEW_MUTATION, /variableCollectionUpsert/);
});
test('ordinary seven-day route still rejects the separately authorized 2029 action', () => {
  assert.equal(MAX_RENEWAL_MS, 7 * 24 * 60 * 60 * 1000);
  assert.throws(() => validateRenewalRequest({ ...request, newExpiry: '2029-12-31T23:59:59Z' }, now));
});
for (const [name, change] of [
  ['expired new date', r => { r.newExpiry = '2026-11-01T00:00:00Z'; }],
  ['overlong renewal', r => { r.newExpiry = '2026-11-10T00:00:00Z'; }],
  ['invalid date normalizes', r => { r.newExpiry = '2026-11-32T00:00:00Z'; }],
  ['infinite date', r => { r.newExpiry = ''; }],
  ['noncanonical timezone', r => { r.newExpiry = '2026-11-03T00:00:00+00:00'; }],
  ['unknown field', r => { r.name = 'AUTH_MODE'; }],
  ['future previous date', r => { r.previousExpiry = '2026-11-03T00:00:00Z'; }],
  ['nonce injection', r => { r.operationNonce += '\n'; }],
]) test(`request rejects ${name}`, () => { const r = clone(request); change(r); assert.throws(() => validateRenewalRequest(r, now)); });
test('CLI requires exact trusted main/workflow and first run attempt', () => {
  assert.equal(validateRenewalContext(env).reviewedSha, reviewedSha);
  for (const [k, v] of [['GITHUB_REF','refs/heads/evil'], ['GITHUB_EVENT_NAME','push'],
    ['RENEW_REVIEWED_SHA','d'.repeat(40)], ['GITHUB_RUN_ATTEMPT','2'], ['GITHUB_WORKFLOW_REF','foreign']])
    assert.throws(() => validateRenewalContext({ ...env, [k]: v }));
});
test('no default authorizer accepts a workflow actor or self-declared receipt', async () => {
  const x = fixture();
  const c = createRenewalController({ github: x.github, now: () => now });
  await assert.rejects(() => c.authorize(selector, { actor: 'human-fixture', reference: 'made-up' }));
  assert.equal(x.writes(), 0);
});
test('actual host verifier produces append-only native action receipt, not a budget extension', async () => {
  const x = fixture(); const original = clone(x.state().manualBatches[0]); await authorized(x);
  assert.equal(x.record().authorization.authorization.binding.action, 'renew-demo-auth-expiry');
  assert.equal(x.record().authorization.authorization.binding.budget, null);
  assert.equal(x.record().authorization.authorization.binding.reservation.key, KEY);
  assert.deepEqual(x.state().manualBatches[0].reviews, original.reviews);
  assert.equal(x.state().manualBatches[0].recoveryHistory.length, 1);
});
for (const kind of ['duplicate-subject', 'duplicate-operation', 'shared-issue', 'shared-pr']) test(`native authorization rejects ${kind} ownership`, async () => {
  const x = fixture(); x.mutate(s => {
    const other = clone(s.manualBatches[0]); other.id = kind === 'duplicate-subject' ? selector.subjectId : 'another-auth-owner';
    other.issues = kind === 'shared-issue' ? [900] : [902]; other.pr = { number: kind === 'shared-pr' ? 901 : 903 };
    other.demoAuthExpiryRenewals = kind === 'duplicate-operation' ? [{ ...clone(request), subjectId: other.id }] : [];
    s.standaloneReviews.push(other);
  });
  await assert.rejects(() => authorized(x)); assert.equal(x.writes(), 0);
});
test('consumed capability cannot be copied onto another issue or operation', async () => {
  const x = fixture(); await authorized(x); const foreign = { ...selector, subjectId: 'another-auth-owner', operationNonce: '44444444-4444-4444-8444-444444444444' };
  x.mutate(s => {
    const other = clone(s.manualBatches[0]); other.id = foreign.subjectId; other.issues = [902]; other.pr = { number: 903 };
    other.demoAuthExpiryRenewals[0] = { ...other.demoAuthExpiryRenewals[0], ...foreign };
    s.manualBatches.push(other);
  });
  await assert.rejects(() => x.controller.prepare(foreign));
});
test('a verifier consumption nonce is not reusable for another issue action', async () => {
  const x = fixture(); await authorized(x); const foreign = { ...selector, subjectId: 'another-auth-owner', operationNonce: '44444444-4444-4444-8444-444444444444' };
  x.mutate(s => {
    const other = clone(s.manualBatches[0]); other.id = foreign.subjectId; other.issues = [902]; other.pr = { number: 903 };
    other.recoveryHistory = []; other.demoAuthExpiryRenewals = [{ ...clone(request), ...foreign }]; s.manualBatches.push(other);
  });
  await assert.rejects(() => x.controller.authorize(foreign, { actor: 'human-fixture', reference: 'user-session:fixture' }));
});
test('a stored unauthenticated request cannot claim or stage', async () => {
  const x = fixture(); await assert.rejects(() => x.controller.claim(selector,
    { actor: 'worker-fixture', runId: '12345', expectedFingerprint: fingerprint, fresh }));
  assert.equal(x.record().execution, undefined);
});
test('single durable claim fences concurrent claimant and replay', async () => {
  const x = fixture(); const claim = await claimed(x);
  assert.equal(x.record().execution.status, 'claimed');
  await assert.rejects(() => x.controller.claim(selector,
    { actor: 'worker-fixture', runId: '12345', expectedFingerprint: fingerprint, fresh }));
  await x.controller.intent(claim); assert.equal(x.record().execution.status, 'write-intent');
  await assert.rejects(() => x.controller.intent(claim));
});
test('concurrent claim attempts have one guarded durable winner', async () => {
  const x = fixture(); await authorized(x);
  const args = { actor: 'worker-fixture', runId: '12345', expectedFingerprint: fingerprint, fresh };
  const results = await Promise.allSettled([x.controller.claim(selector, args), x.controller.claim(selector, args)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
});
for (const [name, change] of [
  ['owner', s => { s.manualBatches[0].operatorCoordination.nonce = 'other'; }],
  ['source', s => { s.manualBatches[0].sha = 'd'.repeat(40); }],
  ['expiry', s => { s.manualBatches[0].demoAuthExpiryRenewals[0].newExpiry = '2026-11-04T00:00:00Z'; }],
  ['review history', s => { s.manualBatches[0].reviews.push({ status: 'changed' }); }],
]) test(`changed ${name} invalidates consumed capability before claim`, async () => {
  const x = fixture(); await authorized(x); x.mutate(change);
  await assert.rejects(() => x.controller.claim(selector,
    { actor: 'worker-fixture', runId: '12345', expectedFingerprint: fingerprint, fresh }));
});
test('revoked actor cannot mark the mutation intent', async () => {
  const x = fixture(); const c = await claimed(x); x.revoke(); await assert.rejects(() => x.controller.intent(c));
});
for (const [name, change] of [
  ['execution', s => { s.manualBatches[0].demoAuthExpiryRenewals[0].execution.nonce = '44444444-4444-4444-8444-444444444444'; }],
  ['owner', s => { s.manualBatches[0].operatorCoordination.nonce = '44444444-4444-4444-8444-444444444444'; }],
]) test(`${name} change during final permission await cannot reach Railway`, async () => {
  const x = fixture(); await authorized(x); let reads = 0, mutations = 0, changed = false;
  x.onPermission(s => {
    if (!changed && reads >= 5 && s.manualBatches[0].demoAuthExpiryRenewals[0].execution?.status === 'write-intent') {
      change(s); changed = true;
    }
  });
  const result = await stageRenewal({ selector, actor: 'worker-fixture', runId: '12345', controller: x.controller,
    inspect: async () => { reads++; return { fingerprint }; },
    client: async () => { mutations++; return { variableUpsert: true }; } });
  assert.equal(changed, true); assert.equal(mutations, 0); assert.equal(result.mutationAttempted, false);
});
for (const status of ['staged', 'uncertain']) test(`finish(${status}) cannot leap over a durable write-intent`, async () => {
  const x = fixture(); const c = await claimed(x);
  await assert.rejects(() => x.controller.finish(c, status));
  assert.equal(x.record().execution.status, 'claimed');
});
test('changed preflight fingerprint never reaches durable claim', async () => {
  const x = fixture(); await authorized(x);
  await assert.rejects(() => x.controller.claim(selector, { actor: 'worker-fixture', runId: '12345',
    expectedFingerprint: fingerprint, fresh: async () => ({ fingerprint: 'd'.repeat(64) }) }));
  assert.equal(x.record().execution, undefined);
});
test('blocked or uncertain prior operation prevents a second staged update', async () => {
  const x = fixture(); await claimed(x);
  x.mutate(s => { s.manualBatches[0].demoAuthExpiryRenewals.push({ ...clone(request),
    operationNonce: '44444444-4444-4444-8444-444444444444', execution: { status: 'uncertain' } }); });
  await assert.rejects(() => x.controller.intent({ selector, nonce: '33333333-3333-4333-8333-333333333333', actor:'worker-fixture',runId:'12345',fingerprint }));
});
function targetFixture() {
  const deploymentId = '55555555-5555-4555-8555-555555555555';
  const data = { projectToken: { project: { id: DEMO_TARGET.projectId }, environment: { id: DEMO_TARGET.environmentId, name: 'demo' } },
    serviceInstance: { serviceId: DEMO_TARGET.serviceId, environmentId: DEMO_TARGET.environmentId,
      source: { repo: 'l2v-hub/ClinicOS' }, domains: { serviceDomains: [{ domain: DEMO_TARGET.domain }], customDomains: [] },
      activeDeployments: [{ id: deploymentId, status: 'SUCCESS', meta: { commitHash: 'e'.repeat(40) } }],
      latestDeployment: { id: deploymentId, status: 'SUCCESS' } },
    deploymentTriggers: { edges: [], pageInfo: { hasNextPage: false } },
    deployments: { edges: [], pageInfo: { hasNextPage: false } } };
  const status = { mode: 'disabled', simulator: false, temporaryDemo: false, syntheticOnly: true, expiresAt: request.previousExpiry };
  const ready = { status: 'ready', tier: 'demo', deploymentId, checks: { database: 'ok', policy: 'ok' } };
  return { data, status, ready };
}
test('preflight validates fixed demo, old expiry, health, idle rollout and source without variables query', async () => {
  const x = targetFixture(); let queries = [];
  const snapshot = await inspectRenewalTarget({ request, client: async (query) => { queries.push(query); return x.data; },
    readPublic: async url => url.endsWith('/ready') ? x.ready : x.status, assertFreshMain: async () => {}, now: () => now });
  assert.match(snapshot.fingerprint, /^[a-f0-9]{64}$/); assert.equal(snapshot.target.domain, DEMO_TARGET.domain);
  assert.ok(queries.every(q => !/\bvariables\s*\(/.test(q) && !q.startsWith('mutation')));
});
test('preflight accepts the deployed backend canonical .000Z spelling of the exact strict previous instant', async () => {
  const x = targetFixture(); x.status.expiresAt = '2026-10-31T23:59:59.000Z';
  const snapshot = await inspectRenewalTarget({ request, client: async () => x.data,
    readPublic: async url => url.endsWith('/ready') ? x.ready : x.status,
    assertFreshMain: async () => {}, now: () => now });
  assert.equal(snapshot.previousExpiry, request.previousExpiry);
});
for (const [name, expiresAt] of [
  ['nonzero milliseconds', '2026-10-31T23:59:59.001Z'],
  ['different instant', '2026-11-01T00:00:00.000Z'],
  ['equivalent offset spelling', '2026-11-01T00:59:59+01:00'],
  ['short fractional spelling', '2026-10-31T23:59:59.00Z'],
  ['extra fractional spelling', '2026-10-31T23:59:59.0000Z'],
  ['malformed suffix', '2026-10-31T23:59:59.000Zextra'],
  ['whitespace suffix', '2026-10-31T23:59:59.000Z\n'],
  ['missing value', undefined], ['null', null], ['number', 1793481599000], ['object', {}], ['array', []],
]) test(`preflight rejects public expiry ${name}`, async () => {
  const x = targetFixture(); x.status.expiresAt = expiresAt;
  await assert.rejects(() => inspectRenewalTarget({ request, client: async () => x.data,
    readPublic: async url => url.endsWith('/ready') ? x.ready : x.status,
    assertFreshMain: async () => {}, now: () => now }));
});
for (const [name, change] of [
  ['production', x => { x.ready.tier = 'production'; }],
  ['foreign token', x => { x.data.projectToken.environment.id = 'foreign'; }],
  ['wrong domain', x => { x.data.serviceInstance.domains.serviceDomains[0].domain = 'production.example'; }],
  ['active rollout', x => { x.data.deployments.edges.push({ node: { id: 'rolling' } }); }],
  ['unknown source', x => { x.data.serviceInstance.activeDeployments[0].meta = {}; }],
  ['old expiry drift', x => { x.status.expiresAt = '2026-11-01T00:00:00Z'; }],
  ['nonsynthetic data', x => { x.status.syntheticOnly = false; }],
]) test(`preflight rejects ${name}`, async () => {
  const x = targetFixture(); change(x);
  await assert.rejects(() => inspectRenewalTarget({ request, client: async () => x.data,
    readPublic: async url => url.endsWith('/ready') ? x.ready : x.status, assertFreshMain: async () => {}, now: () => now }));
});
test('stage uses a durable claim/intent and exactly one fixed-key no-deploy mutation', async () => {
  const x = fixture(); await authorized(x); const calls = [];
  const receipt = await stageRenewal({ selector, actor: 'worker-fixture', runId: '12345', controller: x.controller,
    inspect: fresh, client: async (query, vars) => { calls.push({ query, vars }); return { variableUpsert: true }; }, now: () => now });
  assert.equal(receipt.status, 'staged-awaiting-explicit-deployment'); assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].vars.input, { projectId: DEMO_TARGET.projectId, environmentId: DEMO_TARGET.environmentId,
    serviceId: DEMO_TARGET.serviceId, name: KEY, value: request.newExpiry, skipDeploys: true });
  assert.equal(x.record().execution.status, 'staged');
});
async function firstStage(x) {
  await authorized(x);
  return stageRenewal({ selector, actor: 'worker-fixture', runId: '12345', controller: x.controller,
    inspect: fresh, client: async () => ({ variableUpsert: true }) });
}
function addLaterRequest(x, { previousExpiry = request.newExpiry, clock = Date.parse(request.newExpiry) + 1000 } = {}) {
  x.setClock(clock); x.setAuthorizationNonce('nonce-fixture-next');
  const later = { ...request, operationNonce: '44444444-4444-4444-8444-444444444444', previousExpiry,
    newExpiry: new Date(clock + 2 * 24 * 60 * 60 * 1000).toISOString().replace('.000Z', 'Z') };
  x.mutate(s => s.manualBatches[0].demoAuthExpiryRenewals.push(later));
  return { subjectId: later.subjectId, operationNonce: later.operationNonce, reviewedSha: later.reviewedSha };
}
test('a completed expired staged renewal permits a separately authorized later stage without rewriting history', async () => {
  const x = fixture(); await firstStage(x);
  const old = clone(x.record()); const later = addLaterRequest(x);
  await x.controller.authorize(later, { actor: 'human-fixture', reference: 'user-session:later-renewal' });
  let mutations = 0, publicExpiryReads = 0; const live = targetFixture(); live.status.expiresAt = request.newExpiry;
  const result = await stageRenewal({ selector: later, actor: 'worker-fixture', runId: '12346', controller: x.controller,
    inspect: q => inspectRenewalTarget({ request: q, client: async () => live.data,
      readPublic: async url => { if (url.endsWith('/ready')) return live.ready; publicExpiryReads++; return live.status; },
      assertFreshMain: async () => {}, now: () => Date.parse(request.newExpiry) + 1000 }),
    client: async (_query, vars) => { mutations++; assert.equal(vars.input.value, '2026-11-11T18:00:01Z'); return { variableUpsert: true }; } });
  assert.equal(result.status, 'staged-awaiting-explicit-deployment'); assert.equal(mutations, 1);
  assert.ok(publicExpiryReads >= 5, 'The later renewal still proves the exact public previous expiry at each write boundary');
  assert.deepEqual(x.record(), old); assert.equal(x.state().manualBatches[0].recoveryHistory.length, 2);
  assert.equal(x.state().manualBatches[0].demoAuthExpiryRenewals[1].execution.status, 'staged');
});
test('expired staged history without matching live previous expiry never reaches a second claim or write', async () => {
  const x = fixture(); await firstStage(x); const later = addLaterRequest(x);
  await x.controller.authorize(later, { actor: 'human-fixture', reference: 'user-session:later-renewal' });
  let mutations = 0; const live = targetFixture();
  await assert.rejects(() => stageRenewal({ selector: later, actor: 'worker-fixture', runId: '12346', controller: x.controller,
    inspect: q => inspectRenewalTarget({ request: q, client: async () => live.data,
      readPublic: async url => url.endsWith('/ready') ? live.ready : live.status,
      assertFreshMain: async () => {}, now: () => Date.parse(request.newExpiry) + 1000 }),
    client: async () => { mutations++; return { variableUpsert: true }; } }));
  assert.equal(mutations, 0); assert.equal(x.state().manualBatches[0].demoAuthExpiryRenewals[1].execution, undefined);
});
for (const status of ['claimed', 'write-intent', 'uncertain']) test(`prior ${status} renewal still blocks a later action after expiry`, async () => {
  const x = fixture(); await firstStage(x); x.mutate(s => { s.manualBatches[0].demoAuthExpiryRenewals[0].execution.status = status; });
  const later = addLaterRequest(x);
  await assert.rejects(() => x.controller.authorize(later, { actor: 'human-fixture', reference: 'user-session:later-renewal' }));
});
test('expired prior stage is not a license to skip an unobserved expiry gap', async () => {
  const x = fixture(); await firstStage(x);
  const later = addLaterRequest(x, { previousExpiry: '2026-11-10T18:00:00Z', clock: Date.parse('2026-11-12T18:00:00Z') });
  await assert.rejects(() => x.controller.authorize(later, { actor: 'human-fixture', reference: 'user-session:later-renewal' }));
});
test('a prior stage whose expiry is still live cannot authorize a parallel renewal', async () => {
  const x = fixture(); await firstStage(x);
  const later = addLaterRequest(x, { previousExpiry: request.previousExpiry, clock: now + 1000 });
  await assert.rejects(() => x.controller.authorize(later, { actor: 'human-fixture', reference: 'user-session:parallel-renewal' }));
});
test('duplicate or parallel historical staged cutoffs remain ambiguous and blocked', async () => {
  const x = fixture(); await firstStage(x);
  x.mutate(s => s.manualBatches[0].demoAuthExpiryRenewals.push({ ...clone(s.manualBatches[0].demoAuthExpiryRenewals[0]),
    operationNonce: '55555555-5555-4555-8555-555555555555' }));
  const later = addLaterRequest(x);
  await assert.rejects(() => x.controller.authorize(later, { actor: 'human-fixture', reference: 'user-session:later-renewal' }));
});
test('uncertain POST is retained, finite and never retried or blindly replayed', async () => {
  const x = fixture(); await authorized(x); let writes = 0;
  const args = { selector, actor: 'worker-fixture', runId: '12345', controller: x.controller, inspect: fresh,
    client: async () => { writes++; throw Error('private-provider-error secret-payload'); }, now: () => now };
  const r = await stageRenewal(args);
  assert.equal(r.status, 'mutation-uncertain-do-not-retry'); assert.equal(writes, 1);
  assert.equal(x.record().execution.status, 'uncertain');
  assert.ok(!JSON.stringify(r).includes('secret-payload')); await assert.rejects(() => stageRenewal(args)); assert.equal(writes, 1);
});
test('stage never accepts a missing native controller capability adapter', async () => {
  let writes = 0; await assert.rejects(() => stageRenewal({ selector, inspect: fresh, client: async () => { writes++; } }));
  assert.equal(writes, 0);
});
test('default inspect validates canonical request/target without authority consumption or mutation', async () => {
  const x = fixture(); let mutations = 0;
  const receipt = await runRenewalOperation({ selector, controller: x.controller, inspect: fresh,
    client: async () => { mutations++; } });
  assert.equal(receipt.status, 'inspection-passed-awaiting-explicit-stage');
  assert.equal(receipt.mutationAttempted, false); assert.equal(mutations, 0); assert.equal(x.writes(), 0);
  assert.equal(x.record().authorization, undefined);
});
test('source/main drift after durable intent still blocks before Railway mutation', async () => {
  const x = fixture(); await authorized(x); let reads = 0, mutations = 0;
  const result = await stageRenewal({ selector, actor: 'worker-fixture', runId: '12345', controller: x.controller,
    inspect: async () => ({ fingerprint: ++reads >= 5 ? 'd'.repeat(64) : fingerprint }),
    client: async () => { mutations++; return { variableUpsert: true }; } });
  assert.equal(result.status, 'blocked-before-write'); assert.equal(mutations, 0);
  assert.equal(x.record().execution.status, 'blocked-before-write');
});
test('async preflight callbacks cannot rewrite the canonical expiry through request aliases', async () => {
  const x = fixture(); await authorized(x); let actual;
  const result = await stageRenewal({ selector, actor: 'worker-fixture', runId: '12345', controller: x.controller,
    inspect: async value => { value.newExpiry = '2099-01-01T00:00:00Z'; return { fingerprint }; },
    client: async (_query, value) => { actual = value.input.value; return { variableUpsert: true }; } });
  assert.equal(actual, request.newExpiry); assert.equal(result.newExpiry, request.newExpiry);
});
test('receipt serialization refuses credentials and arbitrary error fields', () => {
  const valid = { schemaVersion: 1, status: 'blocked-before-write', code: 'RENEWAL_BLOCKED',
    mutationAttempted: false, deploymentTriggered: false };
  assert.equal(JSON.parse(serializeRenewalReceipt(valid)).code, valid.code);
  assert.throws(() => serializeRenewalReceipt({ ...valid, detail: 'private error' }));
  assert.throws(() => serializeRenewalReceipt({ ...valid, code: 'SECRET-value' }, ['SECRET-value']));
  assert.throws(() => serializeRenewalReceipt(valid, [' RENEWAL_BLOCKED ']));
  assert.throws(() => serializeRenewalReceipt(valid, ['RENEWAL_BLOCKED']));
});
test('actual CLI rejects untrusted context with only a finite private receipt on Windows and Linux', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'clinicos-renewal-test-'));
  assert.equal(path.dirname(root), path.resolve(tmpdir())); assert.ok(path.basename(root).startsWith('clinicos-renewal-test-'));
  try {
    const child = spawnSync(process.execPath, [fileURLToPath(new URL('./renew-demo-auth-expiry.mjs', import.meta.url))], {
      cwd: root, encoding: 'utf8', timeout: 10000,
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP,
        RAILWAY_TOKEN: 'synthetic-credential-must-not-appear', GITHUB_EVENT_NAME: 'push' },
    });
    assert.equal(child.status, 1); assert.equal(child.stderr, '');
    const receipt = JSON.parse(await readFile(path.join(root, 'demo-auth-renewal-receipt.json'), 'utf8'));
    assert.equal(receipt.status, 'blocked-before-write'); assert.equal(receipt.mutationAttempted, false);
    assert.ok(!child.stdout.includes('synthetic-credential-must-not-appear'));
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('workflow pins trusted main, exact target environment, shared deployment queue and tests before secrets', async () => {
  const yaml = await readFile(new URL('../../.github/workflows/renew-demo-auth-expiry.yml', import.meta.url), 'utf8');
  assert.match(yaml, /group: railway-demo/); assert.match(yaml, /contents: read/);
  assert.match(yaml, /environment: 'glistening-friendship \/ demo'/);
  assert.match(yaml, /secrets\.RAILWAY_DEMO_TOKEN/); assert.doesNotMatch(yaml, /secrets\.RAILWAY_TOKEN[ }]/);
  assert.match(yaml, /secrets\.CLINICOS_BOT_TOKEN/); assert.match(yaml, /if: always\(\)/);
  assert.match(yaml, /options: \[inspect, stage\]/); assert.match(yaml, /default: inspect/);
  assert.ok(yaml.indexOf('run: node --test') < yaml.indexOf('secrets.RAILWAY_DEMO_TOKEN'));
  for (const line of yaml.split('\n').filter(l => /uses:/.test(l))) assert.match(line, /@[a-f0-9]{40}\s*$/);
  assert.doesNotMatch(yaml, /\$\{\{\s*inputs\.[^}]+\}\}.*(?:curl|railway|node)/);
});
