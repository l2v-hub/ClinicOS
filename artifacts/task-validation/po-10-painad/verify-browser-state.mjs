import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const folder='artifacts/task-validation/po-10-painad';
const state=JSON.parse(await readFile(`${folder}/preview/synthetic-state.json`,'utf8'));
const finals=state.assessments.filter(a=>a.status==='final'),drafts=state.assessments.filter(a=>a.status==='draft');
assert.equal(finals.length,2);assert.equal(drafts.length,2);assert.equal(state.documents.length,2);
assert.equal(new Set(state.documents.map(d=>d.assessmentId)).size,2);
for(const doc of state.documents){
 const assessment=finals.find(a=>a.id===doc.assessmentId);assert.ok(assessment);
 assert.equal(doc.patientId,assessment.patientId);assert.equal(assessment.pdfStatus,'ready');
}
const original=finals.find(a=>!a.predecessorId),corrected=finals.find(a=>a.predecessorId);
assert.equal(corrected.predecessorId,original.id);assert.equal(corrected.assessedAt,original.assessedAt);
assert.equal(original.finalSnapshot.result.total,4);assert.equal(corrected.finalSnapshot.result.total,3);
assert.equal(original.answers.consolability,2);assert.equal(corrected.answers.consolability,1);
const bruno=drafts.find(a=>a.patientId==='vitals-qa-bruno');assert.equal(bruno.answers.respiration,2);
assert.equal(Object.values(bruno.answers).filter(v=>v!==null).length,1);
const create=state.requests.filter(r=>r.method==='POST'&&/\/assessments$/.test(r.path));
const finalRequests=state.requests.filter(r=>r.method==='POST'&&r.path.endsWith('/finalize'));
for(const requests of [create,finalRequests]){
 const lost=requests.find(r=>r.status===503);assert.ok(lost);
 const replay=requests.find(r=>r!==lost&&r.body.requestId===lost.body.requestId&&r.status===200);assert.ok(replay);
 assert.deepEqual(replay.body,lost.body);
}
const result={at:new Date().toISOString(),assessments:state.assessments.length,finals:finals.length,drafts:drafts.length,
 documents:state.documents.length,createResponseLoss:'same request replayed',finalizeResponseLoss:'same request replayed',
 correction:'new immutable record, original instant and answers retained',slowPatientSwitch:'Bruno response kept on Bruno',
 noDuplicateDocuments:true,syntheticOnly:true};
await writeFile(`${folder}/browser-state-receipt.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
