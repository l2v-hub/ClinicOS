import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root='artifacts/task-validation/422-drug-results',dest=root+'/root-frozen/commands-fenced';assert.equal(existsSync(dest),false);mkdirSync(dest+'/pre-run',{recursive:true});
const files=['commands.mjs','source-receipt.mjs','frozen-commands.mjs'].map(path=>{copyFileSync(root+'/'+path,dest+'/pre-run/'+path);return {path,sha256:createHash('sha256').update(readFileSync(root+'/'+path)).digest('hex')};});
writeFileSync(dest+'/pre-run/snapshot.json',JSON.stringify({applicationCommit:'b5f471cd2cd56839e7ebbd0d3daf0bbf04791468',at:new Date().toISOString(),files},null,2));
for(const [script,args] of [['source-receipt.mjs',['b5f471cd2cd56839e7ebbd0d3daf0bbf04791468',dest+'/pre-run/source']],['commands.mjs',[dest+'/run']],['source-receipt.mjs',['b5f471cd2cd56839e7ebbd0d3daf0bbf04791468',dest+'/post-run/source']]]){const r=spawnSync(process.execPath,[root+'/'+script,...args],{encoding:'utf8',maxBuffer:40e6});writeFileSync(dest+'/'+script+'.log',(r.stdout||'')+(r.stderr||''));assert.equal(r.status,0,script);console.log(r.stdout);}
for(const f of files)assert.equal(createHash('sha256').update(readFileSync(root+'/'+f.path)).digest('hex'),f.sha256);
const pre=JSON.parse(readFileSync(dest+'/pre-run/source/source-receipt.json')),post=JSON.parse(readFileSync(dest+'/post-run/source/source-receipt.json'));assert.equal(pre.sourceSha256,post.sourceSha256);
writeFileSync(dest+'/verification.json',JSON.stringify({applicationCommit:pre.applicationCommit,sourceSha256:pre.sourceSha256,recipeHashesUnchanged:true,exactSourceUnchanged:true},null,2));
