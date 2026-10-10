import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const [receipt,out]=process.argv.slice(2);assert.ok(receipt&&out);assert.equal(existsSync(out),false);const source=JSON.parse(readFileSync(receipt,'utf8')),decoder=new TextDecoder('utf-8',{fatal:true}),rows=[];
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const entry of source.files){const physical=readFileSync(entry.path),blob=execFileSync('git',['show',source.head+':'+entry.path],{maxBuffer:20e6});assert.equal(sha(physical),entry.sha256);if(!physical.equals(blob)){assert.equal(decoder.decode(physical).replaceAll('\r\n','\n'),decoder.decode(blob).replaceAll('\r\n','\n'),entry.path);}rows.push({path:entry.path,gitSha256:sha(blob)});}
assert.equal(source.status,'');assert.deepEqual(source.untracked,[]);writeFileSync(out,JSON.stringify({head:source.head,files:rows.length,applicationStatusClean:true,normalization:'Strict UTF8 CRLF->LF only; binary bytes otherwise exact',gitSourceSha256:sha(JSON.stringify(rows)),allPhysicalFilesBound:true},null,2));console.log('All '+rows.length+' physical application files match exact Git input');
