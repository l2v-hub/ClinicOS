import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root='artifacts/task-validation/423-document-empty-state';
assert.equal(existsSync(root+'/ci-unexpected-failures.json'),false,'Initial attempt snapshot is write-once, never overwritten by a later attempt');
const configured=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
function gh(args){const r=spawnSync('gh',[...args,'--repo','l2v-hub/ClinicOS'],{encoding:'utf8',maxBuffer:40e6,windowsHide:true,env:{...process.env,GH_TOKEN:configured.GITHUB_TOKEN||configured.GH_TOKEN}});assert.equal(r.status,0,'Read-only CI diagnosis unavailable safely');return r.stdout;}
const runs=[38018242472,38013399240,37987185985],receipts=[];
for(const run of runs){
 const info=JSON.parse(gh(['run','view',String(run),'--attempt','1','--json','attempt,headSha,status,conclusion,jobs']));assert.equal(info.attempt,1);
 let log=gh(['run','view',String(run),'--attempt','1','--log-failed']);
 for(const [key,value]of Object.entries(configured))if(/TOKEN|KEY|SECRET|PASSWORD|CREDENTIAL|CONNECTION_STRING|DATABASE_URL/.test(key)&&typeof value==='string'&&value.length>=8)log=log.replaceAll(value,'[REDACTED CONFIGURED CREDENTIAL]');
 const lines=log.split(/\r?\n/),blocks=[];
 for(let i=0;i<lines.length;i++)if(/not ok \d+ - /.test(lines[i]))blocks.push(lines.slice(i,Math.min(i+38,lines.length)).join('\n'));
 const row={run,attempt:1,headSha:info.headSha,status:info.status,conclusion:info.conclusion,failedSteps:info.jobs.flatMap(j=>j.steps.filter(s=>s.conclusion==='failure').map(s=>j.name+': '+s.name)),failureBlocks:blocks};
 receipts.push(row);console.log(JSON.stringify(row));
}
writeFileSync(root+'/ci-unexpected-failures.json',JSON.stringify({decision:'NOT ACCEPTED BASELINE: NEW NAMES REQUIRE DIAGNOSIS, NO ISSUE CLOSURE',receipts,at:new Date().toISOString()},null,2));
