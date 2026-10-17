import test from 'node:test';
import assert from 'node:assert/strict';
import {createGitHub} from '../../../../agent-team/src/bug-pipeline/github.mjs';
const response=value=>({ok:true,code:0,stdout:JSON.stringify(value),stderr:''});
const label=name=>({name});
function setup({actorType='User',permission='admin',actor='maintainer',comments=[],labels=['codex-run'],pullRequest=false}={}){
 const writes=[]; const reads=[];
 const gh=createGitHub({repo:'l2v-hub/ClinicOS',cwd:process.cwd(),run:async({args,input})=>{
  const route=args[1];
  if(args.includes('-X')){writes.push({route,body:input?JSON.parse(input):null});return response({});}
  reads.push(route);
  if(route.includes('/issues?'))return response([[{number:801,labels:labels.map(label),...(pullRequest?{pull_request:{}}:{})}]]);
  if(route.includes('/events?'))return response([[{id:1,event:'labeled',label:{name:'codex-run'},actor:{login:actor,type:actorType},created_at:'2026-10-17T06:00:00Z'}]]);
  if(route.includes('/comments?'))return response([comments]);
  if(route.includes('/collaborators/'))return response({permission});
  if(route.includes('/labels/'))return response({});
  throw new Error('Unexpected route '+route);
 }});
 return {gh,writes,reads};
}
for(const permission of ['write','maintain','admin'])test(`authorized human ${permission} can recover label-only queue and dashboard never writes`,async()=>{
 const{gh,writes,reads}=setup({permission});
 assert.deepEqual((await gh.discoverQueue()).map(i=>i.number),[801]);assert.equal(writes.length,0);assert.ok(reads.every(r=>!r.includes('/comments')));
 assert.deepEqual((await gh.discoverQueue({normalize:true})).map(i=>i.number),[801]);assert.deepEqual(writes,[{route:'repos/l2v-hub/ClinicOS/issues/801/labels',body:{labels:['bug','codex-triage','codex-run']}}]);
});
for(const permission of ['read','triage','none'])test(`non-write ${permission} cannot normalize or enter queue`,async()=>{
 const{gh,writes}=setup({permission});assert.deepEqual(await gh.discoverQueue({normalize:true}),[]);assert.equal(writes.length,0);
});
for(const actorType of ['Bot',null,'Unknown'])test(`actor ${actorType} cannot self-authorize from permission alone`,async()=>{
 const{gh,writes}=setup({actorType,comments:[]});assert.deepEqual(await gh.discoverQueue({normalize:true}),[]);assert.equal(writes.length,0);
});
for(const spec of [
 {name:'recent exact authorized human command',body:'/codex fix',created:'2026-10-17T05:59:00Z',permission:'admin',expected:[801]},
 {name:'near match rejected',body:'/codex fix please',created:'2026-10-17T05:59:00Z',permission:'admin',expected:[]},
 {name:'stale command rejected',body:'/codex fix',created:'2026-10-17T04:59:59Z',permission:'admin',expected:[]},
 {name:'future command rejected',body:'/codex fix',created:'2026-10-17T06:00:01Z',permission:'admin',expected:[]},
 {name:'unauthorized command rejected',body:'/codex fix',created:'2026-10-17T05:59:00Z',permission:'read',expected:[]},
])test(`Bot fallback ${spec.name}`,async()=>{
 const{gh,writes}=setup({actorType:'Bot',actor:'github-actions[bot]',permission:spec.permission,comments:[{body:spec.body,created_at:spec.created,user:{login:'maintainer',type:'User'}}]});
 assert.deepEqual((await gh.discoverQueue()).map(i=>i.number),spec.expected);assert.equal(writes.length,0);
});
for(const blocked of ['codex-blocked','codex-in-flight','codex-processing','status-blocked'])test(`blocked ${blocked} not normalized`,async()=>{
 const{gh,writes}=setup({labels:['codex-run',blocked]});assert.deepEqual(await gh.discoverQueue({normalize:true}),[]);assert.equal(writes.length,0);
});
test('PRs never normalized as issues',async()=>{const{gh,writes}=setup({pullRequest:true});assert.deepEqual(await gh.discoverQueue({normalize:true}),[]);assert.equal(writes.length,0);});

for(const userType of ['Bot',null,'Unknown'])test(`Bot fallback rejects command author metadata ${userType}`,async()=>{
 const{gh,writes}=setup({actorType:'Bot',actor:'github-actions[bot]',comments:[{body:'/codex fix',created_at:'2026-10-17T05:59:00Z',user:{login:'maintainer',type:userType}}]});
 assert.deepEqual(await gh.discoverQueue({normalize:true}),[]);assert.equal(writes.length,0);
});
for(const external of ['agent-working','ready-for-dev','assigned-to-claude','ready-for-qa','qa-passed'])test(`external ${external} remains visible but never normalized`,async()=>{
 const{gh,writes}=setup({labels:['codex-run',external]});assert.deepEqual((await gh.discoverQueue({normalize:true})).map(i=>i.number),[801]);assert.equal(writes.length,0);
});
