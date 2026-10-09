import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const env=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
const r=spawnSync('gh',['issue','view','419','--repo','l2v-hub/ClinicOS','--json','number,title,body,comments,state,labels'],{encoding:'utf8',env:{...process.env,GH_TOKEN:env.GITHUB_TOKEN||env.GH_TOKEN}});assert.equal(r.status,0,'Safe issue read failed');
writeFileSync('artifacts/task-validation/419-calendar-create/original-issue.json',r.stdout);
