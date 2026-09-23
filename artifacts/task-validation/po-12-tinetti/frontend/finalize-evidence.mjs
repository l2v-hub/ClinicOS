import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const directory = 'artifacts/task-validation/po-12-tinetti/frontend';
const now = new Date().toISOString();
const hash = value => createHash('sha256').update(value).digest('hex');
const write = (name, value) => writeFileSync(`${directory}/${name}`,JSON.stringify(value,null,2)+'\n');
const manifest = JSON.parse(readFileSync(`${directory}/source-at-validation.json`,'utf8'));
for(const file of manifest.files) if(hash(readFileSync(file.path))!==file.sha256) throw new Error(`Source changed during validation: ${file.path}`);
const claim = JSON.parse(readFileSync(`${directory}/claims.json`,'utf8'));
for(const [path,expected] of Object.entries(claim.protectedFiles)) if(hash(readFileSync(path))!==expected) throw new Error(`Protected file mismatch: ${path}`);
const tests = readFileSync(`${directory}/test-focused.log`,'utf8');
const build = readFileSync(`${directory}/build.log`,'utf8');
const lint = JSON.parse(readFileSync(`${directory}/lint-comparison.json`,'utf8'));
const scan = JSON.parse(readFileSync(`${directory}/secret-scan.json`,'utf8'));
const parity = JSON.parse(readFileSync(`${directory}/definition-parity.json`,'utf8'));
if(!tests.includes('pass 105')||!tests.includes('fail 0')||!build.includes('built in')||lint.introduced.length||scan.findings.length||!parity.exactLabelsDescriptionsGroupsAndProvenance) throw new Error('Incomplete final evidence.');
for(const row of lint.files) if(manifest.files.find(file=>file.path===row.file)?.sha256!==row.candidateHash) throw new Error(`Lint binding mismatch: ${row.file}`);
for(const row of scan.scanned) if(hash(readFileSync(row.path))!==row.sha256) throw new Error(`Scan binding mismatch: ${row.path}`);
execFileSync('git',['diff','--check','--','frontend/src'],{stdio:['ignore','pipe','pipe']});
write('source-manifest.json',{...manifest,generatedAtUtc:now,protectedFiles:claim.protectedFiles});
write('validation-receipt.json',{
  task:'PO-12-frontend',generatedAtUtc:now,baseline:manifest.baseline,sourceStateId:manifest.sourceStateId,runtimeSourceId:manifest.runtimeSourceId,
  policyDecision:{decision:'allow',authority:claim.authorization,scope:'Claimed isolated frontend source/tests/evidence; released after validation',excluded:claim.excluded},
  tests:{exitCode:0,passed:105,failed:0,tinettiTests:14,regressionTests:91,log:`${directory}/test-focused.log`,sourceStateId:manifest.sourceStateId,
    runner:'node --import tsx --import ../scripts/stub-css-loader.mjs --test (19 focused production-importing test files)',
    combinationSpaces:{balance:11664,gait:2304,transfers:384,painad:243},
    coverage:['20 items/48 options/source parity','Bounds and risk thresholds18/19/23/24','20 missing paths and invalid domains','Unicode notes4000/4001 without truncation','Explicit result/snapshot discriminants and hash','Patient/type/session isolation, CAS/finalization, exact retry and correction instant','Legacy read-only detail/print source and unchanged JSON','Cartella protected branch omission and failed write preservation','Typed current/history/archive and PAINAD/Transfers regressions']},
  build:{exitCode:0,command:'npm run build',cwd:'frontend',log:`${directory}/build.log`,runtimeSourceId:manifest.runtimeSourceId,warnings:['Existing bundle chunk size warning','Bundler plugin timing diagnostic']},
  lint:{exitCode:0,baselineDiagnostics:lint.files.reduce((n,row)=>n+row.baseline.length,0),candidateDiagnostics:lint.files.reduce((n,row)=>n+row.candidate.length,0),introduced:[],log:`${directory}/lint-comparison.json`},
  secretScan:{exitCode:0,findings:0,sourceFiles:manifest.files.length,bundleFiles:scan.scanned.length-manifest.files.length,log:`${directory}/secret-scan.json`,scope:scan.scope},
  sourceParity:parity,whitespace:{command:'git diff --check -- frontend/src',exitCode:0},protectedFiles:claim.protectedFiles,
  resolvedDiagnostics:['Initial UI-test regex matched /10 in October date; corrected and rerun.','Initial TypeScript narrowing errors fixed; final build rerun.','Initial lint control-regex issue replaced with explicit Unicode codepoint checks.'],
  limitations:['Root owns browser390/768/1262 and keyboard checks, real print shell/PDF inspection, PostgreSQL/HTTP integration and release.','SSR proves structure/text and pure-data preservation, not browser geometry or real printing.','No performance improvement, new clinical validation or literal26-point PDF transcription is claimed.','No worker commit/push/deploy or shared dependency change.'],
});
write('claims.json',{...claim,status:'released',applicationClaimActive:false,releasedAtUtc:now,sourceStateId:manifest.sourceStateId,handoff:'Source frozen for root integration and independent read-only hash review. No worker application writes remain.'});
const artifacts = readdirSync(directory).filter(name=>name!=='artifact-manifest.json').sort().map(name=>{const path=`${directory}/${name}`,bytes=readFileSync(path);return {path,bytes:bytes.length,sha256:hash(bytes)};});
write('artifact-manifest.json',{task:'PO-12-frontend',generatedAt:now,sourceStateId:manifest.sourceStateId,artifacts});
console.log(JSON.stringify({sourceStateId:manifest.sourceStateId,runtimeSourceId:manifest.runtimeSourceId,sourceFiles:manifest.files.length,artifacts:artifacts.length,sourceManifestSha256:hash(readFileSync(`${directory}/source-manifest.json`)),artifactManifestSha256:hash(readFileSync(`${directory}/artifact-manifest.json`)),claim:'released'}));
