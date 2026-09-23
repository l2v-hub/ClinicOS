import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const directory='artifacts/task-validation/po-16-giro/frontend';
const read=name=>JSON.parse(readFileSync(directory+'/'+name,'utf8'));
const write=(name,value)=>writeFileSync(directory+'/'+name,JSON.stringify(value,null,2)+'\n');
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const source=read('source-at-validation.json'), baseline=read('baseline-source-manifest.json'), claim=read('claims-implementation.json');
const changed=new Set(source.files.map(file=>file.path));
const unchanged=baseline.files.filter(file=>!changed.has(file.path));
assert.equal(source.files.length,6);assert.equal(unchanged.length,557);
for(const item of [...source.files,...unchanged])assert.equal(hash(item.path),item.sha256,item.path);
for(const [path,expected] of Object.entries(claim.protectedFiles))assert.equal(hash(path),expected,path);
assert.deepEqual([...changed].sort(),claim.allowedPaths.filter(path=>path.startsWith('frontend/src/')).sort());
execFileSync('git',['diff','--check','--','frontend/src'],{stdio:['ignore','pipe','pipe']});
write('source-manifest.json',{...source,protectedFiles:claim.protectedFiles});
write('implementation-paths.json',source.files.map(file=>file.path));
const frozen={...claim,status:'source-frozen',sourceStateId:source.sourceStateId,runtimeSourceId:source.runtimeSourceId,
  sourceManifestSha256:hash(directory+'/source-manifest.json'),handoff:'Root owns integrated/browser final QA and publication; evidence-only after source claim release.'};
write('claims-implementation.json',frozen);write('claims.json',frozen);
console.log(JSON.stringify({sourceStateId:source.sourceStateId,runtimeSourceId:source.runtimeSourceId,sourceFiles:source.files.length,
 baselineInputs:baseline.files.length,unchangedBaselineInputsVerified:unchanged.length,sourceManifestSha256:frozen.sourceManifestSha256}));
