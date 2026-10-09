import assert from 'node:assert/strict';
import {readFileSync,copyFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='artifacts/task-validation/424-reading-action',out=root+'/compiled-online',deployment=JSON.parse(readFileSync(root+'/deployment-receipt.json'));
assert.equal(deployment.applicationCommit,'67d21c3e9257a5acb8c9b25130c9417fb92185fb');assert.equal(deployment.decision,'VERIFIED RELEASE');assert.equal(existsSync(out+'/pre-run/deployment-receipt.json'),false);
const response=await fetch(deployment.vercel.bundleUrl);assert.equal(response.status,200);assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),deployment.vercel.bundleSha256);
copyFileSync(root+'/deployment-receipt.json',out+'/pre-run/deployment-receipt.json');
writeFileSync(out+'/pre-run/online-policy.json',JSON.stringify({decision:'AUTHORIZED COMPILED PRODUCTION STATIC QA ONLY',applicationCommit:deployment.applicationCommit,deployment:deployment.vercel.id,bundleSha256:deployment.vercel.bundleSha256,authority:'Human authorized release verification; all clinical/catalog/document/auth APIs mocked BEFORE network',mutationsOnRealPatients:0,at:new Date().toISOString()},null,2));
console.log('Exact production deployment/bundle bound before browser');
