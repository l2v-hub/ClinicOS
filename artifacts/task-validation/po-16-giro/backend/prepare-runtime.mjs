import assert from 'node:assert/strict';
import { cp, mkdir, realpath, readFile, writeFile, lstat, symlink, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const expectedRoot = 'C:/Workspace/ClinicOSHouse-worktrees/po16-mna-backend';
const root = await realpath(process.cwd()), baseline = '53e57d694850775b85ad1d22904e7bb1e6e84618', branch = 'codex/po16-mna-presentation';
const artifact = resolve(root, 'artifacts/task-validation/po-16-giro/backend');
const previous = await realpath('C:/Workspace/ClinicOSHouse-worktrees/po15-catalog-backend');
const rootContracts = 'C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/artifacts/task-validation/po-16-giro';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, windowsHide: true, encoding: 'utf8' }).trim();
const names = output => output.split(/\r?\n/).filter(Boolean);
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const save = (name, value) => writeFile(resolve(artifact, name), JSON.stringify(value, null, 2) + '\n');
assert.equal(root, await realpath(expectedRoot));
assert.equal(git('rev-parse', 'HEAD'), baseline);
assert.equal(git('branch', '--show-current'), branch);
const sourceScope = ['backend/src', 'prisma', 'src', 'frontend/src', 'scripts', 'tests/fixtures',
  'backend/tsconfig.json', 'backend/package.json', 'package.json', 'package-lock.json', 'prisma.config.ts'];
for (const args of [['diff', 'HEAD', '--name-only', '--', ...sourceScope], ['ls-files', '--others', '--exclude-standard', '--', ...sourceScope]])
  assert.equal(git(...args), '', 'Application source must stay unchanged during preparation');
const files = async directory => {
  const result = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, item.name);
    assert(!item.isSymbolicLink(), 'Unexpected runtime link: ' + path);
    if (item.isDirectory()) result.push(...await files(path));
    else { assert(item.isFile()); result.push(path); }
  }
  return result;
};
const entries = async (base, paths) => Promise.all(paths.sort().map(async path => {
  const bytes = await readFile(path);
  return { path: relative(base, path).replaceAll('\\', '/'), bytes: bytes.length, sha256: hash(bytes) };
}));
const tree = rows => hash(rows.map(row => row.path + '\0' + row.sha256 + '\n').join(''));
const inputs = await entries(root, names(git('ls-files', '--', ...sourceScope)).map(path => resolve(root, path)));
const preserved = await Promise.all(['package.json', 'package-lock.json', 'backend/package.json', 'run-claude-queue.ps1', 'start-claude-team.ps1']
  .map(async path => ({ path, sha256: hash(await readFile(resolve(root, path))) })));
const wrapper = await json(resolve(artifact, 'claims-preparation.json'));
const claim = JSON.parse(wrapper.content.find(row => row.type === 'text').text).claim;
assert.equal(claim.issueId, 'PO-16-backend-preparation');
const contracts = [];
for (const [original, snapshot, expected] of [
  ['task-contract.md', 'task-contract.snapshot.md', 'd182b01333d1c31e5f571fe0598888f2268007c46cbd222c9c776c86f9e600d3'],
  ['rifiniture-osservate.md', 'rifiniture-osservate.snapshot.md', '676bb022dcbdf2e031827cdd6c634fb67af9c7c18d473b453da66e041e52b6a6'],
]) {
  const bytes = await readFile(resolve(rootContracts, original));
  assert.equal(hash(bytes), expected, original);
  await writeFile(resolve(artifact, snapshot), bytes);
  contracts.push({ original: resolve(rootContracts, original), snapshot, sha256: expected, byteIdentical: true });
}
const localContract = await readFile(resolve(root, 'artifacts/task-validation/po-16-giro/task-contract.md'), 'utf8');
assert.equal(localContract.replace(/\r\n/g, '\n'), (await readFile(resolve(artifact, 'task-contract.snapshot.md'), 'utf8')).replace(/\r\n/g, '\n'));
await save('preparation-session.json', { task: 'PO16-backend-preparation', startedAt: new Date().toISOString(), root, branch, baseline,
  decision: 'allow private runtime and contract preparation only; application work awaits root GO after PO15 verified live',
  claim, sourceTreeSha256: tree(inputs), preserved, contracts, implementationAuthorized: false, publicationAuthorized: false });
const inside = async path => {
  const actual = await realpath(path), child = relative(root, actual);
  assert(!child.startsWith('..') && !isAbsolute(child), 'Private path required: ' + path);
  return actual;
};
const exists = path => lstat(path).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; });
const junction = async (target, path) => {
  const actual = await realpath(target);
  if (await exists(path)) assert.equal(await realpath(path), actual, path);
  else await symlink(actual, path, 'junction');
  return actual;
};
const shared = await junction(resolve(previous, 'node_modules'), resolve(root, 'node_modules'));
for (const path of ['backend/node_modules', 'backend/node_modules/@prisma', 'backend/node_modules/.prisma', 'backend/node_modules/@pdf-lib']) {
  await mkdir(resolve(root, path), { recursive: true }); await inside(resolve(root, path));
}
const previousRuntime = (await json(resolve(previous, 'artifacts/task-validation/po-15-catalogo/backend/preparation-receipt.json'))).runtime;
const copyPrivate = async (part, expected) => {
  const source = await realpath(resolve(previous, part)), child = relative(previous, source);
  assert(!child.startsWith('..') && !isAbsolute(child), 'Source runtime must be private');
  const sourceEntries = await entries(source, await files(source));
  assert.deepEqual(sourceEntries, expected.files, 'PO15 verified runtime changed');
  const target = resolve(root, part);
  if (!(await exists(target))) await cp(source, target, { recursive: true, dereference: false, errorOnExist: true, force: false });
  await inside(target);
  const targetEntries = await entries(target, await files(target));
  assert.deepEqual(targetEntries, sourceEntries, 'Runtime copy differs: ' + part);
  return { source, target, treeSha256: tree(targetEntries), files: targetEntries };
};
const privateWrapper = await copyPrivate('backend/node_modules/@prisma/client', previousRuntime.privateWrapper);
const privateGeneratedClient = await copyPrivate('backend/node_modules/.prisma/client', previousRuntime.privateGeneratedClient);
const pdf = await junction(resolve(previous, 'backend/node_modules/pdf-lib'), resolve(root, 'backend/node_modules/pdf-lib'));
const fontkit = await junction(resolve(previous, 'backend/node_modules/@pdf-lib/fontkit'), resolve(root, 'backend/node_modules/@pdf-lib/fontkit'));
const sourceSchema = await readFile(resolve(root, 'prisma/schema.prisma'), 'utf8');
const generatedSchema = await readFile(resolve(privateGeneratedClient.target, 'schema.prisma'), 'utf8');
const normalize = value => value.replace(/^\s*output\s*=.*$/m, '').replace(/\r\n/g, '\n')
  .split('\n').map(line => line.trim().replace(/[ \t]+/g, ' ')).filter(Boolean).join('\n')
  .replace('@@index([patientId])\n@@unique([assessmentId, patientId])', '@@unique([assessmentId, patientId])\n@@index([patientId])');
assert.equal(normalize(sourceSchema), normalize(generatedSchema), 'Copied runtime schema differs from baseline');
const req = createRequire(resolve(root, 'backend/package.json'));
const clientPath = await realpath(req.resolve('@prisma/client'));
assert(clientPath.startsWith(await realpath(privateWrapper.target)));
const { Prisma } = req('@prisma/client');
assert(Prisma.dmmf.datamodel.models.some(model => model.name === 'PatientAssessmentAttestation'));
for (const row of preserved) assert.equal(hash(await readFile(resolve(root, row.path))), row.sha256, row.path);
const after = await entries(root, names(git('ls-files', '--', ...sourceScope)).map(path => resolve(root, path)));
assert.equal(tree(inputs), tree(after));
await save('preparation-source-manifest.json', { baseline, sourceTreeSha256: tree(inputs), inputs });
await save('contract-provenance.json', { contracts, assignedWorktreeContractUnchanged: true, assignedWorktreeContractMatchesAfterCrlfNormalization: true,
  backendContract: { path: 'backend-contract.md', sha256: hash(await readFile(resolve(artifact, 'backend-contract.md'))), status: 'preparatory agreement; freeze at preparation handoff' } });
await save('preparation-receipt.json', {
  task: 'PO16-backend-preparation', phase: 'private-runtime-ready-awaiting-contract-freeze-and-implementation-go', preparedAt: new Date().toISOString(),
  worktree: root, branch, baseline, decision: 'allow private runtime preparation; application implementation not authorized',
  sourceTreeSha256: tree(inputs), sourceUnchanged: true, preserved, contracts,
  runtime: { readOnlyShared: shared, readOnlyByPolicy: true, privateWrapper, privateGeneratedClient,
    pdfReadOnly: pdf, fontkitReadOnly: fontkit, clientPath, nodeVersion: process.version, prismaVersion: Prisma.prismaVersion,
    schemaSha256: hash(sourceSchema), generatedSchemaSha256: hash(generatedSchema), baselineSchemaMatches: true,
    comparison: 'Ignore generator output path, formatting whitespace and adjacent PatientDocument unique/index order only.',
    generationPerformed: false, databaseConnected: false, sharedRuntimeWritten: false },
  implementationAuthorized: false, publicationAuthorized: false, applicationTestsRun: false,
  limitations: ['No PO16 application change or test, runtime generation, dependency installation, database connection or deployment.',
    'Contract agreement is preparatory; root must issue explicit GO after verified PO15 live before implementation.']
});
console.log(JSON.stringify({ prepared: true, root, sourceTreeSha256: tree(inputs), sourceInputs: inputs.length, privateClient: clientPath,
  generationPerformed: false, applicationSourceUnchanged: true }));
