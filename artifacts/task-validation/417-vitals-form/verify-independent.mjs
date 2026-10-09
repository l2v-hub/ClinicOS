import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='artifacts/task-validation/417-vitals-form',base=root+'/independent-qa417';
const read=p=>JSON.parse(readFileSync(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=read(base+'/SHA256-MANIFEST.json'),seal=read(base+'/seal-receipt.json');
assert.equal(seal.decision,'READY FOR CODEX QA');assert.equal(seal.manifestSha256,sha(readFileSync(base+'/SHA256-MANIFEST.json')));
for(const f of manifest.files)assert.equal(sha(readFileSync(base+'/'+f.path)),f.sha256,'Immutable QA artifact drift: '+f.path);
const before=read(base+'/source/before-source-receipt.json'),after=read(base+'/source/after-source-receipt.json'),own=read(root+'/root-rerun/source/source-receipt.json');
assert.deepEqual(before.files,after.files);assert.equal(before.commit,own.applicationCommit);assert.equal(before.fileCount,1459);assert.equal(own.sourceSha256,'66ad2baf06ce7ed812ef743e57acbef562201396535112d7d5bfcf3299b0920b');
const paths=before.files.map(f=>f.path);assert.deepEqual(paths,own.files.map(f=>f.path));
const git=spawnSync('git',['cat-file','--batch'],{input:paths.map(p=>`${before.commit}:${p}`).join('\n')+'\n',maxBuffer:100*1024*1024});assert.equal(git.status,0);
let cursor=0;const canonical=createHash('sha256'),normalizations=[];
for(let i=0;i<paths.length;i++){
 const end=git.stdout.indexOf(10,cursor),header=git.stdout.subarray(cursor,end).toString(),size=Number(header.split(' ')[2]);assert.ok(Number.isFinite(size));const bytes=git.stdout.subarray(end+1,end+1+size);cursor=end+2+size;
 const file=before.files[i],hash=sha(bytes);assert.equal(hash,file.gitSha256);canonical.update(`${file.path}\0${hash}\n`);
 const local=readFileSync(file.path);assert.equal(sha(local),own.files[i].sha256);
 const qaBytes=readFileSync('C:/w-417-qa/'+file.path);assert.equal(sha(qaBytes),file.physicalSha256,'QA checkout after seal drift: '+file.path);
 const normalized=b=>Buffer.from(b.toString('utf8').replaceAll('\r\n','\n'));
 for(const [who,physical]of [['QA',qaBytes],['Root',local]])if(sha(physical)!==hash){assert.equal(Buffer.from(bytes.toString('utf8')).compare(bytes),0,'Non-text canonical drift');assert.equal(Buffer.from(physical.toString('utf8')).compare(physical),0,'Non-text physical drift');assert.equal(sha(normalized(physical)),sha(normalized(bytes)),who+' substantive source drift: '+file.path);}
 if(file.physicalSha256!==sha(local))normalizations.push(file.path);
}
assert.equal(canonical.digest('hex'),before.canonicalSha256);assert.equal(before.canonicalSha256,'9158eb3a95698b2c1b200aeea3a7c3ec0439e795723cb8d8bc5cef06f68707d1');
const report=readFileSync(base+'/validation-report.md','utf8');assert.match(report,/READY FOR CODEX QA/);
const runtime=read(base+'/source/supplemental-runtime-inputs.json');assert.equal(runtime.commit,before.commit);assert.equal(runtime.inputCount,1580);
for(const args of [['diff','--exit-code',before.commit,'--',...runtime.scopes],['ls-files','--others','--exclude-standard','--',...runtime.scopes]]){const r=spawnSync('git',args,{encoding:'utf8'});assert.equal(r.status,0);assert.equal(r.stdout.trim(),'');}
const index=spawnSync('git',['ls-files','-s','--',...runtime.scopes],{encoding:'utf8'});assert.equal(index.status,0);
const blobs=index.stdout.trim().split('\n').map(row=>{const [meta,path]=row.split('\t');return{path,gitBlob:meta.split(' ')[1]};});assert.deepEqual(blobs,runtime.files.map(f=>({path:f.path,gitBlob:f.gitBlob})));
const receipt={applicationCommit:before.commit,decision:'INDEPENDENT ORIGINALS AND EXACT SOURCE VERIFIED',originalManifestSha256:sha(readFileSync(base+'/SHA256-MANIFEST.json')),immutableFiles:manifest.files.length,rootPhysicalSha256:own.sourceSha256,qaPhysicalSha256:before.physicalSha256,canonicalSha256:before.canonicalSha256,sourceFiles:paths.length,supplementalRuntimeInputsVerified:runtime.inputCount,sourceNormalization:'Only original Git blob or LF/CRLF equivalents accepted, never substantive changes',normalizations,reportAndScriptsRead:true};
writeFileSync(root+'/independent-review-receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify({...receipt,normalizations:normalizations.length}));
