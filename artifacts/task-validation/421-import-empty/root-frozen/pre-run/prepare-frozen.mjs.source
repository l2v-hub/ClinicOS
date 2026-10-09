import assert from 'node:assert/strict';
import {existsSync,mkdirSync,copyFileSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='artifacts/task-validation/421-import-empty',dest=root+'/root-frozen';
assert.equal(existsSync(dest),false,'Never overwrite a validation attempt');
mkdirSync(dest+'/pre-run',{recursive:true});
const files=[];
for(const name of ['after.mjs','fixture.mjs','qa-server.mjs','commands.mjs','source-receipt.mjs','prepare-frozen.mjs','task-contract.md','execution-policy.md']){
 const target=dest+'/pre-run/'+name+'.source';copyFileSync(root+'/'+name,target);files.push({path:name+'.source',sha256:createHash('sha256').update(readFileSync(target)).digest('hex')});
}
const applicationCommit='80b313227a9a2b9fefc0441c718b259d0d901cae';
const r=spawnSync(process.execPath,[root+'/source-receipt.mjs',applicationCommit,dest+'/pre-run/source'],{encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);
writeFileSync(dest+'/pre-run/snapshot.json',JSON.stringify({applicationCommit,capturedAt:new Date().toISOString(),files},null,2));
console.log(r.stdout);
