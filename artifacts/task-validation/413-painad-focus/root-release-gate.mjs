import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root='artifacts/task-validation/413-painad-focus',source='e01bd55114e2b5b1615b4088d988a41aad60eb80',sourceHash='b1bf67f6ae4357cc76015a39879eebb342669836f3c01ae1937add0674e347c8';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const independent=root+'/independent-qa/refinement-e01';
const manifest=read(independent+'/immutable-manifest.json');
assert.equal(manifest.applicationCommit,source);assert.equal(manifest.sourceSha256,sourceHash);
assert.ok(manifest.files.length >= 38);
for(const file of manifest.files)assert.equal(createHash('sha256').update(readFileSync(independent+'/'+file.path)).digest('hex'),file.sha256,file.path);
for(const prior of manifest.preservedEarlierEvidence){const folder=independent+'/'+prior.path.replace(/\/immutable-manifest\.json$/,'');const bytes=readFileSync(independent+'/'+prior.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),prior.sha256);for(const file of JSON.parse(bytes).files)assert.equal(createHash('sha256').update(readFileSync(folder+'/'+file.path)).digest('hex'),file.sha256);}
assert.match(readFileSync(independent+'/validation-report.md','utf8'),/READY FOR CODEX QA/);
for(const actor of ['independent-qa/refinement-e01','root-refinement-e01']){
 const commands=read(`${root}/${actor}/commands/command-results.json`);assert.equal(commands.newFailures.length,0);
 for(const command of commands.records)if(command.name!=='full-regression')assert.equal(command.exit,0,command.name);
 assert.equal(commands.records.find(r=>r.name==='focused').pass,38);assert.equal(commands.records.find(r=>r.name==='full-regression').fail,12);
 const result=read(`${root}/${actor}/browser/test-results/browser-results.json`);assert.equal(result.outcomes.length,9);assert.ok(result.outcomes.every(r=>r.status==='PASS'));
 for(const state of result.states)for(const key of ['domainWrites','unexpected','external','pageErrors'])assert.equal(state[key].length,0,key);
 for(const phase of (actor==='root-refinement-e01'?['source-before','source-after']:['pre','post'])){const receipt=read(`${root}/${actor}/${phase}/source-receipt.json`);assert.equal(receipt.applicationCommit,source);assert.equal(receipt.sourceSha256,sourceHash);}
 const extra=read(`${root}/${actor}/adversarial/test-results/adversarial-results.json`);assert.equal(extra.outcomes.length,4);assert.ok(extra.outcomes.every(r=>r.status==='PASS'));
 for(const state of extra.states)for(const key of ['domainWrites','unexpected','external','pageErrors','errors','httpErrors'])assert.equal(state[key].length,0,key);
}
assert.equal(spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),source);
assert.equal(spawnSync('git',['diff','--exit-code','HEAD','--',...read(root+'/root-refinement-e01/source-after/source-receipt.json').sourceScope]).status,0);
const security=read(root+'/security-receipt.json');assert.equal(security.applicationCommit,source);assert.equal(security.newTouchedFindings.length,0);assert.equal(security.touchedFindings.length,0);assert.equal(security.unchangedDependencyFindings.length,7);
writeFileSync(root+'/release-gate-receipt.json',JSON.stringify({applicationCommit:source,applicationSourceSha256:sourceHash,checkedAt:new Date().toISOString(),decision:'AUTHORIZED SCOPED APPLICATION PROMOTION',authority:'Direct user authorization; root integration gate, not QA or ledger promotion authority',acceptance:{AC1:'First named question/focus immediately visible; patient identifier retained',AC2:'No redundant active resume; inactive local resume/reload retained',AC3:'Progress/actions unobscured start/middle/end desktop/mobile/tablet',AC4:'Validated definitions/engines/criteria unchanged; partial/complete/preview/final distinction retained'},focusedPassEach:38,browserPassEach:13,baselineFailures:12,newFailures:0,productionPatientTestMutations:0,backendChanges:false,deploymentAcceptance:'PENDING exact-source READY/alias/assets200 and compiled synthetic browser verification',knownLimits:'12 unchanged frontend regression failures; unchanged broad CI backend failure and7dependency findings/481scan findings, no global green or clean security certification',excludedSource:'Unreleased405/408/410, primary dirty checkout, launchers/coordination, original patient audit photos',routing:'Provider Git-main deployment; accepted409backend retained unchanged.'},null,2));
console.log('Scoped promotion receipt written; online acceptance and closure still pending');
