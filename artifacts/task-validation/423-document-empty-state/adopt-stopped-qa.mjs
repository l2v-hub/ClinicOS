import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve,sep} from 'node:path';
const root='artifacts/task-validation/423-document-empty-state',source='C:/w-423-qa1/'+root+'/independent-qa',target=root+'/stopped-qa1',sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(existsSync(target),false);const bytes=readFileSync(source+'/manifest.json'),manifest=JSON.parse(bytes);
assert.equal(sha(bytes),'a8c49d4ef97c2070548ab59f3b373d8f92316b5709bb1712b950b89a2530aa15');assert.equal(manifest.head,'d6539fbb68973f01e97e2b5578e2d053537fd962');assert.equal(manifest.files.length,284);assert.match(readFileSync(source+'/validation-report.md','utf8'),/^Verdict: FAILED VALIDATION\r?$/m);
const lane=JSON.parse(readFileSync(source+'/lane-release.json'));assert.equal(lane.allOwnedServersReleased,true);assert.equal(lane.portFree,true);assert.equal(lane.probeClosed,true);
writeFileSync(root+'/stopped-qa-adoption-policy.json',JSON.stringify({decision:'AUTHORIZED IMMUTABLE FAILED CANDIDATE EVIDENCE COPY ONLY; NOT ACCEPTANCE OR RELEASE',supersededApplicationCommit:manifest.head,manifestSha256:sha(bytes),files:manifest.files.length,source,target,at:new Date().toISOString()},null,2));
for(const f of manifest.files){assert.ok(!f.path.includes('..')&&!f.path.includes('runtime-cache')&&!f.path.includes('node_modules'));assert.ok(resolve(source,f.path).startsWith(resolve(source)+sep));const input=readFileSync(source+'/'+f.path);assert.equal(sha(input),f.sha256);mkdirSync(dirname(target+'/'+f.path),{recursive:true});copyFileSync(source+'/'+f.path,target+'/'+f.path);assert.equal(sha(readFileSync(target+'/'+f.path)),f.sha256);}
copyFileSync(source+'/manifest.json',target+'/manifest.json');console.log('284 failed-candidate QA1 artifacts retained byte-identically, not acceptance evidence');
