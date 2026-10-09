import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root='artifacts/task-validation/421-import-empty',out=root+'/before-run-01';assert.equal(existsSync(out),false,'Fresh evidence only');mkdirSync(out+'/pre-run',{recursive:true});const files=[];
for(const name of ['before.mjs','fixture.mjs','qa-server.mjs','source-receipt.mjs','prepare-before.mjs','task-contract.md']){const b=readFileSync(root+'/'+name);writeFileSync(out+'/pre-run/'+name+'.source',b);files.push({path:name,sha256:createHash('sha256').update(b).digest('hex')});}
const r=spawnSync(process.execPath,[root+'/source-receipt.mjs','c00bff678dfc9845c31742bc5d0d750fbbb9603e',out+'/pre-run/source'],{encoding:'utf8'});assert.equal(r.status,0);writeFileSync(out+'/pre-run/snapshot.json',JSON.stringify({at:new Date().toISOString(),applicationCommit:'c00bff678dfc9845c31742bc5d0d750fbbb9603e',files,actualCompiler:'Actual frontend/vite.config.ts and React compiler; owned7505; synthetic APIs intercepted before network'},null,2));
