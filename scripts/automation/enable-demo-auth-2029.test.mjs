import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { captureReleaseReviewProof } from '../../agent-team/src/bug-pipeline/release.mjs';
import { authorizationBinding } from '../../agent-team/src/bug-pipeline/operator-authorization.mjs';
import { historyDigest } from '../../agent-team/src/bug-pipeline/attempt-budget.mjs';
import { DEMO_TARGET } from '../../agent-team/src/bug-pipeline/demo-deployment.mjs';
import { MAX_RENEWAL_MS, validateRenewalRequest } from './renew-demo-auth-expiry.mjs';
import { createDemo2029Controller, validateDemo2029Request, EXPIRY_2029, KEY, ACTION } from './demo-2029-controller.mjs';
import { DEMO_2029_MUTATION, inspectDemo2029Target, stageDemo2029, runDemo2029Operation,
  serializeDemo2029Receipt, validateDemo2029Context } from './enable-demo-auth-2029.mjs';
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
  let revision = 0, loadedRevision, revoked = false, permission = () => {}, sourceCheck = () => {}, main = selector.reviewedSha;
  let provenance = 'user-session', consumption = 'new-2029-consumption', runHook = x => x;
  const store = { load: async () => { loadedRevision = revision; return clone(remote); }, observe: async () => clone(remote),
    save: async (s, { guard }) => { const expected = loadedRevision; await guard(); assert.equal(revision, expected, 'CAS conflict'); remote = clone(s); revision++; loadedRevision = revision; } };
  const github = { createStateStore: () => store, authorizedMaintainer: async () => { permission(remote); return !revoked; },
    reviewFeedback: async () => { sourceCheck(remote); const b = remote.standaloneReviews[0]; return { number: 525, state: 'MERGED', url: b.pr.url,
      head: b.sha, headRef: b.branch, headRepo: 'l2v-hub/ClinicOS', headIsFork: false, baseRef: 'main', mergeCommitSha: b.release.mergeSha }; } };
  const verifier = async ({ binding, consume }) => { assert.equal(consume, true); return { provenance, grantId: 'actual-2029-fixture',
    consumptionNonce: consumption, sourceRef: 'user-session:fixed-2029', binding }; };
  const controller = createDemo2029Controller({ github, authorizationVerifier: verifier, now: () => now,
    assertCurrentMain: async expected => assert.equal(main, expected), nonce: () => '33333333-3333-4333-8333-333333333333',
    readRun: async id => runHook({ id, run_attempt: 1, status: 'completed', conclusion: 'failure', head_sha: request.failedSourceSha,
      repository: { full_name: 'l2v-hub/ClinicOS' }, head_repository: { full_name: 'l2v-hub/ClinicOS' },
      path: '.github/workflows/deploy-demo-exact-commit.yml', event: 'workflow_dispatch', head_branch: 'main',
      display_title: `demo-exact deploy ${request.failedSourceSha} ${dispatch.dispatchId}` }) });
  return { controller, github, state: () => remote, record: () => remote.standaloneReviews[0].demoAuth2029Stages[0],
    old: () => remote.standaloneReviews[1], mutate: fn => fn(remote), writes: () => revision,
    permission: fn => { permission = fn; }, sourceCheck: fn => { sourceCheck = fn; }, revoke: () => { revoked = true; },
    setMain: v => { main = v; }, setProvenance: v => { provenance = v; }, setConsumption: v => { consumption = v; }, run: fn => { runHook = fn; } };
}
const authorized = f => f.controller.authorize(selector, { actor: 'root-fixture', reference: 'user-session:fixed-2029' });
const claimed = async f => { await authorized(f); return f.controller.claim(selector, { actor: 'worker-fixture', runId: '77', fingerprint, fresh }); };
function targetData() { return { projectToken: { project: { id: DEMO_TARGET.projectId }, environment: { id: DEMO_TARGET.environmentId, name: 'demo' } },
  deploymentTriggers: { pageInfo: { hasNextPage: false }, edges: [] }, deployments: { pageInfo: { hasNextPage: false }, edges: [] },
  serviceInstance: { serviceId: DEMO_TARGET.serviceId, environmentId: DEMO_TARGET.environmentId, source: { repo: 'l2v-hub/ClinicOS' },
    domains: { serviceDomains: [{ domain: DEMO_TARGET.domain }], customDomains: [] },
    activeDeployments: [{ id: request.activeDeploymentId, status: 'SUCCESS', meta: { commitHash: request.activeSourceSha } }],
    latestDeployment: { id: request.failedDeploymentId, status: 'FAILED' } },
  deployment: { id: request.failedDeploymentId, status: 'FAILED', projectId: DEMO_TARGET.projectId,
    environmentId: DEMO_TARGET.environmentId, serviceId: DEMO_TARGET.serviceId, meta: { commitHash: request.failedSourceSha } } }; }
const publicData = url => url.endsWith('/ready') ? { status: 'ready', tier: 'demo', deploymentId: request.activeDeploymentId,
  checks: { database: 'ok', policy: 'ok' } } : { mode: 'disabled', simulator: false, temporaryDemo: false, syntheticOnly: true, expiresAt: request.previousExpiry + '' };

test('one exact fixed2029 key/action while ordinary seven-day route remains unchanged', () => {
  assert.equal(EXPIRY_2029, '2029-12-31T23:59:59Z'); assert.equal(KEY, 'DEMO_AUTH_EXPIRES_AT'); assert.equal(ACTION, 'enable-demo-auth-2029');
  assert.equal(MAX_RENEWAL_MS, 7 * 24 * 60 * 60 * 1000);
  assert.throws(() => validateRenewalRequest({ subjectId: 'normal', operationNonce: selector.operationNonce, reviewedSha: selector.reviewedSha,
    previousExpiry: request.previousExpiry, newExpiry: EXPIRY_2029, owner: request.owner, ownerNonce: request.ownerNonce }, now));
  assert.deepEqual(validateDemo2029Request(request, now), request);
  assert.throws(() => validateDemo2029Request(request, Date.parse(EXPIRY_2029)));
  for (const field of ['newExpiry','variables','key','value','target','allowLong','skipDeploys','replace','expiresAt'])
    assert.throws(() => validateDemo2029Request({ ...request, [field]: EXPIRY_2029 }, now));
  for (const date of ['2029-01-01T00:00:00Z','2029-12-31T23:59:58Z','2030-01-01T00:00:00Z','2029-12-31T23:59:59.000Z'])
    assert.throws(() => validateDemo2029Request({ ...request, newExpiry: date }, now));
  assert.throws(() => validateDemo2029Request({ ...request, activeSourceSha: request.reviewedSha }, now));
});
test('new action requires an authentic user-session capability; inspection alone does not authorize', async () => {
  const f = fixture(), c = createDemo2029Controller({ github: f.github });
  await assert.rejects(c.authorize(selector, { actor: 'root-fixture', reference: 'made-up' }));
  await assert.rejects(f.controller.prepare(selector)); assert.equal(f.writes(), 0);
});
test('maintainer-comment provenance cannot authorize the long fixed window', async () => {
  const f = fixture(); f.setProvenance('distinct-maintainer-comment'); await assert.rejects(authorized(f)); assert.equal(f.writes(), 0);
});
test('current fixed action binds all superseded data append-only with no review/budget mutation', async () => {
  const f = fixture(), before = clone(f.state()); await authorized(f); const cap = f.record().authorization.authorization;
  assert.equal(cap.binding.action, ACTION); assert.equal(cap.binding.budget, null);
  assert.equal(cap.binding.reservation.key, KEY); assert.equal(cap.binding.reservation.newExpiry, EXPIRY_2029); assert.equal(cap.binding.reservation.skipDeploys, true);
  const prior = f.record().authorization.supersedesFinite[0]; assert.equal(prior.previousExpiry, request.previousExpiry);
  assert.equal(prior.requestDigest, historyDigest(Object.fromEntries(['subjectId','operationNonce','reviewedSha','previousExpiry','newExpiry','owner','ownerNonce'].map(k=>[k,f.old().demoAuthExpiryRenewals[0][k]]))));
  assert.equal(prior.authorizationDigest, f.old().demoAuthExpiryRenewals[0].authorization.authorization.bindingDigest);
  assert.equal(prior.executionDigest, historyDigest(f.old().demoAuthExpiryRenewals[0].execution));
  assert.deepEqual(f.old(), before.standaloneReviews[1]); assert.deepEqual(f.state().standaloneReviews[0].reviews, before.standaloneReviews[0].reviews);
  assert.deepEqual(f.state().standaloneReviews[0].release, before.standaloneReviews[0].release);
});
for (const action of ['renew-demo-auth-expiry','enable-permanent-demo-auth']) test(`old ${action} cannot replace the2029 action`, async () => {
  const f = fixture(); await authorized(f); f.record().authorization.authorization.binding.action = action; await assert.rejects(f.controller.prepare(selector));
});
test('one CAS claim, durable intent and no replay or false finish', async () => {
  const f = fixture(), claim = await claimed(f);
  await assert.rejects(f.controller.claim(selector, { actor: claim.actor, runId:'77',fingerprint,fresh }));
  await assert.rejects(f.controller.finish(claim,'staged')); await assert.rejects(f.controller.finish(claim,'uncertain'));
  await f.controller.intent(claim); await assert.rejects(f.controller.intent(claim)); await f.controller.finish(claim,'staged'); await assert.rejects(f.controller.prepare(selector));
});
test('concurrent claim has one winner', async () => {
  const f = fixture(); await authorized(f); const args={actor:'worker-fixture',runId:'77',fingerprint,fresh};
  const results=await Promise.allSettled([f.controller.claim(selector,args),f.controller.claim(selector,args)]); assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
});
for (const status of ['claimed','write-intent','uncertain',undefined]) test(`unresolved old finite ${status} blocks new operation`, async () => {
  const f=fixture(); f.old().demoAuthExpiryRenewals[0].execution=status?{status}:undefined; await assert.rejects(authorized(f)); assert.equal(f.writes(),0);
});
for (const kind of ['missing','parallel','receipt','request','digest','dispatch-source','dispatch-stage','dispatch-auth','dispatch-unresolved']) test(`supersession rejects ${kind}`, async () => {
  const f=fixture(), p=f.old(), q=p.demoAuthExpiryRenewals[0];
  if(kind==='missing')p.demoAuthExpiryRenewals=[];
  if(kind==='parallel')p.demoAuthExpiryRenewals.push(clone(q));
  if(kind==='receipt')q.authorization=undefined;
  if(kind==='request')q.newExpiry='2026-11-08T18:00:00Z';
  if(kind==='digest')q.authorization.authorization.bindingDigest='0'.repeat(64);
  if(kind==='dispatch-source')p.exactDemoDispatches.deploy.sha='0'.repeat(40);
  if(kind==='dispatch-stage')p.exactDemoDispatches.deploy.operatorAuthorization.binding.reservation.stageRunId++;
  if(kind==='dispatch-auth')p.exactDemoDispatches.deploy.operatorAuthorization=undefined;
  if(kind==='dispatch-unresolved')p.exactDemoDispatches.deploy.phase='intent';
  await assert.rejects(authorized(f)); assert.equal(f.writes(),0);
});
for (const [field,value] of [['status','in_progress'],['conclusion','success'],['conclusion','cancelled'],['run_attempt',2],['head_sha','0'.repeat(40)],
  ['id',123],['path','.github/workflows/other.yml'],['event','push'],['head_branch','foreign'],['display_title','foreign']]) test(`terminal failed run rejects ${field}=${value}`,async()=>{
  const f=fixture();f.run(r=>({...r,[field]:value}));await assert.rejects(authorized(f));assert.equal(f.writes(),0);
});
for(const field of ['owner','release','history','authorization','execution','other-stage']) test(`final-await ${field} drift cannot survive ownership fence`,async()=>{
  const f=fixture(),c=await claimed(f);await f.controller.intent(c);let once=false;
  f.permission(s=>{if(once)return;once=true;const b=s.standaloneReviews[0],q=b.demoAuth2029Stages[0];
    if(field==='owner')b.operatorCoordination.owner='other';if(field==='release')b.release.mergeSha='0'.repeat(40);
    if(field==='history')b.recoveryHistory.push({action:'changed'});if(field==='authorization')q.authorization.authorization.binding.action='renew-demo-auth-expiry';
    if(field==='execution')q.execution.nonce='different';if(field==='other-stage')s.standaloneReviews[1].demoAuthExpiryRenewals[0].execution.runId='different';});
  await assert.rejects(f.controller.assertOwned(c,'write-intent'));
});
test('exact target inspection proves active old cutoff and failed source, without variable inventory',async()=>{
  const queries=[];const result=await inspectDemo2029Target({request,client:async q=>{queries.push(q);return targetData();},readPublic:async u=>publicData(u),assertFreshMain:async()=>{}});
  assert.equal(result.activeDeploymentId,request.activeDeploymentId);assert.equal(result.previousExpiry,request.previousExpiry);assert.equal(result.failedDeploymentId,request.failedDeploymentId);
  assert.ok(queries.length>=2);assert.ok(queries.every(q=>!q.startsWith('mutation')&&!/\bvariables\s*\(/.test(q)));
  const f=fixture();const r=await runDemo2029Operation({controller:f.controller,selector,inspect:async()=>result});assert.equal(r.mutationAttempted,false);assert.equal(f.writes(),0);
});
for(const [name,change]of [
  ['production',d=>{d.projectToken.environment.name='production';}],['rollout',d=>{d.deployments.edges=[{node:{id:'rolling'}}];}],
  ['active-source',d=>{d.serviceInstance.activeDeployments[0].meta.commitHash='0'.repeat(40);}],['same-source',d=>{d.serviceInstance.activeDeployments[0].meta.commitHash=request.reviewedSha;}],
  ['latest-id',d=>{d.serviceInstance.latestDeployment.id='99999999-9999-4999-8999-999999999999';}],['latest-status',d=>{d.serviceInstance.latestDeployment.status='BUILDING';}],
  ['failed-missing',d=>{delete d.deployment;}],['failed-source',d=>{d.deployment.meta.commitHash='0'.repeat(40);}],['failed-status',d=>{d.deployment.status='SUCCESS';}],
  ['failed-target',d=>{d.deployment.environmentId='foreign';}],['failed-id',d=>{d.deployment.id=request.activeDeploymentId;}],
])test(`preflight rejects ${name}`,async()=>{const d=targetData();change(d);await assert.rejects(inspectDemo2029Target({request,client:async()=>d,readPublic:async u=>publicData(u),assertFreshMain:async()=>{}}));});
for(const [name,change]of [['Entra',v=>{v.mode='entra';}],['nonsynthetic',v=>{v.syntheticOnly=false;}],['permanent',v=>{v.permanentDemo=true;}],
  ['oldexpiry',v=>{v.expiresAt='2026-11-09T18:00:00Z';}],['expiry-offset',v=>{v.expiresAt='2026-11-01T00:59:59+01:00';}],['expiry-ms',v=>{v.expiresAt='2026-10-31T23:59:59.001Z';}],['enabled',v=>{v.mode='demo';v.simulator=true;v.temporaryDemo=true;}]])test(`public status rejects ${name}`,async()=>{
  await assert.rejects(inspectDemo2029Target({request,client:async()=>targetData(),assertFreshMain:async()=>{},readPublic:async u=>{const v=publicData(u);if(u.endsWith('/auth/status'))change(v);return v;}}));
});
test('public old expiry accepts only exact seconds or .000Z spelling',async()=>{
  const r=await inspectDemo2029Target({request,client:async()=>targetData(),assertFreshMain:async()=>{},readPublic:async u=>{const v=publicData(u);if(u.endsWith('/auth/status'))v.expiresAt='2026-10-31T23:59:59.000Z';return v;}});assert.equal(r.previousExpiry,request.previousExpiry);
});
test('one fixed-key2029 upsert, no deployment or generic flags; replay denied',async()=>{
  const f=fixture();await authorized(f);const calls=[];const r=await stageDemo2029({selector,actor:'worker-fixture',runId:'77',controller:f.controller,inspect:fresh,client:async(q,v)=>{calls.push({q,v});return{variableUpsert:true};}});
  assert.equal(r.status,'staged-awaiting-explicit-deployment');assert.equal(r.deploymentTriggered,false);assert.equal(r.newExpiry,EXPIRY_2029);
  assert.deepEqual(calls,[{q:DEMO_2029_MUTATION,v:{input:{projectId:DEMO_TARGET.projectId,environmentId:DEMO_TARGET.environmentId,serviceId:DEMO_TARGET.serviceId,name:KEY,value:EXPIRY_2029,skipDeploys:true}}}]);
  await assert.rejects(stageDemo2029({selector,actor:'worker-fixture',runId:'77',controller:f.controller,inspect:fresh,client:async()=>calls.push('replay')}));assert.equal(calls.length,1);
});
test('uncertain write is retained and never replayed; acknowledgment persistence failure stays uncertain',async()=>{
  for(const acknowledge of[false,true]){const f=fixture();await authorized(f);let writes=0;const c=acknowledge?{...f.controller,finish:async()=>{throw Error('CAS-failed');}}:f.controller;
    const r=await stageDemo2029({selector,actor:'worker-fixture',runId:'77',controller:c,inspect:fresh,client:async()=>{writes++;if(!acknowledge)throw Error('secret-provider-payload');return{variableUpsert:true};}});
    assert.equal(writes,1);assert.equal(r.status,'mutation-uncertain-do-not-retry');assert.ok(!JSON.stringify(r).includes('secret-provider-payload'));assert.equal(f.record().execution.status,acknowledge?'write-intent':'uncertain');
    await assert.rejects(stageDemo2029({selector,actor:'worker-fixture',runId:'77',controller:f.controller,inspect:fresh,client:async()=>writes++}));assert.equal(writes,1);}
});
test('wrong provider response is uncertainty not staged',async()=>{const f=fixture();await authorized(f);const r=await stageDemo2029({selector,actor:'worker-fixture',runId:'77',controller:f.controller,inspect:fresh,client:async()=>({variableCollectionUpsert:true})});assert.equal(r.status,'mutation-uncertain-do-not-retry');});
test('main drift, revocation and request aliases cannot bypass final write fences',async()=>{
  for(const kind of['main','revocation']){const f=fixture();await authorized(f);let writes=0;const r=await stageDemo2029({selector,actor:'worker-fixture',runId:'77',controller:f.controller,
    inspect:async()=>{if(f.record().execution?.status==='write-intent'){if(kind==='main')f.setMain('0'.repeat(40));else f.revoke();}return fresh();},client:async()=>writes++});assert.equal(writes,0);assert.equal(r.mutationAttempted,false);}
  const f=fixture();await authorized(f);let value;await stageDemo2029({selector,actor:'worker-fixture',runId:'77',controller:f.controller,inspect:async q=>{q.previousExpiry='2099';return fresh();},client:async(_q,v)=>{value=v.input.value;return{variableUpsert:true};}});assert.equal(value,EXPIRY_2029);
});
test('foreign selector, inherited approval and copied action are rejected',async()=>{
  const f=fixture();await authorized(f);for(const altered of[{subjectId:'standalone-pr-520'},{operationNonce:'55555555-5555-4555-8555-555555555555'},{reviewedSha:'0'.repeat(40)}])await assert.rejects(f.controller.prepare({...selector,...altered}));
  const g=fixture();g.state().standaloneReviews[0].release.sourceTreeProof.sourceEquivalent=false;await assert.rejects(authorized(g));
  const h=fixture();h.state().standaloneReviews[0].release.reviewProof.claudeRound=2;await assert.rejects(authorized(h));
});
test('workflow/CLI manual trusted main only, first attempt, tests before dedicated secret',async()=>{
  const env={GITHUB_ACTIONS:'true',GITHUB_ACTOR:'l2v-hub',GITHUB_TRIGGERING_ACTOR:'l2v-hub',GITHUB_WORKFLOW_SHA:selector.reviewedSha,GITHUB_REPOSITORY:'l2v-hub/ClinicOS',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_SHA:selector.reviewedSha,GITHUB_WORKFLOW_REF:'l2v-hub/ClinicOS/.github/workflows/enable-demo-auth-2029.yml@refs/heads/main',GITHUB_RUN_ID:'77',GITHUB_RUN_ATTEMPT:'1',DEMO2029_REVIEWED_SHA:selector.reviewedSha};
  assert.equal(validateDemo2029Context(env).reviewedSha,selector.reviewedSha);
  for(const[k,v]of[['GITHUB_REF','refs/heads/pr'],['GITHUB_EVENT_NAME','push'],['GITHUB_RUN_ATTEMPT','2'],['DEMO2029_REVIEWED_SHA','0'.repeat(40)],['GITHUB_TRIGGERING_ACTOR','foreign']])assert.throws(()=>validateDemo2029Context({...env,[k]:v}));
  const yaml=await readFile(new URL('../../.github/workflows/enable-demo-auth-2029.yml',import.meta.url),'utf8');assert.match(yaml,/group: railway-demo/);assert.match(yaml,/glistening-friendship \/ demo/);assert.match(yaml,/secrets\.RAILWAY_DEMO_TOKEN/);assert.doesNotMatch(yaml,/secrets\.RAILWAY_TOKEN|workflow_call|pull_request_target/);assert.ok(yaml.indexOf('Test without credentials')<yaml.indexOf('secrets.RAILWAY_DEMO_TOKEN'));
  for(const line of yaml.split('\n').filter(x=>/uses:/.test(x)))assert.match(line,/@[a-f0-9]{40}\s*$/);
});
test('receipt has fixed cutoff and finite fields only; credential aliases never reflected',()=>{
  const r={schemaVersion:1,status:'blocked-before-write',code:'DEMO2029_BLOCKED',mutationAttempted:false,deploymentTriggered:false};assert.ok(serializeDemo2029Receipt(r));assert.throws(()=>serializeDemo2029Receipt({...r,providerError:'private'}));assert.throws(()=>serializeDemo2029Receipt(r,['\r\nblocked-before-write\t']));assert.throws(()=>serializeDemo2029Receipt({...r,newExpiry:'2099-01-01T00:00:00Z'}));
});
