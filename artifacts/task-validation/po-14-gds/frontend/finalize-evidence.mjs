import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const directory = 'artifacts/task-validation/po-14-gds/frontend';
const read = name => JSON.parse(readFileSync(`${directory}/${name}`, 'utf8'));
const write = (name, data) => writeFileSync(`${directory}/${name}`, JSON.stringify(data, null, 2) + '\n');
const hashBytes = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = path => hashBytes(readFileSync(path));
const git = (...args) => execFileSync('git', args, {stdio:['ignore','pipe','ignore'], maxBuffer:64 * 1024 * 1024});
const source = read('source-manifest.json');
const atValidation = read('source-at-validation.json');
const baseline = read('baseline-source-manifest.json');
const release = read('claims-implementation-release.json');
const evidenceRelease = read('claims-evidence-release.json');
const expectedSource = 'ab42f3de1afebe1d6b63d01d7aa6b5011a13058270c8530f2a2a840a46a21f31';
const expectedRuntime = 'de1b676d5af2bafe7dd3366e8b49b62697705e0ad6b0ddaed69718e493517850';
const expectedManifest = '0d9ccbb567f069942cbc143613976624d688fd66cbd631cfcc660d74af8de0e8';
const identity = rows => hashBytes(JSON.stringify(rows.map(({path,sha256})=>({path,sha256}))));
const uniqueSorted = paths => [...new Set(paths)].filter(Boolean).sort();
assert.equal(source.sourceStateId, expectedSource);
assert.equal(source.runtimeSourceId, expectedRuntime);
assert.equal(hash(`${directory}/source-manifest.json`), expectedManifest);
assert.equal(identity(source.files), expectedSource);
assert.equal(identity(source.files.filter(file=>!file.path.includes('/__tests__/'))), expectedRuntime);
assert.deepEqual(source.files, atValidation.files);
assert.equal(atValidation.sourceStateId, expectedSource);
assert.equal(atValidation.runtimeSourceId, expectedRuntime);
assert.equal(source.baseline, baseline.baseline);
assert.equal(release.success, true);
assert.equal(release.status, 'released');
const evidenceReleaseResult = JSON.parse(evidenceRelease.content.find(item=>item.type==='text').text);
assert.equal(evidenceReleaseResult.success, true);
assert.equal(release.sourceStateId, expectedSource);
assert.equal(release.sourceManifestSha256, expectedManifest);
assert.deepEqual(uniqueSorted(read('implementation-paths.json')), uniqueSorted(source.files.map(file=>file.path)));

const changed = new Set(source.files.map(file=>file.path));
const unchanged = baseline.files.filter(file=>!changed.has(file.path));
assert.equal(source.files.length, 22);
assert.equal(source.files.filter(file=>file.baselineSha256===null).length, 10);
assert.equal(baseline.files.length, 539);
assert.equal(unchanged.length, 527);
for (const item of [...source.files, ...unchanged]) {
  assert.equal(hash(item.path), item.sha256, `Source changed: ${item.path}`);
  assert.equal(statSync(item.path).size, item.bytes, `Source size changed: ${item.path}`);
}
for (const item of unchanged) assert.equal(item.unchangedVerified, true);
for (const item of source.files.filter(file=>file.baselineSha256===null)) assert.ok(item.lines<500);
for (const [path, expected] of Object.entries(source.protectedFiles)) assert.equal(hash(path), expected, path);
const currentChanged = uniqueSorted([
  ...git('diff','--name-only',source.baseline,'--','frontend/src').toString().trim().split('\n'),
  ...git('ls-files','--others','--exclude-standard','frontend/src').toString().trim().split('\n'),
]);
assert.deepEqual(currentChanged, [...changed].sort(), 'Current changed paths differ from frozen scope');

// Verify all exact baseline objects in one read-only Git batch, including changed files.
const objects = execFileSync('git', ['cat-file','--batch'], {
  input:baseline.files.map(file=>`${source.baseline}:${file.path}\n`).join(''),
  stdio:['pipe','pipe','ignore'], maxBuffer:64 * 1024 * 1024,
});
let offset = 0;
const baselineByPath = new Map();
for (const item of baseline.files) {
  const headerEnd = objects.indexOf(10, offset);
  assert.ok(headerEnd>=offset);
  const match = objects.subarray(offset, headerEnd).toString().match(/^[a-f0-9]+ blob (\d+)$/);
  assert.ok(match, `Missing baseline object: ${item.path}`);
  const length = Number(match[1]);
  const bytes = objects.subarray(headerEnd+1, headerEnd+1+length);
  offset = headerEnd+length+2;
  assert.equal(hashBytes(bytes), item.baselineCanonicalSha256, `Baseline hash changed: ${item.path}`);
  baselineByPath.set(item.path, item);
  const current = readFileSync(item.path);
  if (item.unchangedVerified && !bytes.equals(current)) {
    assert.ok(!bytes.toString('utf8').includes('\ufffd'));
    assert.equal(bytes.toString('utf8').replaceAll('\r\n','\n'), current.toString('utf8').replaceAll('\r\n','\n'), item.path);
  }
}
assert.equal(offset, objects.length);
for (const item of source.files) assert.equal(item.baselineSha256, baselineByPath.get(item.path)?.baselineCanonicalSha256 ?? null);

const testLog = readFileSync(`${directory}/test-focused.log`, 'utf8');
assert.match(testLog, /tests 138\b/);
assert.match(testLog, /pass 138\b/);
for (const label of ['fail','cancelled','skipped','todo']) assert.match(testLog, new RegExp(`${label} 0\\b`));
const gdsTestFiles = ['frontend/src/lib/__tests__/gds15Definition.test.ts','frontend/src/lib/__tests__/gds15Workflow.test.ts','frontend/src/components/operator/__tests__/gds15Ui.test.ts'];
assert.equal(gdsTestFiles.reduce((count,path)=>count+[...readFileSync(path,'utf8').matchAll(/^test\(/gm)].length,0),11);
const buildLog = readFileSync(`${directory}/build.log`, 'utf8');
assert.ok(buildLog.includes('tsc -b && vite build'));
assert.ok(buildLog.includes('built in 20.77s'));

const lint = read('lint-comparison.json');
assert.equal(lint.baseline, source.baseline);
assert.deepEqual(lint.introduced, []);
assert.deepEqual(uniqueSorted(lint.files.map(file=>file.file)), uniqueSorted(source.files.filter(file=>/\.tsx?$/.test(file.path)).map(file=>file.path)));
const signature = message => `${message.ruleId}:${message.severity}:${message.title.replace(/\(at line \d+\)/g,'(at line <location>)')}`;
for (const item of lint.files) {
  assert.equal(hash(item.file), item.candidateHash, `Lint input changed: ${item.file}`);
  assert.equal(item.baselineHash, baselineByPath.get(item.file)?.baselineCanonicalSha256 ?? null);
  const available = item.baseline.map(signature);
  for (const message of item.candidate) {
    const index = available.indexOf(signature(message));
    assert.ok(index>=0, `New lint diagnostic: ${item.file}`);
    available.splice(index,1);
  }
}
const baselineDiagnostics = lint.files.reduce((count,file)=>count+file.baseline.length,0);
const candidateDiagnostics = lint.files.reduce((count,file)=>count+file.candidate.length,0);
assert.equal(baselineDiagnostics,18);
assert.equal(candidateDiagnostics,18);
assert.ok(readFileSync(`${directory}/lint.log`,'utf8').includes('"introduced":[]'));

const walk = path => readdirSync(path,{withFileTypes:true}).flatMap(item=>item.isDirectory()?walk(`${path}/${item.name}`):[`${path}/${item.name}`]);
const scan = read('secret-scan.json');
assert.deepEqual(scan.findings,[]);
const emittedText = walk('frontend/dist').filter(path=>/\.(js|css|html|json|mjs)$/.test(path));
assert.equal(emittedText.length,110);
assert.equal(scan.scanned.length,132);
assert.deepEqual(uniqueSorted(scan.scanned.map(item=>item.path)), uniqueSorted([...changed,...emittedText]));
for (const item of scan.scanned) {
  assert.equal(hash(item.path),item.sha256,`Scanned input changed: ${item.path}`);
  assert.equal(statSync(item.path).size,item.bytes);
}
const parity = read('definition-parity.json');
assert.equal(parity.outcome,'pass');
assert.equal(parity.scenarios,32793);
assert.equal(parity.completeCombinations,32768);
for (const item of [parity.frontendInput,...parity.backendInputs]) assert.equal(hash(item.path),item.sha256,`Parity input changed: ${item.path}`);
const contractHashes = {
  'task-contract.snapshot.md':'a3b287c148561cccae5aa11cbe572f63400161d9f2aa57386d8393821c9e9abc',
  'backend-contract.snapshot.md':'13ec80cedcc577c40e00e30a98a6e5f41ee03513c8a0a4afb6da13a252aba708',
  'definition-contract.snapshot.json':'f48082ea66e05298437fa771fb9274a785ca75f5169e9a7b6b8f261b63cdf2d7',
  'gds.source.txt':'04c1c532ccc840ede01dcd042f0edc1d2ab9c8682900411ff8027f6911080610',
};
for (const [file,expected] of Object.entries(contractHashes)) assert.equal(hash(`${directory}/${file}`),expected,file);
git('diff','--check','--','frontend/src');

const now = new Date().toISOString();
const claim = read('claims-implementation.json');
const finalClaim = {...claim,status:'released',claimActive:false,applicationClaimActive:false,
  releasedAtUtc:release.releasedAtUtc,releaseOccurredBeforeUtc:release.releaseOccurredBeforeUtc,
  releaseEvidence:`${directory}/claims-implementation-release.json`,sourceStateId:expectedSource,runtimeSourceId:expectedRuntime,
  handoff:'Root owns integration/browser/QA4195/PDF/HTTP/PostgreSQL and publication; no worker application writes remain.'};
write('claims-implementation.json',finalClaim);
write('claims.json',finalClaim);
const preparation = read('claims-preparation.json');
write('claims-preparation.json',{...preparation,status:'released',claimActive:false,applicationClaimActive:false,
  releasedAtUtc:null,releaseOccurredBeforeUtc:claim.ledgerClaimedAt,releaseRecordedAtUtc:now,
  releaseEvidence:'Observed release when application claim began; later empty claimant inventory is in ledger-release-confirmation.json. Exact release timestamp was not persisted.',
  supersededBy:'PO-14-frontend-implementation',sourceStateId:expectedSource,runtimeSourceId:expectedRuntime});
const evidenceClaim = JSON.parse(read('ledger-evidence-claim.json').content.find(item=>item.type==='text').text).claim;
write('claims-evidence.json',{task:'PO-14-frontend-evidence',owner:claim.owner,worktree:claim.worktree,
  authority:claim.authority,decision:'allow-scoped-evidence-finalization',allowedPaths:[directory],
  ledgerClaim:'PO-14-frontend-evidence',ledgerClaimant:claim.ledgerClaimant,ledgerClaimedAt:evidenceClaim.claimedAt,
  status:'released',claimActive:false,applicationClaimActive:false,releasedByTool:'mcp__ruflo__claims_release',
  releaseEvidence:`${directory}/claims-evidence-release.json`,recordedAtUtc:now,sourceStateId:expectedSource,runtimeSourceId:expectedRuntime});
const testFiles = [
  ...['gds15Definition','gds15Workflow','mnaDefinition','mnaWorkflow','painadDefinition','assessmentDraftStore','assessmentClient','assessmentArchive','transfersDefinition','transfersDraftStore','transfersClient','tinettiDefinition','tinettiWorkflow','patientDocumentArchive','patientIdentity','patientDocumentsPage','cartellaWriteQueue','medicazioniConcurrency','patientDetailLazyGuard','patientDetailWorkspace','patientRecordPrint'].map(name=>`src/lib/__tests__/${name}.test.ts`),
  ...['gds15Ui','mnaUi','assessmentsUi','transfersUi','tinettiUi'].map(name=>`src/components/operator/__tests__/${name}.test.ts`),
];
const evidenceFiles = ['source-manifest.json','source-at-validation.json','baseline-source-manifest.json','test-focused.log','build.log','lint-comparison.json','lint.log','secret-scan.json','secret-scan.log','definition-parity.json'];
write('validation-receipt.json',{
  task:'PO-14-frontend',generatedAtUtc:now,baseline:source.baseline,sourceStateId:expectedSource,runtimeSourceId:expectedRuntime,
  sourceManifestSha256:expectedManifest,sourceFiles:22,addedSourceFiles:10,changedBaselineFiles:12,
  baselineInputs:539,unchangedBaselineInputsVerified:527,scopedCurrentInputs:549,
  exactInputBinding:'Changed-file identities plus baseline manifest and protected files bind actual scoped checkout bytes; candidate is uncommitted.',
  policyDecision:{decision:'allow',authority:claim.authority,scope:'Root-assigned isolated GDS frontend source/tests/evidence, now released',excluded:claim.excluded},
  contracts:{...contractHashes,sourcePdfSha256:'f2d4494b49d96de08eceed69b1d793c45260f22aca7d62f98080ccee6133d709'},
  tests:{exitCode:0,passed:138,failed:0,skipped:0,gdsTests:11,regressionTests:127,cwd:'frontend',command:['node','--import','tsx','--import','../scripts/stub-css-loader.mjs','--test',...testFiles],sourceStateId:expectedSource,log:`${directory}/test-focused.log`},
  build:{exitCode:0,command:'npm run build',cwd:'frontend',runtimeSourceId:expectedRuntime,log:`${directory}/build.log`,
    binding:'Passing build preceded two test-file unused-variable cleanups; runtime inputs remained identical. Final tests and lint ran after the final source capture. Final test-file bytes were not rebuilt.',
    warnings:['Existing large bundle chunk warning','Bundler plugin timing diagnostic']},
  lint:{exitCode:0,scope:'Differential lint of 21 changed TypeScript sources',baselineDiagnostics,candidateDiagnostics,introduced:[],log:`${directory}/lint-comparison.json`},
  secretScan:{exitCode:0,findings:0,sourceFiles:22,bundleFiles:110,scannedFiles:132,scope:scan.scope,log:`${directory}/secret-scan.json`},
  sourceParity:parity,whitespace:{command:'git diff --check -- frontend/src',exitCode:0},protectedFiles:source.protectedFiles,
  artifactVerification:{sourceAtValidation:true,exactBaselineGitObjects:539,unchangedCheckoutInputs:527,sourceFiles:22,lintCandidateInputs:21,scannedInputs:132,parityInputs:4,scopeCoverage:true},
  evidenceHashes:Object.fromEntries(evidenceFiles.map(file=>[file,hash(`${directory}/${file}`)])),
  applicationClaimReleased:true,preparationClaimReleased:true,evidenceClaimReleased:true,claimsReleased:true,
  independentReview:{functionalStatus:'No remaining P1/P2 reported after surrogate fix and parser/store/UI coverage',manifestStatus:'Final generated package awaits independent hash/coverage confirmation, recorded separately by reviewer/root'},
  resolvedDiagnostics:['Snapshot description and TypeScript null narrowing corrected before passing build.','Four unused test variables removed before final lint, with source capture and focused tests repeated.','Isolated UTF-16 surrogates rejected consistently with backend; valid emoji retained.','Editor-specific last-week instruction approved by root while original source instruction remains immutable.'],
  limitations:['Root owns browser geometry/keyboard, QA4195, HTTP/PostgreSQL, rendered PDF checks and publication.','SSR verifies structure/text and state, not actual browser layout or PDF pagination.','No performance improvement or independent clinical validation claim.','Signature scan is limited to declared rules and inputs.','No worker dependency/package/lockfile/backend/schema/server/commit/push/deploy/live-write action.','Original application release success was observed but raw response and exact time were not persisted; subsequent empty claimant inventory is preserved.'],
});
const artifacts = readdirSync(directory).filter(name=>name!=='artifact-manifest.json'&&statSync(`${directory}/${name}`).isFile()).sort().map(name=>({path:`${directory}/${name}`,bytes:statSync(`${directory}/${name}`).size,sha256:hash(`${directory}/${name}`)}));
write('artifact-manifest.json',{task:'PO-14-frontend',generatedAtUtc:now,sourceStateId:expectedSource,runtimeSourceId:expectedRuntime,artifacts});
for (const item of artifacts) assert.equal(hash(item.path),item.sha256,`Artifact changed: ${item.path}`);
console.log(JSON.stringify({sourceStateId:expectedSource,runtimeSourceId:expectedRuntime,sourceFiles:22,baselineInputs:539,unchangedBaselineInputsVerified:527,artifacts:artifacts.length,sourceManifestSha256:expectedManifest,artifactManifestSha256:hash(`${directory}/artifact-manifest.json`),validationReceiptSha256:hash(`${directory}/validation-receipt.json`),claimsReleased:true}));
