import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {randomUUID,createHash} from 'node:crypto';
import express from 'express';
import {startPo11Fixture,fixtureActors,transfersAnswers,TRANSFERS_VERSION} from '../fixtures/po11-transfers.mjs';
import {painadComplete} from '../fixtures/po10-assessments.mjs';

let fixture:any,server:any,base:string;
const patientA='vitals-qa-anna',patientB='vitals-qa-bruno';
const headers=(patientId:string,actor=fixtureActors.operator)=>({'Content-Type':'application/json','X-Operator-Id':actor.id,'X-Operator-Role':actor.role,'X-Demo-Patient-Id':patientId});
async function request(patientId:string,path:string,body?:unknown,actor=fixtureActors.operator,method=body===undefined?'GET':'POST'){
 const response=await fetch(`${base}/${patientId}/${path}`,{method,headers:headers(patientId,actor),...(body===undefined?{}:{body:JSON.stringify(body)})});
 const content=await response.text();
 assert.equal(response.headers.get('cache-control'),'private, no-store');
 return {status:response.status,body:content?JSON.parse(content):null};
}
const draft=(answers=transfersAnswers(true),assessedAt='2026-09-22T06:30:00.000Z')=>({requestId:randomUUID(),type:'postural_transfers',formVersion:TRANSFERS_VERSION,assessedAt,answers});
async function finalize(patientId:string,payload:any){
 const created=await request(patientId,'assessments',payload);assert.equal(created.status,201,JSON.stringify(created.body));
 const final=await request(patientId,`assessments/${created.body.assessment.id}/finalize`,{requestId:randomUUID(),expectedVersion:created.body.assessment.version});
 assert.equal(final.status,200,JSON.stringify(final.body));assert.equal(final.body.assessment.status,'final');return final.body.assessment;
}
before(async()=>{
 fixture=await startPo11Fixture();
 const [{default:patients},{default:documents},{default:assessments}]=await Promise.all([import('../../backend/src/routes/patients.js'),import('../../backend/src/routes/patient-documents.js'),import('../../backend/src/routes/patient-assessments.js')]);
 const app=express();app.use(express.json());app.use('/patients',documents);app.use('/patients',assessments);app.use('/patients',patients);
 server=app.listen(0,'127.0.0.1');await new Promise<void>(ok=>server.once('listening',ok));base=`http://127.0.0.1:${server.address().port}/patients`;
});
after(async()=>{server?.closeAllConnections();if(server)await new Promise(ok=>server.close(ok));await fixture?.close()});

test('HTTP Transfers keeps partial answers, reports missing paths and archives a complete score-free snapshot',async()=>{
 const payload=draft(transfersAnswers());const created=await request(patientA,'assessments',payload);
 assert.equal(created.status,201,JSON.stringify(created.body));const assessment=created.body.assessment;
 assert.equal(assessment.result,null);assert.equal(assessment.completion.complete,false);assert.ok(assessment.completion.missingPaths.length);
 const replay=await request(patientA,'assessments',payload);assert.equal(replay.body.assessment.id,assessment.id);
 const incomplete=await request(patientA,`assessments/${assessment.id}/finalize`,{requestId:randomUUID(),expectedVersion:assessment.version});
 assert.equal(incomplete.status,422);assert.equal(incomplete.body.code,'assessment_incomplete');
 const answers=transfersAnswers(true);answers.context.admissionDate.value='1999-12-31';answers.operatedLegLoad={applicable:true,side:'right',level:'touch_down'};
 answers.transfers={bedToWheelchair:'hoist_two_operators',wheelchairToBed:'one_operator_axillary',toilet:'two_operators'};
 answers.aids.wheelchair={selected:true,ownership:'facility'};answers.notes='Prova sintetica: à è ì ò ù — α β.\nSeconda riga conservata.';
 const patched=await request(patientA,`assessments/${assessment.id}`,{expectedVersion:assessment.version,assessedAt:payload.assessedAt,answers},fixtureActors.operator,'PATCH');
 assert.equal(patched.status,200,JSON.stringify(patched.body));assert.equal(patched.body.assessment.completion.complete,true);
 const command={requestId:randomUUID(),expectedVersion:patched.body.assessment.version};
 const saved=(await request(patientA,`assessments/${assessment.id}/finalize`,command)).body.assessment;
 assert.equal(saved.status,'final');assert.equal(saved.result,null);assert.equal(saved.pdf.status,'ready');assert.match(saved.snapshotSha256,/^[a-f0-9]{64}$/);
 assert.deepEqual(saved.answers,answers);assert.ok(saved.finalSnapshot.sections.length>=5);assert.ok(JSON.stringify(saved.finalSnapshot).includes('Dall’Acqua'));
 assert.equal((await request(patientA,`assessments/${assessment.id}/finalize`,command)).body.assessment.id,saved.id);
 const archive=(await request(patientA,'documents')).body.documents;const document=archive.find((d:any)=>d.id===saved.pdf.documentId);
 assert.equal(document.assessment.type,'postural_transfers');assert.equal(document.assessment.id,saved.id);
 const response=await fetch(`${base}/${patientA}/documents/${document.id}/content`,{headers:headers(patientA)});
 assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.subarray(0,4).toString(),'%PDF');assert.equal(createHash('sha256').update(bytes).digest('hex'),document.sha256);
});

test('current ignores a late correction of an older clinical evaluation and never borrows PAINAD',async()=>{
 const older=await finalize(patientB,draft(transfersAnswers(true),'2026-09-20T06:00:00.000Z'));
 const recent=await finalize(patientB,draft(transfersAnswers(true),'2026-09-22T06:00:00.000Z'));
 const corrected=await finalize(patientB,{...draft(transfersAnswers(true),older.assessedAt),predecessorId:older.id,correctionReason:'Rettifica sintetica della valutazione precedente'});
 assert.equal(corrected.predecessorId,older.id);
 const current=await request(patientB,'assessments/current?type=postural_transfers');assert.equal(current.status,200,JSON.stringify(current.body));assert.equal(current.body.assessment.id,recent.id);
 await finalize(patientB,{requestId:randomUUID(),type:'painad',formVersion:'painad-it-2026-09-22-v1',assessedAt:'2026-09-23T06:00:00.000Z',answers:painadComplete});
 assert.equal((await request(patientB,'assessments/current?type=postural_transfers')).body.assessment.id,recent.id);
 const history=await request(patientB,'assessments?type=postural_transfers&limit=1');assert.equal(history.status,200);assert.ok(!JSON.stringify(history.body).includes('"type":"painad"'));
});

test('personal attestations bind the persisted snapshot and DB qualification without changing its PDF',async()=>{
 const saved=await finalize(patientA,draft());const path=`assessments/${saved.id}/attestations`;
 const body={kind:'physiotherapist_confirmation',snapshotSha256:saved.snapshotSha256};
 const denied=await request(patientA,path,body,fixtureActors.manager);assert.equal(denied.status,403,JSON.stringify(denied.body));
 assert.equal((await request(patientA,path,{...body,snapshotSha256:'0'.repeat(64)})).status,409);
 const first=await request(patientA,path,body);assert.equal(first.status,201,JSON.stringify(first.body));
 const replay=await request(patientA,path,body);assert.equal(replay.status,200);assert.equal(replay.body.attestation.id,first.body.attestation.id);
 assert.equal(first.body.attestation.snapshotSha256,saved.snapshotSha256);
 const ack=await request(patientA,path,{kind:'operator_acknowledgement',snapshotSha256:saved.snapshotSha256},fixtureActors.manager);assert.equal(ack.status,201,JSON.stringify(ack.body));
 const listing=await request(patientA,path);assert.equal(listing.status,200);assert.equal(listing.body.items.length,2);assert.equal(listing.body.snapshotSha256,saved.snapshotSha256);
 const after=(await request(patientA,`assessments/${saved.id}`)).body.assessment;
 assert.deepEqual(after.finalSnapshot,saved.finalSnapshot);assert.equal(after.pdf.documentId,saved.pdf.documentId);assert.equal(after.snapshotSha256,saved.snapshotSha256);
 const corrected=await finalize(patientA,{...draft(),predecessorId:saved.id,correctionReason:'Nuova revisione sintetica'});
 assert.equal((await request(patientA,`assessments/${corrected.id}/attestations`)).body.items.length,0);
 assert.equal((await request(patientA,path)).body.correctedById,corrected.id);
 await fixture.prisma.patient.update({where:{id:patientA},data:{registeredById:fixtureActors.outsider.id}});
 assert.equal((await request(patientA,path,body)).status,404);
});
