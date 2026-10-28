import assert from 'node:assert/strict';
import { readFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root = process.cwd();
const packet = 'artifacts/task-validation/bug-batch-450/cycle4';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = async file => JSON.parse(await readFile(path.join(root,file),'utf8'));
const original = await read(`${packet}/prior-proof-hashes.json`);
for (const [file, digest] of Object.entries(original)) assert.equal(sha(await readFile(path.join(root,file))),digest,`Historical proof changed: ${file}`);
const freeze = await read(`${packet}/source-freeze.json`);
for (const [file, entry] of Object.entries(freeze.files)) {
  const metadata = await lstat(path.join(root,file));
  assert.ok(metadata.isFile() && !metadata.isSymbolicLink(), `Source must remain regular: ${file}`);
  assert.equal(sha(await readFile(path.join(root,file))),entry.sha256,`Source changed after freeze: ${file}`);
}
const own = await read(`${packet}/author-proof-hashes.json`);
for (const [file, digest] of Object.entries(own.files)) assert.equal(sha(await readFile(path.join(root,file))),digest,`Current author proof changed: ${file}`);
const result = await read(`${packet}/complete-runtime/test-results/fullstack.json`);
assert.equal(result.pass,true);assert.equal(result.checks.length,22);assert.deepEqual(result.errors,[]);
console.log(JSON.stringify({ historicalFiles:Object.keys(original).length, sourceFiles:Object.keys(freeze.files).length, authorProofFiles:Object.keys(own.files).length, mismatches:0, runtimeChecks:result.checks.length, independentQaPending:true }));
