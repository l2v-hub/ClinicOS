import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';
export const REPO='l2v-hub/ClinicOS';
export const TARGETS=[{id:'bug-batch-506',issue:506,pr:508,sha:'5737fc3ae01dc5b8b5b01124daeac1e805fc288f',round:3,next:4},{id:'bug-batch-507',issue:507,pr:509,sha:'fc42859d7c73f9c90d9d49d8cdafe2d752893de7',round:4,next:5}];
export const SOURCE_PROJECTION=[{"path":".github/workflows/codex-bug-pipeline.yml","gitBlobSha1":"8c788d7dbab5f83bd6e03bed5204cd134d8ce2fe","rawSha256":"9a041cf6f4ebfd505fd588983743213587840656c9ae6ca576582c8ab34ea27f","bytes":4162},{"path":"agent-team/src/bug-pipeline/cli.mjs","gitBlobSha1":"d239c6db29627683ae3999f5612a7280a17bb6ac","rawSha256":"0ff7954ade6fa9ec95c9043865b3ba08b780acc8bd415d15936c8e976495b72d","bytes":10593},{"path":"agent-team/src/bug-pipeline/comment-review-handoff.mjs","gitBlobSha1":"ea6cec8a0cace0dbb3876dce48e3efe8daf796be","rawSha256":"086ee18c81a07353d8dbc1d835b39e2338d4b7c1bed1a38e65ab6570dceea435","bytes":48980},{"path":"agent-team/src/bug-pipeline/failed-output-export.mjs","gitBlobSha1":"ef9ad03732c9102dc2e03b465fc78e1e00f32b2a","rawSha256":"e93056bae7fb1367b7fb6adb0e8a58bf847c1dd9c5e0a72258f4f24bf9b69f15","bytes":10973},{"path":"agent-team/src/bug-pipeline/operator-authorization.mjs","gitBlobSha1":"f40ca1a1b58e168e7c9bb9dbb76e582367a96fbf","rawSha256":"3eda3d4607725db16ee4749318f12a0ee907f3d6381df19f0f729e2aee9e316a","bytes":21316},{"path":"agent-team/src/bug-pipeline/workspace.mjs","gitBlobSha1":"248d04d93959696bbf3d4095d6828e33c70983cc","rawSha256":"42ab2d9fce6dadd30749acc15d11903343fdb6eccf7b474712ba46307a8499f3","bytes":35458},{"path":"agent-team/tests/bug-pipeline/failed-output-retention.test.mjs","gitBlobSha1":"0d57e2e4070f46e02a05b88e99de9f233bf7761c","rawSha256":"3c58dadf0fd5c143aa9390604e441c4190c506e9e056d80f007e303bc4e3b757","bytes":22686}];
const HEX=/^[a-f0-9]{40}$/;
export function validateBinding(b){assert.equal(b.schemaVersion,1);assert.equal(b.repository,REPO);assert.equal(b.sourcePr,515);assert.equal(b.sourceHead,'3a519e457d077647b2495f95285b3efdfffe7021');assert.equal(b.candidateCode,'0dbe3066b41ff1f5a8462de2a4c6604b89b56e5b');assert.equal(b.acceptedMainSha,'655f028e3b0bdcc621ac15209fd0af38cee3d26b');assert.match(b.acceptedMainSha,HEX);assert.match(b.nonce,/^[a-f0-9-]{36}$/);assert.equal(b.operatorBranch,'codex/clinical-unavailable-output-recovery-20261026');assert.equal(b.markerBranch,'codex/clinical-unavailable-output-control-20261026');assert.deepEqual(b.targets,TARGETS);assert.deepEqual(b.sourceProjection,SOURCE_PROJECTION);assert.deepEqual(b.authorizedImplementationLimits,{506:5,507:6});assert.equal(b.maximumNormalControllerPasses,2);assert.deepEqual(b.maximumNewImplementationAttempts,{506:2,507:2});assert.equal(b.unknownOriginalOutputRecovered,false);return b;}
export function validateMarker(marker,b,runId){assert.equal(marker.schemaVersion,1);assert.equal(marker.repository,REPO);assert.equal(marker.recoveryNonce,b.nonce);assert.equal(marker.workflowRunId,String(runId));assert.equal(marker.acceptedMainSha,b.acceptedMainSha);assert.equal(marker.status,'host-unavailable-output-archives-accepted');assert.equal(marker.singleUse,true);assert.match(marker.stateCommit,HEX);assert.deepEqual(marker.targets,TARGETS);assert.deepEqual(marker.implementationLimits,{506:5,507:6});assert.equal(marker.includesUnknownOriginalOutput,false);return marker;}
export function baselineClone(batch){const clone=structuredClone(batch);delete clone.controllerProgress;return clone;}
export function assertCanonicalTargets(s){for(const t of TARGETS){const x=s.batches.find(x=>x.id===t.id);assert(x,'Exact canonical target missing');assert.deepEqual(x.issues,[t.issue]);assert.equal(x.pr.number,t.pr);assert.equal(x.branch,'codex/'+t.id);assert.equal(x.sha,t.sha);assert.equal(x.baseSha,'715a4b9e47ff9bd0192b7f58f24271e48da4900d');assert.deepEqual(x.plan.issues,[t.issue]);assert.equal(x.implementation.at(-1).round,t.round);assert.equal(x.controllerProgress.round,t.round);assert.equal(x.controllerProgress.sourceSha,t.sha);if(x.controllerProgress.implementationRound!==undefined)assert.equal(x.controllerProgress.implementationRound,t.round);}return true;}
export function assertInventory(s,operatorOwns,claimedIssues,queue){assert.equal(s.repository,REPO);assertCanonicalTargets(s);assert(!s.pendingTriage,'Unexpected triage owner');const owners=['batches','manualBatches','standaloneReviews'].flatMap(c=>(s[c]??[]).filter(b=>!operatorOwns(s,c,b)).map(b=>c+':'+b.id)).sort();assert.deepEqual(owners,TARGETS.map(t=>'batches:'+t.id).sort());const claimed=claimedIssues(s);assert(queue.every(q=>claimed.has(typeof q==='number'?q:q.number)),'Unexpected unclaimed eligible queue subject');}
async function main(){
 const here=path.dirname(fileURLToPath(import.meta.url)), b=validateBinding(JSON.parse(await readFile(path.join(here,'binding.json'))));
 assert.equal(process.env.GITHUB_REPOSITORY,REPO);assert.equal(process.env.GITHUB_EVENT_NAME,'push');assert.equal(process.env.GITHUB_REF,'refs/heads/'+b.operatorBranch);assert.equal(process.env.GITHUB_RUN_ATTEMPT,'1','No replay of an unknown recovery workflow');
 const root=path.resolve(process.env.RECOVERY_SOURCE_ROOT), runtime=path.join(process.env.RUNNER_TEMP,'.clinicos-bug-sessions');assert.equal(root,path.resolve(process.env.GITHUB_WORKSPACE,'source'));
 const git=(a,cwd=root)=>execFileSync('git',a,{cwd,encoding:'utf8',maxBuffer:2*1024*1024}).trim();
 assert.equal(git(['rev-parse','HEAD']),b.acceptedMainSha);
 for(const x of b.sourceProjection)assert.equal(git(['rev-parse',b.acceptedMainSha+':'+x.path]),x.gitBlobSha1);
 const mode=process.argv[2];assert(['started','wait','bootstrap','execute'].includes(mode));
 if(mode==='started'){assert(!process.env.CODEX_API_KEY);console.log(JSON.stringify({kind:'clinical-recovery-runner-started',runId:process.env.GITHUB_RUN_ID,recoveryNonce:b.nonce,acceptedMainSha:b.acceptedMainSha,concurrencyGroup:'codex-bug-pipeline-'+REPO,modelCalls:0}));return;}
 const load=p=>import(pathToFileURL(path.join(root,p)).href);
 const {createRunner}=await load('agent-team/src/bug-pipeline/process.mjs');
 await mkdir(runtime,{recursive:true,mode:0o700});
 const run=createRunner({env:process.env,runtimeRoot:runtime});
 const api=async(ep,{allow404=false}={})=>{const r=await run({command:'gh',args:['api',ep],cwd:root,envMode:'controller',timeoutMs:30000,maxOutputBytes:16*1024*1024});if(!r.ok){if(allow404&&/HTTP 404/.test(r.stderr))return null;throw new Error('recovery-github-read-failed');}return JSON.parse(r.stdout);};
 const freshSource=async()=>{assert.equal((await api('repos/'+REPO+'/git/ref/heads/main')).object.sha,b.acceptedMainSha);const pr=await api('repos/'+REPO+'/pulls/515');assert.equal(pr.merged,true);assert.equal(pr.head.sha,b.sourceHead);assert.equal(pr.merge_commit_sha,b.acceptedMainSha);};
 await freshSource();
 const markerPath=path.join(process.env.RUNNER_TEMP,'clinical-unavailable-output-host-marker.json');
 const {createGitHub}=await load('agent-team/src/bug-pipeline/github.mjs');
 const {validateState}=await load('agent-team/src/bug-pipeline/contracts.mjs');
 const {validateOperatorContinuations,attemptLimit,historyDigest,spentAttempts}=await load('agent-team/src/bug-pipeline/attempt-budget.mjs');
 const {validateStandaloneState}=await load('agent-team/src/bug-pipeline/standalone-review.mjs');
 const {operatorOwns,claimedIssues,automationPaused}=await load('agent-team/src/bug-pipeline/operator-ownership.mjs');
 const gh=createGitHub({repo:REPO,cwd:root,run});
 const state=async()=>{const s=validateState(await gh.createStateStore().load(),REPO);validateOperatorContinuations(s);validateStandaloneState(s);assert(!automationPaused(s));assertInventory(s,operatorOwns,claimedIssues,await gh.discoverQueue({excludeIssues:[...claimedIssues(s)]}));return s;};
 if(mode==='wait'){
  assert(!process.env.CODEX_API_KEY);await state(); // Fail immediately on unexpected eligibility.
  for(let n=0;n<120;n++){
   const data=await api('repos/'+REPO+'/contents/.codex/clinical-unavailable-output-marker.json?ref='+encodeURIComponent(b.markerBranch),{allow404:true});
   if(data){assert.equal(data.type,'file');assert.equal(data.encoding,'base64');assert(data.size<65536);const marker=validateMarker(JSON.parse(Buffer.from(data.content,'base64')),b,process.env.GITHUB_RUN_ID);await writeFile(markerPath,JSON.stringify(marker)+'\n',{flag:'wx'});console.log(JSON.stringify({status:'host-marker-validated',runId:process.env.GITHUB_RUN_ID,nonce:b.nonce,modelCalls:0}));return;}
   await new Promise(r=>setTimeout(r,15000));
  }throw new Error('recovery-host-marker-deadline');
 }
 const marker=validateMarker(JSON.parse(await readFile(markerPath)),b,process.env.GITHUB_RUN_ID);
 let s=await state();
 const validateTarget=(s,t,phase)=>{const batch=s.batches.find(x=>x.id===t.id);assert.deepEqual(batch.issues,[t.issue]);assert.equal(batch.pr.number,t.pr);assert.equal(batch.sha,t.sha);assert.equal(batch.phase,phase);assert.equal(spentAttempts(batch,'implementation'),t.round);assert.equal(attemptLimit(batch,'implementation'),t.issue===506?5:6);assert.equal(batch.implementation.at(-1).status,'failed');assert.equal(batch.reviews.length,1);assert.equal(batch.reviews[0].status,'changes-requested');assert.equal(batch.controllerProgress.status,'failed');assert.equal(batch.controllerProgress.failureCode,'workspace-verification-failed');assert.equal(batch.controllerProgress.checkpoint,undefined);const archived=batch.recoveryHistory.findLast(h=>h.action==='archive-unavailable-failed-output');assert(archived);assert.equal(archived.previous.round,t.round);assert.equal(archived.previous.status,'failed');assert.equal(archived.previous.failedStep,'verify-before');assert(archived.previous.checkpoint);assert.equal(archived.authorization.provenance,'user-session');const extension=batch.budgetExtensions.at(-1);assert.equal(extension.previousLimit,t.issue===506?4:5);assert.equal(extension.limit,t.issue===506?5:6);assert.equal(extension.kind,'implementation');assert.equal(extension.authorization.provenance,'user-session');return batch;};
 if(mode==='bootstrap'){
  assert(!process.env.CODEX_API_KEY,'No inference credential during restoration');
  const {createCommentReviewHandoff}=await load('agent-team/src/bug-pipeline/comment-review-handoff.mjs');const c=createCommentReviewHandoff({github:gh,run,cwd:root});
  const actor=await c.actor();assert(await gh.authorizedMaintainer(actor));
  for(const t of TARGETS){s=await state();validateTarget(s,t,'blocked');await c.recover(t.pr,{action:'resume',expectedSha:t.sha,token:historyDigest({phase:'blocked',failureCode:'workspace-verification-failed'}),reason:'Actual current host archived the unavailable FAILED verification checkpoint with complete history and unchanged counters; existing genuine implementation allowance has free slots. Restore only a new clean published baseline, never lost original output.'});}
  s=await state();const {createWorkspace}=await load('agent-team/src/bug-pipeline/workspace.mjs');const workspace=createWorkspace({root,repo:REPO,run,models:{}});
  for(const t of TARGETS){const batch=validateTarget(s,t,'waiting-review');const original=historyDigest(batch);const clone=baselineClone(batch);const expected=structuredClone(batch);delete expected.controllerProgress;assert.deepEqual(clone,expected);await workspace.prepare(clone);assert.equal(historyDigest(batch),original);const cwd=path.join(root,'agent-team','.worktrees',t.id);assert.equal(git(['rev-parse','HEAD'],cwd),t.sha);assert.equal(git(['status','--porcelain','--untracked-files=all'],cwd),'');await workspace.captureCheckpoint(clone);console.log(JSON.stringify({status:'clean-published-baseline-restored',id:t.id,head:t.sha,originalUnknownOutputRecovered:false,newAttemptRequired:true,modelCalls:0}));}
  await writeFile(path.join(process.env.RUNNER_TEMP,'clinical-unavailable-output-bootstrap.json'),JSON.stringify({nonce:b.nonce,runId:process.env.GITHUB_RUN_ID,stateCommit:marker.stateCommit,targets:TARGETS})+'\n',{flag:'wx'});return;
 }
 assert.equal(mode,'execute');const bootstrap=JSON.parse(await readFile(path.join(process.env.RUNNER_TEMP,'clinical-unavailable-output-bootstrap.json')));assert.equal(bootstrap.nonce,b.nonce);assert.equal(bootstrap.runId,process.env.GITHUB_RUN_ID);assert.deepEqual(bootstrap.targets,TARGETS);
 for(const t of TARGETS)validateTarget(s,t,'waiting-review');assert(process.env.CODEX_API_KEY);assert.equal(process.env.BUG_PIPELINE_REVIEW_MODE,'external');assert(!process.env.ANTHROPIC_API_KEY&&!process.env.CLAUDE_CODE_OAUTH_TOKEN);
 const {main:cli}=await load('agent-team/src/bug-pipeline/cli.mjs');
 const {knownFailedCorrection}=await load('agent-team/src/bug-pipeline/workspace.mjs');
 const {createWorkspace}=await load('agent-team/src/bug-pipeline/workspace.mjs');
 const {createCommentReviewHandoff}=await load('agent-team/src/bug-pipeline/comment-review-handoff.mjs');
 const {runSameRunnerPasses}=await import('./same-runner-retry.mjs');
 const checkpointWorkspace=createWorkspace({root,repo:REPO,run,models:{}}),handoff=createCommentReviewHandoff({github:gh,run,cwd:root});
 const executionInventory=async image=>{
  validateState(image,REPO);validateOperatorContinuations(image);validateStandaloneState(image);assert(!automationPaused(image));assert(!image.pendingTriage);
  const owners=['batches','manualBatches','standaloneReviews'].flatMap(c=>(image[c]??[]).filter(x=>!operatorOwns(image,c,x)).map(x=>c+':'+x.id)).sort();assert.deepEqual(owners,TARGETS.map(t=>'batches:'+t.id).sort());
  const claimed=claimedIssues(image),queue=await gh.discoverQueue({excludeIssues:[...claimed]});assert(queue.every(q=>claimed.has(typeof q==='number'?q:q.number)));
  await freshSource();
  for(const t of TARGETS){const x=image.batches.find(x=>x.id===t.id);assert(x);assert.deepEqual(x.issues,[t.issue]);assert.equal(x.pr.number,t.pr);assert.equal(x.branch,'codex/'+t.id);assert.equal(x.baseSha,'715a4b9e47ff9bd0192b7f58f24271e48da4900d');assert.deepEqual(x.plan.issues,[t.issue]);assert.equal(attemptLimit(x,'implementation'),t.issue===506?5:6);
   const pr=await api('repos/'+REPO+'/pulls/'+t.pr);assert.equal(pr.state,'open');assert.equal(pr.head.sha,x.sha);assert.equal(pr.head.ref,x.branch);assert.equal(pr.head.repo.full_name,REPO);assert.equal(pr.head.repo.fork,false);assert.equal(pr.base.ref,'main');}
 };
 const outcome=await runSameRunnerPasses({targets:TARGETS,observe:()=>gh.createStateStore().load(),assertExclusiveOwnership:executionInventory,
  captureCheckpoint:batch=>checkpointWorkspace.captureCheckpoint(batch),knownFailedCorrection,attemptLimit,spentAttempts,historyDigest,
  recover:(pr,options)=>handoff.recover(pr,options),runPass:async({pass})=>{console.log(JSON.stringify({status:'ordinary-native-controller-pass-started',pass,maximumPasses:2}));const exitCode=await cli({env:process.env,args:[]});assert.equal(exitCode,0,'Native CLI nonzero outcome: no automatic replay');}});
 console.log(JSON.stringify({status:'bounded-same-runner-controller-complete',...outcome}));process.exitCode=0;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(JSON.stringify({status:'recovery-runner-stopped',code:error.code==='ERR_ASSERTION'?'binding-or-state-mismatch':'native-operation-failed',modelOutcome:'Read canonical attempt journals; no automatic replay.'}));process.exitCode=1;});
