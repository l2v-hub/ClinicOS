import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { historyDigest } from '../../agent-team/src/bug-pipeline/attempt-budget.mjs';
import { verifyMergedReleaseProof } from '../../agent-team/src/bug-pipeline/release.mjs';
import { authorizationBinding, consumeOperatorAuthorization } from '../../agent-team/src/bug-pipeline/operator-authorization.mjs';
import { DEMO_TARGET } from '../../agent-team/src/bug-pipeline/demo-deployment.mjs';

export const ACTION = 'enable-demo-auth-no-expiry';
export const KEY = 'DEMO_AUTH_NO_EXPIRY';
export const CONFIG = Object.freeze({ CLINICOS_ENV: 'demo', DEMO_AUTH_NO_EXPIRY: 'true' });
export const MUTATION = 'mutation($input:VariableCollectionUpsertInput!){variableCollectionUpsert(input:$input)}';
const REPO = 'l2v-hub/ClinicOS', SUBJECT = 'standalone-pr-525';
export const FAILED_DEPLOYMENT = Object.freeze({ id: 'f04e215c-2105-45ca-9b9f-766eabbff925', sourceSha: 'd2a08b4850dd954bb790e35f2ed350d5eeacd1c4' });
const SHA = /^[a-f0-9]{40}(?![\s\S])/, HASH = /^[a-f0-9]{64}(?![\s\S])/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?![\s\S])/i;
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}(?![\s\S])/;
const clone = structuredClone;
const collections = ['batches', 'manualBatches', 'standaloneReviews'];
const entries = state => collections.flatMap(k => (state[k] ?? []).map(subject => ({ collection: k, subject })));
const exactKeys = (value, keys) => assert.deepEqual(Object.keys(value).sort(), [...keys].sort());

export function validateNoExpiryContext(env) {
  assert.equal(env.GITHUB_ACTIONS, 'true'); assert.equal(env.GITHUB_REPOSITORY, REPO);
  assert.equal(env.GITHUB_REF, 'refs/heads/main'); assert.equal(env.GITHUB_EVENT_NAME, 'workflow_dispatch');
  assert.equal(env.GITHUB_WORKFLOW_REF, `${REPO}/.github/workflows/enable-demo-auth-no-expiry.yml@refs/heads/main`);
  assert.equal(env.GITHUB_ACTOR, 'l2v-hub'); assert.equal(env.GITHUB_TRIGGERING_ACTOR, env.GITHUB_ACTOR);
  assert.match(env.GITHUB_SHA ?? '', SHA); assert.equal(env.NO_EXPIRY_REVIEWED_SHA, env.GITHUB_SHA);
  assert.equal(env.GITHUB_WORKFLOW_SHA, env.GITHUB_SHA); assert.equal(env.GITHUB_RUN_ATTEMPT, '1');
  assert.match(env.GITHUB_RUN_ID ?? '', /^[1-9][0-9]{0,19}(?![\s\S])/);
  return { reviewedSha: env.GITHUB_SHA, runId: env.GITHUB_RUN_ID };
}
export function selectNoExpiry(raw) {
  exactKeys(raw, ['subjectId', 'operationNonce', 'reviewedSha']);
  assert.equal(raw.subjectId, SUBJECT); assert.match(raw.operationNonce, UUID); assert.match(raw.reviewedSha, SHA);
  return clone(raw);
}
function requestFrom(record) {
  return Object.fromEntries(['subjectId', 'operationNonce', 'reviewedSha', 'owner', 'ownerNonce',
    'activeDeploymentId', 'activeSourceSha', 'failedDeploymentId', 'failedSourceSha',
    'releaseDigest', 'parentSourceDigest', 'ownerDigest', 'priorOperationsDigest']
    .map(k => [k, record[k]]));
}
function reservation(request) {
  return { request, target: DEMO_TARGET, variables: CONFIG, replace: false, skipDeploys: true,
    deploy: false, sql: false, releaseDigest: request.releaseDigest, parentSourceDigest: request.parentSourceDigest,
    ownerDigest: request.ownerDigest, priorOperationsDigest: request.priorOperationsDigest };
}
export function priorOperationsDigest(state, current) {
  return historyDigest(entries(state).map(({ subject }) => ({ id: subject.id,
    demoAuthExpiryRenewals: subject.demoAuthExpiryRenewals ?? [], demoAuth2029Stages: subject.demoAuth2029Stages ?? [],
    permanentDemoStages: subject.permanentDemoStages ?? [], demoAuthNoExpiryStages: (subject.demoAuthNoExpiryStages ?? []).filter(x => x !== current),
    exactDemoDispatches: subject.exactDemoDispatches ?? {} })));
}
function locate(state, selector) {
  selector = selectNoExpiry(selector); assert.equal(state.repository, REPO);
  const owners = entries(state).filter(x => x.subject.id === SUBJECT || x.subject.pr?.number === 525);
  assert.equal(owners.length, 1); const { collection, subject } = owners[0];
  assert.equal(collection, 'standaloneReviews'); assert.equal(subject.pr?.number, 525);
  const matches = entries(state).flatMap(x => (x.subject.demoAuthNoExpiryStages ?? []).map(record => ({ ...x, record })))
    .filter(x => x.record.operationNonce === selector.operationNonce);
  assert.equal(matches.length, 1); assert.equal(matches[0].subject, subject);
  const record = matches[0].record; assert.equal(record.subjectId, SUBJECT); assert.equal(record.reviewedSha, selector.reviewedSha);
  assert.match(record.owner ?? '', ID); assert.match(record.ownerNonce ?? '', UUID);
  assert.match(record.activeDeploymentId ?? '', UUID); assert.match(record.activeSourceSha ?? '', SHA);
  assert.equal(record.failedDeploymentId, FAILED_DEPLOYMENT.id); assert.equal(record.failedSourceSha, FAILED_DEPLOYMENT.sourceSha);
  assert.notEqual(record.activeSourceSha, selector.reviewedSha, 'Stage must precede deployment of reviewed source');
  assert.match(record.releaseDigest ?? '', HASH); assert.match(record.parentSourceDigest ?? '', HASH);
  assert.match(record.ownerDigest ?? '', HASH); assert.match(record.priorOperationsDigest ?? '', HASH);
  assert.equal(subject.operatorCoordination?.active, true); assert.equal(subject.operatorCoordination.owner, record.owner);
  assert.equal(subject.operatorCoordination.nonce, record.ownerNonce);
  assert.equal(record.releaseDigest, historyDigest(subject.release));
  assert.equal(record.parentSourceDigest, historyDigest(subject.parentSource));
  assert.equal(record.ownerDigest, historyDigest(subject.operatorCoordination));
  assert.equal(record.priorOperationsDigest, priorOperationsDigest(state, record));
  for (const { subject: owner } of entries(state)) {
    for (const finite of owner.demoAuthExpiryRenewals ?? [])
      assert.ok(['staged','blocked-before-write'].includes(finite.execution?.status), 'Unresolved finite renewal blocks no-expiry change');
  }
  assert.equal(subject.phase, 'ready'); assert.equal(subject.release?.status, 'merged');
  assert.equal(subject.release.mergeSha, selector.reviewedSha); assert.equal(subject.approvedSha, subject.sha);
  assert.equal(subject.release.sourceTreeProof?.sourceEquivalent, true);
  assert.equal(subject.release.sourceTreeProof.reviewedTree, subject.release.sourceTreeProof.mergeTree);
  assert.equal(subject.externalReview?.status, 'published'); assert.equal(subject.externalReview.feedbackChanged, false);
  for (const { subject: owner } of entries(state)) {
    for (const other of [...(owner.demoAuthNoExpiryStages ?? []), ...(owner.demoAuth2029Stages ?? []), ...(owner.permanentDemoStages ?? [])]) {
      if (other === record) continue;
      assert.ok(['staged','blocked-before-write'].includes(other.execution?.status), 'Unresolved authorization stage blocks no-expiry change');
    }
    for (const [operation, progress] of Object.entries(owner.exactDemoDispatches ?? {})) {
      assert.ok(['preflight','deploy'].includes(operation)); assert.equal(progress.operation, operation);
      assert.match(progress.sha ?? '', SHA); assert.match(progress.dispatchId ?? '', UUID);
      assert.ok(['observed','succeeded'].includes(progress.phase), 'Unresolved demo dispatch blocks no-expiry change');
    }
  }
  return { state, subject, record, selector };
}
function verifyAuthorization(value) {
  const { state, subject, record } = value, saved = record.authorization;
  assert.ok(saved?.authorization); const auth = saved.authorization;
  assert.equal(auth.provenance, 'user-session'); assert.equal(auth.binding?.action, ACTION);
  assert.equal(auth.binding?.repository, REPO); assert.equal(auth.binding?.entityId, SUBJECT);
  for (const key of ['grantId','consumptionNonce','sourceRef']) assert.match(auth[key] ?? '', /^[A-Za-z0-9_:.#/-]{1,200}(?![\s\S])/);
  assert.equal(auth.bindingDigest, historyDigest(auth.binding));
  const history = subject.recoveryHistory ?? [], index = saved.historyBeforeLength;
  assert.ok(Number.isSafeInteger(index) && index >= 0 && history.length === index + 1);
  assert.equal(historyDigest(history.slice(0, index)), saved.historyBeforeDigest);
  assert.equal(history[index].action, ACTION); assert.equal(history[index].nonce, saved.auditNonce);
  assert.deepEqual(history[index].authorization, auth);
  assert.match(saved.auditNonce ?? '', UUID); const authorizedAt = Date.parse(saved.authorizedAt);
  assert.ok(Number.isFinite(authorizedAt) && new Date(authorizedAt).toISOString() === saved.authorizedAt);
  const replayed = entries(state).flatMap(x => [
    ...(x.subject.recoveryHistory ?? []).filter((entry, i) => x.subject !== subject || i !== index)
      .map(entry => entry.authorization?.consumptionNonce),
    ...(x.subject.demoAuthNoExpiryStages ?? []).filter(r => r !== record).map(r => r.authorization?.authorization?.consumptionNonce),
  ]).filter(value => value === auth.consumptionNonce);
  assert.equal(replayed.length, 0);
  assert.equal(history[index].at, saved.authorizedAt); assert.equal(history[index].operationNonce, record.operationNonce);
  const baseline = clone(state), baselineSubject = entries(baseline).find(x => x.subject.id === SUBJECT).subject;
  baselineSubject.recoveryHistory = baselineSubject.recoveryHistory.slice(0, index);
  const expected = authorizationBinding({ state: baseline, subject: baselineSubject,
    actor: auth.binding.actor, action: ACTION, reservation: reservation(requestFrom(record)), budget: null });
  assert.deepEqual(auth.binding, expected);
  return saved;
}

// This controller cannot mint grants. Only an explicitly injected trusted desktop
// verifier can consume one actual user-session capability for this exact action;
// ordinary workflow construction supplies no verifier and therefore cannot authorize.
export function createNoExpiryController({ github, authorizationVerifier, assertCurrentMain, now = Date.now, nonce = randomUUID }) {
  const store = github.createStateStore();
  const observe = async selector => locate(await store.observe(), selector);
  async function validateSource(selector, actor) {
    const value = await observe(selector);
    assert.equal(typeof actor, 'string'); assert.equal(await github.authorizedMaintainer(actor), true);
    await verifyMergedReleaseProof({ state: value.state, subject: value.subject, github,
      repository: REPO, collection: 'standaloneReviews' });
    assert.equal(typeof assertCurrentMain, 'function'); await assertCurrentMain(selector.reviewedSha);
    assert.equal(await github.authorizedMaintainer(actor), true);
    const final = await observe(selector);
    assert.equal(JSON.stringify(final.subject), JSON.stringify(value.subject), 'Canonical owner changed during asynchronous authorization');
    return final;
  }
  async function validate(selector, actor) {
    let value = await validateSource(selector, actor);
    const saved = verifyAuthorization(value);
    assert.equal(await github.authorizedMaintainer(saved.authorization.binding.actor), true);
    const final = await observe(selector);
    assert.equal(JSON.stringify(final.subject), JSON.stringify(value.subject), 'Canonical owner changed during capability check');
    return final;
  }
  async function loadMutable(selector, actor) {
    const value = locate(await store.load(), selector), before = JSON.stringify(value.subject);
    const current = await validate(selector, actor);
    assert.equal(JSON.stringify(current.subject), before, 'CAS source changed after mutable load');
    return value;
  }
  async function save(value, before, actor, authorized = true) {
    value.state.updatedAt = new Date(now()).toISOString();
    await store.save(value.state, { guard: async () => {
      const current = authorized ? await validate(value.selector, actor) : await validateSource(value.selector, actor);
      assert.equal(JSON.stringify(current.subject), before);
    } });
  }
  async function authorize(selector, { actor, reference }) {
    const value = locate(await store.load(), selector), before = JSON.stringify(value.subject);
    assert.equal(value.record.authorization, undefined); assert.equal(value.record.execution, undefined);
    const source = await validateSource(selector, actor);
    assert.equal(JSON.stringify(source.subject), before);
    const binding = authorizationBinding({ state: source.state, subject: source.subject, actor,
      action: ACTION, reservation: reservation(requestFrom(source.record)), budget: null });
    const authorization = await consumeOperatorAuthorization({ state: source.state,
      verifier: authorizationVerifier, reference, binding });
    assert.equal(authorization.provenance, 'user-session', 'Only the actual host user session can consume this capability');
    const history = source.subject.recoveryHistory ?? [], authorizedAt = new Date(now()).toISOString(), auditNonce = nonce();
    source.record.authorization = { authorization, authorizedAt, historyBeforeLength: history.length,
      historyBeforeDigest: historyDigest(history), auditNonce };
    source.subject.recoveryHistory = [...history, { action: ACTION, nonce: auditNonce, at: authorizedAt,
      operationNonce: selector.operationNonce, authorization }];
    await save(source, before, actor, false); return clone(source.record.authorization);
  }
  async function prepare(selector, actor) {
    const value = await validate(selector, actor); assert.equal(value.record.execution, undefined);
    return { request: requestFrom(value.record), authorizationDigest: value.record.authorization.authorization.bindingDigest };
  }
  async function inspectRequest(selector, actor) {
    const value = await validate(selector, actor);
    assert.equal(value.record.execution, undefined);
    return { request: requestFrom(value.record) };
  }
  async function claim(selector, { actor, runId, fingerprint, fresh }) {
    const value = await loadMutable(selector, actor), before = JSON.stringify(value.subject);
    assert.equal(value.record.execution, undefined); assert.match(String(runId), /^[1-9][0-9]{0,19}(?![\s\S])/);
    assert.match(fingerprint, HASH); assert.equal(typeof fresh, 'function');
    assert.equal((await fresh()).fingerprint, fingerprint);
    assert.equal(JSON.stringify((await validate(selector, actor)).subject), before, 'Owner changed before claim write');
    const execution = { nonce: nonce(), actor, runId: String(runId), fingerprint, status: 'claimed', at: new Date(now()).toISOString() };
    value.record.execution = execution; await save(value, before, actor); return { selector: clone(value.selector), ...clone(execution) };
  }
  async function assertOwned(claim, phase, mutable = false) {
    const value = mutable ? await loadMutable(claim.selector, claim.actor) : await validate(claim.selector, claim.actor);
    for (const k of ['nonce', 'actor', 'runId', 'fingerprint']) assert.equal(value.record.execution?.[k], claim[k]);
    if (phase) assert.equal(value.record.execution?.status, phase);
    if (mutable) return value;
    return value;
  }
  async function intent(claim) {
    const value = await assertOwned(claim, 'claimed', true), before = JSON.stringify(value.subject);
    value.record.execution.status = 'write-intent'; value.record.execution.intentAt = new Date(now()).toISOString();
    await save(value, before, claim.actor);
  }
  async function finish(claim, status) {
    assert.ok(['staged', 'uncertain', 'blocked-before-write'].includes(status));
    const value = await assertOwned(claim, undefined, true), before = JSON.stringify(value.subject);
    assert.ok((status === 'blocked-before-write' ? ['claimed','write-intent'] : ['write-intent'])
      .includes(value.record.execution?.status), 'A staged/uncertain result requires durable write-intent');
    value.record.execution.status = status; value.record.execution.finishedAt = new Date(now()).toISOString();
    await save(value, before, claim.actor);
  }
  return { authorize, prepare, inspectRequest, claim, assertOwned, intent, finish };
}

export function validatePrerequisites({ target, ready, authStatus, config }) {
  assert.equal(target.projectToken?.project?.id, DEMO_TARGET.projectId);
  assert.equal(target.projectToken?.environment?.id, DEMO_TARGET.environmentId);
  assert.equal(target.projectToken?.environment?.name, 'demo');
  assert.equal(target.serviceInstance?.serviceId, DEMO_TARGET.serviceId);
  assert.equal(target.serviceInstance?.environmentId, DEMO_TARGET.environmentId);
  assert.equal(target.serviceInstance?.source?.repo, REPO);
  assert.ok(target.serviceInstance?.domains?.serviceDomains?.some(x => x.domain === DEMO_TARGET.domain));
  assert.equal(ready?.status, 'ready'); assert.equal(ready.tier, 'demo');
  assert.equal(authStatus?.syntheticOnly, true); assert.equal(authStatus?.mode, 'disabled');
  assert.equal(authStatus?.simulator, false);
  assert.ok(config?.CLINICOS_ENV === undefined || config.CLINICOS_ENV === 'demo');
  assert.equal(config?.NODE_ENV, 'production');
  assert.equal(config?.AUTH_MODE, 'demo'); assert.equal(config?.DEMO_DATASET_ID, 'synthetic-v1');
  assert.equal(config?.ALLOW_PRODUCTION_DEMO_AUTH, 'true'); assert.equal(config?.ROLE_SIMULATOR_ENABLED, 'true');
  assert.equal(config?.ROLE_SIMULATOR_ALLOW_PRODUCTION, 'true');
  assert.ok(config?.AUTHZ_ENFORCEMENT === undefined || config.AUTHZ_ENFORCEMENT === 'enforce');
  assert.ok(config?.AUTHZ_UNMAPPED_ROUTES === undefined || config.AUTHZ_UNMAPPED_ROUTES === 'deny');
  assert.equal(typeof config?.ROLE_SIMULATOR_SECRET, 'string'); assert.ok(config.ROLE_SIMULATOR_SECRET.length >= 32);
  assert.ok(config?.DEMO_AUTH_NO_EXPIRY === undefined || config.DEMO_AUTH_NO_EXPIRY === 'false');
  return true;
}

export async function stageNoExpiry({ selector: raw, actor, runId, controller, inspect, client, onProgress = () => {} }) {
  const selector = Object.freeze(selectNoExpiry(raw));
  const prepared = await controller.prepare(selector, actor), request = Object.freeze(clone(prepared.request));
  const fresh = () => inspect(clone(request)), snapshot = Object.freeze(clone(await fresh()));
  assert.equal(snapshot.activeDeploymentId, request.activeDeploymentId);
  assert.equal(snapshot.activeSourceSha, request.activeSourceSha);
  assert.equal(snapshot.failedDeploymentId, request.failedDeploymentId);
  assert.equal(snapshot.failedSourceSha, request.failedSourceSha);
  const claim = await controller.claim(selector, { actor, runId, fingerprint: snapshot.fingerprint, fresh });
  let attempted = false, ack = false;
  const receipt = (status, code) => ({ schemaVersion: 1, status, code,
    reviewedSha: selector.reviewedSha, operationNonce: selector.operationNonce,
    authorizationDigest: prepared.authorizationDigest, fingerprint: snapshot.fingerprint,
    activeDeploymentId: snapshot.activeDeploymentId, activeSourceSha: snapshot.activeSourceSha,
    failedDeploymentId: snapshot.failedDeploymentId, failedSourceSha: snapshot.failedSourceSha,
    prerequisitesVerified: true, mutationAttempted: attempted, deploymentTriggered: false });
  onProgress(receipt('claimed-before-write', 'NO_EXPIRY_CLAIMED'));
  try {
    await controller.assertOwned(claim, 'claimed'); assert.equal((await fresh()).fingerprint, snapshot.fingerprint);
    await controller.intent(claim); await controller.assertOwned(claim, 'write-intent');
    assert.equal((await fresh()).fingerprint, snapshot.fingerprint); await controller.assertOwned(claim, 'write-intent');
    attempted = true; onProgress(receipt('mutation-uncertain-do-not-retry', 'NO_EXPIRY_WRITE_INTENT'));
    const result = await client(MUTATION, { input: { projectId: DEMO_TARGET.projectId,
      environmentId: DEMO_TARGET.environmentId, serviceId: DEMO_TARGET.serviceId,
      variables: CONFIG, replace: false, skipDeploys: true } });
    assert.equal(result?.variableCollectionUpsert, true); ack = true; await controller.finish(claim, 'staged');
    return receipt('staged-awaiting-explicit-deployment', 'NO_EXPIRY_STAGED');
  } catch {
    try { await controller.finish(claim, attempted ? 'uncertain' : 'blocked-before-write'); } catch { /* retain intent */ }
    return receipt(attempted ? 'mutation-uncertain-do-not-retry' : 'blocked-before-write',
      ack ? 'NO_EXPIRY_ACK_RECORD_UNCERTAIN' : attempted ? 'NO_EXPIRY_WRITE_UNCERTAIN' : 'NO_EXPIRY_BLOCKED');
  }
}

export function serializeNoExpiryReceipt(value, forbidden = []) {
  const allowed = new Set(['schemaVersion','status','code','reviewedSha','operationNonce','authorizationDigest','fingerprint','activeSourceSha','activeDeploymentId','failedSourceSha','failedDeploymentId','prerequisitesVerified','mutationAttempted','deploymentTriggered']);
  assert.ok(value && Object.keys(value).every(k => allowed.has(k))); assert.equal(value.schemaVersion, 1);
  assert.ok(['blocked-before-write','claimed-before-write','mutation-uncertain-do-not-retry','staged-awaiting-explicit-deployment','inspection-passed-awaiting-stage','metadata-readonly-verified'].includes(value.status));
  assert.ok(/^NO_EXPIRY_(BLOCKED|CLAIMED|WRITE_INTENT|STAGED|ACK_RECORD_UNCERTAIN|WRITE_UNCERTAIN|INSPECTED|METADATA)$/.test(value.code));
  if (value.prerequisitesVerified !== undefined) assert.equal(value.prerequisitesVerified, true);
  assert.equal(typeof value.mutationAttempted, 'boolean'); assert.equal(value.deploymentTriggered, false);
  for (const k of ['reviewedSha','activeSourceSha']) if (value[k] !== undefined) assert.match(value[k], SHA);
  for (const k of ['authorizationDigest','fingerprint']) if (value[k] !== undefined) assert.match(value[k], HASH);
  if (value.operationNonce !== undefined) assert.match(value.operationNonce, UUID);
  if (value.activeDeploymentId !== undefined) assert.match(value.activeDeploymentId, UUID);
  if (value.failedDeploymentId !== undefined) assert.equal(value.failedDeploymentId, FAILED_DEPLOYMENT.id);
  if (value.failedSourceSha !== undefined) assert.equal(value.failedSourceSha, FAILED_DEPLOYMENT.sourceSha);
  const text = JSON.stringify(value, null, 2) + '\n';
  const aliases = forbidden.filter(x => typeof x === 'string' && x).flatMap(raw => {
    let normalized; try { normalized = new Headers({ 'X-Credential': raw }).get('X-Credential'); } catch { normalized = null; }
    return [raw, normalized].filter(Boolean).flatMap(x => [x, JSON.stringify(x).slice(1, -1)]);
  });
  assert.ok(Buffer.byteLength(text) <= 4096 && !aliases.some(x => text.includes(x)));
  return text;
}
