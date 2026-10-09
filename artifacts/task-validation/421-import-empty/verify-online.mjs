import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='artifacts/task-validation/421-import-empty',dir=root+'/compiled-online';
const read=p=>JSON.parse(readFileSync(p));
const pre=read(dir+'/pre-run/snapshot.json'),now=read(root+'/deployment-receipt.json'),result=read(dir+'/run/test-results/results.json');
assert.equal(pre.deployment.vercel.id,now.vercel.id);assert.equal(pre.deployment.vercel.bundleSha256,now.vercel.bundleSha256);assert.equal(pre.deployment.applicationCommit,now.applicationCommit);
assert.equal(result.results.length,14);assert.ok(result.results.every(r=>r.status==='PASS'));
for(const r of result.results){const g=read(dir+'/run/test-results/'+r.name+'-guard.json');for(const key of ['pageErrors','unexpected','external','writes'])assert.deepEqual(g[key],[]);assert.deepEqual(g.httpErrors,g.expectedHttp);assert.equal(g.errors.length,g.expectedHttp.length+(g.expectedNetwork||0));}
for(const r of pre.records)assert.equal(createHash('sha256').update(readFileSync(dir+'/'+r.path)).digest('hex'),r.sha256);
writeFileSync(dir+'/online-receipt.json',JSON.stringify({applicationCommit:now.applicationCommit,deployment:now.vercel.id,bundleSha256:now.vercel.bundleSha256,decision:'COMPILED ONLINE ACCEPTANCE VERIFIED',cases:14,sourceRecipeBoundBeforeExecution:true,afterDeploymentAndBundleUnchanged:true,productionPatientTestMutations:0,checkedAt:new Date().toISOString()},null,2));
console.log('Compiled online14 PASS; expected fault injections separately attributed, zero unexpected requests or domain writes');
