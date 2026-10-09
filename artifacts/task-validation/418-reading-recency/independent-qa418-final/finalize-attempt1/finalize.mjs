import { readFileSync,writeFileSync,readdirSync,statSync,mkdirSync,copyFileSync } from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {resolve,relative} from 'node:path';
const cwd='C:/w-418-qa-final',out=cwd+'/artifacts/task-validation/418-reading-recency/independent-qa418-final',root='C:/w-418';
const sha=b=>createHash('sha256').update(b).digest('hex');
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(resolve(dir,entry.name)):[resolve(dir,entry.name)]);
const before=JSON.parse(readFileSync(out+'/source-before.json')),after=JSON.parse(readFileSync(out+'/source-after.json'));
if(before.head!=='d028e1ee4c5c44d96b5005362b28f54e5c05fee1'||after.head!==before.head||before.entries.some((e,i)=>JSON.stringify(e)!==JSON.stringify(after.entries[i]))||after.entries.some(e=>e.canonicalGitBlob!==e.headGitBlob)||after.untrackedRuntimeOverrides.length)throw Error('Source mismatch: seal denied');
writeFileSync(out+'/source-integrity.json',JSON.stringify({candidate:after.head,files:after.entries.length,beforeAfterPhysicalAndCanonicalMatch:true,headCanonicalBlobsMatch:true,noUntrackedApplicationOverrides:true,sourceBeforeHash:sha(readFileSync(out+'/source-before.json')),sourceAfterHash:sha(readFileSync(out+'/source-after.json')),scopeIncludesPrisma:true},null,2));
mkdirSync(out+'/device-snapshot',{recursive:true});
const deviceRoot=root+'/artifacts/task-validation/418-reading-recency/root-final/device';
const snapshots=[];
for(const source of [root+'/artifacts/task-validation/418-reading-recency/root-final/source/source-receipt.json',...walk(deviceRoot),root+'/artifacts/task-validation/418-reading-recency/qa-device-server.mjs']){const name=source===root+'/artifacts/task-validation/418-reading-recency/root-final/source/source-receipt.json'?'source-receipt.json':source.split(/[\\/]/).at(-1),target=out+'/device-snapshot/'+name;copyFileSync(source,target);snapshots.push({source,snapshot:relative(out,target).replaceAll('\\','/'),sha256:sha(readFileSync(target))});}
const sourceReceipt=JSON.parse(readFileSync(out+'/device-snapshot/source-receipt.json'));
if(sourceReceipt.applicationCommit!==after.head)throw Error('Device source candidate mismatch');
const own=new Map(after.entries.map(e=>[e.path,e]));
const differences=[];
for(const f of sourceReceipt.files){const e=own.get(f.path);if(!e)throw Error('Device input outside QA source scope');if(f.sha256===e.physicalSha256)continue;const live=readFileSync(root+'/'+f.path);const rootCanonical=spawnSync('git',['hash-object','--path='+f.path,f.path],{cwd:root,encoding:'utf8'}).stdout.trim();if(sha(live)!==f.sha256||rootCanonical!==e.headGitBlob)throw Error('Device source physical/canonical mismatch');differences.push({path:f.path,rootPhysicalSha256:f.sha256,qaPhysicalSha256:e.physicalSha256,rootCanonical,qaCanonical:e.canonicalGitBlob,candidateCanonical:e.headGitBlob,interpretation:'line endings differ physically; exact canonical Git blobs match and root physical bytes still match source-pinned device receipt'});}
const guard=JSON.parse(readFileSync(out+'/device-snapshot/guard-receipt.json'));
if(guard.applicationCommit!==after.head||guard.unexpected.length||guard.deniedWrites.length||guard.clinicalWrites!==0||guard.screenshot.sha256!==sha(readFileSync(out+'/device-snapshot/overview-actual-desktop.png')))throw Error('Device guard/image integrity failure');
for(const file of ['overview-final-ax.txt','ward-final-ax.txt']){const s=readFileSync(out+'/device-snapshot/'+file,'utf8');if(!/\d+ minuti fa/.test(s)||!s.includes('3 giorni fa')||!s.includes('2 settimane fa')||!s.includes('Misurato il'))throw Error('Device comparison missing required age range');}
for(const file of ['overview-metrics.json','ward-metrics.json']){const m=JSON.parse(readFileSync(out+'/device-snapshot/'+file));if(m.visibility!=='visible'||m.width!==2133||m.height!==1145||m.scale!==1||m.captions.some(c=>c.font!=='14px'||c.scroll>c.client||c.right>2133||c.x<0))throw Error('Device caption metrics failure');}
writeFileSync(out+'/device-assessment.json',JSON.stringify({candidate:after.head,rootInputs:sourceReceipt.fileCount,allRootInputsBound:true,physicalLineEndingDifferences:differences,snapshot:snapshots,decision:'PASS original literal desktop comparison AC4; actual original overview pixels independently visually inspected, 9minutes/3days/2weeks full-value/date association. Ward AX/DOM metrics compared on same actual normal2133x1145 desktop; ward screenshot failed and is not claimed. No headless substitution.',actualDeviceOverviewPixelsInspected:true,wardActualPixelsInspected:false,wardHardwareGlareOrATCertified:false},null,2));
const runtime=cwd+'/artifacts/task-validation/418-reading-recency/runtime-418-final';
writeFileSync(out+'/runtime-manifest.json',JSON.stringify({root:runtime,candidate:after.head,emittedOnly:true,retainedNotDeleted:true,files:walk(runtime).map(p=>({path:relative(runtime,p).replaceAll('\\','/'),bytes:statSync(p).size,sha256:sha(readFileSync(p))}))},null,2));
const settings=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8'));
const credential=settings.env?.GITHUB_TOKEN||settings.env?.GH_TOKEN;
const pattern=/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|AIza[A-Za-z0-9_-]{35}|xox[baprs]-[A-Za-z0-9-]{10,})\b/;
function check(bytes){if(credential&&bytes.includes(Buffer.from(credential)))throw Error('Credential match: artifact seal denied');if(pattern.test(bytes.toString('utf8')))throw Error('Known credential format match: artifact seal denied');}
const {yauzl}=createRequire('C:/w-insulin-qa/package.json')('C:/w-insulin-qa/node_modules/playwright-core/lib/utilsBundle.js');
let zipEntries=0;
async function scanZip(path){await new Promise((resolveZip,reject)=>yauzl.open(path,{lazyEntries:true},(error,zip)=>{if(error)return reject(Error('ZIP audit open failed'));zip.on('error',()=>reject(Error('ZIP audit read failed')));zip.on('entry',entry=>{if(/\/$/.test(entry.fileName))return zip.readEntry();zip.openReadStream(entry,(error,stream)=>{if(error)return reject(Error('ZIP audit stream failed'));const chunks=[];stream.on('data',data=>chunks.push(data));stream.on('error',()=>reject(Error('ZIP audit stream read failed')));stream.on('end',()=>{try{check(Buffer.concat(chunks));zipEntries++;zip.readEntry();}catch(error){zip.close();reject(error);}});});});zip.on('end',resolveZip);zip.readEntry();}));}
const files=walk(out);for(const path of files){const bytes=readFileSync(path);check(bytes);if(path.endsWith('.zip'))await scanZip(path);}
writeFileSync(out+'/credential-artifact-scan.json',JSON.stringify({status:'PASS',files:files.length,compressedZipEntriesAudited:zipEntries,internalCredentialLiteralMatches:0,knownCredentialFormats:0,syntheticOnly:true,limits:'Byte and expandedZIP scan detects actual internal credential and known token formats, not a universal PHI detector. Browser guards and manually reviewed synthetic evidence establish patient-data provenance.'},null,2));
console.log(`Source${after.entries.length} immutable; device${sourceReceipt.fileCount}bound (${differences.length}line-ending differences); artifactZIPentries${zipEntries} audited`);
