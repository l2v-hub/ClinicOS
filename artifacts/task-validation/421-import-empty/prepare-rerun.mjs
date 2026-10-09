import assert from 'node:assert/strict';
import {existsSync,mkdirSync,copyFileSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const task='artifacts/task-validation/421-import-empty',out=task+'/root-rerun';
const origin='C:/w-421-qa/'+task+'/independent-qa421';
assert.equal(existsSync(out),false,'Never overwrite a validation attempt');
mkdirSync(out,{recursive:true});
const files=[];
for(const [attempt,names] of [['browser-01',['after.mjs','fixture.mjs']],['pdf-01',['pdf-after.mjs','pdf-fixture.mjs']],['persistence-01',['persistence-after.mjs','persistence-fixture.mjs']]]){
 mkdirSync(out+'/'+attempt,{recursive:true});
 for(const name of names){const from=origin+'/'+attempt+'/'+name,to=out+'/'+attempt+'/'+name;copyFileSync(from,to);files.push({origin:from,path:attempt+'/'+name,sha256:createHash('sha256').update(readFileSync(to)).digest('hex')});}
}
copyFileSync(origin+'/browser-01/qa-server.mjs',out+'/qa-server.mjs');
files.push({origin:origin+'/browser-01/qa-server.mjs',path:'qa-server.mjs',sha256:createHash('sha256').update(readFileSync(out+'/qa-server.mjs')).digest('hex')});
const applicationCommit='80b313227a9a2b9fefc0441c718b259d0d901cae';
const r=spawnSync(process.execPath,[task+'/source-receipt.mjs',applicationCommit,out+'/pre-run/source'],{encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);
writeFileSync(out+'/snapshot.json',JSON.stringify({applicationCommit,capturedAt:new Date().toISOString(),environmentOnly:{QA_PORT:7505,serverEV_OUT:task+'/root-rerun-runtime'},files},null,2));
console.log(r.stdout);
