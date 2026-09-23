import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const directory = 'artifacts/task-validation/po-13-mna/frontend';
const read = name => JSON.parse(readFileSync(`${directory}/${name}`, 'utf8'));
const write = (name, data) => writeFileSync(`${directory}/${name}`, JSON.stringify(data, null, 2) + '\n');
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const source = read('source-manifest.json');
const baseline = read('baseline-source-manifest.json');
const released = read('claims-implementation-release.json');
if (!released.success) throw new Error('Implementation claim remains active.');
const changed = new Set(source.files.map(file => file.path));
const unchanged = baseline.files.filter(file => !changed.has(file.path));
for (const item of [...source.files, ...unchanged]) if (hash(item.path) !== item.sha256) throw new Error('Source changed: ' + item.path);
for (const [file, expected] of Object.entries(source.protectedFiles)) if (hash(file) !== expected) throw new Error('Protected file changed: ' + file);
const testLog = readFileSync(`${directory}/test-focused.log`, 'utf8');
const testCount = Number(testLog.match(/tests (\d+)/)?.[1]);
if (testCount !== 127 || !/pass 127\b/.test(testLog) || !/fail 0\b/.test(testLog)) throw new Error('Test evidence does not pass.');
const buildLog = readFileSync(`${directory}/build.log`, 'utf8');
if (!buildLog.includes('built in')) throw new Error('Build evidence is incomplete.');
const lint = read('lint-comparison.json');
if (lint.introduced.length) throw new Error('New lint diagnostics.');
const scan = read('secret-scan.json');
if (scan.findings.length) throw new Error('Secret scan findings.');
for (const item of scan.scanned) if (hash(item.path) !== item.sha256) throw new Error('Scanned input changed: ' + item.path);
execFileSync('git', ['diff', '--check', '--', 'frontend/src'], {stdio: ['ignore','pipe','pipe']});
const now = new Date().toISOString();
const claim = read('claims-implementation.json');
const finalClaim = {...claim,decision:'allow-scoped-implementation',status:'released',claimActive:false,applicationClaimActive:false,releasedAt:now,
  sourceStateId:source.sourceStateId,paths:source.files.map(file=>file.path),allowedPaths:[...source.files.map(file=>file.path),directory],
  handoff:'Root owns integration/browser/static4194/PDF/HTTP/PostgreSQL and publication; no worker application writes remain.'};
write('claims-implementation.json', finalClaim);
write('claims.json', finalClaim);
const testFiles = [
  ...['mnaDefinition','mnaWorkflow','painadDefinition','assessmentDraftStore','assessmentClient','assessmentArchive','transfersDefinition','transfersDraftStore','transfersClient','tinettiDefinition','tinettiWorkflow','patientDocumentArchive','patientIdentity','patientDocumentsPage','cartellaWriteQueue','medicazioniConcurrency','patientDetailLazyGuard','patientDetailWorkspace','patientRecordPrint'].map(name=>`src/lib/__tests__/${name}.test.ts`),
  ...['mnaUi','assessmentsUi','transfersUi','tinettiUi'].map(name=>`src/components/operator/__tests__/${name}.test.ts`),
];
write('validation-receipt.json', {
  task:'PO-13-frontend',generatedAtUtc:now,baseline:source.baseline,sourceStateId:source.sourceStateId,runtimeSourceId:source.runtimeSourceId,
  sourceManifestSha256:hash(`${directory}/source-manifest.json`),unchangedBaselineInputsVerified:unchanged.length,
  policyDecision:{decision:'allow',authority:claim.authority,scope:'Root-assigned isolated MNA frontend source/tests/evidence, now released',excluded:claim.excluded},
  contracts:{backendDtoSha256:hash(`${directory}/backend-contract.snapshot.md`),rootTaskContractSha256:hash(`${directory}/task-contract.snapshot.md`),snapshotKAddendumSha256:hash(`${directory}/snapshot-k-addendum.snapshot.md`)},
  tests:{exitCode:0,passed:127,failed:0,mnaTests:18,regressionTests:109,cwd:'frontend',command:['node','--import','tsx','--import','../scripts/stub-css-loader.mjs','--test',...testFiles],log:`${directory}/test-focused.log`,sourceStateId:source.sourceStateId},
  build:{exitCode:0,command:'npm run build',cwd:'frontend',log:`${directory}/build.log`,runtimeSourceId:source.runtimeSourceId,warnings:['Existing large bundle chunk warning','Bundler plugin timing diagnostic']},
  lint:{exitCode:0,baselineDiagnostics:lint.files.reduce((n,file)=>n+file.baseline.length,0),candidateDiagnostics:lint.files.reduce((n,file)=>n+file.candidate.length,0),introduced:[],log:`${directory}/lint-comparison.json`},
  secretScan:{exitCode:0,findings:0,sourceFiles:source.files.length,bundleFiles:scan.scanned.length-source.files.length,log:`${directory}/secret-scan.json`,scope:scan.scope},
  sourceParity:read('definition-parity.json'),whitespace:{command:'git diff --check -- frontend/src',exitCode:0},
  protectedFiles:source.protectedFiles,claimsReleased:true,
  resolvedDiagnostics:['Initial archive UI fixture reversed its builder arrays; corrected.','Two control-regex expressions replaced by a shared codepoint predicate; final tests/build/lint repeated.','MNA-only padded-year/Rome date helper and archive projection added following independent review.'],
  limitations:['Root owns real browser geometry/keyboard, static preview4194, HTTP/PostgreSQL and rendered PDF checks and publication.','SSR validates structure/text and state, not actual browser layout or PDF pagination.','No performance improvement or independent clinical validation claim.','No worker package/lockfile/dependency/server/commit/push/deploy/live-write action.']
});
const artifacts = readdirSync(directory).filter(name=>name!=='artifact-manifest.json' && statSync(`${directory}/${name}`).isFile()).sort().map(name=>({path:`${directory}/${name}`,bytes:statSync(`${directory}/${name}`).size,sha256:hash(`${directory}/${name}`)}));
write('artifact-manifest.json',{task:'PO-13-frontend',generatedAt:now,sourceStateId:source.sourceStateId,artifacts});
for(const artifact of artifacts) if(hash(artifact.path)!==artifact.sha256) throw new Error('Artifact changed: '+artifact.path);
console.log(JSON.stringify({sourceStateId:source.sourceStateId,runtimeSourceId:source.runtimeSourceId,sourceFiles:source.files.length,unchangedBaselineInputsVerified:unchanged.length,artifacts:artifacts.length,sourceManifestSha256:hash(`${directory}/source-manifest.json`),artifactManifestSha256:hash(`${directory}/artifact-manifest.json`),validationReceiptSha256:hash(`${directory}/validation-receipt.json`),claimsReleased:true}));
