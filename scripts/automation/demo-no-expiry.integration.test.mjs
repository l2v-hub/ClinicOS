import test from 'node:test';
import assert from 'node:assert/strict';
import { captureReleaseReviewProof } from '../../agent-team/src/bug-pipeline/release.mjs';
import { authorizationBinding } from '../../agent-team/src/bug-pipeline/operator-authorization.mjs';
import { historyDigest } from '../../agent-team/src/bug-pipeline/attempt-budget.mjs';
import { DEMO_TARGET } from '../../agent-team/src/bug-pipeline/demo-deployment.mjs';
import { ACTION, CONFIG, MUTATION, FAILED_DEPLOYMENT, createNoExpiryController, stageNoExpiry } from './demo-no-expiry-controller.mjs';

// Synthetic records model a prior host-consumed action; they do not assert real authorization.
const clone = structuredClone;
const selector = {subjectId:'standalone-pr-525',operationNonce:'11111111-1111-4111-8111-111111111111',reviewedSha:'a'.repeat(40)};
const ownerNonce='22222222-2222-4222-8222-222222222222';
const deployment='a93cffdf-fd91-4a75-bc0d-a97154e0d888', source='c'.repeat(40), fingerprint='d'.repeat(64);

function fixture(prior = () => {}) {
  const report=JSON.stringify({subject_sha:'b'.repeat(40),verdict:'approved',summary:'Synthetic fixture only',findings:[]});
  const child={id:selector.subjectId,pr:{number:525,url:'https://github.com/l2v-hub/ClinicOS/pull/525'},issues:[524],
    sha:'b'.repeat(40),branch:'codex/fixture',phase:'ready',approvedSha:'b'.repeat(40),implementation:[],
    reviews:[{},{},{round:3,status:'approved',subjectSha:'b'.repeat(40)}],recoveryHistory:[],
    reviewLedger:{rounds:[{},{},{round:3,verdict:'approved',subject_sha:'b'.repeat(40),review_sha256:historyDigest(JSON.parse(report))}]},
    reviewReports:{'claude-review-3.json':report},feedbackFingerprint:'same-fixture',
    codexFinalReview:{status:'verified',subjectSha:'b'.repeat(40),claudeRound:3,feedbackFingerprint:'same-fixture'},
    externalReview:{status:'published',subjectSha:'b'.repeat(40),feedbackFingerprint:'same-fixture',feedbackChanged:false},
    parentSource:{parent:{id:'standalone-pr-523',mergeSha:'e'.repeat(40)}},
    operatorCoordination:{active:true,owner:'root-fixture',nonce:ownerNonce},
    release:{status:'merged',reviewedSha:'b'.repeat(40),prNumber:525,mergeSha:selector.reviewedSha,
      sourceTreeProof:{sourceEquivalent:true,reviewedSha:'b'.repeat(40),mergeSha:selector.reviewedSha,reviewedTree:'f'.repeat(40),mergeTree:'f'.repeat(40)}}};
  child.release.reviewProof=captureReleaseReviewProof(child,{repository:'l2v-hub/ClinicOS',collection:'standaloneReviews'});
  prior(child);
  let remote={repository:'l2v-hub/ClinicOS',batches:[],manualBatches:[],standaloneReviews:[child]};
  const priorOperationsDigest=historyDigest([{id:child.id,demoAuthExpiryRenewals:child.demoAuthExpiryRenewals??[],demoAuth2029Stages:child.demoAuth2029Stages??[],permanentDemoStages:child.permanentDemoStages??[],demoAuthNoExpiryStages:[],exactDemoDispatches:child.exactDemoDispatches??{}}]);
  const request={...selector,owner:'root-fixture',ownerNonce,activeDeploymentId:deployment,activeSourceSha:source,failedDeploymentId:FAILED_DEPLOYMENT.id,failedSourceSha:FAILED_DEPLOYMENT.sourceSha,
    releaseDigest:historyDigest(child.release),parentSourceDigest:historyDigest(child.parentSource),
    ownerDigest:historyDigest(child.operatorCoordination),priorOperationsDigest};
  child.demoAuthNoExpiryStages=[clone(request)];
  const reservation={request,target:DEMO_TARGET,variables:CONFIG,replace:false,skipDeploys:true,deploy:false,sql:false,
    releaseDigest:request.releaseDigest,parentSourceDigest:request.parentSourceDigest,ownerDigest:request.ownerDigest,priorOperationsDigest};
  const binding=authorizationBinding({state:remote,subject:child,actor:'root-fixture',action:ACTION,reservation,budget:null});
  const auth={provenance:'user-session',grantId:'fixture-grant',consumptionNonce:'fixture-consumption',sourceRef:'user-session:fixture',binding,bindingDigest:historyDigest(binding)};
  child.demoAuthNoExpiryStages[0].authorization={authorization:auth,authorizedAt:'2026-11-04T00:00:00.000Z',historyBeforeLength:0,historyBeforeDigest:historyDigest([]),auditNonce:'44444444-4444-4444-8444-444444444444'};
  child.recoveryHistory=[{action:ACTION,nonce:'44444444-4444-4444-8444-444444444444',at:'2026-11-04T00:00:00.000Z',operationNonce:selector.operationNonce,authorization:clone(auth)}];
  let revision=0,loadedRevision,permission=()=>{},revoked=false, saveFailure=false;
  const store={load:async()=>{loadedRevision=revision;return clone(remote);},observe:async()=>clone(remote),
    save:async(state,{guard})=>{assert.notEqual(loadedRevision,undefined,'load is required before save');const expected=loadedRevision;await guard();assert.equal(revision,expected,'CAS conflict');if(saveFailure)throw Error('ack persistence failure');remote=clone(state);revision++;loadedRevision=revision;}};
  const github={createStateStore:()=>store,authorizedMaintainer:async actor=>{permission(remote,actor);return !revoked;},
    reviewFeedback:async()=>{const b=remote.standaloneReviews[0];return{number:525,state:'MERGED',url:b.pr.url,head:b.sha,headRef:b.branch,headRepo:'l2v-hub/ClinicOS',headIsFork:false,baseRef:'main',mergeCommitSha:b.release.mergeSha};}};
  const deps={github,assertCurrentMain:async actual=>assert.equal(actual,selector.reviewedSha),now:()=>Date.parse('2026-11-04T00:00:00Z'),nonce:()=> '33333333-3333-4333-8333-333333333333'};
  const controller=createNoExpiryController(deps);
  const inspect=async()=>({activeDeploymentId:deployment,activeSourceSha:source,failedDeploymentId:FAILED_DEPLOYMENT.id,failedSourceSha:FAILED_DEPLOYMENT.sourceSha,prerequisitesVerified:true,fingerprint});
  return {controller,deps,inspect,record:()=>remote.standaloneReviews[0].demoAuthNoExpiryStages[0],state:()=>remote,
    mutate:fn=>{fn(remote);revision++;},permission:fn=>{permission=fn;},revoke:()=>{revoked=true;},failSave:()=>{saveFailure=true;}};
}

test('real controller stages exactly once with CAS and consumed binding',async()=>{
  const f=fixture(), writes=[];
  const invoke=()=>stageNoExpiry({selector,actor:'worker-fixture',runId:'77',controller:f.controller,inspect:f.inspect,
    client:async(q,v)=>{writes.push({q,v});return{variableCollectionUpsert:true};}});
  const result=await invoke();
  assert.equal(result.status,'staged-awaiting-explicit-deployment');
  assert.deepEqual(writes,[{q:MUTATION,v:{input:{projectId:DEMO_TARGET.projectId,environmentId:DEMO_TARGET.environmentId,serviceId:DEMO_TARGET.serviceId,variables:CONFIG,replace:false,skipDeploys:true}}}]);
  await assert.rejects(invoke);assert.equal(writes.length,1);
});

test('real authorize requires and consumes a host-verified user-session capability',async()=>{
  const f=fixture();f.mutate(s=>{delete s.standaloneReviews[0].demoAuthNoExpiryStages[0].authorization;s.standaloneReviews[0].recoveryHistory=[];});
  await assert.rejects(f.controller.authorize(selector,{actor:'root-fixture',reference:'fixture-reference'}));
  let consumed=0;
  const verifier=async({reference,binding,consume})=>{assert.equal(reference,'fixture-reference');assert.equal(consume,true);consumed++;
    return{provenance:'user-session',grantId:'real-fixture-grant',consumptionNonce:'new-fixture-nonce',sourceRef:'user-session:fixture',binding};};
  const controller=createNoExpiryController({...f.deps,authorizationVerifier:verifier});
  await controller.authorize(selector,{actor:'root-fixture',reference:'fixture-reference'});assert.equal(consumed,1);
  assert.equal((await controller.prepare(selector,'worker-fixture')).request.activeDeploymentId,deployment);
  await assert.rejects(controller.authorize(selector,{actor:'root-fixture',reference:'fixture-reference'}));assert.equal(consumed,1);
});

test('real concurrent claims have one winner',async()=>{
  const f=fixture(),args={actor:'worker-fixture',runId:'77',fingerprint,fresh:f.inspect};
  const outcomes=await Promise.allSettled([f.controller.claim(selector,args),f.controller.claim(selector,args)]);
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
});

for (const status of ['staged','uncertain']) test(`finish ${status} without durable write-intent is rejected`,async()=>{
  const f=fixture(),claim=await f.controller.claim(selector,{actor:'worker-fixture',runId:'77',fingerprint,fresh:f.inspect});
  await assert.rejects(f.controller.finish(claim,status));
  assert.equal(f.record().execution.status,'claimed');
});

for(const field of ['owner','parent','release','history','other-stage']) test(`pre-stage ${field} drift fails`,async()=>{
  const f=fixture();f.mutate(s=>{const b=s.standaloneReviews[0];
    if(field==='owner')b.operatorCoordination.owner='foreign';if(field==='parent')b.parentSource.parent.mergeSha='0'.repeat(40);
    if(field==='release')b.release.mergeSha='0'.repeat(40);if(field==='history')b.recoveryHistory.push({action:'changed'});
    if(field==='other-stage')b.permanentDemoStages=[{execution:{status:'uncertain'}}];});
  let writes=0;await assert.rejects(stageNoExpiry({selector,actor:'worker-fixture',runId:'77',controller:f.controller,inspect:f.inspect,client:async()=>writes++}));assert.equal(writes,0);
});

test('failure after provider write stays uncertain and cannot replay',async()=>{
  const f=fixture();let writes=0;
  const run=()=>stageNoExpiry({selector,actor:'worker-fixture',runId:'77',controller:f.controller,inspect:f.inspect,
    client:async()=>{writes++;throw Error('synthetic private provider error');}});
  const result=await run();assert.equal(result.status,'mutation-uncertain-do-not-retry');assert.equal(writes,1);
  assert.equal(f.record().execution.status,'uncertain');assert.ok(!JSON.stringify(result).includes('synthetic private'));
  await assert.rejects(run);assert.equal(writes,1);
});

test('acknowledged provider write with CAS persistence failure stays uncertain and cannot replay',async()=>{
  const f=fixture();let writes=0;
  const run=()=>stageNoExpiry({selector,actor:'worker-fixture',runId:'77',controller:f.controller,inspect:f.inspect,
    client:async()=>{writes++;f.failSave();return{variableCollectionUpsert:true};}});
  const result=await run();assert.equal(result.status,'mutation-uncertain-do-not-retry');assert.equal(result.code,'NO_EXPIRY_ACK_RECORD_UNCERTAIN');
  assert.equal(f.record().execution.status,'write-intent');await assert.rejects(run);assert.equal(writes,1);
});

for (const field of ['activeDeploymentId','activeSourceSha']) test(`bound ${field} mismatch blocks mutation`,async()=>{
  const f=fixture();let writes=0;
  const inspect=async()=>({...await f.inspect(),[field]:field==='activeSourceSha'?'9'.repeat(40):'99999999-9999-4999-8999-999999999999'});
  await assert.rejects(stageNoExpiry({selector,actor:'worker-fixture',runId:'77',controller:f.controller,inspect,client:async()=>writes++}));
  assert.equal(writes,0);
});

test('final awaited maintainer drift prevents provider write',async()=>{
  const f=fixture();let armed=false,changed=false,writes=0;
  f.permission(s=>{if(armed&&!changed){changed=true;s.standaloneReviews[0].operatorCoordination.owner='foreign';}});
  const result=await stageNoExpiry({selector,actor:'worker-fixture',runId:'77',controller:f.controller,
    inspect:async()=>{if(f.record().execution?.status==='write-intent')armed=true;return f.inspect();},client:async()=>{writes++;return{variableCollectionUpsert:true};}});
  assert.equal(changed,true);assert.equal(writes,0);assert.equal(result.mutationAttempted,false);
});

for(const status of ['claimed','write-intent','uncertain',undefined])test(`existing finite renewal ${status} blocks new stage`,async()=>{
  const f=fixture(child=>{child.demoAuthExpiryRenewals=[{operationNonce:'99999999-9999-4999-8999-999999999999',...(status?{execution:{status}}:{})}];});
  let writes=0;await stageNoExpiry({selector,actor:'worker-fixture',runId:'77',controller:f.controller,inspect:f.inspect,client:async()=>writes++}).catch(()=>{});
  assert.equal(writes,0);
});

test('revoking author during final awaited main verification prevents mutation',async()=>{
  const f=fixture();let armed=false,revoked=false,writes=0;
  const github={...f.deps.github,authorizedMaintainer:async actor=>(await f.deps.github.authorizedMaintainer(actor))&&!(revoked&&actor==='root-fixture')};
  const controller=createNoExpiryController({...f.deps,github,assertCurrentMain:async value=>{await f.deps.assertCurrentMain(value);if(armed)revoked=true;}});
  const result=await stageNoExpiry({selector,actor:'worker-fixture',runId:'77',controller,
    inspect:async()=>{if(f.record().execution?.status==='write-intent')armed=true;return f.inspect();},client:async()=>{writes++;return{variableCollectionUpsert:true};}});
  assert.equal(revoked,true);assert.equal(writes,0);assert.equal(result.mutationAttempted,false);
});
