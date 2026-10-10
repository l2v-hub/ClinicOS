import assert from 'node:assert/strict';
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='artifacts/task-validation/426-room-actions',app=JSON.parse(readFileSync(root+'/frozen-release-source.json')).applicationCommit;
const git=args=>{const r=spawnSync('git',args,{encoding:'utf8',maxBuffer:20e6,windowsHide:true});assert.equal(r.status,0,'Scoped evidence staging failed safely');return r.stdout.trim();};
assert.equal(git(['rev-parse','HEAD']),app);assert.equal(git(['diff','--cached','--name-only']),'');
const dirs=['failed-independent-qa-07','failed-independent-qa2-143','failed-independent-qa3-922','independent-qa4','root-rerun4','compiled-online','root-headers2','root-button','test-results'],paths=[];
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory()){if(e.name==='runtime-cache')continue;walk(p);}else paths.push(p);}}
for(const d of dirs){if(d.includes('independent-qa')){const m=JSON.parse(readFileSync(root+'/'+d+'/artifact-manifest.json'));for(const f of m.files){assert.ok(!f.path.includes('..'));paths.push(root+'/'+d+'/'+f.path);}paths.push(root+'/'+d+'/artifact-manifest.json');}else walk(root+'/'+d);}
for(const e of readdirSync(root,{withFileTypes:true}))if(e.isFile()&&!['ci-progress.json','publication-manifest.json','github-publication-policy.json','github-publication-receipt.json'].includes(e.name))paths.push(root+'/'+e.name);
const failedQa3Bytes=readFileSync(root+'/failed-independent-qa3-922/artifact-manifest.json');
assert.equal(createHash('sha256').update(failedQa3Bytes).digest('hex'),'133014ded7ed582f34b38f615551b8ab66ca1509407e6a1a99150d7fbfbf7c58');
const sealedCache=JSON.parse(failedQa3Bytes).files.filter(f=>f.path.startsWith('runtime-cache/'));assert.equal(sealedCache.length,21);
assert.deepEqual(paths.filter(p=>p.includes('/runtime-cache/')).sort(),sealedCache.map(f=>root+'/failed-independent-qa3-922/'+f.path).sort(),'Only exact already-sealed failed QA3 cache evidence may be retained');
for(const f of sealedCache)assert.equal(createHash('sha256').update(readFileSync(root+'/failed-independent-qa3-922/'+f.path)).digest('hex'),f.sha256);
writeFileSync(root+'/proof-staging-policy.json',JSON.stringify({decision:'AUTHORIZED SCOPED SYNTHETIC PROOF STAGING',authority:'Direct human evidence publishing authority; root integration owner',applicationCommit:app,explicitDirectoryAllowlist:dirs,plannedPaths:paths.length,sealedQa3CacheEvidence:21,cachePolicy:'Retain exact21 already-sealed FAILED QA3 optimizer blobs without rewriting its immutable140-file bundle; canonical privacy checks apply to all; exclude every other runtime cache',excluded:['Primary dirty/native launchers','Root preliminary dev attempts retained locally','Unsealed runtime caches','Original clinical photos','Unreleased blocked source'],at:new Date().toISOString()},null,2));
for(let i=0;i<paths.length;i+=40)git(['add','-f','--',...paths.slice(i,i+40)]);
const staged=git(['diff','--cached','--name-only']).split('\n');assert.ok(staged.every(p=>p.startsWith(root+'/')));
git(['add','-f','--',root+'/proof-staging-policy.json']);console.log('Scoped proof staged; canonical privacy gate required');
