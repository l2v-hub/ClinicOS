import { readFileSync, copyFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const folder = process.argv[2];
assert.ok(['styled', 'wrap-fix', 'import-regimen'].includes(folder));
const name = folder === 'wrap-fix' ? 'wrap-artifact-manifest.json' : folder === 'styled' ? 'styled-artifact-manifest.json' : 'import-artifact-manifest.json';
const input = resolve('C:/w-therapy-qa/artifacts/task-validation/therapy-completeness-qa');
const output = resolve('artifacts/task-validation/therapy-completeness/independent-qa');
const inside = (base, path) => { const file = resolve(base, path); const rel = relative(base, file);
  assert.ok(rel && !rel.startsWith('..') && !/^[A-Za-z]:/.test(rel)); return file; };
const manifestFile = `${folder}/${name}`;
const bytes = readFileSync(inside(input, manifestFile));
const manifest = JSON.parse(bytes);
assert.equal(manifest.verdict, 'FAILED VALIDATION');
const hash = b => createHash('sha256').update(b).digest('hex');
for (const item of manifest.artifacts) {
  const source = inside(input, item.path), target = inside(output, item.path);
  const data = readFileSync(source); assert.equal(hash(data), item.sha256);
  if (existsSync(target)) assert.equal(hash(readFileSync(target)), item.sha256, 'Do not overwrite prior sealed evidence');
  else { mkdirSync(dirname(target), { recursive: true }); copyFileSync(source, target); }
}
const targetManifest = inside(output, manifestFile);
mkdirSync(dirname(targetManifest), { recursive: true });
if (existsSync(targetManifest)) assert.equal(hash(readFileSync(targetManifest)), hash(bytes));
else copyFileSync(inside(input, manifestFile), targetManifest);
writeFileSync(`artifacts/task-validation/therapy-completeness/${folder}-copy-receipt.json`, JSON.stringify({
  candidate: manifest.candidate, verdict: manifest.verdict, files: manifest.artifacts.length,
  manifestSha256: hash(bytes), exactBytesVerified: true }, null, 2));
console.log(JSON.stringify({ candidate: manifest.candidate, copied: manifest.artifacts.length }));
