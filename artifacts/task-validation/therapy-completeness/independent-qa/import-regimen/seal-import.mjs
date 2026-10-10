import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve('artifacts/task-validation/therapy-completeness-qa');
const folder = resolve(root, 'import-regimen');
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const manifests = ['artifact-manifest.json', 'styled/styled-artifact-manifest.json', 'wrap-fix/wrap-artifact-manifest.json'];
let historicalCount = 0;
const historical = manifests.map(path => {
 const manifest = JSON.parse(readFileSync(resolve(root, path), 'utf8'));
 for (const item of manifest.artifacts) if (hash(resolve(root, item.path)) !== item.sha256) throw Error(`Historical artifact changed: ${item.path}`);
 historicalCount += manifest.artifacts.length;
 return { path, sha256: hash(resolve(root, path)), artifactsPreserved: manifest.artifacts.length };
});
if (historicalCount !== 509) throw Error('historical count mismatch');
const receipt = JSON.parse(readFileSync(resolve(folder, 'source-receipt.json'), 'utf8'));
const git = args => { const r = spawnSync('git', args, { encoding: 'utf8' }); if (r.status) throw Error('git receipt failed'); return r.stdout.trim(); };
if (git(['rev-parse', 'HEAD']) !== receipt.candidate) throw Error('source moved');
if (git(['diff', '--', 'frontend', 'backend', 'prisma', 'package.json', 'package-lock.json'])) throw Error('application working diff');
for (const source of receipt.source) if (hash(resolve(source.path)) !== source.sha256 || git(['rev-parse', `${receipt.candidate}:${source.path}`]) !== source.gitBlob) throw Error('source changed');
const artifacts = [];
function walk(dir) { for (const name of readdirSync(dir)) { const path = resolve(dir, name); if (statSync(path).isDirectory()) walk(path);
 else if (name !== 'import-artifact-manifest.json') artifacts.push({ path: relative(root, path).replaceAll('\\', '/'), bytes: statSync(path).size, sha256: hash(path) }); } }
walk(folder);
const surface = resolve(root, 'import-regimen-surface.tsx');
artifacts.push({ path: 'import-regimen-surface.tsx', bytes: statSync(surface).size, sha256: hash(surface) });
artifacts.sort((a, b) => a.path.localeCompare(b.path));
writeFileSync(resolve(folder, 'import-artifact-manifest.json'), JSON.stringify({ candidate: receipt.candidate, previousCandidate: receipt.previousCandidate, base: receipt.base,
 verdict: 'FAILED VALIDATION', source: receipt.source, applicationWorkingDiffEmpty: true, historical, historicalCount, artifacts,
 browserPass: 4, wholeImportVerified: false, backendBroadComplete: false, at: new Date().toISOString() }, null, 2));
console.log(JSON.stringify({ candidate: receipt.candidate, historicalPreserved: historicalCount, newArtifacts: artifacts.length, verdict: 'FAILED VALIDATION' }));
