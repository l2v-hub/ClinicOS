import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {randomUUID,createHash} from 'node:crypto';
import express from 'express';
import {startPo10Fixture,fixtureActors,painadEmpty,painadComplete} from '../fixtures/po10-assessments.mjs';

let fixture:any,server:any,base:string;
const patientA='vitals-qa-anna',patientB='vitals-qa-bruno';
const headers=(patientId:string,actor=fixtureActors.operator)=>({'Content-Type':'application/json','X-Operator-Id':actor.id,'X-Operator-Role':actor.role,'X-Demo-Patient-Id':patientId});
async function request(patientId:string,path:string,body?:unknown,actor=fixtureActors.operator,method=body===undefined?'GET':'POST'){
 const response=await fetch(`${base}/${patientId}/${path}`,{method,headers:headers(patientId,actor),...(body===undefined?{}:{body:JSON.stringify(body)})});
 const content=await response.text();
 assert.equal(response.headers.get('cache-control'),'private, no-store');
 return {status:response.status,body:content?JSON.parse(content):null};
}
const draft=(answers=painadEmpty)=>({requestId:randomUUID(),type:'painad',formVersion:'painad-it-2026-09-22-v1',assessedAt:'2026-09-23T06:30:00.000Z',answers});
before(async()=>{
 fixture=await startPo10Fixture();
 const [{default:patients},{default:documents},{default:assessments}]=await Promise.all([import('../../backend/src/routes/patients.js'),import('../../backend/src/routes/patient-documents.js'),import('../../backend/src/routes/patient-assessments.js')]);
 const app=express();app.use(express.json());app.use('/patients',documents);app.use('/patients',assessments);app.use('/patients',patients);
 server=app.listen(0,'127.0.0.1');await new Promise<void>(ok=>server.once('listening',ok));base=`http://127.0.0.1:${server.address().port}/patients`;
});
after(async()=>{server?.closeAllConnections();if(server)await new Promise(ok=>server.close(ok));await fixture?.close()});

test('draft replay, CAS, finalization and archive reopen preserve the same clinical snapshot',async()=>{
 const payload=draft();
 const created=await request(patientA,'assessments',payload);assert.equal(created.status,201,JSON.stringify(created.body));
 const id=created.body.assessment.id;
 assert.equal(created.body.assessment.result,null);assert.equal(created.body.assessment.answeredCount,0);
 const replay=await request(patientA,'assessments',payload);assert.equal(replay.body.assessment.id,id);assert.equal(replay.body.replayed,true);
 assert.equal((await request(patientA,`assessments/${id}`,undefined,fixtureActors.manager)).status,404);
 const patched=await request(patientA,`assessments/${id}`,{expectedVersion:created.body.assessment.version,assessedAt:payload.assessedAt,answers:painadComplete},fixtureActors.operator,'PATCH');
 assert.equal(patched.status,200);assert.equal(patched.body.assessment.result.total,10);
 assert.equal((await request(patientA,`assessments/${id}`,{expectedVersion:created.body.assessment.version,assessedAt:payload.assessedAt,answers:painadEmpty},fixtureActors.operator,'PATCH')).status,409);
 const finalize={requestId:randomUUID(),expectedVersion:patched.body.assessment.version};
 const final=await request(patientA,`assessments/${id}/finalize`,finalize);assert.equal(final.status,200,JSON.stringify(final.body));
 const saved=final.body.assessment;assert.equal(saved.status,'final');assert.equal(saved.result.total,10);assert.equal(saved.pdf.status,'ready');
 const clock=(await fixture.database.db.query('SELECT "createdAt", "assessedAt", "finalizedAt" FROM "PatientAssessment" WHERE id=$1',[id])).rows[0];
 for(const key of ['createdAt','assessedAt','finalizedAt'])assert.equal(saved[key],clock[key].toISOString(),`${key} must remain UTC in a Europe/Rome database session`);
 assert.ok(JSON.stringify(saved.finalSnapshot).includes('Dall’Acqua'));assert.ok(JSON.stringify(saved.finalSnapshot).includes('Anna Àgata'));
 const again=await request(patientA,`assessments/${id}/finalize`,finalize);assert.equal(again.body.assessment.id,id);assert.equal(again.body.replayed,true);
 const archive=await request(patientA,'documents');assert.equal(archive.status,200);const doc=archive.body.documents.find((d:any)=>d.id===saved.pdf.documentId);assert.ok(doc);assert.equal(doc.assessment.id,id);
 const bytesResponse=await fetch(`${base}/${patientA}/documents/${doc.id}/content`,{headers:headers(patientA)});
 assert.equal(bytesResponse.status,200);const bytes=Buffer.from(await bytesResponse.arrayBuffer());assert.equal(bytes.subarray(0,4).toString(),'%PDF');assert.equal(createHash('sha256').update(bytes).digest('hex'),doc.sha256);
 await fixture.prisma.patient.update({where:{id:patientA},data:{lastName:'Nome successivamente modificato'}});
 const reopened=await request(patientA,`assessments/${id}`);assert.deepEqual(reopened.body.assessment.finalSnapshot,saved.finalSnapshot);
 const pdfRetry=await request(patientA,`assessments/${id}/pdf/retry`,{});assert.equal(pdfRetry.body.assessment.pdf.documentId,doc.id);
 assert.equal(await fixture.prisma.patientDocument.count({where:{assessmentId:id}}),1);
});

test('incomplete answers never finalize and a correction creates a new immutable final',async()=>{
 const payload=draft({...painadComplete,consolability:null});
 const created=await request(patientB,'assessments',payload);assert.equal(created.status,201);
 const initial=created.body.assessment,id=initial.id;
 assert.equal((await request(patientB,`assessments/${id}/finalize`,{requestId:randomUUID(),expectedVersion:initial.version})).status,422);
 const patched=await request(patientB,`assessments/${id}`,{expectedVersion:initial.version,assessedAt:payload.assessedAt,answers:painadComplete},fixtureActors.operator,'PATCH');
 const final=(await request(patientB,`assessments/${id}/finalize`,{requestId:randomUUID(),expectedVersion:patched.body.assessment.version})).body.assessment;
 const correction=await request(patientB,'assessments',{...draft({...painadComplete,respiration:0}),predecessorId:id,correctionReason:'Rettifica sintetica della risposta respirazione'});assert.equal(correction.status,201);
 const corrected=(await request(patientB,`assessments/${correction.body.assessment.id}/finalize`,{requestId:randomUUID(),expectedVersion:correction.body.assessment.version})).body.assessment;
 assert.notEqual(corrected.id,id);assert.equal(corrected.result.total,8);assert.equal(corrected.predecessorId,id);
 const original=(await request(patientB,`assessments/${id}`)).body.assessment;assert.equal(original.result.total,10);assert.equal(original.correctedById,corrected.id);assert.deepEqual(original.finalSnapshot,final.finalSnapshot);
 await assert.rejects(fixture.prisma.patientAssessment.update({where:{id},data:{answers:painadEmpty}}));
 const reclassify=await request(patientB,`documents/${final.pdf.documentId}`,{documentType:'altro'},fixtureActors.operator,'PATCH');assert.equal(reclassify.status,409);assert.equal(reclassify.body.code,'assessment_document_immutable');
});

test('current patient scope protects finalized assessment bytes and metadata after ownership changes',async()=>{
 const created=await request(patientA,'assessments',draft(painadComplete));assert.equal(created.status,201);
 const id=created.body.assessment.id;
 const final=(await request(patientA,`assessments/${id}/finalize`,{requestId:randomUUID(),expectedVersion:created.body.assessment.version})).body.assessment;
 await fixture.prisma.patient.update({where:{id:patientA},data:{registeredById:fixtureActors.outsider.id}});
 assert.equal((await request(patientA,`assessments/${id}`)).status,404);
 const listing=await request(patientA,'documents');assert.equal(listing.status,200);assert.ok(!listing.body.documents.some((d:any)=>d.assessment));
 const bytes=await fetch(`${base}/${patientA}/documents/${final.pdf.documentId}/content`,{headers:headers(patientA)});assert.ok(bytes.status===403||bytes.status===404);
 const allowed=await request(patientA,`assessments/${id}`,undefined,fixtureActors.outsider);assert.equal(allowed.status,200);
});
