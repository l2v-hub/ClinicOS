import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const task=process.argv[2]??'po-13-mna';
if(!/^po-\d{2}-[a-z-]+$/.test(task))throw new Error('Invalid task');
const base=`artifacts/task-validation/${task}`;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const files=[];
async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){const next=`${path}/${entry.name}`;if(entry.isDirectory())await walk(next);else{const bytes=await readFile(next);files.push({path:next,bytes:bytes.length,sha256:sha(bytes)})}}}
await walk(`${base}/preview/build`);files.sort((a,b)=>a.path.localeCompare(b.path));
const input=[];
for(const path of [`${base}/preview/main.tsx`,`${base}/preview/build.mjs`,`${base}/preview/index.html`,`${base}/frontend/source-manifest.json`])input.push({path,sha256:sha(await readFile(path))});
await writeFile(`${base}/preview-build-manifest.json`,JSON.stringify({recordedAfterBrowserValidation:true,input,files},null,2));
console.log(JSON.stringify({task,files:files.length}));
