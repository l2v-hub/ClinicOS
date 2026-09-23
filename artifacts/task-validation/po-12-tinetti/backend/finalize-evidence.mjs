import { createHash } from 'node:crypto';
import { readFile, writeFile, realpath } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve, relative, isAbsolute } from 'node:path';

const root = await realpath(process.cwd());
const folder = 'artifacts/task-validation/po-12-tinetti/backend';
const artifact = resolve(root, folder);
const baseline = '470a5fe7a7eee4a9b0a0b219947432049b9de977';
const branch = 'codex/po12-tinetti-backend';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, {cwd:root,windowsHide:true,encoding:'utf8'}).trim();
const paths = text => text.split(/\r?\n/).filter(Boolean);
const json = async name => JSON.parse(await readFile(resolve(artifact,name),'utf8'));
const save = (name,value) => writeFile(resolve(artifact,name),JSON.stringify(value,null,2)+'\n');
const entries = async names => Promise.all([...new Set(names)].sort().map(async path => {
  const bytes = await readFile(resolve(root,path));
  return {path,bytes:bytes.length,sha256:digest(bytes)};
}));
const tree = rows => digest(rows.map(row=>`${row.path}\0${row.sha256}\n`).join(''));
if (git('rev-parse','HEAD') !== baseline || git('branch','--show-current') !== branch) throw new Error('Wrong worktree baseline');
const inputPaths = paths(git('ls-files','--cached','--others','--exclude-standard','--',
  'backend/src','prisma','backend/tsconfig.json','backend/package.json','package.json','package-lock.json',
  'prisma.config.ts','tests/fixtures/po05-postgres.mjs'));
const inputs = await entries(inputPaths), inputTreeSha256 = tree(inputs);
const tests = await json('focused-tests.json'), testManifest = await json('test-source-manifest.json');
if (tests.sourceTreeSha256 !== inputTreeSha256 || testManifest.treeSha256 !== inputTreeSha256 ||
    !tests.sourceUnchanged || !tests.databaseClosed || tests.results.length !== 12 ||
    tests.results.some(row=>row.exitCode!==0 || row.tests<1)) throw new Error('Tests do not bind completed final source');
const testLog = await readFile(resolve(artifact,'focused-tests.log'),'utf8');
const counts = [...testLog.matchAll(/ℹ tests (\d+)/g)].map(match=>Number(match[1]));
if (counts.length !== 12 || counts.some((count,index)=>count!==tests.results[index].tests) ||
    [...testLog.matchAll(/ℹ fail (\d+)/g)].some(match=>Number(match[1])!==0)) throw new Error('Test log inconsistent');
const passed = counts.reduce((sum,count)=>sum+count,0);
const newTests = tests.results.filter(row=>/\/(tinetti|cartella-tinetti|intake-tinetti)[^/]*\.test\.ts$/.test(row.file))
  .reduce((sum,row)=>sum+row.tests,0);
const session = await json('implementation-session.json');
for (const row of session.preserved) if (digest(await readFile(resolve(root,row.path))) !== row.sha256)
  throw new Error(`Protected path changed: ${row.path}`);
const sourcePaths = await entries([
  ...paths(git('diff','HEAD','--name-only','--','backend/src','prisma')),
  ...paths(git('ls-files','--others','--exclude-standard','--','backend/src','prisma')),
]);
const newSource = await Promise.all(paths(git('ls-files','--others','--exclude-standard','--','backend/src','prisma'))
  .filter(path=>/\.(ts|sql)$/.test(path)).map(async path=>({path,lines:(await readFile(resolve(root,path),'utf8')).trimEnd().split(/\r?\n/).length})));
if (newSource.some(row=>row.lines>=500)) throw new Error('New source exceeds 500-line limit');
const qa = await json('pdf-qa/visual-qa.json');
if (qa.sourceTreeSha256!==inputTreeSha256 || !qa.allPagesInspected || !qa.noClippingOrOverlap) throw new Error('Final PDF QA missing');
for (const row of qa.files) if (digest(await readFile(resolve(artifact,'pdf-qa',row.path)))!==row.sha256) throw new Error('PDF QA hash mismatch');

let checks;
try { checks=await json('validation-checks.json'); } catch(error) { if(error.code!=='ENOENT') throw error; }
if (!checks) {
  const preparation=await json('preparation-receipt.json');
  for (const runtime of [preparation.runtime.privateWrapper,preparation.runtime.privateGeneratedClient]) {
    const actual=await realpath(runtime.target), child=relative(root,actual);
    if(child.startsWith('..') || isAbsolute(child)) throw new Error('Runtime is shared');
    for (const row of runtime.files) if(digest(await readFile(resolve(actual,row.path)))!==row.sha256) throw new Error('Prepared private runtime changed');
  }
  const output=preparation.runtime.privateGeneratedClient.target;
  const schema=await readFile(resolve(root,'prisma/schema.prisma'),'utf8');
  const generated=await readFile(resolve(output,'schema.prisma'),'utf8');
  const normalize=value=>value.replace(/^\s*output\s*=.*$/m,'').replace(/\r\n/g,'\n').split('\n')
    .map(line=>line.trim().replace(/[ \t]+/g,' ')).filter(Boolean).join('\n')
    .replace('@@index([patientId])\n@@unique([assessmentId, patientId])','@@unique([assessmentId, patientId])\n@@index([patientId])');
  if(normalize(schema)!==normalize(generated)) throw new Error('Private generated client differs from source schema');
  const privateSchema=resolve(artifact,'private-schema.prisma');
  await writeFile(privateSchema,schema.replace('provider = "prisma-client-js"',
    `provider = "prisma-client-js"\n  output = ${JSON.stringify(output.replaceAll('\\','/'))}`));
  const validation=spawnSync(process.execPath,[resolve(root,'node_modules/prisma/build/index.js'),'validate','--schema',privateSchema],
    {cwd:root,windowsHide:true,encoding:'utf8',env:{...process.env,DATABASE_URL:'postgresql://postgres@127.0.0.1:1/po12_validate_only'}});
  await writeFile(resolve(artifact,'schema-validation.log'),`${validation.stdout}\n${validation.stderr}`);
  if(validation.status!==0) throw new Error('Schema validation failed');
  const diff=spawnSync('git',['diff','--check','--','backend','prisma'],{cwd:root,windowsHide:true,encoding:'utf8'});
  await writeFile(resolve(artifact,'diff-check.log'),`${diff.stdout}\n${diff.stderr}`);
  if(diff.status!==0) throw new Error('Owned diff check failed');
  if((await readFile(resolve(artifact,'typecheck.log'))).length) throw new Error('Typecheck has diagnostics');
  const fontSource='C:/Workspace/ClinicOSHouse-worktrees/po11-transfers-backend/artifacts/task-validation/po-11-postural-transfers/backend/font-provenance.json';
  const fontBytes=await readFile(fontSource), fonts=JSON.parse(fontBytes);
  for(const row of fonts.files) if(digest(await readFile(resolve(root,row.path)))!==row.sha256) throw new Error('Font provenance mismatch');
  await writeFile(resolve(artifact,'font-provenance.json'),fontBytes);
  checks={generatedAt:new Date().toISOString(),sourceTreeSha256:inputTreeSha256,
    typecheck:{command:'node node_modules/typescript/bin/tsc -p backend/tsconfig.json --noEmit',exitCode:0,
      evidence:'Tool 004869 after final TypeScript changes; later repair affected SQL CASE parentheses only.',log:`${folder}/typecheck.log`},
    schema:{exitCode:validation.status,connectedToDatabase:false,sourceSchemaSha256:digest(schema),generatedSchemaSha256:digest(generated),
      privateClientMatchesSource:true,generationPerformed:false,reason:'Prisma models unchanged; PO11 private client reused, migration changes SQL validators/constraints only.'},
    ownedDiff:{exitCode:diff.status},newSourceFiles:newSource,newSourceFilesBelow500Lines:true,
    runtime:{privateOutput:output,privateWrapper:preparation.runtime.privateWrapper.target,sharedDependencyTargetWritten:false},
    protectedFilesPreserved:session.preserved,dependencyManifestsChanged:false,
    fonts:{provenance:`${folder}/font-provenance.json`,verified:true,license:'SIL Open Font License 1.1'},
    pdfVisualQa:`${folder}/pdf-qa/visual-qa.json`,
    review:{reviewer:'/root/clinical_forms_source_audit',resolved:'Import confirmation bypass closed by shared locked guard; final binding is independent.'}};
  await save('validation-checks.json',checks);
}
if(checks.sourceTreeSha256!==inputTreeSha256) throw new Error('Validation source changed');
const manifest={task:'PO-12-backend',root,branch,baseline,capturedAt:checks.generatedAt,
  sourceTreeSha256:tree(sourcePaths),inputTreeSha256,
  hashAlgorithm:'SHA256 over sorted path + NUL + byte-SHA256 + LF',sourcePaths,
  excludedUnrelatedDirtyPaths:['run-claude-queue.ps1','start-claude-team.ps1']};
await save('source-manifest.json',manifest);
const sourceManifestSha256=digest(await readFile(resolve(artifact,'source-manifest.json')));
let release, importRelease;
try { release=await json('claims-release.json'); importRelease=await json('claims-import-release.json'); }
catch(error) { if(error.code!=='ENOENT') throw error; }
if(!release || !importRelease) {
  console.log(JSON.stringify({preflightPassed:true,files:sourcePaths.length,passed,newTests,sourceManifestSha256,
    sourceTreeSha256:manifest.sourceTreeSha256,inputTreeSha256,awaitingClaimsRelease:true})); process.exit(0);
}
if(!release.released || release.issueId!==session.claim.issueId || release.claimant!==session.claim.claimant ||
   !importRelease.released || importRelease.issueId!=='PO-12-backend-import-guard' || importRelease.claimant!==session.claim.claimant)
  throw new Error('Both implementation claims must be released');
const evidenceNames=['source-manifest.json','test-source-manifest.json','focused-tests.json','focused-tests.log',
  'typecheck.log','validation-checks.json','schema-validation.log','diff-check.log','font-provenance.json',
  'implementation-session.json','claims-implementation.json','claims-import-guard.json','claims-release.json','claims-import-release.json',
  'preparation-session.json','preparation-receipt.json','preparation-recall.json','preparation-source-manifest.json',
  'claims-preparation.json','claims-preparation-release.json','prepare-runtime.mjs','prepare-contract.mjs','generate-definition.mjs',
  'definition-snapshot.json','backend-contract.md','test-plan.md','task-contract.snapshot.md',
  'initial-migration-failure.json','initial-migration-failure-source-manifest.json','run-focused-tests.mjs','finalize-evidence.mjs',
  'verify-visual-qa.mjs','pdf-qa/visual-qa.json',...qa.files.map(row=>`pdf-qa/${row.path}`)];
const evidence=await entries(evidenceNames.map(name=>`${folder}/${name}`));
const receipt={task:manifest.task,phase:'implementation-complete-worker-handoff',generatedAt:new Date().toISOString(),
  worktree:root,branch,baseline,decision:'allow exact-source worker handoff to root for independent integration',
  authorization:'Explicit root GO after verified PO11 release; root additionally authorized the minimal import legacy guard. Both worker claims released.',
  sourceManifestSha256,sourceTreeSha256:manifest.sourceTreeSha256,inputTreeSha256,sourceFrozen:true,
  tests:{passed,failed:0,newPo12Tests:newTests,files:tests.results.length,results:tests.results,
    finalRunnerSession:1878,finalRunnerExitCode:0,database:tests.database,databaseClosed:tests.databaseClosed,
    migrationsApplied:tests.migrations.length,sourceUnchangedBeforeAfterAndHandoff:true,
    setupRepair:'Initial migration syntax failure occurred before tests; one corrected full focused run. See initial-migration-failure.json.'},
  validation:checks,invariants:[
    'Tinetti retains the approved 20 items/48 options and 16/12/28 maxima; partial answers never receive a result/risk band.',
    'Typed immutable snapshots retain all item descriptions, notes and source/reference provenance; PAINAD/Transfers snapshots stay unchanged.',
    'CAS, replay, scope, terminal current, corrections, PDF retry and archive use the existing common lifecycle.',
    'Legacy JSON remains unchanged: scoped locked PUT and locked import confirmation reject differences; import new-patient cannot inject history.',
    'Import rejection rolls back clinical writes and leaves job/draft eligible for retry; absent empty defaults create no history.',
  ],limitations:[
    'Local worker evidence is not independent release authorization; root owns HTTP/browser/build and publication.',
    'No new Prisma model/dependency, no shared runtime generation, no dependency manifest changes.',
    'No worker claim of clinical validation, performance benchmark, CVE scan or production writes.',
  ],artifactCopyAllowlist:[...evidenceNames,'implementation-receipt.json','handoff.md','artifact-manifest.json'],
  doNotCopy:['postgres-* directories','private-schema.prisma','backend/node_modules','root node_modules junction','run-claude-queue.ps1','start-claude-team.ps1'],evidence};
await save('implementation-receipt.json',receipt);
await writeFile(resolve(artifact,'handoff.md'),`# PO12 backend completato\n\nWorktree: ${root}. Branch: ${branch}. Baseline: ${baseline}.\n\n`+
  `Tinetti versionata a 20 item/28 punti, snapshot/PDF con provenienza e note; storico legacy protetto sotto lock in PUT cartella e conferma import. Nessuna nuova tabella o dipendenza.\n\n`+
  `${passed} test verdi in ${tests.results.length} file (${newTests} nuovi), ${tests.migrations.length} migrazioni, PostgreSQL sintetico chiuso. Typecheck/schema/diff/QA visiva superati.\n\n`+
  `Manifest: source-manifest.json, ${sourcePaths.length} file, SHA256 ${sourceManifestSha256}. Changed tree ${manifest.sourceTreeSha256}; input tree ${inputTreeSha256}.\n\n`+
  `Claim implementazione e import-guard rilasciate. Root copia soltanto sourcePaths e artifactCopyAllowlist, applica 20260923060000_tinetti, valida HTTP/UI e integra. Non copiare runtime/cluster/schema privato/PowerShell. Nessun commit/push/deploy dal worker.\n`);
await save('artifact-manifest.json',{task:manifest.task,generatedAt:receipt.generatedAt,
  artifacts:await entries([...evidenceNames,'implementation-receipt.json','handoff.md'].map(name=>`${folder}/${name}`))});
console.log(JSON.stringify({completed:true,files:sourcePaths.length,passed,newTests,sourceManifestSha256,
  sourceTreeSha256:manifest.sourceTreeSha256,inputTreeSha256,receipt:resolve(artifact,'implementation-receipt.json')}));
