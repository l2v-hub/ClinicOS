import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const dir = 'artifacts/task-validation/po-05-scansioni-lunghe';
const read = name => JSON.parse(readFileSync(`${dir}/${name}`, 'utf8'));
const paths = new Set([
  ...read('backend/handoff-manifest.json').sourceFiles.map(f => f.path),
  ...read('frontend-worker/source-manifest.json').files.map(f => f.path),
  ...read('frontend-worker/delta-source-manifest.json').files.map(f => f.path),
  ...Object.keys(JSON.parse(readFileSync('clinicos-ai-runtime/docs/po05-validation-root.json', 'utf8')).files).map(p => `clinicos-ai-runtime/${p}`),
  'backend/package.json', 'package-lock.json', 'tests/integration/po05-http-boundaries.test.mts',
]);
const sha = data => createHash('sha256').update(data).digest('hex');
const files = [...paths].sort().map(path => { const bytes = readFileSync(path); return { path, bytes: bytes.length, sha256: sha(bytes) }; });
const baseline = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
writeFileSync(`${dir}/root-source-manifest.json`, JSON.stringify({ baseline, at: new Date().toISOString(),
  binding: 'Baseline commit plus listed source paths, including new files; root CSS and empty-group guard are included',
  treeHash: sha(JSON.stringify(files)), files }, null, 2) + '\n');
console.log(JSON.stringify({ baseline, files: files.length, treeHash: sha(JSON.stringify(files)) }));
