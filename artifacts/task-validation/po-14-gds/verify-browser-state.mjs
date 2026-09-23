import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='artifacts/task-validation/po-14-gds';
const bytes=await readFile(`${base}/preview/synthetic-state.json`);
const state=JSON.parse(bytes),rows=state.assessments.filter(row=>row.type==='gds15');
const finals=rows.filter(row=>row.status==='final');
assert.equal(finals.length,2,'Original and corrected final required');
const original=finals.find(row=>!row.predecessorId);
const correction=finals.find(row=>row.predecessorId===original?.id);
assert.ok(original);assert.ok(correction);
assert.equal(correction.assessedAt,original.assessedAt);
assert.equal(original.finalSnapshot.result.total,10);
assert.equal(correction.finalSnapshot.result.total,5);
assert.equal(original.finalSnapshot.result.band,'severe');
assert.equal(correction.finalSnapshot.result.band,'none');
for(const row of finals){
 const snapshot=row.finalSnapshot;
 assert.equal(snapshot.items.length,15);
 assert.equal(snapshot.result.maximum,15);
 assert.match(row.snapshotSha256,/^[a-f0-9]{64}$/);
 assert.equal(state.documents.filter(doc=>doc.assessmentId===row.id).length,1);
 const inverse=new Set(['q1','q5','q7','q11','q13']);
 for(const [index,item] of snapshot.items.entries()){
  assert.equal(item.id,`q${index+1}`);
  assert.equal(item.answer,row.id===original.id);
  assert.equal(item.description,item.answer?'Sì':'No');
  assert.equal(item.score,Number(inverse.has(item.id)?!item.answer:item.answer));
 }
 assert.equal(snapshot.items.reduce((total,item)=>total+item.score,0),snapshot.result.total);
 assert.match(snapshot.instruction,/settimana/i);
 assert.match(snapshot.screeningNote,/screening/i);
}
assert.deepEqual(state.cartelle,state.initialCartelle,'No automatic diagnosis or legacy chart mutation');
assert.equal(state.attestations.length,0);
const lost=state.requests.filter(req=>req.status===503);
for(const suffix of ['/assessments','/finalize'])assert.ok(lost.some(req=>req.path.endsWith(suffix)),`Missing lost response ${suffix}`);
for(const failed of lost)assert.ok(state.requests.some(req=>req.method===failed.method&&req.path===failed.path&&JSON.stringify(req.body)===JSON.stringify(failed.body)&&req.status===200),'Identical successful retry required');
assert.ok(rows.some(row=>row.patientId==='vitals-qa-bruno'&&row.status==='draft'),'Delayed save remains bound to Bruno');
await writeFile(`${base}/browser-state-receipt.json`,JSON.stringify({at:new Date().toISOString(),stateSha256:createHash('sha256').update(bytes).digest('hex'),assertions:'Fifteen explicit answers, inverse points, screening, immutable correction, unique PDFs, identical retries, patient isolation, unchanged Cartella',counts:{assessments:rows.length,finals:finals.length,documents:state.documents.length,attestations:state.attestations.length},originalId:original.id,correctionId:correction.id},null,2));
console.log(JSON.stringify({finals:finals.length,checks:'passed'}));
