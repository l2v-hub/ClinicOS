import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const dir=process.argv[2];if(!dir||existsSync(dir))throw Error('New immutable snapshot directory required');mkdirSync(dir,{recursive:true});
const records=[];
for(const path of ['fixture.mjs','after.mjs','qa-server.mjs','commands.mjs','source-receipt.mjs']){
 const bytes=readFileSync(`artifacts/task-validation/419-calendar-create/${path}`);writeFileSync(`${dir}/${path}.source`,bytes);records.push({path,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const r=spawnSync(process.execPath,['artifacts/task-validation/419-calendar-create/source-receipt.mjs','fa028c11ffe5dbfe514df8110e6ccf7f6b977602',`${dir}/source`],{encoding:'utf8'});if(r.status!==0)throw Error('Candidate snapshot failed');
writeFileSync(`${dir}/snapshot.json`,JSON.stringify({at:new Date().toISOString(),application:'fa028c11ffe5dbfe514df8110e6ccf7f6b977602',records},null,2));
