import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = process.cwd(), folder = resolve('artifacts/task-validation/po-16-giro/backend');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async name => JSON.parse(await readFile(resolve(folder, name), 'utf8'));
const save = (name, value) => writeFile(resolve(folder, name), JSON.stringify(value, null, 2) + '\n');
const git = (...args) => execFileSync('git', args, { cwd: root, windowsHide: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const names = value => value.split(/\r?\n/).filter(Boolean);
const entries = async paths => Promise.all([...new Set(paths)].sort().map(async path => { const bytes = await readFile(resolve(root, path)); return { path, bytes: bytes.length, sha256: sha(bytes) }; }));
const tree = rows => sha(rows.map(row => row.path + '\0' + row.sha256 + '\n').join(''));
const session = await json('implementation-session.json');
assert.equal(git('rev-parse', 'HEAD'), session.baseline); assert.equal(git('branch', '--show-current'), session.branch);
const scope = ['backend/src', 'prisma', 'src', 'frontend/src', 'scripts', 'tests/fixtures', 'backend/tsconfig.json', 'backend/package.json', 'package.json', 'package-lock.json', 'prisma.config.ts'];
const inputs = await entries(names(git('ls-files', '--cached', '--others', '--exclude-standard', '--', ...scope)));
const current = await json('cwd-test-source-manifest.json'), previous = await json('pre-utc-test-source-manifest.json');
assert.equal(tree(inputs), current.treeSha256);
assert.deepEqual(inputs.map(({ path, sha256 }) => ({ path, sha256 })), current.inputs);
const changedTest = 'backend/src/assessments/__tests__/mna-presentation-db.test.ts';
const differences = current.inputs.filter(row => previous.inputs.find(old => old.path === row.path)?.sha256 !== row.sha256);
assert.deepEqual(differences.map(row => row.path), [changedTest]);
const priorTests = await json('pre-utc-focused-tests.json'), currentTests = await json('cwd-focused-tests.json');
for (const tests of [priorTests, currentTests]) assert(tests.databaseClosed && tests.sourceUnchanged && tests.results.every(row => row.exitCode === 0));
assert.equal(priorTests.results.reduce((n, row) => n + row.tests, 0), 15);
assert.equal(currentTests.results.reduce((n, row) => n + row.tests, 0), 3);
const results = [];
for (const [name, command, args] of [
  ['typecheck', process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'backend/tsconfig.json', '--noEmit']],
  ['diff-check', 'git', ['diff', '--check', '--', 'backend/src', 'prisma']],
]) {
  const result = spawnSync(command, args, { cwd: root, windowsHide: true, encoding: 'utf8' });
  await writeFile(resolve(folder, name + '.log'), (result.stdout ?? '') + (result.stderr ?? ''));
  results.push({ name, command: [command, ...args], exitCode: result.status });
  assert.equal(result.status, 0, name);
}
const paths = await entries([...names(git('diff', 'HEAD', '--name-only', '--', 'backend/src', 'prisma')), ...names(git('ls-files', '--others', '--exclude-standard', '--', 'backend/src', 'prisma'))]);
assert.equal(paths.length, 4);
assert.deepEqual(paths.map(row => row.path), [changedTest, 'backend/src/assessments/__tests__/mna-pdf-db.test.ts', 'backend/src/assessments/mna-pdf-content.ts', 'backend/src/assessments/pdf-renderer.ts'].sort());
assert.equal(tree(await entries(inputs.map(row => row.path))), tree(inputs));
for (const row of session.preserved) assert.equal(sha(await readFile(resolve(root, row.path))), row.sha256);
await save('validation-checks.json', { completedAt: new Date().toISOString(), sourceTreeSha256: tree(inputs), sourceUnchanged: true, results,
  compiledBuildRunByWorker: false, buildOwner: '/root final integration', schemaChanged: false, migrationChanged: false, dependencyManifestsChanged: false,
  preservedFiles: session.preserved, clinicalScoringSnapshotAndFontSourcesUnchanged: true });
await save('consolidated-tests.json', { passed: 15, failed: 0, files: 5, databaseClosed: true,
  currentInputTreeSha256: current.treeSha256, priorInputTreeSha256: previous.treeSha256,
  currentRun: 'cwd-focused-tests.json', currentTestFiles: [changedTest], priorRun: 'pre-utc-focused-tests.json',
  priorTestFiles: priorTests.results.filter(row => row.file !== changedTest).map(row => row.file),
  priorProductionAndOtherTestInputsByteIdentical: true, onlyInputChangedBetweenGreenRuns: changedTest,
  reason: 'Only the historical fixture setup/read gained the production UTC transaction convention after the 15-test green run; the corrected 3-test file passed again from backend cwd. No repeated broad regression suite.',
});
const source = { task: 'PO-16-backend', root, branch: session.branch, baseline: session.baseline, capturedAt: new Date().toISOString(),
  sourceTreeSha256: tree(paths), inputTreeSha256: tree(inputs), hashAlgorithm: 'SHA256 over sorted path + NUL + byte-SHA256 + LF', sourcePaths: paths,
  testedInputBindings: 'consolidated-tests.json', excludedUnrelatedDirtyPaths: ['run-claude-queue.ps1', 'start-claude-team.ps1'] };
await save('source-manifest.json', source);
console.log(JSON.stringify({ sourceFrozen: true, sourceFiles: paths.length, inputs: inputs.length, inputTreeSha256: source.inputTreeSha256,
  sourceTreeSha256: source.sourceTreeSha256, sourceManifestSha256: sha(await readFile(resolve(folder, 'source-manifest.json'))), passed: 15 }));
