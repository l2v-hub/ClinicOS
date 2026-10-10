import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export function verifyCanonical(rows,revision='') {
  const refs=rows.map(r=>{assert.ok(r.path.startsWith('artifacts/task-validation/426-room-actions/')&&!/[\r\n]/.test(r.path));return revision+':'+r.path;});
  const batch=spawnSync('git',['cat-file','--batch'],{input:refs.join('\n')+'\n',maxBuffer:500e6,windowsHide:true});assert.equal(batch.status,0,'Canonical Git stream failed safely');const bytes=batch.stdout;let offset=0;
  for(const row of rows){const lineEnd=bytes.indexOf(10,offset);assert.ok(lineEnd>offset);const parts=bytes.subarray(offset,lineEnd).toString('ascii').split(' ');assert.equal(parts.length,3);assert.equal(parts[1],'blob');const length=Number(parts[2]);assert.ok(Number.isSafeInteger(length)&&length<=100e6);offset=lineEnd+1;assert.equal(createHash('sha256').update(bytes.subarray(offset,offset+length)).digest('hex'),row.gitBlobSha256);offset+=length;assert.equal(bytes[offset++],10);}
  assert.equal(offset,bytes.length);return rows.length;
}
