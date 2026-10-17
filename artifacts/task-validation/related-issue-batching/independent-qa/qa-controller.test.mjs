import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {runPipeline} from '../../../../agent-team/src/bug-pipeline/pipeline.mjs';
import {validateState} from '../../../../agent-team/src/bug-pipeline/contracts.mjs';
import {repo,blank,groupFor,batchFor} from './qa-fixtures.mjs';
const clone=v=>structuredClone(v);
function harness({numbers=[701,702],state=blank(),scope,labels,discovery,hydrate}={}){
 let current=clone(state);const saves=[];const calls={plan:0,prepare:0,status:[]};let discoveries=0,hydrations=0;
 const gh={intake:async()=>{},discoverQueue:async()=>{discoveries++;return discovery?.(discoveries)??numbers},viewIssue:async number=>{hydrations++;return {number,state:'open',labels:labels??['bug','codex-run'],...hydrate?.(hydrations,number)}},setIssueStatus:async(n,status)=>calls.status.push([n,status]),commentIssue:async()=>{}};
 const models={plan:async input=>{calls.plan++;return {groups:[groupFor(input.issues.map(i=>i.number),scope)],blocked:[]}}};
 const workspace={root:'/tmp/synthetic-qa-unused',prepare:async()=>{calls.prepare++;throw Error('Synthetic QA stops before implementation; no model/worktree invoked')}};
 const store={load:async()=>clone(current),save:async value=>{current=clone(value);saves.push(clone(value))}};
 return {calls,saves,get state(){return current},run:()=>runPipeline({repo,event:{action:'synthetic'},gh,models,workspace,store,triageWindowMs:0,now:()=>1000})};
}
test('independent: controller state with new grouping is accepted unchanged by installed origin/main validator',async()=>{
 const h=harness();await h.run();const planned=h.saves.find(s=>s.batches[0]?.phase==='planned');assert.ok(planned);assert.ok(planned.batches[0].grouping?.fileMap);assert.equal(planned.batches[0].plan.fileMap,undefined);
 let old=execFileSync('git',['show','origin/main:agent-team/src/bug-pipeline/contracts.mjs'],{encoding:'utf8'});
 old=old.replace("'../core/json-schema.mjs'",JSON.stringify(new URL('../../../../agent-team/src/core/json-schema.mjs',import.meta.url).href)).replace("'../core/sanitize.mjs'",JSON.stringify(new URL('../../../../agent-team/src/core/sanitize.mjs',import.meta.url).href)).replace("'./routing.mjs'",JSON.stringify(new URL('../../../../agent-team/src/bug-pipeline/routing.mjs',import.meta.url).href));
 const legacy=await import(`data:text/javascript;base64,${Buffer.from(old).toString('base64')}`);const before=JSON.stringify(planned);legacy.validateState(planned,repo);validateState(planned,repo);assert.equal(JSON.stringify(planned),before);
});
test('independent: live label revocation and external ownership cannot enter collection or paid planning',async()=>{
 for(const labels of [['bug'],['bug','codex-run','ready-for-qa'],['bug','codex-run','assigned-to-claude'],['bug','codex-run','codex-in-flight']]){const h=harness({labels});await h.run();assert.equal(h.calls.plan,0);assert.equal(h.calls.prepare,0);assert.equal(h.calls.status.length,0);assert.equal(h.state.triageQueue,undefined)}
});
test('independent: authorization disappearing after collection refuses ownership before model call',async()=>{
 const h=harness({discovery:n=>n===1?[701,702]:[]});await assert.rejects(h.run(),/authorization or ownership changed before claim/);assert.equal(h.calls.plan,0);assert.equal(h.calls.prepare,0);assert.equal(h.calls.status.length,0);
});
test('independent: new issue overlapping a frozen legacy batch stays blocked and preserves exhausted budgets',async()=>{
 const old=batchFor([900]);delete old.plan.fileMap;delete old.plan.separationReason;delete old.grouping;old.phase='blocked';old.implementation=Array.from({length:4},(_,i)=>({round:i+1,status:'failed'}));old.reviews=Array.from({length:4},(_,i)=>({round:i+1,status:'changes-requested'}));
 const h=harness({state:{...blank(),batches:[old]}});await h.run();assert.deepEqual(h.state.batches[0],old);assert.equal(h.state.batches[1].phase,'blocked');assert.match(h.state.batches[1].reason,/bug-batch-900/);assert.equal(h.calls.prepare,0);assert.deepEqual(h.state.batches[1].issues,[701,702]);
});
test('independent: unrelated incoming files may proceed without mutating a frozen legacy scope',async()=>{
 const old=batchFor([900],{phase:'blocked'});delete old.plan.fileMap;delete old.plan.separationReason;delete old.grouping;
 const h=harness({state:{...blank(),batches:[old]},scope:['frontend/src/unrelated-form.ts']});await h.run();assert.deepEqual(h.state.batches[0],old);assert.equal(h.calls.prepare,1);assert.ok(h.saves.some(s=>s.batches[1]?.phase==='planned'));
});
