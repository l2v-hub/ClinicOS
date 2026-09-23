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
const protectedFiles = {
  'run-claude-queue.ps1': 'e280791c291971ec64a760ac453a6476bb8f0302b35f71a3f43dc84db99b1008',
  'start-claude-team.ps1': '606dc3da172f5f020d3ea757462db1db8a33553ced03aabeb3db0aec69a70b78',
  'frontend/src/components/operator/assessments/AssessmentWorkspace.css': 'da291d16f038e1653d54cd4e2c4a010290d72855c36ea5c624b8a7e6dde907ed',
};
for (const [path, expected] of Object.entries(protectedFiles)) if (hash(readFileSync(path)) !== expected) throw new Error(`Protected file changed: ${path}`);
const testLog = readFileSync(`${directory}/test-focused.log`, 'utf8');
const buildLog = readFileSync(`${directory}/build.log`, 'utf8');
const lint = JSON.parse(readFileSync(`${directory}/lint-comparison.json`, 'utf8'));
const scan = JSON.parse(readFileSync(`${directory}/secret-scan.json`, 'utf8'));
if (!testLog.includes('pass 92') || !testLog.includes('fail 0') || !buildLog.includes('built in') || lint.introduced.length || scan.findings.length)
  throw new Error('Validation evidence is not complete.');
for (const row of lint.files) {
  const file = files.find(file => file.path === row.file);
  if (file && row.candidateHash !== file.sha256) throw new Error(`Lint source mismatch: ${row.file}`);
}
for (const file of scan.scanned) if (hash(readFileSync(file.path)) !== file.sha256) throw new Error(`Scan source mismatch: ${file.path}`);
execFileSync('git', ['diff', '--check', '--', 'frontend/src'], { stdio: ['ignore', 'pipe', 'pipe'] });
write('source-manifest.json', { task: 'PO-11-frontend', baseline, generatedAtUtc: now, sourceStateId, runtimeSourceId, worktree: process.cwd(), files, protectedFiles });
write('validation-receipt.json', {
  task: 'PO-11-frontend', generatedAtUtc: now, baseline, sourceStateId, runtimeSourceId,
  policyDecision: { decision: 'allow', authority: 'Root PO11 GO; claims.json', scope: 'Claimed isolated frontend source and validation only',
    excluded: ['backend', 'dependencies', 'manifests', 'lockfiles', 'servers', 'commit', 'push', 'deploy', 'live patient writes'] },
  tests: { exitCode: 0, passed: 92, failed: 0, transfersTests: 20, regressionTests: 72,
    exhaustiveTransferCombinations: 384, log: `${directory}/test-focused.log`,
    scope: ['Transfers schema/completeness and No/null', 'Owned/plain aids and 8/8/6 independent transfers', 'Unicode/newline preservation',
      'Patient/type/session isolation and deep-copy retry', 'Server current and snapshot-bound personal attestations', 'Structured incomplete paths',
      'Transfers SSR and compact control/grid classes', 'Typed archive metadata/folders/reciprocal targets', 'PAINAD, archive, identity and navigation regressions'] },
  build: { exitCode: 0, command: 'npm run build', cwd: 'frontend', log: `${directory}/build.log`, sourceBinding: 'runtimeSourceId; source frozen before successful build',
    warnings: ['Existing bundle chunk size warning', 'Bundler plugin timing diagnostic'] },
  lint: { exitCode: 0, baselineDiagnostics: 12, candidateDiagnostics: 12, introduced: [], log: `${directory}/lint-comparison.json`,
    normalization: 'Only moved line numbers inside hook diagnostic prose are normalized; original messages retained.' },
  secretScan: { exitCode: 0, findings: 0, sourceFiles: files.length, bundleFiles: scan.scanned.length - files.length, log: `${directory}/secret-scan.json`, scope: scan.scope },
  whitespace: { command: 'git diff --check -- frontend/src', exitCode: 0 }, protectedFiles,
  limitations: ['Root owns real browser geometry/keyboard QA at390/768/1262, PostgreSQL/HTTP integration, PDF rendering and release.',
    'SSR verifies rendered structure and text, not browser geometry. No performance improvement claim.',
    'Independent source review requested; reviewer binds its own receipt to the final manifest.',
    'No dependency, schema, commit, push or deployment performed by frontend worker.'],
});
const claim = JSON.parse(readFileSync(`${directory}/claims.json`, 'utf8'));
write('claims.json', { ...claim, status: 'released', applicationClaimActive: false, releasedAtUtc: now, sourceStateId,
  handoff: 'Source frozen for root integration and read-only review; no frontend worker writes remain.' });
const artifacts = readdirSync(directory).filter(name => name !== 'artifact-manifest.json').sort().map(name => {
  const path = `${directory}/${name}`; const bytes = readFileSync(path); return { path, bytes: bytes.length, sha256: hash(bytes) };
});
write('artifact-manifest.json', { task: 'PO-11-frontend', generatedAt: now, sourceStateId, artifacts });
console.log(JSON.stringify({ sourceStateId, runtimeSourceId, sourceFiles: files.length, artifacts: artifacts.length, claim: 'released' }));
