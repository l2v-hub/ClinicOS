import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

const root = process.cwd();
const task = resolve(root, 'artifacts/task-validation/parametri-caricamento-rapido-e-conteggio-note');
const sha = (data) => createHash('sha256').update(data).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const changed = [
  'backend/src/patients/parameter-readings.ts',
  'backend/src/patients/parameters-page.ts',
  'frontend/src/components/operator/MultiPatientParametri.tsx',
  'frontend/src/components/operator/ParameterEntryRow.tsx',
  'frontend/src/components/operator/PatientParameters.css',
  'frontend/src/components/operator/__tests__/parameterNotes.test.ts',
  'frontend/src/lib/parameterEntrySummary.ts',
  'frontend/src/lib/patientParameterReadings.ts',
  'frontend/src/lib/patientParametersPage.ts',
  'frontend/src/lib/__tests__/parameterEntrySummary.test.ts',
  'frontend/src/lib/__tests__/patientParametersPage.test.ts',
  'tests/integration/parameter-readings-db.test.mts',
];
const inputs = [...new Set([
  ...git('ls-files', '--', 'frontend', 'backend', 'prisma', 'tests', 'scripts', 'package.json', 'package-lock.json', 'prisma.config.ts').split('\n'),
  ...changed,
])].filter(path => path && existsSync(resolve(root, path)) && statSync(resolve(root, path)).isFile()).sort();
const files = inputs.map(path => ({ path, bytes: statSync(resolve(root, path)).size, sha256: sha(readFileSync(resolve(root, path))) }));
const installed = {};
for (const name of ['vite', 'typescript', '@prisma/client', 'prisma', '@electric-sql/pglite']) {
  const file = resolve(root, 'node_modules', name, 'package.json');
  installed[name] = JSON.parse(readFileSync(file)).version;
}
const snapshot = {
  capturedAt: new Date().toISOString(),
  baseline: '0f4524043bc0c6c762f48fb1a07a85b111a1c79d',
  head: git('rev-parse', 'HEAD'),
  nodeVersion: process.version,
  installed,
  scope: 'Tracked frontend, backend, Prisma, tests, scripts, root manifests plus every new candidate source/test. No environment values or unrelated launchers are copied.',
  aggregateSha256: sha(JSON.stringify(files)),
  changedFiles: files.filter(file => changed.includes(file.path)),
  files,
};
const buildManifest = join(task, 'qa-production/.vite/manifest.json');
if (existsSync(buildManifest)) snapshot.frontendBuildManifestSha256 = sha(readFileSync(buildManifest));
function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
const evidenceInputs = [
  ...['preview', 'baseline-preview', 'candidate-preview', 'screenshots'].flatMap(directory => walk(join(task, directory))),
  ...['browser-evidence.json', 'server.mjs', 'qa-frontend-tests.log', 'qa-backend-tests.log', 'qa-frontend-types.log', 'qa-frontend-build.log', 'qa-backend-build.log'].map(path => join(task, path)),
].filter(path => existsSync(path)).sort();
snapshot.evidenceFiles = evidenceInputs.map(path => ({ path: relative(task, path).replaceAll('\\', '/'), bytes: statSync(path).size, sha256: sha(readFileSync(path)) }));
snapshot.evidenceSha256 = sha(JSON.stringify(snapshot.evidenceFiles));
writeFileSync(join(task, 'qa-source-manifest.json'), JSON.stringify(snapshot, null, 2) + '\n');
console.log(JSON.stringify({ source: snapshot.aggregateSha256, inputs: files.length, changedFiles: snapshot.changedFiles.length, evidenceSha256: snapshot.evidenceSha256, evidenceFiles: snapshot.evidenceFiles.length, installed }, null, 2));
