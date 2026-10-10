import { readFileSync, copyFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const input = resolve('C:/w-intake-qa/artifacts/task-validation/therapy-reconciliation-qa');
const output = resolve('artifacts/task-validation/therapy-completeness/independent-qa/reconciliation');
const inside = (base, path) => { const file = resolve(base, path), rel = relative(base, file);
  assert.ok(rel && !rel.startsWith('..') && !/^[A-Za-z]:/.test(rel)); return file; };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = readFileSync(inside(input, 'artifact-manifest.json'));
const manifest = JSON.parse(bytes);
assert.equal(manifest.candidate, '89888589ef1fcce8f200899aa07413c8bcb70325');
assert.equal(manifest.verdict, 'FAILED VALIDATION');
const copy = (path, expected) => {
  const source = inside(input, path), target = inside(output, path), data = readFileSync(source);
  assert.equal(hash(data), expected);
  if (existsSync(target)) assert.equal(hash(readFileSync(target)), expected, 'Cannot replace sealed evidence');
  else { mkdirSync(dirname(target), { recursive: true }); copyFileSync(source, target); }
};
for (const item of manifest.files) copy(item.path, item.sha256);
copy('artifact-manifest.json', hash(bytes));
writeFileSync('artifacts/task-validation/therapy-completeness/reconciliation-copy-receipt.json', JSON.stringify({
  candidate: manifest.candidate, verdict: manifest.verdict, files: manifest.files.length,
  manifestSha256: hash(bytes), exactBytesVerified: true, counts: manifest.counts }, null, 2));
console.log(JSON.stringify({ candidate: manifest.candidate, files: manifest.files.length, counts: manifest.counts }));
