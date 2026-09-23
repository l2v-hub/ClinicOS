import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {randomUUID,createHash} from 'node:crypto';
import express from 'express';
import {startPo13Fixture,fixtureActors,mnaEmpty,mnaScreening,mnaFull,MNA_VERSION} from '../fixtures/po13-mna.mjs';
let fixture:any,server:any,base:string;
const patient='vitals-qa-anna';
const headers=(actor=fixtureActors.operator)=>({'Content-Type':'application/json','X-Operator-Id':actor.id,'X-Operator-Role':actor.role,'X-Demo-Patient-Id':patient});
async function request(path:string,body?:unknown,method=body===undefined?'GET':'POST',actor=fixtureActors.operator){
 const response=await fetch(`${base}/${patient}/${path}`,{method,headers:headers(actor),...(body===undefined?{}:{body:JSON.stringify(body)})});
 const text=await response.text();return {status:response.status,body:text?JSON.parse(text):null};
}
const draft=(answers:any=mnaEmpty())=>({requestId:randomUUID(),type:'mna',formVersion:MNA_VERSION,assessedAt:'2026-09-22T06:30:00.000Z',answers});
before(async()=>{
 fixture=await startPo13Fixture();
 const [{default:patients},{default:documents},{default:assessments}]=await Promise.all([import('../../backend/src/routes/patients.js'),import('../../backend/src/routes/patient-documents.js'),import('../../backend/src/routes/patient-assessments.js')]);
 const app=express();app.use(express.json());app.use('/patients',documents);app.use('/patients',assessments);app.use('/patients',patients);
 server=app.listen(0,'127.0.0.1');await new Promise<void>(ok=>server.once('listening',ok));base=`http://127.0.0.1:${server.address().port}/patients`;
});
after(async()=>{server?.closeAllConnections();if(server)await new Promise(ok=>server.close(ok));await fixture?.close()});
test('MNA HTTP final screening keeps partial global answers and archives a distinct screening PDF',async()=>{
 const created=await request('assessments',draft());assert.equal(created.status,201,JSON.stringify(created.body));let row=created.body.assessment;
 assert.equal(row.completion.screening.answeredCount,0);assert.equal(row.result.screening,null);assert.equal(row.result.total,null);
 assert.equal((await request(`assessments/${row.id}/finalize`,{requestId:randomUUID(),expectedVersion:row.version})).status,422);
 const answers={...mnaScreening(),J:'three_meals',K:{dairyDaily:true,eggsOrLegumesWeekly:null,meatFishOrPoultryDaily:false},notes:'Dati globali parziali da conservare.'};
 const patch=await request(`assessments/${row.id}`,{expectedVersion:row.version,assessedAt:row.assessedAt,answers},'PATCH');assert.equal(patch.status,200,JSON.stringify(patch.body));row=patch.body.assessment;
 assert.equal(row.result.screening.score,14);assert.equal(row.completion.complete,true);assert.equal(row.result.global,null);
 const command={requestId:randomUUID(),expectedVersion:row.version};const final=await request(`assessments/${row.id}/finalize`,command);assert.equal(final.status,200,JSON.stringify(final.body));row=final.body.assessment;
 assert.equal(row.status,'final');assert.equal(row.extent,'screening');assert.equal(row.result.total,null);assert.equal(row.finalSnapshot.items.length,18);
 assert.deepEqual(row.finalSnapshot.answers.K,answers.K);const partialK=row.finalSnapshot.items.find((i:any)=>i.id==='K');assert.equal(partialK.score,null);assert.equal(partialK.description,null);
 assert.deepEqual(partialK.subitems.map((item:any)=>[item.id,item.answer]),Object.entries(answers.K));assert.ok(partialK.subitems.every((item:any)=>typeof item.label==='string'&&item.label.length>0));assert.ok(row.finalSnapshot.items.filter((item:any)=>item.id!=='K').every((item:any)=>!Object.hasOwn(item,'subitems')));
 assert.equal(row.finalSnapshot.demographics.sex,'F');assert.equal(row.finalSnapshot.demographics.ageAtAssessment,76);assert.equal(row.finalSnapshot.references.length,3);assert.match(row.finalSnapshot.copyright,/Nestlé/);
 assert.equal((await request(`assessments/${row.id}/finalize`,command)).body.assessment.id,row.id);
 const archive=await request('documents');assert.equal(archive.status,200,JSON.stringify(archive.body));const document=archive.body.documents.find((d:any)=>d.id===row.pdf.documentId);assert.equal(document.assessment.type,'mna');
 const response=await fetch(`${base}/${patient}/documents/${document.id}/content`,{headers:headers()});assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.subarray(0,4).toString(),'%PDF');assert.equal(createHash('sha256').update(bytes).digest('hex'),document.sha256);
 assert.equal((await request(`assessments/${row.id}`,undefined,'GET',fixtureActors.outsider)).status,404);
});
test('MNA HTTP rejects concurrent category/measure and persists exact BMI and Q boundaries in a full correction',async()=>{
 const contradictory={...mnaFull(),measurements:{weightKg:76,heightCm:200,armCircumferenceCm:null,calfCircumferenceCm:null}};
 assert.equal((await request('assessments',draft(contradictory))).status,400);
 const original=(await request('assessments/current?type=mna')).body.assessment;assert.ok(original);
 const answers={...mnaFull(),F:{method:'measured'},Q:{method:'measured'},R:{method:'measured'},measurements:{weightKg:76,heightCm:200,armCircumferenceCm:22,calfCircumferenceCm:31},measurementDates:{weightKg:'2026-09-21',heightCm:null,armCircumferenceCm:null,calfCircumferenceCm:null}};
 const created=await request('assessments',{...draft(answers),predecessorId:original.id,correctionReason:'Passaggio sintetico a valutazione completa con misure.'});assert.equal(created.status,201,JSON.stringify(created.body));const draftRow=created.body.assessment;
 assert.equal(draftRow.result.screening.score,12);assert.equal(draftRow.result.global.score,15.5);assert.equal(draftRow.result.total.score,27.5);
 const final=await request(`assessments/${draftRow.id}/finalize`,{requestId:randomUUID(),expectedVersion:draftRow.version});assert.equal(final.status,200,JSON.stringify(final.body));const row=final.body.assessment;
 assert.equal(row.extent,'full');assert.equal(row.assessedAt,original.assessedAt);assert.equal(row.finalSnapshot.bmi,19);assert.equal(row.finalSnapshot.items.find((i:any)=>i.id==='Q').score,0.5);assert.equal(row.finalSnapshot.items.find((i:any)=>i.id==='R').score,1);
 assert.deepEqual(row.finalSnapshot.answers.measurementDates,answers.measurementDates);assert.equal((await request(`assessments/${original.id}`)).body.assessment.result.total,null);
 assert.equal((await request('assessments/current?type=mna')).body.assessment.id,row.id);
});
