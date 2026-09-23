import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const dir = 'artifacts/task-validation/po-08-consegne-giro/frontend/';
const read = name => JSON.parse(readFileSync(dir + name, 'utf8'));
const write = (name, value) => writeFileSync(dir + name, JSON.stringify(value, null, 2) + '\n');
const hash = value => createHash('sha256').update(value).digest('hex');
const changedPaths = ['frontend/src/components/operator/ConsegnePage.tsx', 'frontend/src/components/operator/ConsegneWorkspace.tsx'];
const old = read('source-manifest.json');
const receipt = read('final-receipt.json');
write('source-manifest.pre-embedded-header.json', old);
write('final-receipt.pre-embedded-header.json', receipt);
const now = new Date().toISOString();
const files = old.files.map(file => {
  const data = readFileSync(file.path);
  const sha256 = hash(data);
  if (!changedPaths.includes(file.path) && sha256 !== file.sha256) throw new Error(`Unexpected source change: ${file.path}`);
  return { ...file, sha256, bytes: data.length, lines: data.toString('utf8').trimEnd().split(/\r?\n/).length };
});
for (const [path, expected] of Object.entries(old.protectedFiles)) if (hash(readFileSync(path)) !== expected) throw new Error(`Protected bytes changed: ${path}`);
execFileSync('git', ['diff', '--check', '--', ...changedPaths], { stdio: ['ignore', 'pipe', 'ignore'] });
if (!readFileSync(dir + 'embedded-header-check.log', 'utf8').includes('PASS:')) throw new Error('Header verification absent');
if (readFileSync(dir + 'types-embedded-header.log', 'utf8').trim()) throw new Error('Type diagnostics remain');
if (readFileSync(dir + 'lint-embedded-header.log', 'utf8').trim()) throw new Error('Lint diagnostics remain');
const sourceStateId = hash(JSON.stringify({ baseline: old.baseline, files: files.map(({ path, sha256 }) => ({ path, sha256 })), protectedFiles: old.protectedFiles }));
const runtimeSourceId = hash(JSON.stringify({ baseline: old.baseline, files: files.filter(file => !/__tests__|\.test\./.test(file.path)).map(({ path, sha256 }) => ({ path, sha256 })) }));
write('source-manifest.json', { ...old, generatedAtUtc: now, sourceStateId, runtimeSourceId, files });
const claims = read('claims.json');
claims.status = 'released'; claims.applicationClaimActive = false; claims.releasedAtUtc = now; claims.releaseTo = '/root'; claims.sourceStateId = sourceStateId;
write('claims.json', claims);
const followup = {
  reason: 'Root tab23 observed duplicate page header in embedded Feed.',
  generatedAtUtc: now, previousSourceStateId: old.sourceStateId, sourceStateId, runtimeSourceId,
  changedFiles: files.filter(file => changedPaths.includes(file.path)).map(({ path, sha256 }) => ({ path, sha256 })),
  validation: { types: { command: 'node ../node_modules/typescript/bin/tsc -b', exitCode: 0 }, headerRendering: 'Standalone and embedded workspace each have one breadcrumb, one h1, one page header, with summary and creation action retained.', lint: { files: changedPaths, exitCode: 0 }, diffCheck: 'passed' },
  fullBuildAndSuite: 'Earlier evidence retained at previous source identity. No full build or full test suite repeated for this presentation-only patch; root integration owns final build/browser QA.',
};
write('embedded-header-receipt.json', followup);
receipt.previousSourceStateId = old.sourceStateId; receipt.sourceStateId = sourceStateId; receipt.runtimeSourceId = runtimeSourceId; receipt.generatedAtUtc = now;
receipt.policyDecision = { decision: 'allow', basis: claims.authorization, actions: ['two-file embedded header patch', 'targeted types/render/lint validation', 'manifest and claim handoff'], publicationAuthorizedByThisReceipt: false };
receipt.validation.build.runtimeSourceId = old.runtimeSourceId;
receipt.validation.build.status = 'historical-before-embedded-header-patch';
receipt.validation.candidateTests.sourceStateId = old.sourceStateId;
receipt.validation.identityTests.sourceStateId = old.sourceStateId;
receipt.validation.lint.sourceStateId = old.sourceStateId;
receipt.validation.embeddedHeaderFollowup = followup;
const evidence = [...new Set([...receipt.evidence.map(item => item.path), ...['source-manifest.pre-embedded-header.json', 'final-receipt.pre-embedded-header.json', 'embedded-header-receipt.json', 'embedded-header-check.ts', 'embedded-header-check.log', 'types-embedded-header.log', 'lint-embedded-header.log'].map(name => dir + name)])];
receipt.evidence = evidence.map(path => ({ path, sha256: hash(readFileSync(path)) }));
write('final-receipt.json', receipt);
console.log(JSON.stringify({ sourceStateId, runtimeSourceId, changedFiles: followup.changedFiles, claims: claims.status }, null, 2));
