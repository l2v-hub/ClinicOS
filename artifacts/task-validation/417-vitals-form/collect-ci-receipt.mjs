import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const settings=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
const credential=settings.GITHUB_TOKEN||settings.GH_TOKEN;
const gh=args=>{const r=spawnSync('gh',[...args,'--repo','l2v-hub/ClinicOS'],{encoding:'utf8',maxBuffer:30*1024*1024,env:{...process.env,GH_TOKEN:credential}});assert.equal(r.status,0,'GitHub read failed');return r.stdout;};
const runs=JSON.parse(gh(['run','list','--commit','02b4ba89af291186a72e040b868da024bb865164','--json','databaseId,name,status,conclusion']));
const candidateRun=runs.find(r=>r.name==='AI Import E2E Gate')?.databaseId,secretRun=runs.find(r=>r.name==='Frontend Secret Scan')?.databaseId;
if(!candidateRun||!secretRun){console.log('CI runs not yet present');process.exit(2);}
const candidate=JSON.parse(gh(['run','view',String(candidateRun),'--json','status,conclusion,jobs']));
const secret=JSON.parse(gh(['run','view',String(secretRun),'--json','status,conclusion']));
if(candidate.status!=='completed'||secret.status!=='completed'){console.log('CI still running; receipt not final');process.exit(2);}
assert.equal(secret.conclusion,'success');
const failureNames=run=>[...new Set([...gh(['run','view',String(run),'--log-failed']).matchAll(/not ok \d+ - ([^\r\n]+)/g)].map(m=>m[1].trim()))].sort();
const baselineNames=failureNames(37932140544),candidateNames=failureNames(candidateRun);
assert.deepEqual(candidateNames,baselineNames);
assert.deepEqual(baselineNames,['therapy reads and writes apply patient scope before loading clinical data']);
assert.equal(candidate.conclusion,'failure');
assert.ok(candidate.jobs.some(j=>j.steps.some(s=>s.name==='Backend unit tests'&&s.conclusion==='failure')));
const receipt={applicationCommit:'02b4ba89af291186a72e040b868da024bb865164',baselineApplication:'0d7adc361b92c8466655d9ed830d2b87bbd0f419',baselineRun:37932140544,candidateRun,
  workflow:'AI Import E2E Gate',candidateConclusion:candidate.conclusion,failedStage:'Backend unit tests',baselineFailureNames:baselineNames,candidateFailureNames:candidateNames,newFailureNames:[],
  downstreamImportTests:'Skipped, not claimed passing',frontendSecretScanRun:secretRun,frontendSecretScanConclusion:secret.conclusion,
  scope:'No417backend/pipeline changes; exact same single baseline failure. Scoped AC and compiled frontend separately verified; no global CI green claim.'};
writeFileSync('artifacts/task-validation/417-vitals-form/ci-comparison.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
