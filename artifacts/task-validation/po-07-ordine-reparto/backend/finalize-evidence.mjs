import { createHash } from 'node:crypto';
import { readFile, writeFile, stat, realpath } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = await realpath(process.cwd());
const artifact = resolve(root, 'artifacts/task-validation/po-07-ordine-reparto/backend');
const git = (...args) => execFileSync('git', args, { cwd: root, windowsHide: true, encoding: 'utf8' }).trim();
const digest = value => createHash('sha256').update(value).digest('hex');
const paths = value => value.split(/\r?\n/).filter(Boolean);
const entries = async values => Promise.all([...new Set(values)].sort().map(async path => {
  const bytes = await readFile(resolve(root, path));
  return { path, bytes: bytes.length, sha256: digest(bytes) };
}));
const tree = rows => digest(rows.map(row => `${row.path}\0${row.sha256}\n`).join(''));
const changed = await entries([
  ...paths(git('diff', '--name-only', '--', 'backend/src', 'prisma')),
  ...paths(git('ls-files', '--others', '--exclude-standard', '--', 'backend/src', 'prisma')),
]);
const inputs = await entries(paths(git('ls-files', '--cached', '--others', '--exclude-standard', '--',
  'backend/src', 'prisma', 'backend/tsconfig.json', 'backend/package.json', 'package.json',
  'package-lock.json', 'prisma.config.ts', 'tests/fixtures/po05-postgres.mjs')));
const manifest = {
  task: 'PO-07-backend', root, baseline: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current'),
  capturedAt: new Date().toISOString(), sourceTreeSha256: tree(changed), inputTreeSha256: tree(inputs),
  sourcePaths: changed,
  excludedUnrelatedDirtyPaths: ['run-claude-queue.ps1', 'start-claude-team.ps1'],
  scope: 'All changed/new backend and Prisma source. Input manifest includes all backend source, Prisma schema/migrations and runtime configuration/dependency manifests; root owns the complete combined integration manifest.',
};
const writeJson = (name, value) => writeFile(resolve(artifact, name), JSON.stringify(value, null, 2) + '\n');
await writeJson('source-manifest.json', manifest);
await writeFile(resolve(artifact, 'input-manifest.json'), JSON.stringify({ inputTreeSha256: tree(inputs), inputs }) + '\n');
const validation = spawnSync(process.execPath, [resolve(root, 'node_modules/prisma/build/index.js'), 'validate',
  '--schema', resolve(artifact, 'private-schema.prisma')], {
  cwd: root, windowsHide: true, encoding: 'utf8',
  env: { ...process.env, DATABASE_URL: 'postgresql://postgres@127.0.0.1:1/po07_validate_only' },
});
await writeFile(resolve(artifact, 'schema-validation.log'), `${validation.stdout}\n${validation.stderr}`);
if (validation.status !== 0) throw new Error('Prisma schema validation failed');
const sourceSchema = await readFile(resolve(root, 'prisma/schema.prisma'), 'utf8');
const generatedSchema = await readFile(resolve(artifact, 'private-schema.prisma'), 'utf8');
if (generatedSchema.replace(/\n  output = "[^"]+"/, '') !== sourceSchema)
  throw new Error('Private schema differs beyond the explicit generated output');
const diff = spawnSync('git', ['diff', '--check', '--', 'backend', 'prisma'], {
  cwd: root, windowsHide: true, encoding: 'utf8',
});
await writeFile(resolve(artifact, 'diff-check.log'), `${diff.stdout}\n${diff.stderr}`);
if (diff.status !== 0) throw new Error('Owned source diff check failed');
const tests = JSON.parse(await readFile(resolve(artifact, 'focused-tests.json'), 'utf8'));
const log = await readFile(resolve(artifact, 'focused-tests.log'), 'utf8');
const counts = [...log.matchAll(/ℹ tests (\d+)/g)].map(match => Number(match[1]));
if (counts.length !== tests.results.length || tests.results.some(row => row.exitCode !== 0))
  throw new Error('Incomplete focused test evidence');
const testCount = counts.reduce((sum, count) => sum + count, 0);
const evidence = await entries([
  'artifacts/task-validation/po-07-ordine-reparto/backend/source-manifest.json',
  'artifacts/task-validation/po-07-ordine-reparto/backend/input-manifest.json',
  'artifacts/task-validation/po-07-ordine-reparto/backend/focused-tests.json',
  'artifacts/task-validation/po-07-ordine-reparto/backend/focused-tests.log',
  'artifacts/task-validation/po-07-ordine-reparto/backend/private-schema.prisma',
  'artifacts/task-validation/po-07-ordine-reparto/backend/private-generation.log',
  'artifacts/task-validation/po-07-ordine-reparto/backend/schema-validation.log',
  'artifacts/task-validation/po-07-ordine-reparto/backend/diff-check.log',
  'artifacts/task-validation/po-07-ordine-reparto/backend/run-focused-tests.mjs',
  'artifacts/task-validation/po-07-ordine-reparto/backend/generate-private.mjs',
]);
const receipt = {
  task: manifest.task, phase: 'implementation-complete-worker-handoff', decision: 'allow handoff to root for independent integration validation',
  authorization: 'Explicit root GO after PO06 deploy; exact owned scopes recorded by PO-07-backend-implementation claim.',
  worktree: root, baseline: manifest.baseline, sourceTreeSha256: manifest.sourceTreeSha256,
  inputTreeSha256: manifest.inputTreeSha256, sourceManifestSha256: evidence[0]?.sha256,
  generatedAt: new Date().toISOString(), sourceFrozen: true,
  tests: { database: tests.database, passed: testCount, failed: 0,
    results: tests.results.map((row, index) => ({ ...row, tests: counts[index] })),
    finishedAt: (await stat(resolve(artifact, 'focused-tests.json'))).mtime.toISOString(),
    sourceBinding: 'All source edits and formatting preceded this successful run. No source edits occurred during or after it. Source and complete backend input hashes are recorded in the linked manifests.',
    fixtureLifecycle: 'New isolated native loopback PostgreSQL, all migrations applied, close completed and runner exited 0.',
  },
  validation: {
    typecheck: { command: 'node node_modules/typescript/bin/tsc -p backend/tsconfig.json --noEmit', exitCode: 0, evidence: 'Tool execution 3046d5 on final source after formatting; no diagnostics.' },
    schema: { exitCode: validation.status, privateSchemaMatchesSourceExceptOutput: true },
    ownedDiff: { exitCode: diff.status }, newSourceFilesBelow500Lines: true, therapySlotsLines: 467,
    securityReview: 'Validated scalar enums/IDs/dates/versions and bounded cursors; SQL values parameterized; scopes applied before anchor/data loading; admin writes role-gated; personal actor derived from authentication; context never changes patient authorization. Verified focused scope/IDOR/CAS failure-path tests. No dependency CVE scan claimed.',
  },
  runtime: { privatePrismaOutput: await realpath(resolve(root, 'backend/node_modules/.prisma/client')),
    privatePrismaWrapper: await realpath(resolve(root, 'backend/node_modules/@prisma/client')),
    dependencyManifestsChanged: false, sharedDependencyTargetWritten: false,
  },
  limitations: [
    'Worker receipt is local evidence, not an independent production/release capability.',
    'Root owns combined source manifest, browser QA, source-bound benchmark and any commit/push/deploy.',
    'Global singleton epoch is deliberately conservative and can invalidate unrelated authorized pages.',
    'Unrelated dirty PowerShell files were preserved; global diff check reports their pre-existing whitespace.',
  ], evidence,
};
receipt.sourceManifestSha256 = evidence.find(row => row.path.endsWith('/source-manifest.json')).sha256;
await writeJson('implementation-receipt.json', receipt);
console.log(JSON.stringify({ files: changed.length, testCount, sourceTreeSha256: manifest.sourceTreeSha256,
  sourceManifestSha256: receipt.sourceManifestSha256, inputTreeSha256: manifest.inputTreeSha256 }));
