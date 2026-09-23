import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const dir = 'artifacts/task-validation/po-08-consegne-giro/frontend/';
const read = name => JSON.parse(readFileSync(dir + name, 'utf8'));
const write = (name, value) => writeFileSync(dir + name, JSON.stringify(value, null, 2) + '\n');
const hash = value => createHash('sha256').update(value).digest('hex');
const changedPaths = ['frontend/src/components/operator/ConsegneRounds.css', 'frontend/src/components/operator/ConsegnaComposer.tsx'];
const old = read('source-manifest.json');
const receipt = read('final-receipt.json');
write('source-manifest.pre-mobile-identity.json', old);
write('final-receipt.pre-mobile-identity.json', receipt);
const now = new Date().toISOString();
const files = old.files.map(file => {
  const data = readFileSync(file.path);
  const sha256 = hash(data);
  if (!changedPaths.includes(file.path) && sha256 !== file.sha256) throw new Error(`Unexpected source change: ${file.path}`);
  return { ...file, sha256, bytes: data.length, lines: data.toString('utf8').trimEnd().split(/\r?\n/).length };
});
for (const [path, expected] of Object.entries(old.protectedFiles)) if (hash(readFileSync(path)) !== expected) throw new Error(`Protected bytes changed: ${path}`);
execFileSync('git', ['diff', '--check', '--', ...changedPaths], { stdio: ['ignore', 'pipe', 'ignore'] });
const testLog = readFileSync(dir + 'tests-mobile-identity.log', 'utf8');
if (!testLog.includes('ℹ pass 5') || !testLog.includes('ℹ fail 0')) throw new Error('Focused verification absent');
if (readFileSync(dir + 'types-mobile-identity.log', 'utf8').trim()) throw new Error('Type diagnostics remain');
if (readFileSync(dir + 'lint-mobile-identity.log', 'utf8').trim()) throw new Error('Lint diagnostics remain');
const sourceStateId = hash(JSON.stringify({ baseline: old.baseline, files: files.map(({ path, sha256 }) => ({ path, sha256 })), protectedFiles: old.protectedFiles }));
const runtimeSourceId = hash(JSON.stringify({ baseline: old.baseline, files: files.filter(file => !/__tests__|\.test\./.test(file.path)).map(({ path, sha256 }) => ({ path, sha256 })) }));
write('source-manifest.json', { ...old, generatedAtUtc: now, sourceStateId, runtimeSourceId, files });
const claims = read('claims.json');
claims.status = 'released'; claims.applicationClaimActive = false; claims.releasedAtUtc = now; claims.releaseTo = '/root'; claims.sourceStateId = sourceStateId;
write('claims.json', claims);
const followup = {
  reason: 'Root mobile390x844 observed identity scrolling outside the viewport while editing.',
  generatedAtUtc: now, previousSourceStateId: old.sourceStateId, sourceStateId, runtimeSourceId,
  changedFiles: files.filter(file => changedPaths.includes(file.path)).map(({ path, sha256 }) => ({ path, sha256 })),
  behavior: 'Inside the round form, patient identity is sticky on an opaque surface. The title scrolls normally. Shell pages use --topbar-h, standalone previews use zero. ResizeObserver measures identity height for field/action scroll margins. Quick-add modal headers are not made sticky.',
  validation: { types: { command: 'node ../node_modules/typescript/bin/tsc -b', exitCode: 0 }, focusedTests: { tests: 5, pass: 5, fail: 0 }, lint: { files: ['frontend/src/components/operator/ConsegnaComposer.tsx'], exitCode: 0 }, diffCheck: 'passed' },
  limitation: 'Root owns actual 390x844 focus/scroll geometry verification and final integration build. Earlier full build and suite remain bound to their original source inputs.',
};
write('mobile-identity-receipt.json', followup);
receipt.previousSourceStateId = old.sourceStateId; receipt.sourceStateId = sourceStateId; receipt.runtimeSourceId = runtimeSourceId; receipt.generatedAtUtc = now;
receipt.policyDecision = { decision: 'allow', basis: claims.authorization, actions: ['two-file mobile identity patch', 'targeted types/component/lint validation', 'manifest and claim handoff'], publicationAuthorizedByThisReceipt: false };
receipt.validation.mobileIdentityFollowup = followup;
const evidence = [...new Set([...receipt.evidence.map(item => item.path), ...['source-manifest.pre-mobile-identity.json', 'final-receipt.pre-mobile-identity.json', 'mobile-identity-receipt.json', 'tests-mobile-identity.log', 'types-mobile-identity.log', 'lint-mobile-identity.log'].map(name => dir + name)])];
receipt.evidence = evidence.map(path => ({ path, sha256: hash(readFileSync(path)) }));
write('final-receipt.json', receipt);
const artifacts = readdirSync(dir, { withFileTypes: true }).filter(entry => entry.isFile() && entry.name !== 'artifact-manifest.json').map(entry => {
  const path = dir + entry.name;
  const bytes = readFileSync(path);
  return { path, bytes: bytes.length, sha256: hash(bytes) };
}).sort((a,b) => a.path.localeCompare(b.path));
write('artifact-manifest.json', { task: 'PO-08-frontend', generatedAt: now, sourceStateId, artifacts });
console.log(JSON.stringify({ sourceStateId, runtimeSourceId, changedFiles: followup.changedFiles, claims: claims.status, artifacts: artifacts.length }, null, 2));
