import assert from 'node:assert/strict';
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root='artifacts/task-validation/425-chart-scroll',app='b7ae14d120c1e70ccf72784206a505f8c48f975e';
const git=args=>{const r=spawnSync('git',args,{encoding:'utf8',maxBuffer:20e6});assert.equal(r.status,0,'Scoped evidence staging failed safely');return r.stdout.trim();};
assert.equal(git(['rev-parse','HEAD']),app);assert.equal(git(['diff','--cached','--name-only']),'');
const dirs=['failed-independent-qa-796','independent-qa2','root-rerun2','compiled-online','root-modal-commands','root-modal-security'],paths=[];
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory()){if(e.name==='runtime-cache')continue;walk(p);}else paths.push(p);}}
for(const d of dirs){if(d.includes('independent-qa')){const m=JSON.parse(readFileSync(root+'/'+d+'/artifact-manifest.json'));for(const f of m.files){assert.ok(!f.path.includes('..'));paths.push(root+'/'+d+'/'+f.path);}paths.push(root+'/'+d+'/artifact-manifest.json');}else walk(root+'/'+d);}
for(const e of readdirSync(root,{withFileTypes:true}))if(e.isFile()&&!['ci-progress.json','publication-manifest.json','publication-policy-receipt.json','github-closure-receipt.json','partial-github-receipt.json','partial-github-policy.json'].includes(e.name))paths.push(root+'/'+e.name);
assert.ok(paths.every(p=>!p.includes('/runtime-cache/')));for(let i=0;i<paths.length;i+=40)git(['add','-f','--',...paths.slice(i,i+40)]);
const staged=git(['diff','--cached','--name-only']).split('\n');assert.ok(staged.every(p=>p.startsWith(root+'/')));
writeFileSync(root+'/proof-staging-policy.json',JSON.stringify({decision:'AUTHORIZED SCOPED SYNTHETIC PROOF STAGING',authority:'Direct human evidence publishing authority; root sole integration writer',applicationCommit:app,explicitDirectoryAllowlist:dirs,artifacts:staged.length,excluded:['Primary dirty checkout and native launchers','Root dev attempts retained locally','Runtime caches','Original clinical audit photos','Unreleased blocked source candidates'],at:new Date().toISOString()},null,2));git(['add','-f','--',root+'/proof-staging-policy.json']);console.log('Scoped proof staged; canonical privacy and immutable manifest verification required');
