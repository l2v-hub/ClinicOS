import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const out=process.argv[2];assert.ok(out);assert.equal(existsSync(out),false);
const commit='07c3f7d13e8ac99a1af1238ec3661502950f45e3';
const before=JSON.parse(readFileSync(process.argv[3]));const after=JSON.parse(readFileSync(process.argv[4]));
assert.equal(before.head,commit);assert.equal(after.head,commit);assert.deepEqual(before.files,after.files);assert.equal(after.status,'');assert.equal(after.files.length,1539);
const rows=execFileSync('git',['ls-files','-s','frontend','backend','scripts','package.json','package-lock.json'],{encoding:'utf8'}).trim().split('\n').map(l=>{const [info,path]=l.split('\t');return {path,oid:info.split(' ')[1]};});
const data=execFileSync('git',['cat-file','--batch'],{input:rows.map(r=>r.oid).join('\n')+'\n',maxBuffer:256e6});let pos=0,strict=0,crlfOnly=0;const files=[];
for(const row of rows){const e=data.indexOf(10,pos),h=data.subarray(pos,e).toString('ascii').split(' ');assert.equal(h[0],row.oid);assert.equal(h[1],'blob');const size=Number(h[2]);assert.ok(size>=0&&size<100e6);const blob=data.subarray(e+1,e+1+size);pos=e+size+2;const raw=readFileSync(row.path);if(raw.equals(blob))strict++;else{const decoder=new TextDecoder('utf8',{fatal:true});assert.equal(decoder.decode(raw).replace(/\r\n/g,'\n'),decoder.decode(blob).replace(/\r\n/g,'\n'),row.path);crlfOnly++;}files.push({...row,rawSha256:createHash('sha256').update(raw).digest('hex'),blobSha256:createHash('sha256').update(blob).digest('hex')});}
assert.equal(pos,data.length);assert.equal(rows.length,1539);
writeFileSync(out,JSON.stringify({commit,sourceFiles:rows.length,physicalSourceSha256:after.sourceSha256,strictByteMatches:strict,crlfOnlyMatches:crlfOnly,sourceUnchanged:true,files},null,2));console.log('1539 immutable Git blobs and physical source stable; strictUTF8 CRLF-only normalization disclosed');
