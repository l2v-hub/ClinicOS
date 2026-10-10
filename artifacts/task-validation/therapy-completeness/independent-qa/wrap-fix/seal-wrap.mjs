import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve, relative } from 'node:path';
const root = resolve('artifacts/task-validation/therapy-completeness-qa');
const folder = resolve(root, 'wrap-fix');
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const original = JSON.parse(readFileSync(resolve(root, 'artifact-manifest.json')));
const styled = JSON.parse(readFileSync(resolve(root, 'styled/styled-artifact-manifest.json')));
for (const record of [...original.artifacts, ...styled.artifacts]) if (hash(resolve(root, record.path)) !== record.sha256)
 throw new Error(`Historical sealed artifact changed: ${record.path}`);
const git = args => { const r = spawnSync('git', args, { encoding: 'utf8' }); if (r.status) throw new Error('git receipt failed'); return r.stdout.trim(); };
const candidate = '8490fa9b97bbad159dd758aec6fbde3f7f87ea8f';
if (git(['rev-parse', 'HEAD']) !== candidate) throw new Error('Candidate changed');
if (git(['diff', '--', 'frontend', 'backend', 'prisma', 'package.json', 'package-lock.json'])) throw new Error('Application working diff');
const delta = git(['diff', '--name-only', `${original.candidate}...HEAD`, '--', 'frontend']);
if (delta !== 'frontend/src/components/operator/cartella/PatientTherapyCalendar.tsx') throw new Error('Unexpected frontend delta');
const records = [];
function walk(path) { for (const name of readdirSync(path)) { const child = resolve(path, name);
 if (statSync(child).isDirectory()) walk(child);
 else if (name !== 'wrap-artifact-manifest.json') records.push({ path: relative(root, child).replaceAll('\\', '/'),
  bytes: statSync(child).size, sha256: hash(child) }); } }
walk(folder);
records.push({ path: 'wrap-fix-surface.tsx', bytes: statSync(resolve(root, 'wrap-fix-surface.tsx')).size, sha256: hash(resolve(root, 'wrap-fix-surface.tsx')) });
records.sort((a, b) => a.path.localeCompare(b.path));
const sourcePaths = git(['diff', '--name-only', `${original.base}...HEAD`, '--', 'frontend']).split('\n');
writeFileSync(resolve(folder, 'wrap-artifact-manifest.json'), JSON.stringify({ candidate, previousCandidate: original.candidate, base: original.base,
 verdict: 'FAILED VALIDATION', independentChecks: { unitPass: 51, browserPass: 14, geometryPass: 2, typesBuildPass: true, secretFindings: 0 },
 fullSuiteOnCandidateRerun: false, wholeImportVerified: false,
 originalArtifactsPreserved: original.artifacts.length, styledArtifactsPreserved: styled.artifacts.length,
 originalManifestSha256: hash(resolve(root, 'artifact-manifest.json')),
 styledManifestSha256: hash(resolve(root, 'styled/styled-artifact-manifest.json')),
 applicationWorkingDiffEmpty: true, frontendDelta: delta,
 source: sourcePaths.map(path => ({ path, gitBlob: git(['rev-parse', `${candidate}:${path}`]), workingSha256: hash(resolve(path)) })),
 artifacts: records, at: new Date().toISOString() }, null, 2));
console.log(JSON.stringify({ candidate, originalArtifactsPreserved: original.artifacts.length, styledArtifactsPreserved: styled.artifacts.length,
 newArtifacts: records.length, verdict: 'FAILED VALIDATION' }));
