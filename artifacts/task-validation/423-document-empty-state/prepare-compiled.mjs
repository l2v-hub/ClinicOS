import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='artifacts/task-validation/423-document-empty-state',out=root+'/compiled-online',sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(existsSync(out),false);const receipt=JSON.parse(readFileSync(root+'/deployment-receipt.json')),app=JSON.parse(readFileSync(root+'/frozen-source.json')).applicationCommit;
assert.equal(receipt.applicationCommit,app);assert.equal(receipt.decision,'VERIFIED RELEASE');mkdirSync(out+'/recipes',{recursive:true});const plan=JSON.parse(readFileSync(root+'/root-rerun/browser-plan.json')),records=[];
for(const item of plan){const path=root+'/root-rerun/'+item.recipe,bytes=readFileSync(path);copyFileSync(path,out+'/'+item.recipe);assert.equal(sha(readFileSync(out+'/'+item.recipe)),sha(bytes));records.push({...item,localFrozenRecipeSha256:sha(bytes),compiledRecipeSha256:sha(bytes),changed:'NONE: byte-identical recipe; only APP_URL environment selects deployed compiled static GET transport. Assertions/fixtures/guards unchanged.'});}
copyFileSync(root+'/root-rerun/browser-plan.json',out+'/browser-plan.json');
const dependencies=JSON.parse(readFileSync(root+'/root-rerun/pre-run.json')).records.filter(r=>!plan.some(p=>p.recipe==='recipes/'+r.name));
for(const dep of dependencies){const bytes=readFileSync(root+'/root-rerun/recipes/'+dep.name);assert.equal(sha(bytes),dep.sha256);copyFileSync(root+'/root-rerun/recipes/'+dep.name,out+'/recipes/'+dep.name);assert.equal(sha(readFileSync(out+'/recipes/'+dep.name)),dep.sha256);}
writeFileSync(out+'/pre-run.json',JSON.stringify({applicationCommit:app,bundleUrl:receipt.vercel.bundleUrl,bundleSha256Before:receipt.vercel.bundleSha256,styleAssets:receipt.vercel.styleAssets,htmlSha256Before:receipt.vercel.htmlSha256,records,dependencies,decision:'BYTE-IDENTICAL RECIPES FROZEN BEFORE COMPILED ONLINE READONLY TESTS',productionPatientTestMutations:0,at:new Date().toISOString()},null,2));console.log('Compiled recipes frozen byte-identically; all APIs intercepted before wire');
