import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const worktree = 'C:/Workspace/ClinicOSHouse-worktrees/po12-tinetti-backend';
const prep = resolve(worktree, 'artifacts/task-validation/po-13-mna/backend-preparation');
const po12 = resolve(worktree, 'artifacts/task-validation/po-12-tinetti/backend');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const sourceBytes = await readFile(resolve(po12, 'source-manifest.json'));
const source = JSON.parse(sourceBytes);
if (sha(sourceBytes) !== '2696009c17ee34519a30624382f346c315841fb66a30e06664b716452d1d4f5a')
  throw new Error('Frozen PO12 manifest changed');
const inputs = await json(resolve(po12, 'test-source-manifest.json'));
const artifacts = await json(resolve(po12, 'artifact-manifest.json'));
const rows = [...source.sourcePaths, ...inputs.inputs, ...artifacts.artifacts];
const unique = [...new Map(rows.map(row => [row.path, row])).values()];
for (const row of unique) {
  if (sha(await readFile(resolve(worktree, row.path))) !== row.sha256)
    throw new Error('Frozen PO12 file changed: ' + row.path);
}
const preserved = (await json(resolve(po12, 'implementation-session.json'))).preserved;
for (const row of preserved)
  if (sha(await readFile(resolve(worktree, row.path))) !== row.sha256)
    throw new Error('Protected file changed: ' + row.path);
const names = ['backend-contract.md', 'task-contract.snapshot.md', 'source-mna.txt',
  'source-provenance.md', 'empty-answers.example.json', 'claims-preparation.json',
  'frontend-agreement.json', 'claims-preparation-release.json', 'finalize-preparation.mjs',
  'root-contract-byte-comparison.json'];
const evidence = [];
for (const name of names) {
  const bytes = await readFile(resolve(prep, name));
  evidence.push({ path: name, bytes: bytes.length, sha256: sha(bytes) });
}
const agreement = await json(resolve(prep, 'frontend-agreement.json'));
const rootContractProvenance = await json(resolve(prep, 'root-contract-byte-comparison.json'));
if (!rootContractProvenance.equalAfterCrlfToLf ||
    rootContractProvenance.snapshot.sha256 !== evidence.find(row => row.path === 'task-contract.snapshot.md').sha256)
  throw new Error('Root contract provenance does not bind preparation snapshot');
const contractSha256 = evidence.find(row => row.path === 'backend-contract.md').sha256;
if (!agreement.agreed || agreement.contractSha256 !== contractSha256)
  throw new Error('Frontend agreement does not bind current contract');
const release = await json(resolve(prep, 'claims-preparation-release.json'));
if (!release.released || release.issueId !== 'PO-13-backend-preparation')
  throw new Error('Preparation claim not released');
const receipt = {
  task: 'PO13-backend-preparation',
  phase: 'dto-contract-only',
  generatedAt: new Date().toISOString(),
  worktree,
  mutableScope: 'artifacts/task-validation/po-13-mna/backend-preparation/**',
  decision: 'allow preparation artifact handoff; application implementation awaits root GO and new isolated worktree',
  authorization: 'Explicit root preparation-only task after PO12 handoff; no application work before PO12 deploy verification',
  contractSha256,
  rootContractSha256: rootContractProvenance.original.sha256,
  rootContractSnapshotSha256: rootContractProvenance.snapshot.sha256,
  rootContractProvenance,
  sourcePdfSha256: '67964491d0ceb5c221e776079c3af2bc7c1ddbf834428997f1b5531e469c6ffa',
  frontendAgreement: agreement,
  frozenPo12: {
    sourceManifestSha256: sha(sourceBytes),
    sourceTreeSha256: source.sourceTreeSha256,
    inputTreeSha256: source.inputTreeSha256,
    sourceFiles: source.sourcePaths.length,
    artifactFiles: artifacts.artifacts.length,
    uniqueFilesByteVerified: unique.length,
    protectedFilesUnchanged: preserved.length,
    unchanged: true
  },
  recall: { source: 'Ruflo memory_search', query: 'MNA clinical assessment PO13 nullable measurements snapshot screening full', relevantMatchFound: false },
  implementationAuthorized: false,
  applicationFilesChanged: false,
  applicationTestsRun: false,
  runtimePrepared: false,
  committed: false,
  published: false,
  nextGate: 'Root verifies published PO12 and assigns PO13 worktree, then explicitly authorizes implementation',
  claimReleased: true,
  evidence,
  copyAllowlist: [...names, 'preparation-receipt.json']
};
await writeFile(resolve(prep, 'preparation-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ completed: true, contractSha256, frozenPo12: receipt.frozenPo12,
  receipt: resolve(prep, 'preparation-receipt.json') }));
