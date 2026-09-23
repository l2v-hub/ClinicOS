import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const base='artifacts/task-validation/po-10-painad';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const stage=new Set(),sources=new Map();
const refined=new Set(['frontend/src/components/operator/assessments/AssessmentWorkspace.tsx','frontend/src/components/operator/assessments/AssessmentWorkspace.css']);
for(const side of ['backend','frontend']){
 const integration=await json(`${base}/${side}-integration.json`);
 for(const entry of integration.files){
  const bytes=await readFile(entry.path),hash=sha(bytes);
  if(hash!==entry.sha256&&!refined.has(entry.path))throw new Error(`Unreviewed drift ${entry.path}`);
  stage.add(entry.path);sources.set(entry.path,{path:entry.path,sha256:hash,bytes:bytes.length,workerSha256:entry.sha256,rootRefined:refined.has(entry.path)});
 }
 const manifestPath=`${base}/${side}/artifact-manifest.json`,manifest=await json(manifestPath);
 stage.add(manifestPath);
 for(const entry of manifest.artifacts){
  if(sha(await readFile(entry.path))!==entry.sha256)throw new Error(`Evidence drift ${entry.path}`);
  stage.add(entry.path);
 }
}
for(const path of ['backend/package.json','package-lock.json','scripts/build/copy-assessment-fonts.mjs',
 'backend/src/assessments/fonts/NotoSans-Regular.ttf','backend/src/assessments/fonts/NotoSans-Bold.ttf','backend/src/assessments/fonts/OFL.txt',
 'tests/fixtures/po10-assessments.mjs','tests/integration/po10-assessments.test.mts']){
 const bytes=await readFile(path);sources.set(path,{path,sha256:sha(bytes),bytes:bytes.length,owner:'root'});stage.add(path);
}
for(const path of ['run-claude-queue.ps1','start-claude-team.ps1']){
 const expected=path.startsWith('run-')?'e280791c291971ec64a760ac453a6476bb8f0302b35f71a3f43dc84db99b1008':'606dc3da172f5f020d3ea757462db1db8a33553ced03aabeb3db0aec69a70b78';
 if(sha(await readFile(path))!==expected)throw new Error(`User file changed ${path}`);
}
async function addFiles(dir){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const path=`${dir}/${entry.name}`;
  if(entry.isDirectory())await addFiles(path);else stage.add(path);
 }
}
await addFiles(`${base}/qa-evidence`);
for(const path of ['browser-state-receipt.json','compiled-pdf-receipt.json','backend-integration.json','frontend-integration.json','integrate-worker.mjs',
 'copy-worker-evidence.mjs','verify-browser-state.mjs','verify-compiled-pdf.mjs','finalize-root.mjs','validation-report.md','review-notes.md',
 'backend-build-root.log','frontend-build-final.log','frontend-refinement-tests.log','root-integration-tests.log','secret-scan.log',
 'root-generation/private-generation-receipt.json','dependencies/font-provenance.json','dependencies/verify-fonts.mjs',
 'preview/main.tsx','preview/server.mjs','preview/index.html','preview/synthetic-state.json'])stage.add(`${base}/${path}`);
for(const path of ['docs/product/stato-esecuzione-piano-2026-09-22.md','docs/product/note-implementazione-piano-2026-09-23.md',
 'artifacts/task-validation/po-11-postural-transfers/task-contract.md'])stage.add(path);
const sourceFiles=[...sources.values()].sort((a,b)=>a.path.localeCompare(b.path));
const sourceStateId=sha(JSON.stringify(sourceFiles));
await writeFile(`${base}/source-manifest-root.json`,JSON.stringify({sourceStateId,files:sourceFiles},null,2));
stage.add(`${base}/source-manifest-root.json`);
const evidence=[];
for(const path of [...stage].sort()){
 if(/(^|\/)(node_modules|cache|scratch|db|releases|\.env[^/]*)(\/|$)|private-schema\.prisma$/.test(path))throw new Error(`Unsafe stage ${path}`);
 const bytes=await readFile(path);evidence.push({path,bytes:bytes.length,sha256:sha(bytes)});
}
await writeFile(`${base}/root-release-gate.json`,JSON.stringify({decision:'ALLOW_RELEASE',authorization:'User approved PO01–PO16, commit/push and deploy',
 sourceStateId,at:new Date().toISOString(),checks:'51 backend +72 frontend worker tests, 19 root refinement tests, 3 HTTP/nativePG, source/compiled PDF QA, synthetic browser, responsive 390/768/1262, build and secret scan',
 scope:'PO10 backend migration and frontend from immutable commit; AI runtime unchanged',files:evidence},null,2));
stage.add(`${base}/root-release-gate.json`);
await writeFile(`${base}/stage-paths.json`,JSON.stringify([...stage].sort(),null,2));
if(process.argv.includes('--stage')){
 const paths=[...stage].sort();
 for(let i=0;i<paths.length;i+=30){
  const r=spawnSync('git',['add','-f','--',...paths.slice(i,i+30)],{encoding:'utf8',windowsHide:true});
  if(r.status!==0)throw new Error(r.stderr);
 }
}
console.log(JSON.stringify({sourceStateId,sourceFiles:sourceFiles.length,stageFiles:stage.size}));
