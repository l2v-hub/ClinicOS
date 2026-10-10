import assert from 'node:assert/strict';
import {createServer} from 'node:net';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root='artifacts/task-validation/428-operator-role',plan=JSON.parse(readFileSync(root+'/root-rerun/browser-plan.json')),pids=[];
for(const item of plan){const lane=JSON.parse(readFileSync(root+'/root-rerun/'+item.folder.slice(0,-4)+'/lane-receipt.json'));assert.equal(lane.status,0);assert.equal(lane.released,true);assert.equal(lane.serverStopped,true);assert.equal(lane.port,7528);pids.push(lane.serverPid);}
const state=spawnSync('pwsh',['-NoProfile','-Command',`$taskIds=@(${pids.join(',')});$taskAlive=@(Get-Process -ErrorAction SilentlyContinue | Where-Object {$taskIds -contains $_.Id});$taskPostgres=@(Get-CimInstance Win32_Process -Filter "Name = 'postgres.exe'" | Where-Object {$_.CommandLine -like '*clinicos-bug428-synthetic*'});@{ownedPidsAlive=$taskAlive.Count;syntheticClustersAlive=$taskPostgres.Count}|ConvertTo-Json`],{encoding:'utf8',windowsHide:true});assert.equal(state.status,0);const actual=JSON.parse(state.stdout);assert.equal(actual.ownedPidsAlive,0);assert.equal(actual.syntheticClustersAlive,0);
for(const port of [7528,7529]){await new Promise((ok,fail)=>{const s=createServer();s.once('error',fail);s.listen(port,'127.0.0.1',()=>s.close(ok));});}
writeFileSync(root+'/root-rerun/server-stop.json',JSON.stringify({listenerFree:true,ports:[7528,7529],ownedPids:pids,...actual,browserLane:'RELEASED',productionMutation:0,at:new Date().toISOString()},null,2));console.log('Owned PID absent, both lanes free, dedicated synthetic clusters stopped');
