import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture as standaloneFixture} from './standalone-review-fixture.mjs';
import {fixture as releaseFixture} from './release-fixture.mjs';
import {runPipeline} from '../qa-source4/agent-team/src/bug-pipeline/pipeline.mjs';
import {releaseBatch} from '../qa-source4/agent-team/src/bug-pipeline/release.mjs';
import {DEMO_SOURCE_POLICIES} from '../qa-source4/agent-team/src/bug-pipeline/demo-deployment.mjs';
const repo='l2v-hub/ClinicOS',sha='a'.repeat(40),configured={botToken:true,vercel:true,railway:true};
const owned=e=>e.code==='review-operator-owned';const releaseOwned=e=>e.code==='release-operator-owned';
async function requested(){const f=standaloneFixture();await f.controller.adopt(f.manifest);const subject=await f.controller.request(81);f.labels.splice(0);return{f,subject}}
test('concurrent prebuilt automatic protected subject and explicit handoff remain isolated across await and exception',async()=>{
 const {f,subject}=await requested();f.remote().operatorTakeover={active:true,automation:{enabled:true,mode:'new-unclaimed-only',protectedSubjects:[{collection:'standaloneReviews',id:subject.id}]}};const before=structuredClone(f.remote());let release;const barrier=new Promise(r=>release=r);
 const pending=f.controller.automatic(async()=>{await barrier;return f.controller.publishState(subject)});await f.controller.publishState(subject);assert.deepEqual(f.labels,['claude-review-ready']);release();await assert.rejects(pending,owned);assert.deepEqual(f.remote(),before);
 await assert.rejects(f.controller.automatic(async()=>{await Promise.resolve();throw new Error('synthetic context exit')}),/context exit/);f.labels.splice(0);await f.controller.publishState(subject);assert.deepEqual(f.labels,['claude-review-ready']);
});
test('ordinary unowned automatic pipeline uses native prebuilt controller and continues publication with zero models',async()=>{
 const {f}=await requested();await runPipeline({repo,event:{},gh:{...f.github,intake:async()=>{},discoverQueue:async()=>[]},store:f.github.createStateStore(),models:new Proxy({},{get:()=>()=>assert.fail('no model')}),workspace:{},standaloneController:f.controller,reviewMode:'external'});assert.deepEqual(f.labels,['claude-review-ready']);assert.equal(f.remote().operatorTakeover,undefined);
});
test('automatic standalone final authorization observes new subject ownership and explicit stale PR remains rejected',async()=>{
 const {f,subject}=await requested();const auth=f.github.authorized;let n=0;f.github.authorized=async(...a)=>{if(++n===2)f.remote().standaloneReviews[0].operatorCoordination={active:true};return auth(...a)};await assert.rejects(f.controller.automatic(()=>f.controller.publishState(subject)),owned);assert.deepEqual(f.labels,[]);f.pr.head.sha='b'.repeat(40);await assert.rejects(f.controller.publishState(subject));assert.deepEqual(f.labels,[]);
});
test('automatic release late callback preserves true prior merge reservation without block, save or side effects',async()=>{
 const f=releaseFixture();const reservation={status:'merging',reviewedSha:sha,nonce:'qa-owned-reservation',reservedAt:'2026-10-22T00:00:00Z'};f.batch.release=structuredClone(reservation);let callbacks=0;f.github.mergePullRequest=async(n,s,o)=>{f.getSaved().operatorTakeover={active:true};callbacks++;await o.guard();assert.fail('no merge')};await assert.rejects(releaseBatch({repo,github:f.github,store:f.store,batchId:f.batch.id,reviewedSha:sha,configured,execute:true,automatic:true}),releaseOwned);assert.equal(callbacks,1);assert.deepEqual(f.getSaved().batches[0].release,reservation);assert.equal(f.calls.filter(([n])=>['save','merge','comment','status'].includes(n)).length,0);
});
test('automatic exact dispatch guard preserves uncertain intent without converting ownership abort into durable release block',async()=>{
 const f=releaseFixture(['backend/src/qa-synthetic.ts']);const intent={phase:'dispatch-intended',nonce:'qa-uncertain-intent'};f.batch.exactDemoDispatches={preflight:structuredClone(intent)};f.github.ensureExactDemoRun=async({guard})=>{f.getSaved().operatorTakeover={active:true};await guard();assert.fail('no provider dispatch')};const before=structuredClone(f.batch);await assert.rejects(releaseBatch({repo,github:f.github,store:f.store,batchId:f.batch.id,reviewedSha:sha,configured,sourcePolicy:DEMO_SOURCE_POLICIES.exact,execute:true,automatic:true}),releaseOwned);assert.deepEqual(f.getSaved().batches[0],before);assert.equal(f.calls.filter(([n])=>['save','merge','comment','status'].includes(n)).length,0);
});
test('automatic rejection is invocation-local; explicit authorized release still rejects stale SHA then allows current revision',async()=>{
 const f=releaseFixture();f.state.operatorTakeover={active:true};const args={repo,github:f.github,store:f.store,batchId:f.batch.id,configured,execute:true};await assert.rejects(releaseBatch({...args,reviewedSha:sha,automatic:true}),releaseOwned);await assert.rejects(releaseBatch({...args,reviewedSha:'b'.repeat(40)}));assert.equal(f.calls.filter(([n])=>n==='merge').length,0);const r=await releaseBatch({...args,reviewedSha:sha});assert.equal(r.status,'merged');assert.equal(f.calls.filter(([n])=>n==='merge').length,1);assert.equal(f.getSaved().operatorTakeover.active,true);
});
