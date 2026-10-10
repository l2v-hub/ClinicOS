import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
const root='artifacts/task-validation/427-agenda-identity',source='C:/w-427-qa/'+root+'/independent-qa',target=root+'/independent-qa',rerun=root+'/root-rerun';
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,'')),sha=b=>createHash('sha256').update(b).digest('hex'),app=read(root+'/frozen-source.json').applicationCommit;
assert.equal(existsSync(target),false);assert.equal(existsSync(rerun),false);const bytes=readFileSync(source+'/manifest.json'),manifest=JSON.parse(bytes);assert.equal(manifest.head,app);
assert.match(readFileSync(source+'/validation-report.md','utf8'),/^Verdict: READY FOR CODEX QA\r?$/m);assert.equal(read(source+'/lane-handoff.json').browserLane,'RELEASED');
for(const f of manifest.files){assert.ok(!f.path.includes('..')&&!f.path.includes('runtime-cache')&&!f.path.includes('node_modules'));assert.ok(resolve(source,f.path).startsWith(resolve(source)+'/'.replace('/',process.platform==='win32'?'\\':'/')));assert.equal(sha(readFileSync(source+'/'+f.path)),f.sha256);mkdirSync(dirname(target+'/'+f.path),{recursive:true});copyFileSync(source+'/'+f.path,target+'/'+f.path);assert.equal(sha(readFileSync(target+'/'+f.path)),f.sha256);}
copyFileSync(source+'/manifest.json',target+'/manifest.json');const records=manifest.files.filter(f=>f.path.startsWith('recipes/')&&/\.(mjs|ps1)$/.test(f.path)).map(f=>({name:f.path.slice(8),sha256:f.sha256}));assert.ok(records.length>=4);
for(const r of records){mkdirSync(rerun+'/recipes',{recursive:true});copyFileSync(target+'/recipes/'+r.name,rerun+'/recipes/'+r.name);assert.equal(sha(readFileSync(rerun+'/recipes/'+r.name)),r.sha256);}
copyFileSync(target+'/browser-plan.json',rerun+'/browser-plan.json');writeFileSync(rerun+'/pre-run.json',JSON.stringify({applicationCommit:app,qaManifestSha256:sha(bytes),records,decision:'AUTHORIZED IDENTICAL ROOT REPLAY; NO APP WRITE',at:new Date().toISOString()},null,2));console.log(JSON.stringify({adoptedFiles:manifest.files.length,manifestSha256:sha(bytes),recipes:records.length}));
