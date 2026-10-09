import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='artifacts/task-validation/419-calendar-create',dir=root+'/compiled-online';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const pre=read(dir+'/pre-run/snapshot.json'),now=read(root+'/deployment-receipt.json'),result=read(dir+'/run/test-results/results.json');
assert.equal(pre.deployment.vercel.id,now.vercel.id);assert.equal(pre.deployment.vercel.bundleSha256,now.vercel.bundleSha256);assert.equal(pre.deployment.applicationCommit,now.applicationCommit);
assert.equal(result.results.length,13);assert.ok(result.results.every(r=>r.status==='PASS'));assert.ok(new Date(pre.at)<new Date(result.results[0].startedAt));
for(const r of result.results){const guard=read(dir+'/run/test-results/'+r.name+'-guard.json');for(const key of ['errors','pageErrors','httpErrors','unexpected','external','writes'])assert.deepEqual(guard[key],[],r.name+':'+key);}
for(const r of pre.records)assert.equal(createHash('sha256').update(readFileSync(dir+'/'+r.path)).digest('hex'),r.sha256);
writeFileSync(dir+'/online-receipt.json',JSON.stringify({applicationCommit:now.applicationCommit,deployment:now.vercel.id,bundleSha256:now.vercel.bundleSha256,decision:'COMPILED ONLINE ACCEPTANCE VERIFIED',cases:13,sourceRecipeBoundBeforeExecution:true,afterDeploymentAndBundleUnchanged:true,productionPatientTestMutations:0,checkedAt:new Date().toISOString()},null,2));console.log('Compiled online13 PASS, unchanged deployment and bundle, zero unexpected requests/domain writes');
