import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fixture} from './handoff-fixture.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
test('supported typed QA-reservation recovery is distinct from ordinary resume after approved-Claude infrastructure failure',async()=>{
 const f=fixture();f.setPermission('maintain');const b=f.remote.batches[0];b.reviews=[{round:1,status:'approved',subjectSha:b.sha}];b.phase='blocked';b.failureCode='controller-invariant';b.externalReview={status:'published',subjectSha:b.sha};b.codexFinalReview={status:'failed',subjectSha:b.sha,claudeRound:1,feedbackFingerprint:'synthetic-current-feedback',nonce:'qa-failed-nonce',reservedAt:'2026-10-17T00:00:00.000Z'};const prior=structuredClone(b.codexFinalReview);
 let resumeError;try{await f.handoff.recover(81,{action:'resume',expectedSha:b.sha,token:hash({phase:b.phase,failureCode:b.failureCode}),reason:'Synthetic infrastructure recovery'})}catch(e){resumeError=e}
 assert.match(resumeError?.message??'',/Resume requires transient recovery/);const out=await f.handoff.recover(81,{action:'release-qa-reservation',expectedSha:b.sha,token:prior.nonce,reason:'Synthetic typed QA recovery',authorizationRef:'test:trusted-host'});assert.equal(out.phase,'waiting-review');assert.deepEqual(out.qaHistory.at(-1),prior);assert.equal(out.codexFinalReview,undefined);assert.equal(out.recoveryHistory.at(-1).authorization.provenance,'user-session');
 await writeFile(new URL('recovery-route-observations.json',import.meta.url),JSON.stringify({ordinaryResumeError:resumeError.message,typedQaRecoveryPhase:out.phase,failedRecordRetainedInQaHistory:true,hostVerifierRequired:true,defaultStandaloneCliVerifierClaimed:false,modelsExecuted:0},null,2)+'\n');
});
