import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
const source='C:/w-426-qa/artifacts/task-validation/426-room-actions/independent-qa',target='artifacts/task-validation/426-room-actions/failed-independent-qa-07',sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(existsSync(target),false);const bytes=readFileSync(source+'/artifact-manifest.json'),m=JSON.parse(bytes);assert.equal(m.head,'07c3f7d13e8ac99a1af1238ec3661502950f45e3');assert.equal(m.files.length,105);assert.equal(sha(bytes),'7a7ee7ff2f48dde6ba453771441f753634dcdd6d13583b9c32219a51a86d2f7d');assert.match(readFileSync(source+'/validation-report.md','utf8'),/^QA Verdict: FAILED VALIDATION$/m);
for(const f of m.files){assert.ok(!f.path.includes('..')&&!f.path.startsWith('/')&&!f.path.includes(':'));assert.equal(sha(readFileSync(source+'/'+f.path)),f.sha256);mkdirSync(dirname(target+'/'+f.path),{recursive:true});copyFileSync(source+'/'+f.path,target+'/'+f.path);assert.equal(sha(readFileSync(target+'/'+f.path)),f.sha256);}writeFileSync(target+'/artifact-manifest.json',bytes);console.log('Failed07 independent105 files adopted byte-identically; no release authority');
