import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,sha,mergeSha} from '../independent-qa-cycle-2/publication-race-fixture.mjs';
import {createGitHub} from '../../../../agent-team/src/bug-pipeline/github.mjs';
import {releaseBatch,recordDeployment,publishDeploymentCompletion,publicationComplete} from '../../../../agent-team/src/bug-pipeline/release.mjs';
import {sha256} from '../../../../agent-team/src/bug-pipeline/contracts.mjs';
const repo='l2v-hub/ClinicOS', railwayRunUrl=`https://github.com/${repo}/actions/runs/123`;
const proof={receipt:{mergeSha},reviewedSha:sha,runUrl:railwayRunUrl,artifactDigest:`sha256:${'7'.repeat(64)}`,receiptSha256:'8'.repeat(64)};
const mutations={
 pr:b=>b.pr={number:10,url:`https://github.com/${repo}/pull/10`},
 issues:b=>{b.issues.push(6);b.plan.issues.push(6);b.plan.acceptance.push({issue:6,criteria:['Added after verification']});b.plan.evidence.push({issue:6,screenshot:'artifacts/task-validation/bug-batch-5/evidence/issue-6.png',trace:'artifacts/task-validation/bug-batch-5/evidence/issue-6.zip',video:''});},
 scope:b=>b.plan.scope.push('backend/src/another.ts'),
 plan:b=>b.plan.tasks[0].steps.push('Unreviewed further change'),
 grouping:b=>b.grouping={fileMap:[{issue:5,files:[...b.plan.scope]}],separationReason:'Concurrent regrouping'},
 evidence:b=>{b.evidence=structuredClone(b.evidence);b.evidence[0].files.trace.sha256='9'.repeat(64);},
 alternateValidApproval:b=>{const report=JSON.stringify({subject_sha:sha,verdict:'approved',summary:'Different but structurally valid approval',findings:[]});b.reviewReports['claude-review-1.json']=report;b.reviewLedger.rounds[0].review_sha256=sha256(report);},
 ledger:b=>b.implementation[0].details='Different verification facts',
 release:b=>b.release={...b.release,prNumber:10},
 hold:b=>b.releaseHold='',
};
for(const window of ['checks','final-preflight','record','publication'])for(const [name,mutate] of Object.entries(mutations))test(`independent ${window} binds ${name} at actual transport`,async()=>{
 const f=fixture(['backend/src/example.ts']);let requests=[],injected=false,checks=0,preflight=0;
 const real=createGitHub({repo,cwd:'/tmp',run:async({args,input})=>{requests.push({args,body:input?JSON.parse(input):null});return {ok:true,code:0,stdout:JSON.stringify(args[0]==='api'&&args[1]===`repos/${repo}/pulls/9`?{state:'closed',merged:true,merge_commit_sha:mergeSha,html_url:f.feedback.url}:{}),stderr:''};}});
 Object.assign(f.github,{mergePullRequest:real.mergePullRequest,draftReady:real.draftReady,commentIssue:real.commentIssue,setIssueStatus:real.setIssueStatus});
 const inject=()=>{injected=true;mutate(f.getSaved().batches[0]);};
 f.github.requiredChecks=async()=>{if(++checks===2&&window==='checks')inject();return {ok:true,details:['required: SUCCESS']};};
 f.github.verifyDemoPreflight=async()=>{if(++preflight===2&&window==='final-preflight')inject();};
 f.github.verifyDemoRelease=async()=>{if(window==='record')inject();return structuredClone(proof);};
 if(['record','publication'].includes(window))f.batch.release={status:'merged',reviewedSha:sha,mergeSha,prNumber:9};
 if(window==='publication'){
  f.batch.release={...f.batch.release,status:'deployed',deployment:{status:'deployed',reviewedSha:sha,mergeSha,railwayRunUrl,demo:structuredClone(proof)}};
  f.github.viewIssue=async number=>{inject();return {number,state:'open',comments:[]};};
 }
 const input={repo,github:f.github,store:f.store,batchId:f.batch.id};
 await assert.rejects(()=>window==='record'?recordDeployment({...input,mergeSha,railwayRunUrl}):window==='publication'?publishDeploymentCompletion({...input,batch:f.batch}):releaseBatch({...input,reviewedSha:sha,execute:true,configured:{botToken:true,railway:true}}));
 assert.equal(injected,true);assert.equal(requests.some(r=>(r.args[0]==='pr'&&r.args[1]==='merge')||r.args.includes('PATCH')),false);
 assert.equal(f.calls.filter(c=>c[0]==='save').length,0);assert.equal(f.getSaved().batches[0].implementation.length,1);assert.equal(f.getSaved().batches[0].reviews.length,1);
});
function actualStore(seed,{conflictAtPut=false}={}){
 let durable=structuredClone(seed),revision='version-1',requests=[],conflictInjected=false;
 const github=createGitHub({repo,cwd:'/tmp',run:async({args,input})=>{
  const route=args[1],method=args.includes('-X')?args[args.indexOf('-X')+1]:'GET';
  if(route.includes('/git/ref/'))return {ok:true,code:0,stdout:JSON.stringify({object:{sha}}),stderr:''};
  if(route.includes('/contents/.codex-bug-state.json')){
   if(method==='GET')return {ok:true,code:0,stdout:JSON.stringify({type:'file',sha:revision,content:Buffer.from(JSON.stringify(durable)).toString('base64')}),stderr:''};
   const body=JSON.parse(input);requests.push({method,cas:body.sha});
   if(conflictAtPut&&!conflictInjected){durable.extraRoot={mustSurvive:'root'};durable.manualBatches={manual:{status:'current'}};revision='version-2';conflictInjected=true;}
   if(body.sha!==revision)return {ok:false,code:1,stdout:'',stderr:'HTTP409 conflict'};
   durable=JSON.parse(Buffer.from(body.content,'base64'));revision='version-3';return {ok:true,code:0,stdout:JSON.stringify({content:{sha:revision}}),stderr:''};
  }
  throw Error('Unexpected synthetic transport route');
 }});
 return {github,store:github.createStateStore(),requests,state:()=>durable,change:()=>{durable.extraRoot={mustSurvive:'root'};durable.manualBatches={manual:{status:'current'}};revision='version-2';}};
}
for(const kind of ['guard-refresh','put-conflict'])test(`actual Contents CAS never overwrites competing root/manual update ${kind}`,async()=>{
 const f=fixture(['backend/src/example.ts']),s=actualStore(f.state,{conflictAtPut:kind==='put-conflict'}),old=await s.store.load();old.batches[0].phase='blocked';
 if(kind==='guard-refresh')s.change();
 await assert.rejects(()=>s.store.save(old,{guard:async()=>{await s.store.load();return true;}}),/compare-and-swap/);
 assert.equal(s.state().extraRoot.mustSurvive,'root');assert.equal(s.state().manualBatches.manual.status,'current');assert.equal(s.state().batches[0].phase,'ready');
 await assert.rejects(()=>s.store.save(old),/compare-and-swap/);assert.equal(s.requests.at(-1).cas,'version-1');
});
test('record transition uses actual Contents CAS and retains concurrent updates on failure',async()=>{
 const f=fixture(['backend/src/example.ts']);f.batch.release={status:'merged',reviewedSha:sha,mergeSha,prNumber:9};
 const s=actualStore(f.state,{conflictAtPut:true});f.github.verifyDemoRelease=async()=>structuredClone(proof);
 await assert.rejects(()=>recordDeployment({repo,github:f.github,store:s.store,batchId:f.batch.id,mergeSha,railwayRunUrl}),/compare-and-swap/);
 assert.equal(s.state().extraRoot.mustSurvive,'root');assert.equal(s.state().manualBatches.manual.status,'current');assert.equal(s.state().batches[0].release.status,'merged');assert.equal(f.calls.some(c=>c[0]==='status'||c[0]==='comment'),false);
});
test('record through real store succeeds and published retry makes no issue writes or model rounds',async()=>{
 const f=fixture(['backend/src/example.ts']);f.batch.release={status:'merged',reviewedSha:sha,mergeSha,prNumber:9};
 const s=actualStore(f.state);f.github.verifyDemoRelease=async()=>structuredClone(proof);
 await recordDeployment({repo,github:f.github,store:s.store,batchId:f.batch.id,mergeSha,railwayRunUrl});
 assert.equal(publicationComplete(s.state().batches[0]),true);const writes=f.calls.filter(c=>c[0]==='status'||c[0]==='comment').length;
 await recordDeployment({repo,github:f.github,store:s.store,batchId:f.batch.id,mergeSha,railwayRunUrl});
 assert.equal(f.calls.filter(c=>c[0]==='status'||c[0]==='comment').length,writes);assert.equal(s.state().batches[0].implementation.length,1);assert.equal(s.state().batches[0].reviews.length,1);
});
