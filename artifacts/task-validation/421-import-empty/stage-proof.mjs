import assert from 'node:assert/strict';
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root='artifacts/task-validation/421-import-empty',app='80b313227a9a2b9fefc0441c718b259d0d901cae';
const git=args=>{const r=spawnSync('git',args,{encoding:'utf8',maxBuffer:20e6});assert.equal(r.status,0,'Scoped staging failed safely');return r.stdout.trim();};
assert.equal(git(['rev-parse','HEAD']),app);assert.equal(git(['diff','--name-only','--cached','--','frontend','backend','prisma','package.json','package-lock.json']),'');
const dirs=['before-run-01','root-frozen','root-rerun','compiled-online','independent-qa421','security'],paths=[];
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory()){assert.ok(!e.name.includes('runtime-cache'));walk(p);}else paths.push(p);}}
for(const dir of dirs){
 if(dir==='independent-qa421'){
  const m=JSON.parse(readFileSync(root+'/'+dir+'/immutable-manifest.json','utf8'));assert.equal(m.application,app);assert.equal(m.fileCount,346);
  for(const f of m.files){assert.ok(!f.path.startsWith('/')&&!f.path.includes('..')&&!f.path.includes('runtime-cache'));paths.push(root+'/'+dir+'/'+f.path);}
  paths.push(root+'/'+dir+'/immutable-manifest.json');
 }else walk(root+'/'+dir);
}
for(const e of readdirSync(root,{withFileTypes:true}))if(e.isFile()&&!['ci-progress.json','publication-manifest.json','publication-policy-receipt.json','github-closure-receipt.json'].includes(e.name))paths.push(root+'/'+e.name);
assert.ok(paths.every(p=>!p.includes('runtime-cache/')&&!p.includes('/global-scan.json')));for(let i=0;i<paths.length;i+=50)git(['add','-f','--',...paths.slice(i,i+50)]);
const staged=git(['diff','--cached','--name-only']).split('\n').filter(Boolean);assert.ok(staged.every(p=>p.startsWith(root+'/')));
writeFileSync(root+'/proof-staging-policy.json',JSON.stringify({decision:'AUTHORIZED SCOPED SYNTHETIC EVIDENCE STAGING',authority:'Direct human authorization; root sole proof writer',applicationCommit:app,explicitDirectoryAllowlist:dirs,artifactCount:new Set([...staged,root+'/proof-staging-policy.json']).size,excluded:['Root failed development runs retained locally','runtime caches','dirty primary and launchers','unreleased405/408/410/416 source','original clinical attachments'],at:new Date().toISOString()},null,2));git(['add','-f','--',root+'/proof-staging-policy.json']);console.log('Scoped evidence staged only; canonical privacy gate still required');
