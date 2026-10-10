import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve, relative } from 'node:path';
const root = resolve('artifacts/task-validation/therapy-completeness-qa');
const folder = resolve(root, 'styled');
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const seal = JSON.parse(readFileSync(resolve(root, 'artifact-manifest.json')));
for (const record of seal.artifacts) if (hash(resolve(root, record.path)) !== record.sha256)
 throw new Error(`Original sealed artifact changed: ${record.path}`);
const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
if (head.status || head.stdout.trim() !== seal.candidate) throw new Error('Candidate changed');
const diff = spawnSync('git', ['diff', '--', 'frontend', 'backend', 'prisma', 'package.json', 'package-lock.json'], { encoding: 'utf8' });
if (diff.status || diff.stdout.trim()) throw new Error('Application diff not empty');
const records = [];
function walk(path) { for (const name of readdirSync(path)) { const child = resolve(path, name);
 if (statSync(child).isDirectory()) walk(child);
 else if (name !== 'styled-artifact-manifest.json') records.push({ path: relative(root, child).replaceAll('\\', '/'),
  bytes: statSync(child).size, sha256: hash(child) }); } }
walk(folder);
records.push({ path: 'styled-surface.tsx', bytes: statSync(resolve(root, 'styled-surface.tsx')).size, sha256: hash(resolve(root, 'styled-surface.tsx')) });
records.sort((a, b) => a.path.localeCompare(b.path));
writeFileSync(resolve(folder, 'styled-artifact-manifest.json'), JSON.stringify({ candidate: seal.candidate, base: seal.base,
 verdict: 'FAILED VALIDATION', originalArtifactsPreserved: seal.artifacts.length,
 originalManifestSha256: hash(resolve(root, 'artifact-manifest.json')), applicationWorkingDiffEmpty: true,
 stylingInputs: ['frontend/src/index.css', 'frontend/src/print-forms.css', 'frontend/src/App.css', 'frontend/src/design-system.css']
 .map(path => ({ path, sha256: hash(resolve(path)) })), artifacts: records, at: new Date().toISOString() }, null, 2));
console.log(JSON.stringify({ candidate: seal.candidate, originalArtifactsPreserved: seal.artifacts.length, styledArtifacts: records.length }));
