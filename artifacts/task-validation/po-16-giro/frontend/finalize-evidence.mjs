import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const directory='artifacts/task-validation/po-16-giro/frontend';
const verifyOnly=process.argv.includes('--verify-only');
const read=name=>JSON.parse(readFileSync(directory+'/'+name,'utf8'));
const write=(name,value)=>writeFileSync(directory+'/'+name,JSON.stringify(value,null,2)+'\n');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hash=path=>sha(readFileSync(path));
const git=(...args)=>execFileSync('git',args,{stdio:['ignore','pipe','ignore'],maxBuffer:64*1024*1024});
const unique=paths=>[...new Set(paths)].filter(Boolean).sort();
const identity=rows=>sha(JSON.stringify(rows.map(({path,sha256})=>({path,sha256}))));
const unwrap=name=>JSON.parse(read(name).content.find(item=>item.type==='text').text);
const expectedSource='d5c3c244c9a4ed8df9dfb89264277cc7f94b5525ceacc822353b5be0679a91ff';
const expectedRuntime='2352a0fd4ad2b9aef8b8c1480a87f019dccbf588a4a799eedbd34dca70d71dff';
const expectedManifest='939ad0f35e471c418008ee0737730b4b3c3b1766f3f02409ab7b3803a95bac52';
const expectedBaseline='53e57d694850775b85ad1d22904e7bb1e6e84618';
const source=read('source-manifest.json'), atValidation=read('source-at-validation.json');
const baseline=read('baseline-source-manifest.json'), claim=read('claims-implementation.json');
assert.equal(source.sourceStateId,expectedSource);
assert.equal(source.runtimeSourceId,expectedRuntime);
assert.equal(hash(directory+'/source-manifest.json'),expectedManifest);
assert.equal(identity(source.files),expectedSource);
assert.equal(identity(source.files.filter(file=>!file.path.includes('/__tests__/'))),expectedRuntime);
assert.deepEqual(atValidation.files,source.files);
assert.equal(atValidation.sourceStateId,expectedSource);
assert.equal(atValidation.runtimeSourceId,expectedRuntime);
assert.equal(source.baseline,expectedBaseline);
assert.equal(baseline.baseline,expectedBaseline);
assert.equal(git('rev-parse','HEAD').toString().trim(),expectedBaseline);
assert.equal(source.files.length,6);
assert.equal(source.files.filter(file=>file.baselineSha256===null).length,0);
assert.equal(baseline.files.length,563);
assert.deepEqual(unique(read('implementation-paths.json')),unique(source.files.map(file=>file.path)));
const changed=new Set(source.files.map(file=>file.path));
const unchanged=baseline.files.filter(file=>!changed.has(file.path));
assert.equal(unchanged.length,557);
for(const item of [...source.files,...unchanged]){
  assert.equal(hash(item.path),item.sha256,'Input changed: '+item.path);
  assert.equal(statSync(item.path).size,item.bytes,item.path);
}
for(const [path,expected] of Object.entries(source.protectedFiles))assert.equal(hash(path),expected,path);
const currentChanged=unique([
  ...git('diff','--name-only',expectedBaseline,'--','frontend/src').toString().trim().split('\n'),
  ...git('ls-files','--others','--exclude-standard','frontend/src').toString().trim().split('\n'),
]);
assert.deepEqual(currentChanged,unique([...changed]));
assert.deepEqual(unique(claim.allowedPaths.filter(path=>path.startsWith('frontend/src/'))),currentChanged);
assert.equal(git('diff','--name-only',expectedBaseline,'--','backend','package.json','package-lock.json','frontend/package.json','frontend/package-lock.json').toString().trim(),'');
const baselinePaths=git('ls-tree','-r','--name-only',expectedBaseline,'--','frontend/src','frontend/package.json',
  'frontend/package-lock.json','frontend/vite.config.ts','frontend/tsconfig.json','frontend/tsconfig.app.json',
  'frontend/tsconfig.node.json','frontend/eslint.config.js','frontend/index.html','package.json','package-lock.json',
  'scripts/stub-css-loader.mjs').toString().trim().split('\n');
assert.deepEqual(unique(baselinePaths),unique(baseline.files.map(file=>file.path)));
const objects=execFileSync('git',['cat-file','--batch'],{input:baseline.files.map(file=>expectedBaseline+':'+file.path+'\n').join(''),
  stdio:['pipe','pipe','ignore'],maxBuffer:64*1024*1024});
let offset=0;
const baselineByPath=new Map();
for(const item of baseline.files){
  const end=objects.indexOf(10,offset);
  const match=objects.subarray(offset,end).toString().match(/^[a-f0-9]+ blob (\d+)$/);
  assert.ok(match,item.path);
  const bytes=objects.subarray(end+1,end+1+Number(match[1]));
  offset=end+Number(match[1])+2;
  assert.equal(sha(bytes),item.baselineCanonicalSha256,item.path);
  baselineByPath.set(item.path,item);
  if(!changed.has(item.path)){
    assert.equal(item.unchangedVerified,true,item.path);
    const current=readFileSync(item.path);
    if(!bytes.equals(current)){
      assert.ok(!bytes.toString('utf8').includes('\ufffd'));
      assert.equal(bytes.toString('utf8').replaceAll('\r\n','\n'),current.toString('utf8').replaceAll('\r\n','\n'),item.path);
    }
  }
}
assert.equal(offset,objects.length);
for(const item of source.files)assert.equal(item.baselineSha256,baselineByPath.get(item.path)?.baselineCanonicalSha256);
const invariantFiles=['mnaDefinition.ts','mnaInputValidation.ts','mnaLocalInputs.ts','mnaTypes.ts','mnaItems.ts','mnaValidation.ts']
  .map(name=>'frontend/src/lib/assessments/'+name);
for(const path of invariantFiles)assert.equal(hash(path),baselineByPath.get(path).sha256,path);

const testLog=readFileSync(directory+'/test-focused.log','utf8'), testCommand=read('test-command.json');
assert.match(testLog,/tests 174\b/);assert.match(testLog,/pass 174\b/);
for(const label of ['fail','skipped','cancelled','todo'])assert.match(testLog,new RegExp(label+' 0\\b'));
assert.equal(testCommand.exitCode,0);assert.equal(testCommand.files,37);
const testFiles=testCommand.command.slice(testCommand.command.indexOf('--test')+1);
assert.equal(testFiles.length,37);assert.equal(unique(testFiles).length,37);
for(const path of testFiles)assert.ok(baselineByPath.has('frontend/'+path));
assert.ok(testCommand.command.includes('../'+directory+'/stub-test-assets.mjs'));
assert.ok(testCommand.command.includes('../scripts/stub-css-loader.mjs'));
const buildCommand=read('build-command.json'), buildLog=readFileSync(directory+'/build.log','utf8');
assert.equal(buildCommand.exitCode,0);
assert.equal(buildCommand.sourceStateId,expectedSource);
assert.equal(buildCommand.runtimeSourceId,expectedRuntime);
assert.ok(buildLog.includes('tsc -b && vite build'));assert.match(buildLog,/built in \d+(?:\.\d+)?s/);
const lint=read('lint-comparison.json');
assert.equal(lint.baseline,expectedBaseline);assert.deepEqual(lint.introduced,[]);
assert.equal(lint.files.length,5);
assert.deepEqual(unique(lint.files.map(file=>file.file)),unique(source.files.filter(file=>/\.tsx?$/.test(file.path)).map(file=>file.path)));
for(const file of lint.files){
  assert.equal(file.candidateHash,hash(file.file),file.file);
  assert.equal(file.baselineHash,baselineByPath.get(file.file).baselineCanonicalSha256,file.file);
  assert.deepEqual(file.baseline,[]);assert.deepEqual(file.candidate,[]);
}
assert.ok(readFileSync(directory+'/lint.log','utf8').includes('"introduced":[]'));
const walk=path=>readdirSync(path,{withFileTypes:true}).flatMap(item=>item.isDirectory()?walk(path+'/'+item.name):[path+'/'+item.name]);
const emitted=walk('frontend/dist').filter(path=>/\.(js|css|html|json|mjs)$/.test(path));
const scan=read('secret-scan.json');
assert.equal(emitted.length,112);assert.equal(scan.scanned.length,118);
assert.equal(scan.rules.length,6);assert.deepEqual(scan.findings,[]);
assert.deepEqual(unique(scan.scanned.map(file=>file.path)),unique([...changed,...emitted]));
for(const file of scan.scanned){assert.equal(hash(file.path),file.sha256,file.path);assert.equal(statSync(file.path).size,file.bytes);}
git('diff','--check','--','frontend/src');

const contractHashes={
  'task-contract.snapshot.md':'d182b01333d1c31e5f571fe0598888f2268007c46cbd222c9c776c86f9e600d3',
  'rifiniture-osservate.snapshot.md':'676bb022dcbdf2e031827cdd6c634fb67af9c7c18d473b453da66e041e52b6a6',
  'root-assignment.snapshot.md':'b70148c576875037cc9f20f59e25e6be8b4b8449475e7a9c7a3e103aed0c4cfe',
};
for(const [name,expected] of Object.entries(contractHashes))assert.equal(hash(directory+'/'+name),expected,name);
assert.deepEqual(claim.inputs,contractHashes);
const preparation=read('preparation-manifest.json');
assert.equal(preparation.applicationGo,false);assert.equal(preparation.applicationSourceChanges,0);
assert.equal(preparation.sourceTreeSha256,baseline.sourceTreeSha256);
for(const file of preparation.artifacts){
  const path=file.path===directory+'/claims.json'?directory+'/claims-preparation.json':file.path;
  assert.equal(hash(path),file.sha256,'Historical preparation input: '+path);
}
const releaseFiles={
  'claims-preparation-release.json':'PO-16-frontend-preparation',
  'claims-implementation-release.json':'PO-16-frontend-implementation',
  'claims-evidence-release.json':'PO-16-frontend-evidence',
};
for(const [name,id] of Object.entries(releaseFiles)){
  const released=unwrap(name);assert.equal(released.success,true);
  assert.equal(released.previousClaim.issueId,id);
  assert.equal(released.previousClaim.claimant.agentId,'codex-po16-frontend');
}
assert.equal(claim.status,'released');assert.equal(claim.claimActive,false);assert.equal(claim.applicationClaimActive,false);
assert.equal(claim.sourceStateId,expectedSource);assert.equal(claim.runtimeSourceId,expectedRuntime);
assert.equal(claim.sourceManifestSha256,expectedManifest);assert.deepEqual(read('claims.json'),claim);
const evidenceClaim=unwrap('ledger-evidence-claim.json');assert.equal(evidenceClaim.success,true);
const evidenceNames=['source-manifest.json','source-at-validation.json','baseline-source-manifest.json',
  'test-focused.log','test-command.json','run-validation.mjs','stub-test-assets.mjs','test-mna-focused.log',
  'build-command.json','build.log','lint-comparison.json','lint.log','lint-compare.mjs','secret-scan.json','secret-scan.log',
  'secret-scan.mjs','implementation-receipt.md','preparation-manifest.json',...Object.keys(contractHashes),...Object.keys(releaseFiles)];
const now=new Date().toISOString();
if(!verifyOnly){
  write('claims-evidence.json',{task:'PO-16-frontend-evidence',owner:claim.owner,worktree:claim.worktree,authority:claim.authority,
    decision:'allow-scoped-evidence-finalization',allowedPaths:[directory],ledgerClaim:'PO-16-frontend-evidence',
    ledgerClaimant:claim.ledgerClaimant,ledgerClaimedAt:evidenceClaim.claim.claimedAt,status:'released',claimActive:false,
    applicationClaimActive:false,releaseOccurredBeforeUtc:now,releaseEvidence:directory+'/claims-evidence-release.json',
    sourceStateId:expectedSource,runtimeSourceId:expectedRuntime});
  write('implementation-session.json',{task:claim.task,owner:claim.owner,worktree:claim.worktree,branch:claim.branch,
    baseline:expectedBaseline,startedAt:claim.ledgerClaimedAt,status:'source-released',authority:claim.authority,
    sourceStateId:expectedSource,runtimeSourceId:expectedRuntime,sourceManifestSha256:expectedManifest,
    applicationClaimReleased:true,implementationAuthorized:true,publicationAuthorized:false});
  write('validation-receipt.json',{
    task:'PO-16-frontend',generatedAtUtc:now,baseline:expectedBaseline,sourceStateId:expectedSource,runtimeSourceId:expectedRuntime,
    sourceManifestSha256:expectedManifest,sourceFiles:6,addedSourceFiles:0,changedBaselineFiles:6,
    baselineInputs:563,unchangedBaselineInputsVerified:557,scopedCurrentInputs:563,
    exactInputBinding:'Six changed-file identities plus exact baseline objects, 557 preserved current inputs and protected-file hashes; candidate is uncommitted.',
    policyDecision:{decision:'allow',authority:claim.authority,scope:'Root-assigned isolated presentation-only frontend source/tests/evidence; claims now released',excluded:claim.excluded},
    contracts:contractHashes,presentationOnlyInvariants:Object.fromEntries(invariantFiles.map(path=>[path,hash(path)])),
    tests:{...testCommand,passed:174,failed:0,skipped:0,cancelled:0,addedSemanticTests:1,sourceStateId:expectedSource,
      log:directory+'/test-focused.log',harness:'Existing PO15 regression list plus one semantic MNA test; production functions and SSR with CSS/PDF URL/Entra env shim. No auth or PDF worker execution.'},
    build:{...buildCommand,log:directory+'/build.log',warnings:['Existing large bundle chunk warning','Bundler plugin timing diagnostic']},
    lint:{exitCode:0,scope:'Five changed TypeScript files',baselineDiagnostics:0,candidateDiagnostics:0,introduced:[],log:directory+'/lint-comparison.json'},
    secretScan:{exitCode:0,sourceFiles:6,bundleFiles:112,scannedFiles:118,findings:0,scope:scan.scope,log:directory+'/secret-scan.json'},
    whitespace:{command:'git diff --check -- frontend/src',exitCode:0},protectedFiles:source.protectedFiles,
    artifactVerification:{sourceAtValidation:true,exactBaselineGitObjects:563,unchangedCheckoutInputs:557,sourceFiles:6,
      lintCandidateInputs:5,scannedInputs:118,scopeCoverage:true,historicalPreparationInputs:preparation.artifacts.length},
    evidenceHashes:Object.fromEntries(evidenceNames.map(name=>[name,hash(directory+'/'+name)])),
    applicationClaimReleased:true,preparationClaimReleased:true,evidenceClaimReleased:true,claimsReleased:true,
    independentReview:{sourceStatus:'Reviewer read all six changes, independently verified 563 baseline Git blobs, 557 preserved inputs, source/runtime IDs, protected files, 174-test log and application release; no concrete P1/P2 identified.',
      manifestStatus:'Final independent manifest/hash confirmation is recorded separately by reviewer/root.'},
    resolvedDiagnostics:['Initial Ruflo implementation claim failed with transient Windows EPERM rename; empty inventory and successful retry preceded any source write.',
      'Build log captured at an initially misspelled sibling evidence path was relocated unchanged after successful build.'],
    limitations:['Root owns integrated/browser final QA, 390/768/1262 touch geometry and overflow, keyboard interaction, HTTP/PostgreSQL, rendered PDF and publication.',
      'SSR does not authenticate, start PDF workers or establish physical-device or clinical usability.',
      'No worker performance benchmark or clinical validation claim; secret scan only covers declared known signatures.',
      'Preparation manifest is historical: its claims.json entry is verified against the byte-identical preserved claims-preparation.json.',
      'No worker dependency/package/lockfile/backend/schema/server/port/commit/push/deploy/live-patient write action.'],
  });
  const artifacts=walk(directory).filter(path=>path!==directory+'/artifact-manifest.json').sort()
    .map(path=>({path,bytes:statSync(path).size,sha256:hash(path)}));
  write('artifact-manifest.json',{task:'PO-16-frontend',generatedAtUtc:now,sourceStateId:expectedSource,runtimeSourceId:expectedRuntime,artifacts});
}
const receipt=read('validation-receipt.json');
assert.equal(receipt.sourceStateId,expectedSource);assert.equal(receipt.runtimeSourceId,expectedRuntime);
assert.equal(receipt.sourceManifestSha256,expectedManifest);
for(const [name,expected] of Object.entries(receipt.evidenceHashes))assert.equal(hash(directory+'/'+name),expected,name);
assert.equal(read('claims-evidence.json').claimActive,false);
const artifact=read('artifact-manifest.json');
assert.equal(artifact.sourceStateId,expectedSource);assert.equal(artifact.runtimeSourceId,expectedRuntime);
assert.deepEqual(artifact.artifacts.map(file=>file.path),walk(directory).filter(path=>path!==directory+'/artifact-manifest.json').sort());
for(const file of artifact.artifacts){assert.equal(hash(file.path),file.sha256,file.path);assert.equal(statSync(file.path).size,file.bytes);}
console.log(JSON.stringify({mode:verifyOnly?'verify-only':'finalize',sourceStateId:expectedSource,runtimeSourceId:expectedRuntime,
  sourceManifestSha256:expectedManifest,sourceFiles:6,baselineInputs:563,unchangedBaselineInputsVerified:557,
  artifacts:artifact.artifacts.length,artifactManifestSha256:hash(directory+'/artifact-manifest.json'),
  validationReceiptSha256:hash(directory+'/validation-receipt.json'),claimsReleased:true}));
