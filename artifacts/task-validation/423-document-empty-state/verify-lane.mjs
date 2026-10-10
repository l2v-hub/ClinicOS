import assert from 'node:assert/strict';
import {createServer} from 'node:net';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root='artifacts/task-validation/423-document-empty-state',plan=JSON.parse(readFileSync(root+'/root-rerun/browser-plan.json')),pids=[],receipts=[];
for(const item of plan){const lane=JSON.parse(readFileSync(root+'/root-rerun/'+item.folder.slice(0,-4)+'/lane-receipt.json'));assert.equal(lane.status,0);assert.equal(lane.released,true);assert.equal(lane.serverStopped,true);assert.equal(lane.port,7530);}
function walk(folder){for(const e of readdirSync(folder,{withFileTypes:true})){if(e.name==='runtime-cache'||e.name==='node_modules')continue;const p=folder+'/'+e.name;if(e.isDirectory())walk(p);else if(e.name==='lane-receipt.json'){const lane=JSON.parse(readFileSync(p));assert.equal(lane.released,true);assert.equal(lane.serverStopped,true);assert.ok(Number.isSafeInteger(lane.serverPid)&&lane.serverPid>0);pids.push(lane.serverPid);receipts.push({path:p,pid:lane.serverPid,port:lane.port,status:lane.status});}}}
walk(root+'/root-rerun');walk(root+'/independent-qa');
const owned=[...new Set(pids)];assert.ok(owned.length>0);
const state=spawnSync('pwsh',['-NoProfile','-Command',`$taskIds=@(${owned.join(',')});$taskAlive=@(Get-Process -ErrorAction SilentlyContinue | Where-Object {$taskIds -contains $_.Id});@{ownedPidsAlive=$taskAlive.Count}|ConvertTo-Json`],{encoding:'utf8',windowsHide:true});assert.equal(state.status,0);const actual=JSON.parse(state.stdout);assert.equal(actual.ownedPidsAlive,0);
for(const port of [7530,7531]){await new Promise((ok,fail)=>{const s=createServer();s.once('error',fail);s.listen(port,'127.0.0.1',()=>s.close(ok));});}
writeFileSync(root+'/root-rerun/server-stop.json',JSON.stringify({listenerFree:true,ports:[7530,7531],ownedPids:owned,receipts,...actual,browserLane:'RELEASED',productionMutation:0,at:new Date().toISOString()},null,2));
console.log('All evidenced owned server PIDs absent; root/QA ports free; no DB lane required');
