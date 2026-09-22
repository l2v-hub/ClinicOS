import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = process.cwd();
const task = resolve(root, 'artifacts/task-validation/caricamento-rapido-elenco-pazienti-e-importazione-immediata');
const sha = (data) => createHash('sha256').update(data).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const changed = [
  'frontend/src/components/operator/PatientList.tsx',
  'frontend/src/components/operator/PatientRoster.tsx',
  'frontend/src/components/operator/usePatientListPage.ts',
  'frontend/src/components/shared/AIImportStatus.tsx',
  'frontend/src/components/shared/DialogLoading.tsx',
  'frontend/src/lib/patientPage.ts',
  'frontend/src/lib/__tests__/patientPage.test.ts',
  'frontend/src/components/operator/__tests__/patientLoading.test.ts',
];
const paths = [...new Set([
  ...git('ls-files', '--', 'frontend', 'package.json', 'package-lock.json', 'scripts/stub-css-loader.mjs').split('\n'),
  ...changed,
])].filter(p => p && existsSync(resolve(root, p)) && statSync(resolve(root, p)).isFile()).sort();
const files = paths.map(path => ({ path, bytes: statSync(resolve(root, path)).size, sha256: sha(readFileSync(resolve(root, path))) }));
const snapshot = {
  capturedAt: new Date().toISOString(),
  head: git('rev-parse', 'HEAD'),
  frontendTreeAtHead: git('rev-parse', 'HEAD:frontend'),
  nodeVersion: process.version,
  viteVersion: JSON.parse(readFileSync(join(root, 'node_modules/vite/package.json'))).version,
  typescriptVersion: JSON.parse(readFileSync(join(root, 'node_modules/typescript/package.json'))).version,
  scope: 'Tracked frontend files and root dependency manifests plus new candidate files; no environment files or unrelated launchers.',
  aggregateSha256: sha(JSON.stringify(files)),
  changedFiles: files.filter(f => changed.includes(f.path)),
  files,
};
writeFileSync(join(task, 'qa-source-manifest.json'), JSON.stringify(snapshot, null, 2) + '\n');

function inspectBuild(name) {
  const dir = join(task, name);
  const manifestBytes = readFileSync(join(dir, '.vite/manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  const routeKey = 'src/components/operator/PatientList.tsx';
  function closure(key, seen = new Set()) {
    if (seen.has(key)) return seen;
    if (!manifest[key]) throw new Error(`Unknown manifest key ${key}`);
    seen.add(key);
    for (const child of manifest[key].imports ?? []) closure(child, seen);
    return seen;
  }
  const shell = closure('index.html');
  const staticKeys = [...closure(routeKey)];
  const incrementalKeys = staticKeys.filter(key => !shell.has(key));
  function sizes(keys) {
    return keys.filter(key => /\.m?js$/.test(manifest[key].file)).map(key => {
      const content = readFileSync(join(dir, manifest[key].file));
      return { key, file: manifest[key].file, bytes: content.byteLength, gzipBytes: gzipSync(content).byteLength, sha256: sha(content) };
    });
  }
  const chunks = sizes(incrementalKeys);
  const allChunks = sizes(staticKeys);
  return {
    manifestSha256: sha(manifestBytes),
    route: manifest[routeKey].file,
    dynamicImports: manifest[routeKey].dynamicImports ?? [],
    incrementalJsBytes: chunks.reduce((sum, chunk) => sum + chunk.bytes, 0),
    incrementalGzipBytes: chunks.reduce((sum, chunk) => sum + chunk.gzipBytes, 0),
    allStaticJsBytes: allChunks.reduce((sum, chunk) => sum + chunk.bytes, 0),
    excludedAlreadyLoadedChunks: sizes([...shell]),
    chunks,
  };
}
const baseline = inspectBuild('baseline-production');
const candidate = inspectBuild('candidate-production');
const comparison = {
  measuredAt: new Date().toISOString(),
  baselineCommit: snapshot.head,
  candidateSourceSha256: snapshot.aggregateSha256,
  method: 'Recursively follow manifest imports only, never dynamicImports. Incremental bytes subtract index.html and its static dependency closure because they are already loaded before navigating to PatientList. Sum file bytes, and sum individual gzip sizes; this is payload size, not browser timing.',
  baseline,
  candidate,
  reductionBytes: baseline.incrementalJsBytes - candidate.incrementalJsBytes,
  reductionPercent: Number((100 * (1 - candidate.incrementalJsBytes / baseline.incrementalJsBytes)).toFixed(2)),
};
writeFileSync(join(task, 'qa-bundle-comparison.json'), JSON.stringify(comparison, null, 2) + '\n');
console.log(JSON.stringify({ source: snapshot.aggregateSha256, files: files.length, baseline: baseline.incrementalJsBytes, candidate: candidate.incrementalJsBytes, reductionPercent: comparison.reductionPercent, baselineGzip: baseline.incrementalGzipBytes, candidateGzip: candidate.incrementalGzipBytes, dynamicImports: candidate.dynamicImports }, null, 2));
