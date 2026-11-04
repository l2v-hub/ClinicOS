import test from 'node:test';
import assert from 'node:assert/strict';
import { captureReleaseReviewProof } from '../../agent-team/src/bug-pipeline/release.mjs';
import { historyDigest } from '../../agent-team/src/bug-pipeline/attempt-budget.mjs';
import { DEMO_TARGET } from '../../agent-team/src/bug-pipeline/demo-deployment.mjs';
import { ACTION, CONFIG, KEY, MUTATION, selectNoExpiry, validateNoExpiryContext,
  validatePrerequisites, serializeNoExpiryReceipt, createNoExpiryController, priorOperationsDigest,
  FAILED_DEPLOYMENT, stageNoExpiry } from './demo-no-expiry-controller.mjs';

const sha = 'a'.repeat(40), nonce = '11111111-1111-4111-8111-111111111111';
const env = { GITHUB_ACTIONS:'true', GITHUB_REPOSITORY:'l2v-hub/ClinicOS', GITHUB_REF:'refs/heads/main',
  GITHUB_EVENT_NAME:'workflow_dispatch', GITHUB_WORKFLOW_REF:'l2v-hub/ClinicOS/.github/workflows/enable-demo-auth-no-expiry.yml@refs/heads/main',
  GITHUB_ACTOR:'l2v-hub', GITHUB_TRIGGERING_ACTOR:'l2v-hub', GITHUB_SHA:sha, GITHUB_WORKFLOW_SHA:sha,
  GITHUB_RUN_ATTEMPT:'1', GITHUB_RUN_ID:'77', NO_EXPIRY_REVIEWED_SHA:sha };
function setup() {
  const target = { projectToken:{ project:{id:DEMO_TARGET.projectId}, environment:{id:DEMO_TARGET.environmentId,name:'demo'} },
    serviceInstance:{serviceId:DEMO_TARGET.serviceId,environmentId:DEMO_TARGET.environmentId,source:{repo:'l2v-hub/ClinicOS'},
      domains:{serviceDomains:[{domain:DEMO_TARGET.domain}]}} };
  const ready = {status:'ready',tier:'demo'};
  const authStatus = {mode:'disabled',simulator:false,syntheticOnly:true};
  const config = {CLINICOS_ENV:'demo',NODE_ENV:'production',AUTH_MODE:'demo',DEMO_DATASET_ID:'synthetic-v1',
    ALLOW_PRODUCTION_DEMO_AUTH:'true',ROLE_SIMULATOR_ENABLED:'true',ROLE_SIMULATOR_ALLOW_PRODUCTION:'true',ROLE_SIMULATOR_SECRET:'S'.repeat(48)};
  return {target,ready,authStatus,config};
}
test('context is trusted main, exact workflow, first attempt and exact reviewed SHA', () => {
  assert.deepEqual(validateNoExpiryContext(env), {reviewedSha:sha,runId:'77'});
  for (const [key,value] of [['GITHUB_REF','refs/heads/other'],['GITHUB_EVENT_NAME','push'],['GITHUB_RUN_ATTEMPT','2'],
    ['GITHUB_TRIGGERING_ACTOR','foreign'],['NO_EXPIRY_REVIEWED_SHA','b'.repeat(40)]])
    assert.throws(() => validateNoExpiryContext({...env,[key]:value}));
});
test('selection accepts only exact subject, nonce and reviewed SHA fields', () => {
  assert.equal(selectNoExpiry({subjectId:'standalone-pr-525',operationNonce:nonce,reviewedSha:sha}).reviewedSha,sha);
  for (const value of [{subjectId:'standalone-pr-506',operationNonce:nonce,reviewedSha:sha},
    {subjectId:'standalone-pr-525',operationNonce:'bad',reviewedSha:sha},
    {subjectId:'standalone-pr-525',operationNonce:nonce,reviewedSha:sha,other:'unsafe'}]) assert.throws(()=>selectNoExpiry(value));
});
test('fixed demo and synthetic prerequisites pass without returning any variable values', () => {
  const f=setup(); assert.equal(validatePrerequisites(f),true);
  assert.deepEqual(CONFIG,{CLINICOS_ENV:'demo',DEMO_AUTH_NO_EXPIRY:'true'});
});
for (const [name,change] of [
  ['wrong Railway project',f=>{f.target.projectToken.project.id='foreign';}],
  ['wrong environment',f=>{f.target.projectToken.environment.name='production';}],
  ['production tier',f=>{f.config.CLINICOS_ENV='production';}],
  ['unknown tier',f=>{f.config.CLINICOS_ENV='demoo';}],
  ['missing synthetic dataset',f=>{delete f.config.DEMO_DATASET_ID;}],
  ['wrong synthetic dataset',f=>{f.config.DEMO_DATASET_ID='clinical';}],
  ['malformed auth allow flag',f=>{f.config.ALLOW_PRODUCTION_DEMO_AUTH='TRUE ';}],
  ['authz disabled',f=>{f.config.AUTHZ_ENFORCEMENT='off';}],
  ['authz malformed',f=>{f.config.AUTHZ_ENFORCEMENT='enabel';}],
  ['unmapped route allow',f=>{f.config.AUTHZ_UNMAPPED_ROUTES='allow';}],
  ['unmapped route malformed',f=>{f.config.AUTHZ_UNMAPPED_ROUTES='maybe';}],
  ['simulator disabled',f=>{f.config.ROLE_SIMULATOR_ENABLED='false';}],
  ['production simulator allow absent',f=>{delete f.config.ROLE_SIMULATOR_ALLOW_PRODUCTION;}],
  ['short signing secret',f=>{f.config.ROLE_SIMULATOR_SECRET='short';}],
  ['malformed no-expiry variable',f=>{f.config.DEMO_AUTH_NO_EXPIRY='yes';}],
  ['already enabled stage',f=>{f.config.DEMO_AUTH_NO_EXPIRY='true';}],
  ['wrong public tier',f=>{f.ready.tier='production';}],
  ['non-synthetic public mode',f=>{f.authStatus.syntheticOnly=false;}],
]) test(`prerequisite rejects ${name}`,()=>{const f=setup();change(f);assert.throws(()=>validatePrerequisites(f));});
test('fixed atomic mutation cannot replace all variables or deploy',()=>{
  assert.match(MUTATION,/variableCollectionUpsert/); assert.match(MUTATION,/VariableCollectionUpsertInput/);
  assert.equal(ACTION,'enable-demo-auth-no-expiry'); assert.equal(KEY,'DEMO_AUTH_NO_EXPIRY');
  assert.notEqual(CONFIG.CLINICOS_ENV,'production');
});
test('receipt rejects secret/config reflection and unexpected fields',()=>{
  const value={schemaVersion:1,status:'metadata-readonly-verified',code:'NO_EXPIRY_METADATA',reviewedSha:sha,
    activeSourceSha:'b'.repeat(40),activeDeploymentId:'22222222-2222-4222-8222-222222222222',
    prerequisitesVerified:true,mutationAttempted:false,deploymentTriggered:false};
  assert.ok(serializeNoExpiryReceipt(value));
  assert.throws(()=>serializeNoExpiryReceipt({...value,variables:{ROLE_SIMULATOR_SECRET:'private'}}));
  assert.throws(()=>serializeNoExpiryReceipt(value,['NO_EXPIRY_METADATA']));
  assert.throws(()=>serializeNoExpiryReceipt(value,[` ${sha} `]),'header-normalized credential alias must not appear in evidence');
});

const clone=structuredClone, current=selector => ({subjectId:'standalone-pr-525',operationNonce:nonce,reviewedSha:sha,
  owner:'root-fixture',ownerNonce:'44444444-4444-4444-8444-444444444444',
  activeDeploymentId:'55555555-5555-4555-8555-555555555555',activeSourceSha:'b'.repeat(40),
  failedDeploymentId:FAILED_DEPLOYMENT.id,failedSourceSha:FAILED_DEPLOYMENT.sourceSha});
function nativeFixture({capability=true,provenance='user-session',finiteStatus='staged'}={}) {
  const report=JSON.stringify({subject_sha:'f'.repeat(40),verdict:'approved',summary:'fixture',findings:[]});
  const record=current();
  const subject={id:'standalone-pr-525',pr:{number:525,url:'https://github.com/l2v-hub/ClinicOS/pull/525'},issues:[524],
    sha:'f'.repeat(40),branch:'codex/profiles-fixture',phase:'ready',approvedSha:'f'.repeat(40),implementation:[],
    reviews:[{},{},{round:3,status:'approved',subjectSha:'f'.repeat(40)}],reviewLedger:{rounds:[{},{},{round:3,verdict:'approved',subject_sha:'f'.repeat(40),review_sha256:historyDigest(JSON.parse(report))}]},
    reviewReports:{'claude-review-3.json':report},feedbackFingerprint:'fixture-feedback',
    codexFinalReview:{status:'verified',subjectSha:'f'.repeat(40),claudeRound:3,feedbackFingerprint:'fixture-feedback'},
    externalReview:{status:'published',subjectSha:'f'.repeat(40),feedbackFingerprint:'fixture-feedback',feedbackChanged:false},
    parentSource:{parent:{id:'standalone-pr-523',mergeSha:'e'.repeat(40)}},
    operatorCoordination:{active:true,owner:record.owner,nonce:record.ownerNonce},
    release:{status:'merged',reviewedSha:'f'.repeat(40),prNumber:525,mergeSha:sha,
      sourceTreeProof:{sourceEquivalent:true,reviewedSha:'f'.repeat(40),mergeSha:sha,reviewedTree:'9'.repeat(40),mergeTree:'9'.repeat(40)}},
    recoveryHistory:[],demoAuthExpiryRenewals:[{operationNonce:'66666666-6666-4666-8666-666666666666',
      ...(finiteStatus==='missing'?{}:{execution:{status:finiteStatus}})}],
    demoAuth2029Stages:[{operationNonce:'77777777-7777-4777-8777-777777777777',execution:{status:'staged'}}],
    exactDemoDispatches:{deploy:{operation:'deploy',phase:'observed',sha:FAILED_DEPLOYMENT.sourceSha,
      dispatchId:'88888888-8888-4888-8888-888888888888'}},demoAuthNoExpiryStages:[record]};
  subject.release.reviewProof=captureReleaseReviewProof(subject,{repository:'l2v-hub/ClinicOS',collection:'standaloneReviews'});
  let state={repository:'l2v-hub/ClinicOS',batches:[],manualBatches:[],standaloneReviews:[subject]};
  record.releaseDigest=historyDigest(subject.release); record.parentSourceDigest=historyDigest(subject.parentSource);
  record.ownerDigest=historyDigest(subject.operatorCoordination); record.priorOperationsDigest=priorOperationsDigest(state,record);
  let revision=0,loadedRevision=0,denied=false,mainMutation=null,saveFailAt=Infinity,saves=0;
  const store={load:async()=>{loadedRevision=revision;return clone(state);},observe:async()=>clone(state),save:async(next,{guard})=>{
    const expected=loadedRevision; await guard(); assert.equal(revision,expected,'native compare-and-swap');
    saves++; if(saves===saveFailAt)throw Error('cas failure'); state=clone(next);revision++;loadedRevision=revision; }};
  const github={createStateStore:()=>store,authorizedMaintainer:async()=>!denied,
    reviewFeedback:async()=>{if(mainMutation)mainMutation();return{number:525,state:'MERGED',url:subject.pr.url,head:subject.sha,
      headRef:subject.branch,headRepo:'l2v-hub/ClinicOS',headIsFork:false,baseRef:'main',mergeCommitSha:sha};}};
  let consumed=0;
  const verifier=capability?async({binding,consume})=>{assert.equal(consume,true);consumed++;return{provenance,grantId:'host-grant',
    consumptionNonce:'host-consumption',sourceRef:'desktop-user-session:authorized',binding};}:undefined;
  const controller=createNoExpiryController({github,authorizationVerifier:verifier,assertCurrentMain:async expected=>{assert.equal(expected,sha);}});
  return{controller,state:()=>clone(state),record:()=>state.standaloneReviews[0].demoAuthNoExpiryStages[0],
    writes:()=>revision,consumed:()=>consumed,deny:()=>{denied=true;},mutateBeforeMain:fn=>{mainMutation=fn;},
    mutate:fn=>fn(state),failSaveAt:n=>{saveFailAt=n;},saves:()=>saves};
}
const selectFixture=()=>({subjectId:'standalone-pr-525',operationNonce:nonce,reviewedSha:sha});
test('native controller requires actual injected desktop capability; no PAT/environment fallback',async()=>{
  const f=nativeFixture({capability:false});
  await assert.rejects(f.controller.authorize(selectFixture(),{actor:'root-fixture',reference:'fake'}));
  assert.equal(f.writes(),0); assert.equal(f.consumed(),0);
});
test('actual host user-session capability is bound, append-only and consumed once',async()=>{
  const f=nativeFixture(); const before=f.state();
  const saved=await f.controller.authorize(selectFixture(),{actor:'root-fixture',reference:'desktop-session:exact-action'});
  assert.equal(saved.authorization.binding.action,ACTION); assert.deepEqual(saved.authorization.binding.reservation.variables,CONFIG);
  assert.equal(saved.authorization.provenance,'user-session'); assert.equal(f.consumed(),1); assert.equal(f.writes(),1);
  assert.deepEqual(f.state().standaloneReviews[0].demoAuthExpiryRenewals,before.standaloneReviews[0].demoAuthExpiryRenewals);
  assert.deepEqual(f.state().standaloneReviews[0].demoAuth2029Stages,before.standaloneReviews[0].demoAuth2029Stages);
  assert.deepEqual(f.state().standaloneReviews[0].exactDemoDispatches,before.standaloneReviews[0].exactDemoDispatches);
});
test('maintainer-comment and alternate provenance cannot authorize the host-only action',async()=>{
  const f=nativeFixture({provenance:'distinct-maintainer-comment'});
  await assert.rejects(f.controller.authorize(selectFixture(),{actor:'root-fixture',reference:'comment'}));
  assert.equal(f.writes(),0);
});
test('concurrent native CAS claims have one winner',async()=>{
  const f=nativeFixture(); await f.controller.authorize(selectFixture(),{actor:'root-fixture',reference:'desktop-session:exact-action'});
  const fingerprint='c'.repeat(64), fresh=async()=>({fingerprint});
  const results=await Promise.allSettled([
    f.controller.claim(selectFixture(),{actor:'worker-fixture',runId:'77',fingerprint,fresh}),
    f.controller.claim(selectFixture(),{actor:'worker-fixture',runId:'78',fingerprint,fresh}),
  ]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(results.filter(x=>x.status==='rejected').length,1);
});
test('native finish cannot mark staged before durable write-intent',async()=>{
  const f=nativeFixture(); await f.controller.authorize(selectFixture(),{actor:'root-fixture',reference:'desktop-session:exact-action'});
  const fingerprint='c'.repeat(64), fresh=async()=>({fingerprint});
  const claim=await f.controller.claim(selectFixture(),{actor:'worker-fixture',runId:'77',fingerprint,fresh});
  await assert.rejects(f.controller.finish(claim,'staged'));
  assert.equal(f.record().execution.status,'claimed');
});
test('native claim, write intent, finish are CAS-backed and a consumed operation cannot replay',async()=>{
  const f=nativeFixture(); await f.controller.authorize(selectFixture(),{actor:'root-fixture',reference:'desktop-session:exact-action'});
  const request=f.record(), inspect=async()=>({activeDeploymentId:request.activeDeploymentId,activeSourceSha:request.activeSourceSha,
    failedDeploymentId:request.failedDeploymentId,failedSourceSha:request.failedSourceSha,prerequisitesVerified:true,fingerprint:'c'.repeat(64)});
  const result=await stageNoExpiry({selector:selectFixture(),actor:'worker-fixture',runId:'77',controller:f.controller,inspect,
    client:async(query,vars)=>{assert.equal(query,MUTATION);assert.equal(vars.input.variables.DEMO_AUTH_NO_EXPIRY,'true');return{variableCollectionUpsert:true};}});
  assert.equal(result.status,'staged-awaiting-explicit-deployment');assert.equal(result.deploymentTriggered,false);
  assert.equal(f.record().execution.status,'staged'); assert.ok(f.writes()>=4);
  await assert.rejects(f.controller.prepare(selectFixture(),'worker-fixture'));
});
test('final current-main await owner drift blocks a fresh capability write',async()=>{
  const f=nativeFixture(); f.mutateBeforeMain(()=>{f.record().ownerNonce='99999999-9999-4999-8999-999999999999';});
  await assert.rejects(f.controller.authorize(selectFixture(),{actor:'root-fixture',reference:'desktop-session:exact-action'}));
  assert.equal(f.writes(),0);
});
test('unresolved historical stages and failed/unknown dispatch identity are preserved and block',async()=>{
  for(const change of [s=>{s.standaloneReviews[0].demoAuth2029Stages[0].execution.status='write-intent';},
    s=>{s.standaloneReviews[0].exactDemoDispatches.deploy.phase='intent';}]){
    const f=nativeFixture(); f.mutate(change); // external canonical drift is fail-closed on locate/digest
    await assert.rejects(f.controller.authorize(selectFixture(),{actor:'root-fixture',reference:'desktop-session:exact-action'}));
    assert.equal(f.writes(),0);
  }
});
test('unresolved historical finite renewals block without rewriting staged finite history',async()=>{
  for(const status of ['claimed','write-intent','uncertain','missing']){
    const f=nativeFixture({finiteStatus:status});
    await assert.rejects(f.controller.authorize(selectFixture(),{actor:'root-fixture',reference:'desktop-session:exact-action'}));
    assert.equal(f.writes(),0);
  }
  const f=nativeFixture({finiteStatus:'staged'}); const before=clone(f.state().standaloneReviews[0].demoAuthExpiryRenewals);
  await f.controller.authorize(selectFixture(),{actor:'root-fixture',reference:'desktop-session:exact-action'});
  assert.deepEqual(f.state().standaloneReviews[0].demoAuthExpiryRenewals,before);
});
