import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='artifacts/task-validation/po-15-catalogo',sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=await readFile(`${base}/preview/synthetic-state.json`),s=JSON.parse(bytes);
const before=s.initialCartelle.find(c=>c.patientId==='vitals-qa-anna').data;
const after=s.cartelle.find(c=>c.patientId==='vitals-qa-anna').data;
for(const key of ['valutazioniNRS','valutazioniTinetti','valutazioniBraden'])assert.deepEqual(after[key],before[key],key);
for(const key of ['medicazioniFerite','contenzioni']){
 assert.equal(after[key].length,before[key].length+1);
 for(const original of before[key])assert.deepEqual(after[key].find(v=>v.id===original.id),original);
}
for(const patientId of ['vitals-qa-bruno','vitals-qa-other'])
 assert.deepEqual(s.cartelle.find(c=>c.patientId===patientId),s.initialCartelle.find(c=>c.patientId===patientId));
assert.deepEqual(s.intakes,s.initialIntakes,'Original intake pain retained');
assert.equal(s.assessments.length,8);assert.equal(s.assessments.filter(r=>r.status==='final').length,5);
assert.equal(s.assessments.filter(r=>r.status==='draft'&&r.type==='painad').length,1);
assert.equal(s.documents.length,5);
for(const doc of s.documents)assert.equal(sha(await readFile(`${base}/qa-evidence/pdfs/${doc.id}.pdf`)),doc.sha256);
const lost=s.requests.find(r=>r.method==='POST'&&r.path.endsWith('/assessments')&&r.status===503);
assert.ok(lost);assert.ok(s.requests.some(r=>r.method===lost.method&&r.path===lost.path&&r.status===200&&JSON.stringify(r.body)===JSON.stringify(lost.body)));
assert.equal(s.printCaptures.length,2);
for(const [index,print] of s.printCaptures.entries()){
 assert.equal(print.surfaces.length,1);assert.ok(print.owner);
 assert.ok(print.surfaces[0].text.includes(index===0?'po15-nrs-zero':'po15-nrs-invalid'));
 assert.ok(!print.surfaces[0].text.includes(index===0?'po15-nrs-invalid':'po15-nrs-zero'));
}
const failedWrites=s.requests.filter(r=>['POST','PATCH','PUT','DELETE'].includes(r.method)&&r.status>=400);
assert.equal(failedWrites.length,2,'Only documented harness 400 and injected lost-response 503');
assert.ok(failedWrites.some(r=>r.status===400&&r.body.data==='vitals-qa-anna'));
const channel=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4};
const lum=a=>a.map(channel).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
const contrast=(lum([248,249,251])+.05)/(lum([22,32,46])+.05);
await writeFile(`${base}/browser-state-receipt.json`,JSON.stringify({at:new Date().toISOString(),stateSha256:sha(bytes),
 checks:'Legacy originals/NRS/Tinetti/Braden/intakes unchanged; two separate new legacy records; one idempotent draft; 5 PDF hashes; two isolated NRS print captures',
 counts:{assessments:8,finals:5,drafts:3,documents:5,printCaptures:2},catalogSecondaryButtonContrast:contrast,
 limitations:['NRS print interception checks DOM and cleanup, not physical printing','Archive multiprint prepared 5 documents/10 pages; physical print not exercised','Unrelated therapy-slots route absent in preview: GET404 retained','Harness callback first returned400; corrected signature before successful writes','Browser late intake change checks visible isolation; requests log records aborted response as null']},null,2));
console.log(JSON.stringify({checks:'passed',contrast}));
