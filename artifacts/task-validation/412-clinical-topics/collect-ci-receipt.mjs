import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const credential=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env.GH_TOKEN;
const gh=args=>{const r=spawnSync('gh',[...args,'--repo','l2v-hub/ClinicOS'],{encoding:'utf8',maxBuffer:30*1024*1024,env:{...process.env,GH_TOKEN:credential}});assert.equal(r.status,0,'GitHub read failed');return r.stdout;};
const candidate=JSON.parse(gh(['run','view','37913741797','--json','status,conclusion,jobs']));
const secret=JSON.parse(gh(['run','view','37913741859','--json','status,conclusion']));
if(candidate.status!=='completed'||secret.status!=='completed'){console.log('CI still running; receipt not final');process.exit(2);}
assert.equal(secret.conclusion,'success');
const failureNames=run=>[...new Set([...gh(['run','view',String(run),'--log-failed']).matchAll(/not ok \d+ - ([^\r\n]+)/g)].map(m=>m[1].trim()))].sort();
const baselineNames=failureNames(37908237127),candidateNames=failureNames(37913741797);
assert.deepEqual(candidateNames,baselineNames);
assert.deepEqual(baselineNames,['therapy reads and writes apply patient scope before loading clinical data']);
assert.equal(candidate.conclusion,'failure');
assert.ok(candidate.jobs.some(j=>j.steps.some(s=>s.name==='Backend unit tests'&&s.conclusion==='failure')));
const receipt={applicationCommit:'3790a95b7c0c09b388ffbaeb7c71fe09d80a1c56',baselineApplication:'8b327ca55ab5d8d4c5e0c19afcb828c017eeb3df',baselineRun:37908237127,candidateRun:37913741797,
  workflow:'AI Import E2E Gate',candidateConclusion:candidate.conclusion,failedStage:'Backend unit tests',baselineFailureNames:baselineNames,candidateFailureNames:candidateNames,newFailureNames:[],
  downstreamImportTests:'Skipped, not claimed passing',frontendSecretScanRun:37913741859,frontendSecretScanConclusion:secret.conclusion,
  scope:'No412backend/pipeline changes; exact same single baseline failure. Scoped AC and compiled frontend separately verified; no global CI green claim.'};
writeFileSync('artifacts/task-validation/412-clinical-topics/ci-comparison.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
