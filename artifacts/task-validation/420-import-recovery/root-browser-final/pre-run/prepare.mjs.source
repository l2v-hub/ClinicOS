import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root='artifacts/task-validation/420-import-recovery',out=process.argv[2];
if(!out||existsSync(out))throw Error('Fresh immutable attempt directory required');
mkdirSync(`${out}/pre-run`,{recursive:true});
const files=[];
for(const name of ['fixture.mjs','after.mjs','qa-server.mjs','commands.mjs','source-receipt.mjs','prepare.mjs']){const bytes=readFileSync(`${root}/${name}`);writeFileSync(`${out}/pre-run/${name}.source`,bytes);files.push({path:name,sha256:createHash('sha256').update(bytes).digest('hex')});}
const r=spawnSync(process.execPath,[`${root}/source-receipt.mjs`,'c00bff678dfc9845c31742bc5d0d750fbbb9603e',`${out}/pre-run/source`],{encoding:'utf8'});if(r.status!==0)throw Error('Frozen source prerequisite failed');
writeFileSync(`${out}/pre-run/snapshot.json`,JSON.stringify({at:new Date().toISOString(),applicationCommit:'c00bff678dfc9845c31742bc5d0d750fbbb9603e',actualCompiler:'frontend/vite.config.ts; actual React compiler; own7501; clinical APIs intercepted',files},null,2));
