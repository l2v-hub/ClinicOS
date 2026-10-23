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
assert.ok(runDirectory.startsWith('/workspace/.clinicos-cloud/pr483-codex-followup-20261018/runs/'));
if (!process.argv.includes('--followup-lock-held')) {
  const locked = spawn('flock', ['/tmp/clinicos-browser-qa.lock', process.execPath, '--import', 'tsx', fileURLToPath(import.meta.url), runDirectory, '--followup-lock-held'], { stdio: 'inherit', env: process.env });
  const status = await new Promise((resolve, reject) => { locked.once('error', reject); locked.once('exit', (code) => resolve(code ?? 1)); });
  process.exit(status);
}
console.log('PR483 owned full-lifecycle lock acquired before source snapshot.');
assert.equal(existsSync(runDirectory), false, 'Use a fresh invocation directory; failed proof is immutable');
mkdirSync(runDirectory, { recursive: true });
const reuse = process.env.QA_REUSE_SNAPSHOT;
const snapshot = reuse ? resolve(reuse) : resolve(runDirectory, 'source');
assert.ok(snapshot.startsWith('/workspace/.clinicos-cloud/pr483-codex-followup-20261018/runs/'));
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
for (const file of ['task-contract.md', 'implementation-matrix.md', 'scope-amendment-1.md', 'clinical-browser.mjs', 'run-author.mjs']) cpSync(resolve(packet, file), resolve(snapshot, packetRelative, file));
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
writeFileSync(resolve(runDirectory, 'source-provenance.json'), JSON.stringify({ original, snapshot, baseSha: '34c865233df53a3930f29c8b7befc02208588d64', files: before }, null, 2));
const originalPlan = JSON.parse(readFileSync(resolve(original, 'artifacts/task-validation/bug-batch-432/plan-proposal.json'), 'utf8'));
originalPlan.groups[0].scope = sourceFiles;
writeFileSync(resolve(snapshot, 'artifacts/task-validation/bug-batch-432/plan-proposal.json'), JSON.stringify(originalPlan, null, 2));
const harnessPath = resolve(snapshot, 'e2e/qa-bug-batch-432.mjs');
let harness = readFileSync(harnessPath, 'utf8');
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
harness = harness.replace(browserEnd, browserEnd + `\n  await run('clinical-followup-browser', process.execPath, ['--import', 'tsx', '${packetRelative}/clinical-browser.mjs', resolve(out, 'clinical-followup')]);`);
// Browser assistant uses its documented facility read flag in this isolated app process only.
harness = harness.replace("env: { ...env, ROLE_SIMULATOR_ENABLED: 'true', FRONTEND_URL: env.QA_FRONTEND_URL },", "env: { ...env, ROLE_SIMULATOR_ENABLED: 'true', FRONTEND_URL: env.QA_FRONTEND_URL, AI_FACILITY_QUERIES_ENABLED: 'true' },");
const reusedPhases = process.env.QA_REUSE_VERIFIED_PHASES;
if (reusedPhases) {
  const priorRun = resolve(reusedPhases);
  assert.ok(priorRun.startsWith('/workspace/.clinicos-cloud/pr483-codex-followup-20261018/runs/'));
  const prior = JSON.parse(readFileSync(resolve(priorRun, 'source-provenance.json'), 'utf8'));
  for (const [file, expected] of Object.entries(prior.files)) {
    if ((file.startsWith('frontend/') || file.startsWith('backend/') || file.startsWith('prisma/') || file.startsWith('scripts/build/') || ['package.json', 'package-lock.json', 'prisma.config.ts', 'tsconfig.json'].includes(file)) && !(file.startsWith('backend/') && file.endsWith('.test.ts')))
      assert.equal(hash(resolve(original, file)), expected, `Cannot reuse build/frontend phase after source change: ${file}`);
  }
  const priorResults = JSON.parse(readFileSync(resolve(priorRun, 'runtime-packet/test-results/run-results.json'), 'utf8')).results;
  const statements = {
    'backend-build': "  await run('backend-build', process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'backend/tsconfig.json']);",
    'backend-font-assets': "  await run('backend-font-assets', process.execPath, ['scripts/build/copy-assessment-fonts.mjs']);",
    'frontend-build': "  await run('frontend-build', 'npm', ['--prefix', 'frontend', 'run', 'build']);",
    'frontend-unit': "  await run('frontend-unit', 'npm', ['--prefix', 'frontend', 'test']);",
  };
  for (const [label, statement] of Object.entries(statements)) {
    assert.equal(priorResults.find((result) => result.label === label)?.code, 0, `Prior phase was not PASS: ${label}`);
    assert.ok(harness.includes(statement));
    harness = harness.replace(statement, `  results.push({label: '${label}-reused', code: 0, executedHere: false, sourceRun: ${JSON.stringify(priorRun)}, sourceIdentityVerified: true});`);
  }
  writeFileSync(resolve(runDirectory, 'reused-phase-provenance.json'), JSON.stringify({ sourceRun: priorRun, phases: Object.keys(statements), exactFrontendAndBuildInputsUnchanged: true, actualNewBackendSuiteRequired: true }, null, 2));
}
const reusedBackend = process.env.QA_REUSE_VERIFIED_BACKEND;
if (reusedBackend) {
  const priorRun = resolve(reusedBackend);
  assert.ok(priorRun.startsWith('/workspace/.clinicos-cloud/pr483-codex-followup-20261018/runs/'));
  const prior = JSON.parse(readFileSync(resolve(priorRun, 'source-provenance.json'), 'utf8'));
  // Compare every copied source/config/test/fixture input, including root configuration and
  // negative tests. Only the versioned execution packet changes to declare phase reuse.
  const inputs = (files) => Object.fromEntries(Object.entries(files).filter(([file]) => !file.startsWith(packetRelative + '/')));
  assert.deepEqual(inputs(before), inputs(prior.files), 'Cannot reuse backend suite after any code/config/test/fixture change');
  const priorAfter = JSON.parse(readFileSync(resolve(priorRun, 'source-after.json'), 'utf8'));
  assert.deepEqual(priorAfter.changed, []);
  assert.deepEqual(priorAfter.originChanged, []);
  const priorResults = JSON.parse(readFileSync(resolve(priorRun, 'runtime-packet/test-results/run-results.json'), 'utf8')).results;
  assert.equal(priorResults.find((result) => result.label === 'backend-unit')?.code, 0);
  // The unchanged canonical browser summary reads this exact suite transcript. Retain its
  // original bytes and identify its origin; do not fabricate a newly executed transcript.
  const inheritedLog = resolve(priorRun, 'runtime-packet/test-results/backend-unit.txt');
  const inheritedTarget = resolve(snapshot, 'artifacts/task-validation/bug-batch-432/test-results/backend-unit.txt');
  mkdirSync(dirname(inheritedTarget), { recursive: true });
  cpSync(inheritedLog, inheritedTarget);
  writeFileSync(inheritedTarget + '.inherited.json', JSON.stringify({ sourceRun: priorRun, sha256: hash(inheritedLog), executedHere: false, wholeSourceIdentityVerified: true }, null, 2));
  const statement = "  await run('backend-unit', 'npm', ['--prefix', 'backend', 'test']);";
  assert.ok(harness.includes(statement));
  harness = harness.replace(statement, `  results.push({label: 'backend-unit-reused', code: 0, executedHere: false, sourceRun: ${JSON.stringify(priorRun)}, sourceIdentityVerified: true});`);
  writeFileSync(resolve(runDirectory, 'reused-backend-provenance.json'), JSON.stringify({ sourceRun: priorRun, entireCodeConfigTestsAndFixturesUnchanged: true, originalAndExecutedSourceUnchanged: true, executedHere: false, tests: 1937, passed: 1932, failed: 0, optionalSkipped: 5, newMigrationImportBrowserAndSqlRequired: true }, null, 2));
}
const reusedBrowser = process.env.QA_REUSE_VERIFIED_BROWSER;
if (reusedBrowser) {
  const priorRun = resolve(reusedBrowser);
  assert.ok(priorRun.startsWith('/workspace/.clinicos-cloud/pr483-codex-followup-20261018/runs/'));
  const prior = JSON.parse(readFileSync(resolve(priorRun, 'source-provenance.json'), 'utf8'));
  const inputs = (files) => Object.fromEntries(Object.entries(files).filter(([file]) => !file.startsWith(packetRelative + '/')));
  assert.deepEqual(inputs(before), inputs(prior.files), 'Cannot reuse canonical browser after code/config/test/fixture change');
  const priorAfter = JSON.parse(readFileSync(resolve(priorRun, 'source-after.json'), 'utf8'));
  assert.deepEqual(priorAfter.changed, []);
  assert.deepEqual(priorAfter.originChanged, []);
  const priorResults = JSON.parse(readFileSync(resolve(priorRun, 'runtime-packet/test-results/run-results.json'), 'utf8')).results;
  assert.equal(priorResults.find((result) => result.label === 'browser-e2e')?.code, 0);
  const statement = "  await run('browser-e2e', process.execPath, [\n    '--import',\n    'tsx',\n    'e2e/qa-bug-batch-432-browser.mjs',\n  ]);";
  assert.ok(harness.includes(statement));
  harness = harness.replace(statement, `  results.push({label: 'browser-e2e-reused', code: 0, executedHere: false, sourceRun: ${JSON.stringify(priorRun)}, sourceIdentityVerified: true});`);
  writeFileSync(resolve(runDirectory, 'reused-browser-provenance.json'), JSON.stringify({ sourceRun: priorRun, entireCodeConfigTestsAndFixturesUnchanged: true, originalAndExecutedSourceUnchanged: true, executedHere: false, originalSevenIssueAssertionsRetained: true, dedicatedClinicalBrowserAndSqlExecuteHere: true, harnessSetupDifference: 'Authenticate at root before patient deep link; actual Milo accessible name; preserve original error', browserCacheDifference: 'Explicit preexisting PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/clinicos-batch450-playwright' }, null, 2));
}
writeFileSync(harnessPath, harness);
const syntaxCheck = spawnSync(process.execPath, ['--check', harnessPath], { encoding: 'utf8' });
assert.equal(syntaxCheck.status, 0, syntaxCheck.stderr);
// Canonical fingerprint includes the declared launcher transformation, which is recorded below.
const transformedHash = hash(harnessPath);
const harnessOriginalHash = before['e2e/qa-bug-batch-432.mjs'];
before['e2e/qa-bug-batch-432.mjs'] = transformedHash;
writeFileSync(resolve(runDirectory, 'harness-transformations.json'), JSON.stringify({ originalSha256: harnessOriginalHash, executedSha256: transformedHash, transformations: ['existing-client TypeScript build (no shared Prisma generation)', 'exact preexisting official PG16 Alpine digest721873c (libc/platform differs), assert imageID81bd698 and SQL major16, pull=never', 'owned PostgreSQL data on bounded512MiB tmpfs, no container-restart durability claim', 'non-git snapshot scope verified by complete source/config fingerprints', 'append focused refusal-correction and verification browser/SQL scenario', 'isolated browser app enables documented facility-query flag; optional exact-source passed-build/frontend reuse recorded separately'], productAssertionsRemoved: false }, null, 2));
const environment = Object.fromEntries(['PATH', 'HOME', 'LANG', 'LC_ALL', 'TMPDIR', 'PLAYWRIGHT_BROWSERS_PATH', 'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH', 'HTTPS_PROXY', 'HTTP_PROXY', 'https_proxy', 'http_proxy', 'NO_PROXY', 'no_proxy', 'NODE_EXTRA_CA_CERTS', 'SSL_CERT_FILE'].filter((key) => process.env[key]).map((key) => [key, process.env[key]]));
environment.QA_PYTHON = '/workspace/.venvs/clinicos-ai/bin/python';
environment.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = '/usr/bin/chromium';
let exitCode = 1;
try {
  // Outer canonical harness acquires the full-lifecycle shared lock itself.
  const child = spawn(process.execPath, ['--import', 'tsx', harnessPath, '--stack-lock-held'], { cwd: snapshot, env: environment, stdio: 'inherit' });
  exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', (code) => resolve(code ?? 1)); });
} finally {
  const changed = sourceFiles.filter((file) => hash(resolve(snapshot, file)) !== before[file]);
  const originChanged = sourceFiles.filter((file) => hash(resolve(original, file)) !== (file === 'e2e/qa-bug-batch-432.mjs' ? harnessOriginalHash : before[file]));
  writeFileSync(resolve(runDirectory, 'source-after.json'), JSON.stringify({ exitCode, changed, originChanged, originalSourceUnchanged: !originChanged.length, executedSourceUnchanged: !changed.length }, null, 2));
  assert.deepEqual(changed, []);
  assert.deepEqual(originChanged, []);
}
process.exitCode = exitCode;
