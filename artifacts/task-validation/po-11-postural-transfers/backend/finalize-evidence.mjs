import { createHash } from 'node:crypto';
import { readFile, writeFile, stat, realpath } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve, relative, isAbsolute } from 'node:path';

const root = await realpath(process.cwd());
const artifactRelative = 'artifacts/task-validation/po-11-postural-transfers/backend';
const artifact = resolve(root, artifactRelative);
const baseline = 'd659c1b459eb72a2920cbd9f678a2c11f9bf7efd';
const branch = 'codex/po11-transfers-backend';
const integrationRoot = 'C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications';
const git = (...args) => execFileSync('git', args, { cwd: root, windowsHide: true, encoding: 'utf8' }).trim();
const digest = value => createHash('sha256').update(value).digest('hex');
const paths = value => value.split(/\r?\n/).filter(Boolean);
const json = async name => JSON.parse(await readFile(resolve(artifact, name), 'utf8'));
const writeJson = (name, value) => writeFile(resolve(artifact, name), JSON.stringify(value, null, 2) + '\n');
const entries = async values => Promise.all([...new Set(values)].sort().map(async path => {
  const bytes = await readFile(resolve(root, path));
  return { path, bytes: bytes.length, sha256: digest(bytes) };
}));
const tree = rows => digest(rows.map(row => `${row.path}\0${row.sha256}\n`).join(''));
const inputPaths = paths(git('ls-files', '--cached', '--others', '--exclude-standard', '--',
  'backend/src', 'prisma', 'backend/tsconfig.json', 'backend/package.json', 'package.json',
  'package-lock.json', 'prisma.config.ts', 'tests/fixtures/po05-postgres.mjs'));
const inputs = await entries(inputPaths);
const tests = await json('focused-tests.json');
const testManifest = await json('test-source-manifest.json');
if (tree(inputs) !== tests.sourceTreeSha256 || tree(inputs) !== testManifest.treeSha256 ||
    !tests.sourceUnchanged || !tests.databaseClosed || tests.results.some(row => row.exitCode !== 0 || row.tests < 1))
  throw new Error('Final source or completed test evidence does not match the tested source');
const log = await readFile(resolve(artifact, 'focused-tests.log'), 'utf8');
const counts = [...log.matchAll(/ℹ tests (\d+)/g)].map(match => Number(match[1]));
if (counts.length !== 15 || counts.length !== tests.results.length ||
    counts.some((count, index) => count !== tests.results[index].tests) ||
    [...log.matchAll(/ℹ fail (\d+)/g)].some(match => Number(match[1]) !== 0))
  throw new Error('Incomplete or inconsistent final test log');
const testCount = counts.reduce((sum, count) => sum + count, 0);
const newTestCount = tests.results.filter(row => /\/(transfers|attestations)[^/]*\.test\.ts$/.test(row.file))
  .reduce((sum, row) => sum + row.tests, 0);
if (git('rev-parse', 'HEAD') !== baseline || git('branch', '--show-current') !== branch)
  throw new Error('Unexpected worktree baseline or branch');
const changed = await entries([
  ...paths(git('diff', 'HEAD', '--name-only', '--', 'backend/src', 'prisma')),
  ...paths(git('ls-files', '--others', '--exclude-standard', '--', 'backend/src', 'prisma')),
]);
const newPaths = paths(git('ls-files', '--others', '--exclude-standard', '--', 'backend/src', 'prisma'));
const newFiles = await Promise.all(newPaths.filter(path => /\.(ts|sql)$/.test(path)).map(async path => ({
  path, lines: (await readFile(resolve(root, path), 'utf8')).trimEnd().split(/\r?\n/).length,
})));
if (newFiles.some(row => row.lines >= 500)) throw new Error('New source file exceeds line limit');
const session = await json('implementation-session.json');
for (const row of session.preserved) {
  if (digest(await readFile(resolve(root, row.path))) !== row.sha256)
    throw new Error(`Protected existing file changed: ${row.path}`);
}
const qa = await json('pdf-qa/visual-qa.json');
if (qa.sourceTreeSha256 !== tree(inputs) || !qa.allPagesInspected || !qa.noClippingOrOverlap)
  throw new Error('Latest PDF QA not bound to final tested source');
for (const row of qa.files) {
  if (digest(await readFile(resolve(artifact, 'pdf-qa', row.path))) !== row.sha256)
    throw new Error(`PDF QA output changed: ${row.path}`);
}

let checks;
try { checks = await json('validation-checks.json'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!checks) {
  const output = await realpath(resolve(root, 'backend/node_modules/.prisma/client'));
  const wrapper = await realpath(resolve(root, 'backend/node_modules/@prisma/client'));
  for (const path of [output, wrapper]) {
    const inside = relative(root, path);
    if (inside.startsWith('..') || isAbsolute(inside)) throw new Error('Prisma runtime is not private');
  }
  const sourceSchema = await readFile(resolve(root, 'prisma/schema.prisma'), 'utf8');
  const privateSchema = await readFile(resolve(artifact, 'private-schema.prisma'), 'utf8');
  const normalize = value => value.replace(/\r\n/g, '\n').split('\n')
    .map(line => line.trim().replace(/[ \t]+/g, ' ')).filter(Boolean).join('\n');
  if (normalize(privateSchema.replace(/\r?\n  output = "[^"]+"/, '')) !== normalize(sourceSchema))
    throw new Error('Private schema differs beyond explicit output');
  const generatedSchema = await readFile(resolve(output, 'schema.prisma'), 'utf8');
  // Prisma formatter moves this unique constraint before the adjacent index.
  const normalizeGenerated = value => normalize(value).replace(
    '@@index([patientId])\n@@unique([assessmentId, patientId])',
    '@@unique([assessmentId, patientId])\n@@index([patientId])',
  );
  if (normalizeGenerated(generatedSchema) !== normalizeGenerated(privateSchema))
    throw new Error('Generated client schema differs beyond whitespace and the adjacent unique/index order');
  const validation = spawnSync(process.execPath, [resolve(root, 'node_modules/prisma/build/index.js'),
    'validate', '--schema', resolve(artifact, 'private-schema.prisma')], {
    cwd: root, windowsHide: true, encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: 'postgresql://postgres@127.0.0.1:1/po11_validate_only' },
  });
  await writeFile(resolve(artifact, 'schema-validation.log'), `${validation.stdout}\n${validation.stderr}`);
  if (validation.status !== 0) throw new Error('Prisma validation failed');
  const diff = spawnSync('git', ['diff', '--check', '--', 'backend', 'prisma'], {
    cwd: root, windowsHide: true, encoding: 'utf8',
  });
  await writeFile(resolve(artifact, 'diff-check.log'), `${diff.stdout}\n${diff.stderr}`);
  if (diff.status !== 0) throw new Error('Owned diff check failed');
  const generation = await json('private-generation-receipt.json');
  generation.schemaSha256 = digest(sourceSchema);
  generation.privateSchemaSha256 = digest(privateSchema);
  generation.generatedClientSchemaSha256 = digest(generatedSchema);
  generation.schemaVerifiedAt = new Date().toISOString();
  await writeJson('private-generation-receipt.json', generation);
  const provenancePath = 'C:/Workspace/ClinicOSHouse-worktrees/po10-assessments-backend/artifacts/task-validation/po-10-painad/backend/font-provenance.json';
  const provenanceBytes = await readFile(provenancePath);
  const provenance = JSON.parse(provenanceBytes);
  const fontFiles = [];
  for (const row of provenance.files) {
    const currentBytes = await readFile(resolve(root, row.path));
    const exactMatch = digest(currentBytes) === row.sha256;
    const checkoutTextMatch = row.path.endsWith('/OFL.txt') &&
      digest(currentBytes.toString('utf8').replace(/\r\n/g, '\n')) === row.sha256;
    if (!exactMatch && !checkoutTextMatch) throw new Error(`Font provenance mismatch: ${row.path}`);
    fontFiles.push({ ...row, bytes: currentBytes.length, sha256: digest(currentBytes),
      priorProvenanceSha256: row.sha256,
      verification: exactMatch ? 'exact bytes' : 'OFL text identical after CRLF checkout normalization to LF' });
  }
  await writeJson('font-provenance.json', { ...provenance, files: fontFiles,
    reusedProvenance: { path: provenancePath, sha256: digest(provenanceBytes) } });
  const typecheckLog = await readFile(resolve(artifact, 'typecheck.log'));
  if (typecheckLog.length !== 0) throw new Error('Typecheck log has unexpected diagnostics');
  checks = {
    sourceTreeSha256: tree(inputs), generatedAt: new Date().toISOString(),
    typecheck: { command: 'node node_modules/typescript/bin/tsc -p backend/tsconfig.json --noEmit',
      exitCode: 0, evidence: 'Tool completion 507608 (session 57174; creation 4911a7) on final source after layout refinement; no diagnostics.',
      log: `${artifactRelative}/typecheck.log` },
    schema: { exitCode: validation.status, privateSchemaMatchesSourceExceptOutput: true,
      generatedSchemaMatchesPrivateExceptWhitespaceAndAdjacentIndexOrder: true,
      adjacentConstraintOrder: 'PatientDocument @@unique([assessmentId, patientId]) and @@index([patientId])',
      connectedToDatabase: false },
    ownedDiff: { exitCode: diff.status }, newFiles, newSourceFilesBelow500Lines: true,
    protectedFilesPreserved: session.preserved,
    runtime: { privatePrismaOutput: output, privatePrismaWrapper: wrapper,
      dependencyManifestsChanged: false, sharedDependencyTargetWritten: false },
    fonts: { provenance: `${artifactRelative}/font-provenance.json`, verified: true,
      license: 'SIL Open Font License 1.1', fontkit: '1.1.1 MIT; root-owned dependency integration' },
    pdfVisualQa: `${artifactRelative}/pdf-qa/visual-qa.json`,
    independentReview: {
      reviewer: '/root/clinical_forms_source_audit',
      resolvedFindings: [
        'Historical civil admission dates are accepted consistently by API and SQL; invalid Gregorian dates are rejected.',
        'SQL qualification trimming uses explicit chr(11), preserving literal v and matching the application whitespace rules.',
      ],
      sourceReview: 'Reviewer reread both fixes and regressions and reported no other concrete P1/P2; final hash binding is independent.',
    },
  };
  await writeJson('validation-checks.json', checks);
}
if (checks.sourceTreeSha256 !== tree(inputs)) throw new Error('Validation source has changed');
const manifest = {
  task: 'PO-11-backend', root, baseline, branch,
  capturedAt: checks.generatedAt, sourceTreeSha256: tree(changed), inputTreeSha256: tree(inputs),
  hashAlgorithm: 'SHA256 over sorted path + NUL + byte-SHA256 + LF', sourcePaths: changed,
  testSourceManifest: `${artifactRelative}/test-source-manifest.json`,
  excludedUnrelatedDirtyPaths: ['run-claude-queue.ps1', 'start-claude-team.ps1'],
  scope: 'All changed/new backend and Prisma source. Input tree binds every backend source including unmodified licensed fonts, Prisma schema/migration and selected runtime configuration/dependency manifest.',
};
await writeJson('source-manifest.json', manifest);
let release;
try { release = await json('claims-release.json'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!release) {
  console.log(JSON.stringify({ preflightPassed: true, files: changed.length, testCount,
    sourceManifestSha256: digest(await readFile(resolve(artifact, 'source-manifest.json'))),
    sourceTreeSha256: manifest.sourceTreeSha256, inputTreeSha256: manifest.inputTreeSha256,
    awaitingClaimsRelease: true }));
  process.exit(0);
}
if (!release.released || release.issueId !== session.claim.issueId || release.claimant !== session.claim.claimant)
  throw new Error('Claim release evidence is incomplete');
const evidenceNames = [
  'source-manifest.json', 'test-source-manifest.json', 'focused-tests.json', 'focused-tests.log',
  'private-generation-receipt.json', 'private-generation.log', 'schema-validation.log', 'diff-check.log',
  'typecheck.log', 'validation-checks.json', 'run-focused-tests.mjs', 'generate-private.mjs',
  'prepare-runtime.mjs', 'finalize-evidence.mjs', 'implementation-session.json',
  'task-contract.snapshot.md', 'font-provenance.json', 'claims-release.json',
  'pdf-qa/visual-qa.json', 'verify-visual-qa.mjs', ...qa.files.map(row => `pdf-qa/${row.path}`), 'backend-contract.md', 'test-plan.md',
];
const evidence = await entries(evidenceNames.map(name => `${artifactRelative}/${name}`));
const receipt = {
  task: manifest.task, phase: 'implementation-complete-worker-handoff',
  decision: 'allow exact-source handoff to root for independent integration validation',
  authorization: 'Explicit root GO after verified PO10 release; worker owned backend/schema/tests in an isolated worktree. Final local claim released for root integration.',
  worktree: root, branch, baseline, generatedAt: new Date().toISOString(),
  sourceTreeSha256: manifest.sourceTreeSha256, inputTreeSha256: manifest.inputTreeSha256,
  sourceManifestSha256: evidence.find(row => row.path.endsWith('/source-manifest.json')).sha256,
  sourceFrozen: true, tests: { passed: testCount, failed: 0, newPo11Tests: newTestCount,
    results: tests.results, finishedAt: (await stat(resolve(artifact, 'focused-tests.json'))).mtime.toISOString(),
    finalRunnerSession: 80697, finalRunnerExitCode: 0, sourceUnchangedBeforeAfterAndHandoff: true,
    sourceTreeSha256: tests.sourceTreeSha256, database: tests.database, databaseClosed: tests.databaseClosed,
    migrationsApplied: tests.migrations.length, migrationEvidence: `${artifactRelative}/focused-tests.json`,
  },
  validation: checks, claimsReleaseEvidence: `${artifactRelative}/claims-release.json`,
  invariants: [
    'PAINAD version and immutable final snapshots remain intact; Transfers is discriminated with result null and explicit completion.',
    'All 384 independent transfer selections, no versus missing answers, aid ownership and input dependencies are validated.',
    'Current filters terminal final correction chains before selecting by clinical time and deterministic tie-breaks.',
    'Attestations bind final ID/hash and server actor/qualification/time; unique natural keys replay without duplication.',
    'Patient scope and new physiotherapist eligibility are checked under database locks; events are append-only and never rewrite a PDF.',
    'Typed document metadata and existing archive/AI gates support both forms; legacy document scope stays unchanged.',
    'Transaction-local UTC, immutable finals, CAS, original request receipts and PDF lease/token fencing preserve PO10 behavior.',
  ],
  limitations: [
    'This receipt is local worker evidence, not an independent release or production capability.',
    'Root owns combined integration/build, browser/HTTP validation and publication; this worker changed no dependency or lockfile.',
    'Normal backend build was not used because implicit Prisma generation would target shared dependencies; private generation, schema validation and typecheck were used.',
    'Worker claims no browser, performance benchmark, dependency CVE scan, clinical validation or production result.',
  ],
  artifactCopyAllowlist: [...evidenceNames, 'implementation-receipt.json', 'handoff.md', 'artifact-manifest.json'],
  doNotCopy: ['postgres-* directories', 'private-schema.prisma', 'backend/node_modules', 'root node_modules junction',
    'old pdf-qa PNGs outside final/', 'run-claude-queue.ps1', 'start-claude-team.ps1'],
  evidence,
};
await writeJson('implementation-receipt.json', receipt);
const handoff = `# PO-11 backend — completato\n\n` +
  `Worktree: ${root}. Branch: ${branch}. Baseline: ${baseline}.\n\n` +
  `Implementati Trasferimenti posturali con validazione/completezza, union PAINAD invariata, current clinico sui terminali, conferme personali append-only/hash/qualifica DB, snapshot e PDF Unicode.\n\n` +
  `Verifica finale: ${testCount} test verdi in 15 file, inclusi ${newTestCount} nuovi PO11; ${tests.migrations.length} migrazioni applicate su PostgreSQL nativo sintetico loopback Europe/Rome e DB chiuso. Typecheck, schema, diff e QA visiva PDF verificati.\n\n` +
  `Manifest: source-manifest.json (${changed.length} file). SHA256 manifest: ${receipt.sourceManifestSha256}. Changed tree: ${manifest.sourceTreeSha256}. Input tree: ${manifest.inputTreeSha256}.\n\n` +
  `Claim PO-11-backend-implementation rilasciata. Copiare soltanto sourcePaths e artifactCopyAllowlist; escludere cluster, schema/client privato, junction e PowerShell preesistenti. Nessun package/lock modificato.\n\n` +
  `Root deve applicare 20260923050000_postural_transfers e generare il proprio client. Tipi in backend/src/assessments/types.ts e transfers-types.ts; GET current richiede type; GET/POST attestations concordati con frontend.\n\n` +
  `Rilievi revisore risolti: data ingresso 1999 e bisestili; trim VT esplicito e lettera v preservata. Sorgenti congelati; nessun commit/push/deploy dal worker. Integrazione e pubblicazione restano a root.\n`;
await writeFile(resolve(artifact, 'handoff.md'), handoff);
await writeJson('artifact-manifest.json', { task: manifest.task,
  generatedAt: receipt.generatedAt,
  artifacts: await entries([...evidenceNames, 'implementation-receipt.json', 'handoff.md'].map(name => `${artifactRelative}/${name}`)),
});
console.log(JSON.stringify({ completed: true, files: changed.length, testCount,
  sourceManifestSha256: receipt.sourceManifestSha256, sourceTreeSha256: manifest.sourceTreeSha256,
  inputTreeSha256: manifest.inputTreeSha256, receipt: resolve(artifact, 'implementation-receipt.json') }));
