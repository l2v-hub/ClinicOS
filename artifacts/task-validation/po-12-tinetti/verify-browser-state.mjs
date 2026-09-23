import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const folder='artifacts/task-validation/po-12-tinetti';
const state=JSON.parse(await readFile(`${folder}/preview/synthetic-state.json`,'utf8'));
const finals=state.assessments.filter(a=>a.status==='final'),drafts=state.assessments.filter(a=>a.status==='draft');
assert.equal(finals.length,2);assert.equal(drafts.length,1);assert.equal(state.documents.length,2);
const original=finals.find(a=>!a.predecessorId),corrected=finals.find(a=>a.predecessorId);
assert.equal(original.finalSnapshot.result.total,28);assert.equal(corrected.finalSnapshot.result.total,23);
assert.equal(corrected.finalSnapshot.result.riskBand,'moderate');assert.equal(corrected.predecessorId,original.id);
assert.equal(corrected.assessedAt,original.assessedAt);
for(const item of finals){assert.equal(item.finalSnapshot.items.length,20);assert.equal(item.pdfStatus,'ready');assert.equal(item.patientId,'vitals-qa-anna')}
assert.deepEqual(state.cartelle,state.initialCartelle);
assert.equal(drafts[0].patientId,'vitals-qa-bruno');assert.equal(drafts[0].answers.notes,'Bozza di Bruno, risposta lenta.');
assert.equal(drafts[0].answers.equilibrioSeduto,1);assert.equal(drafts[0].answers.alzarsi,null);
assert.equal(state.attestations.length,0);
assert.equal(new Set(state.documents.map(d=>d.assessmentId)).size,2);
for(const doc of state.documents){assert.equal(doc.patientId,'vitals-qa-anna');assert.ok(finals.find(a=>a.id===doc.assessmentId))}
for(const suffix of ['/assessments','/finalize']){
 const requests=state.requests.filter(r=>r.method==='POST'&&r.path.endsWith(suffix));
 const lost=requests.find(r=>r.status===503);assert.ok(lost);
 assert.ok(requests.find(r=>r!==lost&&r.path===lost.path&&r.status===200&&JSON.stringify(r.body)===JSON.stringify(lost.body)));
}
const responsive=JSON.parse(await readFile(`${folder}/qa-evidence/responsive.json`,'utf8'));
for(const key of ['mobile','tablet']){const m=responsive[key];assert.ok(m.scrollWidth<=m.width);assert.equal(m.identity.top,64);assert.ok(m.focus.top>m.identity.bottom)}
assert.ok(responsive.desktop.focus.top>responsive.desktop.identity.bottom);
const print=JSON.parse(await readFile(`${folder}/qa-evidence/legacy-print-geometry.json`,'utf8'));
assert.equal(print.rows,20);assert.equal(print.visibleDetails,1);assert.ok(print.ancestors.every(a=>a.overflow==='visible'&&a.height===a.scrollHeight));
const files=[];
async function walk(path){for(const e of await readdir(path,{withFileTypes:true})){const p=`${path}/${e.name}`;if(e.isDirectory())await walk(p);else{const bytes=await readFile(p);files.push({path:p,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})}}}
await walk(`${folder}/preview/build`);
await writeFile(`${folder}/preview-build-manifest.json`,JSON.stringify({files},null,2));
const receipt={at:new Date().toISOString(),syntheticOnly:true,finals:2,drafts:1,documents:2,legacyJsonUnchanged:true,retryWithoutDuplicates:true,slowPatientSwitch:true,
 responsive:'390/768: identity below64px topbar and focus clear; desktop geometry preserved',
 legacyPrint:'Real selected DOM with extracted print rules rendered on screen;20 rows, one record, unclipped ancestors',
 limitations:['Native print dialog and physical pagination not exercised.','No clinical operator or physical-device acceptance claimed.']};
await writeFile(`${folder}/browser-state-receipt.json`,JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
