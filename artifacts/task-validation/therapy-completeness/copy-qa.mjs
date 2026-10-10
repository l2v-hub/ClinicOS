import { readFileSync, copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const input='C:/w-therapy-qa/artifacts/task-validation/therapy-completeness-qa';
const output=resolve('artifacts/task-validation/therapy-completeness/independent-qa');
const manifest=JSON.parse(readFileSync(input+'/artifact-manifest.json','utf8'));
assert.equal(manifest.candidate,'14a03038f758cf728e563807752da1642dc35fa8');assert.equal(manifest.verdict,'FAILED VALIDATION');
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const item of manifest.artifacts){const target=resolve(output,item.path);assert.ok(target.startsWith(output+'\\')||target.startsWith(output+'/'));
  const bytes=readFileSync(input+'/'+item.path);assert.equal(hash(bytes),item.sha256);mkdirSync(dirname(target),{recursive:true});copyFileSync(input+'/'+item.path,target);}
copyFileSync(input+'/artifact-manifest.json',output+'/artifact-manifest.json');
writeFileSync('artifacts/task-validation/therapy-completeness/independent-copy-receipt.json',JSON.stringify({
  applicationCommit:manifest.candidate,verdict:manifest.verdict,files:manifest.artifacts.length,manifestSha256:hash(readFileSync(output+'/artifact-manifest.json')),
  exactBytesVerified:true,at:new Date().toISOString()},null,2));
console.log(JSON.stringify({copied:manifest.artifacts.length,verdict:manifest.verdict}));
