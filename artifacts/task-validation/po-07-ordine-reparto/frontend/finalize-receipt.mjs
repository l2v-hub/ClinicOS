import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const baseCommit = '853b40750c25f24ef40db622674612aaf64bf2cb';
const root = 'C:/Workspace/ClinicOSHouse-worktrees/po07-roster-ui';
const artifact = 'artifacts/task-validation/po-07-ordine-reparto/frontend';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const changed = git('diff', '--name-only', '--', 'frontend/src').split('\n').filter(Boolean);
const added = git('ls-files', '--others', '--exclude-standard', 'frontend/src').split('\n').filter(Boolean);
const files = [...new Set([...changed, ...added])].sort().map((path) => {
  const bytes = readFileSync(`${root}/${path}`);
  const lines = bytes.toString('utf8').split('\n').length;
  if (added.includes(path) && lines > 500) throw new Error(`New file exceeds 500 lines: ${path}`);
  return { path, status: added.includes(path) ? 'added' : 'modified', sha256: hash(bytes), bytes: bytes.length, lines };
});
const comparison = JSON.parse(readFileSync(`${root}/${artifact}/lint-comparison.json`, 'utf8'));
if (comparison.introduced.length) throw new Error('Lint introduced diagnostics');
for (const file of comparison.files) {
  if (files.find((row) => row.path === file.file)?.sha256 !== file.candidateHash) throw new Error(`Source changed after lint: ${file.file}`);
}
const tests = readFileSync(`${root}/${artifact}/tests-final.log`, 'utf8');
if (!/tests 102/.test(tests) || !/pass 102/.test(tests) || !/fail 0/.test(tests)) throw new Error('Final regressions did not pass');
const build = readFileSync(`${root}/${artifact}/build-final.log`, 'utf8');
if (!/built in/.test(build)) throw new Error('Build did not finish');
execFileSync('git', ['diff', '--check', '--', 'frontend/src'], { cwd: root, stdio: 'pipe' });
const protectedFiles = {
  'run-claude-queue.ps1': 'e280791c291971ec64a760ac453a6476bb8f0302b35f71a3f43dc84db99b1008',
  'start-claude-team.ps1': '606dc3da172f5f020d3ea757462db1db8a33553ced03aabeb3db0aec69a70b78',
};
for (const [path, expected] of Object.entries(protectedFiles)) {
  if (hash(readFileSync(`${root}/${path}`)) !== expected) throw new Error(`Protected launcher changed: ${path}`);
}
const now = new Date().toISOString();
const sourceIdentity = hash(JSON.stringify({ baseCommit, files: files.map(({ path, sha256 }) => ({ path, sha256 })) }));
const manifest = { owner: '/root/po01_frontend_audit', worktree: root, branch: git('branch', '--show-current'), baseCommit,
  generatedAtUtc: now, sourceIdentity, identityScope: 'Frontend candidate overlay on the exact base commit; inherited launcher modifications excluded from integration overlay and verified separately', files };
writeFileSync(`${root}/${artifact}/source-manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
const evidenceFiles = ['tests-final.log', 'build-final.log', 'lint-comparison.json', 'lint-final.log', 'source-manifest.json', 'task-contract.md', 'implementation-plan.md'];
const receipt = {
  owner: '/root/po01_frontend_audit', integrationOwner: '/root', completedAtUtc: now,
  policyDecision: 'ALLOW_FRONTEND_IMPLEMENTATION_AND_LOCAL_VALIDATION',
  authority: 'Root GO after verified PO-06 publication at baseline 853b407; isolated frontend writer, root owns integration/browser/benchmark/publication',
  sourceIdentity, baseCommit, files: files.length, added: added.length, modified: changed.length,
  tests: { passed: 102, failed: 0, log: 'tests-final.log' }, build: { passed: true, log: 'build-final.log', warning: 'Existing bundle chunk-size warning; no build error' },
  lint: { introduced: 0, baselineDiagnostics: 13, candidateDiagnostics: 8, remainingFile: 'frontend/src/App.tsx', comparison: 'lint-comparison.json' },
  diffCheck: 'passed', protectedFiles,
  validations: ['DTO/CAS and pending preference races', 'bounded recovery', 'parameter exact pending request, uncertainty and row remount', 'shared controls and separated personal/admin permissions', 'legacy loaded-row ordering scope', 'therapy server order/partial merges/exact totals', 'PO-06 operational identity and parameter/consegne regressions'],
  limitations: ['Root browser/keyboard/mobile/200% and synthetic API end-to-end QA remain integration gates', 'Root owns source-bound baseline/candidate benchmark', 'Unrelated full-suite guards were not broadened beyond the agreed 102 focused regressions'],
  excludedActions: ['backend/schema/migration/generated package writes', 'dependency or manifest changes', 'server/port use', 'commit/push/deploy', 'live patient mutation', 'PO-08 Consegne roster'],
  evidence: evidenceFiles.map((path) => ({ path: `${artifact}/${path}`, sha256: hash(readFileSync(`${root}/${artifact}/${path}`)) })),
};
writeFileSync(`${root}/${artifact}/final-receipt.json`, JSON.stringify(receipt, null, 2) + '\n');
const claimsPath = `${root}/${artifact}/claims.json`;
const claims = JSON.parse(readFileSync(claimsPath, 'utf8'));
Object.assign(claims, { status: 'released', applicationClaimActive: false, releasedAtUtc: now,
  handoffTo: '/root', sourceIdentity, releaseReason: 'Candidate source and focused validation complete; root may integrate exact manifest files' });
writeFileSync(claimsPath, JSON.stringify(claims, null, 2) + '\n');
console.log(JSON.stringify({ sourceIdentity, files: files.length, added: added.length, modified: changed.length, claims: 'released', manifestSha256: hash(readFileSync(`${root}/${artifact}/source-manifest.json`)), receiptSha256: hash(readFileSync(`${root}/${artifact}/final-receipt.json`)) }));
