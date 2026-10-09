import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root='artifacts/task-validation/412-clinical-topics';
const source='3790a95b7c0c09b388ffbaeb7c71fe09d80a1c56';
const sourceHash='d32b0be8dbc37b5f29df11578836bdc5720c9f420218e4b3d0e1f69c8bd50457';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const manifest=read(root+'/independent-qa/immutable-manifest.json');
assert.equal(manifest.applicationCommit,source);assert.equal(manifest.sourceSha256,sourceHash);
for(const file of manifest.artifacts)assert.equal(createHash('sha256').update(readFileSync(root+'/independent-qa/'+file.path)).digest('hex'),file.sha256,file.path);
assert.match(readFileSync(root+'/independent-qa/validation-report.md','utf8'),/READY FOR CODEX QA/);
for(const actor of ['independent-qa','root-rerun']){
  const commands=read(`${root}/${actor}/commands/command-results.json`);
  assert.equal(commands.newFailures.length,0);
  for(const command of commands.records)if(command.name!=='full-regression')assert.equal(command.exit,0,command.name);
  assert.equal(commands.records.find(r=>r.name==='focused').pass,43);
  assert.equal(commands.records.find(r=>r.name==='full-regression').fail,12);
  const browser=read(`${root}/${actor}/browser/test-results/browser-results.json`);
  assert.equal(browser.outcomes.length,7);assert.ok(browser.outcomes.every(r=>r.status==='PASS'));
  for(const state of browser.states)for(const key of ['domainWrites','unexpected','external','pageErrors'])assert.equal(state[key].length,0,key);
  for(const phase of ['source-before','source-after']){
    const receipt=read(`${root}/${actor}/${phase}/source-receipt.json`);
    assert.equal(receipt.applicationCommit,source);assert.equal(receipt.sourceSha256,sourceHash);
  }
}
for(const actor of ['independent-qa','root-rerun']){
  const extra=read(`${root}/${actor}/${actor==='independent-qa'?'adversarial-browser-final':'extra-browser'}/test-results/browser-results.json`);
  assert.equal(extra.outcomes.length,9);assert.ok(extra.outcomes.every(r=>r.status==='PASS'));
  for(const state of extra.states)for(const key of ['domainWrites','unexpected','external','pageErrors'])assert.equal(state[key].length,0,key);
  assert.match(readFileSync(`${root}/${actor}/adversarial-unit.log`,'utf8'),/ℹ pass 3/);
}
assert.equal(spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),source);
const scopes=read(root+'/root-rerun/source-after/source-receipt.json').sourceScope;
assert.equal(spawnSync('git',['diff','--exit-code','HEAD','--',...scopes]).status,0);
assert.equal(spawnSync('git',['ls-files','--others','--exclude-standard','--',...scopes],{encoding:'utf8'}).stdout.trim(),'');
const security=read(root+'/security-receipt.json');assert.equal(security.newTouchedFindings.length,0);assert.equal(security.unchangedDependencyFindings.length,7);
writeFileSync(root+'/release-gate-receipt.json',JSON.stringify({applicationCommit:source,applicationSourceSha256:sourceHash,checkedAt:new Date().toISOString(),
  decision:'AUTHORIZED SCOPED APPLICATION PROMOTION',authority:'Direct human authorization for sequential scoped fixes, commits, pushes, deployment and synthetic GitHub proof; root integration owner, not QA worker or ledger.',
  acceptance:{AC1:'One topic-owned current editor + source detail each',AC2:'Current/original/reviewed/provenance distinct; detail/edit/compare preserved',AC3:'Document absence not clinical absence, loading/error/current unaffected',AC4:'Compact closed empty source group and empty chart history'},
  focusedPassEach:43,browserPassEach:7,baselineFailures:12,newFailures:0,productionPatientTestMutations:0,backendChanges:false,
  deploymentAcceptance:'PENDING exact-source Vercel production READY/asset200 and compiled synthetic browser assertions. No closure before verified.',
  knownLimits:'12 unchanged frontend failures, baseline broad CI backend failure, 7 unchanged dependency findings, one touched pre-existing comment-only scan heuristic; no global-green/security/hardware/AT certification.',
  excludedSource:'Unreleased405/408/410, original medical/audit images, primary dirty worktree, unrelated launchers/coordination metadata',
  deploymentRouting:'Provider Git-main deployment verified411; no duplicate CLI deploy. Backend409 unchanged retained.'},null,2));
console.log('Scoped application promotion receipt written; deployment verification still required');
