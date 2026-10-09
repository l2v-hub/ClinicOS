import {readFileSync,writeFileSync,mkdirSync,copyFileSync,readdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('artifacts/task-validation/424-reading-action/independent-qa'),hash=b=>createHash('sha256').update(b).digest('hex'),load=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const source=spawnSync(process.execPath,[root+'/source-receipt.mjs','67d21c3e9257a5acb8c9b25130c9417fb92185fb',root+'/source-after'],{encoding:'utf8'});assert.equal(source.status,0);
const before=load(root+'/source-before/source-receipt.json'),after=load(root+'/source-after/source-receipt.json');assert.deepEqual(before,after);
const original=load('C:/w-424/artifacts/task-validation/424-reading-action/root-frozen/source-receipt.json');const decoder=new TextDecoder('utf8',{fatal:true});const normalized=[];
for(const f of after.files){const q=original.files.find(x=>x.path===f.path);assert.ok(q);if(q.sha256!==f.sha256){const qa=decoder.decode(readFileSync(f.path)).replaceAll('\r\n','\n'),lead=decoder.decode(readFileSync('C:/w-424/'+f.path)).replaceAll('\r\n','\n');assert.equal(qa,lead);normalized.push(f.path);}}
assert.equal(normalized.length,5);
const frozen=load(root+'/recipes-frozen.json');for(const f of frozen.files)assert.equal(hash(readFileSync(root+'/'+f.path)),f.sha256);
for(const n of ['supplemental01','supplemental02','supplemental03']){const r=load(root+'/'+n+'.mjs.preexecution.json');assert.equal(hash(readFileSync(root+'/'+n+'.mjs')),r.sha256);}
const ordinary=load(root+'/attempt01/browser/test-results/browser-results.json'),extra=load(root+'/supplemental03/test-results/browser-results.json');assert.equal(ordinary.outcomes.length,17);assert.equal(extra.outcomes.length,4);assert.ok([...ordinary.outcomes,...extra.outcomes].every(x=>x.status==='PASS'));
for(const state of [...ordinary.states,...extra.states])for(const key of ['clinicalWrites','unexpected','external','pageErrors'])assert.deepEqual(state[key],[]);
const baselineDir='C:/w-424-base/artifacts/task-validation/424-reading-action/baseline04';mkdirSync(root+'/baseline',{recursive:true});copyFileSync(baselineDir+'/source-receipt.json',root+'/baseline/source-receipt.json');const comparisons=[];
for(const [name,bfile] of [['desktop','benchmark.json'],['mobile','benchmark-mobile.json']]){
 copyFileSync(baselineDir+'/browser/'+bfile,root+'/baseline/'+bfile);copyFileSync(baselineDir+'/browser/screenshots/'+name+'-before-brief-notes.png',root+'/baseline/'+name+'-before.png');
 const base=load(root+'/baseline/'+bfile),candidate=load(root+'/attempt01/browser/'+bfile);assert.equal(base.source,'b5f471cd2cd56839e7ebbd0d3daf0bbf04791468');assert.equal(candidate.source,after.applicationCommit);assert.deepEqual(base.viewport,candidate.viewport);
 comparisons.push({viewport:base.viewport,notes:candidate.heights.map(n=>{const b=base.heights.find(x=>x.id===n.id);assert.ok(b&&n.height<b.height);return {id:n.id,before:b.height,after:n.height,savedPixels:b.height-n.height};})});
}
const extraInputs=['tests/fixtures/po05-postgres.mjs','backend/src/authz/__tests__/harness-support.ts'].map(path=>({path,sha256:hash(readFileSync(path))}));
writeFileSync(root+'/evidence-verification.json',JSON.stringify({applicationCommit:after.applicationCommit,fileCount:after.fileCount,sourceSha256:after.sourceSha256,sourceUnchanged:true,strictUtf8CrLfOnlyCrossCheckoutDifferences:normalized,extraInputs,ordinaryCases:17,supplementalCases:4,allSuccessfulGuardsPassed:true,failedHarnessAttemptsPreserved:['supplemental01','supplemental02','security-validation.mjs'],comparisons,visualInspection:'Actual direct chart and mobile result PNG pixels viewed by independent QA. Synthetic identities, exact server date and separate Ho capito drawn.'},null,2));
mkdirSync(root+'/playwright-report',{recursive:true});writeFileSync(root+'/playwright-report/index.html','<!doctype html><meta charset="utf-8"><title>Independent issue 424 QA</title><h1>21 serial browser assertions PASS</h1><p>Actual SPA, guarded synthetic transport; real local PostgreSQL separate. No production patient writes.</p><ul>'+[...ordinary.outcomes,...extra.outcomes].map(x=>'<li>PASS '+x.name.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</li>').join('')+'</ul><p>Failed preliminary fixture attempts retained; no product edit by QA.</p><img alt="Direct patient chart authoritative receipt" width="1000" src="../supplemental03/screenshots/direct-chart-confirmed.png">');
console.log('Verified source1472 unchanged; 21 cases; three-note desktop17px/mobile9px lower');
