import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, realpath } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, relative, isAbsolute } from 'node:path';
const root = await realpath(process.cwd());
const folder = 'artifacts/task-validation/po-14-gds/backend', artifact = resolve(root, folder);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async name => JSON.parse(await readFile(resolve(artifact, name), 'utf8'));
const save = (name, value) => writeFile(resolve(artifact, name), JSON.stringify(value, null, 2) + '\n');
const git = (...args) => execFileSync('git', args, { cwd: root, windowsHide: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const split = text => text.split(/\r?\n/).filter(Boolean);
const entries = async names => Promise.all([...new Set(names)].sort().map(async path => {
  assert(!path.includes('..') && !isAbsolute(path) && !path.includes('\\'));
  const bytes = await readFile(resolve(root, path));
  return { path, bytes: bytes.length, sha256: sha(bytes) };
}));
const tree = rows => sha(rows.map(row => `${row.path}\0${row.sha256}\n`).join(''));
const session = await json('implementation-session.json'), manifest = await json('source-manifest.json');
const manifestSha = sha(await readFile(resolve(artifact, 'source-manifest.json')));
assert.equal(manifestSha, '762722736d8c5168fab01cac3db71fdf2ce0431862067cc1b9e789ebcf67a52c');
assert.equal(git('rev-parse', 'HEAD'), session.baseline);
assert.equal(git('branch', '--show-current'), session.branch);
const sourcePaths = await entries([...split(git('diff', 'HEAD', '--name-only', '--', 'backend/src', 'prisma')),
  ...split(git('ls-files', '--others', '--exclude-standard', '--', 'backend/src', 'prisma'))]);
assert.deepEqual(sourcePaths, manifest.sourcePaths);
assert.equal(sourcePaths.length, 18);
const inputs = await entries(split(git('ls-files', '--cached', '--others', '--exclude-standard', '--',
  'backend/src', 'prisma', 'backend/tsconfig.json', 'backend/package.json', 'package.json', 'package-lock.json', 'prisma.config.ts', 'tests/fixtures/po05-postgres.mjs')));
const inputTreeSha256 = tree(inputs);
assert.equal(inputs.length, 469);
assert.equal(inputTreeSha256, manifest.inputTreeSha256);
assert.equal(inputTreeSha256, 'f9bfae118e478c02bfcc4a30d6d150d27cd2c288557f6a108a0250758e97605c');
assert.equal(tree(sourcePaths), manifest.sourceTreeSha256);
assert.equal(manifest.sourceTreeSha256, 'bd7147bcd68f005f75dae888f155454f3e94cc5d6e3527ac49798d1bf1cc89db');
for (const row of session.preserved) assert.equal(sha(await readFile(resolve(root, row.path))), row.sha256, row.path);
const preparation = await json('preparation-receipt.json');
for (const runtime of [preparation.runtime.privateWrapper, preparation.runtime.privateGeneratedClient]) {
  const target = await realpath(runtime.target), child = relative(root, target);
  assert(!child.startsWith('..') && !isAbsolute(child));
  for (const row of runtime.files) assert.equal(sha(await readFile(resolve(target, row.path))), row.sha256, row.path);
}
for (const row of (await json('font-provenance.json')).files)
  assert.equal(sha(await readFile(resolve(root, row.path))), row.sha256, row.path);
const tests = await json('focused-tests.json'), testManifest = await json('test-source-manifest.json'), checks = await json('validation-checks.json');
const focused = await json('gds15-focused-tests.json'), focusedManifest = await json('gds15-test-source-manifest.json');
for (const value of [tests.sourceTreeSha256, testManifest.treeSha256, checks.sourceTreeSha256, focused.sourceTreeSha256, focusedManifest.treeSha256]) assert.equal(value, inputTreeSha256);
for (const inputManifest of [testManifest, focusedManifest])
  assert.deepEqual(inputManifest.inputs, inputs.map(({ path, sha256 }) => ({ path, sha256 })));
assert(tests.databaseClosed && tests.sourceUnchanged && focused.databaseClosed && focused.sourceUnchanged && checks.sourceUnchanged);
assert.equal(tests.results.length, 20);
assert.equal(tests.migrations.length, 48);
assert.equal(focused.results.length, 4);
assert.equal(focused.migrations.length, 48);
for (const result of [tests, focused]) {
  assert(result.results.every(row => row.exitCode === 0 && row.tests > 0));
  for (const row of result.migrations)
    assert.equal(sha(await readFile(resolve(root, 'prisma/migrations', row.name, 'migration.sql'))), row.sha256, row.name);
}
assert.deepEqual(checks.results.map(row => row.name), ['typecheck', 'build', 'build-fonts', 'schema-validation', 'diff-check']);
assert(checks.results.every(row => row.exitCode === 0));
assert(checks.build.compiled && checks.build.fontsCopiedAndByteVerified && checks.schema.privateClientMatchesSource);
assert(!checks.schema.generationPerformed && !checks.schema.connectedToDatabase && !checks.runtime.sharedRuntimeWritten && !checks.dependencyManifestsChanged);
const checkLog = async (name, result) => {
  const log = await readFile(resolve(artifact, name), 'utf8');
  const counts = [...log.matchAll(/ℹ tests (\d+)/g)].map(row => Number(row[1]));
  const failures = [...log.matchAll(/ℹ fail (\d+)/g)].map(row => Number(row[1]));
  assert.deepEqual(counts, result.results.map(row => row.tests));
  assert.equal(failures.length, result.results.length);
  assert(failures.every(value => value === 0));
  return counts.reduce((sum, count) => sum + count, 0);
};
const passed = await checkLog('focused-tests.log', tests);
assert.equal(passed, 61);
assert.equal(await checkLog('gds15-focused-tests.log', focused), 9);
const gdsTests = tests.results.filter(row => /\/gds15[^/]*\.test\.ts$/.test(row.file)).reduce((sum, row) => sum + row.tests, 0);
assert.equal(gdsTests, 9);
const newPaths = split(git('ls-files', '--others', '--exclude-standard', '--', 'backend/src', 'prisma'));
const newSource = await Promise.all(newPaths.filter(path => /\.(ts|sql)$/.test(path)).map(async path => ({ path, lines: (await readFile(resolve(root, path), 'utf8')).trimEnd().split(/\r?\n/).length })));
assert(newSource.every(row => row.lines < 500));
const checksums = {};
for (const name of ['task-contract.snapshot.md', 'backend-contract.md', 'definition-contract.json', 'pdf-typography.md'])
  checksums[name] = sha(await readFile(resolve(artifact, name)));
assert.equal(checksums['task-contract.snapshot.md'], session.rootContractSha256);
assert.equal(checksums['backend-contract.md'], session.dtoContractSha256);
assert.equal(checksums['definition-contract.json'], 'f48082ea66e05298437fa771fb9274a785ca75f5169e9a7b6b8f261b63cdf2d7');
const provenance = await json('source-provenance.json');
assert.equal(sha(await readFile(resolve(artifact, 'source-gds.txt'))), provenance.verifiedSourceText.sha256);
assert.equal(provenance.sourcePdfSha256, 'f2d4494b49d96de08eceed69b1d793c45260f22aca7d62f98080ccee6133d709');
const unsafe = [], scanScope = sourcePaths.filter(row => row.path.endsWith('.ts') && !row.path.includes('/__tests__/'));
for (const row of scanScope) {
  const content = await readFile(resolve(root, row.path), 'utf8');
  for (const [name, pattern] of Object.entries({ dynamicExecution: /\b(?:eval|Function)\s*\(/u, unsafeRawSql: /\$(?:queryRawUnsafe|executeRawUnsafe)\s*\(/u, externalFetch: /\bfetch\s*\(/u, privateKey: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u }))
    if (pattern.test(content)) unsafe.push({ path: row.path, pattern: name });
}
assert.deepEqual(unsafe, []);
const qa = await json('pdf-qa/visual-qa.json');
assert.equal(qa.sourceTreeSha256, inputTreeSha256);
assert(qa.allPagesInspected && qa.noClippingOrOverlap && qa.totalPages === 39 && qa.files.length === 66 && qa.pages.length === 11);
for (const row of qa.files) {
  const bytes = await readFile(resolve(artifact, 'pdf-qa', row.path));
  assert.equal(bytes.length, row.bytes, row.path);
  assert.equal(sha(bytes), row.sha256, row.path);
}
const toolPayload = wrapper => JSON.parse(wrapper.content.find(row => row.type === 'text').text);
const sourceRelease = toolPayload(await json('claims-source-release.json'));
assert(sourceRelease.success && sourceRelease.previousClaim.issueId === session.claim.issueId);
const evidenceClaim = toolPayload(await json('claims-evidence.json'));
assert(evidenceClaim.success && evidenceClaim.claim.issueId === 'PO-14-backend-evidence');
await save('source-safety-review.json', {
  sourceTreeSha256: inputTreeSha256, sourceManifestSha256: manifestSha, recordedAt: checks.completedAt,
  newSourceFiles: newSource, newSourceBelow500Lines: true,
  scopedStaticChecks: { patterns: ['dynamic execution', 'unsafe Prisma raw SQL call', 'external fetch', 'private key block'], findings: unsafe, scope: scanScope.map(row => row.path) },
  manualReview: [
    'Parser GDS15 stretto: quindici boolean/null obbligatori, nessuna coercizione, note fino a 4000 codepoint e controllo dei caratteri vietati.',
    'Risultato solo con quindici risposte complete; tutte le 32768 combinazioni confrontate con scoring indipendente, incluse inversioni e soglie.',
    'Scope, lock, CAS, replay, current, rettifica e finalizzazione usano il ciclo di vita comune; i test verificano rifiuti e concorrenza.',
    'Snapshot GDS15 con hash canonico indipendente dall’ordine delle chiavi JSONB, senza modificare le funzioni hash dei tipi pubblicati.',
    'Vincoli SQL verificano domini, ordine delle quindici voci, risposte, punteggi, descrizioni, totale, fascia, note e fonte dello snapshot.',
    'Renderer usa testi congelati; dati liberi intatti e glifi non supportati falliscono esplicitamente senza archiviare PDF alterati.'
  ],
  independentReview: { reviewer: '/root/clinical_forms_source_audit', sourceBindingConfirmed: true, openP1P2: 0, artifactReviewPending: true },
  limitations: ['La scansione statica circoscritta e i test di autorizzazione non sono una scansione CVE delle dipendenze né una validazione clinica.']
});
const evidenceNames = [...new Set([
  ...preparation.artifactCopyAllowlist.filter(name => name !== 'artifact-manifest.json'),
  'source-manifest.json', 'implementation-session.json', 'claims-implementation.json', 'claims-source-release.json', 'claims-evidence.json', 'claims-evidence-release.json',
  'pdf-typography.md', 'focused-tests.json', 'focused-tests.log', 'test-source-manifest.json', 'gds15-focused-tests.json', 'gds15-focused-tests.log', 'gds15-test-source-manifest.json',
  'typecheck.log', 'build.log', 'build-fonts.log', 'schema-validation.log', 'diff-check.log', 'validation-checks.json', 'font-provenance.json', 'source-safety-review.json',
  'start-implementation.mjs', 'extend-sql-constraints.mjs', 'run-focused-tests.mjs', 'run-validation.mjs', 'freeze-source.mjs', 'render-pdf-qa.mjs', 'verify-visual-qa.mjs', 'finalize-evidence.mjs',
  'pdf-qa/rendered-pages.json', 'pdf-qa/visual-qa.json', ...qa.files.map(row => 'pdf-qa/' + row.path)
])].sort();
assert(evidenceNames.every(name => !/(postgres-|private-schema|node_modules|po-15|\.ps1$)/u.test(name)));
await entries(evidenceNames.filter(name => name !== 'claims-evidence-release.json').map(name => folder + '/' + name));
let evidenceRelease;
try { evidenceRelease = toolPayload(await json('claims-evidence-release.json')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!evidenceRelease) {
  console.log(JSON.stringify({ preflightPassed: true, sourceFiles: sourcePaths.length, inputs: inputs.length, passed, gdsTests, pages: qa.totalPages, awaitingEvidenceClaimRelease: true }));
  process.exit(0);
}
assert(evidenceRelease.success && evidenceRelease.previousClaim.issueId === 'PO-14-backend-evidence');
const evidence = await entries(evidenceNames.map(name => folder + '/' + name));
const receipt = {
  task: manifest.task, phase: 'implementation-complete-worker-handoff', generatedAt: new Date().toISOString(), worktree: root, branch: session.branch, baseline: session.baseline,
  decision: 'Consegna consentita delle sole sorgenti e prove elencate a root per integrazione e decisione indipendente di rilascio.',
  authorization: 'GO esplicito root dopo pubblicazione PO13 verificata; claim di implementazione ed evidenze rilasciate. Nessuna autorità di pubblicazione al worker.',
  sourceManifestSha256: manifestSha, sourceTreeSha256: manifest.sourceTreeSha256, inputTreeSha256, sourceFrozen: true, sourceFiles: sourcePaths.length, sourceInputs: inputs.length, contracts: checksums,
  tests: { passed, failed: 0, newGds15Tests: gdsTests, regressionTests: passed - gdsTests, files: tests.results.length, results: tests.results,
    finalRunnerSession: 55277, finalRunnerExitCode: 0, finalRunnerCompletionChunk: '53029d', focusedRunnerSession: 13907, focusedRunnerCompletionChunk: 'a4fc17',
    database: tests.database, databaseClosed: tests.databaseClosed, migrationsApplied: tests.migrations.length, sourceUnchangedBeforeAfterAndHandoff: true,
    priorAttempts: 'Dominio 3/3, GDS mirati 9/9 e run finale 61/61 superati. Nessun tentativo applicativo fallito. Diagnostico iniziale di preparazione percorsi conservato; avvenuto prima di runtime/sessione/sorgenti.' },
  validation: checks, pdfQa: { files: 11, pages: 39, allPagesInspected: true, receipt: 'pdf-qa/visual-qa.json', typographyDecision: 'pdf-typography.md', renderSession: 79702, renderCompletionChunk: '778589', verifierCompletionChunk: '89dab4' },
  invariants: [
    'GDS15 conserva le quindici risposte bool/null, istruzione riferita all’ultima settimana e scoring fonte; nessun risultato parziale né risposta dedotta.',
    'NO vale 1 per q1/q5/q7/q11/q13, Sì per le altre; soglie 0–5/6–9/10–15 come interpretazione dello screening.',
    'Snapshot immutabile contiene tutte le voci, note, limiti dello screening, fonte e riferimento; hash canonico limitato a GDS15.',
    'Migrazione SQL estende solo i rami necessari e verifica lo snapshot finale; i tipi precedenti e il vincolo date MNA conservano il comportamento.',
    'Errori PDF preservano il dato clinico finalizzato; glifi non supportati non vengono sostituiti o eliminati silenziosamente.'
  ],
  limitations: [
    'Root completa HTTP/browser e decide la pubblicazione autorizzata separatamente; questa ricevuta non autorizza il rilascio.',
    'I font Noto condivisi non coprono tutto Unicode: assessment_pdf_unsupported_glyph esplicito per testo libero non rappresentabile, dato originale intatto.',
    'Revisione indipendente sorgenti conclusa senza P1/P2; binding finale degli artefatti ancora da confermare dal reviewer.',
    'Nessun nuovo modello Prisma o dipendenza; nessuna rigenerazione del runtime condiviso o modifica ai manifest delle dipendenze.',
    'Nessun commit, push, deploy, scrittura su pazienti online, validazione clinica, benchmark prestazionale o dichiarazione di scansione CVE dal worker.',
    'Nessuna implementazione applicativa PO15 inclusa.'
  ],
  artifactCopyAllowlist: [...evidenceNames, 'implementation-receipt.json', 'handoff.md', 'artifact-manifest.json'],
  doNotCopy: ['postgres-* directories', 'private-schema.prisma', 'backend/node_modules', 'root node_modules junction', 'backend/dist', 'start-claude-team.ps1', 'run-claude-queue.ps1', 'PO15 artifacts'], evidence
};
await save('implementation-receipt.json', receipt);
await writeFile(resolve(artifact, 'handoff.md'), `# PO14 backend GDS-15 completato\n\nWorktree: ${root}. Branch: ${session.branch}. Baseline: ${session.baseline}.\n\n` +
  `GDS-15 versionata con quindici risposte, note, scoring fonte e fasce di screening. Snapshot immutabile con istruzione, avvertenza, fonte, bibliografia e hash canonico dedicato. Ciclo di vita comune, validazione SQL e PDF; nessuna modifica ai digest pubblicati.\n\n` +
  `${passed} test verdi in ${tests.results.length} file (${gdsTests} GDS e ${passed - gdsTests} regressioni), ${tests.migrations.length} migrazioni; PostgreSQL sintetico chiuso. Typecheck, build con font, schema, diff e QA visiva di 11 PDF/39 pagine superati. Nessun test applicativo fallito.\n\n` +
  `Manifest sorgenti: source-manifest.json, ${sourcePaths.length} file, SHA256 ${manifestSha}. Changed tree ${manifest.sourceTreeSha256}; input tree ${inputTreeSha256} (${inputs.length} input).\n\n` +
  `Claim sorgenti ed evidenze rilasciate. Root copia solo sourcePaths e artifactCopyAllowlist, applica 20260923080000_gds15 e completa HTTP/UI e pubblicazione. Revisione sorgenti indipendente senza P1/P2; binding finale artefatti da confermare.\n\n` +
  `I font esistenti non coprono ogni glifo Unicode: errore PDF esplicito, dato finalizzato e hash conservati, nessuna traslitterazione silenziosa. Non copiare cluster, runtime, dist, PowerShell o PO15. Nessun commit/push/deploy dal worker.\n`);
await save('artifact-manifest.json', { task: manifest.task, phase: receipt.phase, generatedAt: receipt.generatedAt, baseline: session.baseline,
  artifacts: await entries([...evidenceNames, 'implementation-receipt.json', 'handoff.md'].map(name => folder + '/' + name)) });
console.log(JSON.stringify({ completed: true, sourceFiles: sourcePaths.length, inputs: inputs.length, passed, gdsTests, pages: qa.totalPages, sourceManifestSha256: manifestSha,
  receiptSha256: sha(await readFile(resolve(artifact, 'implementation-receipt.json'))), artifactManifestSha256: sha(await readFile(resolve(artifact, 'artifact-manifest.json'))), artifacts: evidenceNames.length + 2 }));
