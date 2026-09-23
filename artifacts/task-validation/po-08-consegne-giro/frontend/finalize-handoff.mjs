import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const directory = 'artifacts/task-validation/po-08-consegne-giro/frontend/';
const baseline = 'c52af6237c9cbbda9a39a770c1278573567eb958';
const now = new Date().toISOString();
const git = (...args) => execFileSync('git', ['-c', 'core.quotepath=false', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const hash = value => createHash('sha256').update(value).digest('hex');
const write = (name, value) => writeFileSync(directory + name, JSON.stringify(value, null, 2) + '\n');
const read = name => readFileSync(directory + name, 'utf8');
const paths = [...new Set([...git('diff', '--name-only', '--', 'frontend/src').split('\n'), ...git('ls-files', '--others', '--exclude-standard', 'frontend/src').split('\n')])].filter(Boolean).sort();
const files = paths.map(path => {
  const source = readFileSync(path);
  let before;
  try { before = execFileSync('git', ['show', `${baseline}:${path}`], {stdio:['ignore','pipe','ignore']}); } catch { /* Added path. */ }
  const lines = source.toString('utf8').trimEnd().split(/\r?\n/).length;
  if (!before && lines >= 500) throw new Error(`New source exceeds line budget: ${path}`);
  return { path, status: before ? 'modified' : 'added', bytes: source.length, lines, sha256: hash(source), baselineSha256: before ? hash(before) : null };
});
const protectedFiles = JSON.parse(read('claims.json')).protectedFiles;
for (const [path, expected] of Object.entries(protectedFiles)) if (hash(readFileSync(path)) !== expected) throw new Error(`Protected bytes changed: ${path}`);
const lint = JSON.parse(read('lint-comparison.json'));
if (lint.introduced.length) throw new Error('Lint regressions remain');
if (!read('build-final.log').includes('built in')) throw new Error('Build success absent');
const totals = name => Object.fromEntries([...read(name).matchAll(/^ℹ (tests|pass|fail) (\d+)/gm)].map(([,key,value]) => [key,Number(value)]));
const candidate = totals('tests-final.log');
const identity = totals('tests-identity.log');
const baselineTests = totals('tests-baseline-roster-guard.log');
const failures = name => [...new Set([...read(name).matchAll(/^✖ (.+?) \([\d.]+ms\)/gm)].map(([,title]) => title))].sort();
if (candidate.tests !== 114 || candidate.pass !== 108 || candidate.fail !== 6 || identity.pass !== 8 || identity.fail !== 0 || baselineTests.fail !== 6) throw new Error('Unexpected test totals');
if (JSON.stringify(failures('tests-final.log')) !== JSON.stringify(failures('tests-baseline-roster-guard.log'))) throw new Error('Candidate failures differ from baseline');
execFileSync('git', ['diff','--check','--','frontend/src'], {stdio:['ignore','pipe','ignore']});
const runtimeFiles = files.filter(file => !/__tests__|\.test\./.test(file.path));
const sourceStateId = hash(JSON.stringify({baseline,files:files.map(({path,sha256}) => ({path,sha256})),protectedFiles}));
const runtimeSourceId = hash(JSON.stringify({baseline,files:runtimeFiles.map(({path,sha256}) => ({path,sha256}))}));
write('source-manifest.json', {baseline,generatedAtUtc:now,sourceStateId,runtimeSourceId,worktree:process.cwd(),files,protectedFiles,copyPolicy:'Copy only listed frontend source paths into the integration checkout. Protected inherited launcher modifications are excluded.'});
const walk = path => readdirSync(path, {withFileTypes:true}).flatMap(entry => entry.isDirectory() ? walk(`${path}/${entry.name}`) : [`${path}/${entry.name}`]);
const buildFiles = walk('frontend/dist').sort().map(path => ({path,sha256:hash(readFileSync(path))}));
write('build-manifest.json', {generatedAtUtc:now,baseline,runtimeSourceId,command:'npm run build',cwd:'frontend',exitCode:0,files:buildFiles});
const require = createRequire(import.meta.url);
const toolchain = Object.fromEntries(['typescript','tsx','react','vite','eslint','prettier'].map(name => [name, require(`${name}/package.json`).version]));
const claims = JSON.parse(read('claims.json'));
claims.status = 'released'; claims.applicationClaimActive = false; claims.releasedAtUtc = now; claims.releaseTo = '/root'; claims.sourceStateId = sourceStateId;
write('claims.json', claims);
const evidenceNames = ['task-contract.md','implementation-plan.md','claims.json','source-manifest.json','build-manifest.json','tests-final.log','tests-identity.log','tests-baseline-roster-guard.log','baseline-roster-guard.mjs','build-final.log','lint-comparison.json','lint-final.log'];
write('final-receipt.json', {
  owner:'/root/po01_frontend_audit',integrationOwner:'/root',baseline,branch:git('branch','--show-current'),generatedAtUtc:now,sourceStateId,runtimeSourceId,
  policyDecision:{decision:'allow',basis:claims.authorization,actions:['claimed frontend implementation','read-only dependency reuse','focused validation','handoff and claim release'],publicationAuthorizedByThisReceipt:false},
  status:'implemented-and-released-for-integration',toolchain:{node:process.version,...toolchain},
  validation:{candidateTests:{...candidate,log:'tests-final.log'},identityTests:{...identity,log:'tests-identity.log'},baselineStaticGuards:{...baselineTests,log:'tests-baseline-roster-guard.log',method:'Unchanged test executed with readFileSync mapping to exact git-show baseline source inputs; checkout untouched.',failures:failures('tests-final.log')},build:{exitCode:0,log:'build-final.log',warnings:['Vite chunks above 500 kB','Rolldown plugin timings']},lint:{files:lint.files.length,baselineDiagnostics:lint.files.reduce((n,f)=>n+f.baseline.length,0),candidateDiagnostics:lint.files.reduce((n,f)=>n+f.candidate.length,0),introduced:lint.introduced},diffCheck:'passed',newFileLineBudget:'all below 500',protectedFiles:'exact SHA-256 match'},
  independentReview:{reviewer:'/root/clinical_forms_source_audit',scope:['late PatientDetail A response after A→B and A→B→A','delayed continuation after draft edit/discard/new save'],result:'Both fixes re-read with no residual finding; reviewer did not run suites.'},
  limitations:['Root integration and browser QA pending','Six baseline static guards for unchanged MultiPatientParametri fail identically','Existing 18 lint diagnostics retained','No backend implementation or live patient mutation validated by this worker','No commit, push, deploy, server, port or dependency changes'],
  evidence:evidenceNames.map(path => ({path:directory+path,sha256:hash(readFileSync(directory+path))})),
});
console.log(JSON.stringify({sourceStateId,runtimeSourceId,files:files.length,testsPassed:candidate.pass+identity.pass,baselineTestFailures:candidate.fail,claims:claims.status}));
