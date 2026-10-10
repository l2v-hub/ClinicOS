import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve('artifacts/task-validation/therapy-completeness-qa');
const folder = resolve(root, 'import-regimen');
const read = name => readFileSync(resolve(folder, name), 'utf8');
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const git = args => { const r = spawnSync('git', args, { encoding: 'utf8' }); if (r.status) throw Error('git failed'); return r.stdout.trim(); };
const candidate = 'f7052f414ee1f0dbc2fa45d86b66463928c2810d';
const previousCandidate = '8490fa9b97bbad159dd758aec6fbde3f7f87ea8f';
const base = '30f0b14d63ae69acec66cd82dcaee1d0abbb1cf6';
if (git(['rev-parse', 'HEAD']) !== candidate) throw Error('source moved');
const appPaths = ['frontend', 'backend', 'prisma', 'package.json', 'package-lock.json'];
if (git(['diff', '--', ...appPaths])) throw Error('application working diff');
const delta = git(['diff', '--name-only', `${previousCandidate}..${candidate}`, '--', ...appPaths]).split('\n');
if (delta.length !== 4) throw Error('unexpected delta');
const metrics = name => {
 const text = read(`logs/${name}.txt`);
 return Object.fromEntries(['tests', 'pass', 'fail', 'cancelled', 'skipped'].map(key => [key, Number(text.match(new RegExp(`ℹ ${key} (\\d+)`))?.[1] ?? -1)]));
};
const full = read('logs/frontend-full.txt');
const failures = [...new Set(full.split('\n').filter(line => line.startsWith('✖ ') && !line.startsWith('✖ failing tests:')).map(line => line.replace(/ \([\d.]+ms\).*$/, '').trim()))].sort();
const baseline = JSON.parse(readFileSync(resolve(root, 'root-regression-comparison.json'), 'utf8'));
const introduced = failures.filter(name => !baseline.baselineFailures.includes(name));
const missingBaseline = baseline.baselineFailures.filter(name => !failures.includes(name));
if (introduced.length || missingBaseline.length) throw Error('failure names changed');
const selection = JSON.parse(read('backend-selection.json'));
const broad = read('logs/backend-non-db-rerun.txt');
const visibleBroadFailures = [...new Set(broad.split('\n').filter(line => line.startsWith('✖ ')).map(line => line.replace(/ \([\d.]+ms\).*$/, '').trim()))];
const receipt = { candidate, previousCandidate, base, applicationWorkingDiffEmpty: true,
 source: delta.map(path => ({ path, gitBlob: git(['rev-parse', `${candidate}:${path}`]), sha256: hash(resolve(path)) })),
 focusedBackend: metrics('backend-focused'), focusedFrontend: metrics('frontend-focused'), independentUnit: metrics('independent3-rerun'), mockedConfirmation: metrics('backend-confirmation-safe'),
 frontendFull: { ...metrics('frontend-full'), failures, introduced, missingBaseline, comparisonManifestSha256: hash(resolve(root, 'root-regression-comparison.json')) },
 backendBroad: { discoveredFiles: selection.allCount, selectedFiles: selection.selected.length, excludedFiles: selection.excluded.length,
  status: 'INCOMPLETE / FAILED ATTEMPT', reason: 'Non-*-db suffix selection is not a non-DB guarantee. Selected integration/auth suites failed and long-lived child processes stalled the runner. Owned run bounded after more than five minutes; no final aggregate counts, no full-backend PASS.', visibleFailures: visibleBroadFailures,
  exit: broad.match(/^exit: (.*)$/m)?.[1], databaseTarget: 'synthetic loopback port 1 only', credentialsRemoved: true },
 browser: { pass: 4, realComponents: true, canonicalStyles: true, browserOnlyDraftReload: true, databasePersistenceVerified: false, clinicalNetwork: 'intercepted synthetic, unknown/mutation blocked' },
 build: { frontendTypes: true, frontendViteBuild: true, nodeEnv: 'test', backendTsc: true, backendRuntimeFonts: true, prismaGenerateRun: false },
 securityFindings: 0, wholeStructuredImportVerified: false, verdict: 'FAILED VALIDATION', at: new Date().toISOString() };
writeFileSync(resolve(folder, 'source-receipt.json'), JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ candidate, focusedBackend: receipt.focusedBackend, frontendFull: metrics('frontend-full'), backendSubsetFiles: selection.selected.length, verdict: receipt.verdict }));
