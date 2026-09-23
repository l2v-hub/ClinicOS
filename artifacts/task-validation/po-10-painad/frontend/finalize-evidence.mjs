import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const directory = 'artifacts/task-validation/po-10-painad/frontend';
const baseline = 'cfe0e16be0c3efc4c49245f5a9944745bf913a8a';
const now = new Date().toISOString();
const hash = value => createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', ['-c', 'core.quotepath=false', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const write = (name, value) => writeFileSync(`${directory}/${name}`, JSON.stringify(value, null, 2) + '\n');
const paths = [...new Set([...git('diff', '--name-only', baseline, '--', 'frontend/src').split('\n'),
  ...git('ls-files', '--others', '--exclude-standard', 'frontend/src').split('\n')])].filter(Boolean).sort();
const files = paths.map(path => {
  const bytes = readFileSync(path);
  let before;
  try { before = execFileSync('git', ['show', `${baseline}:${path}`], { stdio: ['ignore', 'pipe', 'ignore'] }); } catch { /* Added file. */ }
  const lines = bytes.toString().trimEnd().split('\n').length;
  if (!before && lines >= 500) throw new Error(`New file exceeds line cap: ${path}`);
  return { path, status: before ? 'modified' : 'added', bytes: bytes.length, lines,
    sha256: hash(bytes), baselineSha256: before ? hash(before) : null };
});
const identity = rows => hash(JSON.stringify(rows.map(({ path, sha256 }) => ({ path, sha256 }))));
const sourceStateId = identity(files);
const runtimeSourceId = identity(files.filter(row => !row.path.includes('/__tests__/')));
const protectedFiles = {
  'run-claude-queue.ps1': 'e280791c291971ec64a760ac453a6476bb8f0302b35f71a3f43dc84db99b1008',
  'start-claude-team.ps1': '606dc3da172f5f020d3ea757462db1db8a33553ced03aabeb3db0aec69a70b78',
};
for (const [path, expected] of Object.entries(protectedFiles))
  if (hash(readFileSync(path)) !== expected) throw new Error(`Protected file changed: ${path}`);
const testLog = readFileSync(`${directory}/test-focused.log`, 'utf8');
const buildLog = readFileSync(`${directory}/build.log`, 'utf8');
const lint = JSON.parse(readFileSync(`${directory}/lint-comparison.json`, 'utf8'));
if (!testLog.includes('pass 72') || !testLog.includes('fail 0') || !buildLog.includes('built in') || lint.introduced.length)
  throw new Error('Validation evidence is not complete.');
for (const row of lint.files) {
  const file = files.find(file => file.path === row.file);
  if (file && row.candidateHash !== file.sha256) throw new Error(`Lint source mismatch: ${row.file}`);
}
write('source-manifest.json', { task: 'PO-10-frontend', baseline, generatedAtUtc: now, sourceStateId, runtimeSourceId,
  worktree: process.cwd(), files, protectedFiles });
write('validation-receipt.json', {
  task: 'PO-10-frontend', generatedAtUtc: now, baseline, sourceStateId, runtimeSourceId,
  policyDecision: { decision: 'allow', authority: 'Root PO10 GO; claims.json', scope: 'Claimed frontend source and focused validation only',
    excluded: ['backend', 'dependencies', 'manifests', 'lockfiles', 'servers', 'commit', 'push', 'deploy', 'live patient writes'] },
  tests: { exitCode: 0, passed: 72, failed: 0, newAssessmentTests: 29, existingRegressionTests: 43,
    exhaustiveAnswers: { complete: 243, incomplete: 781 }, log: `${directory}/test-focused.log`,
    scope: ['PAINAD definition', 'Rome DST/time precision', 'DTO/snapshot validation', 'request receipts and exact retries',
      'CAS reconciliation and explicit conflicts', 'session/logout fencing', 'final and PDF state SSR', 'generated archive and multi-print',
      'existing archive, identity, navigation, content scope and document pagination'] },
  build: { exitCode: 0, command: 'npm run build', cwd: 'frontend', log: `${directory}/build.log`,
    sourceBinding: 'runtimeSourceId; source frozen before successful build',
    warnings: ['Existing bundle chunk size warning', 'Bundler plugin timing diagnostic'] },
  lint: { exitCode: 0, baselineDiagnostics: 21, candidateDiagnostics: 21, introduced: [],
    log: `${directory}/lint-comparison.json`, normalization: 'Only moved line numbers inside hook diagnostic prose are normalized for comparison; original messages retained.' },
  whitespace: { command: 'git diff --check -- frontend/src', exitCode: 0 },
  protectedFiles,
  limitations: ['Root owns browser geometry/keyboard QA, PostgreSQL/HTTP integration and PDF visual verification.',
    'SSR does not validate browser geometry or clinical efficacy; no performance improvement claim.',
    'No dependency, schema, commit, push or deployment performed by frontend worker.'],
});
const claim = JSON.parse(readFileSync(`${directory}/claims.json`, 'utf8'));
write('claims.json', { ...claim, status: 'released', applicationClaimActive: false, releasedAtUtc: now, sourceStateId,
  handoff: 'Source frozen for root integration and read-only review; no worker writes remain.' });
const artifacts = readdirSync(directory).filter(name => name !== 'artifact-manifest.json').sort().map(name => {
  const path = `${directory}/${name}`;
  const bytes = readFileSync(path);
  return { path, bytes: bytes.length, sha256: hash(bytes) };
});
write('artifact-manifest.json', { task: 'PO-10-frontend', generatedAt: now, sourceStateId, artifacts });
console.log(JSON.stringify({ sourceStateId, runtimeSourceId, sourceFiles: files.length, artifacts: artifacts.length, claim: 'released' }));
