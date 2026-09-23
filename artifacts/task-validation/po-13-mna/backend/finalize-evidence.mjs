import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, realpath } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const root=await realpath(process.cwd());
const folder='artifacts/task-validation/po-13-mna/backend', artifact=resolve(root,folder);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async name=>JSON.parse(await readFile(resolve(artifact,name),'utf8'));
const save=(name,value)=>writeFile(resolve(artifact,name),JSON.stringify(value,null,2)+'\n');
const git=(...args)=>execFileSync('git',args,{cwd:root,windowsHide:true,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
const split=text=>text.split(/\r?\n/).filter(Boolean);
const entries=async names=>Promise.all([...new Set(names)].sort().map(async path=>{
 assert(!path.includes('..') && !path.startsWith('/') && !path.includes('\\'));
 const bytes=await readFile(resolve(root,path));return {path,bytes:bytes.length,sha256:sha(bytes)};
}));
const tree=rows=>sha(rows.map(row=>`${row.path}\0${row.sha256}\n`).join(''));
const session=await json('implementation-session.json'), manifest=await json('source-manifest.json');
const manifestSha=sha(await readFile(resolve(artifact,'source-manifest.json')));
assert.equal(manifestSha,'50d738bbb5e49c4d4179027a5d7ff83a66858bc28d3790f99b5156ae81a45a4b');
assert.equal(git('rev-parse','HEAD'),session.baseline);
assert.equal(git('branch','--show-current'),session.branch);
const sourcePaths=await entries([...split(git('diff','HEAD','--name-only','--','backend/src','prisma')),
 ...split(git('ls-files','--others','--exclude-standard','--','backend/src','prisma'))]);
assert.deepEqual(sourcePaths,manifest.sourcePaths);
const inputs=await entries(split(git('ls-files','--cached','--others','--exclude-standard','--',
 'backend/src','prisma','backend/tsconfig.json','backend/package.json','package.json','package-lock.json','prisma.config.ts','tests/fixtures/po05-postgres.mjs')));
const inputTreeSha256=tree(inputs);
assert.equal(inputTreeSha256,manifest.inputTreeSha256);
assert.equal(tree(sourcePaths),manifest.sourceTreeSha256);
for(const row of session.preserved) assert.equal(sha(await readFile(resolve(root,row.path))),row.sha256,row.path);
const tests=await json('focused-tests.json'), testManifest=await json('test-source-manifest.json'), checks=await json('validation-checks.json');
for(const value of [tests.sourceTreeSha256,testManifest.treeSha256,checks.sourceTreeSha256]) assert.equal(value,inputTreeSha256);
assert(tests.databaseClosed && tests.sourceUnchanged && checks.sourceUnchanged);
assert.equal(tests.results.length,16);
assert.equal(tests.migrations.length,47);
assert(tests.results.every(row=>row.exitCode===0 && row.tests>0));
assert(checks.results.every(row=>row.exitCode===0));
const log=await readFile(resolve(artifact,'focused-tests.log'),'utf8');
const counts=[...log.matchAll(/ℹ tests (\d+)/g)].map(row=>Number(row[1]));
assert.deepEqual(counts,tests.results.map(row=>row.tests));
assert([...log.matchAll(/ℹ fail (\d+)/g)].every(row=>row[1]==='0'));
const passed=counts.reduce((sum,n)=>sum+n,0);
assert.equal(passed,52);
const mnaTests=tests.results.filter(row=>/\/mna[^/]*\.test\.ts$/.test(row.file)).reduce((sum,row)=>sum+row.tests,0);
assert.equal(mnaTests,12);
const newPaths=split(git('ls-files','--others','--exclude-standard','--','backend/src','prisma'));
const newSource=await Promise.all(newPaths.filter(path=>/\.(ts|sql)$/.test(path)).map(async path=>({path,lines:(await readFile(resolve(root,path),'utf8')).trimEnd().split(/\r?\n/).length})));
assert(newSource.every(row=>row.lines<500));
const checksums=Object.fromEntries(['task-contract.snapshot.md','backend-contract.md','snapshot-k-addendum.md','pdf-typography.md'].map(name=>[name,null]));
for(const name of Object.keys(checksums)) checksums[name]=sha(await readFile(resolve(artifact,name)));
assert.equal(checksums['task-contract.snapshot.md'],session.rootContractSha256);
assert.equal(checksums['backend-contract.md'],session.dtoContractSha256);
const unsafe=[];
for(const row of sourcePaths.filter(row=>row.path.endsWith('.ts') && !row.path.includes('/__tests__/'))) {
 const content=await readFile(resolve(root,row.path),'utf8');
 for(const [name,pattern] of Object.entries({dynamicExecution:/\b(?:eval|Function)\s*\(/u,unsafeRawSql:/\$(?:queryRawUnsafe|executeRawUnsafe)\s*\(/u,externalFetch:/\bfetch\s*\(/u,privateKey:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u}))
  if(pattern.test(content)) unsafe.push({path:row.path,pattern:name});
}
assert.deepEqual(unsafe,[]);
const qa=await json('pdf-qa/visual-qa.json');
assert.equal(qa.sourceTreeSha256,inputTreeSha256);
assert(qa.allPagesInspected && qa.noClippingOrOverlap && qa.totalPages===31 && qa.files.length===52);
for(const row of qa.files) assert.equal(sha(await readFile(resolve(artifact,'pdf-qa',row.path))),row.sha256,row.path);
const toolPayload=wrapper=>JSON.parse(wrapper.content.find(row=>row.type==='text').text);
const sourceRelease=toolPayload(await json('claims-source-release.json'));
assert(sourceRelease.success && sourceRelease.previousClaim.issueId===session.claim.issueId);
await save('source-safety-review.json',{sourceTreeSha256:inputTreeSha256,recordedAt:checks.completedAt,newSourceFiles:newSource,newSourceBelow500Lines:true,
 scopedStaticChecks:{patterns:['dynamic execution','unsafe Prisma raw SQL call','external fetch','private key block'],findings:unsafe,scope:sourcePaths.filter(row=>row.path.endsWith('.ts') && !row.path.includes('/__tests__/')).map(row=>row.path)},
 manualReview:['MNA boundary parsers reject missing/extra keys, coercion, nonfinite measures, invalid calendars and conflicting measure/category modes.',
 'Existing locked assessment authorization and lifecycle remain shared; MNA only adds type-specific parser/completeness/snapshot/result branches.',
 'Patient sex is read in the locked finalization transaction; clinical age derives from frozen birth date and assessment date in Europe/Rome.',
 'Canonical sorted-key digest is scoped to new MNA snapshots, retaining array order and values; previously published snapshot hash paths remain unchanged.',
 'PDF source typography is confined to editorial blocks; notes and identity are passed unchanged and unsupported glyphs fail explicitly.'],
 independentReview:{reviewer:'/root/clinical_forms_source_audit',sourceBindingConfirmed:true,openP1P2:0,artifactReviewPending:true},
 limitations:['Static pattern scan and focused authorization regressions are not a dependency CVE scan or clinical validation.']});
let evidenceRelease;
try { evidenceRelease=toolPayload(await json('claims-evidence-release.json')); }
catch(error) { if(error.code!=='ENOENT') throw error; }
if(!evidenceRelease) {
 console.log(JSON.stringify({preflightPassed:true,sourceFiles:sourcePaths.length,inputs:inputs.length,passed,mnaTests,pages:qa.totalPages,awaitingEvidenceClaimRelease:true}));
 process.exit(0);
}
assert(evidenceRelease.success && evidenceRelease.previousClaim.issueId==='PO-13-backend-evidence');
const preparation=await json('preparation-receipt.json');
const evidenceNames=[...new Set([
 ...preparation.artifactCopyAllowlist.filter(name=>name!=='artifact-manifest.json'),
 'source-manifest.json','implementation-session.json','claims-implementation.json','claims-source-release.json','claims-evidence.json','claims-evidence-release.json',
 'snapshot-k-addendum.md','pdf-typography.md','focused-tests.json','focused-tests.log','test-source-manifest.json',
 'mna-focused-tests.json','mna-focused-tests.log','mna-test-source-manifest.json',
 'initial-failed-focused-tests.json','initial-failed-focused-tests.log','initial-failed-test-source-manifest.json','initial-sql-validator-failure.json',
 'second-failed-focused-tests.json','second-failed-focused-tests.log','second-failed-test-source-manifest.json','second-snapshot-pdf-failure.json',
 'third-pre-refinement-focused-tests.json','third-pre-refinement-focused-tests.log','third-pre-refinement-test-source-manifest.json',
 'typecheck.log','build.log','build-fonts.log','schema-validation.log','diff-check.log','validation-checks.json','font-provenance.json','source-safety-review.json',
 'run-focused-tests.mjs','run-validation.mjs','freeze-source.mjs','render-pdf-qa.mjs','verify-visual-qa.mjs','finalize-evidence.mjs',
 'pdf-qa/rendered-pages.json','pdf-qa/visual-qa.json',...qa.files.map(row=>'pdf-qa/'+row.path)
])].sort();
assert(evidenceNames.every(name=>!/(postgres-|private-schema|node_modules|po-14)/u.test(name)));
const evidence=await entries(evidenceNames.map(name=>folder+'/'+name));
const receipt={task:manifest.task,phase:'implementation-complete-worker-handoff',generatedAt:new Date().toISOString(),worktree:root,branch:session.branch,baseline:session.baseline,
 decision:'allow exact-source worker handoff to root for independent integration and release decision',
 authorization:'Explicit root GO after verified PO12 release; root approved the K frozen subitems extension and editorial-only PDF typography. Source and evidence claims released.',
 sourceManifestSha256:manifestSha,sourceTreeSha256:manifest.sourceTreeSha256,inputTreeSha256,sourceFrozen:true,sourceFiles:sourcePaths.length,sourceInputs:inputs.length,contracts:checksums,
 tests:{passed,failed:0,newMnaTests:mnaTests,regressionTests:passed-mnaTests,files:tests.results.length,results:tests.results,finalRunnerSession:26126,finalRunnerExitCode:0,
 database:tests.database,databaseClosed:tests.databaseClosed,migrationsApplied:tests.migrations.length,sourceUnchangedBeforeAfterAndHandoff:true,
 priorAttempts:'Preserved initial SQL precedence failure (45/51), second snapshot hash and glyph failures (48/51), third pre-refinement success (11/11), then scoped editorial-only MNA success (12/12) before the final 52/52 pass.'},
 validation:checks,pdfQa:{files:9,pages:31,allPagesInspected:true,receipt:'pdf-qa/visual-qa.json',typographyDecision:'pdf-typography.md'},
 invariants:['A–R support independent 14/16/30 scoring with half points, incomplete K and partial G–R preservation, screening/full finalization rules and no inferred answers.',
 'Measured BMI and circumferences use exact thresholds; Q includes 21 and 22, measurement dates remain independent and manual provenance is frozen.',
 'Immutable MNA snapshots preserve source, correction provenance, references, copyright, notes and clinical age/sex without rewriting old assessment snapshots.',
 'PDF failures preserve final clinical data; supported Unicode/newlines render and unsupported free-text glyphs fail explicitly without silent transliteration.',
 'SQL migration extends existing type/answer/state checks and adds MNA-only calendar validation; previous modules pass their focused regressions.'],
 limitations:['Root owns HTTP/browser integration and independently authorized publication; worker evidence alone does not authorize release.',
 'Current shared Noto fonts do not cover all Unicode: unsupported glyphs in free text produce assessment_pdf_unsupported_glyph; original data remains intact.',
 'No new Prisma model/dependency, no shared runtime generation or dependency manifest changes.',
 'No worker commit, push, deploy, online patient write, clinical validation, performance benchmark or dependency CVE-scan claim.',
 'PO14 artifacts are separate contract-only preparation and excluded from this implementation handoff.'],
 artifactCopyAllowlist:[...evidenceNames,'implementation-receipt.json','handoff.md','artifact-manifest.json'],
 doNotCopy:['postgres-* directories','private-schema.prisma','backend/node_modules','root node_modules junction','backend/dist','start-claude-team.ps1','run-claude-queue.ps1','PO14 preparation artifacts'],evidence};
await save('implementation-receipt.json',receipt);
await writeFile(resolve(artifact,'handoff.md'),`# PO13 backend MNA completato\n\nWorktree: ${root}. Branch: ${session.branch}. Baseline: ${session.baseline}.\n\n`+
 `MNA versionata A–R: screening/completa, 14/16/30 punti, K a tre risposte e misure/date/provenienza manuale. Snapshot immutabile con dati G–R parziali, età/sesso, fonti e copyright. Hash MNA riproducibile dopo JSONB. PDF con equivalenti tipografici solo nei testi editoriali; dati liberi intatti e glifi non supportati segnalati esplicitamente.\n\n`+
 `${passed} test verdi in ${tests.results.length} file (${mnaTests} MNA e ${passed-mnaTests} regressioni), ${tests.migrations.length} migrazioni; PostgreSQL sintetico chiuso. Typecheck, compilazione backend con font, schema, diff e QA visiva di 9 PDF/31 pagine superati. Tentativi falliti conservati.\n\n`+
 `Manifest sorgenti: source-manifest.json, ${sourcePaths.length} file, SHA256 ${manifestSha}. Changed tree ${manifest.sourceTreeSha256}; input tree ${inputTreeSha256} (${inputs.length} input).\n\n`+
 `Claim sorgenti ed evidenze rilasciate. Root copia soltanto sourcePaths e artifactCopyAllowlist, applica 20260923070000_mna e completa la propria validazione HTTP/UI/pubblicazione. Non copiare cluster, runtime, dist, PowerShell o preparazione PO14. Nessun commit/push/deploy dal worker.\n`);
await save('artifact-manifest.json',{task:manifest.task,phase:receipt.phase,generatedAt:receipt.generatedAt,baseline:session.baseline,
 artifacts:await entries([...evidenceNames,'implementation-receipt.json','handoff.md'].map(name=>folder+'/'+name))});
console.log(JSON.stringify({completed:true,sourceFiles:sourcePaths.length,inputs:inputs.length,passed,mnaTests,pages:qa.totalPages,sourceManifestSha256:manifestSha,
 receiptSha256:sha(await readFile(resolve(artifact,'implementation-receipt.json'))),artifactManifestSha256:sha(await readFile(resolve(artifact,'artifact-manifest.json'))),artifacts:evidenceNames.length+2}));
