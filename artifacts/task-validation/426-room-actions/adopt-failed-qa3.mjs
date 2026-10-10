import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
const root='artifacts/task-validation/426-room-actions',source='C:/w-426-qa3/'+root+'/independent-qa3',target=root+'/failed-independent-qa3-922',sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(existsSync(target),false);const bytes=readFileSync(source+'/artifact-manifest.json'),m=JSON.parse(bytes);assert.equal(m.applicationCommit,'922a801f5c64cbeff02e2c14298d4dd5a16e622f');assert.equal(m.verdict,'FAILED VALIDATION');assert.equal(m.files.length,140);assert.equal(sha(bytes),'133014ded7ed582f34b38f615551b8ab66ca1509407e6a1a99150d7fbfbf7c58');assert.match(readFileSync(source+'/validation-report.md','utf8'),/^Final Decision: FAILED VALIDATION$/m);
for(const f of m.files){assert.ok(!f.path.includes('..')&&!f.path.startsWith('/')&&!f.path.includes(':'));assert.equal(sha(readFileSync(source+'/'+f.path)),f.sha256);mkdirSync(dirname(target+'/'+f.path),{recursive:true});copyFileSync(source+'/'+f.path,target+'/'+f.path);assert.equal(sha(readFileSync(target+'/'+f.path)),f.sha256);}writeFileSync(target+'/artifact-manifest.json',bytes);console.log('Failed922 independent140 files adopted byte-identically; no release authority');
