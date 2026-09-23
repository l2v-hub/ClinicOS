import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, realpath, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, relative, isAbsolute } from 'node:path';
const root = await realpath(process.cwd());
const folder = 'artifacts/task-validation/po-16-giro/backend', artifact = resolve(root, folder);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async name => JSON.parse(await readFile(resolve(artifact, name), 'utf8'));
const save = (name, value) => writeFile(resolve(artifact, name), JSON.stringify(value, null, 2) + '\n');
const hash = async name => sha(await readFile(resolve(artifact, name)));
const git = (...args) => execFileSync('git', args, { cwd: root, windowsHide: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const split = value => value.split(/\r?\n/).filter(Boolean);
const entries = async names => Promise.all([...new Set(names)].sort().map(async path => {
  assert(!path.includes('..') && !isAbsolute(path) && !path.includes('\\'));
  const bytes = await readFile(resolve(root, path));
  return { path, bytes: bytes.length, sha256: sha(bytes) };
}));
const tree = rows => sha(rows.map(row => `${row.path}\0${row.sha256}\n`).join(''));
const verifyRows = async (base, rows) => {
  for (const row of rows) {
    const bytes = await readFile(resolve(base, row.path));
    assert.equal(sha(bytes), row.sha256, row.path);
    if (row.bytes !== undefined) assert.equal(bytes.length, row.bytes, row.path);
  }
};
const session = await json('implementation-session.json'), manifest = await json('source-manifest.json');
const manifestSha = await hash('source-manifest.json');
assert.equal(manifestSha, '633af929a87194280f2e79e9cb10f2cc6b44f9baad2593ad38da7e25ea8d14e5');
assert.equal(git('rev-parse', 'HEAD'), session.baseline);
assert.equal(git('branch', '--show-current'), session.branch);
assert.equal(session.baseline, '53e57d694850775b85ad1d22904e7bb1e6e84618');
const scope = ['backend/src', 'prisma', 'src', 'frontend/src', 'scripts', 'tests/fixtures', 'backend/tsconfig.json', 'backend/package.json', 'package.json', 'package-lock.json', 'prisma.config.ts'];
const inputs = await entries(split(git('ls-files', '--cached', '--others', '--exclude-standard', '--', ...scope)));
const inputTreeSha256 = tree(inputs);
assert.equal(inputs.length, 1104);
assert.equal(inputTreeSha256, manifest.inputTreeSha256);
assert.equal(inputTreeSha256, '66e3ef8b667d50d8668c8e27b597a46ba4430b7505fca64de8de3d1f196417c7');
const sourcePaths = await entries([...split(git('diff', 'HEAD', '--name-only', '--', ...scope)), ...split(git('ls-files', '--others', '--exclude-standard', '--', ...scope))]);
assert.deepEqual(sourcePaths, manifest.sourcePaths);
assert.equal(sourcePaths.length, 4);
assert.equal(tree(sourcePaths), manifest.sourceTreeSha256);
assert.equal(manifest.sourceTreeSha256, 'b88e834e03dd050bfdfbd3a281584a1164c41edeca24b3f3e80750d99d829fbf');
await verifyRows(root, session.preserved);
const preparation = await json('preparation-receipt.json');
assert.equal(await hash('preparation-receipt.json'), session.preparationReceiptSha256);
for (const runtime of [preparation.runtime.privateWrapper, preparation.runtime.privateGeneratedClient]) {
  const target = await realpath(runtime.target), child = relative(root, target);
  assert(!child.startsWith('..') && !isAbsolute(child));
  await verifyRows(target, runtime.files);
  assert.equal(tree(runtime.files), runtime.treeSha256);
}
const prior = await json('pre-utc-focused-tests.json'), current = await json('cwd-focused-tests.json');
const priorManifest = await json('pre-utc-test-source-manifest.json'), currentManifest = await json('cwd-test-source-manifest.json');
const consolidated = await json('consolidated-tests.json'), checks = await json('validation-checks.json');
assert.equal(tree(priorManifest.inputs), priorManifest.treeSha256);
assert.equal(prior.sourceTreeSha256, priorManifest.treeSha256);
assert.equal(priorManifest.treeSha256, '34ac83ce2c560505a290cf93785dc0bbf89ede2c7077892aba743907e2ad0613');
assert.equal(current.sourceTreeSha256, inputTreeSha256);
assert.equal(currentManifest.treeSha256, inputTreeSha256);
assert.deepEqual(currentManifest.inputs, inputs.map(({ path, sha256 }) => ({ path, sha256 })));
assert.equal(priorManifest.inputs.length, inputs.length);
const changedTest = 'backend/src/assessments/__tests__/mna-presentation-db.test.ts';
const changedBetweenRuns = currentManifest.inputs.filter(row => priorManifest.inputs.find(old => old.path === row.path)?.sha256 !== row.sha256);
assert.deepEqual(changedBetweenRuns.map(row => row.path), [changedTest]);
assert.equal(await hash('focused-tests.json'), await hash('pre-utc-focused-tests.json'));
assert.equal(await hash('focused-tests.log'), await hash('pre-utc-focused-tests.log'));
assert.equal(await hash('test-source-manifest.json'), await hash('pre-utc-test-source-manifest.json'));
const checkMigrations = async result => {
  assert.equal(result.migrations.length, 48);
  for (const row of result.migrations)
    assert.equal(sha(await readFile(resolve(root, 'prisma/migrations', row.name, 'migration.sql'))), row.sha256);
};
const checkLog = async (name, result, expectedFailures = 0) => {
  const log = await readFile(resolve(artifact, name), 'utf8');
  const values = label => [...log.matchAll(new RegExp(`ℹ ${label} (\\d+)`, 'g'))].map(row => Number(row[1]));
  const counts = values('tests'), passed = values('pass'), failed = values('fail');
  assert.deepEqual(counts, result.results.map(row => row.tests));
  assert.equal(failed.length, result.results.length);
  assert.equal(failed.reduce((a, b) => a + b, 0), expectedFailures);
  for (const label of ['cancelled', 'skipped', 'todo']) {
    assert.equal(values(label).length, result.results.length);
    assert(values(label).every(value => value === 0));
  }
  const count = passed.reduce((a, b) => a + b, 0);
  assert.equal(count + expectedFailures, counts.reduce((a, b) => a + b, 0));
  return count;
};
for (const result of [prior, current]) {
  assert(result.databaseClosed && result.sourceUnchanged && result.results.every(row => row.exitCode === 0));
  await checkMigrations(result);
}
assert.equal(await checkLog('pre-utc-focused-tests.log', prior), 15);
assert.equal(await checkLog('cwd-focused-tests.log', current), 3);
assert.equal(current.results.length, 1);
assert.equal(current.results[0].file, changedTest);
assert.equal(await realpath(current.results[0].childWorkingDirectory), await realpath(resolve(root, 'backend')));
const retained = prior.results.filter(row => row.file !== changedTest);
assert.equal(retained.reduce((n, row) => n + row.tests, 0), 12);
assert.equal(consolidated.passed, 15); assert.equal(consolidated.failed, 0); assert.equal(consolidated.files, 5);
assert.equal(consolidated.currentInputTreeSha256, inputTreeSha256);
assert.equal(consolidated.priorInputTreeSha256, priorManifest.treeSha256);
assert.deepEqual(consolidated.priorTestFiles, retained.map(row => row.file));
const failedOutputNames = [];
for (const prefix of ['initial', 'second']) {
  const result = await json(`${prefix}-failed-focused-tests.json`), binding = await json(`${prefix}-failed-test-source-manifest.json`);
  assert(result.databaseClosed && result.sourceUnchanged);
  assert.equal(tree(binding.inputs), binding.treeSha256);
  assert.equal(result.sourceTreeSha256, binding.treeSha256);
  assert.equal(result.results.filter(row => row.exitCode !== 0).length, 1);
  assert.equal(await checkLog(`${prefix}-failed-focused-tests.log`, result, 1), 14);
  await checkMigrations(result);
  for (const row of sourcePaths.filter(row => !row.path.includes('/__tests__/')))
    assert.equal(binding.inputs.find(input => input.path === row.path)?.sha256, row.sha256);
  const outputs = (await readdir(resolve(artifact, `${prefix}-pdf-qa`))).sort();
  assert.equal(outputs.length, 8);
  assert(outputs.every(name => /^(mna-full-long|mna-full-normal|mna-screening-partial|mna-v2-half-point)\.(pdf|snapshot\.json)$/.test(name)));
  failedOutputNames.push(...outputs.map(name => `${prefix}-pdf-qa/${name}`));
}
assert.equal(checks.sourceTreeSha256, inputTreeSha256);
assert(checks.sourceUnchanged && checks.results.every(row => row.exitCode === 0));
assert.deepEqual(checks.results.map(row => row.name), ['typecheck', 'diff-check']);
assert(!checks.compiledBuildRunByWorker && !checks.schemaChanged && !checks.migrationChanged && !checks.dependencyManifestsChanged);
const contracts = await json('contract-provenance.json'), checksums = {};
for (const row of contracts.contracts) {
  assert.equal(await hash(row.snapshot), row.sha256);
  const originalBytes = await readFile(row.original);
  if (row.snapshot === 'task-contract.snapshot.md') {
    assert.equal(sha(originalBytes), '9dcddf1160103fba70929c8cbd0dfa7b5b6f55a9e147f086ab28196d7e50ca3e');
    const priorText = await readFile(resolve(artifact, row.snapshot), 'utf8');
    assert.equal(originalBytes.toString('utf8'), priorText.replace('Preparazione soltanto; esecuzione dopo PO15 pubblicata/verificata.', 'GO23settembre dopo PO15 pubblicata/verificata, receipt36fb9675.'));
    await writeFile(resolve(artifact, 'root-go-contract.snapshot.md'), originalBytes);
    await save('root-go-contract-provenance.json', { original: row.original, preparatorySnapshot: row.snapshot,
      preparatorySha256: row.sha256, currentSnapshot: 'root-go-contract.snapshot.md', currentSha256: sha(originalBytes),
      onlyChange: 'Preparation status replaced with explicit GO after PO15 and receipt36fb9675; acceptance criteria and scope unchanged.',
      preflightDetection: { chunk: 'fca941', exitCode: 1, cause: 'The first artifact preflight correctly rejected an updated upstream contract hash; no application test or source changed.' } });
  } else assert.equal(sha(originalBytes), row.sha256);
  checksums[row.snapshot] = row.sha256;
}
assert.equal(await hash('backend-contract.md'), session.dtoContractSha256);
assert.equal(checksums['task-contract.snapshot.md'], session.rootContractSha256);
const go = await json('root-go.json'), agreement = await json('frontend-agreement.json');
assert(go.implementationAuthorized && !go.publicationAuthorizedToWorker && agreement.bmiSemanticsAgreed);
const provenance = await json('legacy-v1-provenance.json'), legacy = await json('legacy-v1/state.json');
await verifyRows(artifact, provenance.files);
assert.equal(sha(await readFile(provenance.originalState.path)), provenance.originalState.sha256);
assert.equal(sha(await readFile(provenance.originalPdf.path)), provenance.originalPdf.sha256);
const proof = await json('legacy-ready-retry-proof.json');
assert.equal(proof.renderCalls, 0); assert.equal(proof.attempts, 3);
assert.deepEqual(proof.before, proof.after);
assert.deepEqual(proof.before.assessment, legacy.assessment);
assert.deepEqual(proof.before.document, legacy.document);
assert.equal(proof.before.count, 1);
assert.equal(proof.fullBeforeSha256, proof.fullAfterSha256);
for (const value of [proof.pdfBeforeSha256, proof.pdfAfterSha256, proof.originalPdfSha256]) assert.equal(value, provenance.originalPdf.sha256);
assert.equal(proof.producerBefore, 'ClinicOS mna-a4-v1'); assert.equal(proof.producerAfter, proof.producerBefore);
assert.equal(legacy.assessment.assessedAt, '2026-09-22T08:30:00.000Z');
assert.equal(legacy.assessment.finalSnapshot.assessedAt, '2026-09-22T06:30:00.000Z');
const fresh = await json('fresh-v2-proof.json');
assert.equal(fresh.rawBmi, 24.999999999999996); assert.equal(fresh.total, 27.5);
assert.equal(fresh.displayedBmi, '25'); assert.equal(fresh.displayedTotal, '27,5');
assert.equal(fresh.rendererVersion, 'mna-a4-v2'); assert.equal(fresh.producer, 'ClinicOS mna-a4-v2');
assert.equal(fresh.sourceManifest.rendererVersion, fresh.rendererVersion);
assert.equal(fresh.sourceManifest.snapshotSha256, fresh.snapshotSha256);
assert.equal(await hash(fresh.pdfPath), fresh.pdfSha256);
assert.equal((await readFile(resolve(artifact, fresh.pdfPath))).length, fresh.bytes);
const rendering = await json('pdf-qa/rendered-pages.json');
assert.equal(rendering.sourceManifestSha256, manifestSha); assert.equal(rendering.sourceTreeSha256, inputTreeSha256);
assert.equal(rendering.files.length, 28); assert.equal(rendering.totalPages, 16);
await verifyRows(resolve(artifact, 'pdf-qa'), rendering.files);
assert.deepEqual(rendering.rendered.map(row => row.pages), [3, 3, 7, 3]);
for (const row of rendering.rendered) {
  assert.equal(row.producer, 'ClinicOS mna-a4-v2'); assert(row.productionAndRelevantTestSourcesMatchFrozenTree);
  assert.equal(row.generatedUnderInputTreeSha256, row.name === 'mna-v2-half-point' ? inputTreeSha256 : priorManifest.treeSha256);
  const text = await readFile(resolve(artifact, `pdf-qa/final/${row.name}.txt`), 'utf8');
  assert(!/— 1 punti\b/.test(text));
  if (row.name !== 'mna-screening-partial') assert.match(text, /IMC: 25 kg\/m²/);
  if (row.name === 'mna-v2-half-point') assert.match(text, /Totale MNA: 27,5 \/ 30/);
}
const review = await json('independent-source-review.json');
assert.equal(review.sourceManifestSha256, manifestSha); assert.equal(review.inputTreeSha256, inputTreeSha256);
assert(review.sourceBindingPassed && review.openP1P2 === 0);
const visual = {
  inspectedBy: '/root/po01_backend_audit', recordedAt: new Date().toISOString(), sourceManifestSha256: manifestSha,
  currentInputTreeSha256: inputTreeSha256, priorInputTreeSha256: priorManifest.treeSha256,
  renderingReceipt: 'rendered-pages.json', renderingReceiptSha256: await hash('pdf-qa/rendered-pages.json'),
  allPagesInspected: true, pdfs: 4, pagesInspected: 16, findings: [],
  observations: [
    'Half-point pages 1–3: 1 punto, 0,5 punti, IMC 25, total 27,5; all text, identity, source/copyright and page numbers readable.',
    'Normal pages 1–3: IMC 25, singular labels, total 30 and source footer readable; no overlap or clipping.',
    'Long notes pages 1–7: correct continuation across pages, accents and Greek glyphs rendered; final source/copyright retained; no overlap or clipping.',
    'Partial screening pages 1–3: unavailable measures, incomplete responses, all three K subanswers, 0,5 points and global-section exclusion remain legible; no invented total.',
    'Versione 1 in the body names the unchanged clinical form; mna-a4-v2 identifies only the PDF renderer in metadata.'
  ],
  inspectedImages: rendering.files.filter(row => row.path.endsWith('.png')).map(row => row.path),
  generatedUnderInputBindings: rendering.rendered, files: rendering.files,
  independentHalfPointReview: review.independentVisualMessage,
  note: 'The rendering-stage receipt remains immutable with visualInspectionPending true; this later inspection record completes it. Initial and second attempt PDFs are excluded from these visual claims.'
};
assert.equal(visual.inspectedImages.length, 16);
await save('pdf-qa/visual-qa.json', visual);
const unsafe = [], scanScope = sourcePaths.filter(row => !row.path.includes('/__tests__/'));
const newPaths = split(git('ls-files', '--others', '--exclude-standard', '--', ...scope));
const newSource = await Promise.all(newPaths.map(async path => ({ path, lines: (await readFile(resolve(root, path), 'utf8')).trimEnd().split(/\r?\n/).length })));
assert.equal(newSource.length, 1); assert(newSource.every(row => row.lines < 500));
for (const row of scanScope) {
  const content = await readFile(resolve(root, row.path), 'utf8');
  for (const [name, pattern] of Object.entries({ dynamicExecution: /\b(?:eval|Function)\s*\(/u, unsafeRawSql: /\$(?:queryRawUnsafe|executeRawUnsafe)\s*\(/u, externalFetch: /\bfetch\s*\(/u, privateKey: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u }))
    if (pattern.test(content)) unsafe.push({ path: row.path, pattern: name });
}
assert.deepEqual(unsafe, []);
await save('source-safety-review.json', { sourceManifestSha256: manifestSha, inputTreeSha256, newSourceFiles: newSource, newSourceBelow500Lines: true,
  scopedStaticChecks: { scope: scanScope.map(row => row.path), findings: unsafe },
  manualReview: ['Only MNA PDF item plurality, BMI display and renderer selector changed.',
    'BMI uses the unchanged frontend semantics: at most two decimals unless rounding to zero or crossing the 19/21/23 band; score thresholds still use raw values.',
    'Answers, clinical source/model version, score, snapshot/hash, PDF storage/retry lifecycle and font inputs remain unchanged.',
    'Historical ready v1 rows/documents remain byte-identical under three real retry calls with a renderer spy that must never execute.'],
  limitations: ['Scoped source review, not a dependency CVE scan, clinical validation or performance benchmark.'] });
const payload = wrapper => JSON.parse(wrapper.content.find(row => row.type === 'text').text);
const sourceRelease = payload(await json('claims-source-release.json')), evidenceClaim = payload(await json('claims-evidence.json'));
assert(sourceRelease.success && sourceRelease.previousClaim.issueId === session.claim.issueId);
assert(evidenceClaim.success && evidenceClaim.claim.issueId === 'PO-16-backend-evidence');
const evidenceNames = [...new Set([
  ...preparation.artifactCopyAllowlist.filter(name => name !== 'artifact-manifest.json'),
  'source-manifest.json', 'implementation-session.json', 'root-go.json', 'claims-implementation.json', 'claims-source-release.json', 'claims-evidence.json', 'claims-evidence-release.json',
  'root-go-contract.snapshot.md', 'root-go-contract-provenance.json',
  'focused-tests.json', 'focused-tests.log', 'test-source-manifest.json', 'pre-utc-focused-tests.json', 'pre-utc-focused-tests.log', 'pre-utc-test-source-manifest.json',
  'cwd-focused-tests.json', 'cwd-focused-tests.log', 'cwd-test-source-manifest.json', 'consolidated-tests.json',
  'initial-failed-focused-tests.json', 'initial-failed-focused-tests.log', 'initial-failed-test-source-manifest.json', 'initial-fresh-v2-proof.json',
  'second-failed-focused-tests.json', 'second-failed-focused-tests.log', 'second-failed-test-source-manifest.json', 'second-fresh-v2-proof.json',
  'initial-test-fixture-failures.json', 'fresh-v2-proof.json', 'legacy-ready-retry-proof.json',
  'typecheck.log', 'diff-check.log', 'validation-checks.json', 'source-safety-review.json', 'independent-source-review.json', 'execution-sessions.json',
  'run-focused-tests.mjs', 'run-cwd-focused-test.mjs', 'validate-and-freeze.mjs', 'render-pdf-qa.mjs', 'finalize-evidence.mjs',
  'pdf-qa/rendered-pages.json', 'pdf-qa/visual-qa.json', ...rendering.files.map(row => 'pdf-qa/' + row.path), ...failedOutputNames
])].sort();
assert(evidenceNames.includes('legacy-v1/state.json') && evidenceNames.includes('legacy-v1/mna-ready-v1.pdf'));
assert(evidenceNames.every(name => !/(postgres-|private-schema|node_modules|po-15|\.ps1$)/u.test(name)));
await entries(evidenceNames.filter(name => name !== 'claims-evidence-release.json').map(name => folder + '/' + name));
let evidenceRelease;
try { evidenceRelease = payload(await json('claims-evidence-release.json')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!evidenceRelease) {
  console.log(JSON.stringify({ preflightPassed: true, sourceFiles: 4, inputs: 1104, passed: 15, pdfs: 4, pages: 16, evidenceFiles: evidenceNames.length, awaitingEvidenceClaimRelease: true }));
  process.exit(0);
}
assert(evidenceRelease.success && evidenceRelease.previousClaim.issueId === 'PO-16-backend-evidence');
const evidence = await entries(evidenceNames.map(name => folder + '/' + name));
const receipt = {
  task: 'PO-16-backend', phase: 'implementation-complete-worker-handoff', generatedAt: new Date().toISOString(), worktree: root, branch: session.branch, baseline: session.baseline,
  decision: 'Consegna delle sole sorgenti e prove elencate a root per integrazione; pubblicazione riservata al gate root autorizzato separatamente.',
  authorization: go, sourceManifestSha256: manifestSha, sourceTreeSha256: manifest.sourceTreeSha256, inputTreeSha256,
  sourceFrozen: true, sourceFiles: 4, sourceInputs: 1104, contracts: checksums, contractGoUpdate: await json('root-go-contract-provenance.json'),
  tests: { ...consolidated, migrationsApplied: 48, newMigrations: 0, currentResults: current.results, retainedPriorResults: retained,
    exactTwoRunBinding: true, historicalEvidenceUnmodified: true, priorAttempts: await json('initial-test-fixture-failures.json') },
  validation: checks, execution: await json('execution-sessions.json'),
  legacyV1: { proof: 'legacy-ready-retry-proof.json', originalPdfSha256: proof.originalPdfSha256, bytes: provenance.originalPdf.bytes,
    originalStateSha256: provenance.originalState.sha256, retries: 3, renderCalls: 0, fullRowsMetadataBytesSnapshotUnchanged: true,
    timestampDiscrepancyPreserved: true, fixtureRequiredByTests: ['legacy-v1/state.json', 'legacy-v1/mna-ready-v1.pdf'] },
  newV2: fresh, pdfQa: { receipt: 'pdf-qa/visual-qa.json', pdfs: 4, pages: 16, allPagesInspected: true, files: 28, findings: 0,
    sourceBinding: 'Half-point generated on current tree; other three on prior tree with byte-identical production and relevant test inputs.' },
  failedAttemptOutputs: { included: true, files: 16, visuallyInspected: false, paths: failedOutputNames },
  benchmark: { performed: false, reason: 'Presentation-only change; no performance claim or measured bottleneck.' },
  invariants: ['1 punto only for exactly 1; other scores retain punti and decimal comma.', 'BMI display matches unchanged UI without altering raw measurements or score bands.',
    'Only new MNA PDFs use mna-a4-v2; ready historical v1 bytes, metadata, sourceManifest and snapshot remain unchanged.',
    'Other renderer versions, clinical form source, fonts, schemas, migrations and dependencies are unchanged.'],
  limitations: ['Root owns final compiled build, integrated HTTP/browser QA and independently authorized publication.',
    'Independent source review has no open P1/P2; final artifact binding is still for the independent reviewer.',
    'No worker commit, push, deploy, online patient write, dependency CVE scan, clinical validation or performance claim.'],
  claimsReleased: ['PO-16-backend-preparation', 'PO-16-backend-implementation', 'PO-16-backend-evidence'],
  artifactCopyAllowlist: [...evidenceNames, 'implementation-receipt.json', 'handoff.md', 'artifact-manifest.json'],
  doNotCopy: ['postgres-* directories', 'private runtime and node_modules junctions', 'backend/dist', 'PowerShell launchers', 'other PO artifacts'], evidence
};
await save('implementation-receipt.json', receipt);
await writeFile(resolve(artifact, 'handoff.md'), `# PO16 backend MNA PDF completato\n\n` +
  `Worktree ${root}; branch ${session.branch}; baseline ${session.baseline}.\n\n` +
  `MNA PDF: 1 punto, decimali con virgola e IMC leggibile (64/160 → 25), conservando precisione vicino alle soglie. Solo nuovi documenti mna-a4-v2; scoring, snapshot e PDF storici invariati.\n\n` +
  `15 test verdi su 5 file: 12 del run precedente, con input pertinenti identici, e 3 finali dal cwd backend. I due alberi sono esplicitati in consolidated-tests.json. 48 migrazioni esistenti, DB sintetici chiusi; typecheck e diff PASS. Due fallimenti di fixture preservati; nessuna modifica applicativa dovuta a tali correzioni.\n\n` +
  `V1 reale PO15 ripristinato tramite transazione UTC con trigger attivi: 3 retry, renderer 0, record/metadati/27707 byte/SHA/manifest/snapshot invariati. La discrepanza temporale già presente nel dump è preservata. Il nuovo v2 archivia 27,5 e IMC 25 mantenendo i valori raw.\n\n` +
  `4 PDF v2 e tutte le 16 pagine ispezionate; nessuna sovrapposizione o taglio. Le 28 prove PDF correnti e le 8 prove legacy sono incluse. I 16 file PDF/snapshot dei due tentativi falliti sono preservati e non fanno parte della QA visiva finale.\n\n` +
  `Source manifest SHA256 ${manifestSha}; changed tree ${manifest.sourceTreeSha256}; input tree ${inputTreeSha256}, 4 sorgenti e 1104 input. Review sorgenti indipendente PASS senza P1/P2; binding artefatti da confermare.\n\n` +
  `Root copia sourcePaths e artifactCopyAllowlist. Includere legacy-v1/state.json e legacy-v1/mna-ready-v1.pdf: sono fixture obbligatorie dei test. Tutte le claim worker rilasciate. Root completa build/HTTP/browser e decide il rilascio; nessun commit/push/deploy dal worker.\n`);
await save('artifact-manifest.json', { task: receipt.task, phase: receipt.phase, generatedAt: receipt.generatedAt, baseline: session.baseline,
  artifacts: await entries([...evidenceNames, 'implementation-receipt.json', 'handoff.md'].map(name => folder + '/' + name)) });
console.log(JSON.stringify({ completed: true, sourceFiles: 4, inputs: 1104, passed: 15, pdfs: 4, pages: 16,
  sourceManifestSha256: manifestSha, receiptSha256: await hash('implementation-receipt.json'), artifactManifestSha256: await hash('artifact-manifest.json'), artifacts: evidenceNames.length + 2, evidence: evidenceNames.length }));
