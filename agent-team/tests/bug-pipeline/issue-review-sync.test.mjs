import test from 'node:test';
import assert from 'node:assert/strict';
import { syncIssueReviews } from '../../src/bug-pipeline/issue-review-sync.mjs';
const repo='l2v-hub/ClinicOS';
const standalone=()=>({id:'standalone-pr-81',pr:{number:81},sha:'a'.repeat(40),implementation:[],reviews:[],issues:[]});
test('sync discovers standalone without processing, mirroring, saving or restarting it',async()=>{
 const subject=standalone(), state={schemaVersion:1,repository:repo,batches:[],standaloneReviews:[subject]},before=structuredClone(state),calls=[];
 const result=await syncIssueReviews({github:{createStateStore:()=>({load:async()=>state,save:()=>assert.fail('save')})},communication:{mirrorFeedback:()=>assert.fail('standalone mirror'),publishState:async(s,options)=>{calls.push({s,options});return{label:'codex-review-ready'}}}});
 assert.equal(calls.length,1);assert.deepEqual(calls[0].options,{collection:'standaloneReviews'});assert.equal(result.batches[0].label,'codex-review-ready');assert.deepEqual(state,before);
});
test('sync rejects duplicate standalone identities before any projection',async()=>{
 const a=standalone();const state={schemaVersion:1,repository:repo,batches:[],standaloneReviews:[a,{...a,id:'other'}]};
 await assert.rejects(syncIssueReviews({github:{createStateStore:()=>({load:async()=>state})},communication:{publishState:()=>assert.fail('write')}}),/Duplicate/);
});
test('sync skips merged and deployed standalone subjects',async()=>{
 const a=standalone();for(const status of ['merged','deployed']){const state={schemaVersion:1,repository:repo,batches:[],standaloneReviews:[{...a,release:{status}}]};const r=await syncIssueReviews({github:{createStateStore:()=>({load:async()=>state})},communication:{publishState:()=>assert.fail('write')}});assert.equal(r.batches.length,0)}
});
