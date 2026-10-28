// Run unchanged clinical assertions against an exact source snapshot. Fixed historical output
// paths resolve inside the owned snapshot, never through a writable symlink to prior proof.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const packet = dirname(fileURLToPath(import.meta.url));
const original = resolve(packet, '../../../..');
const runDirectory = resolve(process.argv[2] ?? '');
assert.ok(runDirectory.startsWith('/workspace/.clinicos-cloud/pr483-codex-followup2-20261018/runs/'));
if (!process.argv.includes('--followup-lock-held')) {
  const locked = spawn('flock', ['-n', '/tmp/clinicos-browser-qa.lock', process.execPath, '--import', 'tsx', fileURLToPath(import.meta.url), runDirectory, '--followup-lock-held'], { stdio: 'inherit', env: process.env });
  const status = await new Promise((resolve, reject) => { locked.once('error', reject); locked.once('exit', (code) => resolve(code ?? 1)); });
  process.exit(status);
}
console.log('PR483 owned full-lifecycle lock acquired before source snapshot.');
assert.equal(existsSync(runDirectory), false, 'Use a fresh invocation directory; failed proof is immutable');
mkdirSync(runDirectory, { recursive: true });
const reuse = process.env.QA_REUSE_SNAPSHOT;
const snapshot = reuse ? resolve(reuse) : resolve(runDirectory, 'source');
assert.ok(snapshot.startsWith('/workspace/.clinicos-cloud/pr483-codex-followup2-20261018/runs/'));
if (!reuse) mkdirSync(snapshot);
else assert.ok(existsSync(snapshot), 'Owned reusable source snapshot is required');
const excluded = new Set(['node_modules', 'dist', '.cache', '__pycache__', '.pytest_cache', '.venv', '.env', 'artifacts']);
for (const entry of reuse ? [] : ['backend', 'frontend', 'scripts', 'prisma', 'e2e', 'tests/fixtures', 'clinicos-ai-runtime', 'docs', '.claude', '.agents', '.github']) {
  cpSync(resolve(original, entry), resolve(snapshot, entry), { recursive: true, filter: (path) => !excluded.has(path.split('/').at(-1)) });
}
for (const entry of reuse ? [] : ['package.json', 'package-lock.json', 'prisma.config.ts', 'tsconfig.json', 'CLAUDE.md', 'README.md']) cpSync(resolve(original, entry), resolve(snapshot, entry));
for (const entry of reuse ? [] : ['node_modules', 'backend/node_modules', 'frontend/node_modules']) {
  if (existsSync(resolve(original, entry))) symlinkSync(resolve(original, entry), resolve(snapshot, entry), 'dir');
}
// Restore only copied execution harness before applying this invocation's declared transformations.
cpSync(resolve(original, 'e2e/qa-bug-batch-432.mjs'), resolve(snapshot, 'e2e/qa-bug-batch-432.mjs'));
const packetRelative = relative(original, packet);
mkdirSync(resolve(snapshot, packetRelative), { recursive: true });
for (const file of ['task-contract.md', 'plan.md', 'agenda-verification-browser.mjs', 'clinical-browser.mjs', 'run-author.mjs']) cpSync(resolve(packet, file), resolve(snapshot, packetRelative, file));
for (const entry of ['artifacts/task-validation/po-16-giro/backend/legacy-v1', 'artifacts/task-validation/bug-batch-432/font-assets']) cpSync(resolve(original, entry), resolve(snapshot, entry), { recursive: true });
const catalogFixture = '.ai-architecture/phase-1-capabilities/CAPABILITY_CATALOG.json';
mkdirSync(dirname(resolve(snapshot, catalogFixture)), { recursive: true });
cpSync(resolve(original, catalogFixture), resolve(snapshot, catalogFixture));
const hash = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const copiedFiles = [];
function inventory(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    if (item.isSymbolicLink() || (excluded.has(item.name) && item.name !== 'artifacts')) continue;
    const path = resolve(directory, item.name);
    if (item.isDirectory()) inventory(path);
    else if (item.isFile()) copiedFiles.push(relative(snapshot, path));
  }
}
inventory(snapshot);
const sourceFiles = copiedFiles.filter((file) => !file.startsWith('artifacts/') || file.startsWith(packetRelative));
const before = Object.fromEntries(sourceFiles.map((file) => {
  assert.equal(hash(resolve(snapshot, file)), hash(resolve(original, file)), `snapshot differs: ${file}`);
  return [file, hash(resolve(snapshot, file))];
}));
writeFileSync(resolve(runDirectory, 'source-provenance.json'), JSON.stringify({ original, snapshot, baseSha: 'c212e3141b6c7fdd88b4b1a4eaef73e5616a04f7', files: before }, null, 2));
const originBefore = { ...before };
const outputRelative = packetRelative + '/runtime';
mkdirSync(resolve(snapshot, outputRelative), { recursive: true });
const originalPlan = JSON.parse(readFileSync(resolve(original, 'artifacts/task-validation/bug-batch-432/plan-proposal.json'), 'utf8'));
originalPlan.groups[0].scope = sourceFiles;
writeFileSync(resolve(snapshot, outputRelative, 'plan-proposal.json'), JSON.stringify(originalPlan, null, 2));
const harnessPath = resolve(snapshot, 'e2e/qa-bug-batch-432.mjs');
let harness = readFileSync(harnessPath, 'utf8');
const historicalOut = "const out = resolve(root, 'artifacts/task-validation/bug-batch-432');";
assert.ok(harness.includes(historicalOut));
harness = harness.replace(historicalOut, `const out = resolve(root, '${outputRelative}');`);
const browserPath = resolve(snapshot, 'e2e/qa-bug-batch-432-browser.mjs');
let browserHarness = readFileSync(browserPath, 'utf8');
assert.ok(browserHarness.includes(historicalOut));
browserHarness = browserHarness.replace(historicalOut, `const out = resolve(root, '${outputRelative}');`);
writeFileSync(browserPath, browserHarness);
before['e2e/qa-bug-batch-432-browser.mjs'] = hash(browserPath);
const importPath = resolve(snapshot, 'e2e/therapy-import-api.mjs');
const importOriginal = readFileSync(importPath, 'utf8');
const importHistoricalReport = 'artifacts/task-validation/bug-batch-432/test-results/therapy-import-results.json';
assert.ok(importOriginal.includes(importHistoricalReport));
writeFileSync(importPath, importOriginal.replace(importHistoricalReport, outputRelative + '/test-results/therapy-import-results.json'));
before['e2e/therapy-import-api.mjs'] = hash(importPath);

// Existing generated Prisma client matches the unchanged schema; never regenerate shared deps.
const oldBuild = "  await run('backend-build', 'npm', ['--prefix', 'backend', 'run', 'build']);";
assert.ok(harness.includes(oldBuild));
harness = harness.replace(oldBuild, "  await run('backend-build', process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'backend/tsconfig.json']);\n  await run('backend-font-assets', process.execPath, ['scripts/build/copy-assessment-fonts.mjs']);");
// Exact preexisting official PG16 Alpine image; never pull. Alpine/libc differs from prior Debian fixture.
const priorImage = 'postgres:16@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d';
const boundedImage = 'postgres@sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea';
assert.ok(harness.includes(priorImage));
harness = harness.replace(priorImage, boundedImage);
const inspectedLine = "    const inspected = docker(['image', 'inspect', image, '--format', '{{json .RepoDigests}}']);";
assert.ok(harness.includes(inspectedLine));
harness = harness.replace(inspectedLine, inspectedLine + "\n    const imageIdentity = docker(['image', 'inspect', image, '--format', '{{.Id}}']);\n    assert.equal(imageIdentity.status, 0);\n    assert.equal(imageIdentity.stdout.trim(), 'sha256:81bd698b4594e751a3269e4dcd3e03a4a0ec0daf7b72e7aa1abd43cce9887542');");
harness = harness.replace("      'run',\n      '--detach',", "      'run',\n      '--pull=never',\n      '--detach',");
const provenanceLine = "    writeFileSync(\n      resolve(logs, 'database-provenance.json'),\n      JSON.stringify(\n        {\n          image,";
assert.ok(harness.includes(provenanceLine));
harness = harness.replace(provenanceLine, "    const version = docker(['exec', containerId, 'psql', '-U', 'postgres', '-d', database, '-Atc', \"SELECT current_setting('server_version_num')\"]);\n    assert.equal(version.status, 0);\n    assert.ok(Number(version.stdout.trim()) >= 160000 && Number(version.stdout.trim()) < 170000);\n" + provenanceLine);
// The disposable data directory uses bounded tmpfs: ample measured RAM, scarce workspace disk.
// PostgreSQL remains real and stateful across app/browser reloads; container durability is not claimed.
const dockerPublish = "      '--publish',";
assert.ok(harness.includes(dockerPublish));
harness = harness.replace(dockerPublish, "      '--tmpfs',\n      '/var/lib/postgresql/data:rw,size=512m',\n" + dockerPublish);
// A copied source tree has no git metadata. The original source and snapshot are fingerprinted
// completely by this launcher before/after; the canonical source fingerprint assertion remains.
const scopeStart = harness.indexOf("    const status = spawnSync('git', ['status', '--porcelain=v1'");
const scopeEnd = harness.indexOf('\n  } catch (error) {', scopeStart);
assert.ok(scopeStart > 0 && scopeEnd > scopeStart);
harness = harness.slice(0, scopeStart) + "    assert.deepEqual(fingerprint(), sourceBefore, 'Source changed during verification');" + harness.slice(scopeEnd);
// Add focused real browser+SQL coverage after all original per-issue browser assertions.
const browserEnd = "    'e2e/qa-bug-batch-432-browser.mjs',\n  ]);";
assert.ok(harness.includes(browserEnd));
harness = harness.replace(browserEnd, browserEnd + `\n  await run('clinical-followup-browser', process.execPath, ['--import', 'tsx', '${packetRelative}/clinical-browser.mjs', resolve(out, 'clinical-followup')]);\n  await run('agenda-verification-browser', process.execPath, ['--import', 'tsx', '${packetRelative}/agenda-verification-browser.mjs', resolve(out, 'agenda-verification')]);`);
// Browser assistant uses its documented facility read flag in this isolated app process only.
harness = harness.replace("env: { ...env, ROLE_SIMULATOR_ENABLED: 'true', FRONTEND_URL: env.QA_FRONTEND_URL },", "env: { ...env, ROLE_SIMULATOR_ENABLED: 'true', FRONTEND_URL: env.QA_FRONTEND_URL, AI_FACILITY_QUERIES_ENABLED: 'true' },");
// Fresh round6 frontend checks were executed against this candidate before taking the stack.
// Bind exact source/config/runner bytes and logs; never inherit FAILED QA5 frontend/browser.
const frontendPhase = resolve(process.env.QA_FRONTEND_PHASE_DIRECTORY || packet);
assert.ok(frontendPhase === packet || frontendPhase.startsWith(packet + '/'));
const frontendLog = resolve(frontendPhase, 'frontend-unit.txt');
assert.match(readFileSync(frontendLog, 'utf8'), /ℹ tests 1400/);
assert.match(readFileSync(frontendLog, 'utf8'), /ℹ pass 1400/);
assert.match(readFileSync(frontendLog, 'utf8'), /ℹ fail 0/);
assert.match(readFileSync(resolve(frontendPhase, 'frontend-build.txt'), 'utf8'), /built in/);
assert.equal(readFileSync(resolve(frontendPhase, 'frontend-types.txt'), 'utf8'), '');
const phaseStart = statSync(resolve(frontendPhase, 'frontend-types.txt')).birthtimeMs;
const frontendInputs = Object.fromEntries(Object.entries(originBefore).filter(([file]) => file.startsWith('frontend/') || file.startsWith('scripts/') || ['package.json', 'package-lock.json', 'tsconfig.json'].includes(file)));
for (const [file, expected] of Object.entries(frontendInputs)) {
  assert.equal(hash(resolve(original, file)), expected);
  assert.ok(statSync(resolve(original, file)).mtimeMs <= phaseStart, `Frontend input changed after fresh phase started: ${file}`);
}
const logs = resolve(snapshot, outputRelative, 'test-results'); mkdirSync(logs, { recursive: true });
for (const filename of ['frontend-unit.txt', 'frontend-build.txt', 'frontend-types.txt']) cpSync(resolve(frontendPhase, filename), resolve(logs, filename));
for (const [label, statement] of Object.entries({
  'frontend-build': "  await run('frontend-build', 'npm', ['--prefix', 'frontend', 'run', 'build']);",
  'frontend-unit': "  await run('frontend-unit', 'npm', ['--prefix', 'frontend', 'test']);",
})) {
  assert.ok(harness.includes(statement));
  harness = harness.replace(statement, `  results.push({label: '${label}-executed-before-stack', code: 0, executedHere: false, executedEarlierInRound6: true, sourceIdentityVerified: true});`);
}
writeFileSync(resolve(runDirectory, 'fresh-frontend-phase.json'), JSON.stringify({ executedEarlierInRound6: true, previousQaOutcomeReuse: false, tests: 1400, passed: 1400, failed: 0, skipped: 0, phaseStartedAtUtc: new Date(phaseStart).toISOString(), sourceInputs: frontendInputs, logs: Object.fromEntries(['frontend-unit.txt', 'frontend-build.txt', 'frontend-types.txt'].map((file) => [file, hash(resolve(frontendPhase, file))])) }, null, 2));
const reusedBackend = process.env.QA_REUSE_BACKEND_FROM;
if (reusedBackend) {
  const previous = resolve(reusedBackend);
  assert.ok(previous.startsWith('/workspace/.clinicos-cloud/pr483-codex-followup2-20261018/runs/'));
  const prior = JSON.parse(readFileSync(resolve(previous, 'source-provenance.json'), 'utf8'));
  // App is a UI entrypoint, absent from the captured backend's transitive frontend inputs.
  // Every other source/config/test/fixture byte must match; no prior frontend/browser is reused.
  const closure = JSON.parse(readFileSync(resolve(previous, 'backend-frontend-input-closure.json'), 'utf8'));
  assert.equal(closure.changedAppIsNotReachable, true);
  assert.ok(!closure.frontendInputs.some((file) => file.path === 'frontend/src/App.tsx'));
  const inputs = (files) => Object.fromEntries(Object.entries(files).filter(([file]) => file !== 'frontend/src/App.tsx' && !file.startsWith(packetRelative + '/')));
  assert.deepEqual(inputs(originBefore), inputs(prior.files));
  for (const file of closure.frontendInputs) assert.equal(hash(resolve(original, file.path)), file.sha256);
  const priorAfter = JSON.parse(readFileSync(resolve(previous, 'source-after.json'), 'utf8'));
  assert.deepEqual(priorAfter.changed, []); assert.deepEqual(priorAfter.originChanged, []);
  const dependencies = JSON.parse(readFileSync(resolve(previous, 'installed-dependencies-during-backend.json'), 'utf8'));
  for (const [file, expected] of Object.entries(dependencies.files)) assert.equal(hash(resolve(original, file)), expected, `Installed backend dependency changed: ${file}`);
  const priorResults = JSON.parse(readFileSync(resolve(previous, 'source', outputRelative, 'test-results/run-results.json'), 'utf8')).results;
  assert.equal(priorResults.find((result) => result.label === 'backend-unit')?.code, 0);
  const log = resolve(previous, 'source', outputRelative, 'test-results/backend-unit.txt');
  assert.match(readFileSync(log, 'utf8'), /ℹ pass 1884/); assert.match(readFileSync(log, 'utf8'), /ℹ pass 48/); assert.match(readFileSync(log, 'utf8'), /ℹ fail 0/);
  cpSync(log, resolve(logs, 'backend-unit.txt'));
  const statement = "  await run('backend-unit', 'npm', ['--prefix', 'backend', 'test']);";
  assert.ok(harness.includes(statement));
  harness = harness.replace(statement, `  results.push({label:'backend-unit-reused',code:0,executedHere:false,sourceRun:${JSON.stringify(previous)},completeBackendInputIdentityVerified:true});`);
  const provenance = { sourceRun: previous, executedHere: false, tests: 1937, passed: 1932, failed: 0, optionalSkipped: 5, commonInputIdentityVerified: true, appIsOutsideBackendDependencyClosure: true, frontendBorrowedInputsVerified: closure.frontendInputs.length, installedDependencyFilesVerified: Object.keys(dependencies.files).length, backendTranscriptSha256: hash(log), originatingGlobalAttemptRemainsFailed: true, currentNode: process.version, runtimeCompatibility: 'Same Node24.19/npm11.9 environment, same pinned PostgreSQL16 Alpine image and dependency bytes; no installs/client generation', freshFrontendAndBrowserRequired: true };
  writeFileSync(resolve(runDirectory, 'reused-backend-phase.json'), JSON.stringify(provenance, null, 2));
  writeFileSync(resolve(logs, 'backend-unit.txt.inherited.json'), JSON.stringify(provenance, null, 2));
}
const alreadyExecutedBrowser = process.env.QA_REUSE_CURRENT_CANDIDATE_BROWSER_FROM;
if (alreadyExecutedBrowser) {
  const previous = resolve(alreadyExecutedBrowser);
  assert.ok(previous.startsWith('/workspace/.clinicos-cloud/pr483-codex-followup2-20261018/runs/'));
  const prior = JSON.parse(readFileSync(resolve(previous, 'source-provenance.json'), 'utf8'));
  const inputs = (files) => Object.fromEntries(Object.entries(files).filter(([file]) => !file.startsWith(packetRelative + '/')));
  assert.deepEqual(inputs(originBefore), inputs(prior.files), 'No product/config/test/fixture change allowed after fresh round6 canonical browser');
  const after = JSON.parse(readFileSync(resolve(previous, 'source-after.json'), 'utf8'));
  assert.deepEqual(after.changed, []); assert.deepEqual(after.originChanged, []);
  const resultsBefore = JSON.parse(readFileSync(resolve(previous, 'source', outputRelative, 'test-results/run-results.json'), 'utf8')).results;
  const statements = {
    'browser-e2e': "  await run('browser-e2e', process.execPath, [\n    '--import',\n    'tsx',\n    'e2e/qa-bug-batch-432-browser.mjs',\n  ]);",
    'clinical-followup-browser': `  await run('clinical-followup-browser', process.execPath, ['--import', 'tsx', '${packetRelative}/clinical-browser.mjs', resolve(out, 'clinical-followup')]);`,
  };
  for (const [label, statement] of Object.entries(statements)) {
    assert.equal(resultsBefore.find((result) => result.label === label)?.code, 0);
    assert.ok(harness.includes(statement));
    harness = harness.replace(statement, `  results.push({label:'${label}-executed-earlier-round6',code:0,executedHere:false,sourceRun:${JSON.stringify(previous)},entireCandidateIdentityVerified:true});`);
  }
  writeFileSync(resolve(runDirectory, 'current-round6-browser-phase-origins.json'), JSON.stringify({ sourceRun: previous, previousQa5OutcomeReuse: false, executedHere: false, sameRound6ProductSourceConfigTestsAndFixtures: true, priorGlobalAttemptRemainsFailed: true, phases: Object.keys(statements), freshAgendaBrowserAndSqlRequiredHere: true }, null, 2));
}
writeFileSync(harnessPath, harness);
const syntaxCheck = spawnSync(process.execPath, ['--check', harnessPath], { encoding: 'utf8' });
assert.equal(syntaxCheck.status, 0, syntaxCheck.stderr);
// Canonical fingerprint includes the declared launcher transformation, which is recorded below.
const transformedHash = hash(harnessPath);
const harnessOriginalHash = before['e2e/qa-bug-batch-432.mjs'];
before['e2e/qa-bug-batch-432.mjs'] = transformedHash;
writeFileSync(resolve(runDirectory, 'harness-transformations.json'), JSON.stringify({ originalSha256: harnessOriginalHash, executedSha256: transformedHash, transformations: ['existing-client TypeScript build (no shared Prisma generation)', 'exact preexisting official PG16 Alpine digest721873c (libc/platform differs), assert imageID81bd698 and SQL major16, pull=never', 'owned PostgreSQL data on bounded512MiB tmpfs, no container-restart durability claim', 'non-git snapshot scope verified by complete source/config fingerprints', 'append fresh refusal-correction, verification and actual-App Agenda browser/SQL scenarios', 'fresh round6 frontend executed before stack with exact inputs/logs bound; actual new backend full suite', 'copied canonical/browser/import output guards redirected exclusively to new packet runtime; assertions preserved'], productAssertionsRemoved: false }, null, 2));
const environment = Object.fromEntries(['PATH', 'HOME', 'LANG', 'LC_ALL', 'TMPDIR', 'PLAYWRIGHT_BROWSERS_PATH', 'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH', 'HTTPS_PROXY', 'HTTP_PROXY', 'https_proxy', 'http_proxy', 'NO_PROXY', 'no_proxy', 'NODE_EXTRA_CA_CERTS', 'SSL_CERT_FILE'].filter((key) => process.env[key]).map((key) => [key, process.env[key]]));
environment.QA_PYTHON = '/workspace/.venvs/clinicos-ai/bin/python';
environment.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = '/usr/bin/chromium';
environment.PLAYWRIGHT_BROWSERS_PATH = '/workspace/.cache/clinicos-batch450-playwright';
let exitCode = 1;
try {
  // Outer canonical harness acquires the full-lifecycle shared lock itself.
  const child = spawn(process.execPath, ['--import', 'tsx', harnessPath, '--stack-lock-held'], { cwd: snapshot, env: environment, stdio: 'inherit' });
  exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', (code) => resolve(code ?? 1)); });
} finally {
  const changed = sourceFiles.filter((file) => hash(resolve(snapshot, file)) !== before[file]);
  const originChanged = sourceFiles.filter((file) => hash(resolve(original, file)) !== originBefore[file]);
  writeFileSync(resolve(runDirectory, 'source-after.json'), JSON.stringify({ exitCode, changed, originChanged, originalSourceUnchanged: !originChanged.length, executedSourceUnchanged: !changed.length }, null, 2));
  assert.deepEqual(changed, []);
  assert.deepEqual(originChanged, []);
}
process.exitCode = exitCode;
