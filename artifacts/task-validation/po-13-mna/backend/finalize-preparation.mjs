import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
const root='C:/Workspace/ClinicOSHouse-worktrees/po13-mna-backend';
const folder='artifacts/task-validation/po-13-mna/backend';
const artifact=resolve(root,folder);
const hash=value=>createHash('sha256').update(value).digest('hex');
const json=async name=>JSON.parse(await readFile(resolve(artifact,name),'utf8'));
const receipt=await json('preparation-receipt.json');
const release=await json('claims-preparation-release.json');
if(!release.released || release.issueId!=='PO-13-backend-runtime-preparation')throw new Error('Release missing');
for(const row of receipt.preserved)
  if(hash(await readFile(resolve(root,row.path)))!==row.sha256)throw new Error('Protected file changed');
if(hash(await readFile(resolve(artifact,'task-contract.snapshot.md')))!==receipt.rootContractSha256 ||
   hash(await readFile(resolve(artifact,'backend-contract.md')))!==receipt.dtoContractSha256)
  throw new Error('Contract changed');
const list=async path=>{
  const result=[];
  for(const entry of await readdir(path,{withFileTypes:true})){
    if(entry.isSymbolicLink())throw new Error('Unexpected artifact link');
    const full=resolve(path,entry.name);
    if(entry.isDirectory())result.push(...await list(full));
    else if(entry.isFile())result.push(full);
  }
  return result;
};
const paths=(await list(artifact)).map(path=>relative(artifact,path).replaceAll('\\','/'))
  .filter(path=>path!=='artifact-manifest.json').sort();
receipt.finalizedAt=new Date().toISOString();
receipt.claimReleased=true;
receipt.claimRelease='claims-preparation-release.json';
receipt.setupRepair='Initial preflight rejected the assigned CRLF task-contract copy before any runtime mutation. Authoritative LF original copied byte-for-byte; normalization proof recorded in contract-provenance.json.';
receipt.artifactCopyAllowlist=[...paths,'artifact-manifest.json'];
receipt.doNotCopy=['backend/node_modules','root node_modules junction','run-claude-queue.ps1','start-claude-team.ps1'];
await writeFile(resolve(artifact,'preparation-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
const entries=[];
for(const path of paths){
  const bytes=await readFile(resolve(artifact,path));
  entries.push({path:folder+'/'+path,bytes:bytes.length,sha256:hash(bytes)});
}
await writeFile(resolve(artifact,'artifact-manifest.json'),JSON.stringify({
  task:receipt.task,phase:receipt.phase,generatedAt:receipt.finalizedAt,baseline:receipt.baseline,
  artifacts:entries
},null,2)+'\n');
console.log(JSON.stringify({completed:true,artifacts:entries.length,claimReleased:true,
  sourceTreeSha256:receipt.sourceTreeSha256,rootContractSha256:receipt.rootContractSha256,dtoContractSha256:receipt.dtoContractSha256,
  receiptSha256:hash(await readFile(resolve(artifact,'preparation-receipt.json'))),
  artifactManifestSha256:hash(await readFile(resolve(artifact,'artifact-manifest.json')))}));
