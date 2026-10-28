import assert from 'node:assert/strict';
import test from 'node:test';
import { ImportReviewHandoff } from '../../../../frontend/src/components/shared/import/importReviewHandoff';
import { job } from '../../../../frontend/src/components/shared/import/__tests__/fixtures';

test('QA450-1 reproduces stale conflict decision overwritten after rejected save-and-close', async () => {
 const previous=globalThis.fetch;
 const handoff=new ImportReviewHandoff();
 const source={manifestRevision:3,resultHash:'same-extraction-hash'};
 let resolved=false;
 let patch:Record<string,unknown>|undefined;
 const api={async get(){const value=job(3);value.status='review_ready';value.review.canProceed=resolved;value.review.unresolvedConflicts=resolved?0:1;value.review.draftSourceIsCurrent=true;return value;}};
 globalThis.fetch=(async (_url,init)=>{
  if(init?.method==='POST'){
   if(!resolved)return new Response(JSON.stringify({code:'unresolved_conflicts',error:'Scegli come gestire ogni informazione discordante prima di continuare'}),{status:409,headers:{'Content-Type':'application/json'}});
   return new Response(JSON.stringify({id:'synthetic-draft',version:0,data:{anagrafica:{firstName:'Corretto',lastName:'Sintetico'}}}),{headers:{'Content-Type':'application/json'}});
  }
  assert.equal(init?.method,'PATCH');patch=JSON.parse(String(init.body));return new Response(JSON.stringify({id:'synthetic-draft',version:1,data:patch}),{headers:{'Content-Type':'application/json'}});
 }) as typeof fetch;
 try{
  await assert.rejects(handoff.complete('job-one',source,{},api,{patient:{firstName:'Prima',lastName:'Sintetico',dateOfBirth:''},cartella:{}}),/informazione discordante/);
  assert.equal(handoff.pending,true,'Definitive rejection incorrectly becomes pending handoff');
  resolved=true;
  await handoff.complete('job-one',source,{},api,{patient:{firstName:'Corretto',lastName:'Sintetico',dateOfBirth:''},cartella:{}});
  assert.equal((patch?.anagrafica as {firstName:string}).firstName,'Prima','Reproduction: old rejected review overwrites corrected conflict value');
  assert.notEqual((patch?.anagrafica as {firstName:string}).firstName,'Corretto');
 }finally{globalThis.fetch=previous;}
});
