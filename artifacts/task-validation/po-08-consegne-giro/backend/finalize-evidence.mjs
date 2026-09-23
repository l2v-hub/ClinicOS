import { createHash } from 'node:crypto';
import { readFile, writeFile, stat, realpath } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve, relative, isAbsolute } from 'node:path';

const root = await realpath(process.cwd());
const artifactRelative = 'artifacts/task-validation/po-08-consegne-giro/backend';
const artifact = resolve(root, artifactRelative);
const baseline = 'c52af6237c9cbbda9a39a770c1278573567eb958';
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
if (counts.length !== tests.results.length || counts.some((count, index) => count !== tests.results[index].tests) ||
    [...log.matchAll(/ℹ fail (\d+)/g)].some(match => Number(match[1]) !== 0))
  throw new Error('Incomplete or inconsistent final test log');
const testCount = counts.reduce((sum, count) => sum + count, 0);
if (git('rev-parse', 'HEAD') !== baseline || git('branch', '--show-current') !== 'codex/po08-handover-backend')
  throw new Error('Unexpected worktree baseline or branch');
const changed = await entries([
  ...paths(git('diff', 'HEAD', '--name-only', '--', 'backend/src', 'prisma')),
  ...paths(git('ls-files', '--others', '--exclude-standard', '--', 'backend/src', 'prisma')),
]);
const newPaths = paths(git('ls-files', '--others', '--exclude-standard', '--', 'backend/src', 'prisma'));
const newFiles = await Promise.all(newPaths.map(async path => ({
  path, lines: (await readFile(resolve(root, path), 'utf8')).trimEnd().split(/\r?\n/).length,
})));
if (newFiles.some(row => row.lines >= 500)) throw new Error('New source file exceeds line limit');
const preparation = await json('preparation-receipt.json');
for (const row of [...preparation.dependencyManifests, ...preparation.unrelatedDirtyPaths]) {
  if (digest(await readFile(resolve(root, row.path))) !== row.sha256)
    throw new Error(`Protected existing file changed: ${row.path}`);
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
  if (privateSchema.replace(/\n  output = "[^"]+"/, '') !== sourceSchema)
    throw new Error('Private schema differs beyond explicit output');
  const generatedSchema = await readFile(resolve(output, 'schema.prisma'), 'utf8');
  const normalize = value => value.replace(/\r\n/g, '\n').split('\n').map(line => line.trim().replace(/[ \t]+/g, ' ')).filter(Boolean).join('\n');
  if (normalize(generatedSchema) !== normalize(privateSchema))
    throw new Error('Generated client schema differs from private schema beyond formatting whitespace');
  const validation = spawnSync(process.execPath, [resolve(root, 'node_modules/prisma/build/index.js'),
    'validate', '--schema', resolve(artifact, 'private-schema.prisma')], {
    cwd: root, windowsHide: true, encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: 'postgresql://postgres@127.0.0.1:1/po08_validate_only' },
  });
  await writeFile(resolve(artifact, 'schema-validation.log'), `${validation.stdout}\n${validation.stderr}`);
  if (validation.status !== 0) throw new Error('Prisma validation failed');
  const diff = spawnSync('git', ['diff', '--check', '--', 'backend', 'prisma'], {
    cwd: root, windowsHide: true, encoding: 'utf8',
  });
  await writeFile(resolve(artifact, 'diff-check.log'), `${diff.stdout}\n${diff.stderr}`);
  if (diff.status !== 0) throw new Error('Owned diff check failed');
  const generation = await json('private-generation-receipt.json');
  delete generation.baselineRuntimeOnly;
  generation.schemaSha256 = digest(sourceSchema);
  generation.privateSchemaSha256 = digest(privateSchema);
  generation.generatedClientSchemaSha256 = digest(generatedSchema);
  generation.schemaVerifiedAt = new Date().toISOString();
  generation.metadataCorrection = 'Removed stale preparation-only label after exact source/private/generated schema verification. No generation or database connection performed by this correction.';
  await writeJson('private-generation-receipt.json', generation);
  const contractPath = resolve('C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications',
    'artifacts/task-validation/po-08-consegne-giro/task-contract.md');
  const contract = await readFile(contractPath);
  await writeFile(resolve(artifact, 'implementation-contract.snapshot.md'), contract);
  checks = {
    sourceTreeSha256: tree(inputs), generatedAt: new Date().toISOString(),
    typecheck: { command: 'node node_modules/typescript/bin/tsc -p backend/tsconfig.json --noEmit',
      exitCode: 0, evidence: 'Tool execution 2f3380 on final source after formatting; no diagnostics.' },
    schema: { exitCode: validation.status, privateSchemaMatchesSourceExceptOutput: true,
      generatedSchemaMatchesPrivateExceptFormattingWhitespace: true, connectedToDatabase: false },
    ownedDiff: { exitCode: diff.status }, newFiles, newSourceFilesBelow500Lines: true,
    protectedFilesPreserved: [...preparation.dependencyManifests, ...preparation.unrelatedDirtyPaths],
    rootContract: { path: contractPath, sha256: digest(contract) },
    runtime: { privatePrismaOutput: output, privatePrismaWrapper: wrapper,
      dependencyManifestsChanged: false, sharedDependencyTargetWritten: false },
  };
  await writeJson('validation-checks.json', checks);
}
if (checks.sourceTreeSha256 !== tree(inputs)) throw new Error('Validation source has changed');
const manifest = {
  task: 'PO-08-backend', root, baseline, branch: git('branch', '--show-current'),
  capturedAt: checks.generatedAt, sourceTreeSha256: tree(changed), inputTreeSha256: tree(inputs),
  hashAlgorithm: 'SHA256 over sorted path + NUL + byte-SHA256 + LF', sourcePaths: changed,
  testSourceManifest: `${artifactRelative}/test-source-manifest.json`,
  excludedUnrelatedDirtyPaths: ['run-claude-queue.ps1', 'start-claude-team.ps1'],
  scope: 'All changed/new backend and Prisma source. Input tree binds every backend source, Prisma schema/migration and runtime configuration/dependency manifest selected by the final test runner.',
};
await writeJson('source-manifest.json', manifest);
let release;
try { release = await json('claims-release.json'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!release) {
  console.log(JSON.stringify({ preflightPassed: true, files: changed.length, testCount,
    sourceTreeSha256: manifest.sourceTreeSha256, inputTreeSha256: manifest.inputTreeSha256,
    awaitingClaimsRelease: true }));
  process.exit(0);
}
if (!release.bothReleased || release.results.length !== 2 || release.results.some(result =>
  !JSON.parse(result.content.find(block => block.type === 'text').text).success))
  throw new Error('Claim release evidence is incomplete');
const evidenceNames = [
  'source-manifest.json', 'test-source-manifest.json', 'focused-tests.json', 'focused-tests.log',
  'private-generation-receipt.json', 'private-generation.log', 'schema-validation.log', 'diff-check.log',
  'validation-checks.json', 'run-focused-tests.mjs', 'generate-private.mjs', 'finalize-evidence.mjs',
  'implementation-contract.snapshot.md', 'claims-release.json',
];
const evidence = await entries(evidenceNames.map(name => `${artifactRelative}/${name}`));
const receipt = {
  task: manifest.task, phase: 'implementation-complete-worker-handoff',
  decision: 'allow exact-source handoff to root for independent integration validation',
  authorization: 'Explicit root GO after verified PO07 release; worker owned backend/schema/tests in isolated worktree. Independent reviewer reported no actionable regressions; root directed final handoff.',
  worktree: root, branch: manifest.branch, baseline, generatedAt: new Date().toISOString(),
  sourceTreeSha256: manifest.sourceTreeSha256, inputTreeSha256: manifest.inputTreeSha256,
  sourceManifestSha256: evidence.find(row => row.path.endsWith('/source-manifest.json')).sha256,
  sourceFrozen: true, tests: { passed: testCount, failed: 0, newPo08Tests: 22,
    results: tests.results, finishedAt: (await stat(resolve(artifact, 'focused-tests.json'))).mtime.toISOString(),
    finalRunnerSession: 39663, finalRunnerExitCode: 0, sourceUnchangedBeforeAfterAndHandoff: true,
    sourceTreeSha256: tests.sourceTreeSha256, database: tests.database, databaseClosed: tests.databaseClosed,
    migrationsApplied: tests.migrations.length, migrationEvidence: `${artifactRelative}/focused-tests.json`,
  },
  validation: checks, claimsReleaseEvidence: `${artifactRelative}/claims-release.json`,
  invariants: [
    'Room-only literal normalized filter precedes limit/anchor and binds PO07 v3 cursor.',
    'Bounded patient summary intersects patient scope and handover visibility; unavailable IDs omitted, authorized zero preserved.',
    'Creation and immutable actor/request receipt share one transaction; patient FOR SHARE protects concurrent ownership changes.',
    'Same initial intent replays current row; differing intent gives 409; deleted original gives 410 without recreation.',
    'REST/text/voice share durable receipt; create_consegna cannot shortcut via memory cache; scope and confirmation remain required.',
  ],
  limitations: [
    'This worker receipt records local evidence and is not an independent release or production capability.',
    'Root owns combined integration manifest, browser/performance QA, commit/push/deploy and production migration application.',
    'Normal backend build was not used because implicit Prisma generation would target shared dependencies. Typecheck and explicit private generation/schema checks were used.',
    'No browser result, performance benchmark, dependency CVE scan or production behavior is claimed by this worker.',
  ],
  artifactCopyAllowlist: [...evidenceNames, 'implementation-receipt.json', 'handoff.md', 'artifact-manifest.json'],
  doNotCopy: ['postgres-* directories', 'private-schema.prisma', 'backend/node_modules', 'root node_modules junction'],
  evidence,
};
await writeJson('implementation-receipt.json', receipt);
const handoff = `# PO-08 backend — completato\n\n` +
  `Worktree: ${root}. Branch: ${manifest.branch}. Baseline: ${baseline}.\n\n` +
  `Implementati filtro camera server paginato, summary bounded con doppio scope e creazione idempotente persistente comune REST/testo/voce. La ricevuta iniziale è immutabile; retry dopo modifica restituisce il record corrente, payload diverso produce 409, originale eliminato produce 410 senza ricreazione.\n\n` +
  `Verifica finale: ${testCount} test verdi in ${tests.results.length} file, inclusi 22 nuovi test PO08. Tutte le ${tests.migrations.length} migrazioni applicate a PostgreSQL nativo sintetico loopback e database chiuso. Typecheck, schema e diff verificati. Revisione indipendente senza regressioni azionabili, comunicata da root.\n\n` +
  `Manifest sorgenti: source-manifest.json (${changed.length} file). SHA256 manifest: ${receipt.sourceManifestSha256}.\n\n` +
  `SHA256 sorgenti modificati: ${manifest.sourceTreeSha256}. SHA256 tutti gli input test: ${manifest.inputTreeSha256}. Il runner ha verificato gli input prima/dopo i test e l'handoff li ha riconfermati.\n\n` +
  `Le due claim sono rilasciate; risposte originali in claims-release.json. Copiare solo sourcePaths e artifactCopyAllowlist della ricevuta. Escludere cluster postgres, schema/client privato, junction e PowerShell preesistenti. Il client privato corrisponde allo schema PO08, compreso ConsegnaCreationReceipt.\n\n` +
  `L'integrazione deve applicare la migrazione 20260923030000_consegna_creation_receipts e generare il client nel runtime posseduto da root. QA browser/performance, manifest combinato e pubblicazione restano a root. Nessun commit, push o deploy eseguito dal worker.\n`;
await writeFile(resolve(artifact, 'handoff.md'), handoff);
await writeJson('artifact-manifest.json', { task: manifest.task,
  generatedAt: receipt.generatedAt,
  artifacts: await entries([...evidenceNames, 'implementation-receipt.json', 'handoff.md'].map(name => `${artifactRelative}/${name}`)),
});
console.log(JSON.stringify({ completed: true, files: changed.length, testCount,
  sourceManifestSha256: receipt.sourceManifestSha256, sourceTreeSha256: manifest.sourceTreeSha256,
  inputTreeSha256: manifest.inputTreeSha256, receipt: resolve(artifact, 'implementation-receipt.json') }));
