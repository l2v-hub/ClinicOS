import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='artifacts/task-validation/424-reading-action',out=root+'/compiled-online/pre-run';assert.equal(existsSync(out),false);mkdirSync(out+'/recipes',{recursive:true});const files=[];
for(const name of ['compiled-browser.mjs','compiled-supplemental.mjs','verify-online.mjs']){const bytes=readFileSync(root+'/'+name);copyFileSync(root+'/'+name,out+'/recipes/'+name);files.push({name,sha256:createHash('sha256').update(bytes).digest('hex')});}
writeFileSync(out+'/recipes.json',JSON.stringify({applicationCommit:'67d21c3e9257a5acb8c9b25130c9417fb92185fb',files,at:new Date().toISOString(),decision:'FROZEN BEFORE ONLINE BROWSER EXECUTION',cases:21,authority:'Human authorized static production QA only, all clinical/auth APIs mocked before wire'},null,2));console.log('Online recipes21 frozen');
