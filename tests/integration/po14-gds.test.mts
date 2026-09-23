import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {randomUUID,createHash} from 'node:crypto';
import express from 'express';
import {startPo14Fixture,fixtureActors,gdsAnswers,GDS_VERSION} from '../fixtures/po14-gds.mjs';
let fixture:any,server:any,base:string;
const patient='vitals-qa-anna';
const headers=(actor=fixtureActors.operator)=>({'Content-Type':'application/json','X-Operator-Id':actor.id,'X-Operator-Role':actor.role,'X-Demo-Patient-Id':patient});
async function request(path:string,body?:unknown,method=body===undefined?'GET':'POST',actor=fixtureActors.operator){
 const response=await fetch(`${base}/${patient}/${path}`,{method,headers:headers(actor),...(body===undefined?{}:{body:JSON.stringify(body)})});
 const text=await response.text();return {status:response.status,body:text?JSON.parse(text):null};
}
const draft=(answers=gdsAnswers())=>({requestId:randomUUID(),type:'gds15',formVersion:GDS_VERSION,assessedAt:'2026-09-22T06:30:00.000Z',answers});
before(async()=>{
 fixture=await startPo14Fixture();
 const [{default:patients},{default:documents},{default:assessments}]=await Promise.all([import('../../backend/src/routes/patients.js'),import('../../backend/src/routes/patient-documents.js'),import('../../backend/src/routes/patient-assessments.js')]);
 const app=express();app.use(express.json());app.use('/patients',documents);app.use('/patients',assessments);app.use('/patients',patients);
 server=app.listen(0,'127.0.0.1');await new Promise<void>(ok=>server.once('listening',ok));base=`http://127.0.0.1:${server.address().port}/patients`;
});
after(async()=>{server?.closeAllConnections();if(server)await new Promise(ok=>server.close(ok));await fixture?.close()});
test('GDS15 HTTP rejects incomplete final and archives all fifteen answers with the screening interpretation',async()=>{
 const before=(await request('cartella')).body.data;
 const created=await request('assessments',draft());assert.equal(created.status,201,JSON.stringify(created.body));let row=created.body.assessment;
 assert.equal(row.result,null);assert.equal(row.answeredCount,0);assert.equal(row.completion.missingPaths.length,15);
 assert.equal((await request(`assessments/${row.id}/finalize`,{requestId:randomUUID(),expectedVersion:row.version})).status,422);
 const answers={...gdsAnswers(true),notes:'Risposte sintetiche riferite all’ultima settimana.\nNessuna diagnosi automatica.'};
 const patched=await request(`assessments/${row.id}`,{expectedVersion:row.version,assessedAt:row.assessedAt,answers},'PATCH');assert.equal(patched.status,200,JSON.stringify(patched.body));row=patched.body.assessment;
 assert.equal(row.result.total,10);assert.equal(row.answeredCount,15);
 const finalRequest={requestId:randomUUID(),expectedVersion:row.version};
 const final=await request(`assessments/${row.id}/finalize`,finalRequest);assert.equal(final.status,200,JSON.stringify(final.body));row=final.body.assessment;
 assert.equal(row.status,'final');assert.equal(row.finalSnapshot.items.length,15);assert.equal(row.finalSnapshot.notes,answers.notes);assert.equal(row.pdf.status,'ready');
 assert.equal((await request(`assessments/${row.id}/finalize`,finalRequest)).body.assessment.id,row.id);
 const archiveResponse=await request('documents');assert.equal(archiveResponse.status,200,JSON.stringify(archiveResponse.body));
 const doc=archiveResponse.body.documents.find((d:any)=>d.id===row.pdf.documentId);assert.equal(doc.assessment.type,'gds15');
 const pdf=await fetch(`${base}/${patient}/documents/${doc.id}/content`,{headers:headers()});assert.equal(pdf.status,200);const bytes=Buffer.from(await pdf.arrayBuffer());assert.equal(bytes.subarray(0,4).toString(),'%PDF');assert.equal(createHash('sha256').update(bytes).digest('hex'),doc.sha256);
 assert.deepEqual((await request('cartella')).body.data,before);
 assert.equal((await request(`assessments/${row.id}`,undefined,'GET',fixtureActors.outsider)).status,404);
});
test('GDS15 correction keeps the prior final and clinical date, while all No yields five rather than zero',async()=>{
 const current=await request('assessments/current?type=gds15');assert.equal(current.status,200);const previous=current.body.assessment;assert.ok(previous);
 const original=(await request(`assessments/${previous.id}`)).body.assessment;
 const created=await request('assessments',{...draft(gdsAnswers(false)),predecessorId:previous.id,correctionReason:'Rettifica sintetica delle risposte'});assert.equal(created.status,201,JSON.stringify(created.body));
 const correction=created.body.assessment;assert.equal(correction.result.total,5);
 const final=await request(`assessments/${correction.id}/finalize`,{requestId:randomUUID(),expectedVersion:correction.version});assert.equal(final.status,200,JSON.stringify(final.body));
 assert.equal(final.body.assessment.assessedAt,original.assessedAt);assert.equal(final.body.assessment.result.total,5);
 assert.deepEqual((await request(`assessments/${previous.id}`)).body.assessment.finalSnapshot,original.finalSnapshot);
 assert.equal((await request('assessments/current?type=gds15')).body.assessment.id,correction.id);
 assert.equal(await fixture.prisma.patientDocument.count({where:{patientId:patient,assessmentId:{not:null}}}),2);
});
