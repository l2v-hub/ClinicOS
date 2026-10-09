import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const env=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
const r=spawnSync('gh',['issue','view','420','--repo','l2v-hub/ClinicOS','--json','number,title,body,state,labels,comments'],{encoding:'utf8',maxBuffer:1000000,env:{...process.env,GH_TOKEN:env.GITHUB_TOKEN||env.GH_TOKEN}});
assert.equal(r.status,0,'Read-only GitHub issue retrieval failed');
const value=JSON.parse(r.stdout);writeFileSync(new URL('./issue-original.json',import.meta.url),JSON.stringify(value,null,2));
console.log(JSON.stringify(value));
