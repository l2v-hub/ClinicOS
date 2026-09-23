import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const directory='artifacts/task-validation/po-16-giro/frontend';
const read=name=>JSON.parse(readFileSync(directory+'/'+name,'utf8'));
const write=(name,data)=>writeFileSync(directory+'/'+name,JSON.stringify(data,null,2)+'\n');
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const baseline=read('baseline-source-manifest.json');
for(const file of baseline.files) assert.equal(hash(file.path),file.sha256,file.path);
for(const [path,expected] of Object.entries(baseline.protectedFiles)) assert.equal(hash(path),expected,path);
assert.equal(execFileSync('git',['diff','--name-only',baseline.baseline,'--','frontend/src','backend'],{encoding:'utf8'}).trim(),'');
const release=JSON.parse(read('claims-preparation-release.json').content.find(item=>item.type==='text').text);
assert.equal(release.success,true);
assert.equal(release.previousClaim.issueId,'PO-16-frontend-preparation');
const now=new Date().toISOString();
const claim={...read('claims-preparation.json'),status:'released',claimActive:false,applicationClaimActive:false,
  releaseOccurredBeforeUtc:now,releaseEvidence:directory+'/claims-preparation-release.json',nextGate:'Explicit root GO after PO15 published and verified, then exact application claim before source edits.'};
write('claims-preparation.json',claim);write('claims.json',claim);
write('preparation-session.json',{...read('preparation-session.json'),status:'prepared-awaiting-root-go',claimReleased:true,
  releaseOccurredBeforeUtc:now,releaseEvidence:directory+'/claims-preparation-release.json'});
const artifacts=readdirSync(directory).filter(name=>name!=='preparation-manifest.json'&&statSync(directory+'/'+name).isFile()).sort()
  .map(name=>({path:directory+'/'+name,bytes:statSync(directory+'/'+name).size,sha256:hash(directory+'/'+name)}));
write('preparation-manifest.json',{task:'PO-16-frontend-preparation',generatedAtUtc:now,baseline:baseline.baseline,
  sourceTreeSha256:baseline.sourceTreeSha256,baselineInputs:baseline.files.length,applicationSourceChanges:0,
  applicationValidationRun:false,applicationGo:false,claimsReleased:true,artifacts});
for(const file of artifacts)assert.equal(hash(file.path),file.sha256);
console.log(JSON.stringify({status:'prepared-awaiting-root-go',baseline:baseline.baseline,baselineInputs:baseline.files.length,
  sourceTreeSha256:baseline.sourceTreeSha256,artifacts:artifacts.length,preparationManifestSha256:hash(directory+'/preparation-manifest.json'),
  sessionSha256:hash(directory+'/preparation-session.json'),applicationSourceChanges:0,applicationGo:false,claimsReleased:true}));
