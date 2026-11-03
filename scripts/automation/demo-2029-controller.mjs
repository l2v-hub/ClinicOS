import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { authorizationBinding, consumeOperatorAuthorization } from '../../agent-team/src/bug-pipeline/operator-authorization.mjs';
import { historyDigest } from '../../agent-team/src/bug-pipeline/attempt-budget.mjs';
import { captureReleaseReviewProof, verifyMergedReleaseProof } from '../../agent-team/src/bug-pipeline/release.mjs';
import { DEMO_TARGET } from '../../agent-team/src/bug-pipeline/demo-deployment.mjs';
import { validateRenewalRequest } from './renew-demo-auth-expiry.mjs';

export const EXPIRY_2029 = '2029-12-31T23:59:59Z';
export const KEY = 'DEMO_AUTH_EXPIRES_AT';
export const ACTION = 'enable-demo-auth-2029';
const REPO = 'l2v-hub/ClinicOS', SUBJECT = 'standalone-pr-525';
const SHA = /^[a-f0-9]{40}(?![\s\S])/, HASH = /^[a-f0-9]{64}(?![\s\S])/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}(?![\s\S])/;
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}(?![\s\S])/;
const clone = structuredClone;
const collections = ['batches', 'manualBatches', 'standaloneReviews'];
const entries = state => collections.flatMap(collection => (state[collection] ?? []).map(subject => ({ collection, subject })));
const keys = (value, expected) => assert.deepEqual(Object.keys(value).sort(), expected.slice().sort());
export function selectDemo2029(raw) {
  keys(raw, ['subjectId', 'operationNonce', 'reviewedSha']); assert.equal(raw.subjectId, SUBJECT);
  assert.match(raw.operationNonce, UUID); assert.match(raw.reviewedSha, SHA); return clone(raw);
}
const requestFields = ['subjectId', 'operationNonce', 'reviewedSha', 'owner', 'ownerNonce',
  'activeDeploymentId', 'activeSourceSha', 'previousExpiry', 'failedDeploymentId', 'failedSourceSha'];
function requestData(q) { return Object.fromEntries(requestFields.map(k => [k, q[k]])); }
function strictExpiry(value) {
  assert.ok(typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value));
  const at = Date.parse(value); assert.ok(Number.isFinite(at));
  assert.equal(new Date(at).toISOString().replace('.000Z', 'Z'), value); return at;
}
export function validateDemo2029Request(raw, clock = Date.now()) {
  keys(raw, requestFields); selectDemo2029({ subjectId: raw.subjectId, operationNonce: raw.operationNonce, reviewedSha: raw.reviewedSha });
  assert.match(raw.owner, ID); assert.match(raw.ownerNonce, UUID); assert.match(raw.activeDeploymentId, UUID);
  assert.match(raw.activeSourceSha, SHA); assert.match(raw.failedDeploymentId, UUID); assert.match(raw.failedSourceSha, SHA);
  assert.notEqual(raw.activeSourceSha, raw.reviewedSha, 'Stage must precede new-source deployment');
  assert.notEqual(raw.failedDeploymentId, raw.activeDeploymentId); assert.notEqual(raw.failedSourceSha, raw.activeSourceSha);
  assert.ok(Number.isFinite(clock) && strictExpiry(raw.previousExpiry) <= clock && strictExpiry(EXPIRY_2029) > clock);
  return clone(raw);
}
function priorOperations(state, current, request) {
  const records = [], supersedesFinite = [], runs = [];
  for (const { subject: b } of entries(state)) {
    for (const q of b.demoAuthExpiryRenewals ?? []) {
      records.push({ subjectId: b.id, kind: 'finite', record: q });
      assert.ok(['staged', 'blocked-before-write'].includes(q.execution?.status), 'Unresolved finite operation blocks2029');
      if (q.execution.status !== 'staged') continue;
      assert.equal(b.id, 'standalone-pr-523'); assert.equal(b.pr?.number, 523); assert.deepEqual(b.issues, [522]);
      const saved = q.authorization, auth = saved?.authorization, at = Date.parse(saved?.authorizedAt);
      assert.ok(Number.isFinite(at) && new Date(at).toISOString() === saved.authorizedAt);
      const old = validateRenewalRequest(Object.fromEntries(['subjectId', 'operationNonce', 'reviewedSha',
        'previousExpiry', 'newExpiry', 'owner', 'ownerNonce'].map(k => [k, q[k]])), at);
      assert.equal(old.subjectId, b.id); assert.equal(old.previousExpiry, request.previousExpiry);
      assert.equal(old.reviewedSha, request.failedSourceSha); assert.ok(strictExpiry(old.newExpiry) < strictExpiry(EXPIRY_2029));
      assert.ok(['user-session', 'distinct-maintainer-comment'].includes(auth?.provenance));
      assert.equal(auth.bindingDigest, historyDigest(auth.binding)); assert.equal(auth.binding.entityId, b.id);
      assert.equal(auth.binding.repository, REPO); assert.equal(auth.binding.action, 'renew-demo-auth-expiry');
      for (const [k, v] of Object.entries({ ...old, target: DEMO_TARGET, key: KEY, skipDeploys: true }))
        assert.deepEqual(auth.binding.reservation[k], v);
      const h = b.recoveryHistory ?? [], index = saved.historyBeforeLength;
      assert.ok(Number.isSafeInteger(index) && index >= 0 && h.length > index);
      assert.equal(historyDigest(h.slice(0, index)), saved.historyBeforeDigest);
      assert.equal(h[index].nonce, saved.auditNonce); assert.equal(h[index].action, 'renew-demo-auth-expiry');
      assert.deepEqual(h[index].authorization, auth); assert.match(String(q.execution.runId), /^[1-9][0-9]{0,19}(?![\s\S])/);
      const p = b.exactDemoDispatches?.deploy, da = p?.operatorAuthorization;
      assert.equal(p?.phase, 'observed'); assert.equal(p.operation, 'deploy'); assert.equal(p.sha, old.reviewedSha);
      assert.match(p.dispatchId, UUID); assert.ok(Number.isSafeInteger(p.runId) && p.runId > 0);
      assert.ok(['user-session', 'distinct-maintainer-comment'].includes(da?.provenance));
      assert.equal(da.bindingDigest, historyDigest(da.binding)); assert.equal(da.binding.entityId, b.id);
      assert.equal(da.binding.repository, REPO); assert.equal(da.binding.action, 'protected-demo-deploy');
      for (const [k, v] of Object.entries({ operation: 'deploy', sourceSha: old.reviewedSha, target: DEMO_TARGET,
        key: KEY, newExpiry: old.newExpiry, stageRunId: Number(q.execution.runId), operationNonce: old.operationNonce,
        dispatchId: p.dispatchId, operatorSQLCleanup: false, issueClosure: false })) assert.deepEqual(da.binding.reservation[k], v);
      assert.match(da.binding.reservation.stageReceiptSha256, HASH); assert.match(da.binding.reservation.stageArtifactDigest, /^sha256:[a-f0-9]{64}(?![\s\S])/);
      assert.ok(Number.isSafeInteger(da.binding.reservation.stageArtifactId) && da.binding.reservation.stageArtifactId > 0);
      assert.match(p.stageProofDigest, HASH);
      supersedesFinite.push({ subjectId: b.id, operationNonce: q.operationNonce, previousExpiry: old.previousExpiry,
        requestDigest: historyDigest(old), authorizationDigest: auth.bindingDigest, executionDigest: historyDigest(q.execution),
        deploymentAuthorizationDigest: da.bindingDigest, dispatchDigest: historyDigest(p) });
    }
    for (const q of [...(b.demoAuth2029Stages ?? []), ...(b.permanentDemoStages ?? [])]) {
      if (q === current) continue;
      records.push({ subjectId: b.id, kind: 'other-fixed-stage', record: q });
      assert.equal(q.execution?.status, 'blocked-before-write', 'Other fixed operation needs reconciliation');
    }
    for (const [operation, progress] of Object.entries(b.exactDemoDispatches ?? {})) {
      assert.ok(['preflight', 'deploy'].includes(operation)); assert.equal(progress.operation, operation);
      assert.match(progress.sha, SHA); assert.match(progress.dispatchId, UUID);
      assert.ok(Number.isSafeInteger(progress.runId) && progress.runId > 0);
      assert.ok(['observed', 'succeeded'].includes(progress.phase), 'Unresolved exact dispatch blocks2029');
      runs.push({ subjectId: b.id, ...clone(progress) }); records.push({ subjectId: b.id, kind: 'exact-dispatch', record: progress });
    }
  }
  assert.equal(supersedesFinite.length, 1, 'Exactly one known unapplied finite stage is required');
  const deploys = runs.filter(p => p.operation === 'deploy');
  assert.equal(deploys.length, 1); assert.equal(deploys[0].subjectId, supersedesFinite[0].subjectId);
  assert.equal(deploys[0].sha, request.failedSourceSha); assert.equal(deploys[0].phase, 'observed');
  return { digest: historyDigest(records), supersedesFinite, runs };
}
function locate(state, input, clock = Date.now()) {
  const selector = selectDemo2029(input); assert.equal(state.repository, REPO);
  const owners = entries(state).filter(x => x.subject.id === selector.subjectId || x.subject.pr?.number === 525 || x.subject.issues?.includes(524));
  assert.equal(owners.length, 1); assert.equal(owners[0].collection, 'standaloneReviews'); const b = owners[0].subject;
  assert.equal(b.id, SUBJECT); assert.equal(b.pr?.number, 525); assert.deepEqual(b.issues, [524]);
  const all = entries(state).flatMap(({ subject }) => [...(subject.demoAuth2029Stages ?? []), ...(subject.demoAuthExpiryRenewals ?? []), ...(subject.permanentDemoStages ?? [])].map(q => ({ b: subject, q })));
  const matches = all.filter(x => x.q.operationNonce === selector.operationNonce);
  assert.equal(matches.length, 1); assert.equal(matches[0].b, b); const q = matches[0].q;
  assert.ok(b.demoAuth2029Stages.includes(q)); const request = validateDemo2029Request(requestData(q), clock);
  assert.equal(request.reviewedSha, selector.reviewedSha); assert.equal(request.subjectId, b.id);
  assert.equal(b.operatorCoordination?.active, true); assert.equal(b.operatorCoordination.owner, request.owner);
  assert.equal(b.operatorCoordination.nonce, request.ownerNonce); assert.equal(b.phase, 'ready'); assert.equal(b.approvedSha, b.sha);
  assert.equal(b.releaseBlock, undefined); assert.equal(b.externalReview?.status, 'published'); assert.equal(b.externalReview.feedbackChanged, false);
  assert.ok(b.parentSource && typeof b.parentSource === 'object' && Object.keys(b.parentSource).length);
  assert.equal(b.release?.status, 'merged'); assert.equal(b.release.mergeSha, request.reviewedSha);
  const source = b.release.sourceTreeProof; assert.equal(source?.sourceEquivalent, true);
  assert.equal(source.reviewedSha, b.sha); assert.equal(source.mergeSha, request.reviewedSha);
  assert.match(source.reviewedTree, SHA); assert.equal(source.reviewedTree, source.mergeTree);
  const proof = captureReleaseReviewProof(b, { repository: REPO, collection: 'standaloneReviews' });
  assert.ok(proof.claudeRound >= 3); assert.deepEqual(b.release.reviewProof, proof);
  return { state, b, q, request, selector, prior: priorOperations(state, q, request) };
}
function reservation(v) {
  return { ...v.request, target: DEMO_TARGET, key: KEY, newExpiry: EXPIRY_2029, skipDeploys: true,
    releaseDigest: historyDigest(v.b.release), ownerDigest: historyDigest(v.b.operatorCoordination),
    parentSourceDigest: historyDigest(v.b.parentSource), priorOperationsDigest: v.prior.digest };
}
const identity = v => JSON.stringify({ subject: v.b, priorOperationsDigest: v.prior.digest });
function verify(v) {
  const saved = v.q.authorization, auth = saved?.authorization, history = v.b.recoveryHistory ?? [];
  assert.ok(auth && auth.provenance === 'user-session');
  const index = saved.historyBeforeLength; assert.ok(Number.isSafeInteger(index) && index >= 0 && history.length === index + 1);
  assert.equal(historyDigest(history.slice(0, index)), saved.historyBeforeDigest);
  assert.equal(history[index].action, ACTION); assert.equal(history[index].nonce, saved.auditNonce);
  assert.deepEqual(history[index].authorization, auth); assert.deepEqual(saved.supersedesFinite, v.prior.supersedesFinite);
  const baseline = clone(v.state), b = baseline.standaloneReviews.find(x => x.id === v.b.id);
  b.recoveryHistory = b.recoveryHistory.slice(0, index);
  const expected = authorizationBinding({ state: baseline, subject: b, actor: auth.binding.actor,
    action: ACTION, reservation: reservation(v), budget: null });
  assert.deepEqual(auth.binding, expected); assert.equal(auth.bindingDigest, historyDigest(expected)); return saved;
}
export function createDemo2029Controller({ github, authorizationVerifier, readRun, assertCurrentMain, now = Date.now, nonce = randomUUID }) {
  const store = github.createStateStore(); const observe = async input => locate(await store.observe(), input, now());
  async function allowed(v, actor) {
    assert.ok(typeof actor === 'string' && await github.authorizedMaintainer(actor));
    const author = v.q.authorization?.authorization.binding.actor;
    if (author) assert.equal(await github.authorizedMaintainer(author), true);
    await verifyMergedReleaseProof({ state: v.state, subject: v.b, github, repository: REPO, collection: 'standaloneReviews' });
    for (const p of v.prior.runs) {
      assert.equal(typeof readRun, 'function', 'Native prior-run reader required'); const run = await readRun(p.runId);
      assert.equal(run.id, p.runId); assert.equal(run.run_attempt, 1); assert.equal(run.status, 'completed');
      assert.equal(run.conclusion, p.operation === 'deploy' ? 'failure' : 'success');
      if (p.phase === 'succeeded') assert.equal(run.conclusion, 'success');
      assert.equal(run.head_sha, p.sha); assert.equal(run.repository?.full_name, REPO); assert.equal(run.head_repository?.full_name, REPO);
      assert.equal(run.path, '.github/workflows/deploy-demo-exact-commit.yml'); assert.equal(run.event, 'workflow_dispatch');
      assert.equal(run.head_branch, 'main'); assert.equal(run.display_title, `demo-exact ${p.operation} ${p.sha} ${p.dispatchId}`);
    }
    // Complete every asynchronous source/run/main read before final revocation
    // checks; the caller still re-observes canonical ownership/history afterwards.
    assert.equal(typeof assertCurrentMain, 'function', 'Authenticated current-main verifier required');
    await assertCurrentMain(v.request.reviewedSha);
    assert.equal(await github.authorizedMaintainer(actor), true);
    if (author && author !== actor) assert.equal(await github.authorizedMaintainer(author), true);
  }
  async function save(v, before, actor, guard = async () => {}) {
    v.state.updatedAt = new Date(now()).toISOString();
    await store.save(v.state, { guard: async () => {
      const current = await observe(v.selector); await allowed(current, actor); assert.equal(identity(current), before);
      await guard(); assert.equal(identity(await observe(v.selector)), before);
    } });
  }
  async function authorize(input, { actor, reference }) {
    const v = locate(await store.load(), input, now()), before = identity(v);
    assert.equal(v.q.authorization, undefined); assert.equal(v.q.execution, undefined); await allowed(v, actor);
    const binding = authorizationBinding({ state: v.state, subject: v.b, actor, action: ACTION, reservation: reservation(v), budget: null });
    const authorization = await consumeOperatorAuthorization({ state: v.state, verifier: authorizationVerifier, reference, binding });
    assert.equal(authorization.provenance, 'user-session', 'Only actual user-session authorization enables2029');
    const history = v.b.recoveryHistory ?? [], at = new Date(now()).toISOString();
    const saved = { authorization, authorizedAt: at, historyBeforeLength: history.length, historyBeforeDigest: historyDigest(history),
      auditNonce: nonce(), supersedesFinite: clone(v.prior.supersedesFinite) };
    v.q.authorization = saved; v.b.recoveryHistory = [...history, { action: ACTION, nonce: saved.auditNonce,
      at, operationNonce: v.request.operationNonce, authorization }]; await save(v, before, actor); return clone(saved);
  }
  async function prepare(input) {
    const v = await observe(input); verify(v); assert.equal(v.q.execution, undefined);
    return { request: clone(v.request), authorizationDigest: v.q.authorization.authorization.bindingDigest, priorOperationsDigest: v.prior.digest };
  }
  async function inspectRequest(input) { return { request: clone((await observe(input)).request) }; }
  async function claim(input, { actor, runId, fingerprint, fresh }) {
    const v = locate(await store.load(), input, now()), before = identity(v); verify(v); assert.equal(v.q.execution, undefined);
    assert.match(String(runId), /^[1-9][0-9]{0,19}(?![\s\S])/); assert.match(fingerprint, HASH); assert.equal(typeof fresh, 'function');
    const guard = async () => assert.equal((await fresh()).fingerprint, fingerprint);
    await allowed(v, actor); await guard();
    const execution = { nonce: nonce(), actor, runId: String(runId), status: 'claimed', fingerprint, startedAt: new Date(now()).toISOString() };
    v.q.execution = execution; await save(v, before, actor, guard); return { selector: clone(v.selector), ...clone(execution) };
  }
  async function owned(claim, status, mutable = false) {
    const v = mutable ? locate(await store.load(), claim.selector, now()) : await observe(claim.selector); verify(v);
    const before = identity(v); await allowed(v, claim.actor);
    const current = await observe(claim.selector); verify(current); assert.equal(identity(current), before, 'Ownership changed during asynchronous authorization');
    const execution = v.q.execution; assert.ok(execution);
    for (const k of ['nonce', 'actor', 'runId', 'fingerprint']) assert.equal(execution[k], claim[k]);
    if (status) assert.equal(execution.status, status); return v;
  }
  async function intent(claim) {
    const v = await owned(claim, 'claimed', true), before = identity(v);
    v.q.execution.status = 'write-intent'; v.q.execution.intentAt = new Date(now()).toISOString(); await save(v, before, claim.actor);
  }
  async function finish(claim, status) {
    assert.ok(['staged', 'uncertain', 'blocked-before-write'].includes(status));
    const v = await owned(claim, undefined, true), before = identity(v);
    assert.ok((status === 'blocked-before-write' ? ['claimed', 'write-intent'] : ['write-intent']).includes(v.q.execution.status));
    v.q.execution.status = status; v.q.execution.finishedAt = new Date(now()).toISOString(); await save(v, before, claim.actor);
  }
  return { authorize, prepare, inspectRequest, claim, intent, finish, assertOwned: owned };
}
