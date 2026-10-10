import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve,sep} from 'node:path';
const root='artifacts/task-validation/423-document-empty-state',source='C:/w-423-qa2/'+root+'/independent-qa',target=root+'/independent-qa',rerun=root+'/root-rerun';
const expectedHash=process.argv[2],expectedCount=Number(process.argv[3]);
assert.match(expectedHash,/^[a-f0-9]{64}$/);assert.ok(expectedCount>0);
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,'')),sha=b=>createHash('sha256').update(b).digest('hex'),app=read(root+'/frozen-source.json').applicationCommit;
assert.equal(existsSync(target),false);assert.equal(existsSync(rerun),false);
const bytes=readFileSync(source+'/manifest.json'),manifest=JSON.parse(bytes);
assert.equal(manifest.head,app);assert.equal(sha(bytes),expectedHash);assert.equal(manifest.files.length,expectedCount);
assert.match(readFileSync(source+'/validation-report.md','utf8'),/^Verdict: READY FOR CODEX QA\r?$/m);
assert.match(readFileSync(source+'/lane-handoff.md','utf8'),/^# RELEASED\r?$/m);
assert.equal(new Set(manifest.files.map(f=>f.path)).size,expectedCount);
writeFileSync(root+'/qa-adoption-policy.json',JSON.stringify({applicationCommit:app,decision:'AUTHORIZED IMMUTABLE INDEPENDENT EVIDENCE COPY AND IDENTICAL ROOT REPLAY ONLY',qaManifestSha256:expectedHash,files:expectedCount,applicationWrites:false,productionWrites:false,at:new Date().toISOString()},null,2));
for(const f of manifest.files){
 assert.ok(!f.path.includes('..')&&!f.path.includes('runtime-cache')&&!f.path.includes('node_modules'));
 assert.ok(resolve(source,f.path).startsWith(resolve(source)+sep));
 assert.equal(sha(readFileSync(source+'/'+f.path)),f.sha256);
 mkdirSync(dirname(target+'/'+f.path),{recursive:true});copyFileSync(source+'/'+f.path,target+'/'+f.path);
 assert.equal(sha(readFileSync(target+'/'+f.path)),f.sha256);
}
copyFileSync(source+'/manifest.json',target+'/manifest.json');
const records=manifest.files.filter(f=>f.path.startsWith('recipes/')).map(f=>({name:f.path.slice(8),sha256:f.sha256}));assert.ok(records.length>=4);
for(const r of records){mkdirSync(dirname(rerun+'/recipes/'+r.name),{recursive:true});copyFileSync(target+'/recipes/'+r.name,rerun+'/recipes/'+r.name);assert.equal(sha(readFileSync(rerun+'/recipes/'+r.name)),r.sha256);}
copyFileSync(target+'/browser-plan.json',rerun+'/browser-plan.json');
writeFileSync(rerun+'/pre-run.json',JSON.stringify({applicationCommit:app,qaManifestSha256:sha(bytes),records,decision:'AUTHORIZED IDENTICAL ROOT REPLAY; NO APP WRITE',at:new Date().toISOString()},null,2));
console.log(JSON.stringify({adoptedFiles:manifest.files.length,manifestSha256:sha(bytes),recipes:records.length}));
