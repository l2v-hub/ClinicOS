import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {randomUUID,createHash} from 'node:crypto';
import express from 'express';
import {startPo12Fixture,fixtureActors,tinettiAnswers,legacyTinetti,TINETTI_VERSION} from '../fixtures/po12-tinetti.mjs';
let fixture:any,server:any,base:string;
const patient='vitals-qa-anna';
const headers=(actor=fixtureActors.operator)=>({'Content-Type':'application/json','X-Operator-Id':actor.id,'X-Operator-Role':actor.role,'X-Demo-Patient-Id':patient});
async function request(path:string,body?:unknown,method=body===undefined?'GET':'POST',actor=fixtureActors.operator){
 const response=await fetch(`${base}/${patient}/${path}`,{method,headers:headers(actor),...(body===undefined?{}:{body:JSON.stringify(body)})});
 const text=await response.text();return {status:response.status,body:text?JSON.parse(text):null};
}
const draft=(answers=tinettiAnswers(true))=>({requestId:randomUUID(),type:'tinetti',formVersion:TINETTI_VERSION,assessedAt:'2026-09-22T06:30:00.000Z',answers});
before(async()=>{
 fixture=await startPo12Fixture();
 const [{default:patients},{default:documents},{default:assessments}]=await Promise.all([import('../../backend/src/routes/patients.js'),import('../../backend/src/routes/patient-documents.js'),import('../../backend/src/routes/patient-assessments.js')]);
 const app=express();app.use(express.json());app.use('/patients',documents);app.use('/patients',assessments);app.use('/patients',patients);
 server=app.listen(0,'127.0.0.1');await new Promise<void>(ok=>server.once('listening',ok));base=`http://127.0.0.1:${server.address().port}/patients`;
});
after(async()=>{server?.closeAllConnections();if(server)await new Promise(ok=>server.close(ok));await fixture?.close()});
test('Tinetti HTTP partial-to-final archives20items/28points and preserves clinical instant on correction',async()=>{
 const created=await request('assessments',draft(tinettiAnswers()));assert.equal(created.status,201,JSON.stringify(created.body));let row=created.body.assessment;
 assert.equal(row.result,null);assert.equal(row.answeredCount,0);assert.equal(row.completion.missingPaths.length,20);
 assert.equal((await request(`assessments/${row.id}/finalize`,{requestId:randomUUID(),expectedVersion:row.version})).status,422);
 const answers={...tinettiAnswers(true),notes:'Nota sintetica con à è ì ò ù.\nSeconda riga.'};
 const patch=await request(`assessments/${row.id}`,{expectedVersion:row.version,assessedAt:row.assessedAt,answers},'PATCH');assert.equal(patch.status,200,JSON.stringify(patch.body));row=patch.body.assessment;
 assert.equal(row.result.balance,16);assert.equal(row.result.gait,12);assert.equal(row.result.total,28);assert.equal(row.result.riskBand,'low');
 const finalRequest={requestId:randomUUID(),expectedVersion:row.version};
 const final=await request(`assessments/${row.id}/finalize`,finalRequest);assert.equal(final.status,200,JSON.stringify(final.body));row=final.body.assessment;
 assert.equal(row.status,'final');assert.equal(row.finalSnapshot.items.length,20);assert.equal(row.finalSnapshot.notes,answers.notes);assert.equal(row.pdf.status,'ready');
 assert.equal((await request(`assessments/${row.id}/finalize`,finalRequest)).body.assessment.id,row.id);
 const archiveResponse=await request('documents');assert.equal(archiveResponse.status,200,JSON.stringify(archiveResponse.body));
 const archive=archiveResponse.body.documents;const doc=archive.find((d:any)=>d.id===row.pdf.documentId);assert.equal(doc.assessment.type,'tinetti');
 const pdf=await fetch(`${base}/${patient}/documents/${doc.id}/content`,{headers:headers()});assert.equal(pdf.status,200);const bytes=Buffer.from(await pdf.arrayBuffer());assert.equal(bytes.subarray(0,4).toString(),'%PDF');assert.equal(createHash('sha256').update(bytes).digest('hex'),doc.sha256);
 const correctedAnswers={...answers,alzarsi:0,tentativiAlzarsi:0,equilibrioSeduto:0};
 const correction=await request('assessments',{...draft(correctedAnswers),predecessorId:row.id,correctionReason:'Rettifica sintetica dei primi tre item'});assert.equal(correction.status,201,JSON.stringify(correction.body));
 const corrected=await request(`assessments/${correction.body.assessment.id}/finalize`,{requestId:randomUUID(),expectedVersion:correction.body.assessment.version});assert.equal(corrected.status,200,JSON.stringify(corrected.body));
 assert.equal(corrected.body.assessment.result.total,23);assert.equal(corrected.body.assessment.result.riskBand,'moderate');assert.equal(corrected.body.assessment.assessedAt,row.assessedAt);
 assert.equal((await request('assessments/current?type=tinetti')).body.assessment.id,corrected.body.assessment.id);
 assert.equal((await request(`assessments/${row.id}`)).body.assessment.result.total,28);
 assert.deepEqual((await request('cartella')).body.data.valutazioniTinetti,legacyTinetti);
 assert.equal((await request(`assessments/${row.id}`,undefined,'GET',fixtureActors.outsider)).status,404);
});
test('Cartella HTTP preserves omitted or equal legacy Tinetti and rejects changes explicitly',async()=>{
 const initial=(await request('cartella')).body.data;
 const {valutazioniTinetti:legacy,...other}=initial;
 const omitted=await request('cartella',{data:{...other,po12SyntheticNote:'Primo aggiornamento autorizzato'}},'PUT');assert.equal(omitted.status,200,JSON.stringify(omitted.body));assert.deepEqual(omitted.body.data.valutazioniTinetti,legacy);
 const equal=await request('cartella',{data:{...omitted.body.data,valutazioniTinetti:legacy.map((r:any)=>Object.fromEntries(Object.entries(r).reverse())),po12SyntheticNote:'Secondo aggiornamento autorizzato'}},'PUT');assert.equal(equal.status,200,JSON.stringify(equal.body));
 for(const changed of [[],[...legacy].reverse(),[...legacy,{...legacy[0],id:'invented'}]]){
  const denied=await request('cartella',{data:{...equal.body.data,valutazioniTinetti:changed,po12SyntheticNote:'Non deve essere scritto'}},'PUT');assert.equal(denied.status,409,JSON.stringify(denied.body));assert.equal(denied.body.code,'tinetti_legacy_read_only');
 }
 const final=(await request('cartella')).body.data;assert.deepEqual(final.valutazioniTinetti,legacy);assert.equal(final.po12SyntheticNote,'Secondo aggiornamento autorizzato');
});
