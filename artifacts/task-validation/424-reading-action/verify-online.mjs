import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='artifacts/task-validation/424-reading-action',read=p=>JSON.parse(readFileSync(root+'/'+p)),deployment=read('deployment-receipt.json'),snapshot=read('compiled-online/pre-run/deployment-receipt.json'),results=read('compiled-online/browser/test-results/browser-results.json');
assert.equal(deployment.applicationCommit,'67d21c3e9257a5acb8c9b25130c9417fb92185fb');
assert.equal(deployment.vercel.bundleSha256,snapshot.vercel.bundleSha256);
assert.equal(results.outcomes.length,17);assert.ok(results.outcomes.every(r=>r.status==='PASS'));
const supplemental=read('compiled-online/supplemental/test-results/browser-results.json');assert.equal(supplemental.outcomes.length,4);assert.ok(supplemental.outcomes.every(r=>r.status==='PASS'));
for(const guard of [...results.states,...supplemental.states]){
  for(const key of ['pageErrors','unexpected','external','clinicalWrites'])assert.deepEqual(guard[key],[]);
  assert.ok(guard.httpErrors.every(error=>[503,409].includes(error.status)&&(/\/ack$/.test(error.path)||error.path==='/patients/diary-unread-patient-counts')));
  assert.deepEqual(guard.errors.filter(error=>!/Failed to load resource.*(503|409)/.test(error)),[]);
  assert.ok(guard.allowedSyntheticReceipts.every(r=>['read','urgency'].includes(r.purpose)));
}
for(const f of read('compiled-online/pre-run/recipes.json').files)assert.equal(createHash('sha256').update(readFileSync(root+'/compiled-online/pre-run/recipes/'+f.name)).digest('hex'),f.sha256);
const current=await fetch(deployment.vercel.bundleUrl);assert.equal(current.status,200);assert.equal(createHash('sha256').update(Buffer.from(await current.arrayBuffer())).digest('hex'),snapshot.vercel.bundleSha256);
const receipt={applicationCommit:deployment.applicationCommit,deployment:deployment.vercel.id,bundleSha256:deployment.vercel.bundleSha256,cases:21,ordinary:17,supplemental:4,decision:'COMPILED ONLINE ACCEPTANCE VERIFIED',beforeAfterBundleUnchanged:true,allClinicalApisInterceptedBeforeWire:true,productionPatientTestMutations:0,apiReload:'In-memory synthetic UI transport only; actual durable reading contract separately tested with12 fresh localPostgreSQL tests'};
writeFileSync(root+'/compiled-online/online-receipt.json',JSON.stringify(receipt,null,2));
const escaped=JSON.stringify([...results.outcomes,...supplemental.outcomes],null,2).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
writeFileSync(root+'/compiled-online/playwright-report.html',`<!doctype html><meta charset="utf-8"><title>424 compiled assertion receipt</title><h1>21 Playwright-library assertions, actual deployed static build</h1><p>Only synthetic in-memory APIs, no real patient mutation; this is an assertion receipt, not Playwright Test runner HTML.</p><pre>${escaped}</pre>`);
console.log(JSON.stringify(receipt));
