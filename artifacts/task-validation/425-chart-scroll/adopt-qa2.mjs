import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
const source='C:/w-425-qa2/artifacts/task-validation/425-chart-scroll/independent-qa2';
const target='artifacts/task-validation/425-chart-scroll/independent-qa2';
const hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(existsSync(target),false);
const bytes=readFileSync(source+'/artifact-manifest.json'),manifest=JSON.parse(bytes);
assert.equal(manifest.head,'b7ae14d120c1e70ccf72784206a505f8c48f975e');
assert.equal(hash(bytes),'d2b1a84a534fcc1e1e98cabc5e48f8134aa45ad344727710a6a188daf82f2e3d');
assert.match(readFileSync(source+'/validation-report.md','utf8'),/^QA Verdict: READY FOR CODEX QA$/m);
for(const f of manifest.files){assert.ok(!f.path.includes('..'));assert.equal(hash(readFileSync(source+'/'+f.path)),f.sha256);mkdirSync(dirname(target+'/'+f.path),{recursive:true});copyFileSync(source+'/'+f.path,target+'/'+f.path);assert.equal(hash(readFileSync(target+'/'+f.path)),f.sha256);}
writeFileSync(target+'/artifact-manifest.json',bytes);
const recipes=['browser01.mjs','browser02-denied.mjs','browser03-clip.mjs','commands.mjs','security.mjs','qa-server.mjs'];
const rerun='artifacts/task-validation/425-chart-scroll/root-rerun2/recipes';mkdirSync(rerun,{recursive:true});
const records=recipes.map(name=>{copyFileSync(target+'/recipes/'+name,rerun+'/'+name);const sha256=hash(readFileSync(rerun+'/'+name));assert.equal(sha256,hash(readFileSync(target+'/recipes/'+name)));return {name,sha256};});
writeFileSync('artifacts/task-validation/425-chart-scroll/root-rerun2/pre-run.json',JSON.stringify({head:manifest.head,qaManifestSha256:hash(bytes),qaArtifacts:manifest.files.length,records,decision:'FROZEN BYTE-IDENTICAL RECIPES BEFORE ROOT RERUN',at:new Date().toISOString()},null,2));
console.log(JSON.stringify({immutableArtifacts:manifest.files.length,manifestSha256:hash(bytes),recipes:records.length}));
