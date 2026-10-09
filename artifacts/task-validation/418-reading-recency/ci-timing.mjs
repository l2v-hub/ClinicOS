import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const env=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
for(const id of [37949387210,37960955879]){
 const r=spawnSync('gh',['run','view',String(id),'--repo','l2v-hub/ClinicOS','--json','createdAt,startedAt,updatedAt,status,conclusion,jobs'],{encoding:'utf8',maxBuffer:5e6,env:{...process.env,GH_TOKEN:env.GITHUB_TOKEN||env.GH_TOKEN}});
 assert.equal(r.status,0,'CI timing read failed safely');const run=JSON.parse(r.stdout);
 console.log(JSON.stringify({id,createdAt:run.createdAt,startedAt:run.startedAt,updatedAt:run.updatedAt,status:run.status,conclusion:run.conclusion,backend:run.jobs.flatMap(j=>j.steps.filter(s=>s.name==='Backend unit tests').map(s=>({status:s.status,conclusion:s.conclusion,startedAt:s.startedAt,completedAt:s.completedAt})))}));
}
