import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const directory = 'artifacts/task-validation/po-11-postural-transfers/frontend';
const baseline = 'd659c1b459eb72a2920cbd9f678a2c11f9bf7efd';
const now = new Date().toISOString();
const hash = value => createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', ['-c', 'core.quotepath=false', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const write = (name, value) => writeFileSync(`${directory}/${name}`, JSON.stringify(value, null, 2) + '\n');
const paths = [...new Set([...git('diff', '--name-only', baseline, '--', 'frontend/src').split('\n'),
  ...git('ls-files', '--others', '--exclude-standard', 'frontend/src').split('\n')])].filter(Boolean).sort();
const files = paths.map(path => {
  const bytes = readFileSync(path); let before;
  try { before = execFileSync('git', ['show', `${baseline}:${path}`], { stdio: ['ignore', 'pipe', 'ignore'] }); } catch { /* Added file. */ }
  const lines = bytes.toString().trimEnd().split('\n').length;
  if (!before && lines >= 500) throw new Error(`New file exceeds line cap: ${path}`);
  return { path, status: before ? 'modified' : 'added', bytes: bytes.length, lines, sha256: hash(bytes), baselineSha256: before ? hash(before) : null };
});
const identity = rows => hash(JSON.stringify(rows.map(({ path, sha256 }) => ({ path, sha256 }))));
const sourceStateId = identity(files);
const runtimeSourceId = identity(files.filter(row => !row.path.includes('/__tests__/')));
const priorManifest = JSON.parse(readFileSync(`${directory}/pre-date-fix-source-manifest.json`, 'utf8'));
const priorReceipt = JSON.parse(readFileSync(`${directory}/pre-date-fix-validation-receipt.json`, 'utf8'));
const priorArtifacts = JSON.parse(readFileSync(`${directory}/pre-date-fix-artifact-manifest.json`, 'utf8'));
if (priorManifest.sourceStateId !== '96062fccbd129c4256330d72f77c136ec6571cc71e323611dafd046f18eee0fa' || identity(priorManifest.files) !== priorManifest.sourceStateId)
  throw new Error('Pre-fix source manifest identity mismatch.');
for (const name of ['source-manifest.json', 'validation-receipt.json', 'test-focused.log', 'build.log', 'lint-comparison.json', 'secret-scan.json', 'implementation-receipt.md', 'finalize-evidence.mjs']) {
  const expected = priorArtifacts.artifacts.find(row => row.path === `${directory}/${name}`);
  if (!expected || hash(readFileSync(`${directory}/pre-date-fix-${name}`)) !== expected.sha256)
    throw new Error(`Pre-fix artifact preservation mismatch: ${name}`);
}
const permittedDelta = [
  'frontend/src/components/operator/__tests__/transfersUi.test.ts',
  'frontend/src/components/operator/assessments/TransfersForm.tsx',
  'frontend/src/lib/assessments/transfersDefinition.ts',
];
if (JSON.stringify(files.map(row => row.path)) !== JSON.stringify(priorManifest.files.map(row => row.path)))
  throw new Error('Unexpected source file set change.');
const delta = files.flatMap(file => {
  const before = priorManifest.files.find(row => row.path === file.path);
  return before.sha256 === file.sha256 ? [] : [{ path: file.path, oldSha256: before.sha256, newSha256: file.sha256 }];
});
if (JSON.stringify(delta.map(row => row.path)) !== JSON.stringify(permittedDelta)) throw new Error('Unexpected source delta.');
const protectedFiles = {
  'run-claude-queue.ps1': 'e280791c291971ec64a760ac453a6476bb8f0302b35f71a3f43dc84db99b1008',
  'start-claude-team.ps1': '606dc3da172f5f020d3ea757462db1db8a33553ced03aabeb3db0aec69a70b78',
  'frontend/src/components/operator/assessments/AssessmentWorkspace.css': 'da291d16f038e1653d54cd4e2c4a010290d72855c36ea5c624b8a7e6dde907ed',
};
for (const [path, expected] of Object.entries(protectedFiles)) if (hash(readFileSync(path)) !== expected) throw new Error(`Protected file changed: ${path}`);
const testLog = readFileSync(`${directory}/test-date-fix.log`, 'utf8');
const priorTestLog = readFileSync(`${directory}/pre-date-fix-test-focused.log`, 'utf8');
const priorBuildLog = readFileSync(`${directory}/pre-date-fix-build.log`, 'utf8');
const buildLog = readFileSync(`${directory}/build.log`, 'utf8');
const lint = JSON.parse(readFileSync(`${directory}/lint-comparison.json`, 'utf8'));
const scan = JSON.parse(readFileSync(`${directory}/secret-scan.json`, 'utf8'));
if (!testLog.includes('pass 17') || !testLog.includes('fail 0') || !buildLog.includes('built in') || lint.introduced.length || scan.findings.length ||
  !priorTestLog.includes('pass 92') || !priorTestLog.includes('fail 0') || !priorBuildLog.includes('built in'))
  throw new Error('Validation evidence is not complete.');
for (const row of lint.files) {
  const file = files.find(file => file.path === row.file);
  if (file && row.candidateHash !== file.sha256) throw new Error(`Lint source mismatch: ${row.file}`);
}
for (const file of scan.scanned) if (hash(readFileSync(file.path)) !== file.sha256) throw new Error(`Scan source mismatch: ${file.path}`);
execFileSync('git', ['diff', '--check', '--', 'frontend/src'], { stdio: ['ignore', 'pipe', 'pipe'] });
write('source-manifest.json', { task: 'PO-11-frontend', baseline, generatedAtUtc: now, sourceStateId, runtimeSourceId, previousSourceStateId: priorManifest.sourceStateId, worktree: process.cwd(), files, protectedFiles });
write('date-fix-delta.json', { task: 'PO-11-frontend-admission-date-fix', generatedAtUtc: now,
  integratedBaseline: '3d8570', previousSourceStateId: priorManifest.sourceStateId, previousRuntimeSourceId: priorManifest.runtimeSourceId,
  sourceStateId, runtimeSourceId, files: delta,
  integrationRule: 'Apply only where the integration checkout bytes match oldSha256. No other source paths changed.' });
write('validation-receipt.json', {
  task: 'PO-11-frontend', generatedAtUtc: now, baseline, sourceStateId, runtimeSourceId,
  policyDecision: { decision: 'allow', authority: 'Root authorized post-review admission-date P2 fix; claims.json', scope: 'Three claimed isolated frontend files and validation artifacts only',
    excluded: ['backend', 'dependencies', 'manifests', 'lockfiles', 'servers', 'commit', 'push', 'deploy', 'live patient writes'] },
  previousValidation: { sourceStateId: priorManifest.sourceStateId, runtimeSourceId: priorManifest.runtimeSourceId,
    integratedBaseline: '3d8570', manifest: `${directory}/pre-date-fix-source-manifest.json`,
    receipt: `${directory}/pre-date-fix-validation-receipt.json`,
    tests: { ...priorReceipt.tests, log: `${directory}/pre-date-fix-test-focused.log` },
    build: { ...priorReceipt.build, log: `${directory}/pre-date-fix-build.log` },
    statement: 'The 92-test suite passed on the previous source state. It was not rerun on this refinement.' },
  refinement: { delta: `${directory}/date-fix-delta.json`, changedFiles: delta.length, unchangedFiles: files.length - delta.length,
    behavior: 'Invalid admission dates remain in the editable dirty draft with an adjacent accessible error. Rendering does not throw; save validates the visible raw value and preserves the draft on failure. Calendar years 0001–9999 match backend validation.' },
  tests: { exitCode: 0, passed: 17, failed: 0, log: `${directory}/test-date-fix.log`, sourceStateId,
    command: 'node --import tsx --import ../scripts/stub-css-loader.mjs --test src/components/operator/__tests__/transfersUi.test.ts src/lib/__tests__/transfersDefinition.test.ts src/lib/__tests__/transfersDraftStore.test.ts',
    cwd: 'frontend', exhaustiveTransferCombinations: 384,
    scope: ['SSR invalid raw date retention and accessible adjacent error', 'Invalid save blocked; dirty/hasUnsaved and all other answers retained',
      'Correction to 1999-01-01 saves the exact corrected answer payload', 'Calendar bounds 0001/9999, reject 0000/10000, leap days 1904/2000 and reject 1900',
      'Transfers definition/completeness, draft-store and UI/archive focused regressions'] },
  build: { exitCode: 0, command: 'npm run build', cwd: 'frontend', log: `${directory}/build.log`, sourceBinding: 'runtimeSourceId; source frozen before successful build',
    warnings: ['Existing bundle chunk size warning', 'Bundler plugin timing diagnostic'] },
  lint: { exitCode: 0, baselineDiagnostics: 12, candidateDiagnostics: 12, introduced: [], log: `${directory}/lint-comparison.json`,
    normalization: 'Only moved line numbers inside hook diagnostic prose are normalized; original messages retained.' },
  secretScan: { exitCode: 0, findings: 0, sourceFiles: files.length, bundleFiles: scan.scanned.length - files.length, log: `${directory}/secret-scan.json`, scope: scan.scope },
  whitespace: { command: 'git diff --check -- frontend/src', exitCode: 0 }, protectedFiles,
  limitations: ['Root owns real browser geometry/keyboard QA at 390/768/1262, PostgreSQL/HTTP integration, PDF rendering and release.',
    'SSR verifies rendered structure and text, not browser geometry. No performance improvement claim.',
    'The full prior 92-test suite is baseline evidence; only 17 focused tests were rerun for this date fix.',
    'Independent source review requested; reviewer binds its own receipt to the final manifest.',
    'No dependency, schema, commit, push or deployment performed by frontend worker.'],
});
const claim = JSON.parse(readFileSync(`${directory}/claims.json`, 'utf8'));
write('claims.json', { ...claim, status: 'released', applicationClaimActive: false, releasedAtUtc: now, sourceStateId,
  handoff: 'Three-file date delta frozen for root integration with old-byte hash checks and read-only review; no frontend worker writes remain.' });
const artifacts = readdirSync(directory).filter(name => name !== 'artifact-manifest.json').sort().map(name => {
  const path = `${directory}/${name}`; const bytes = readFileSync(path); return { path, bytes: bytes.length, sha256: hash(bytes) };
});
write('artifact-manifest.json', { task: 'PO-11-frontend', generatedAt: now, sourceStateId, artifacts });
console.log(JSON.stringify({ sourceStateId, runtimeSourceId, sourceFiles: files.length, artifacts: artifacts.length, claim: 'released' }));
