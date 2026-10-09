import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root='artifacts/task-validation/420-import-recovery',dir=root+'/root-rerun';
const source='C:/w-420-qa/'+root+'/independent-qa420';
assert.equal(existsSync(dir),false,'Never overwrite a rerun');mkdirSync(dir+'/pre-run',{recursive:true});
const files=[];
for(const path of ['recipe.mjs','fixture.mjs']){const bytes=readFileSync(source+'/'+path);copyFileSync(source+'/'+path,dir+'/'+path);writeFileSync(dir+'/pre-run/'+path+'.source',bytes);files.push({path,sha256:createHash('sha256').update(bytes).digest('hex')});}
const r=spawnSync(process.execPath,[root+'/source-receipt.mjs','c00bff678dfc9845c31742bc5d0d750fbbb9603e',dir+'/pre-run/source'],{encoding:'utf8'});assert.equal(r.status,0);
writeFileSync(dir+'/pre-run/snapshot.json',JSON.stringify({at:new Date().toISOString(),applicationCommit:'c00bff678dfc9845c31742bc5d0d750fbbb9603e',files,origin:source,actualRuntime:'Root owned7501 actual compiler; independently authored recipe byte-identical, no clinical network'},null,2));
