import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { inflateRawSync } from 'node:zlib';
const root = 'artifacts/task-validation/409-unread-queue';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const independent = JSON.parse(readFileSync(`${root}/independent-qa/evidence-manifest.json`, 'utf8'));
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  if (e.name.startsWith('scratch-prisma-') || e.name.startsWith('failure')) return [];
  return e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`];
});
const metadata = ['task-contract.md', 'issue-source.md', 'architecture-review.md', 'implementation-receipt.md', 'independent-qa-report.md', 'validation-report.md', 'security-review.md', 'security-candidate-code.json', 'security-baseline-code.json', 'release-inspection.ps1', 'save-deployment-receipt.mjs', 'deployment-receipt.json', 'root-release-gate.mjs', 'release-gate-receipt.json', 'publication-final.mjs', 'qa-commands.mjs', 'qa-browser.mjs', 'qa-server.mjs', 'qa-source-receipt.mjs', 'qa-prisma.mjs', 'qa-db-regression.mjs'];
const paths = [...new Set([...independent.files.map(f => f.path), `${root}/independent-qa/evidence-manifest.json`, ...walk(`${root}/root-rerun`), ...metadata.map(x => `${root}/${x}`)])].sort();
// Inspect ZIP members in memory only: no path extraction or filesystem writes.
function zipMembers(bytes) {
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (bytes.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  assert.ok(end >= 0, 'Invalid trace ZIP');
  const result = []; let cursor = bytes.readUInt32LE(end + 16);
  for (let n = 0; n < bytes.readUInt16LE(end + 10); n++) {
    assert.equal(bytes.readUInt32LE(cursor), 0x02014b50);
    const method = bytes.readUInt16LE(cursor + 10), size = bytes.readUInt32LE(cursor + 20), fullSize = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28), extraLength = bytes.readUInt16LE(cursor + 30), commentLength = bytes.readUInt16LE(cursor + 32);
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    const local = bytes.readUInt32LE(cursor + 42); assert.equal(bytes.readUInt32LE(local), 0x04034b50); assert.ok(fullSize < 100*1024*1024);
    const start = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
    const data = bytes.subarray(start, start + size);
    const body = method === 0 ? data : method === 8 ? inflateRawSync(data, { maxOutputLength: 100*1024*1024 }) : null;
    assert.ok(body, 'Unsupported ZIP method'); assert.equal(body.length, fullSize);
    result.push({ name, body }); cursor += 46 + nameLength + extraLength + commentLength;
  }
  return result;
}
const mode = process.argv[2];
if (mode === 'prepare') {
  assert.equal(JSON.parse(readFileSync(`${root}/deployment-receipt.json`, 'utf8')).decision, 'VERIFIED RELEASE');
  const credentials = JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json', 'utf8')).env;
  const secrets = Object.entries(credentials).filter(([k,v]) => /TOKEN|API_KEY|SECRET|PASSWORD/i.test(k) && typeof v === 'string' && v.length > 15).map(([,v]) => Buffer.from(v));
  let secretChecks = 0, zipEntriesChecked = 0;
  function inspect(bytes, name) {
    for (const token of secrets) { assert.ok(!bytes.includes(token), `Private credential in ${name}`); secretChecks++; }
    const originalIdentityHashes = new Set(['1d3a4ae11144b3587052817140734891ec70f3493bc96b55a4208e8580386184', 'c529285a2c38b806cbb05729b864e0ea026a1bbc30ddffb69971b93b48043b07']);
    const words = bytes.toString('utf8').toUpperCase().match(/[A-Z0-9]{8,}/g) || [];
    assert.ok(words.every(word => !originalIdentityHashes.has(sha(Buffer.from(word)))), `Original patient evidence in ${name}`);
    if (!/\.(png|jpe?g|webm|zip)$/i.test(name)) assert.ok(!/\b[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]\b/.test(bytes.toString('utf8')), `Fiscal identifier requires review in ${name}`);
  }
  for (const path of paths) {
    const bytes = readFileSync(path); inspect(bytes, path);
    if (path.endsWith('.zip')) for (const member of zipMembers(bytes)) { inspect(member.body, `${path}:${member.name}`); zipEntriesChecked++; }
  }
  for (const file of independent.files) assert.equal(sha(readFileSync(file.path)), file.sha256);
  const receipt = { applicationCommit: independent.applicationCommit, applicationSourceSha256: independent.sourceSha256, decision: 'SOURCE-BOUND SYNTHETIC PROOF', secretChecks, zipEntriesChecked, originalIndependentManifestFrozen: true, productionPatientTestMutations: 0, excluded: ['root-initial/debug/failures', 'scratch-prisma generated client', '405/408 unreleased app sources', 'dirty launchers', 'coordination metadata', 'original audit/medical photos'], files: paths.map(path => ({ path, sha256: sha(readFileSync(path)) })) };
  writeFileSync(`${root}/publication-manifest.json`, JSON.stringify(receipt, null, 2));
  const stage = spawnSync('git', ['add', '-f', '--', ...paths, `${root}/publication-manifest.json`], { encoding: 'utf8' }); assert.equal(stage.status, 0, stage.stderr);
  console.log(JSON.stringify({ files: receipt.files.length, secretChecks, zipEntriesChecked, stagedExplicitPaths: true }));
} else if (mode === 'verify-git') {
  const receipt = JSON.parse(readFileSync(`${root}/publication-manifest.json`, 'utf8'));
  for (const file of receipt.files) { const r = spawnSync('git', ['show', `HEAD:${file.path}`], { maxBuffer: 50*1024*1024 }); assert.equal(r.status, 0); assert.equal(sha(r.stdout), file.sha256, file.path); }
  console.log(JSON.stringify({ gitBlobHashesVerified: receipt.files.length, applicationCommit: receipt.applicationCommit }));
} else throw new Error('prepare or verify-git required');
