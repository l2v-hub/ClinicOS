import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createMainVerifier } from './configure-demo-source.mjs';
import { createGitHub } from '../../agent-team/src/bug-pipeline/github.mjs';
import { createRunner } from '../../agent-team/src/bug-pipeline/process.mjs';
import { authorizationBinding, consumeOperatorAuthorization } from '../../agent-team/src/bug-pipeline/operator-authorization.mjs';
import { historyDigest } from '../../agent-team/src/bug-pipeline/attempt-budget.mjs';
import { DEMO_TARGET, DEMO_SOURCE_POLICIES, createRailwayClient, inspectDemo } from '../../agent-team/src/bug-pipeline/demo-deployment.mjs';

export const KEY = 'DEMO_AUTH_EXPIRES_AT';
export const MAX_RENEWAL_MS = 7 * 24 * 60 * 60 * 1000;
export const RENEW_MUTATION = 'mutation($input:VariableUpsertInput!){variableUpsert(input:$input)}';
const ACTION = 'renew-demo-auth-expiry';
const REPO = 'l2v-hub/ClinicOS';
const WORKFLOW = `${REPO}/.github/workflows/renew-demo-auth-expiry.yml@refs/heads/main`;
const SHA = /^[a-f0-9]{40}$/;
const HASH = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/;
const clone = value => structuredClone(value);
const collections = ['batches', 'manualBatches', 'standaloneReviews'];
const statuses = ['claimed', 'write-intent', 'staged', 'uncertain', 'blocked-before-write'];
function exactKeys(value, keys) { assert.deepEqual(Object.keys(value).sort(), keys.slice().sort()); }
function expiry(value) {
  assert.ok(typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value));
  const epoch = Date.parse(value);
  assert.ok(Number.isFinite(epoch));
  assert.equal(new Date(epoch).toISOString().replace('.000Z', 'Z'), value);
  return epoch;
}
function select(value) {
  exactKeys(value, ['subjectId', 'operationNonce', 'reviewedSha']);
  assert.match(value.subjectId, ID); assert.match(value.operationNonce, UUID); assert.match(value.reviewedSha, SHA);
  return clone(value);
}
function requestData(q) {
  return Object.fromEntries(['subjectId', 'operationNonce', 'reviewedSha', 'previousExpiry', 'newExpiry', 'owner', 'ownerNonce'].map(k => [k, q[k]]));
}
export function validateRenewalRequest(raw, clock = Date.now()) {
  exactKeys(raw, ['subjectId', 'operationNonce', 'reviewedSha', 'previousExpiry', 'newExpiry', 'owner', 'ownerNonce']);
  select({ subjectId: raw.subjectId, operationNonce: raw.operationNonce, reviewedSha: raw.reviewedSha });
  assert.match(raw.owner, ID); assert.match(raw.ownerNonce, UUID);
  const previous = expiry(raw.previousExpiry), next = expiry(raw.newExpiry);
  assert.ok(Number.isFinite(clock) && previous <= clock && next > clock && next > previous);
  assert.ok(next - clock <= MAX_RENEWAL_MS, 'Renewal exceeds the seven-day ceiling');
  return clone(raw);
}
export function validateRenewalContext(env) {
  assert.equal(env.GITHUB_REPOSITORY, REPO); assert.equal(env.GITHUB_REF, 'refs/heads/main');
  assert.equal(env.GITHUB_EVENT_NAME, 'workflow_dispatch'); assert.equal(env.GITHUB_WORKFLOW_REF, WORKFLOW);
  assert.match(env.GITHUB_SHA ?? '', SHA); assert.equal(env.RENEW_REVIEWED_SHA, env.GITHUB_SHA);
  assert.match(env.GITHUB_RUN_ID ?? '', /^[1-9][0-9]{0,19}$/);
  assert.equal(env.GITHUB_RUN_ATTEMPT, '1', 'Rerun requires a new independently authorized operation');
  return { repository: REPO, reviewedSha: env.GITHUB_SHA, runId: env.GITHUB_RUN_ID, runAttempt: 1 };
}
function entries(state) { return collections.flatMap(k => (state[k] ?? []).map(subject => ({ collection: k, subject }))); }
function assertPriorRenewals(all, current, request, clock) {
  const stages = [];
  for (const { subject, q } of all) {
    if (q === current || !q.execution || q.execution.status === 'blocked-before-write') continue;
    assert.equal(q.execution.status, 'staged', 'In-flight or uncertain renewal requires operator reconciliation');
    const saved = q.authorization, auth = saved?.authorization, authorizedAt = Date.parse(saved?.authorizedAt);
    assert.ok(Number.isFinite(authorizedAt) && authorizedAt <= clock && new Date(authorizedAt).toISOString() === saved.authorizedAt);
    const prior = validateRenewalRequest(requestData(q), authorizedAt), end = expiry(prior.newExpiry);
    assert.ok(end <= clock && end <= expiry(request.previousExpiry), 'A staged renewal is still live or overlaps this request');
    assert.ok(['user-session', 'distinct-maintainer-comment'].includes(auth?.provenance));
    assert.equal(auth.bindingDigest, historyDigest(auth.binding));
    assert.equal(auth.binding.action, ACTION); assert.equal(auth.binding.entityId, subject.id);
    const reserved = { ...prior, target: DEMO_TARGET, key: KEY, skipDeploys: true };
    for (const [key, value] of Object.entries(reserved)) assert.deepEqual(auth.binding.reservation[key], value);
    const history = subject.recoveryHistory ?? [], index = saved.historyBeforeLength;
    assert.ok(Number.isSafeInteger(index) && index >= 0 && history.length > index);
    assert.equal(historyDigest(history.slice(0, index)), saved.historyBeforeDigest);
    assert.equal(history[index].action, ACTION); assert.equal(history[index].nonce, saved.auditNonce);
    assert.deepEqual(history[index].authorization, auth);
    stages.push(prior);
  }
  stages.sort((a, b) => expiry(a.newExpiry) - expiry(b.newExpiry));
  for (let index = 1; index < stages.length; index++) {
    assert.ok(expiry(stages[index - 1].newExpiry) < expiry(stages[index].newExpiry), 'Parallel staged cutoff is ambiguous');
    assert.equal(stages[index].previousExpiry, stages[index - 1].newExpiry, 'Historical stages do not form one expiry chain');
  }
  if (stages.length) assert.equal(stages.at(-1).newExpiry, request.previousExpiry,
    'The new previous expiry must exactly continue the latest completed staged cutoff');
}
function locate(state, input, clock) {
  const selector = select(input); assert.equal(state.repository, REPO);
  const owners = entries(state).filter(x => x.subject.id === selector.subjectId);
  assert.equal(owners.length, 1);
  const b = owners[0].subject;
  assert.ok(b.issues?.length && !b.issues.some(id => [470, 475, 506, 516].includes(id)), 'Independent auth owner required');
  const all = entries(state).flatMap(({ subject }) => (subject.demoAuthExpiryRenewals ?? []).map(q => ({ subject, q })));
  const matches = all.filter(x => x.q.operationNonce === selector.operationNonce);
  assert.equal(matches.length, 1); assert.equal(matches[0].subject, b);
  const q = matches[0].q;
  assert.equal(q.subjectId, b.id); assert.equal(q.reviewedSha, selector.reviewedSha);
  const request = validateRenewalRequest(requestData(q), clock);
  assert.equal(b.operatorCoordination?.active, true);
  assert.equal(b.operatorCoordination.owner, request.owner); assert.equal(b.operatorCoordination.nonce, request.ownerNonce);
  assert.match(b.sha ?? '', SHA);
  assert.ok(['merged', 'deployed'].includes(b.release?.status)); assert.equal(b.release.mergeSha, request.reviewedSha);
  assertPriorRenewals(all, q, request, clock);
  return { state, b, q, request, selector };
}
function reservation(value) {
  return { ...value.request, target: DEMO_TARGET, key: KEY, skipDeploys: true,
    releaseDigest: historyDigest(value.b.release), ownerDigest: historyDigest(value.b.operatorCoordination) };
}
function verify(value) {
  const saved = value.q.authorization; assert.ok(saved?.authorization);
  const { b } = value, length = saved.historyBeforeLength, history = b.recoveryHistory ?? [];
  assert.ok(Number.isSafeInteger(length) && length >= 0 && history.length === length + 1);
  assert.equal(historyDigest(history.slice(0, length)), saved.historyBeforeDigest);
  assert.equal(history[length].action, ACTION); assert.equal(history[length].nonce, saved.auditNonce);
  assert.deepEqual(history[length].authorization, saved.authorization);
  const auth = saved.authorization;
  assert.ok(['user-session', 'distinct-maintainer-comment'].includes(auth.provenance));
  const baseline = clone(value.state);
  const subject = entries(baseline).find(x => x.subject.id === b.id).subject;
  subject.recoveryHistory = subject.recoveryHistory.slice(0, length);
  const binding = authorizationBinding({ state: baseline, subject, actor: auth.binding.actor,
    action: ACTION, reservation: reservation(value), budget: null });
  assert.deepEqual(auth.binding, binding); assert.equal(auth.bindingDigest, historyDigest(binding));
  return saved;
}
export function createRenewalController({ github, authorizationVerifier, now = Date.now, nonce = randomUUID }) {
  const store = github.createStateStore();
  const observe = async input => locate(await store.observe(), input, now());
  async function allowed(value, actor) {
    assert.ok(typeof actor === 'string' && actor && await github.authorizedMaintainer(actor));
    const author = value.q.authorization?.authorization.binding.actor;
    if (author) assert.equal(await github.authorizedMaintainer(author), true);
  }
  async function save(value, before, actor, guard = async () => {}) {
    value.state.updatedAt = new Date(now()).toISOString();
    await store.save(value.state, { guard: async () => {
      const current = await observe(value.selector); await allowed(current, actor);
      assert.equal(JSON.stringify(current.b), before); await guard();
      assert.equal(JSON.stringify((await observe(value.selector)).b), before);
    } });
  }
  async function authorize(input, { actor, reference }) {
    const value = locate(await store.load(), input, now()), before = JSON.stringify(value.b);
    assert.equal(value.q.authorization, undefined); assert.equal(value.q.execution, undefined);
    await allowed(value, actor);
    const binding = authorizationBinding({ state: value.state, subject: value.b, actor,
      action: ACTION, reservation: reservation(value), budget: null });
    const authorization = await consumeOperatorAuthorization({ state: value.state,
      verifier: authorizationVerifier, reference, binding });
    const history = value.b.recoveryHistory ?? [];
    const saved = { authorization, historyBeforeLength: history.length, historyBeforeDigest: historyDigest(history),
      auditNonce: nonce(), authorizedAt: new Date(now()).toISOString() };
    value.q.authorization = saved;
    value.b.recoveryHistory = [...history, { action: ACTION, nonce: saved.auditNonce,
      at: saved.authorizedAt, operationNonce: value.request.operationNonce, authorization }];
    await save(value, before, actor); return clone(saved);
  }
  async function prepare(input) {
    const value = await observe(input); verify(value); assert.equal(value.q.execution, undefined);
    return { request: clone(value.request), authorizationDigest: value.q.authorization.authorization.bindingDigest };
  }
  async function inspectRequest(input) { return { request: clone((await observe(input)).request) }; }
  async function claim(input, { actor, runId, expectedFingerprint, fresh }) {
    const value = locate(await store.load(), input, now()), before = JSON.stringify(value.b); verify(value);
    assert.equal(value.q.execution, undefined); assert.match(expectedFingerprint, HASH);
    assert.match(String(runId), /^[1-9][0-9]{0,19}$/); assert.equal(typeof fresh, 'function');
    const guard = async () => assert.equal((await fresh()).fingerprint, expectedFingerprint);
    await allowed(value, actor); await guard();
    const execution = { nonce: nonce(), actor, runId: String(runId), status: 'claimed',
      fingerprint: expectedFingerprint, startedAt: new Date(now()).toISOString() };
    value.q.execution = execution;
    await save(value, before, actor, guard);
    return { selector: clone(value.selector), ...clone(execution) };
  }
  async function owned(claim, status, mutable = false) {
    const value = mutable ? locate(await store.load(), claim.selector, now()) : await observe(claim.selector);
    verify(value); const before = historyDigest(value.b); await allowed(value, claim.actor);
    const current = await observe(claim.selector); verify(current);
    assert.equal(historyDigest(current.b), before, 'Renewal ownership changed during permission check');
    const execution = value.q.execution; assert.ok(execution && statuses.includes(execution.status));
    for (const field of ['nonce', 'actor', 'runId', 'fingerprint']) assert.equal(execution[field], claim[field]);
    if (status) assert.equal(execution.status, status);
    return value;
  }
  async function intent(claim) {
    const value = await owned(claim, 'claimed', true), before = JSON.stringify(value.b);
    value.q.execution.status = 'write-intent'; value.q.execution.intentAt = new Date(now()).toISOString();
    await save(value, before, claim.actor);
  }
  async function finish(claim, status) {
    assert.ok(['staged', 'uncertain', 'blocked-before-write'].includes(status));
    const value = await owned(claim, undefined, true), before = JSON.stringify(value.b);
    assert.ok((status === 'blocked-before-write' ? ['claimed', 'write-intent'] : ['write-intent']).includes(value.q.execution.status));
    value.q.execution.status = status; value.q.execution.finishedAt = new Date(now()).toISOString();
    await save(value, before, claim.actor);
  }
  return { authorize, prepare, inspectRequest, claim, intent, finish, assertOwned: owned };
}
export async function inspectRenewalTarget({ request: raw, client, readPublic, assertFreshMain, now = Date.now }) {
  const request = validateRenewalRequest(raw, now()); assert.equal(typeof assertFreshMain, 'function');
  await assertFreshMain();
  const data = await inspectDemo(client, DEMO_SOURCE_POLICIES.exact);
  const instance = data.serviceInstance, active = instance.activeDeployments;
  assert.equal(data.deployments?.pageInfo?.hasNextPage, false); assert.deepEqual(data.deployments.edges, []);
  assert.ok(Array.isArray(active) && active.length === 1);
  assert.match(active[0].id, UUID); assert.equal(active[0].status, 'SUCCESS');
  assert.match(active[0].meta?.commitHash ?? '', SHA);
  assert.equal(instance.latestDeployment?.id, active[0].id); assert.equal(instance.latestDeployment.status, 'SUCCESS');
  const status = await readPublic(`https://${DEMO_TARGET.domain}/auth/status`);
  assert.equal(status.mode, 'disabled'); assert.equal(status.simulator, false);
  assert.equal(status.temporaryDemo, false); assert.equal(status.syntheticOnly, true);
  assert.equal(status.expiresAt, request.previousExpiry);
  const ready = await readPublic(`https://${DEMO_TARGET.domain}/ready`);
  assert.equal(ready.status, 'ready'); assert.equal(ready.tier, 'demo');
  assert.equal(ready.deploymentId, active[0].id);
  assert.equal(ready.checks?.database, 'ok'); assert.equal(ready.checks?.policy, 'ok');
  await assertFreshMain();
  const snapshot = { target: DEMO_TARGET, reviewedSha: request.reviewedSha,
    deploymentId: active[0].id, sourceSha: active[0].meta.commitHash, previousExpiry: request.previousExpiry };
  return { ...snapshot, fingerprint: historyDigest(snapshot) };
}
export async function stageRenewal({ selector, actor, runId, controller, inspect, client, onProgress = () => {} }) {
  assert.equal(typeof controller?.prepare, 'function'); assert.equal(typeof inspect, 'function');
  selector = Object.freeze(select(selector));
  const prepared = await controller.prepare(selector), request = Object.freeze(clone(prepared.request));
  const fresh = () => inspect(clone(request)), snapshot = Object.freeze(clone(await fresh()));
  const claim = await controller.claim(selector, { actor, runId, expectedFingerprint: snapshot.fingerprint, fresh });
  let attempted = false, acknowledged = false;
  const receipt = (status, code) => ({ schemaVersion: 1, status, code, subjectId: selector.subjectId,
    reviewedSha: selector.reviewedSha, operationNonce: selector.operationNonce,
    authorizationDigest: prepared.authorizationDigest, fingerprint: snapshot.fingerprint,
    previousExpiry: request.previousExpiry, newExpiry: request.newExpiry,
    mutationAttempted: attempted, deploymentTriggered: false });
  onProgress(receipt('claimed-before-write', 'RENEWAL_CLAIMED'));
  try {
    await controller.assertOwned(claim, 'claimed');
    assert.equal((await fresh()).fingerprint, snapshot.fingerprint);
    await controller.intent(claim); await controller.assertOwned(claim, 'write-intent');
    assert.equal((await fresh()).fingerprint, snapshot.fingerprint);
    await controller.assertOwned(claim, 'write-intent');
    attempted = true; onProgress(receipt('mutation-uncertain-do-not-retry', 'RENEWAL_WRITE_INTENT'));
    const result = await client(RENEW_MUTATION, { input: {
      projectId: DEMO_TARGET.projectId, environmentId: DEMO_TARGET.environmentId, serviceId: DEMO_TARGET.serviceId,
      name: KEY, value: request.newExpiry, skipDeploys: true,
    } });
    assert.equal(result?.variableUpsert, true); acknowledged = true;
    await controller.finish(claim, 'staged');
    return receipt('staged-awaiting-explicit-deployment', 'RENEWAL_STAGED');
  } catch {
    try { await controller.finish(claim, attempted ? 'uncertain' : 'blocked-before-write'); } catch { /* Keep durable intent; never replay. */ }
    return receipt(attempted ? 'mutation-uncertain-do-not-retry' : 'blocked-before-write',
      acknowledged ? 'RENEWAL_ACKNOWLEDGED_RECORD_UNCERTAIN' : attempted ? 'RENEWAL_WRITE_UNCERTAIN' : 'RENEWAL_BLOCKED');
  }
}
export async function runRenewalOperation({ mode = 'inspect', ...options }) {
  assert.ok(['inspect', 'stage'].includes(mode));
  if (mode === 'stage') return stageRenewal(options);
  const request = Object.freeze(clone((await options.controller.inspectRequest(options.selector)).request));
  const snapshot = await options.inspect(clone(request));
  return { schemaVersion: 1, status: 'inspection-passed-awaiting-explicit-stage', code: 'RENEWAL_INSPECTED',
    ...options.selector, previousExpiry: request.previousExpiry, newExpiry: request.newExpiry,
    fingerprint: snapshot.fingerprint, mutationAttempted: false, deploymentTriggered: false };
}
const receiptFields = new Set(['schemaVersion', 'status', 'code', 'subjectId', 'reviewedSha', 'operationNonce',
  'authorizationDigest', 'fingerprint', 'previousExpiry', 'newExpiry', 'mutationAttempted', 'deploymentTriggered']);
const receiptStatuses = new Set(['blocked-before-write', 'claimed-before-write', 'mutation-uncertain-do-not-retry',
  'staged-awaiting-explicit-deployment', 'inspection-passed-awaiting-explicit-stage']);
const receiptCodes = new Set(['RENEWAL_BLOCKED', 'RENEWAL_CLAIMED', 'RENEWAL_WRITE_INTENT', 'RENEWAL_STAGED',
  'RENEWAL_ACKNOWLEDGED_RECORD_UNCERTAIN', 'RENEWAL_WRITE_UNCERTAIN', 'RENEWAL_INSPECTED']);
function credentialAliases(values) {
  return values.filter(v => typeof v === 'string' && v).flatMap(v => {
    try { return [v, new Headers({ 'X-Credential': v }).get('X-Credential')]; } catch { return [v]; }
  }).filter(Boolean);
}
function reflected(text, values) {
  return credentialAliases(values).some(v => text.includes(v) || text.includes(JSON.stringify(v).slice(1, -1)));
}
export function serializeRenewalReceipt(receipt, forbiddenValues = []) {
  assert.ok(receipt && Object.keys(receipt).every(k => receiptFields.has(k)));
  assert.equal(receipt.schemaVersion, 1); assert.ok(receiptStatuses.has(receipt.status)); assert.ok(receiptCodes.has(receipt.code));
  assert.equal(typeof receipt.mutationAttempted, 'boolean'); assert.equal(receipt.deploymentTriggered, false);
  if (receipt.subjectId !== undefined) assert.match(receipt.subjectId, ID);
  if (receipt.reviewedSha !== undefined) assert.match(receipt.reviewedSha, SHA);
  if (receipt.operationNonce !== undefined) assert.match(receipt.operationNonce, UUID);
  for (const k of ['authorizationDigest', 'fingerprint']) if (receipt[k] !== undefined) assert.match(receipt[k], HASH);
  for (const k of ['previousExpiry', 'newExpiry']) if (receipt[k] !== undefined) expiry(receipt[k]);
  const json = JSON.stringify(receipt, null, 2) + '\n';
  assert.ok(Buffer.byteLength(json) <= 8192 && !reflected(json, forbiddenValues));
  return json;
}
function safeOutput(message) {
  if (!reflected(message, [process.env.RAILWAY_TOKEN, process.env.GH_TOKEN, process.env.GITHUB_TOKEN])) console.log(message);
}
async function readPublic(url) {
  assert.ok([`https://${DEMO_TARGET.domain}/auth/status`, `https://${DEMO_TARGET.domain}/ready`].includes(url));
  const response = await fetch(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(20000) });
  assert.equal(response.ok, true);
  const reader = response.body.getReader(); let count = 0, chunks = [];
  for (;;) { const { done, value } = await reader.read(); if (done) break;
    count += value.length; if (count > 16384) { await reader.cancel(); throw Error('PUBLIC_RESPONSE_BOUND'); } chunks.push(Buffer.from(value)); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function main() {
  const env = process.env; let result = { schemaVersion: 1, status: 'blocked-before-write', code: 'RENEWAL_BLOCKED',
    mutationAttempted: false, deploymentTriggered: false };
  try {
    const context = validateRenewalContext(env);
    const selector = select({ subjectId: env.RENEW_SUBJECT_ID, operationNonce: env.RENEW_OPERATION_NONCE, reviewedSha: context.reviewedSha });
    const github = createGitHub({ repo: REPO, cwd: process.cwd(), run: createRunner({ runtimeRoot: '.renew-demo-auth-runtime' }) });
    const client = createRailwayClient({ token: env.RAILWAY_TOKEN });
    const assertFreshMain = createMainVerifier({ token: env.GITHUB_TOKEN, reviewedSha: context.reviewedSha });
    result = await runRenewalOperation({ mode: process.argv[2] ?? 'inspect', selector, actor: env.GITHUB_ACTOR, runId: context.runId,
      controller: createRenewalController({ github }), client,
      inspect: request => inspectRenewalTarget({ request, client, readPublic, assertFreshMain }),
      onProgress: progress => { result = progress; } });
  } catch { /* Only a finite receipt crosses the credential boundary. */ }
  await writeFile('demo-auth-renewal-receipt.json', serializeRenewalReceipt(result,
    [env.RAILWAY_TOKEN, env.GH_TOKEN, env.GITHUB_TOKEN]), { flag: 'wx', mode: 0o600 });
  safeOutput(`DEMO_AUTH_RENEWAL ${result.status}`);
  if (!['inspection-passed-awaiting-explicit-stage', 'staged-awaiting-explicit-deployment'].includes(result.status)) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => {
  safeOutput('DEMO_AUTH_RENEWAL_RECEIPT_FAILED_DO_NOT_RETRY'); process.exitCode = 1;
});
