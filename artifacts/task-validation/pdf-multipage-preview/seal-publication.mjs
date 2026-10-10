import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
const root = 'artifacts/task-validation/pdf-multipage-preview', app = '30f0b14d63ae69acec66cd82dcaee1d0abbb1cf6';
const run = args => { const r = spawnSync('git', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 10e6 }); assert.equal(r.status, 0, 'Git inventory failed safely'); return r.stdout.trim(); };
const paths = run(['ls-files', '--', root]).split('\n').filter(p => p && !p.endsWith('/publication-manifest.json'));
assert.ok(paths.length > 100);
const configured = JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json', 'utf8')).env;
const privateValues = Object.entries(configured).filter(([k, v]) => /token|key|secret|password|connection/i.test(k) && typeof v === 'string' && v.length >= 12).map(([, v]) => Buffer.from(v));
let zipMembers = 0, embeddedReports = 0;
const scan = (bytes, path) => {
  assert.ok(privateValues.every(v => !bytes.includes(v)), 'Configured credential detected in ' + path);
  const text = bytes.toString('utf8');
  assert.equal(/(?:sk-proj-|ghp_|github_pat_)[A-Za-z0-9_-]{20,}/.test(text), false, 'Credential-shaped value in ' + path);
  const realIdentity = new RegExp(['FRANCE' + 'SCHELLI', 'FRNNGL39' + 'D17D360R'].join('|'), 'i');
  assert.equal(realIdentity.test(text), false, 'Real source identity in ' + path);
  for (const match of text.matchAll(/data:application\/zip;base64,([A-Za-z0-9+/=]+)/g)) { embeddedReports++; zip(Buffer.from(match[1], 'base64'), path + '!embedded-report'); }
};
const zip = (bytes, path) => {
  let end = -1;
  for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 65558); at--) if (bytes.readUInt32LE(at) === 0x06054b50) { end = at; break; }
  assert.ok(end >= 0, 'Invalid ZIP ' + path); let at = bytes.readUInt32LE(end + 16);
  for (let i = 0, count = bytes.readUInt16LE(end + 10); i < count; i++) {
    assert.equal(bytes.readUInt32LE(at), 0x02014b50); const method = bytes.readUInt16LE(at + 10), size = bytes.readUInt32LE(at + 20), length = bytes.readUInt16LE(at + 28), extra = bytes.readUInt16LE(at + 30), comment = bytes.readUInt16LE(at + 32), offset = bytes.readUInt32LE(at + 42);
    const name = bytes.subarray(at + 46, at + 46 + length).toString('utf8'); assert.ok(!name.startsWith('/') && !name.split('/').includes('..'));
    assert.equal(bytes.readUInt32LE(offset), 0x04034b50); const start = offset + 30 + bytes.readUInt16LE(offset + 26) + bytes.readUInt16LE(offset + 28);
    const compressed = bytes.subarray(start, start + size); assert.ok(method === 0 || method === 8);
    const payload = method === 0 ? compressed : inflateRawSync(compressed, { maxOutputLength: 100e6 }); scan(payload, path + '!' + name); zipMembers++; at += 46 + length + extra + comment;
  }
};
const stream = spawnSync('git', ['cat-file', '--batch'], { input: paths.map(p => ':' + p).join('\n') + '\n', windowsHide: true, maxBuffer: 500e6 }); assert.equal(stream.status, 0);
let offset = 0; const files = [];
for (const path of paths) {
  const end = stream.stdout.indexOf(10, offset), header = stream.stdout.subarray(offset, end).toString().split(' '); assert.equal(header[1], 'blob');
  const length = Number(header[2]); offset = end + 1; const canonical = stream.stdout.subarray(offset, offset + length); offset += length; assert.equal(stream.stdout[offset++], 10);
  scan(canonical, path); if (path.endsWith('.zip')) zip(canonical, path);
  files.push({ path, bytes: length, gitBlobSha256: createHash('sha256').update(canonical).digest('hex'), localSha256: createHash('sha256').update(readFileSync(path)).digest('hex') });
}
assert.equal(offset, stream.stdout.length);
const manifest = { applicationCommit: app, files, configuredCredentialExactChecks: privateValues.length, zipMembers, embeddedReports, findings: [], syntheticOnly: true, knownRealSourceIdentityChecks: true, scannedCanonicalIndexBytes: true, scope: 'Every published task artifact except this manifest; compressed ZIP members and native HTML embedded ZIP report decoded; visual review and guarded synthetic browser origins also required', at: new Date().toISOString() };
writeFileSync(root + '/publication-manifest.json', JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ files: files.length, zipMembers, embeddedReports, findings: 0 }));
