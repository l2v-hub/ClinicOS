import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const root='artifacts/task-validation/413-painad-focus',source='e01bd55114e2b5b1615b4088d988a41aad60eb80';
const read=p=>JSON.parse(readFileSync(root+'/'+p,'utf8'));
const deployment=read('deployment-receipt.json');assert.equal(deployment.decision,'VERIFIED RELEASE');assert.equal(deployment.applicationCommit,source);assert.equal(deployment.vercel.state,'READY');
for(const [folder,file,count]of [['online-verified','browser-results.json',9],['online-extra-verified','adversarial-results.json',4]]){
 const result=read(`root-refinement-e01/${folder}/test-results/${file}`);assert.equal(result.outcomes.length,count);assert.ok(result.outcomes.every(r=>r.status==='PASS'));
 for(const state of result.states)for(const key of ['domainWrites','unexpected','external','pageErrors','errors','httpErrors'])assert.equal(state[key].length,0,key);
}
const ci=read('ci-comparison.json');assert.equal(ci.newFailureNames.length,0);assert.equal(ci.frontendSecretScanConclusion,'success');
const receipt=read('release-gate-receipt.json');assert.equal(receipt.applicationCommit,source);
receipt.deploymentAcceptance='VERIFIED exact-source READY alias/assets200 plus13 compiled synthetic browser groups, all backend requests intercepted before network';receipt.productionDeployment=deployment.vercel.id;receipt.compiledOnlineBrowserPass=13;receipt.finalVerifiedAt=new Date().toISOString();
writeFileSync(root+'/release-gate-receipt.json',JSON.stringify(receipt,null,2));console.log('Exact source deploy/compiled synthetic QA/scoped CI delta verified');
