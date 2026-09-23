import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const task=process.argv.find(value=>/^po-\d{2}-[a-z-]+$/.test(value))??'po-12-tinetti';
const base=`artifacts/task-validation/${task}`;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const config=await json(`${base}/root-validation-config.json`);
if(!config.checks||!config.scope)throw new Error('Missing reviewed validation description');
const stage=new Set(),sources=new Map();
for(const side of ['backend','frontend']){
 const integrationPath=`${base}/${side}-integration.json`,integration=await json(integrationPath);
 stage.add(integrationPath);
 for(const entry of integration.files){
  const bytes=await readFile(entry.path),hash=sha(bytes);
  if(hash!==entry.sha256)throw new Error(`Unreviewed source drift ${entry.path}`);
  stage.add(entry.path);sources.set(entry.path,{path:entry.path,sha256:hash,bytes:bytes.length,workerSha256:entry.sha256});
 }
 const manifestPath=`${base}/${side}/artifact-manifest.json`,manifest=await json(manifestPath);stage.add(manifestPath);
 for(const entry of manifest.artifacts){if(sha(await readFile(entry.path))!==entry.sha256)throw new Error(`Evidence drift ${entry.path}`);stage.add(entry.path)}
}
for(const path of config.rootSources){const bytes=await readFile(path);sources.set(path,{path,bytes:bytes.length,sha256:sha(bytes),owner:'root'});stage.add(path)}
async function addDirectory(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=`${dir}/${entry.name}`;if(entry.isDirectory())await addDirectory(path);else stage.add(path)}}
for(const dir of config.evidenceDirectories??[])await addDirectory(dir);
for(const path of config.evidencePaths)stage.add(path);
stage.add(`${base}/root-validation-config.json`);stage.add('artifacts/task-validation/po-12-tinetti/finalize-root.mjs');
for(const [path,expected] of [['run-claude-queue.ps1','e280791c291971ec64a760ac453a6476bb8f0302b35f71a3f43dc84db99b1008'],['start-claude-team.ps1','606dc3da172f5f020d3ea757462db1db8a33553ced03aabeb3db0aec69a70b78']])if(sha(await readFile(path))!==expected)throw new Error(`User launcher changed ${path}`);
const sourceFiles=[...sources.values()].sort((a,b)=>a.path.localeCompare(b.path));const sourceStateId=sha(JSON.stringify(sourceFiles));
await writeFile(`${base}/source-manifest-root.json`,JSON.stringify({sourceStateId,files:sourceFiles},null,2));stage.add(`${base}/source-manifest-root.json`);
const evidence=[];
for(const path of [...stage].sort()){
 if(/(^|\/)(node_modules|cache|scratch|db|releases|\.env[^/]*)(\/|$)|private-schema\.prisma$|(^|\/)\.\.\//.test(path)||path.includes('\\')||path.startsWith('/')||path.includes(':'))throw new Error(`Unsafe stage ${path}`);
 const bytes=await readFile(path);evidence.push({path,bytes:bytes.length,sha256:sha(bytes)});
}
await writeFile(`${base}/root-release-gate.json`,JSON.stringify({decision:'ALLOW_RELEASE',authorization:'User approved PO01–PO16, commit/push and deploy',sourceStateId,at:new Date().toISOString(),checks:config.checks,scope:config.scope,files:evidence},null,2));stage.add(`${base}/root-release-gate.json`);
await writeFile(`${base}/stage-paths.json`,JSON.stringify([...stage].sort(),null,2));
if(process.argv.includes('--stage')){const paths=[...stage].sort();for(let i=0;i<paths.length;i+=30){const result=spawnSync('git',['add','-f','--',...paths.slice(i,i+30)],{encoding:'utf8',windowsHide:true});if(result.status!==0)throw new Error(result.stderr)}}
console.log(JSON.stringify({task,sourceStateId,sourceFiles:sourceFiles.length,stageFiles:stage.size}));
