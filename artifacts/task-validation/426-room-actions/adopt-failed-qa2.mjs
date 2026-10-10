import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
const source='C:/w-426-qa2/artifacts/task-validation/426-room-actions/independent-qa2',target='artifacts/task-validation/426-room-actions/failed-independent-qa2-143',sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(existsSync(target),false);const bytes=readFileSync(source+'/artifact-manifest.json'),m=JSON.parse(bytes);assert.equal(m.head,'1436602e81d0c03625cfa73ce24974099e919612');assert.equal(m.files.length,100);assert.equal(sha(bytes),'214ebae4bdc1cced6455897772fc0acca255488c91cb95b74a2b0a6055dafe29');assert.match(readFileSync(source+'/validation-report.md','utf8'),/^QA Verdict: FAILED VALIDATION$/m);
for(const f of m.files){assert.ok(!f.path.includes('..')&&!f.path.startsWith('/')&&!f.path.includes(':'));assert.equal(sha(readFileSync(source+'/'+f.path)),f.sha256);mkdirSync(dirname(target+'/'+f.path),{recursive:true});copyFileSync(source+'/'+f.path,target+'/'+f.path);assert.equal(sha(readFileSync(target+'/'+f.path)),f.sha256);}writeFileSync(target+'/artifact-manifest.json',bytes);console.log('Failed143 independent100 files adopted byte-identically; no release authority');
