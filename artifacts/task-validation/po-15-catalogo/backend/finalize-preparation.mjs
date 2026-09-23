import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = 'C:/Workspace/ClinicOSHouse-worktrees/po15-catalog-backend';
const folder = 'artifacts/task-validation/po-15-catalogo/backend', artifact = resolve(root, folder);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async name => JSON.parse(await readFile(resolve(artifact, name), 'utf8'));
const save = (name, value) => writeFile(resolve(artifact, name), JSON.stringify(value, null, 2) + '\n');
const git = (...args) => execFileSync('git', args, { cwd: root, windowsHide: true, encoding: 'utf8' }).trim();
const receipt = await json('preparation-receipt.json'), session = await json('preparation-session.json');
assert.equal(git('rev-parse', 'HEAD'), receipt.baseline);
assert.equal(git('branch', '--show-current'), receipt.branch);
assert.equal(receipt.baseline, 'f445260a4ca4de872c1361ff19fc215179b097fe');
for (const row of session.preserved) assert.equal(sha(await readFile(resolve(root, row.path))), row.sha256, row.path);
const manifest = await json('preparation-source-manifest.json');
assert.equal(manifest.inputs.length, 1082);
for (const row of manifest.inputs) assert.equal(sha(await readFile(resolve(root, row.path))), row.sha256, row.path);
assert.equal(sha(manifest.inputs.map(row => `${row.path}\0${row.sha256}\n`).join('')), receipt.sourceTreeSha256);
const scopes = ['backend/src', 'prisma', 'src', 'frontend/src', 'scripts', 'tests/fixtures', 'backend/tsconfig.json', 'backend/package.json', 'package.json', 'package-lock.json', 'prisma.config.ts'];
for (const args of [['diff', 'HEAD', '--name-only', '--', ...scopes], ['ls-files', '--others', '--exclude-standard', '--', ...scopes]]) assert.equal(git(...args), '');
for (const runtime of [receipt.runtime.privateWrapper, receipt.runtime.privateGeneratedClient])
  for (const row of runtime.files) assert.equal(sha(await readFile(resolve(runtime.target, row.path))), row.sha256, row.path);
for (const row of receipt.contracts) assert.equal(sha(await readFile(resolve(artifact, row.snapshot))), row.sha256, row.snapshot);
const contractSha256 = sha(await readFile(resolve(artifact, 'backend-contract.md')));
assert.equal(contractSha256, '02f5a046ca85531902744136ae2534f782abb14136fb3b0cb78cf219ead09e23');
const agreement = await json('frontend-agreement.json'), decisions = await json('root-decisions.json');
assert(agreement.agreed && agreement.backendContractSha256 === contractSha256);
assert(decisions.implementationGoReceived && !decisions.publicationAuthorizedToWorker);
assert(!receipt.applicationTestsRun && !receipt.runtime.generationPerformed && !receipt.runtime.databaseConnected && !receipt.runtime.sharedRuntimeWritten);
const base = ['claims-preparation.json', 'preparation-recall.json', 'prepare-runtime.mjs', 'finalize-preparation.mjs',
  'preparation-session.json', 'preparation-source-manifest.json', 'contract-provenance.json', 'preparation-receipt.json',
  'backend-contract.md', 'task-contract.snapshot.md', 'preparatory-review.snapshot.md', 'catalog-contract-proposal.snapshot.md',
  'implementation-plan.md', 'frontend-agreement.json', 'root-decisions.json'];
for (const name of base) await readFile(resolve(artifact, name));
let release;
try { const wrapper = await json('claims-preparation-release.json'); release = JSON.parse(wrapper.content.find(row => row.type === 'text').text); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!release) {
  console.log(JSON.stringify({ preflightPassed: true, sourceUnchanged: true, inputs: manifest.inputs.length, sourceTreeSha256: receipt.sourceTreeSha256, contractSha256, awaitingClaimRelease: true }));
  process.exit(0);
}
assert(release.success && release.previousClaim.issueId === 'PO-15-backend-preparation');
receipt.phase = 'preparation-complete-go-received';
receipt.finalizedAt = new Date().toISOString();
receipt.claimReleased = true;
receipt.claimRelease = 'claims-preparation-release.json';
receipt.dtoContractSha256 = contractSha256;
receipt.frontendAgreement = 'frontend-agreement.json';
receipt.implementationAuthorized = true;
receipt.implementationGo = 'root-decisions.json';
receipt.applicationSourceUnchanged = true;
receipt.decision = 'Preparation complete with exact-source runtime and agreed final contract; root GO received, application work starts under a separate implementation claim.';
receipt.limitations = ['No application source changes, application tests, database connection, runtime generation, dependency installation or deployment occurred during preparation.', 'Publication remains reserved to root; implementation authorization and claims do not grant worker publishing authority.'];
receipt.artifactCopyAllowlist = [...base, 'claims-preparation-release.json', 'artifact-manifest.json'].sort();
receipt.doNotCopy = ['backend/node_modules', 'root node_modules junction', 'run-claude-queue.ps1', 'start-claude-team.ps1'];
await save('preparation-receipt.json', receipt);
const provenance = await json('contract-provenance.json');
provenance.finalBackendContract = { path: 'backend-contract.md', sha256: contractSha256, agreedByFrontend: true, rootDecisions: 'root-decisions.json' };
await save('contract-provenance.json', provenance);
const artifacts = await Promise.all(receipt.artifactCopyAllowlist.filter(name => name !== 'artifact-manifest.json').map(async name => {
  const bytes = await readFile(resolve(artifact, name)); return { path: folder + '/' + name, bytes: bytes.length, sha256: sha(bytes) };
}));
await save('artifact-manifest.json', { task: receipt.task, phase: receipt.phase, generatedAt: receipt.finalizedAt, baseline: receipt.baseline, artifacts });
console.log(JSON.stringify({ prepared: true, artifacts: artifacts.length, inputs: manifest.inputs.length, sourceTreeSha256: receipt.sourceTreeSha256,
  contractSha256, receiptSha256: sha(await readFile(resolve(artifact, 'preparation-receipt.json'))), artifactManifestSha256: sha(await readFile(resolve(artifact, 'artifact-manifest.json'))) }));
