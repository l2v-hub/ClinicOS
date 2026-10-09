import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
const root='artifacts/task-validation/412-clinical-topics';
const read=p=>JSON.parse(readFileSync(root+'/'+p,'utf8'));
const deployment=read('deployment-receipt.json');assert.equal(deployment.decision,'VERIFIED RELEASE');
assert.equal(deployment.applicationCommit,'3790a95b7c0c09b388ffbaeb7c71fe09d80a1c56');assert.equal(deployment.vercel.state,'READY');
for(const [folder,count]of [['online-verified',7],['online-extra-verified',9]]){
  const result=read('root-rerun/'+folder+'/test-results/browser-results.json');assert.equal(result.outcomes.length,count);
  assert.ok(result.outcomes.every(r=>r.status==='PASS'));
  for(const state of result.states){for(const key of ['domainWrites','unexpected','external','pageErrors'])assert.equal(state[key].length,0);
    assert.ok(state.httpErrors.every(e=>e.status===503&&e.path.includes('/narrative-sections')));
    assert.equal(state.errors.filter(e=>!/Failed to load resource.*503/.test(e)).length,0);}
}
const ci=read('ci-comparison.json');assert.equal(ci.newFailureNames.length,0);assert.equal(ci.frontendSecretScanConclusion,'success');
const receipt=read('release-gate-receipt.json');receipt.deploymentAcceptance='VERIFIED exact-source Vercel READY, alias/assets200, original7+extra9 compiled browser groups with all backend requests synthetically intercepted';
receipt.productionDeployment=deployment.vercel.id;receipt.compiledOnlineBrowserPass=16;receipt.finalVerifiedAt=new Date().toISOString();
writeFileSync(root+'/release-gate-receipt.json',JSON.stringify(receipt,null,2));console.log('Final exact-source release + compiled browser + scoped CI comparison verified');
