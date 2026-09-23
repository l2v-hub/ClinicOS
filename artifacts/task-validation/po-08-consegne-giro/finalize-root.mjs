import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const base = 'artifacts/task-validation/po-08-consegne-giro';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const backend = JSON.parse(readFileSync(`${base}/backend/source-manifest.json`));
const frontend = JSON.parse(readFileSync(`${base}/frontend/source-manifest.json`));
const entries = [...backend.sourcePaths, ...frontend.files];
const rootPaths = ['tests/fixtures/po08-consegne.mjs', 'tests/integration/po08-consegne.test.mts'];
const files = entries.map(entry => {
  const bytes = readFileSync(entry.path), sha256 = hash(bytes);
  if (sha256 !== entry.sha256) throw new Error(`Unexpected source change: ${entry.path}`);
  return { path: entry.path, sha256, bytes: bytes.length };
}).concat(rootPaths.map(path => { const bytes = readFileSync(path); return { path, bytes: bytes.length, sha256: hash(bytes) }; }));
const sourceTreeSha256 = hash(JSON.stringify(files.map(({path, sha256}) => ({path, sha256})).sort((a,b) => a.path.localeCompare(b.path))));
writeFileSync(`${base}/root-source-manifest.json`, JSON.stringify({ baseline: '370a3071', applicationBaseline: backend.baseline, at: new Date().toISOString(), sourceTreeSha256, files }, null, 2));
const excluded = /(^|\/)(scratch|cache|db|releases)(\/|$)|private-schema\.prisma$|stage-paths\.json$/;
const walk = path => readdirSync(path, {withFileTypes:true}).flatMap(entry => {
  const name = `${path}/${entry.name}`;
  if (excluded.test(name)) return [];
  return entry.isDirectory() ? walk(name) : [name];
});
const stage = [...files.map(f => f.path), ...walk(base), 'docs/product/stato-esecuzione-piano-2026-09-22.md'];
writeFileSync(`${base}/stage-paths.json`, JSON.stringify([...new Set(stage)], null, 2));
console.log(JSON.stringify({sourceTreeSha256, files: files.length, stageFiles: stage.length}));
if (process.argv.includes('--stage')) {
  execFileSync('git', ['add', '-f', '--', ...new Set(stage)], { stdio:'inherit', windowsHide:true });
  execFileSync('git', ['diff', '--cached', '--check', '--', 'backend', 'frontend', 'prisma', 'tests', 'docs'], { stdio:'inherit', windowsHide:true });
}
