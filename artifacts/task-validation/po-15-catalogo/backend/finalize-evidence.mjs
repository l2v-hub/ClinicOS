import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, realpath } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, relative, isAbsolute } from 'node:path';
const root = await realpath(process.cwd());
const folder = 'artifacts/task-validation/po-15-catalogo/backend', artifact = resolve(root, folder);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async name => JSON.parse(await readFile(resolve(artifact, name), 'utf8'));
const save = (name, value) => writeFile(resolve(artifact, name), JSON.stringify(value, null, 2) + '\n');
const git = (...args) => execFileSync('git', args, { cwd: root, windowsHide: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const split = value => value.split(/\r?\n/).filter(Boolean);
const entries = async names => Promise.all([...new Set(names)].sort().map(async path => {
  assert(!path.includes('..') && !isAbsolute(path) && !path.includes('\\'));
  const bytes = await readFile(resolve(root, path));
  return { path, bytes: bytes.length, sha256: sha(bytes) };
}));
const tree = rows => sha(rows.map(row => `${row.path}\0${row.sha256}\n`).join(''));
const session = await json('implementation-session.json'), manifest = await json('source-manifest.json');
const manifestSha = sha(await readFile(resolve(artifact, 'source-manifest.json')));
assert.equal(manifestSha, 'a8c2d88aa2cdabe1c7ee46bce8895668ed26e8ca23039cdc3877a5b2701d48ca');
assert.equal(git('rev-parse', 'HEAD'), session.baseline);
assert.equal(git('branch', '--show-current'), session.branch);
assert.equal(session.baseline, 'f445260a4ca4de872c1361ff19fc215179b097fe');
const sourcePaths = await entries([...split(git('diff', 'HEAD', '--name-only', '--', 'backend/src', 'prisma')),
  ...split(git('ls-files', '--others', '--exclude-standard', '--', 'backend/src', 'prisma'))]);
assert.deepEqual(sourcePaths, manifest.sourcePaths);
assert.equal(sourcePaths.length, 10);
const inputs = await entries(split(git('ls-files', '--cached', '--others', '--exclude-standard', '--',
  'backend/src', 'prisma', 'backend/tsconfig.json', 'backend/package.json', 'package.json', 'package-lock.json', 'prisma.config.ts', 'tests/fixtures/po05-postgres.mjs')));
const inputTreeSha256 = tree(inputs);
assert.equal(inputs.length, 475);
assert.equal(inputTreeSha256, manifest.inputTreeSha256);
assert.equal(inputTreeSha256, '258be0f040d287114b82c8d11852a68838423de21509daa02c307b46dc92f1b2');
assert.equal(tree(sourcePaths), manifest.sourceTreeSha256);
assert.equal(manifest.sourceTreeSha256, '1c37cd6d5ee8445cf0b92967e3b1610f5ff2a59d8091a9e2643e3dc730324bd9');
for (const row of session.preserved) assert.equal(sha(await readFile(resolve(root, row.path))), row.sha256, row.path);
const preparation = await json('preparation-receipt.json');
assert.equal(sha(await readFile(resolve(artifact, 'preparation-receipt.json'))), session.preparationReceiptSha256);
for (const runtime of [preparation.runtime.privateWrapper, preparation.runtime.privateGeneratedClient]) {
  const target = await realpath(runtime.target), child = relative(root, target);
  assert(!child.startsWith('..') && !isAbsolute(child));
  for (const row of runtime.files) assert.equal(sha(await readFile(resolve(target, row.path))), row.sha256, row.path);
  assert.equal(tree(runtime.files), runtime.treeSha256);
}
for (const row of (await json('font-provenance.json')).files)
  assert.equal(sha(await readFile(resolve(root, row.path))), row.sha256, row.path);
const tests = await json('focused-tests.json'), testManifest = await json('test-source-manifest.json');
const focused = await json('catalog-focused-tests.json'), focusedManifest = await json('catalog-test-source-manifest.json');
const checks = await json('validation-checks.json');
for (const value of [tests.sourceTreeSha256, testManifest.treeSha256, checks.sourceTreeSha256, focused.sourceTreeSha256, focusedManifest.treeSha256]) assert.equal(value, inputTreeSha256);
for (const inputManifest of [testManifest, focusedManifest])
  assert.deepEqual(inputManifest.inputs, inputs.map(({ path, sha256 }) => ({ path, sha256 })));
assert(tests.databaseClosed && tests.sourceUnchanged && focused.databaseClosed && focused.sourceUnchanged && checks.sourceUnchanged);
assert.equal(tests.results.length, 24);
assert.equal(focused.results.length, 4);
const checkMigrations = async result => {
  assert.equal(result.migrations.length, 48);
  for (const row of result.migrations)
    assert.equal(sha(await readFile(resolve(root, 'prisma/migrations', row.name, 'migration.sql'))), row.sha256, row.name);
};
for (const result of [tests, focused]) {
  assert(result.results.every(row => row.exitCode === 0 && row.tests > 0));
  await checkMigrations(result);
}
assert.deepEqual(checks.results.map(row => row.name), ['typecheck', 'build', 'build-fonts', 'schema-validation', 'diff-check']);
assert(checks.results.every(row => row.exitCode === 0));
assert(checks.build.compiled && checks.build.fontsCopiedAndByteVerified && checks.schema.privateClientMatchesSource);
assert(!checks.schema.generationPerformed && !checks.schema.connectedToDatabase && !checks.runtime.sharedRuntimeWritten && !checks.dependencyManifestsChanged);
const checkLog = async (name, result, expectedFailures = 0) => {
  const log = await readFile(resolve(artifact, name), 'utf8');
  const counts = [...log.matchAll(/ℹ tests (\d+)/g)].map(row => Number(row[1]));
  const passed = [...log.matchAll(/ℹ pass (\d+)/g)].map(row => Number(row[1]));
  const failures = [...log.matchAll(/ℹ fail (\d+)/g)].map(row => Number(row[1]));
  assert.deepEqual(counts, result.results.map(row => row.tests));
  assert.equal(failures.length, result.results.length);
  assert.equal(failures.reduce((sum, value) => sum + value, 0), expectedFailures);
  for (const status of ['cancelled', 'skipped', 'todo']) {
    const values = [...log.matchAll(new RegExp(`ℹ ${status} (\\d+)`, 'g'))].map(row => Number(row[1]));
    assert.equal(values.length, result.results.length);
    assert(values.every(value => value === 0));
  }
  assert.equal(passed.reduce((sum, value) => sum + value, 0) + expectedFailures, counts.reduce((sum, value) => sum + value, 0));
  return passed.reduce((sum, count) => sum + count, 0);
};
const passed = await checkLog('focused-tests.log', tests);
assert.equal(passed, 74);
assert.equal(await checkLog('catalog-focused-tests.log', focused), 13);
const newTests = tests.results.filter(row => focused.results.some(test => test.file === row.file)).reduce((sum, row) => sum + row.tests, 0);
assert.equal(newTests, 13);
const initial = await json('initial-failed-focused-tests.json'), initialManifest = await json('initial-failed-test-source-manifest.json');
assert(initial.databaseClosed && initial.sourceUnchanged);
assert.equal(tree(initialManifest.inputs), initial.sourceTreeSha256);
assert.equal(initialManifest.treeSha256, initial.sourceTreeSha256);
assert.equal(await checkLog('initial-failed-focused-tests.log', initial, 2), 11);
await checkMigrations(initial);
const fixtureFailures = await json('initial-test-fixture-failures.json');
assert.equal(fixtureFailures.applicationSourceChangedForFixtureFailures, false);
const newPaths = split(git('ls-files', '--others', '--exclude-standard', '--', 'backend/src', 'prisma'));
const newSource = await Promise.all(newPaths.filter(path => /\.(ts|sql)$/.test(path)).map(async path => ({ path, lines: (await readFile(resolve(root, path), 'utf8')).trimEnd().split(/\r?\n/).length })));
assert.equal(newSource.length, 6);
assert(newSource.every(row => row.lines < 500));
const checksums = {};
for (const row of (await json('contract-provenance.json')).contracts) {
  assert.equal(sha(await readFile(resolve(artifact, row.snapshot))), row.sha256);
  checksums[row.snapshot] = row.sha256;
}
checksums['backend-contract.md'] = sha(await readFile(resolve(artifact, 'backend-contract.md')));
assert.equal(checksums['task-contract.snapshot.md'], session.rootContractSha256);
assert.equal(checksums['backend-contract.md'], session.dtoContractSha256);
const agreement = await json('frontend-agreement.json'), decisions = await json('root-decisions.json');
assert(agreement.agreed && agreement.byteReviewConfirmed && decisions.implementationGoReceived);
assert.equal(agreement.backendContractSha256, session.dtoContractSha256);
assert.equal(decisions.publicationAuthorizedToWorker, false);
const unsafe = [], scanScope = sourcePaths.filter(row => row.path.endsWith('.ts') && !row.path.includes('/__tests__/'));
for (const row of scanScope) {
  assert.equal(initialManifest.inputs.find(input => input.path === row.path)?.sha256, row.sha256);
  const content = await readFile(resolve(root, row.path), 'utf8');
  for (const [name, pattern] of Object.entries({ dynamicExecution: /\b(?:eval|Function)\s*\(/u, unsafeRawSql: /\$(?:queryRawUnsafe|executeRawUnsafe)\s*\(/u, externalFetch: /\bfetch\s*\(/u, privateKey: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u }))
    if (pattern.test(content)) unsafe.push({ path: row.path, pattern: name });
}
assert.deepEqual(unsafe, []);
const review = await json('independent-source-review.json');
assert.equal(review.sourceManifestSha256, manifestSha);
assert.equal(review.inputTreeSha256, inputTreeSha256);
assert.equal(review.openP1P2, 0);
const benchmark = await json('catalog-benchmark.json'), benchmarkRun = await json('catalog-benchmark-run.json');
const initialBenchmark = await json('initial-failed-catalog-benchmark-run.json');
assert.equal(sha(await readFile(resolve(artifact, 'benchmark-catalog.ts'))), sha(await readFile(resolve(artifact, 'benchmark-catalog.mts'))));
assert.equal(initialBenchmark.exitCode, 1);
assert(initialBenchmark.sourceUnchanged && initialBenchmark.databaseClosed);
assert.equal(initialBenchmark.sourceManifestSha256, manifestSha);
assert.equal(initialBenchmark.inputTreeSha256, inputTreeSha256);
await checkMigrations(initialBenchmark);
for (const value of [benchmark.sourceManifestSha256, benchmarkRun.sourceManifestSha256]) assert.equal(value, manifestSha);
for (const value of [benchmark.inputTreeSha256, benchmarkRun.inputTreeSha256]) assert.equal(value, inputTreeSha256);
assert.equal(benchmark.sourceTreeSha256, manifest.sourceTreeSha256);
assert(benchmarkRun.sourceUnchanged && benchmarkRun.databaseClosed && benchmarkRun.exitCode === 0);
await checkMigrations(benchmarkRun);
assert(benchmark.sameLatestFinalIds && benchmark.ownDraftCountExact);
assert.equal(benchmark.baselineSource.commit, session.baseline);
assert.deepEqual(benchmark.candidateSource, sourcePaths.filter(row => row.path.endsWith('/catalog.ts')));
for (const row of benchmark.baselineSource.unchangedExecutedFiles) {
  assert.equal(sha(await readFile(resolve(root, row.path))), row.executedBytesSha256);
  const baseline = execFileSync('git', ['show', `${session.baseline}:${row.path}`], { cwd: root, windowsHide: true });
  assert.equal(sha(baseline), row.baselineGitBytesSha256);
}
assert.equal(benchmark.workload.samples, 12);
assert.equal(benchmark.workload.warmups, 2);
assert(benchmark.workload.alternatingOrder && benchmark.environment.compiledBuildUsed === false);
assert.equal(benchmark.workload.patientAssessments, 255);
assert.equal(benchmark.workload.ownPainadDrafts, 250);
for (const sample of [benchmark.baseline, benchmark.candidate]) {
  assert.equal(sample.samplesMs.length, 12);
  assert(sample.samplesMs.every(value => Number.isFinite(value) && value > 0));
  const sorted = [...sample.samplesMs].sort((a, b) => a - b);
  assert.equal(sample.medianMs, (sorted[5] + sorted[6]) / 2);
  assert(Number.isInteger(sample.payloadBytes) && sample.payloadBytes > 0);
}
assert.equal(benchmark.payloadReductionPercent, (1 - benchmark.candidate.payloadBytes / benchmark.baseline.payloadBytes) * 100);
const benchmarkLog = JSON.parse((await readFile(resolve(artifact, 'catalog-benchmark.log'), 'utf8')).trim());
assert(benchmarkLog.benchmarkPassed);
assert.equal(benchmarkLog.baselineMedianMs, benchmark.baseline.medianMs);
assert.equal(benchmarkLog.candidateMedianMs, benchmark.candidate.medianMs);
assert.equal(benchmarkLog.inputTreeSha256, inputTreeSha256);
const execution = await json('execution-sessions.json');
assert.equal(execution.fullRegression.exitCode, 0);
assert.equal(execution.benchmark.exitCode, 0);
const regressionOutput = await json('regression-output-receipt.json');
assert.equal(regressionOutput.sourceTreeSha256, inputTreeSha256);
assert.equal(regressionOutput.pdfFiles, 11);
assert.equal(regressionOutput.snapshotFiles, 5);
assert(!regressionOutput.visuallyInspected && !regressionOutput.includedInHandoff);
for (const row of regressionOutput.files) assert.equal(sha(await readFile(resolve(artifact, row.path))), row.sha256);
for (const row of [regressionOutput.executedRunner, regressionOutput.reusableRunner])
  assert.equal(sha(await readFile(resolve(artifact, row.path))), row.sha256);
const toolPayload = wrapper => JSON.parse(wrapper.content.find(row => row.type === 'text').text);
const sourceRelease = toolPayload(await json('claims-source-release.json'));
assert(sourceRelease.success && sourceRelease.previousClaim.issueId === session.claim.issueId);
const evidenceClaim = toolPayload(await json('claims-evidence.json'));
assert(evidenceClaim.success && evidenceClaim.claim.issueId === 'PO-15-backend-evidence');
await save('source-safety-review.json', {
  sourceTreeSha256: inputTreeSha256, sourceManifestSha256: manifestSha, recordedAt: checks.completedAt,
  newSourceFiles: newSource, newSourceBelow500Lines: true,
  scopedStaticChecks: { patterns: ['dynamic execution', 'unsafe Prisma raw SQL call', 'external fetch', 'private key block'], findings: unsafe, scope: scanScope.map(row => row.path) },
  manualReview: [
    'Catalogo autorizzato dal patient scope e lock; query parametrizzata, cinque righe di soli metadati, nessun JSON clinico o dato PDF.',
    'Finali terminali ordinati per data clinica/creazione/id; bozze solo autore corrente, conteggio esatto prima del limite e coerenza count/null.',
    'NRS Cartella protetto sotto lock in PUT e import: omissione preservata, uguaglianza JSON profonda, presenza/null/array vuoto distinti.',
    'Import valida prima entrambi gli storici e li rimuove dal merge: niente duplicazione; eccezione Tinetti assente+[] mantenuta solo per Tinetti.',
    'Dolore ingresso conservato come JSON originale da sole bozze confermate del paziente autorizzato; proiezione terapie esclude dolore prima della materializzazione.',
    'Precheck massimo 100 bozze e 2097152 byte aggregati prima della SELECT dolore; overflow locale HTTP200 conserva terapie e documenti.',
    'RepeatableRead preserva lo snapshot del budget anche con riconciliazione storica confirmJob concorrente; caso reale coperto dal test di regressione.'
  ],
  independentReview: review,
  limitations: ['La scansione statica circoscritta e i test di autorizzazione non sono una scansione CVE delle dipendenze né una validazione clinica.']
});
const evidenceNames = [...new Set([
  ...preparation.artifactCopyAllowlist.filter(name => name !== 'artifact-manifest.json'),
  'source-manifest.json', 'implementation-session.json', 'claims-implementation.json', 'claims-source-release.json', 'claims-evidence.json', 'claims-evidence-release.json',
  'focused-tests.json', 'focused-tests.log', 'test-source-manifest.json', 'catalog-focused-tests.json', 'catalog-focused-tests.log', 'catalog-test-source-manifest.json',
  'initial-failed-focused-tests.json', 'initial-failed-focused-tests.log', 'initial-failed-test-source-manifest.json', 'initial-test-fixture-failures.json',
  'typecheck.log', 'build.log', 'build-fonts.log', 'schema-validation.log', 'diff-check.log', 'validation-checks.json', 'font-provenance.json',
  'source-safety-review.json', 'independent-source-review.json', 'execution-sessions.json',
  'run-focused-tests.mjs', 'run-focused-tests.executed.mjs', 'relocate-regression-output.mjs', 'regression-output-receipt.json',
  'run-validation.mjs', 'freeze-source.mjs', 'benchmark-catalog.ts', 'benchmark-catalog.mts', 'run-catalog-benchmark.mjs',
  'run-catalog-benchmark.initial.mjs', 'initial-failed-catalog-benchmark-run.json', 'initial-failed-catalog-benchmark.log',
  'catalog-benchmark.json', 'catalog-benchmark-run.json', 'catalog-benchmark.log', 'finalize-evidence.mjs'
])].sort();
assert(evidenceNames.every(name => !/(postgres-|private-schema|node_modules|pdf-qa|po-14|\.ps1$)/u.test(name)));
await entries(evidenceNames.filter(name => name !== 'claims-evidence-release.json').map(name => folder + '/' + name));
let evidenceRelease;
try { evidenceRelease = toolPayload(await json('claims-evidence-release.json')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!evidenceRelease) {
  console.log(JSON.stringify({ preflightPassed: true, sourceFiles: sourcePaths.length, inputs: inputs.length, passed, newTests, awaitingEvidenceClaimRelease: true }));
  process.exit(0);
}
assert(evidenceRelease.success && evidenceRelease.previousClaim.issueId === 'PO-15-backend-evidence');
const evidence = await entries(evidenceNames.map(name => folder + '/' + name));
const receipt = {
  task: manifest.task, phase: 'implementation-complete-worker-handoff', generatedAt: new Date().toISOString(), worktree: root, branch: session.branch, baseline: session.baseline,
  decision: 'Consegna consentita delle sole sorgenti e prove elencate a root per integrazione e decisione indipendente di rilascio.',
  authorization: 'GO esplicito root dopo pubblicazione PO14 verificata; claim di implementazione ed evidenze rilasciate. Nessuna autorità di pubblicazione al worker.',
  sourceManifestSha256: manifestSha, sourceTreeSha256: manifest.sourceTreeSha256, inputTreeSha256, sourceFrozen: true, sourceFiles: sourcePaths.length, sourceInputs: inputs.length, contracts: checksums,
  tests: { passed, failed: 0, newCatalogNrsTests: newTests, regressionTests: passed - newTests, files: tests.results.length, results: tests.results,
    execution, database: tests.database, databaseClosed: tests.databaseClosed, migrationsApplied: tests.migrations.length, newMigrations: 0,
    sourceUnchangedBeforeAfterAndHandoff: true, priorAttempts: fixtureFailures },
  validation: checks,
  regressionOutput: { receipt: 'regression-output-receipt.json', pdfFiles: 11, snapshotFiles: 5, visuallyInspected: false, includedInHandoff: false, exportPathCorrectionOnly: true },
  benchmark: { ...benchmark, databaseClosed: benchmarkRun.databaseClosed, runner: 'catalog-benchmark-run.json', sourceBuildBinding: 'Benchmark executes TypeScript inputs whose exact tree also passed compiled backend build; compiled build is not benchmarked.',
    initialAttempt: 'Initial .ts artifact under the root CommonJS package failed before workload execution because top-level await requires ESM; byte-identical .mts entry point fixes the format. Original script, runner, log and closed-database run receipt preserved; application source unchanged.' },
  invariants: [
    'Cinque moduli in ordine fisso: painad, postural_transfers, tinetti, mna, gds15; catalogo di soli metadati senza parametri query.',
    'Storico NRS in sola lettura con 409 nrs_legacy_read_only per modifica/introduzione; NRS vitali e data.parametri invariati.',
    'Conferma import conserva NRS e Tinetti senza concatenare array; non promuove dolore ingresso a valutazione clinica.',
    'legacyPainDrafts/legacyPainError formano la coppia concordata; overflow locale mantiene HTTP200 e dati delle terapie.',
    'Budget storico valutato in snapshot RepeatableRead, senza troncamenti o mutazioni del JSON originale.'
  ],
  limitations: [
    'Root completa HTTP/browser e decide la pubblicazione autorizzata separatamente; questa ricevuta non autorizza il rilascio.',
    'Revisione indipendente sorgenti conclusa senza P1/P2; binding finale degli artefatti ancora da confermare dal reviewer.',
    'Confronto prestazionale sintetico a livello service, senza latenza HTTP o produzione; baseline cinque current completi, candidato catalogo di metadati.',
    'I test PDF esistenti hanno esportato 11 PDF e 5 snapshot sintetici; output preservati in regression-output, esclusi dalla consegna e non ispezionati visivamente. Renderer/font invariati.',
    'Nessun nuovo modello Prisma, migrazione o dipendenza; nessuna rigenerazione del runtime condiviso o modifica ai manifest.',
    'Nessun commit, push, deploy, scrittura su pazienti online, validazione clinica o dichiarazione di scansione CVE dal worker.'
  ],
  artifactCopyAllowlist: [...evidenceNames, 'implementation-receipt.json', 'handoff.md', 'artifact-manifest.json'],
  doNotCopy: ['postgres-* directories', 'regression-output directory', 'private-schema.prisma', 'backend/node_modules', 'root node_modules junction', 'backend/dist', 'start-claude-team.ps1', 'run-claude-queue.ps1', 'other PO artifacts'], evidence
};
await save('implementation-receipt.json', receipt);
await writeFile(resolve(artifact, 'handoff.md'), `# PO15 backend Catalogo Moduli + NRS storico completato\n\nWorktree: ${root}. Branch: ${session.branch}. Baseline: ${session.baseline}.\n\n` +
  `Catalogo dei cinque moduli di soli metadati, finali terminali e bozze proprie con conteggio esatto. Storico NRS protetto in PUT/import. Dolore ingresso restituito intatto in sola lettura con limite 100 bozze/2 MiB e overflow locale che preserva terapie e documenti.\n\n` +
  `${passed} test verdi in ${tests.results.length} file (${newTests} nuovi e ${passed - newTests} regressioni), ${tests.migrations.length} migrazioni esistenti; PostgreSQL sintetico chiuso. Typecheck, build con font, schema e diff superati. Due aspettative/fixture iniziali corrette nei test; applicazione invariata per tali correzioni.\n\n` +
  `Benchmark sintetico: cinque currentAssessment completi ${benchmark.baseline.payloadBytes} byte, mediana ${benchmark.baseline.medianMs.toFixed(2)} ms; catalogo ${benchmark.candidate.payloadBytes} byte, mediana ${benchmark.candidate.medianMs.toFixed(2)} ms. Stessi finali e conteggio 250 bozze; 12 campioni alternati dopo 2 warmup. Nessuna affermazione di latenza HTTP/produzione.\n\n` +
  `Manifest sorgenti: source-manifest.json, ${sourcePaths.length} file, SHA256 ${manifestSha}. Changed tree ${manifest.sourceTreeSha256}; input tree ${inputTreeSha256} (${inputs.length} input).\n\n` +
  `Claim sorgenti ed evidenze rilasciate. Root copia solo sourcePaths e artifactCopyAllowlist, completa HTTP/UI e decide la pubblicazione. Revisione sorgenti indipendente senza P1/P2; binding finale artefatti da confermare. P2 budget/lettura risolto con RepeatableRead e test reale confirmJob concorrente.\n\n` +
  `Renderer/font invariati. Gli 11 PDF e 5 snapshot esportati dai test esistenti sono preservati in regression-output; nessuna nuova QA visiva attribuita. Il runner eseguito è conservato e il runner riutilizzabile corregge solo la directory di export. Non copiare regression-output, cluster, runtime, dist, PowerShell o artefatti di altre PO. Nessuna nuova migrazione/dipendenza o commit/push/deploy dal worker.\n`);
await save('artifact-manifest.json', { task: manifest.task, phase: receipt.phase, generatedAt: receipt.generatedAt, baseline: session.baseline,
  artifacts: await entries([...evidenceNames, 'implementation-receipt.json', 'handoff.md'].map(name => folder + '/' + name)) });
console.log(JSON.stringify({ completed: true, sourceFiles: sourcePaths.length, inputs: inputs.length, passed, newTests, sourceManifestSha256: manifestSha,
  receiptSha256: sha(await readFile(resolve(artifact, 'implementation-receipt.json'))), artifactManifestSha256: sha(await readFile(resolve(artifact, 'artifact-manifest.json'))), artifacts: evidenceNames.length + 2 }));
