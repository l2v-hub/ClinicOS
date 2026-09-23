import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const directory = 'artifacts/task-validation/po06-identity-ui';
const baseline = '0418463a94801bf2d22bdb3155eb6d4a05e9a2dd';
const git = (...args) => execFileSync('git', ['-c', 'core.safecrlf=false', ...args]);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const hashFile = (path) => sha(readFileSync(path));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
assert.equal(git('rev-parse', 'HEAD').toString().trim(), baseline);
const protectedExpected = {
  'run-claude-queue.ps1': 'e280791c291971ec64a760ac453a6476bb8f0302b35f71a3f43dc84db99b1008',
  'start-claude-team.ps1': '606dc3da172f5f020d3ea757462db1db8a33553ced03aabeb3db0aec69a70b78',
};
for (const [path, expected] of Object.entries(protectedExpected)) assert.equal(hashFile(path), expected);
const changed = git('diff', '--name-only').toString().trim().split(/\r?\n/).filter(Boolean);
assert.ok(changed.every((path) => path.startsWith('frontend/src/') || path in protectedExpected));
const untracked = git('ls-files', '--others', '--exclude-standard').toString().trim().split(/\r?\n/).filter(Boolean);
assert.ok(untracked.every((path) => path.startsWith('frontend/src/') || path.startsWith(`${directory}/`)));
const paths = [...new Set([...changed, ...untracked].filter((path) => path.startsWith('frontend/src/')))].sort();
assert.equal(paths.length, 24);
const files = paths.map((path) => ({ path, bytes: statSync(path).size, sha256: hashFile(path),
  newFile: untracked.includes(path) }));
assert.ok(files.filter((file) => file.newFile).every((file) => readFileSync(file.path, 'utf8').split('\n').length < 500));
const createdAtUtc = new Date().toISOString();
writeJson(`${directory}/source-manifest.json`, { baseline, createdAtUtc, owner: '/root/po01_frontend_audit',
  scope: 'frontend candidate: baseline plus exact bytes of changed tracked and untracked source/test files', files });
const baselineComparison = JSON.parse(readFileSync(`${directory}/baseline-comparison.json`, 'utf8'));
assert.ok(baselineComparison.lint.equal && baselineComparison.therapyPayload.equal);
assert.match(readFileSync(`${directory}/tests-final.log`, 'utf8'), /pass 74/);
assert.match(readFileSync(`${directory}/tests-final.log`, 'utf8'), /fail 0/);
assert.match(readFileSync(`${directory}/build-final.log`, 'utf8'), /built in/);
assert.equal(readFileSync(`${directory}/lint-changed-without-baseline.log`, 'utf8').trim(), '');
assert.equal(readFileSync(`${directory}/diff-check.log`, 'utf8').trim(), '');
const evidencePaths = ['tests-final.log', 'tests.log', 'build-final.log', 'lint.log', 'lint-changed-without-baseline.log',
  'baseline-comparison.json', 'baseline-check.log', 'diff-check.log', 'handoff.md', 'task-contract.md'];
const evidence = evidencePaths.map((name) => ({ path: `${directory}/${name}`, sha256: hashFile(`${directory}/${name}`) }));
const dependencyPaths = ['package.json', 'package-lock.json', 'frontend/package.json', 'frontend/package-lock.json',
  'frontend/vite.config.ts', 'frontend/tsconfig.app.json'].filter(existsSync);
const claims = JSON.parse(readFileSync(`${directory}/claims.json`, 'utf8'));
assert.equal(claims.status, 'active');
claims.status = 'released';
claims.applicationClaimActive = false;
claims.releasedAtUtc = createdAtUtc;
claims.releaseTo = '/root';
claims.proposedApplicationScope = 'Implemented exact claimed frontend subset; source-manifest.json lists the 24 final source/test files.';
writeJson(`${directory}/claims.json`, claims);
writeJson(`${directory}/final-receipt.json`, {
  decision: 'ALLOW_FRONTEND_HANDOFF', createdAtUtc, owner: '/root/po01_frontend_audit', baseline,
  authorization: 'Root GO after verified PO-05 publication; final root refinement on current date visibility and CF fallback applied',
  sourceManifest: { path: `${directory}/source-manifest.json`, sha256: hashFile(`${directory}/source-manifest.json`), files: files.length },
  claims: { status: 'released', path: `${directory}/claims.json`, sha256: hashFile(`${directory}/claims.json`) },
  validation: { focusedTests: '74/74 PASS', initialBroadRun: '75/76: one proved pre-existing agenda text guard failure',
    build: 'PASS; bundle-size warning', scopedLint: 'PASS except MultiPatientParametri baseline-identical 2 errors/2 warnings',
    clinicalActionPayload: 'buildInfo identical to baseline', diffCheck: 'frontend PASS' },
  evidence, dependencyInputs: dependencyPaths.map((path) => ({ path, sha256: hashFile(path) })),
  protectedFiles: protectedExpected,
  exclusions: ['backend', 'schema', 'generated packages', 'manifests/lockfiles', 'dependency installation', 'servers/ports', 'commit/push/deploy', 'PO-07 sorting', 'PO-08 workflow'],
  remainingRootValidation: ['browser geometry/sticky/200%/keyboard', 'live parameter draft refresh', 'therapy click payload', 'combined API/browser scope and request checks', 'publication decision'],
});
console.log(JSON.stringify({ files: paths.length, sourceManifestSha256: hashFile(`${directory}/source-manifest.json`),
  receiptSha256: hashFile(`${directory}/final-receipt.json`), claimStatus: claims.status }));
