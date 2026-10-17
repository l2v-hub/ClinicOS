import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,sha} from '../independent-qa-cycle-2/publication-race-fixture.mjs';
import {releaseBatch} from '../../../../agent-team/src/bug-pipeline/release.mjs';

test('a PR identity change during final trusted preflight cannot select an unverified PR for merge', async()=>{
 const f=fixture(['backend/src/example.ts']);
 let preflights=0;
 f.github.verifyDemoPreflight=async()=>{
  if(++preflights===2){
   f.state.batches[0].pr={number:10,url:'https://github.com/l2v-hub/ClinicOS/pull/10'};
  }
 };
 let result,error;
 try {result=await releaseBatch({repo:f.state.repository,github:f.github,store:f.store,batchId:f.batch.id,reviewedSha:sha,execute:true,configured:{botToken:true,railway:true,vercel:true}});}catch(caught){error=caught.message;}
 const merges=f.calls.filter(([kind])=>kind==='merge');
 console.log(JSON.stringify({preflights,verifiedPr:9,durablePr:f.state.batches[0].pr.number,actualMerges:merges,result,error}));
 assert.deepEqual(merges,[],'A fresh durable PR identity must match the PR checked before the awaited preflight');
});
