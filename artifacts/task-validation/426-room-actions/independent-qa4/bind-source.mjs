import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir='artifacts/task-validation/426-room-actions/independent-qa4';
const source=JSON.parse(readFileSync(dir+'/source-before.json'));
const head='30e8023e8b88dcd8b5e40544f1597ee0c046a41c';
assert.equal(source.head,head);assert.equal(source.status,'');assert.equal(source.untracked.length,0);assert.equal(source.files.length,1539);
const specs=source.files.map(f=>head+':'+f.path);
const r=spawnSync('git',['cat-file','--batch'],{input:specs.join('\n')+'\n',maxBuffer:100e6,windowsHide:true});assert.equal(r.status,0);
const sha=b=>createHash('sha256').update(b).digest('hex');const decoder=new TextDecoder('utf-8',{fatal:true});
const rows=[];let offset=0;
for(const [i,file]of source.files.entries()){
 const end=r.stdout.indexOf(10,offset),header=r.stdout.subarray(offset,end).toString('ascii'),m=header.match(/^([a-f0-9]{40}) blob (\d+)$/);assert.ok(m,specs[i]);
 const size=Number(m[2]),blob=r.stdout.subarray(end+1,end+1+size);offset=end+2+size;
 const physical=readFileSync(file.path);assert.equal(sha(physical),file.sha256);
 let equality='EXACT';if(!physical.equals(blob)){
  const a=decoder.decode(physical),b=decoder.decode(blob);assert.equal(a.replaceAll('\r\n','\n'),b.replaceAll('\r\n','\n'),file.path);equality='STRICT UTF8 CRLF ONLY';
 }
 rows.push({path:file.path,rawSha256:sha(physical),gitBlob:m[1],gitBlobSha256:sha(blob),equality});
}
assert.equal(offset,r.stdout.length);
writeFileSync(dir+'/source-git-binding.json',JSON.stringify({head,rawSourceSha256:source.sourceSha256,files:rows,exact:rows.filter(r=>r.equality==='EXACT').length,crlfOnly:rows.filter(r=>r.equality!=='EXACT').length},null,2));
console.log('Immutable Git binding verified for1539 actual source files');
