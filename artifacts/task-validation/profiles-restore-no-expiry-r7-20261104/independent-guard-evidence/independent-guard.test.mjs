import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { captureReleaseReviewProof } from 'file:///C:/w-rv/profiles-no-expiry-r7-qa-20261104/agent-team/src/bug-pipeline/release.mjs';
import { authorizationBinding } from 'file:///C:/w-rv/profiles-no-expiry-r7-qa-20261104/agent-team/src/bug-pipeline/operator-authorization.mjs';
import { historyDigest } from 'file:///C:/w-rv/profiles-no-expiry-r7-qa-20261104/agent-team/src/bug-pipeline/attempt-budget.mjs';
import { DEMO_TARGET } from 'file:///C:/w-rv/profiles-no-expiry-r7-qa-20261104/agent-team/src/bug-pipeline/demo-deployment.mjs';
import { MAX_RENEWAL_MS, validateRenewalRequest } from 'file:///C:/w-rv/profiles-no-expiry-r7-qa-20261104/scripts/automation/renew-demo-auth-expiry.mjs';
import { createDemo2029Controller, validateDemo2029Request, EXPIRY_2029, KEY, ACTION } from 'file:///C:/w-rv/profiles-no-expiry-r7-qa-20261104/scripts/automation/demo-2029-controller.mjs';
import { DEMO_2029_MUTATION, inspectDemo2029Target, stageDemo2029, runDemo2029Operation,
  serializeDemo2029Receipt, validateDemo2029Context } from 'file:///C:/w-rv/profiles-no-expiry-r7-qa-20261104/scripts/automation/enable-demo-auth-2029.mjs';
const clone = structuredClone, now = Date.parse('2026-11-03T18:00:00Z');
const selector = { subjectId: 'standalone-pr-525', operationNonce: '11111111-1111-4111-8111-111111111111', reviewedSha: 'a'.repeat(40) };
const request = { ...selector, owner: 'root-fixture', ownerNonce: '22222222-2222-4222-8222-222222222222',
  activeDeploymentId: 'a93cffdf-fd91-4a75-bc0d-a97154e0d888', activeSourceSha: 'c'.repeat(40),
  previousExpiry: '2026-10-31T23:59:59Z', failedDeploymentId: 'f04e215c-2105-45ca-9b9f-766eabbff925', failedSourceSha: 'e'.repeat(40) };
const fingerprint = 'd'.repeat(64), fresh = async () => ({ fingerprint });
function fixture() {
  const report = JSON.stringify({ subject_sha: 'b'.repeat(40), verdict: 'approved', summary: 'Synthetic fixture only', findings: [] });
  const child = { id: selector.subjectId, pr: { number: 525, url: 'https://github.com/l2v-hub/ClinicOS/pull/525' }, issues: [524],
    sha: 'b'.repeat(40), branch: 'codex/2029-fixture', phase: 'ready', approvedSha: 'b'.repeat(40), implementation: [],
    reviews: [{}, {}, { round: 3, status: 'approved', subjectSha: 'b'.repeat(40) }], recoveryHistory: [],
    reviewLedger: { rounds: [{}, {}, { round: 3, verdict: 'approved', subject_sha: 'b'.repeat(40), review_sha256: historyDigest(JSON.parse(report)) }] },
    reviewReports: { 'claude-review-3.json': report }, feedbackFingerprint: 'same-fixture',
    codexFinalReview: { status: 'verified', subjectSha: 'b'.repeat(40), claudeRound: 3, feedbackFingerprint: 'same-fixture' },
    externalReview: { status: 'published', subjectSha: 'b'.repeat(40), feedbackFingerprint: 'same-fixture', feedbackChanged: false },
    parentSource: { parent: { id: 'standalone-pr-523', mergeSha: 'e'.repeat(40) } },
    operatorCoordination: { active: true, owner: request.owner, nonce: request.ownerNonce },
    release: { status: 'merged', reviewedSha: 'b'.repeat(40), prNumber: 525, mergeSha: selector.reviewedSha,
      sourceTreeProof: { sourceEquivalent: true, reviewedSha: 'b'.repeat(40), mergeSha: selector.reviewedSha, reviewedTree: 'f'.repeat(40), mergeTree: 'f'.repeat(40) } },
    demoAuth2029Stages: [clone(request)] };
  child.release.reviewProof = captureReleaseReviewProof(child, { repository: 'l2v-hub/ClinicOS', collection: 'standaloneReviews' });
  const old = { subjectId: 'standalone-pr-523', operationNonce: '66666666-6666-4666-8666-666666666666', reviewedSha: request.failedSourceSha,
    previousExpiry: request.previousExpiry, newExpiry: '2026-11-09T18:00:00Z', owner: 'old-root', ownerNonce: '77777777-7777-4777-8777-777777777777' };
  const parent = { id: old.subjectId, pr: { number: 523 }, issues: [522], sha: '0'.repeat(40), implementation: [], reviews: [], recoveryHistory: [], demoAuthExpiryRenewals: [old] };
  let remote = { repository: 'l2v-hub/ClinicOS', batches: [], manualBatches: [], standaloneReviews: [child, parent] };
  const binding = authorizationBinding({ state: remote, subject: parent, actor: 'old-root', action: 'renew-demo-auth-expiry', budget: null,
    reservation: { ...old, target: DEMO_TARGET, key: KEY, skipDeploys: true } });
  const auth = { provenance: 'user-session', grantId: 'old-stage-grant', consumptionNonce: 'old-consumption', sourceRef: 'user-session:old-stage', binding, bindingDigest: historyDigest(binding) };
  old.authorization = { authorization: auth, authorizedAt: '2026-11-02T18:00:00.000Z', historyBeforeLength: 0, historyBeforeDigest: historyDigest([]), auditNonce: 'old-audit' };
  parent.recoveryHistory = [{ action: 'renew-demo-auth-expiry', nonce: 'old-audit', authorization: clone(auth) }];
  old.execution = { status: 'staged', runId: '41524928481' };
  const dispatch = { phase: 'observed', operation: 'deploy', sha: old.reviewedSha, dispatchId: '44444444-4444-4444-8444-444444444444', runId: 41527190689 };
  const deployBinding = authorizationBinding({ state: remote, subject: parent, actor: 'old-root', action: 'protected-demo-deploy', budget: null,
    reservation: { operation: 'deploy', sourceSha: old.reviewedSha, target: DEMO_TARGET, key: KEY, newExpiry: old.newExpiry,
      stageRunId: Number(old.execution.runId), operationNonce: old.operationNonce, dispatchId: dispatch.dispatchId,
      stageReceiptSha256: '8'.repeat(64), stageArtifactDigest: 'sha256:' + '9'.repeat(64), stageArtifactId: 123, operatorSQLCleanup: false, issueClosure: false } });
  dispatch.operatorAuthorization = { provenance: 'user-session', grantId: 'old-deploy-grant', consumptionNonce: 'old-deploy-consumption',
    sourceRef: 'user-session:old-deploy', binding: deployBinding, bindingDigest: historyDigest(deployBinding) };
  dispatch.stageProofDigest = '7'.repeat(64); parent.exactDemoDispatches = { deploy: dispatch };
  let revision = 0, loadedRevision, revoked = false, permission = () => {}, sourceCheck = () => {}, main = selector.reviewedSha, clock = now;
  let provenance = 'user-session', consumption = 'new-2029-consumption', runHook = x => x;
  const store = { load: async () => { loadedRevision = revision; return clone(remote); }, observe: async () => clone(remote),
    save: async (s, { guard }) => { const expected = loadedRevision; await guard(); assert.equal(revision, expected, 'CAS conflict'); remote = clone(s); revision++; loadedRevision = revision; } };
  const github = { createStateStore: () => store, authorizedMaintainer: async () => { permission(remote); return !revoked; },
    reviewFeedback: async () => { sourceCheck(remote); const b = remote.standaloneReviews[0]; return { number: 525, state: 'MERGED', url: b.pr.url,
      head: b.sha, headRef: b.branch, headRepo: 'l2v-hub/ClinicOS', headIsFork: false, baseRef: 'main', mergeCommitSha: b.release.mergeSha }; } };
  const verifier = async ({ binding, consume }) => { assert.equal(consume, true); return { provenance, grantId: 'actual-2029-fixture',
    consumptionNonce: consumption, sourceRef: 'user-session:fixed-2029', binding }; };
  const dependencies = { github, now: () => clock,
    assertCurrentMain: async expected => assert.equal(main, expected), nonce: () => '33333333-3333-4333-8333-333333333333',
    readRun: async id => runHook({ id, run_attempt: 1, status: 'completed', conclusion: 'failure', head_sha: request.failedSourceSha,
      repository: { full_name: 'l2v-hub/ClinicOS' }, head_repository: { full_name: 'l2v-hub/ClinicOS' },
      path: '.github/workflows/deploy-demo-exact-commit.yml', event: 'workflow_dispatch', head_branch: 'main',
      display_title: `demo-exact deploy ${request.failedSourceSha} ${dispatch.dispatchId}` }) };
  const controller = createDemo2029Controller({ ...dependencies, authorizationVerifier: verifier });
  return { controller, github, state: () => remote, record: () => remote.standaloneReviews[0].demoAuth2029Stages[0],
    old: () => remote.standaloneReviews[1], mutate: fn => fn(remote), writes: () => revision,
    permission: fn => { permission = fn; }, sourceCheck: fn => { sourceCheck = fn; }, revoke: () => { revoked = true; },
    dependencies, setClock: v => { clock = v; }, setMain: v => { main = v; }, setProvenance: v => { provenance = v; }, setConsumption: v => { consumption = v; }, run: fn => { runHook = fn; } };
}

const one='88888888-8888-4888-8888-888888888888',two='99999999-9999-4999-8999-999999999999';
const rec=status=>({operationNonce:one,...(status==='missing'?{}:{execution:{status}})});
for(const collection of ['batches','manualBatches','standaloneReviews']) for(const status of ['claimed','write-intent','uncertain','staged','missing','invalid']) test(collection+' '+status+' rejects before consume/write/provider',async()=>{
 const f=fixture();f.state()[collection].push({id:'foreign-'+collection,demoAuthNoExpiryStages:[rec(status)]});let consumed=0,provider=0;
 const c=createDemo2029Controller({...f.dependencies,authorizationVerifier:async()=>{consumed++;throw Error('unexpected verifier');}});
 await assert.rejects(c.authorize(selector,{actor:'root-fixture',reference:'offline'}),/No-expiry operation needs reconciliation/);
 assert.deepEqual({consumed,writes:f.writes(),provider},{consumed:0,writes:0,provider:0});
});
for(const status of ['absent','blocked-before-write'])test('safe '+status+' remains functional',async()=>{const f=fixture();if(status!=='absent')f.old().demoAuthNoExpiryStages=[rec(status)];await f.controller.authorize(selector,{actor:'root-fixture',reference:'user-session:fixed-2029'});assert.equal(f.writes(),1);assert.ok((await f.controller.prepare(selector)).authorizationDigest);});
for(const dupe of [selector.operationNonce,selector.operationNonce.toUpperCase(),'66666666-6666-4666-8666-666666666666'])test('cross-kind nonce '+dupe+' rejects',async()=>{const f=fixture();f.old().demoAuthNoExpiryStages=[{operationNonce:dupe,execution:{status:'blocked-before-write'}}];await assert.rejects(f.controller.authorize(selector,{actor:'root-fixture',reference:'offline'}),/No-expiry nonce must uniquely identify one operation/);assert.equal(f.writes(),0);});
for(const field of ['note','nonce','remove','add','status'])test('blocked history '+field+' drift invalidates bound authorization',async()=>{const f=fixture();f.old().demoAuthNoExpiryStages=[{...rec('blocked-before-write'),note:'before'}];await f.controller.authorize(selector,{actor:'root-fixture',reference:'user-session:fixed-2029'});const arr=f.old().demoAuthNoExpiryStages;if(field==='note')arr[0].note='after';if(field==='nonce')arr[0].operationNonce=two;if(field==='remove')arr.pop();if(field==='add')arr.push({operationNonce:two,execution:{status:'blocked-before-write'}});if(field==='status')arr[0].execution.status='claimed';await assert.rejects(f.controller.prepare(selector));assert.equal(f.writes(),1);});
test('async permission drift blocks stale claim before store write',async()=>{const f=fixture();await f.controller.authorize(selector,{actor:'root-fixture',reference:'user-session:fixed-2029'});let changed=false;f.permission(s=>{if(!changed){changed=true;s.manualBatches.push({id:'foreign',demoAuthNoExpiryStages:[rec('claimed')]});}});await assert.rejects(f.controller.claim(selector,{actor:'worker-fixture',runId:'77',fingerprint,fresh}));assert.equal(changed,true);assert.equal(f.writes(),1);assert.equal(f.record().execution,undefined);});
test('drift after claim blocks durable intent',async()=>{const f=fixture();await f.controller.authorize(selector,{actor:'root-fixture',reference:'user-session:fixed-2029'});const claim=await f.controller.claim(selector,{actor:'worker-fixture',runId:'77',fingerprint,fresh});f.old().demoAuthNoExpiryStages=[rec('uncertain')];await assert.rejects(f.controller.intent(claim));assert.equal(f.writes(),2);assert.equal(f.record().execution.status,'claimed');});
