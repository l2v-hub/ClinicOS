import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const root='C:/Workspace/ClinicOSHouse-worktrees/po14-gds-backend', folder='artifacts/task-validation/po-14-gds/backend', artifact=resolve(root,folder);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async name=>JSON.parse(await readFile(resolve(artifact,name),'utf8'));
const receipt=await json('preparation-receipt.json');
const definitions=await json('definition-contract.json');
const sourceText=(await readFile(resolve(artifact,'source-gds.txt'),'utf8')).replace(/\s+/gu,' ').trim();
for(const item of definitions.items) assert(sourceText.includes(item.label),item.id);
for(const key of ['instruction','screeningNote','reference']) assert(sourceText.includes(definitions[key]),key);
assert.equal(definitions.items.length,15);
assert.equal(definitions.items.filter(item=>item.pointForYes).length,10);
for(const row of receipt.preserved) assert.equal(sha(await readFile(resolve(root,row.path))),row.sha256,row.path);
assert.equal(sha(await readFile(resolve(artifact,'task-contract.snapshot.md'))),receipt.rootContractSha256);
assert.equal(sha(await readFile(resolve(artifact,'backend-contract.md'))),receipt.dtoContractSha256);
const inputManifest=await json('preparation-source-manifest.json');
for(const row of inputManifest.inputs) assert.equal(sha(await readFile(resolve(root,row.path))),row.sha256,row.path);
const appScopes=['backend/src','prisma','src','frontend/src','scripts','tests/fixtures'];
for(const args of [['diff','HEAD','--name-only','--',...appScopes],['ls-files','--others','--exclude-standard','--',...appScopes]])
 assert.equal(execFileSync('git',args,{cwd:root,windowsHide:true,encoding:'utf8'}).trim(),'');
const base=['claims-preparation.json','preparation-recall.json','prepare-runtime.mjs','finalize-preparation.mjs','initial-preparation-path-failure.json',
 'preparation-session.json','preparation-receipt.json','preparation-source-manifest.json','backend-contract.md','task-contract.snapshot.md',
 'contract-provenance.json','source-gds.txt','source-provenance.json','definition-contract.json',...receipt.contracts.copiedPreparation.map(row=>row.path)];
let release;
try { const wrapper=await json('claims-preparation-release.json');release=JSON.parse(wrapper.content.find(row=>row.type==='text').text); }
catch(error) { if(error.code!=='ENOENT') throw error; }
if(!release){console.log(JSON.stringify({preflightPassed:true,sourceUnchanged:true,sourceTreeSha256:receipt.sourceTreeSha256,definitionContractSha256:sha(await readFile(resolve(artifact,'definition-contract.json'))),awaitingClaimRelease:true}));process.exit(0);}
assert(release.success && release.previousClaim.issueId==='PO-14-backend-runtime-preparation');
receipt.finalizedAt=new Date().toISOString();
receipt.claimReleased=true;
receipt.claimRelease='claims-preparation-release.json';
receipt.definitionContract={path:'definition-contract.json',sha256:sha(await readFile(resolve(artifact,'definition-contract.json'))),sourceTextVerified:true};
receipt.artifactCopyAllowlist=[...new Set([...base,'claims-preparation-release.json','artifact-manifest.json'])].sort();
receipt.doNotCopy=['backend/node_modules','root node_modules junction','run-claude-queue.ps1','start-claude-team.ps1'];
await writeFile(resolve(artifact,'preparation-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
const artifacts=await Promise.all(receipt.artifactCopyAllowlist.filter(name=>name!=='artifact-manifest.json').map(async name=>{
 const bytes=await readFile(resolve(artifact,name));return {path:folder+'/'+name,bytes:bytes.length,sha256:sha(bytes)};
}));
await writeFile(resolve(artifact,'artifact-manifest.json'),JSON.stringify({task:receipt.task,phase:receipt.phase,generatedAt:receipt.finalizedAt,baseline:receipt.baseline,artifacts},null,2)+'\n');
console.log(JSON.stringify({prepared:true,artifacts:artifacts.length,sourceTreeSha256:receipt.sourceTreeSha256,receiptSha256:sha(await readFile(resolve(artifact,'preparation-receipt.json'))),artifactManifestSha256:sha(await readFile(resolve(artifact,'artifact-manifest.json')))}));
