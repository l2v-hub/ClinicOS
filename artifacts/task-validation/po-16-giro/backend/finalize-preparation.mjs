import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const root = await realpath(process.cwd()), folder = 'artifacts/task-validation/po-16-giro/backend', artifact = resolve(root, folder);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async name => JSON.parse(await readFile(resolve(artifact, name), 'utf8'));
const save = (name, value) => writeFile(resolve(artifact, name), JSON.stringify(value, null, 2) + '\n');
const session = await json('preparation-session.json'), receipt = await json('preparation-receipt.json');
const source = await json('preparation-source-manifest.json');
const git = (...args) => execFileSync('git', args, { cwd: root, windowsHide: true, encoding: 'utf8' }).trim();
const scope = ['backend/src', 'prisma', 'src', 'frontend/src', 'scripts', 'tests/fixtures', 'backend/tsconfig.json', 'backend/package.json', 'package.json', 'package-lock.json', 'prisma.config.ts'];
assert.equal(git('rev-parse', 'HEAD'), session.baseline); assert.equal(git('branch', '--show-current'), session.branch);
assert.equal(git('diff', 'HEAD', '--name-only', '--', ...scope), '');
assert.equal(git('ls-files', '--others', '--exclude-standard', '--', ...scope), '');
for (const row of source.inputs) { const bytes = await readFile(resolve(root, row.path)); assert.equal(bytes.length, row.bytes); assert.equal(sha(bytes), row.sha256, row.path); }
assert.equal(source.inputs.length, 1103);
assert.equal(sha(source.inputs.map(row => row.path + '\0' + row.sha256 + '\n').join('')), source.sourceTreeSha256);
assert.equal(source.sourceTreeSha256, '3e21b69f7402e354636416b18f51bd75209f6caf3e39c26c5e500a510140a1eb');
assert.equal(source.sourceTreeSha256, session.sourceTreeSha256);
for (const row of session.preserved) assert.equal(sha(await readFile(resolve(root, row.path))), row.sha256, row.path);
for (const runtime of [receipt.runtime.privateWrapper, receipt.runtime.privateGeneratedClient])
  for (const row of runtime.files) assert.equal(sha(await readFile(resolve(runtime.target, row.path))), row.sha256, row.path);
for (const row of receipt.contracts) {
  assert.equal(sha(await readFile(resolve(artifact, row.snapshot))), row.sha256);
  assert.equal(sha(await readFile(row.original)), row.sha256);
}
const contract = await json('contract-provenance.json');
assert.equal(sha(await readFile(resolve(artifact, 'backend-contract.md'))), contract.backendContract.sha256);
const provenance = await json('legacy-v1-provenance.json'), visual = await json('legacy-v1-visual-review.json');
for (const row of provenance.files) { const bytes = await readFile(resolve(artifact, row.path)); assert.equal(bytes.length, row.bytes); assert.equal(sha(bytes), row.sha256); }
assert.equal(sha(await readFile(provenance.originalState.path)), provenance.originalState.sha256);
assert.equal(sha(await readFile(provenance.originalPdf.path)), provenance.originalPdf.sha256);
assert.equal(visual.pdfSha256, provenance.originalPdf.sha256);
assert(visual.allPagesInspected && visual.pagesInspected.length === provenance.pages && !visual.candidateVisualQaPerformed);
assert((await json('frontend-agreement.json')).bmiSemanticsAgreed);
const payload = wrapper => JSON.parse(wrapper.content.find(row => row.type === 'text').text);
assert.equal(payload(await json('claims-preparation.json')).claim.issueId, 'PO-16-backend-preparation');
const names = ['backend-contract.md', 'claims-preparation.json', 'claims-preparation-release.json', 'contract-provenance.json', 'finalize-preparation.mjs',
  'frontend-agreement.json', 'guidance-preparation.json', 'implementation-plan.md', 'legacy-v1-provenance.json', 'legacy-v1-visual-review.json',
  'memory-preparation.json', 'preparation-receipt.json', 'preparation-session.json', 'preparation-source-manifest.json', 'prepare-legacy-v1.mjs',
  'prepare-runtime.mjs', 'rifiniture-osservate.snapshot.md', 'task-contract.snapshot.md', ...provenance.files.map(row => row.path)].sort();
for (const name of names.filter(name => name !== 'claims-preparation-release.json')) await readFile(resolve(artifact, name));
let release;
try { release = payload(await json('claims-preparation-release.json')); }
catch(error) { if (error.code !== 'ENOENT') throw error; }
if (!release) { console.log(JSON.stringify({ preflightPassed: true, inputs: source.inputs.length, sourceUnchanged: true, awaitingPreparationClaimRelease: true })); process.exit(0); }
assert(release.success && release.previousClaim.issueId === 'PO-16-backend-preparation');
await save('preparation-receipt.json', { ...receipt, phase: 'preparation-complete-awaiting-root-implementation-go',
  preparationClaimReleased: true, finalizedAt: new Date().toISOString(), sourceInputs: source.inputs.length,
  legacyV1: { provenance: 'legacy-v1-provenance.json', pdfSha256: provenance.originalPdf.sha256, sourceStateSha256: provenance.originalState.sha256,
    snapshotSha256: provenance.snapshotSha256, pagesInspected: 3, canonicalSnapshotHashVerified: true, databaseProofPendingAfterGo: true },
  frontendBmiAgreement: true,
  diagnosticReads: 'Discovery only: nonexistent pdf-mna.ts and Windows rg glob path probes were corrected to existing paths; no application commands/tests failed or ran.',
  artifactCopyAllowlist: [...names, 'artifact-manifest.json'],
  doNotCopy: ['backend/node_modules', 'root node_modules junction', 'backend/dist', 'PowerShell launchers', 'other PO artifacts'],
});
const artifacts = await Promise.all(names.map(async name => { const bytes = await readFile(resolve(artifact, name)); return { path: folder + '/' + name, bytes: bytes.length, sha256: sha(bytes) }; }));
await save('artifact-manifest.json', { task: 'PO16-backend-preparation', baseline: session.baseline, sourceTreeSha256: source.sourceTreeSha256, artifacts });
console.log(JSON.stringify({ completed: true, sourceInputs: source.inputs.length, sourceUnchanged: true, artifacts: artifacts.length,
  sourceManifestSha256: sha(await readFile(resolve(artifact, 'preparation-source-manifest.json'))),
  receiptSha256: sha(await readFile(resolve(artifact, 'preparation-receipt.json'))), artifactManifestSha256: sha(await readFile(resolve(artifact, 'artifact-manifest.json'))) }));
