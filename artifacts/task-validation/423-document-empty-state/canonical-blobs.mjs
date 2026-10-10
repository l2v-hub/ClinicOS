import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const root='artifacts/task-validation/423-document-empty-state';
export function verifyCoverage(rows,revision='') {
  const args=revision?['ls-tree','-r','--name-only',revision,'--',root]:['ls-files','--',root];
  const result=spawnSync('git',args,{encoding:'utf8',maxBuffer:20e6,windowsHide:true});
  assert.equal(result.status,0,'Proof inventory failed safely');
  const actual=result.stdout.trim().split('\n').filter(Boolean).sort();
  const expected=[...rows.map(r=>r.path),root+'/publication-manifest.json'].sort();
  assert.equal(new Set(expected).size,expected.length,'Duplicate manifest path');
  assert.deepEqual(actual,expected,'Every published artifact must have privacy-scan coverage');
}
export function verifyLocalPinned(paths,revision) {
  for(const path of paths){
    assert.ok(typeof path==='string'&&path&&!path.includes('..')&&!path.startsWith('/')&&!path.includes('\\')&&!/[:\r\n]/.test(path),'Pinned input must stay inside exact task root');
    const result=spawnSync('git',['show',revision+':'+root+'/'+path],{maxBuffer:100e6,windowsHide:true});
    assert.equal(result.status,0,'Pinned closure input unavailable');
    const local=readFileSync(root+'/'+path);
    if(local.equals(result.stdout))continue;
    assert.ok(!/\.(png|jpe?g|zip|webm|pdf)$/.test(path),'Pinned binary drift');
    const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(local);
    assert.ok(Buffer.from(text.replace(/\r\n/g,'\n')).equals(result.stdout),'Closure input differs from public proof');
  }
}
export function verifyCanonical(rows,revision='') {
  const refs=rows.map(r=>{assert.ok(r.path.startsWith('artifacts/task-validation/423-document-empty-state/')&&!/[\r\n]/.test(r.path));return revision+':'+r.path;});
  const batch=spawnSync('git',['cat-file','--batch'],{input:refs.join('\n')+'\n',maxBuffer:500e6,windowsHide:true});assert.equal(batch.status,0,'Canonical Git stream failed safely');const bytes=batch.stdout;let offset=0;
  for(const row of rows){const lineEnd=bytes.indexOf(10,offset);assert.ok(lineEnd>offset);const parts=bytes.subarray(offset,lineEnd).toString('ascii').split(' ');assert.equal(parts.length,3);assert.equal(parts[1],'blob');const length=Number(parts[2]);assert.ok(Number.isSafeInteger(length)&&length<=100e6);offset=lineEnd+1;assert.equal(createHash('sha256').update(bytes.subarray(offset,offset+length)).digest('hex'),row.gitBlobSha256);offset+=length;assert.equal(bytes[offset++],10);}
  assert.equal(offset,bytes.length);return rows.length;
}
