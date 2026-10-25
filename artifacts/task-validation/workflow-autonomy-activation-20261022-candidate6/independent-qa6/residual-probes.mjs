import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedExternalArgs} from './external-fixture.mjs';
import {fixture as releaseFixture} from './release-fixture.mjs';
import {externalReviewStep} from '../qa-source6/agent-team/src/bug-pipeline/external-review.mjs';
import {runPipeline} from '../qa-source6/agent-team/src/bug-pipeline/pipeline.mjs';
import {automationPaused} from '../qa-source6/agent-team/src/bug-pipeline/operator-ownership.mjs';
import {releaseBatch,selectAutoReleaseBatch} from '../qa-source6/agent-team/src/bug-pipeline/release.mjs';
const communication={mirrorFeedback:async()=>{},publishState:async()=>{}};
const step=f=>externalReviewStep({...f.args,communication});
const intent=(b,nonce)=>({status:'failed',nonce,subjectSha:b.sha,claudeRound:b.reviews.length,feedbackFingerprint:b.externalReview.feedbackFingerprint,reservedAt:'2026-10-23T00:00:00Z'});
test('ambiguous typed spend blocks across every archive/ledger/current pointer without inference or correction',async()=>{
 for(const origin of ['qaHistory','codexFinalReviewHistory','infrastructure','current'])for(const patch of [{nonce:null},{subjectSha:{}},{claudeRound:'1'},{feedbackFingerprint:[]},{reservedAt:null}]){
  const f=approvedExternalArgs(),entry={...intent(f.batch,'qa-ambiguous'),...patch};if(origin==='current')f.batch.codexFinalReview=entry;else if(origin==='infrastructure')f.batch.codexFinalQaInfrastructure={attempts:[entry]};else f.batch[origin]=[entry];f.args.workspace.execute=()=>assert.fail('no correction');await step(f);assert.equal(f.log.includes('qa'),false,origin);assert.equal(f.batch.codexFinalReview.failureCode,'final-qa-infrastructure-history-ambiguous');assert.equal(f.batch.implementation.length,1);
 }
});
test('two real intent nonces deduplicate across all histories and leave exactly one new inference slot',async()=>{
 const f=approvedExternalArgs(),a=intent(f.batch,'A'),b=intent(f.batch,'B');f.batch.codexFinalReview=structuredClone(a);f.batch.qaHistory=[structuredClone(a),structuredClone(b)];f.batch.codexFinalReviewHistory=[structuredClone(b),structuredClone(a)];f.batch.codexFinalQaInfrastructure={attempts:[structuredClone(a),structuredClone(b),structuredClone(a)]};const before=structuredClone(f.batch.qaHistory);let calls=0;f.args.workspace.finalQa=async()=>{calls++;throw new Error('synthetic infra')};await assert.rejects(step(f),/synthetic infra/);await step(f);assert.equal(calls,1);assert.equal(f.batch.codexFinalReview.failureCode,'final-qa-infrastructure-exhausted');assert.deepEqual(f.batch.qaHistory,before);assert.equal(f.batch.implementation.length,1);
});
test('pre-inference check polling consumes no slot and genuine other identities cannot block new allowed work',async()=>{
 const f=approvedExternalArgs();f.batch.qaHistory=[{...intent(f.batch,'other-sha'),subjectSha:'b'.repeat(40)},{...intent(f.batch,'other-round'),claudeRound:2}];const checks=f.args.gh.requiredChecks;let reads=0;f.args.gh.requiredChecks=async()=>({ok:++reads!==2});await step(f);assert.equal(f.log.includes('qa'),false);assert.equal(f.batch.codexFinalReview.status,'waiting-checks');assert.equal(f.batch.codexFinalQaInfrastructure,undefined);f.args.gh.requiredChecks=checks;await step(f);assert.equal(f.log.filter(x=>x==='qa').length,1);assert.equal(f.batch.phase,'ready');assert.equal(f.batch.codexFinalQaInfrastructure.attempts.length,1);
});
test('fresh bound handback progresses unclaimed intake; stale and malformed bindings reject or pause before effects',async()=>{
 const handback={active:true,nonce:'N2',automation:{enabled:true,mode:'new-unclaimed-only',takeoverNonce:'N2',authorizedActor:'maintainer',handedBackAt:'2026-10-23T00:00:00Z',protectedSubjects:[]}};
 for(const patch of [{},{nonce:'N3'},{active:false},{active:0},{nonce:[]},{active:true,automation:{...handback.automation,authorizedActor:[]}}]){
  const takeover={...structuredClone(handback),...patch};const state={schemaVersion:1,repository:'l2v-hub/ClinicOS',batches:[],operatorTakeover:takeover};let effects=0,error;try{await runPipeline({repo:state.repository,event:{},store:{load:async()=>structuredClone(state),observe:async()=>structuredClone(state)},gh:{intake:async()=>{effects++},discoverQueue:async()=>[]},workspace:{},models:{}})}catch(e){error=e}
  const legitimate=Object.keys(patch).length===0||patch.active===false;if(legitimate){assert.ifError(error);assert.equal(effects,1)}else assert.ok(error||effects===0);if(patch.nonce==='N3')assert.equal(automationPaused(state),true);
 }
});
test('both external review channel variants require current final proof but never invent proof.reviewedSha',async()=>{
 for(const channel of [undefined,'github-comments']){
  const f=releaseFixture();f.batch.externalReview={status:'published',subjectSha:f.batch.sha,feedbackFingerprint:f.batch.feedbackFingerprint,...(channel?{channel}:{})};const args={repo:f.state.repository,github:f.github,store:f.store,batchId:f.batch.id,reviewedSha:f.batch.sha,configured:{botToken:true,vercel:true,railway:true},execute:true};assert.equal(selectAutoReleaseBatch(f.state),null);await assert.rejects(releaseBatch(args),/final Codex proof/);assert.equal(f.calls.filter(([x])=>x==='merge').length,0);f.batch.codexFinalReview={status:'verified',subjectSha:f.batch.sha,claudeRound:f.batch.reviews.length,feedbackFingerprint:f.batch.feedbackFingerprint};assert.equal('reviewedSha' in f.batch.codexFinalReview,false);assert.equal(selectAutoReleaseBatch(f.state).id,f.batch.id);const out=await releaseBatch(args);assert.equal(out.status,'merged');assert.equal(f.calls.filter(([x])=>x==='merge').length,1);
 }
});
test('final proof changing during remote evidence reads is refused by native fresh release guard before merge',async()=>{
 const f=releaseFixture();f.batch.externalReview={status:'published',subjectSha:f.batch.sha,feedbackFingerprint:f.batch.feedbackFingerprint};f.batch.codexFinalReview={status:'verified',subjectSha:f.batch.sha,claudeRound:1,feedbackFingerprint:f.batch.feedbackFingerprint};const read=f.github.readFileAtRevision;let changed=false;f.github.readFileAtRevision=async(...a)=>{const result=await read(...a);if(!changed){changed=true;f.getSaved().batches[0].codexFinalReview.claudeRound=2}return result};await assert.rejects(releaseBatch({repo:f.state.repository,github:f.github,store:f.store,batchId:f.batch.id,reviewedSha:f.batch.sha,configured:{botToken:true,vercel:true,railway:true},execute:true}),/final Codex proof|identity changed/);assert.equal(changed,true);assert.equal(f.calls.filter(([x])=>x==='merge').length,0);
});
