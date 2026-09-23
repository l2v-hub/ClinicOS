import {readFile,writeFile,mkdir,realpath,access} from 'node:fs/promises';
import {resolve,relative,isAbsolute,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const [workerArg,manifestPath,scope,task='po-11-postural-transfers']=process.argv.slice(2);
if(!['backend','frontend'].includes(scope)||!/^po-\d{2}-[a-z-]+$/.test(task))throw new Error('Explicit scoped task required');
const root=await realpath(process.cwd()),worker=await realpath(workerArg),base=`artifacts/task-validation/${task}`;
const sha=b=>createHash('sha256').update(b).digest('hex');
const inside=(base,path)=>{const p=resolve(base,path),tail=relative(base,p);if(!tail||isAbsolute(tail)||tail.startsWith('..'))throw new Error('Path escaped scope');return p;};
const receiptPath=`${base}/${scope}-integration.json`,previousBytes=await readFile(receiptPath),previous=JSON.parse(previousBytes);
if(previous.worker!==worker)throw new Error('Unexpected worker');
const manifestBytes=await readFile(inside(worker,manifestPath)),manifest=JSON.parse(manifestBytes);
const files=manifest.sourceIdentity?.files??manifest.files??manifest.sourcePaths;
if(!Array.isArray(files)||!files.length)throw new Error('Source manifest required');
const old=new Map(previous.files.map(e=>[e.path,e.sha256])),next=new Set(files.map(e=>e.path));
for(const path of old.keys())if(!next.has(path))throw new Error(`Removal requires explicit review: ${path}`);
const pending=[];
for(const entry of files){
 if(!(entry.path.startsWith(`${scope}/`)||(scope==='backend'&&entry.path.startsWith('prisma/')))||/(^|\/)(node_modules|dist|\.env[^/]*)(\/|$)|(^|\/)package(-lock)?\.json$/.test(entry.path))throw new Error(`Out of scope ${entry.path}`);
 const data=await readFile(inside(worker,entry.path));if(sha(data)!==entry.sha256)throw new Error(`Worker drift ${entry.path}`);
 const dest=inside(root,entry.path),exists=await access(dest).then(()=>true,()=>false);
 if(old.has(entry.path)){
  if(!exists||sha(await readFile(dest))!==old.get(entry.path))throw new Error(`Root independently changed ${entry.path}`);
 }else if(exists){
  const tracked=spawnSync('git',['ls-files','--error-unmatch','--',entry.path],{windowsHide:true,stdio:'ignore'}).status===0;
  if(!tracked||spawnSync('git',['diff','--quiet','HEAD','--',entry.path],{windowsHide:true}).status!==0)throw new Error(`New path collision ${entry.path}`);
 }
 pending.push({entry,data,dest});
}
await mkdir(`${base}/integration-history`,{recursive:true});
await writeFile(`${base}/integration-history/${scope}-${previous.manifestSha256}.json`,previousBytes);
for(const {entry,data,dest} of pending){await mkdir(dirname(dest),{recursive:true});await writeFile(dest,data);if(sha(await readFile(dest))!==entry.sha256)throw new Error('Copy mismatch');}
await writeFile(receiptPath,JSON.stringify({at:new Date().toISOString(),decision:'ALLOW_REINTEGRATE_AFTER_CLAIM_RELEASE',scope,worker,
 authorization:'User approved plan and deployment; root invokes only after worker refinement claim released',previousManifestSha256:previous.manifestSha256,
 manifestSha256:sha(manifestBytes),files:files.map(({path,sha256})=>({path,sha256}))},null,2));
console.log(JSON.stringify({scope,files:files.length,changed:files.filter(e=>old.get(e.path)!==e.sha256).length,manifestSha256:sha(manifestBytes)}));
