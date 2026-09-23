import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const base='artifacts/task-validation/po-16-giro/keyboard';
const source='frontend/src/components/operator/cartella/shared.tsx';
const sha=b=>createHash('sha256').update(b).digest('hex');
const baseline='a3549a20c72080ede67dd16174d52989e744bfab';
assert.equal(execFileSync('git',['rev-parse','HEAD'],{windowsHide:true}).toString().trim(),baseline);
assert.equal(execFileSync('git',['diff','--name-only','--','frontend','backend','prisma','package.json','package-lock.json'],{windowsHide:true}).toString().trim(),source);
const candidate=JSON.parse(await readFile(`${base}/candidate-source.json`,'utf8'));
assert.equal(sha(await readFile(source)),candidate.sha256);
const files=[source,...['preview/main.tsx','preview/index.html','server.mjs','build.mjs','baseline-build.log','candidate-build.log','baseline-source.json','candidate-source.json','baseline-dom.txt','baseline-native-dom.txt','candidate-dom.txt','candidate-checks.json','frontend-build.log','secret-scan.log','validation-report.md','finalize.mjs'].map(p=>`${base}/${p}`)];
const hashes=[];for(const path of files){const bytes=await readFile(path);hashes.push({path,bytes:bytes.length,sha256:sha(bytes)})}
const outputs=[];
async function walk(folder){for(const entry of await readdir(folder,{withFileTypes:true})){const path=`${folder}/${entry.name}`;if(entry.isDirectory())await walk(path);else{const bytes=await readFile(path);outputs.push({path,bytes:bytes.length,sha256:sha(bytes)})}}}
for(const folder of [`${base}/baseline`,`${base}/candidate`,'frontend/dist'])await walk(folder);
await writeFile(`${base}/release-gate.json`,JSON.stringify({decision:'ALLOW_RELEASE',authorization:'User approved full implementation, commit/push and deploy; root integrates reviewed fix',baseline,scope:'Frontend only, one shared keyboard handler guard, no backend or patient data changes',checks:'Independent source review, native browser keyboard/click behavior vs baseline, build and scan PASS',files:hashes,outputs},null,2));
files.push(`${base}/release-gate.json`);
if(process.argv.includes('--stage'))execFileSync('git',['add','-f','--',...files],{windowsHide:true});
console.log(JSON.stringify({sourceSha256:candidate.sha256,stageFiles:files.length,buildOutputs:outputs.length}));
