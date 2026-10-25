import test from 'node:test';
import assert from 'node:assert/strict';
import {communicationFixture} from './communication-fixture.mjs';
import {externalReviewStep} from '../qa-source4/agent-team/src/bug-pipeline/external-review.mjs';
import {syncIssueReviews} from '../qa-source4/agent-team/src/bug-pipeline/issue-review-sync.mjs';
const owned=e=>e.code==='review-operator-owned';
for(const method of ['publishState','mirrorFeedback']) test(`prebuilt ${method}: protected current subject stops before transport, explicit current-SHA call remains authorized`,async()=>{
 const f=communicationFixture();f.state().operatorTakeover={active:true,automation:{enabled:true,mode:'new-unclaimed-only',protectedSubjects:[{collection:'batches',id:f.batch.id}]}};
 const before=structuredClone(f.state());await assert.rejects(f.communication[method](f.batch,{automatic:true}),owned);assert.equal(f.calls.length,0);assert.equal(f.writes.length,0);assert.deepEqual(f.state(),before);
 await f.communication.publishState(f.batch);assert(f.writes.length>0);assert.deepEqual(f.state(),before);
});
test('explicit handoff remains SHA-bound under takeover and cannot publish an obsolete PR',async()=>{
 const f=communicationFixture();f.state().operatorTakeover={active:true};f.pr.head.sha='b'.repeat(40);await assert.rejects(f.communication.publishState(f.batch),/PR.*(head|identity)|head.*changed/i);assert.equal(f.writes.length,0);
});
test('takeover observed in final authorization prevents automatic publication; later explicit method is not poisoned',async()=>{
 const f=communicationFixture();let calls=0;f.github.authorized=async()=>{if(++calls===3)f.state().operatorTakeover={active:true};return true};await assert.rejects(f.communication.publishState(f.batch,{automatic:true}),owned);assert.equal(f.writes.length,0);await f.communication.publishState(f.batch);assert(f.writes.length>0);
});
test('takeover after first allowed write halts every subsequent automatic write without rollback or state reset',async()=>{
 const f=communicationFixture();f.hook(async c=>{if(c.args.includes('-X'))f.state().operatorTakeover={active:true}});await assert.rejects(f.communication.publishState(f.batch,{automatic:true}),owned);assert.equal(f.writes.length,1);assert.equal(f.state().operatorTakeover.active,true);
});
test('actual prebuilt communication propagates ownership loss through external controller as skip without block, model or save',async()=>{
 const f=communicationFixture(),before=structuredClone(f.batch);let reads=0;f.github.createStateStore=()=>({load:async()=>{if(++reads===2)f.state().operatorTakeover={active:true};return structuredClone(f.state())},save:()=>assert.fail('no save')});
 // Prebuilt communication owns its original store. Trigger takeover in its first network read instead.
 f.hook(async()=>{f.state().operatorTakeover={active:true}});
 const r=await externalReviewStep({repo:'l2v-hub/ClinicOS',batch:f.batch,gh:f.github,communication:f.communication,workspace:new Proxy({},{get:()=>()=>assert.fail('no workspace/model')}),save:()=>assert.fail('no save'),block:()=>assert.fail('no status block'),report:()=>assert.fail('no report')});
 assert.deepEqual(r,{status:'skipped',reason:'operator-owned'});assert.equal(f.writes.length,0);assert.deepEqual(f.batch,before);
});
test('sync prebuilt unowned communication projects allowed state, then protected handback skips subsequent writes',async()=>{
 const f=communicationFixture();let r=await syncIssueReviews({github:f.github,communication:f.communication});assert.equal(r.status,'synced');assert(f.writes.length>0);const n=f.writes.length;f.state().operatorTakeover={active:true,automation:{enabled:true,mode:'new-unclaimed-only',protectedSubjects:[{collection:'batches',id:f.batch.id}]}};r=await syncIssueReviews({github:f.github,communication:f.communication});assert.equal(r.status,'skipped');assert.equal(f.writes.length,n);
});
test('authorization loss remains a rejected explicit publication even with a known personal handoff',async()=>{
 const f=communicationFixture();f.state().operatorTakeover={active:true};f.github.authorized=async()=>false;await assert.rejects(f.communication.publishState(f.batch),/authoriz/);assert.equal(f.writes.length,0);
});
