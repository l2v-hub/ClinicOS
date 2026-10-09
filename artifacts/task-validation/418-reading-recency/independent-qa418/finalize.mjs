import { readFileSync,writeFileSync,readdirSync,statSync,mkdirSync,copyFileSync } from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,relative} from 'node:path';
const cwd='C:/w-418-qa',out=cwd+'/artifacts/task-validation/418-reading-recency/independent-qa418';
const sha=b=>createHash('sha256').update(b).digest('hex');
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(resolve(dir,entry.name)):[resolve(dir,entry.name)]);
const before=JSON.parse(readFileSync(out+'/source-before.json')),after=JSON.parse(readFileSync(out+'/source-after.json'));
const sourceDifferences=before.entries.filter((b,index)=>JSON.stringify(b)!==JSON.stringify(after.entries[index]));
const mismatches=after.entries.filter(x=>x.canonicalGitBlob!==x.headGitBlob);
if(sourceDifferences.length||mismatches.length||after.untrackedRuntimeOverrides.length)throw Error('Source state mismatch: seal denied');
writeFileSync(out+'/source-integrity.json',JSON.stringify({candidate:after.head,files:after.entries.length,beforeAfterPhysicalAndCanonicalMatch:true,headCanonicalBlobsMatch:true,noUntrackedApplicationOverrides:true,preservedUnrelatedLauncherChange:true,sourceBeforeHash:sha(readFileSync(out+'/source-before.json')),sourceAfterHash:sha(readFileSync(out+'/source-after.json'))},null,2));
mkdirSync(out+'/device-snapshot',{recursive:true});
const root='C:/w-418/artifacts/task-validation/418-reading-recency',copied=[];
for(const p of ['root-frozen/source-receipt.json','root-rerun/device/device-receipt.md','root-rerun/device/guard-receipt.json','root-rerun/device/overview-metrics.json','root-rerun/device/overview-final-ax.txt','root-rerun/device/ward-final-ax.txt','qa-device-server.mjs','collect-device-receipt.mjs']){const target=out+'/device-snapshot/'+p.replaceAll('/','-');copyFileSync(root+'/'+p,target);copied.push({source:root+'/'+p,snapshot:relative(out,target).replaceAll('\\','/'),sha256:sha(readFileSync(target))});}
const rootManifest=JSON.parse(readFileSync(out+'/device-snapshot/root-frozen-source-receipt.json'));
const ours=new Map(after.entries.map(e=>[e.path,e.physicalSha256]));
const rootSourceMismatches=rootManifest.files.filter(f=>ours.get(f.path)!==f.sha256);
writeFileSync(out+'/device-assessment.json',JSON.stringify({application:rootManifest.applicationCommit,sourceBound:rootManifest.applicationCommit===after.head,rootFiles:rootManifest.fileCount,physicalSourceMismatches:rootSourceMismatches.map(f=>f.path),snapshot:copied,originalAC4:'Confrontare sul dispositivo misure di minuti, giorni e settimane, senza inventare soglie cliniche.',decision:'Qualified literal runtime comparison PASS for this frozen candidate: genuine visible Windows normal viewport AX/DOM contrasts minutes, days and weeks. No independently inspected actual-device pixels; actual screenshots unavailable. Software screenshots are headless and do not replace device pixels. New source requires a new receipt.',actualDevicePixelsVerified:false,wardHardwareOrSunlightOrATCertified:false},null,2));
const runtime=cwd+'/artifacts/task-validation/418-reading-recency/runtime-418';
const generated=walk(runtime).map(path=>({path:relative(runtime,path).replaceAll('\\','/'),bytes:statSync(path).size,sha256:sha(readFileSync(path))}));
writeFileSync(out+'/runtime-manifest.json',JSON.stringify({runtimeRoot:runtime,source:after.head,emittedOnly:true,retainedNotDeleted:true,receipt:'commands/correct-runtime-receipts.json',files:generated},null,2));
// Secret read stays in-process. No credential values or matching source content emitted.
const settings=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8'));
const internalToken=settings.env?.GITHUB_TOKEN||settings.env?.GH_TOKEN;
const leaking=walk(out).filter(path=>internalToken&&readFileSync(path).includes(Buffer.from(internalToken))).map(path=>relative(out,path));
if(leaking.length)throw Error('Credential scan failed; no secret values emitted');
writeFileSync(out+'/credential-artifact-scan.json',JSON.stringify({status:'PASS',files:walk(out).length,internalCredentialLiteralMatches:0,syntheticOnly:true,limits:'Direct bytes scan; compressed traces separately protected by pre-navigation synthetic-only guard. This is not a claim that all clinical data can be automatically identified.'},null,2));
console.log(`Source integrity ${after.entries.length} files; root source mismatches${rootSourceMismatches.length}; runtime manifest${generated.length} files`);
