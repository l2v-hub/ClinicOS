import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const dir='artifacts/task-validation/420-import-recovery/independent-qa420',commit='c00bff678dfc9845c31742bc5d0d750fbbb9603e',baseline='fa028c11ffe5dbfe514df8110e6ccf7f6b977602';
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=a=>{const r=spawnSync('git',a,{encoding:'utf8',maxBuffer:40e6});assert.equal(r.status,0);return r.stdout;};assert.equal(git(['rev-parse','HEAD']).trim(),commit);
const pre=JSON.parse(readFileSync(dir+'/attempt-1/before/source.json'));assert.equal(pre.applicationCommit,commit);assert.equal(git(['diff','HEAD','--',...pre.scope]),'');
assert.equal(git(['ls-files','--others','--exclude-standard','--',...pre.scope]),'');
const tree=createHash('sha256');for(const file of pre.files){assert.equal(sha(readFileSync(file.path)),file.sha256,file.path);tree.update(`${file.path}\0${file.sha256}\n`);}
const receipt={applicationCommit:commit,baseline,sourceScope:pre.scope,sourceSha256:tree.digest('hex'),fileCount:pre.files.length,trackedSourceMatchesCommit:true,noUntrackedApplicationOverrides:true,files:pre.files};
for(const stage of ['before','after']){mkdirSync(`${dir}/source-${stage}`,{recursive:true});writeFileSync(`${dir}/source-${stage}/source-receipt.json`,JSON.stringify(receipt,null,2));}
const batch=spawnSync('git',['cat-file','--batch'],{input:pre.files.map(f=>`HEAD:${f.path}\n`).join(''),maxBuffer:100e6});assert.equal(batch.status,0);let cursor=0;const canonicalTree=createHash('sha256');
const canonical=pre.files.map(f=>{const end=batch.stdout.indexOf(10,cursor),header=batch.stdout.subarray(cursor,end).toString().split(' ');assert.equal(header[1],'blob');const size=Number(header[2]),start=end+1,blob=batch.stdout.subarray(start,start+size);cursor=start+size+1;const physical=readFileSync(f.path),equal=physical.equals(blob);if(!equal){assert.equal(blob.includes(0),false);assert.equal(physical.toString().replace(/\r\n/g,'\n'),blob.toString().replace(/\r\n/g,'\n'),f.path);}const canonicalSha256=sha(blob);canonicalTree.update(`${f.path}\0${canonicalSha256}\n`);return{path:f.path,physicalSha256:f.sha256,canonicalSha256,physicalEqualGit:equal};});
const canonicalSha256=canonicalTree.digest('hex');writeFileSync(dir+'/canonical-source-receipt.json',JSON.stringify({...receipt,canonicalSha256,physicalEqualsGit:canonical.filter(f=>f.physicalEqualGit).length,lineEndingOnlyDifferences:canonical.filter(f=>!f.physicalEqualGit).length,files:canonical},null,2));
console.log(JSON.stringify({applicationCommit:commit,physicalSha256:receipt.sourceSha256,canonicalSha256,files:pre.files.length}));
