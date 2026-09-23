import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { copyFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const directory = 'artifacts/task-validation/po-12-tinetti/frontend';
const baseline = '470a5fe7a7eee4a9b0a0b219947432049b9de977';
const now = new Date().toISOString();
const hash = value => createHash('sha256').update(value).digest('hex');
const write = (name, value) => writeFileSync(`${directory}/${name}`, JSON.stringify(value, null, 2) + '\n');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const require = createRequire(`${process.cwd()}/frontend/package.json`);
if (git('rev-parse', 'HEAD') !== baseline) throw new Error('Preparation baseline changed.');
if (git('diff', '--name-only', baseline, '--', 'frontend/src')) throw new Error('Application source changed before GO.');
if (git('ls-files', '--others', '--exclude-standard', 'frontend/src')) throw new Error('New application source before GO.');

const claim = JSON.parse(readFileSync(`${directory}/claims.json`, 'utf8'));
for (const [path, expected] of Object.entries(claim.protectedFiles)) {
  if (hash(readFileSync(path)) !== expected) throw new Error(`Protected input mismatch: ${path}`);
}
const originalPath = 'frontend/src/components/operator/cartella/ScalaTinettiTab.tsx';
const originalSha256 = hash(readFileSync(originalPath));
if (originalSha256 !== '7785059cceedc3ff85f051a60ff1cbdaa48145f03fb7f93ab7d53696ca6c8b09')
  throw new Error('Normative Tinetti source differs from contract.');
copyFileSync(originalPath, `${directory}/baseline-ScalaTinettiTab.tsx`);
const sourceInputs = [
  originalPath,
  'artifacts/task-validation/po-12-tinetti/task-contract.md',
  'docs/product/note-implementazione-piano-2026-09-23.md',
  'frontend/src/lib/assessments/assessmentTypes.ts',
  'frontend/src/lib/assessments/assessmentDefinition.ts',
  'frontend/src/lib/assessments/assessmentDraftStore.ts',
  'frontend/src/components/operator/assessments/AssessmentWorkspace.tsx',
  'artifacts/task-validation/po-10-painad/integrate-worker.mjs',
  'artifacts/task-validation/po-10-painad/copy-worker-evidence.mjs',
].map(path => {
  const bytes = readFileSync(path);
  return { path, bytes: bytes.length, sha256: hash(bytes) };
});

write('preparation-receipt.json', {
  task: 'PO-12-frontend', generatedAtUtc: now, baseline,
  worktree: process.cwd(), branch: git('branch', '--show-current'),
  status: 'preparation-only', applicationModified: false, sourceInputs,
  policyDecision: {
    decision: 'allow', authority: 'Root preparation task after PO11 commit/push, before PO11 live verification',
    scope: ['Read source and contract', 'Record frontend preparation evidence', 'Prepare isolated runtime link and local compiler cache', 'Agree DTO with backend worker'],
    applicationGo: false, excluded: claim.excluded,
  },
  runtime: {
    node: process.version,
    packages: Object.fromEntries(['typescript', 'tsx', 'react', 'react-dom', 'vite', 'prettier'].map(name => [name, require(`${name}/package.json`).version])),
    dependencyDirectory: 'node_modules', target: 'C:/Workspace/ClinicOSHouse-worktrees/quality-loop-20260829/node_modules',
    sharedDependenciesReadOnly: true, localCompilerCache: 'frontend/node_modules/.tmp', installPerformed: false,
  },
  model: { itemCount: 20, optionCount: 48, balanceMaximum: 16, gaitMaximum: 12, maximum: 28, originalSha256,
    preservedOriginal: `${directory}/baseline-ScalaTinettiTab.tsx`, referenceSha256: 'feca88c71bc7b6c9b53a812979f222e0769d688380673995277e8490db8c3ff6' },
  coordination: { topology: 'Existing root hierarchy; no additional agent', frontendOwner: claim.owner, integrationOwner: claim.integrationOwner,
    memoryRecall: 'Ruflo memory search returned five approximate entries; none directly concerned PO10/PO11 assessment workflow. Tracked contract and baseline source used.',
    guidance: 'Ruflo guidance_brain recommend reachable and advisory; no capability or publication authority expanded.',
    dto: 'Backend and frontend agreed on type/version, flat answers+notes, answeredCount/completion, balance/gait/total/riskBand/label, typed snapshot items and source/reference hashes. Exact provenance text awaits backend contract.' },
  validation: { applicationDiffEmpty: true, sourceHashMatchesContract: true, protectedFiles: claim.protectedFiles,
    testsRun: false, buildRun: false, reason: 'Preparation only; previous PO11 validation belongs to its own source state.' },
});
write('claims.json', { ...claim, preparedAtUtc: now });
const artifacts = readdirSync(directory).filter(name => name !== 'artifact-manifest.json').sort().map(name => {
  const path = `${directory}/${name}`;
  const bytes = readFileSync(path);
  return { path, bytes: bytes.length, sha256: hash(bytes) };
});
write('artifact-manifest.json', { task: 'PO-12-frontend-preparation', generatedAt: now, artifacts });
console.log(JSON.stringify({ baseline, artifacts: artifacts.length, applicationModified: false, applicationClaimActive: false }));
