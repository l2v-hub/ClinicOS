import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='artifacts/task-validation/po-13-mna';
const bytes=await readFile(`${base}/preview/synthetic-state.json`);
const state=JSON.parse(bytes), rows=state.assessments.filter(row=>row.type==='mna');
const finals=rows.filter(row=>row.status==='final');
assert.ok(finals.length>=2,'Need distinct screening and full finals');
const screening=finals.find(row=>row.answers.extent==='screening');
const full=finals.find(row=>row.answers.extent==='full');
assert.ok(screening);assert.ok(full);
assert.equal(screening.finalSnapshot.result.screening.maximum,14);
assert.equal(screening.finalSnapshot.result.total,null);
assert.equal(screening.finalSnapshot.answers.J,'three_meals');
assert.ok(Object.values(screening.finalSnapshot.answers.K).some(value=>value===true));
assert.ok(Object.values(screening.finalSnapshot.answers.K).some(value=>value===null));
const k=screening.finalSnapshot.items.find(item=>item.id==='K');
assert.equal(k.subitems.length,3);assert.equal(k.score,null);assert.equal(k.description,null);
assert.equal(full.finalSnapshot.result.total.maximum,30);
assert.equal(full.predecessorId,screening.id);
assert.equal(full.assessedAt,screening.assessedAt);
assert.equal(full.finalSnapshot.measurements.length,4);
assert.equal(full.finalSnapshot.answers.measurements.armCircumferenceCm,22);
assert.equal(full.finalSnapshot.answers.measurements.calfCircumferenceCm,31);
assert.equal(full.finalSnapshot.bmi,19);assert.equal(full.finalSnapshot.result.total.score,27.5);
assert.deepEqual(full.finalSnapshot.answers.F,{method:'measured'});
assert.deepEqual(full.finalSnapshot.answers.Q,{method:'measured'});
assert.deepEqual(full.finalSnapshot.answers.R,{method:'measured'});
assert.equal(full.finalSnapshot.answers.measurementDates.weightKg,'2026-09-21');
assert.ok(state.requests.every(request=>!JSON.stringify(request.body??{}).includes('2026-02-30')&&!JSON.stringify(request.body??{}).includes('abc')),'Invalid raw input must not be transmitted');
for(const row of finals){
 assert.match(row.snapshotSha256,/^[a-f0-9]{64}$/);
 assert.equal(state.documents.filter(doc=>doc.assessmentId===row.id).length,1);
 assert.equal(row.finalSnapshot.references.length,3);
 assert.equal(row.finalSnapshot.items.length,18);
}
assert.deepEqual(state.cartelle,state.initialCartelle,'Assessment flow must not write legacy cartella');
assert.equal(state.attestations.length,0);
const lost=state.requests.filter(req=>req.status===503);
assert.ok(lost.some(req=>req.path.endsWith('/assessments')),'Creation response loss must be exercised');
assert.ok(lost.some(req=>req.path.endsWith('/finalize')),'Finalization response loss must be exercised');
for(const failed of lost){
 const matches=state.requests.filter(req=>req.method===failed.method&&req.path===failed.path&&
  JSON.stringify(req.body)===JSON.stringify(failed.body)&&req.status===200);
 assert.ok(matches.length,`Need identical retry ${failed.path}`);
}
assert.ok(rows.some(row=>row.patientId==='vitals-qa-bruno'&&row.status==='draft'),'Slow save must remain on Bruno');
await writeFile(`${base}/browser-state-receipt.json`,JSON.stringify({
 at:new Date().toISOString(),stateSha256:createHash('sha256').update(bytes).digest('hex'),
 assertions:'Screening/full snapshots, Kpartial, anthropometry, immutable correction, unique PDFs, identical retries, patient-bound slow save, unchanged Cartella',
 counts:{assessments:rows.length,finals:finals.length,documents:state.documents.length,attestations:state.attestations.length},
 screeningId:screening.id,fullId:full.id,
},null,2));
console.log(JSON.stringify({finals:finals.length,screening:screening.id,full:full.id,checks:'passed'}));
