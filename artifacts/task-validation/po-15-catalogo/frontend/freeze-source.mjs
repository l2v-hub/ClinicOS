import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const directory='artifacts/task-validation/po-15-catalogo/frontend';
const read=name=>JSON.parse(readFileSync(`${directory}/${name}`,'utf8'));
const write=(name,value)=>writeFileSync(`${directory}/${name}`,JSON.stringify(value,null,2)+'\n');
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const source=read('source-at-validation.json'), baseline=read('baseline-source-manifest.json'), prep=read('claims-preparation.json');
const changed=new Set(source.files.map(file=>file.path));
const unchanged=baseline.files.filter(file=>!changed.has(file.path));
for(const item of [...source.files,...unchanged]) assert.equal(hash(item.path),item.sha256,item.path);
for(const [path,expected] of Object.entries(prep.protectedFiles)) assert.equal(hash(path),expected,path);
execFileSync('git',['diff','--check','--','frontend/src'],{stdio:['ignore','pipe','pipe']});
write('source-manifest.json',{...source,protectedFiles:prep.protectedFiles});
write('implementation-paths.json',source.files.map(file=>file.path));
const ledger=JSON.parse(read('ledger-implementation-claim.json').content.find(item=>item.type==='text').text);
assert.equal(ledger.success,true);
const claim={...prep,task:'PO-15-frontend-implementation',phase:'implementation',applicationGo:true,
  authority:'Root GO after PO14 f445260a live/health200/alias/read-only smoke verified and receipt258f6104 pushed. Root approved aggregate DTO, legacyPainDrafts/legacyPainError pair, eight New entry actions and read-only NRS preservation.',
  decision:'allow-scoped-implementation',status:'source-frozen',claimActive:true,applicationClaimActive:true,
  ledgerClaim:'PO-15-frontend-implementation',ledgerClaimedAt:ledger.claim.claimedAt,
  supplementalLedgerClaim:'PO-15-frontend-legacy-entry',allowedPaths:[...source.files.map(file=>file.path),directory],
  inputs:{...prep.inputs,'backend-contract.snapshot.md':hash(`${directory}/backend-contract.snapshot.md`)},
  sourceStateId:source.sourceStateId,runtimeSourceId:source.runtimeSourceId,
  excluded:prep.excluded.filter(value=>value!=='application source/tests until root GO'),sourceManifestSha256:hash(`${directory}/source-manifest.json`),
  handoff:'Root owns integration/browser QA4196/HTTP/PostgreSQL/rendered print and publication. Evidence finalization only after source claim release.'};
write('claims-implementation.json',claim);write('claims.json',claim);
write('claims-preparation.json',{...prep,status:'released',claimActive:false,applicationClaimActive:false,releaseEvidence:`${directory}/claims-preparation-release.json`});
console.log(JSON.stringify({sourceStateId:source.sourceStateId,runtimeSourceId:source.runtimeSourceId,sourceFiles:source.files.length,baselineInputs:baseline.files.length,unchangedBaselineInputsVerified:unchanged.length,sourceManifestSha256:hash(`${directory}/source-manifest.json`)}));
