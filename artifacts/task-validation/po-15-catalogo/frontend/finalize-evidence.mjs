import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const directory = 'artifacts/task-validation/po-15-catalogo/frontend';
const verifyOnly = process.argv.includes('--verify-only');
const read = name => JSON.parse(readFileSync(directory + '/' + name, 'utf8'));
const write = (name, data) => writeFileSync(directory + '/' + name, JSON.stringify(data, null, 2) + '\n');
const hashBytes = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = path => hashBytes(readFileSync(path));
const git = (...args) => execFileSync('git', args, {stdio:['ignore','pipe','ignore'], maxBuffer:64 * 1024 * 1024});
const source = read('source-manifest.json');
const atValidation = read('source-at-validation.json');
const baseline = read('baseline-source-manifest.json');
const expectedSource = 'e6e5cdfe1e5b3c970933e0749e28ee20d6eede47efdaf60af1e25d93e8c6920c';
const expectedRuntime = 'fa36a69fd25f736455ecfcdd807cfab0e57d0d13065d59527f3efa08df4b6786';
const expectedManifest = '1aa2bf2ceed4e9e71cce5cef9bfd76a651ba498be6b946c41009776bc86ca730';
const expectedBaseline = 'f445260a4ca4de872c1361ff19fc215179b097fe';
const identity = rows => hashBytes(JSON.stringify(rows.map(({path,sha256})=>({path,sha256}))));
const uniqueSorted = paths => [...new Set(paths)].filter(Boolean).sort();
const unwrap = name => JSON.parse(read(name).content.find(item=>item.type==='text').text);
assert.equal(source.sourceStateId, expectedSource);
assert.equal(source.runtimeSourceId, expectedRuntime);
assert.equal(hash(directory + '/source-manifest.json'), expectedManifest);
assert.equal(identity(source.files), expectedSource);
assert.equal(identity(source.files.filter(file=>!file.path.includes('/__tests__/'))), expectedRuntime);
assert.deepEqual(source.files, atValidation.files);
assert.equal(atValidation.sourceStateId, expectedSource);
assert.equal(atValidation.runtimeSourceId, expectedRuntime);
assert.equal(source.baseline, expectedBaseline);
assert.equal(baseline.baseline, expectedBaseline);
assert.equal(git('rev-parse','HEAD').toString().trim(), expectedBaseline);
assert.deepEqual(uniqueSorted(read('implementation-paths.json')), uniqueSorted(source.files.map(file=>file.path)));

const changed = new Set(source.files.map(file=>file.path));
const unchanged = baseline.files.filter(file=>!changed.has(file.path));
assert.equal(source.files.length, 31);
assert.equal(source.files.filter(file=>file.baselineSha256===null).length, 14);
assert.equal(baseline.files.length, 549);
assert.equal(unchanged.length, 532);
for (const item of [...source.files, ...unchanged]) {
  assert.equal(hash(item.path), item.sha256, 'Source changed: ' + item.path);
  assert.equal(statSync(item.path).size, item.bytes, 'Source size changed: ' + item.path);
}
for (const item of unchanged) assert.equal(item.unchangedVerified, true);
for (const item of source.files.filter(file=>file.baselineSha256===null)) assert.ok(item.lines<500);
for (const [path, expected] of Object.entries(source.protectedFiles)) assert.equal(hash(path), expected, path);
const currentChanged = uniqueSorted([
  ...git('diff','--name-only',source.baseline,'--','frontend/src').toString().trim().split('\n'),
  ...git('ls-files','--others','--exclude-standard','frontend/src').toString().trim().split('\n'),
]);
assert.deepEqual(currentChanged, [...changed].sort(), 'Current changed paths differ from frozen scope');
const baselinePaths = git('ls-tree','-r','--name-only',expectedBaseline,'--',
  'frontend/src','frontend/package.json','frontend/package-lock.json','frontend/vite.config.ts',
  'frontend/tsconfig.json','frontend/tsconfig.app.json','frontend/tsconfig.node.json',
  'frontend/eslint.config.js','frontend/index.html','package.json','package-lock.json',
  'scripts/stub-css-loader.mjs').toString().trim().split('\n');
assert.deepEqual(uniqueSorted(baselinePaths),uniqueSorted(baseline.files.map(file=>file.path)));
assert.equal(git('diff','--name-only',source.baseline,'--','backend','package.json','package-lock.json',
  'frontend/package.json','frontend/package-lock.json').toString().trim(),'');

// Verify exact baseline Git objects without modifying the checkout.
const objects = execFileSync('git', ['cat-file','--batch'], {
  input:baseline.files.map(file=>source.baseline + ':' + file.path + '\n').join(''),
  stdio:['pipe','pipe','ignore'], maxBuffer:64 * 1024 * 1024,
});
let offset = 0;
const baselineByPath = new Map();
for (const item of baseline.files) {
  const headerEnd = objects.indexOf(10, offset);
  assert.ok(headerEnd>=offset);
  const match = objects.subarray(offset, headerEnd).toString().match(/^[a-f0-9]+ blob (\d+)$/);
  assert.ok(match, 'Missing baseline object: ' + item.path);
  const length = Number(match[1]);
  const bytes = objects.subarray(headerEnd+1, headerEnd+1+length);
  offset = headerEnd+length+2;
  assert.equal(hashBytes(bytes), item.baselineCanonicalSha256, 'Baseline hash changed: ' + item.path);
  baselineByPath.set(item.path, item);
  const current = readFileSync(item.path);
  if (!changed.has(item.path) && !bytes.equals(current)) {
    assert.ok(!bytes.toString('utf8').includes('\ufffd'));
    assert.equal(bytes.toString('utf8').replaceAll('\r\n','\n'), current.toString('utf8').replaceAll('\r\n','\n'), item.path);
  }
}
assert.equal(offset, objects.length);
for (const item of source.files) assert.equal(item.baselineSha256, baselineByPath.get(item.path)?.baselineCanonicalSha256 ?? null);

const testLog = readFileSync(directory + '/test-focused.log', 'utf8');
assert.match(testLog, /tests 173\b/);
assert.match(testLog, /pass 173\b/);
for (const label of ['fail','cancelled','skipped','todo']) assert.match(testLog, new RegExp(label + ' 0\\b'));
const testCommand = read('test-command.json');
assert.equal(testCommand.exitCode,0);
assert.equal(testCommand.files,37);
assert.equal(testCommand.cwd,'frontend');
const testPaths = testCommand.command.slice(testCommand.command.indexOf('--test')+1);
assert.equal(testPaths.length,37);
assert.equal(uniqueSorted(testPaths).length,37);
for (const path of testPaths) assert.ok(changed.has('frontend/'+path)||baselineByPath.has('frontend/'+path));
assert.ok(testCommand.command.includes('../scripts/stub-css-loader.mjs'));
assert.ok(testCommand.command.includes('../'+directory+'/stub-test-assets.mjs'));
const buildLog = readFileSync(directory + '/build.log', 'utf8');
const buildCommand = read('build-command.json');
assert.ok(buildLog.includes('tsc -b && vite build'));
assert.match(buildLog,/built in \d+(?:\.\d+)?s/);
assert.equal(buildCommand.exitCode,0);
assert.equal(buildCommand.sourceStateId,expectedSource);
assert.equal(buildCommand.runtimeSourceId,expectedRuntime);

const lint = read('lint-comparison.json');
assert.equal(lint.baseline, source.baseline);
assert.deepEqual(lint.introduced, []);
assert.deepEqual(uniqueSorted(lint.files.map(file=>file.file)), uniqueSorted(source.files.filter(file=>/\.tsx?$/.test(file.path)).map(file=>file.path)));
assert.equal(lint.files.length,30);
const signature = message => message.ruleId + ':' + message.severity + ':' + message.title.replace(/\(at line \d+\)/g,'(at line <location>)');
for (const item of lint.files) {
  assert.equal(hash(item.file), item.candidateHash, 'Lint input changed: ' + item.file);
  assert.equal(item.baselineHash, baselineByPath.get(item.file)?.baselineCanonicalSha256 ?? null);
  const available = item.baseline.map(signature);
  for (const message of item.candidate) {
    const index = available.indexOf(signature(message));
    assert.ok(index>=0, 'New lint diagnostic: ' + item.file);
    available.splice(index,1);
  }
}
const baselineDiagnostics = lint.files.reduce((count,file)=>count+file.baseline.length,0);
const candidateDiagnostics = lint.files.reduce((count,file)=>count+file.candidate.length,0);
assert.equal(baselineDiagnostics,16);
assert.equal(candidateDiagnostics,16);
assert.ok(readFileSync(directory + '/lint.log','utf8').includes('"introduced":[]'));

const walk = path => readdirSync(path,{withFileTypes:true}).flatMap(item=>item.isDirectory()?walk(path+'/'+item.name):[path+'/'+item.name]);
const scan = read('secret-scan.json');
assert.deepEqual(scan.findings,[]);
const emittedText = walk('frontend/dist').filter(path=>/\.(js|css|html|json|mjs)$/.test(path));
assert.equal(emittedText.length,112);
assert.equal(scan.scanned.length,143);
assert.deepEqual(uniqueSorted(scan.scanned.map(item=>item.path)), uniqueSorted([...changed,...emittedText]));
for (const item of scan.scanned) {
  assert.equal(hash(item.path),item.sha256,'Scanned input changed: '+item.path);
  assert.equal(statSync(item.path).size,item.bytes);
}
assert.equal(scan.rules.length,6);
const contractHashes = {
  'task-contract.snapshot.md':'bf0e8dd2f18a20e04fdcda2d754c3d34390e12b7e7ad0807852a3d5c5ed35fdf',
  'preparatory-review.snapshot.md':'4fd9d6adf93345285340fb0a044a20b0acfc1fa8aad54285f91ee3ea451a06e1',
  'catalog-contract-proposal.snapshot.md':'cacbf3edb27e8b17402c759cea6c08a25bffd3069d47d8cec3a6598f0c401000',
  'backend-contract.snapshot.md':'02f5a046ca85531902744136ae2534f782abb14136fb3b0cb78cf219ead09e23',
};
for (const [file,expected] of Object.entries(contractHashes)) assert.equal(hash(directory+'/'+file),expected,file);
for (const name of ['frontend-contract.md','intake-nrs-addendum.snapshot.md','implementation-receipt.md']) {
  const text = readFileSync(directory+'/'+name,'utf8');
  assert.ok(text.includes(contractHashes['backend-contract.snapshot.md']),name+' backend hash');
  assert.ok(text.includes('legacyPainDrafts')&&text.includes('legacyPainError'),name+' final pair');
}
git('diff','--check','--','frontend/src');

const claim = read('claims-implementation.json');
assert.equal(claim.status,'released');
assert.equal(claim.claimActive,false);
assert.equal(claim.applicationClaimActive,false);
assert.equal(claim.sourceStateId,expectedSource);
assert.equal(claim.runtimeSourceId,expectedRuntime);
assert.equal(claim.sourceManifestSha256,expectedManifest);
assert.deepEqual(read('claims.json'),claim);
const releaseFiles = {
  'claims-preparation-release.json':'PO-15-frontend-preparation',
  'claims-implementation-release.json':'PO-15-frontend-implementation',
  'claims-legacy-entry-release.json':'PO-15-frontend-legacy-entry',
  'claims-evidence-release.json':'PO-15-frontend-evidence',
};
for (const [file,id] of Object.entries(releaseFiles)) {
  const result = unwrap(file);
  assert.equal(result.success,true);
  assert.equal(result.previousClaim.issueId,id);
  assert.equal(result.previousClaim.claimant.agentId,'codex-po15-frontend');
}
const preparation = read('claims-preparation.json');
assert.equal(preparation.status,'released');
assert.equal(preparation.claimActive,false);
const evidenceClaim = unwrap('ledger-evidence-claim.json');
assert.equal(evidenceClaim.success,true);
assert.equal(evidenceClaim.claim.issueId,'PO-15-frontend-evidence');
const evidencePaths = ['source-manifest.json','source-at-validation.json','baseline-source-manifest.json',
  'test-focused.log','test-command.json','run-validation.mjs','stub-test-assets.mjs','build.log','build-command.json',
  'lint-comparison.json','lint.log','lint-compare.mjs','secret-scan.json','secret-scan.log','secret-scan.mjs',
  ...Object.keys(contractHashes),'frontend-contract.md','intake-nrs-addendum.snapshot.md','implementation-receipt.md',
  ...Object.keys(releaseFiles)];
const now = new Date().toISOString();
if (!verifyOnly) {
  write('claims-evidence.json',{task:'PO-15-frontend-evidence',owner:claim.owner,worktree:claim.worktree,
    authority:claim.authority,decision:'allow-scoped-evidence-finalization',allowedPaths:[directory],
    ledgerClaim:'PO-15-frontend-evidence',ledgerClaimant:claim.ledgerClaimant,ledgerClaimedAt:evidenceClaim.claim.claimedAt,
    status:'released',claimActive:false,applicationClaimActive:false,releasedByTool:'mcp__ruflo__claims_release',
    releaseOccurredBeforeUtc:now,releaseEvidence:directory+'/claims-evidence-release.json',
    sourceStateId:expectedSource,runtimeSourceId:expectedRuntime});
  write('validation-receipt.json',{
    task:'PO-15-frontend',generatedAtUtc:now,baseline:source.baseline,sourceStateId:expectedSource,runtimeSourceId:expectedRuntime,
    sourceManifestSha256:expectedManifest,sourceFiles:31,addedSourceFiles:14,changedBaselineFiles:17,
    baselineInputs:549,unchangedBaselineInputsVerified:532,scopedCurrentInputs:563,
    exactInputBinding:'Changed-file identities plus baseline manifest and protected files bind actual scoped checkout bytes; candidate is uncommitted.',
    policyDecision:{decision:'allow',authority:claim.authority,scope:'Root-assigned isolated frontend source/tests/evidence, claims now released',excluded:claim.excluded},
    contracts:contractHashes,
    tests:{...testCommand,passed:173,failed:0,skipped:0,cancelled:0,sourceStateId:expectedSource,log:directory+'/test-focused.log',
      harness:'Production functions/SSR loaded through tsx, original CSS loader and evidence-local PDF URL/Entra env shim; no authentication or PDF worker execution.'},
    build:{...buildCommand,log:directory+'/build.log',warnings:['Existing large bundle chunk warning','Bundler plugin timing diagnostic']},
    lint:{exitCode:0,scope:'Differential lint of 30 changed TypeScript sources',baselineDiagnostics,candidateDiagnostics,introduced:[],log:directory+'/lint-comparison.json'},
    secretScan:{exitCode:0,findings:0,sourceFiles:31,bundleFiles:112,scannedFiles:143,scope:scan.scope,log:directory+'/secret-scan.json'},
    whitespace:{command:'git diff --check -- frontend/src',exitCode:0},protectedFiles:source.protectedFiles,
    artifactVerification:{sourceAtValidation:true,exactBaselineGitObjects:549,unchangedCheckoutInputs:532,sourceFiles:31,lintCandidateInputs:30,scannedInputs:143,scopeCoverage:true},
    evidenceHashes:Object.fromEntries(evidencePaths.map(file=>[file,hash(directory+'/'+file)])),
    applicationClaimReleased:true,preparationClaimReleased:true,legacyEntryClaimReleased:true,evidenceClaimReleased:true,claimsReleased:true,
    independentReview:{sourceStatus:'Reviewer read final legacy gate fix and independently verified source/runtime IDs, 31 sources, 532 unchanged inputs and released claims; no P1/P2 source finding remains.',
      manifestStatus:'Final artifact hash/coverage confirmation is recorded separately by reviewer/root.'},
    resolvedDiagnostics:[
      'Legacy rows distinguish no records from existing undated records.',
      'NRS selected print owns one patient-bound cloned selection and one dedicated body portal.',
      'Legacy catalog New during an existing edit requires explicit resume or discard; internal New/startEdit clears stale gate and choices restore focus.',
      'Intake response uses the final HTTP200 legacyPainDrafts/legacyPainError pair; both omitted is the only rollout fallback.',
      'Initial SSR asset-loader diagnostic was resolved with an evidence-local test shim; final173-pass run includes all affected suites.',
      'React refresh and effect-state diagnostics were fixed before final differential lint without suppressions.',
    ],
    limitations:[
      'Root owns browser geometry/keyboard, QA4196, patient/session interaction, slow intake reads, HTTP/PostgreSQL, synthetic PUT identity, rendered selected print and publication.',
      'SSR and domain tests do not authenticate, start PDF workers, prove browser print pagination or establish clinical validation.',
      'No separate PO15 frontend/backend runtime parity suite or performance benchmark was run by this worker.',
      'Known-signature secret scan is limited to declared rules and inputs.',
      'test-po15-focused.log is a superseded missing-asset-loader diagnostic; test-legacy-entry.log is an earlier passing subset. test-focused.log is authoritative.',
      'No worker dependency/package/lockfile/backend/schema/server/port/commit/push/deploy/live-patient write action.',
    ],
  });
  const artifacts = walk(directory).filter(path=>path!==directory+'/artifact-manifest.json').sort()
    .map(path=>({path,bytes:statSync(path).size,sha256:hash(path)}));
  write('artifact-manifest.json',{task:'PO-15-frontend',generatedAtUtc:now,sourceStateId:expectedSource,runtimeSourceId:expectedRuntime,artifacts});
}
const receipt = read('validation-receipt.json');
assert.equal(receipt.sourceStateId,expectedSource);
assert.equal(receipt.runtimeSourceId,expectedRuntime);
assert.equal(receipt.sourceManifestSha256,expectedManifest);
for (const [name,expected] of Object.entries(receipt.evidenceHashes)) assert.equal(hash(directory+'/'+name),expected,name);
const evidenceState = read('claims-evidence.json');
assert.equal(evidenceState.status,'released');
assert.equal(evidenceState.claimActive,false);
const artifactManifest = read('artifact-manifest.json');
assert.equal(artifactManifest.sourceStateId,expectedSource);
assert.equal(artifactManifest.runtimeSourceId,expectedRuntime);
const actualArtifacts = walk(directory).filter(path=>path!==directory+'/artifact-manifest.json').sort();
assert.deepEqual(artifactManifest.artifacts.map(item=>item.path),actualArtifacts);
for (const item of artifactManifest.artifacts) {
  assert.equal(hash(item.path),item.sha256,'Artifact changed: '+item.path);
  assert.equal(statSync(item.path).size,item.bytes,item.path);
}
console.log(JSON.stringify({mode:verifyOnly?'verify-only':'finalize',sourceStateId:expectedSource,runtimeSourceId:expectedRuntime,
  sourceFiles:31,baselineInputs:549,unchangedBaselineInputsVerified:532,artifacts:artifactManifest.artifacts.length,
  sourceManifestSha256:expectedManifest,artifactManifestSha256:hash(directory+'/artifact-manifest.json'),
  validationReceiptSha256:hash(directory+'/validation-receipt.json'),claimsReleased:true}));
