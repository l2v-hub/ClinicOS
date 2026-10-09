import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root='artifacts/task-validation/420-import-recovery',dir=root+'/compiled-online';
assert.equal(existsSync(dir),false,'Never overwrite online proof');
const deployment=JSON.parse(readFileSync(root+'/deployment-receipt.json'));
assert.equal(deployment.applicationCommit,'c00bff678dfc9845c31742bc5d0d750fbbb9603e');assert.equal(deployment.decision,'VERIFIED RELEASE');
mkdirSync(dir+'/pre-run',{recursive:true});const records=[];
for(const path of ['after.mjs','fixture.mjs']){const bytes=readFileSync(root+'/'+path);copyFileSync(root+'/'+path,dir+'/'+path);writeFileSync(dir+'/pre-run/'+path+'.source',bytes);records.push({path,sha256:createHash('sha256').update(bytes).digest('hex')});}
copyFileSync(root+'/deployment-receipt.json',dir+'/pre-run/deployment-receipt.json');
const r=spawnSync(process.execPath,[root+'/source-receipt.mjs',deployment.applicationCommit,dir+'/pre-run/source'],{encoding:'utf8'});assert.equal(r.status,0);
writeFileSync(dir+'/pre-run/snapshot.json',JSON.stringify({at:new Date().toISOString(),records,deployment,actualRuntime:'Exact compiled production static JS only, all clinical APIs intercepted before network',productionPatientTestMutations:0},null,2));
