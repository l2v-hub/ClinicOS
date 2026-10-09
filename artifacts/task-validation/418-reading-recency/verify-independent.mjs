import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='artifacts/task-validation/418-reading-recency',application='d028e1ee4c5c44d96b5005362b28f54e5c05fee1';
const read=p=>JSON.parse(readFileSync(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const seals=[];
for(const [folder,source,verdict,checkout]of [
 ['independent-qa418','ae2a94f3dc66a6f1c2eb693d1d9faf6c3924c01c','FAILED VALIDATION','C:/w-418-qa'],
 ['independent-qa418-final',application,'BLOCKED','C:/w-418-qa-final'],
 ['independent-qa418-immutable',application,'READY FOR CODEX QA','C:/w-418-qa-final']]){
 const base=root+'/'+folder,manifest=read(base+'/SHA256-MANIFEST.json'),seal=read(base+'/seal-receipt.json');
 assert.equal(seal.verdict,verdict);assert.equal(seal.application,source);assert.equal(seal.manifestSha256,sha(readFileSync(base+'/SHA256-MANIFEST.json')));
 for(const f of manifest.files)assert.equal(sha(readFileSync(base+'/'+f.path)),f.sha256,'Immutable original drift '+folder+'/'+f.path);
 const before=read(base+'/source-before.json'),after=read(base+'/source-after.json');
 assert.equal(before.head,source);assert.equal(after.head,source);assert.deepEqual(before.entries,after.entries);assert.deepEqual(after.untrackedRuntimeOverrides,[]);
 for(const f of after.entries){assert.equal(f.canonicalGitBlob,f.headGitBlob);assert.equal(sha(readFileSync(checkout+'/'+f.path)),f.physicalSha256,'QA checkout drift '+f.path);}
 seals.push({folder,source,verdict,manifestSha256:seal.manifestSha256,files:manifest.files.length});
}
const freshRoot=root+'/independent-qa418-immutable',freshSeal=read(freshRoot+'/seal-receipt.json');
assert.equal(freshSeal.allFreshGateOriginalsPreserved,true);assert.equal(freshSeal.priorGateRetentionIncidentNotReinterpreted,true);
assert.equal(freshSeal.serverStopped,true);
const freshResults=read(freshRoot+'/fresh21b/results.json');
assert.deepEqual({expected:freshResults.stats.expected,unexpected:freshResults.stats.unexpected,skipped:freshResults.stats.skipped,flaky:freshResults.stats.flaky},{expected:21,unexpected:0,skipped:0,flaky:0});
const pre=read(freshRoot+'/pre-run21b/receipt.json');
assert.equal(pre.beforeExecution,true);assert.equal(pre.application,application);
for(const f of pre.files)assert.equal(sha(readFileSync(freshRoot+'/'+f.path)),f.sha256,'Frozen recipe changed');
assert.ok(Date.parse(pre.at)<=Date.parse(freshResults.stats.startTime),'Pre-run snapshot occurred after execution');
const reuse=read(freshRoot+'/reused-evidence.json'),priorSeal=read(root+'/independent-qa418-final/seal-receipt.json');
assert.equal(reuse.candidate,application);assert.equal(reuse.priorManifestSha256,priorSeal.manifestSha256);
const priorManifest=read(root+'/independent-qa418-final/SHA256-MANIFEST.json');
for(const f of reuse.evidence){const original=priorManifest.files.find(p=>p.path===f.path);assert.ok(original);assert.equal(original.sha256,f.sha256);assert.equal(original.bytes,f.bytes);}
const own=read(root+'/root-final/after/source-receipt.json'),before=read(root+'/independent-qa418-immutable/source-before.json');
assert.equal(own.applicationCommit,application);assert.equal(own.sourceSha256,'ba09c4cec75640ebad93bbdeeb41f45c687a411be5944424207dd2daee23274e');assert.equal(own.fileCount,1464);
const entries=new Map(before.entries.map(e=>[e.path,e])),paths=own.files.map(f=>f.path);
const git=spawnSync('git',['cat-file','--batch'],{input:paths.map(p=>`${application}:${p}`).join('\n')+'\n',maxBuffer:100*1024*1024});assert.equal(git.status,0);
let cursor=0;const canonical=createHash('sha256'),normalized=b=>Buffer.from(b.toString('utf8').replaceAll('\r\n','\n'));
for(const file of own.files){
 const end=git.stdout.indexOf(10,cursor),header=git.stdout.subarray(cursor,end).toString(),[blob,type,sizeText]=header.split(' '),size=Number(sizeText);assert.equal(type,'blob');assert.ok(Number.isFinite(size));
 const bytes=git.stdout.subarray(end+1,end+1+size);cursor=end+2+size;
 const qaEntry=entries.get(file.path);assert.ok(qaEntry,'Missing QA source '+file.path);assert.equal(qaEntry.headGitBlob,blob);
 const local=readFileSync(file.path),qa=readFileSync('C:/w-418-qa-final/'+file.path);assert.equal(sha(local),file.sha256);assert.equal(sha(qa),qaEntry.physicalSha256);
 for(const physical of [local,qa])if(sha(physical)!==sha(bytes)){assert.equal(Buffer.from(bytes.toString('utf8')).compare(bytes),0);assert.equal(Buffer.from(physical.toString('utf8')).compare(physical),0);assert.equal(sha(normalized(physical)),sha(normalized(bytes)),'Substantive source drift '+file.path);}
 canonical.update(`${file.path}\0${sha(bytes)}\n`);
}
const receipt={applicationCommit:application,decision:'SEALED ATTEMPTS, FRESH IMMUTABLE GATE AND EXACT SOURCE VERIFIED',seals,rootPhysicalSha256:own.sourceSha256,canonicalSha256:canonical.digest('hex'),fileCount:own.fileCount,independentTrackedRuntimeInputs:before.entries.length,sourceNormalization:'Only identical Git bytes or LF/CRLF normalization, no substantive change',originalFailedAttemptPreserved:true,priorRetentionIncident:'d028 preliminary19 named standalone PNGs/one JSON overwritten by its full21 recipe; unrecoverable prior bytes disclosed. Original per-run traces/videos/automatic screenshots remain. Prior gate stays BLOCKED; no reinterpretation as READY. New isolated21 run has its own immutable originals.',reportAndScriptsRead:true};
writeFileSync(root+'/independent-review-receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
