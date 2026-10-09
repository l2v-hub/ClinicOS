import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const root='artifacts/task-validation/415-catalog-purpose';
const read=path=>JSON.parse(readFileSync(`${root}/${path}`,'utf8'));
const source=read('root-rerun/source/source-receipt.json');
const qa=read('independent-qa415/evidence-manifest.json');
assert.equal(qa.verdict,'READY FOR CODEX QA');
assert.equal(qa.applicationCommit,source.applicationCommit);
assert.equal(qa.sourceSha256,source.sourceSha256);
assert.equal(source.applicationCommit,'0d7adc361b92c8466655d9ed830d2b87bbd0f419');
assert.equal(source.sourceSha256,'6be776fab17aae587589b039db30f5df3be8d6a8e7910cfd5be6f0863b3b6902');
for(const file of qa.files)assert.equal(createHash('sha256').update(readFileSync(resolve(root,'independent-qa415',file.path))).digest('hex'),file.sha256,'QA evidence drift');
const commands=read('root-rerun/commands/command-results.json');
assert.deepEqual(commands.newFailures,[]);
assert.equal(commands.records.find(v=>v.name==='focused').pass,54);
assert.equal(commands.records.find(v=>v.name==='catalog-ssr-with-vite-url-stub').pass,4);
assert.equal(commands.records.find(v=>v.name==='full-regression').fail,12);
assert.ok(commands.records.filter(v=>v.name!=='full-regression').every(v=>v.exit===0));
assert.ok(read('root-rerun/browser-run-results.json').every(v=>v.exit===0));
for(const [path,count] of [['root-rerun/browser/test-results/results.json',13],['root-rerun/adversarial-browser/test-results/results.json',22],['independent-qa415/browser-final/test-results/results.json',22]]){
  const results=read(path);assert.equal(results.outcomes.length,count);assert.ok(results.outcomes.every(v=>v.status==='PASS'));
}
assert.deepEqual(read('security-receipt.json').newTouchedFindings,[]);
const receipt={applicationCommit:source.applicationCommit,applicationSourceSha256:source.sourceSha256,checkedAt:new Date().toISOString(),decision:'AUTHORIZED SCOPED APPLICATION PROMOTION',authority:'Direct human authorization; root integration gate. Independent QA and Ruflo ledger cannot promote.',independentManifestSha256:createHash('sha256').update(readFileSync(root+'/independent-qa415/evidence-manifest.json')).digest('hex'),independentFiles:qa.files.length,acceptance:{AC1:'Ten unchanged names with source-backed purpose',AC2:'Textual new/history/resume actions and history-only entry without implicit draft creation',AC3:'Empty/draft/latest-final metadata distinct, loading/error not empty, legacy edit identity preserved',AC4:'Native keyboard visible focus and 44px wrapping mobile targets without tooltips'},focusedPassEach:54,supplementarySsrEach:4,ordinaryRootBrowser:13,adversarialBrowserEach:22,unchangedFrontendBaselineFailures:12,newFrontendFailures:0,productionPatientTestMutations:0,backendChanges:false,excluded:'Unreleased405/408/410, primary dirty checkout and launchers, original patient photos',knownLimits:'Synthetic metadata/UI fixtures, not server persistence or physical hardware certification. Broad481security/7dependency baseline remains. Global CI not green.',deploymentAcceptance:'Pending exact-source Vercel READY and guarded compiled production SPA rerun'};
writeFileSync(root+'/release-gate-receipt.json',JSON.stringify(receipt,null,2));
console.log('Scoped application promotion gate recorded; deployment not yet verified');
