import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root='artifacts/task-validation/426-room-actions',folder=process.argv[2];assert.ok(['root-rerun4','compiled-online'].includes(folder));const app=JSON.parse(readFileSync(root+'/frozen-release-source.json')).applicationCommit,plan=JSON.parse(readFileSync(root+'/browser-plan.json'));assert.ok(process.env.APP_URL);const records=[];
for(const item of plan){const output=root+'/'+folder+'/'+item.folder,r=spawnSync(process.execPath,[root+'/'+folder+'/recipes/'+item.recipe,output],{encoding:'utf8',windowsHide:true,maxBuffer:20e6,env:{...process.env,SOURCE_COMMIT:app}});writeFileSync(root+'/'+folder+'/'+item.folder+'-run.log',(r.stdout||'')+(r.stderr||''));records.push({...item,exit:r.status});writeFileSync(root+'/'+folder+'/browser-run-receipt.json',JSON.stringify({applicationCommit:app,records,serialized:true,appUrl:process.env.APP_URL,at:new Date().toISOString()},null,2));console.log(item.folder+':exit'+r.status);assert.equal(r.status,0,'Browser failure preserved; no release gate');}
