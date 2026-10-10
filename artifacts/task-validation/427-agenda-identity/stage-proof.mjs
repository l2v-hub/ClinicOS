import assert from 'node:assert/strict';
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root='artifacts/task-validation/427-agenda-identity',app=JSON.parse(readFileSync(root+'/frozen-source.json')).applicationCommit;
const git=args=>{const r=spawnSync('git',args,{encoding:'utf8',maxBuffer:20e6,windowsHide:true});assert.equal(r.status,0,'Scoped artifact staging failed safely');return r.stdout.trim();};assert.equal(git(['rev-parse','HEAD']),app);assert.equal(git(['diff','--cached','--name-only']),'');
const dirs=['independent-qa','root-rerun','compiled-online','root-initial02'],paths=[];
function walk(d){for(const e of readdirSync(d,{withFileTypes:true})){const p=d+'/'+e.name;if(e.isDirectory()){if(['runtime-cache','node_modules'].includes(e.name))continue;walk(p);}else paths.push(p);}}
for(const d of dirs){if(d==='independent-qa'){const m=JSON.parse(readFileSync(root+'/'+d+'/manifest.json'));for(const f of m.files){assert.ok(!f.path.includes('..')&&!f.path.includes('runtime-cache'));paths.push(root+'/'+d+'/'+f.path);}paths.push(root+'/'+d+'/manifest.json');}else walk(root+'/'+d);}
for(const e of readdirSync(root,{withFileTypes:true}))if(e.isFile()&&!['ci-progress.json','publication-manifest.json','github-publication-policy.json','github-publication-receipt.json'].includes(e.name))paths.push(root+'/'+e.name);
assert.ok(paths.every(p=>p.startsWith(root+'/')&&!p.includes('runtime-cache')&&!p.includes('node_modules')));
writeFileSync(root+'/proof-staging-policy.json',JSON.stringify({decision:'AUTHORIZED SCOPED SYNTHETIC PROOF STAGING',authority:'Human-authorized evidence publication; root integration owner after actual source/QA/replay/compiled gates',applicationCommit:app,explicitDirectories:dirs,plannedPaths:paths.length,excluded:['Dirty main/launchers','Unreleased blocked candidates','Unsealed runtime cache','Real clinical photos','Historical rootinitial attempt retained locally'],at:new Date().toISOString()},null,2));
for(let i=0;i<paths.length;i+=40)git(['add','-f','--',...paths.slice(i,i+40)]);git(['add','-f','--',root+'/proof-staging-policy.json']);assert.ok(git(['diff','--cached','--name-only']).split('\n').every(p=>p.startsWith(root+'/')));console.log('Scoped proof staged; canonical privacy gate pending');
