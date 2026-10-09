import assert from 'node:assert/strict';
import {readdirSync,statSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve('artifacts/task-validation/413-painad-focus/independent-qa/refinement-e01'),files=[];
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const previous=['artifacts/task-validation/413-painad-focus/independent-qa','artifacts/task-validation/413-painad-focus/independent-qa/refinement87','artifacts/task-validation/413-painad-focus/independent-qa/refinement15'];
const preserved=previous.map(base=>{const path=resolve(base,'immutable-manifest.json'),manifest=JSON.parse(readFileSync(path,'utf8'));for(const file of manifest.files)assert.equal(hash(resolve(base,file.path)),file.sha256,file.path);return {path:relative(root,path).replaceAll('\\','/'),sha256:hash(path),files:manifest.files.length,verdict:manifest.verdict,superseded:true};});
function walk(dir){for(const name of readdirSync(dir)){const path=resolve(dir,name);if(statSync(path).isDirectory())walk(path);else if(name!=='immutable-manifest.json')files.push({path:relative(root,path).replaceAll('\\','/'),sha256:hash(path)});}}
walk(root);files.sort((a,b)=>a.path.localeCompare(b.path));
const pre=JSON.parse(readFileSync(resolve(root,'pre/source-receipt.json'),'utf8')),post=JSON.parse(readFileSync(resolve(root,'post/source-receipt.json'),'utf8'));assert.equal(pre.sourceSha256,post.sourceSha256);assert.equal(pre.applicationCommit,post.applicationCommit);
writeFileSync(resolve(root,'immutable-manifest.json'),JSON.stringify({applicationCommit:pre.applicationCommit,sourceSha256:pre.sourceSha256,verdict:'READY FOR CODEX QA',preservedEarlierEvidence:preserved,files},null,2));console.log(JSON.stringify({files:files.length,preserved,verdict:'READY FOR CODEX QA'}));
