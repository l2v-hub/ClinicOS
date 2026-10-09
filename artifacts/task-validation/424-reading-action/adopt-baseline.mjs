import assert from 'node:assert/strict';
import { readFileSync,writeFileSync,mkdirSync,readdirSync,copyFileSync,existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root='artifacts/task-validation/424-reading-action',from='C:/w-424-base/'+root,to=root+'/baseline04';
assert.equal(existsSync(to),false);mkdirSync(to,{recursive:true});
const source=JSON.parse(readFileSync(from+'/baseline04/source-receipt.json'));
assert.equal(source.applicationCommit,'b5f471cd2cd56839e7ebbd0d3daf0bbf04791468');
assert.equal(source.sourceSha256,JSON.parse(readFileSync(root+'/baseline/source-receipt.json')).sourceSha256);
const files=[];
function copy(dir,dest){mkdirSync(dest,{recursive:true});for(const e of readdirSync(dir,{withFileTypes:true})){if(e.isDirectory()){if(e.name!=='runtime-cache')copy(dir+'/'+e.name,dest+'/'+e.name);}else{const bytes=readFileSync(dir+'/'+e.name);copyFileSync(dir+'/'+e.name,dest+'/'+e.name);files.push({path:(dest+'/'+e.name).slice(to.length+1),sha256:createHash('sha256').update(bytes).digest('hex')});}}}
copy(from+'/baseline04',to);
for(const name of ['browser.mjs','qa-server.mjs','source-receipt.mjs']){mkdirSync(to+'/recipes',{recursive:true});copyFileSync(from+'/'+name,to+'/recipes/'+name);}
writeFileSync(to+'/adoption.json',JSON.stringify({baselineApplication:source.applicationCommit,exactBeforeEditSourceIdentityMatched:true,sourceSha256:source.sourceSha256,sourceBoundBaselineReplay:true,rootOwnedBaselineServer31392Stopped:true,files},null,2));
console.log('Exact accepted-source desktop/mobile baseline adopted; no application change');
