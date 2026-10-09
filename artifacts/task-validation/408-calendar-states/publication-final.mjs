import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root='artifacts/task-validation/408-calendar-states';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const independent=JSON.parse(readFileSync(`${root}/independent/publication-manifest.json`,'utf8'));
const rerun=JSON.parse(readFileSync(`${root}/root-rerun/publication-manifest.json`,'utf8'));
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(`${dir}/${e.name}`):[`${dir}/${e.name}`]);
const metadata=['task-contract.md','issue-source.json','architecture-review.md','implementation-receipt.md','validation-report.md','candidate.patch','publication-final.mjs'];
const paths=[...new Set([...independent.files.map(f=>f.path),`${root}/independent/publication-manifest.json`,...walk(`${root}/root-rerun`),...metadata.map(x=>`${root}/${x}`)])].sort();
const mode=process.argv[2];
if(mode==='prepare'){
 for(const manifest of [independent,rerun]){
  assert.equal(manifest.applicationCommit,'f58fbbd3337fabe68315dbd3cf7d295219dab58e');assert.equal(manifest.verdict,'BLOCKED');
  assert.equal(manifest.applicationSourceSha256,'fe8f81cf7483941b21958ee92a1340767625dbc6665db320b91eb9b5b95189a8');
  for(const file of manifest.files)assert.equal(sha(readFileSync(file.path)),file.sha256,`Frozen evidence mismatch ${file.path}`);
 }
 const credentials=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;let secretChecks=0;
 for(const file of paths){const bytes=readFileSync(file);
  for(const key of ['GH_TOKEN','VERCEL_TOKEN','RAILWAY_API_TOKEN']){const token=credentials[key];if(typeof token==='string'&&token.length>15){assert.ok(!bytes.includes(Buffer.from(token)),`Private credential found in ${file}`);secretChecks++;}}
  if(!/\.(png|jpg|zip|webm)$/.test(file))assert.ok(!/\b[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]\b/.test(bytes.toString('utf8')),`Fiscal identifier in ${file}`);
 }
 const receipt={applicationCommit:independent.applicationCommit,applicationSourceSha256:independent.applicationSourceSha256,decision:'PARTIAL PROOF ONLY; ORIGINAL AC4 DEVICE IN INTENSE LIGHT UNVERIFIED',acceptedApplicationBaseline:'973d78e5e109032a36cf89cf80fd8eb2a848a649',applicationReleased:false,secretChecks,excluded:['initial root runs','independent/debug-attempts/**','real audit images','unrelated launchers','coordination metadata','generated builds'],files:paths.map(path=>({path,sha256:sha(readFileSync(path))}))};
 writeFileSync(`${root}/publication-manifest.json`,JSON.stringify(receipt,null,2));
 const stage=spawnSync('git',['add','-f','--',...paths,`${root}/publication-manifest.json`],{encoding:'utf8'});assert.equal(stage.status,0,stage.stderr);
 console.log(JSON.stringify({files:receipt.files.length,secretChecks,stagedExplicitPaths:true}));
}else if(mode==='verify-git'){
 const receipt=JSON.parse(readFileSync(`${root}/publication-manifest.json`,'utf8'));
 for(const file of receipt.files){const r=spawnSync('git',['show',`HEAD:${file.path}`],{maxBuffer:50*1024*1024});assert.equal(r.status,0);assert.equal(sha(r.stdout),file.sha256,`Immutable git artifact mismatch ${file.path}`);}
 console.log(JSON.stringify({gitBlobHashesVerified:receipt.files.length,applicationReleased:false}));
}else throw new Error('prepare or verify-git required');
