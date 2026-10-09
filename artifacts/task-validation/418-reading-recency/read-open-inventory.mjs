import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const env=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
const r=spawnSync('gh',['issue','list','--repo','l2v-hub/ClinicOS','--state','open','--limit','500','--json','number,title,labels,createdAt,updatedAt'],{encoding:'utf8',maxBuffer:20e6,env:{...process.env,GH_TOKEN:env.GITHUB_TOKEN||env.GH_TOKEN}});
assert.equal(r.status,0,'GitHub inventory read failed safely');
const issues=JSON.parse(r.stdout);
writeFileSync('artifacts/task-validation/418-reading-recency/open-issue-inventory.json',JSON.stringify({checkedAt:new Date().toISOString(),issues},null,2));
console.log(JSON.stringify(issues));
