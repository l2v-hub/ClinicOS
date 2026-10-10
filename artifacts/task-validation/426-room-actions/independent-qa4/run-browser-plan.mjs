import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const out=resolve('artifacts/task-validation/426-room-actions/independent-qa4');
const head='30e8023e8b88dcd8b5e40544f1597ee0c046a41c';
const plan=JSON.parse(readFileSync(out+'/browser-plan.json'));
const records=[];
for(const row of plan){
 assert.equal(existsSync(out+'/'+row.folder),false);
 const recipe=out+'/recipes/'+row.recipe;
 const sha256=createHash('sha256').update(readFileSync(recipe)).digest('hex');
 const r=spawnSync(process.execPath,[recipe,out+'/'+row.folder],{cwd:resolve('.'),encoding:'utf8',maxBuffer:15e6,windowsHide:true,env:{...process.env,APP_URL:'http://127.0.0.1:7525',SOURCE_COMMIT:head}});
 writeFileSync(out+'/'+row.folder+'.log',(r.stdout||'')+(r.stderr||''));
 records.push({...row,sha256,exit:r.status});
 writeFileSync(out+'/browser-replay-results.json',JSON.stringify({head,records},null,2));
 console.log(`${row.recipe}: exit${r.status}`);
 if(r.status!==0){process.exitCode=1;break;}
 const result=JSON.parse(readFileSync(out+'/'+row.folder+'/test-results/browser-results.json'));
 assert.equal(result.applicationCommit,head);assert.equal(result.outcomes.length,row.cases);assert.ok(result.outcomes.every(c=>c.status==='PASS'));
}
assert.equal(records.length,plan.length);
