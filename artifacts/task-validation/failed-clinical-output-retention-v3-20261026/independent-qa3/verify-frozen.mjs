import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = '/workspace/.clinicos-cloud/cloud-review-activation-20261025/codex-execution-diagnostics';
const candidate = JSON.parse(await readFile(path.join(root, 'failed-output-retention-source3/source-candidate.json')));
const reservation = JSON.parse(await readFile(path.join(root, 'failed-output-retention-source3/qa3-reservation.json')));
const director = path.join(root, 'failed-output-retention-source3/director-amendment');
const projection = JSON.parse(await readFile(path.join(director, 'source-projection.json')));
const seal = JSON.parse(await readFile(path.join(director, 'seal.json')));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
assert.equal(candidate.code, '0dbe3066b41ff1f5a8462de2a4c6604b89b56e5b');
assert.equal(candidate.baseSha, '13c71ce0e2cdf6e72b4c7eeeb036754fac7e4f73');
assert.equal(reservation.sourceCode, candidate.code);
assert.equal(reservation.nonce, 'ced5e6c8-ce77-4122-9e66-fbbac0caee26');
assert.deepEqual(reservation.sourceProjection, candidate.sourceProjection);
assert.equal(candidate.sourceProjection.length, 7);
for (const item of candidate.sourceProjection) {
  const bytes = await readFile(path.join('/tmp/clinicos-failed-output-retention-source1', item.path));
  const projected = projection.files.find(entry => entry.path === item.path);
  assert.ok(projected);
  assert.equal(bytes.length, item.bytes, item.path);
  assert.equal(sha256(bytes), item.rawSha256, item.path);
  assert.equal(gitBlob(bytes), item.gitBlobSha1, item.path);
  assert.equal(projected.sha256, item.rawSha256, item.path);
  assert.equal(projected.bytes, item.bytes, item.path);
  process.stdout.write(`source OK ${item.path}\n`);
}
for (const [name, hash] of Object.entries(seal.artifacts)) {
  const bytes = await readFile(path.join(director, name));
  assert.equal(sha256(bytes), hash, name);
  process.stdout.write(`director seal OK ${name}\n`);
}
const domain = await readFile(path.join(director, 'domain-green.log'), 'utf8');
const focused = await readFile(path.join(director, 'focused-green.log'), 'utf8');
const red = await readFile(path.join(director, 'initial-native-null-red.log'), 'utf8');
assert.match(domain, /# tests 1703\n# suites 0\n# pass 1700\n# fail 0\n# cancelled 0\n# skipped 3/);
assert.match(focused, /# tests 14\n# suites 0\n# pass 14\n# fail 0/);
assert.match(red, /# tests 1\n# suites 0\n# pass 0\n# fail 1/);
assert.equal(seal.sourceProjectionSha256, sha256(await readFile(path.join(director, 'source-projection.json'))));
assert.equal(seal.reportSha256, sha256(await readFile(path.join(director, 'implementation-report.md'))));
process.stdout.write('native domain/focused/red summaries and author seal OK\n');
