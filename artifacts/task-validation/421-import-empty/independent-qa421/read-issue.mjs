import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const root=process.env.EV_OUT;mkdirSync(root,{recursive:true});
const config=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
const gh=args=>{const result=spawnSync('gh',[...args,'--repo','l2v-hub/ClinicOS'],{encoding:'utf8',maxBuffer:10e6,env:{...process.env,GH_TOKEN:config.GITHUB_TOKEN||config.GH_TOKEN}});assert.equal(result.status,0,'GitHub read failed safely');return JSON.parse(result.stdout);};
const issue=gh(['issue','view','421','--json','number,title,body,state,labels,comments']);writeFileSync(root+'/original-issue.json',JSON.stringify(issue,null,2));
const issues=gh(['issue','list','--state','open','--limit','100','--json','number,title,createdAt,labels']);writeFileSync(root+'/issue-inventory.json',JSON.stringify(issues,null,2));
console.log('Fresh issue421 read and comments saved; '+issue.comments.length+' comments; state '+issue.state);

