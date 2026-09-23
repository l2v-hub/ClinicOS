import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const base='artifacts/task-validation/po-08-consegne-giro';
const worker='C:/Workspace/ClinicOSHouse-worktrees/po08-handover-ui';
const digest=b=>createHash('sha256').update(b).digest('hex');
const previous=JSON.parse(await readFile(`${base}/frontend/source-manifest.json`));
const bytes=await readFile(resolve(worker,`${base}/frontend/source-manifest.json`));
const next=JSON.parse(bytes);
const changed=[];
for(const item of next.files){
  const old=previous.files.find(f=>f.path===item.path);
  if(!old || digest(await readFile(item.path))!==old.sha256) throw new Error(`Root changed ${item.path}`);
  const data=await readFile(resolve(worker,item.path));
  if(digest(data)!==item.sha256) throw new Error(`Worker changed ${item.path}`);
  if(item.sha256!==old.sha256) changed.push({...item,data});
}
for(const item of changed) await writeFile(item.path,item.data);
await writeFile(`${base}/frontend/source-manifest.json`,bytes);
await writeFile(`${base}/frontend-refinement-integration.json`,JSON.stringify({at:new Date().toISOString(),decision:'ALLOW_INTEGRATE',reason:'PO08 embedded feed header, explicit worker claim release; previous and new byte hashes verified',sourceStateId:next.sourceStateId,files:changed.map(({data,...item})=>item)},null,2));
console.log(JSON.stringify({integrated:changed.map(i=>i.path),sourceStateId:next.sourceStateId}));
