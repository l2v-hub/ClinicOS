import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const settings=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
const credential=settings.GITHUB_TOKEN||settings.GH_TOKEN;
const gh=args=>{const r=spawnSync('gh',[...args,'--repo','l2v-hub/ClinicOS'],{encoding:'utf8',maxBuffer:30*1024*1024,env:{...process.env,GH_TOKEN:credential}});assert.equal(r.status,0,'GitHub read failed');return r.stdout;};
const runs=JSON.parse(gh(['run','list','--commit','d028e1ee4c5c44d96b5005362b28f54e5c05fee1','--json','databaseId,name,status,conclusion']));
const candidateRun=runs.find(r=>r.name==='AI Import E2E Gate')?.databaseId,secretRun=runs.find(r=>r.name==='Frontend Secret Scan')?.databaseId;
if(!candidateRun||!secretRun){console.log('CI runs not yet present');process.exit(2);}
const candidate=JSON.parse(gh(['run','view',String(candidateRun),'--json','status,conclusion,jobs']));
const secret=JSON.parse(gh(['run','view',String(secretRun),'--json','status,conclusion']));
if(candidate.status!=='completed'||secret.status!=='completed'){
 const progress={applicationCommit:'d028e1ee4c5c44d96b5005362b28f54e5c05fee1',checkedAt:new Date().toISOString(),candidateRun,candidateStatus:candidate.status,secretRun,secretStatus:secret.status,secretConclusion:secret.conclusion,jobs:candidate.jobs.map(j=>({name:j.name,status:j.status,conclusion:j.conclusion,activeSteps:j.steps.filter(s=>s.status!=='completed').map(s=>({name:s.name,status:s.status}))})),decision:'PENDING, not a final CI receipt'};
 writeFileSync('artifacts/task-validation/418-reading-recency/ci-progress.json',JSON.stringify(progress,null,2));console.log(JSON.stringify(progress));process.exit(2);
}
assert.equal(secret.conclusion,'success');
const failureNames=run=>[...new Set([...gh(['run','view',String(run),'--log-failed']).matchAll(/not ok \d+ - ([^\r\n]+)/g)].map(m=>m[1].trim()))].sort();
const baselineNames=failureNames(37949387210),candidateNames=failureNames(candidateRun);
assert.deepEqual(candidateNames,baselineNames);
assert.deepEqual(baselineNames,['therapy reads and writes apply patient scope before loading clinical data']);
assert.equal(candidate.conclusion,'failure');
assert.ok(candidate.jobs.some(j=>j.steps.some(s=>s.name==='Backend unit tests'&&s.conclusion==='failure')));
const receipt={applicationCommit:'d028e1ee4c5c44d96b5005362b28f54e5c05fee1',baselineApplication:'02b4ba89af291186a72e040b868da024bb865164',baselineRun:37949387210,candidateRun,
  workflow:'AI Import E2E Gate',candidateConclusion:candidate.conclusion,failedStage:'Backend unit tests',baselineFailureNames:baselineNames,candidateFailureNames:candidateNames,newFailureNames:[],
  downstreamImportTests:'Skipped, not claimed passing',frontendSecretScanRun:secretRun,frontendSecretScanConclusion:secret.conclusion,
  scope:'No418backend/pipeline changes; exact same single baseline failure. Scoped AC and compiled frontend separately verified; no global CI green claim.'};
writeFileSync('artifacts/task-validation/418-reading-recency/ci-comparison.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
