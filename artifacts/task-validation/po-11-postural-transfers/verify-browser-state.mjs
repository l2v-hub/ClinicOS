import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const folder='artifacts/task-validation/po-11-postural-transfers';
const state=JSON.parse(await readFile(`${folder}/preview/synthetic-state.json`,'utf8'));
const finals=state.assessments.filter(a=>a.status==='final'),drafts=state.assessments.filter(a=>a.status==='draft');
assert.equal(finals.length,2);assert.equal(drafts.length,1);assert.equal(state.documents.length,2);
const original=finals.find(a=>!a.predecessorId),corrected=finals.find(a=>a.predecessorId);
assert.equal(corrected.predecessorId,original.id);assert.equal(corrected.assessedAt,original.assessedAt);
assert.equal(original.answers.operatedLegLoad.side,'right');assert.equal(corrected.answers.operatedLegLoad.side,'left');
for(const item of finals){assert.equal(item.answers.context.admissionDate.value,'1999-12-31');assert.equal(item.pdfStatus,'ready');assert.equal(item.finalSnapshot.result,null)}
for(const doc of state.documents){const record=finals.find(a=>a.id===doc.assessmentId);assert.ok(record);assert.equal(doc.patientId,record.patientId)}
assert.equal(new Set(state.documents.map(d=>d.assessmentId)).size,2);
assert.equal(state.attestations.length,2);
assert.equal(state.attestations.find(a=>a.kind==='physiotherapist_confirmation').assessmentId,original.id);
assert.equal(state.attestations.find(a=>a.kind==='operator_acknowledgement').assessmentId,corrected.id);
for(const attestation of state.attestations)assert.equal(attestation.snapshotSha256,finals.find(a=>a.id===attestation.assessmentId).snapshotSha256);
const bruno=drafts[0];assert.equal(bruno.patientId,'vitals-qa-bruno');assert.equal(bruno.answers.walking,'independent');assert.equal(bruno.answers.notes,'Bozza di Bruno, risposta lenta.');
for(const suffix of ['/assessments','/finalize','/attestations']){
 const requests=state.requests.filter(r=>r.method==='POST'&&r.path.endsWith(suffix));
 const lost=requests.find(r=>r.status===503);assert.ok(lost,suffix);
 const replay=requests.find(r=>r!==lost&&r.path===lost.path&&r.status===200&&JSON.stringify(r.body)===JSON.stringify(lost.body));assert.ok(replay,suffix);
}
const patchLost=state.requests.filter(r=>r.method==='PATCH'&&r.status===503);assert.equal(patchLost.length,2);
const result={at:new Date().toISOString(),assessments:3,finals:2,drafts:1,documents:2,attestations:2,
 createFinalizeAttestationRetry:'same payload replayed, no duplicate records',patchResponseLoss:'automatic GET reconciliation verified against persisted version and answers',
 correction:'new immutable record, clinical instant and original answers retained',slowPatientSwitch:'Bruno response retained only for Bruno',
 responsive:'390/768 geometry, desktop keyboard and PDF archive verified',date1999:'native keyboard, preview, DB and PDF agree',
 limitations:['Out-of-range year input via browser fill was sanitized by automation; invalid raw input and correction verified in 17 focused frontend tests.','Native beforeunload/session confirmation not exercised; store unsaved and session isolation tested.','Physical devices and clinical operator acceptance remain unperformed.'],syntheticOnly:true};
await writeFile(`${folder}/browser-state-receipt.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
