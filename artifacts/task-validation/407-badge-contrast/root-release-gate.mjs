import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root='artifacts/task-validation/407-badge-contrast';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const sha=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const source='973d78e5e109032a36cf89cf80fd8eb2a848a649';
const manifest=read(`${root}/independent/publication-manifest.json`);
for(const file of manifest.files)assert.equal(sha(file.path),file.sha256,`Frozen independent artifact: ${file.path}`);
assert.equal(sha(`${root}/independent/device-addendum.md`),'95bdaf18565a2a597dd46c1d9d67c59b4277367ec2c37e9b2058d6389b33446a');
for(const actor of ['independent','root-rerun']){
 const commands=read(`${root}/${actor}/command-results.json`);
 assert.equal(commands.newFailures.length,0);assert.equal(commands.focusedNewFailures.length,0);
 for(const record of commands.records)if(!['focused','full-regression'].includes(record.name))assert.equal(record.exit,0);
 assert.equal(commands.records.find(x=>x.name==='issue-specific').pass,4);
 assert.equal(commands.records.find(x=>x.name==='focused').fail,7);
 assert.equal(commands.records.find(x=>x.name==='full-regression').fail,12);
 const browser=read(`${root}/${actor}/test-results/browser-results.json`);
 assert.equal(browser.outcomes.length,6);assert.ok(browser.outcomes.every(x=>x.status==='PASS'));
 for(const state of browser.states){
  for(const key of ['errors','pageErrors','httpErrors','blockedExternal','unexpected','writes'])assert.equal(state[key].length,0);
  assert.equal(state.textMeasurements.length,18);assert.ok(state.textMeasurements.every(x=>x.ratio>=4.5));
 }
 const receipt=read(`${root}/${actor}/source-receipt.json`);assert.equal(receipt.applicationCommit,source);assert.equal(receipt.sourceSha256,manifest.applicationSourceSha256);
}
const guard=read(`${root}/root-rerun/device/guard-receipt.json`);
assert.equal(guard.clinicalWrites,0);assert.equal(guard.deniedWrites.length,0);assert.equal(guard.unexpected.length,0);assert.equal(guard.browser.viewportOverride,false);
const git=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});assert.equal(git.stdout.trim(),source);
const scopes=read(`${root}/root-rerun/source-receipt.json`).sourceScope;
assert.equal(spawnSync('git',['diff','--exit-code','HEAD','--',...scopes]).status,0);
assert.equal(spawnSync('git',['ls-files','--others','--exclude-standard','--',...scopes],{encoding:'utf8'}).stdout.trim(),'');
const receipt={applicationCommit:source,applicationSourceSha256:manifest.applicationSourceSha256,decision:'AUTHORIZED SCOPED FRONTEND RELEASE',checkedAt:new Date().toISOString(),authority:'Human user explicitly authorized sequential fixes, push, deployment, synthetic screenshots and verified closure. Root integration gate, not Ruflo or QA worker, authorizes this exact immutable candidate.',acceptance:{AC1:'PASS token+actual CSS states',AC2:'PASS automated+actual visible Windows Chrome desktop, independent addendum',AC3:'PASS literal visible accessible label',AC4:'PASS separate diagnostics, no blanket compliance claim'},rootBrowserGroups:6,independentBrowserGroups:6,issueTests:4,baselineFailures:12,newFailures:0,physicalPanelSunlightMobileCertification:false,productionPatientMutations:0,backendDeployment:'NOT APPLICABLE',excludedSource:'405 unverified candidate, unrelated launchers, metadata, all non407 app changes'};
writeFileSync(`${root}/release-gate-receipt.json`,JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
