import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root='artifacts/task-validation/419-calendar-create',dir=root+'/compiled-online';
assert.equal(existsSync(dir),false,'Fresh online attempt required');
const deployment=JSON.parse(readFileSync(root+'/deployment-receipt.json','utf8'));
assert.equal(deployment.applicationCommit,'fa028c11ffe5dbfe514df8110e6ccf7f6b977602');assert.equal(deployment.decision,'VERIFIED RELEASE');
mkdirSync(dir+'/pre-run',{recursive:true});
const records=[];
for(const path of ['recipe.mjs','fixture.mjs']){
 const bytes=readFileSync(root+'/root-rerun/'+path);copyFileSync(root+'/root-rerun/'+path,dir+'/'+path);writeFileSync(dir+'/pre-run/'+path+'.source',bytes);records.push({path,sha256:createHash('sha256').update(bytes).digest('hex')});
}
copyFileSync(root+'/deployment-receipt.json',dir+'/pre-run/deployment-receipt.json');
const source=spawnSync(process.execPath,[root+'/source-receipt.mjs',deployment.applicationCommit,dir+'/pre-run/source'],{encoding:'utf8'});assert.equal(source.status,0);
writeFileSync(dir+'/pre-run/snapshot.json',JSON.stringify({at:new Date().toISOString(),records,deployment,browserRuntime:'Actual compiled production JS via static GET only; clinical API responses intercepted before network; clock controlled',productionPatientTestMutations:0},null,2));
console.log('Fresh online source/recipe/deployment snapshot saved; no browser executed yet');
