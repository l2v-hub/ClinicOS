import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {randomUUID} from 'node:crypto';
import express from 'express';
import {startPo15Fixture,seedPo15Assessments,fixtureActors,legacyNrs,legacyIntakePain,catalogInputs} from '../fixtures/po15-catalog.mjs';
let fixture:any,server:any,base:string,seed:any;
const patient='vitals-qa-anna';
const headers=(actor=fixtureActors.operator)=>({'Content-Type':'application/json','X-Operator-Id':actor.id,'X-Operator-Role':actor.role,'X-Demo-Patient-Id':patient});
async function request(path:string,body?:unknown,method=body===undefined?'GET':'POST',actor=fixtureActors.operator,id=patient){
 const response=await fetch(`${base}/${id}/${path}`,{method,headers:headers(actor),...(body===undefined?{}:{body:JSON.stringify(body)})});
 const text=await response.text();return {status:response.status,cache:response.headers.get('cache-control'),body:text?JSON.parse(text):null};
}
before(async()=>{
 fixture=await startPo15Fixture();
 const [{default:patients},{default:documents},{default:assessments}]=await Promise.all([import('../../backend/src/routes/patients.js'),import('../../backend/src/routes/patient-documents.js'),import('../../backend/src/routes/patient-assessments.js')]);
 const app=express();app.use(express.json());app.use('/patients',documents);app.use('/patients',assessments);app.use('/patients',patients);
 server=app.listen(0,'127.0.0.1');await new Promise<void>(ok=>server.once('listening',ok));base=`http://127.0.0.1:${server.address().port}/patients`;
});
after(async()=>{server?.closeAllConnections();if(server)await new Promise(ok=>server.close(ok));await fixture?.close()});

test('catalog returns only five bounded metadata rows, private drafts and explicit access errors',async()=>{
 const empty=await request('assessments/catalog');assert.equal(empty.status,200,JSON.stringify(empty.body));assert.match(empty.cache!,/private/);assert.match(empty.cache!,/no-store/);
 assert.deepEqual(empty.body.items.map((item:any)=>item.type),catalogInputs.map(input=>input.type));
 for(const item of empty.body.items){assert.equal(item.latestFinal,null);assert.equal(item.latestOwnDraft,null);assert.equal(item.ownDraftCount,0)}
 seed=await seedPo15Assessments();
 const loaded=await request('assessments/catalog');assert.equal(loaded.status,200);
 assert.ok(!/"(?:answers|finalSnapshot|dataBase64|pdf)"/.test(JSON.stringify(loaded.body)),'Catalog must not download clinical answers or document content');
 for(const item of loaded.body.items){const final=seed.finals.find((row:any)=>row.type===item.type);assert.equal(item.latestFinal.id,final.id);assert.equal(item.latestFinal.assessedAt,final.assessedAt);assert.equal(item.ownDraftCount,0);assert.equal(item.latestOwnDraft,null)}
 const own=await request('assessments/catalog',undefined,'GET',fixtureActors.operator,'vitals-qa-bruno');
 const mna=own.body.items.find((item:any)=>item.type==='mna');assert.equal(mna.latestFinal,null);assert.equal(mna.ownDraftCount,1);assert.equal(mna.latestOwnDraft.id,seed.ownDraft.id);
 const manager=await request('assessments/catalog',undefined,'GET',fixtureActors.manager);assert.equal(manager.body.items.find((item:any)=>item.type==='gds15').ownDraftCount,1);
 assert.equal((await request('assessments/catalog',undefined,'GET',fixtureActors.outsider)).status,404);
 assert.equal((await request('assessments/catalog?unexpected=1')).status,400);
});

test('catalog latest final agrees with current after a late correction of an older assessment',async()=>{
 assert.ok(seed);const definition=catalogInputs[0],original=seed.finals.find((row:any)=>row.type==='painad');
 const make=(extra:object={})=>({requestId:randomUUID(),type:definition.type,formVersion:definition.formVersion,assessedAt:'2026-09-23T06:30:00.000Z',answers:definition.complete(),...extra});
 const create=async(body:object)=>{const result=await request('assessments',body);assert.equal(result.status,201,JSON.stringify(result.body));return result.body.assessment};
 const finalize=async(row:any)=>{const result=await request(`assessments/${row.id}/finalize`,{requestId:randomUUID(),expectedVersion:row.version});assert.equal(result.status,200,JSON.stringify(result.body));return result.body.assessment};
 const newer=await finalize(await create(make()));
 await finalize(await create(make({assessedAt:original.assessedAt,predecessorId:original.id,correctionReason:'Rettifica tardiva sintetica'})));
 const catalog=await request('assessments/catalog'),current=await request('assessments/current?type=painad');
 assert.equal(catalog.body.items.find((item:any)=>item.type==='painad').latestFinal.id,newer.id);assert.equal(current.body.assessment.id,newer.id);
 assert.deepEqual((await request('cartella')).body.data.valutazioniNRS,legacyNrs);
});

test('NRS legacy remains immutable through Cartella while unrelated updates and omitted fields are accepted',async()=>{
 const initial=(await request('cartella')).body.data;const {valutazioniNRS:legacy,...other}=initial;
 const omitted=await request('cartella',{data:{...other,po15SyntheticNote:'Aggiornamento consentito'}},'PUT');assert.equal(omitted.status,200,JSON.stringify(omitted.body));assert.deepEqual(omitted.body.data.valutazioniNRS,legacy);
 const equal=await request('cartella',{data:{...omitted.body.data,valutazioniNRS:legacy.map((row:any)=>Object.fromEntries(Object.entries(row).reverse()))}},'PUT');assert.equal(equal.status,200,JSON.stringify(equal.body));
 for(const changed of [null,[],[...legacy].reverse(),[...legacy,{id:'new',punteggio:2}]]){
  const denied=await request('cartella',{data:{...equal.body.data,valutazioniNRS:changed,po15SyntheticNote:'Non deve essere scritto'}},'PUT');assert.equal(denied.status,409,JSON.stringify(denied.body));
 }
 const final=(await request('cartella')).body.data;assert.deepEqual(final.valutazioniNRS,legacyNrs);assert.equal(final.po15SyntheticNote,'Aggiornamento consentito');
});

test('confirmed intake pain remains readable without conversion and overflow preserves deferred therapies',async()=>{
 const initial=await request('intake-review');assert.equal(initial.status,200,JSON.stringify(initial.body));assert.match(initial.cache!,/no-store/);
 assert.equal(initial.body.legacyPainError,null);
 assert.deepEqual(initial.body.legacyPainDrafts.map((row:any)=>row.draftId).sort(),['po15-intake-null','po15-intake-pain']);
 const pain=initial.body.legacyPainDrafts.find((row:any)=>row.draftId==='po15-intake-pain');
 assert.deepEqual(pain.pain,legacyIntakePain);assert.equal(pain.confirmedAt,'2026-09-20T09:30:00.000Z');
 const unknown=initial.body.legacyPainDrafts.find((row:any)=>row.draftId==='po15-intake-null');assert.equal(unknown.pain,null);assert.equal(unknown.confirmedAt,null);
 assert.equal(initial.body.deferredTherapies.length,1);assert.equal(initial.body.deferredTherapies[0].name,'Terapia sintetica da verificare');
 assert.equal((await request('intake-review',undefined,'GET',fixtureActors.outsider)).status,404);
 const old=await fixture.prisma.patientIntakeDraft.findUniqueOrThrow({where:{id:'po15-intake-null'}});
 const oversized='à'.repeat(1024*1024+1);
 try{
  await fixture.prisma.patientIntakeDraft.update({where:{id:old.id},data:{data:{dolore:oversized}}});
  const overflow=await request('intake-review');assert.equal(overflow.status,200,JSON.stringify(overflow.body));
  assert.equal(overflow.body.legacyPainDrafts,null);assert.equal(overflow.body.legacyPainError,'intake_review_legacy_pain_too_large');
  assert.deepEqual(overflow.body.deferredTherapies,initial.body.deferredTherapies);assert.deepEqual((await request('cartella')).body.data.valutazioniNRS,legacyNrs);
  assert.equal((await fixture.prisma.patientIntakeDraft.findUniqueOrThrow({where:{id:old.id}})).data.dolore.length,oversized.length);
 }finally{await fixture.prisma.patientIntakeDraft.update({where:{id:old.id},data:{data:old.data}})}
});
