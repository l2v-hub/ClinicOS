import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root='artifacts/task-validation/407-badge-contrast';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const independent=JSON.parse(readFileSync(`${root}/independent/publication-manifest.json`,'utf8'));
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(`${dir}/${e.name}`):[`${dir}/${e.name}`]);
const metadata=['task-contract.md','issue-source.json','implementation-receipt.md','validation-report.md','release-inspection.ps1','deployment-receipt.json','root-release-gate.mjs','release-gate-receipt.json','publication-final.mjs','qa-commands.mjs','qa-browser.mjs','qa-server.mjs','qa-source-receipt.mjs','qa-publication-receipt.mjs'];
const paths=[...new Set([...independent.files.map(f=>f.path),`${root}/independent/publication-manifest.json`,`${root}/independent/device-addendum.md`,...walk(`${root}/root-rerun`),...metadata.map(x=>`${root}/${x}`)])].sort();
const mode=process.argv[2];
if(mode==='prepare'){
 const credentials=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
 let secretValuesChecked=0;
 for(const file of paths){
  const bytes=readFileSync(file);
  for(const key of ['GH_TOKEN','VERCEL_TOKEN','RAILWAY_API_TOKEN']){
   const token=credentials[key];if(typeof token==='string'&&token.length>15){assert.ok(!bytes.includes(Buffer.from(token)),`Private credential found in ${file}`);secretValuesChecked++;}
  }
  if(!/\.(png|jpg|zip|webm)$/.test(file))assert.ok(!/\b[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]\b/.test(bytes.toString('utf8')),`Fiscal identifier in ${file}`);
 }
 for(const file of independent.files)assert.equal(sha(readFileSync(file.path)),file.sha256);
 const receipt={applicationCommit:independent.applicationCommit,applicationSourceSha256:independent.applicationSourceSha256,decision:'SOURCE-BOUND SYNTHETIC PROOF',secretChecks:secretValuesChecked,originalIndependentManifestFrozen:true,actualDesktopVisual:'root-rerun/device/chrome-desktop.jpg audited separately by independent/device-addendum.md',headlessMobile:'viewport emulation only',excluded:['root initial failed/debug runs','independent/debug-attempts/**','405 application source','unrelated launchers','coordination metadata','real audit photos'],files:paths.map(path=>({path,sha256:sha(readFileSync(path))}))};
 writeFileSync(`${root}/publication-manifest.json`,JSON.stringify(receipt,null,2));
 const stage=spawnSync('git',['add','-f','--',...paths,`${root}/publication-manifest.json`],{encoding:'utf8'});assert.equal(stage.status,0,stage.stderr);
 console.log(JSON.stringify({files:receipt.files.length,secretChecks:secretValuesChecked,stagedExplicitPaths:true}));
}else if(mode==='verify-git'){
 const receipt=JSON.parse(readFileSync(`${root}/publication-manifest.json`,'utf8'));
 for(const file of receipt.files){const r=spawnSync('git',['show',`HEAD:${file.path}`],{maxBuffer:50*1024*1024});assert.equal(r.status,0);assert.equal(sha(r.stdout),file.sha256,`Immutable git artifact mismatch ${file.path}`);}
 console.log(JSON.stringify({gitBlobHashesVerified:receipt.files.length,applicationCommit:receipt.applicationCommit}));
}else throw new Error('prepare or verify-git required');
