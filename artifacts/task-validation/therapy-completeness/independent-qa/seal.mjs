import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve, relative } from 'node:path';
const dir = resolve('artifacts/task-validation/therapy-completeness-qa');
const git = args => { const r = spawnSync('git', args, { encoding: 'utf8' }); if (r.status !== 0) throw new Error('git receipt failed'); return r.stdout.trim(); };
const candidate = '14a03038f758cf728e563807752da1642dc35fa8';
const base = '30f0b14d63ae69acec66cd82dcaee1d0abbb1cf6';
if (git(['rev-parse', 'HEAD']) !== candidate) throw new Error('Candidate changed');
const files = git(['diff', '--name-only', `${base}...${candidate}`]).split('\n');
const applicationDiff = git(['diff', '--', 'frontend', 'backend', 'prisma', 'package.json', 'package-lock.json']);
if (applicationDiff) throw new Error('Application source modified during QA');
const source = files.map(path => ({ path, blob: git(['rev-parse', `${candidate}:${path}`]),
 sha256WorkingBytes: createHash('sha256').update(readFileSync(path)).digest('hex') }));
const log = readFileSync(resolve(dir, 'logs/regression.txt'), 'utf8');
const failures = [...new Set(log.split('\n').filter(line => line.startsWith('✖ ') && line !== '✖ failing tests:')
 .map(line => line.replace(/ \([\d.]+ms\)$/, '').trim()))].sort();
const baseline = JSON.parse(readFileSync(resolve(dir, 'root-regression-comparison.json')));
if (JSON.stringify(failures) !== JSON.stringify([...baseline.baselineFailures].sort())) throw new Error('Baseline failure set differs');
writeFileSync(resolve(dir, 'source-receipt.json'), JSON.stringify({ candidate, base, applicationWorkingDiffEmpty: true,
 owner: '/root/therapy_complete_qa', isolatedCheckout: process.cwd(), source,
 mandatoryVerdict: 'FAILED VALIDATION', focusedPass: 46, adversarialPass: 5, playwrightPass: 12,
 fullTests: 1308, fullPass: 1296, fullFail: 12, independentlyObservedFailures: failures,
 suppliedBaselineComparisonSha256: createHash('sha256').update(readFileSync(resolve(dir, 'root-regression-comparison.json'))).digest('hex'),
 sourceIdentityAt: new Date().toISOString() }, null, 2));
const all = [];
function walk(folder) { for (const name of readdirSync(folder)) { const path = resolve(folder, name);
 if (statSync(path).isDirectory()) walk(path); else if (name !== 'artifact-manifest.json') all.push({
 path: relative(dir, path).replaceAll('\\', '/'), bytes: statSync(path).size,
 sha256: createHash('sha256').update(readFileSync(path)).digest('hex') }); } }
walk(dir); all.sort((a, b) => a.path.localeCompare(b.path));
writeFileSync(resolve(dir, 'artifact-manifest.json'), JSON.stringify({ candidate, base,
 verdict: 'FAILED VALIDATION', manifestExcludesItself: true, artifacts: all }, null, 2));
console.log(JSON.stringify({ verdict: 'FAILED VALIDATION', artifacts: all.length, candidate, base, applicationWorkingDiffEmpty: true }));
