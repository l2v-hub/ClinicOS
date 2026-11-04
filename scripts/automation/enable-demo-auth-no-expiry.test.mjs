import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEMO_TARGET } from '../../agent-team/src/bug-pipeline/demo-deployment.mjs';
import { CONFIG, MUTATION, stageNoExpiry } from './demo-no-expiry-controller.mjs';
import { inspectNoExpiryTarget } from './enable-demo-auth-no-expiry.mjs';

const selector={subjectId:'standalone-pr-525',operationNonce:'11111111-1111-4111-8111-111111111111',reviewedSha:'a'.repeat(40)};
const boundRequest={...selector,activeDeploymentId:'22222222-2222-4222-8222-222222222222',activeSourceSha:'b'.repeat(40),
  failedDeploymentId:'f04e215c-2105-45ca-9b9f-766eabbff925',failedSourceSha:'d2a08b4850dd954bb790e35f2ed350d5eeacd1c4'};
const snapshot={activeDeploymentId:boundRequest.activeDeploymentId,activeSourceSha:boundRequest.activeSourceSha,
  failedDeploymentId:boundRequest.failedDeploymentId,failedSourceSha:boundRequest.failedSourceSha,
  prerequisitesVerified:true,fingerprint:'c'.repeat(64)};
function fixture({ownedFailure=false, replay=false}={}) {
  const calls=[]; let claimCount=0;
  const controller={
    prepare:async()=>({request:boundRequest,authorizationDigest:'d'.repeat(64)}),
    claim:async(_selector,args)=>{claimCount++;if(replay&&claimCount>1)throw Error('replay');return{...args,selector,nonce:'33333333-3333-4333-8333-333333333333',actor:'l2v-hub',runId:'77'};},
    assertOwned:async(_claim,phase)=>{calls.push(['owned',phase]);if(ownedFailure&&phase==='write-intent')throw Error('lost-CAS');},
    intent:async()=>calls.push(['intent']),finish:async(_claim,state)=>calls.push(['finish',state]),
  };
  const inspect=async()=>structuredClone(snapshot);
  const client=async(query,vars)=>{calls.push(['provider',query,vars]);return{variableCollectionUpsert:true};};
  return{controller,inspect,client,calls,get claimCount(){return claimCount;}};
}
test('stage upserts only two fixed demo variables atomically, with replace/deploy disabled',async()=>{
  const f=fixture(); const result=await stageNoExpiry({selector,actor:'l2v-hub',runId:'77',...f});
  const write=f.calls.find(x=>x[0]==='provider'); assert.equal(write[1],MUTATION);
  assert.deepEqual(write[2].input,{projectId:DEMO_TARGET.projectId,environmentId:DEMO_TARGET.environmentId,
    serviceId:DEMO_TARGET.serviceId,variables:CONFIG,replace:false,skipDeploys:true});
  assert.equal(result.status,'staged-awaiting-explicit-deployment'); assert.equal(result.mutationAttempted,true);
  assert.equal(result.deploymentTriggered,false); assert.equal(f.calls.filter(x=>x[0]==='provider').length,1);
});
test('target/config preflight failure blocks before claim or provider mutation',async()=>{
  for(const failure of ['wrong-target','bad-config','missing-secret']){
    const f=fixture(); let claims=0, writes=0;
    f.controller.claim=async()=>{claims++;throw Error('must not claim');};
    f.inspect=async()=>{if(failure==='wrong-target'||failure==='bad-config'||failure==='missing-secret')throw Error('preflight');return snapshot;};
    f.client=async()=>{writes++;return{variableCollectionUpsert:true};};
    await assert.rejects(stageNoExpiry({selector,actor:'l2v-hub',runId:'77',...f}));
    assert.equal(claims,0); assert.equal(writes,0);
  }
});
test('canonical action replay denial blocks before provider mutation',async()=>{
  const f=fixture({replay:true}); const first=await stageNoExpiry({selector,actor:'l2v-hub',runId:'77',...f});
  assert.equal(first.status,'staged-awaiting-explicit-deployment');
  // A real controller rejects a second prepare/claim from persisted execution; model that gate.
  f.controller.prepare=async()=>{if(f.claimCount)throw Error('already consumed');return{request:boundRequest,authorizationDigest:'d'.repeat(64)};};
  let writes=0; f.client=async()=>{writes++;return{variableCollectionUpsert:true};};
  await assert.rejects(stageNoExpiry({selector,actor:'l2v-hub',runId:'77',...f})); assert.equal(writes,0);
});
test('lost final ownership/CAS fence prevents mutation',async()=>{
  const f=fixture({ownedFailure:true}); const result=await stageNoExpiry({selector,actor:'l2v-hub',runId:'77',...f});
  assert.equal(result.status,'blocked-before-write'); assert.equal(result.mutationAttempted,false);
  assert.equal(f.calls.filter(x=>x[0]==='provider').length,0);
});
test('workflow is manually dispatched, pinned, serial, correct-target and tests before credentials',async()=>{
  const yaml=await readFile(new URL('../../.github/workflows/enable-demo-auth-no-expiry.yml',import.meta.url),'utf8');
  assert.match(yaml,/workflow_dispatch:/); assert.match(yaml,/group: railway-demo/);
  assert.match(yaml,/glistening-friendship \/ demo/); assert.match(yaml,/secrets\.RAILWAY_DEMO_TOKEN/);
  assert.doesNotMatch(yaml,/secrets\.RAILWAY_TOKEN|workflow_call|pull_request_target/);
  assert.ok(yaml.indexOf('Test guards without credentials')<yaml.indexOf('secrets.RAILWAY_DEMO_TOKEN'));
  assert.doesNotMatch(yaml,/railway up|db:migrate|deploy-demo-exact/);
  for(const line of yaml.split('\n').filter(x=>/uses:/.test(x)))assert.match(line,/@[a-f0-9]{40}\s*$/);
});
test('secret-bearing variable map is erased when either bounded public read fails',async()=>{
  for(const failedPath of ['/ready','/auth/status']){
    const variables={CLINICOS_ENV:'demo',NODE_ENV:'production',AUTH_MODE:'demo',DEMO_DATASET_ID:'synthetic-v1',
      ALLOW_PRODUCTION_DEMO_AUTH:'true',ROLE_SIMULATOR_ENABLED:'true',ROLE_SIMULATOR_ALLOW_PRODUCTION:'true',ROLE_SIMULATOR_SECRET:'S'.repeat(48)};
    const data={projectToken:{project:{id:DEMO_TARGET.projectId},environment:{id:DEMO_TARGET.environmentId,name:'demo'}},
      deploymentTriggers:{pageInfo:{hasNextPage:false},edges:[]},deployments:{pageInfo:{hasNextPage:false},edges:[]},
      serviceInstance:{serviceId:DEMO_TARGET.serviceId,environmentId:DEMO_TARGET.environmentId,source:{repo:'l2v-hub/ClinicOS'},
        domains:{serviceDomains:[{domain:DEMO_TARGET.domain}],customDomains:[]},
        activeDeployments:[{id:boundRequest.activeDeploymentId,status:'SUCCESS',meta:{commitHash:boundRequest.activeSourceSha}}],
        latestDeployment:{id:boundRequest.failedDeploymentId,status:'FAILED'}}};
    const client=async query=>query.includes('variables(')?{variables}:query.startsWith('query($projectId')?data:query.startsWith('query($id')?
      {deployment:{id:boundRequest.failedDeploymentId,status:'FAILED',projectId:DEMO_TARGET.projectId,
        environmentId:DEMO_TARGET.environmentId,serviceId:DEMO_TARGET.serviceId,meta:{commitHash:boundRequest.failedSourceSha}}}:{};
    await assert.rejects(inspectNoExpiryTarget({client,assertFreshMain:async()=>{},readPublic:async path=>{
      if(path===failedPath)throw Error('private transport detail');
      return path==='/ready'?{status:'ready',tier:'demo',deploymentId:boundRequest.activeDeploymentId,checks:{database:'ok',policy:'ok'}}:
        {mode:'disabled',simulator:false,syntheticOnly:true};
    }}));
    assert.deepEqual(Object.keys(variables),[],'all fetched resolved values, including secret, must be deleted on errors');
  }
});

test('CI and the protected pre-credential step execute every no-expiry guard suite',async()=>{
  const names=['demo-no-expiry-controller.test.mjs','enable-demo-auth-no-expiry.test.mjs',
    'demo-no-expiry.integration.test.mjs','demo-no-expiry.metadata.integration.test.mjs'];
  for(const name of ['bug-pipeline-tests.yml','enable-demo-auth-no-expiry.yml']){
    const workflow=await readFile(new URL('../../.github/workflows/'+name,import.meta.url),'utf8');
    const command=workflow.split(/\r?\n/).find(line=>line.includes('run: node --test')&&line.includes(names[0]));
    assert.ok(command,`${name}: missing no-expiry test command`);
    for(const suite of names)assert.ok(command.includes('scripts/automation/'+suite),`${name}: missing ${suite}`);
    assert.doesNotMatch(command,/\.skip|continue-on-error|\|\|\s*true/);
    if(name==='enable-demo-auth-no-expiry.yml')
      assert.ok(workflow.indexOf(command)<workflow.indexOf('secrets.RAILWAY_DEMO_TOKEN'));
  }
});
