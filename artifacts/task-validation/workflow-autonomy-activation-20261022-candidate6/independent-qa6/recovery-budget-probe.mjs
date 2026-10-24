import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {fixture} from './handoff-fixture.mjs';
import {externalReviewStep} from '../qa-source6/agent-team/src/bug-pipeline/external-review.mjs';
import {feedbackFingerprint,sha256} from '../qa-source6/agent-team/src/bug-pipeline/contracts.mjs';
test('typed recovery must count a retained legacy failed inference toward the three-session final-QA allowance',async()=>{
 const f=fixture();f.setPermission('maintain');const b=f.remote.batches[0];const fp=feedbackFingerprint(await f.github.reviewFeedback(81));const report=JSON.stringify({subject_sha:b.sha,verdict:'approved',summary:'Synthetic valid approved review',findings:[]});b.reviews=[{round:1,status:'approved',subjectSha:b.sha}];b.reviewLedger={rounds:[{round:1,verdict:'approved',subject_sha:b.sha,review_sha256:sha256(report)}]};b.reviewReports={'claude-review-1.json':report};b.phase='blocked';b.failureCode='controller-invariant';b.externalReview={status:'published',subjectSha:b.sha,feedbackFingerprint:fp};b.codexFinalReview={status:'failed',subjectSha:b.sha,claudeRound:1,feedbackFingerprint:fp,nonce:'legacy-spent-session',reservedAt:'2026-10-17T00:00:00.000Z'};
 const recover=async()=>{const c=f.remote.batches[0];return f.handoff.recover(81,{action:'release-qa-reservation',expectedSha:c.sha,token:c.codexFinalReview.nonce,reason:'Synthetic authorized QA recovery',authorizationRef:'test:trusted-host'})};await recover();let invocations=0;const errors=[];
 for(let i=0;i<3;i++){
  const current=structuredClone(f.remote.batches[0]);try{await externalReviewStep({repo:'l2v-hub/ClinicOS',batch:current,gh:f.github,communication:{mirrorFeedback:async()=>{},publishState:async()=>{}},workspace:{prepare:async()=>{},finalQa:async()=>{invocations++;throw new Error('Synthetic final QA infrastructure failure')}},save:async()=>{const store=f.github.createStateStore();const state=await store.load();state.batches[0]=structuredClone(current);await store.save(state)},block:async(_,reason)=>{throw new Error('Budget blocked: '+reason)},report:async()=>{}})}catch(e){errors.push(e.message)}
  if(i<2&&f.remote.batches[0].codexFinalReview?.status==='failed')await recover();
 }
 const final=f.remote.batches[0];await writeFile(new URL('recovery-budget-observations.json',import.meta.url),JSON.stringify({legacyFailedSessionsRetained:final.qaHistory.filter(x=>x.nonce==='legacy-spent-session').length,newQaCallbackInvocations:invocations,totalIncludingRetainedLegacy:1+invocations,newInfrastructureLedger:final.codexFinalQaInfrastructure?.attempts.map(x=>({status:x.status,nonce:x.nonce})),qaHistoryCount:final.qaHistory.length,implementationAttempts:final.implementation.length,errors,actualProvidersOrModels:0},null,2)+'\n');assert.equal(invocations,2,'One actual retained legacy failure leaves at most two new final-QA sessions in a total allowance of three');
});
